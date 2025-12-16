/**
 * Batch processing utilities for Gemini API
 * 
 * This module provides optimized concurrent request handling for Gemini API calls.
 * Unlike Google's Batch API (which has 24h turnaround), this uses concurrent requests
 * for real-time generation with intelligent rate limiting.
 */

import { GoogleGenAI } from "@google/genai";
import { createAPICallLog, updateAPICallLog } from "@/actions/aiUsageTracking";
import { prisma } from "@/lib/db";

export interface BatchRequestOptions {
    userId?: string;
    projectId?: string;
    operation: 'GENERATE_OUTLINE' | 'GENERATE_SCRIPT' | 'GENERATE_IMAGE_PROMPTS' | 'ANALYZE_CONTENT' | 'GENERATE_VEO3_PROMPTS';
    temperature?: number;
    signal?: AbortSignal;
}

export interface BatchRequest {
    id: string | number;
    prompt: string;
    options: BatchRequestOptions;
}

export interface BatchResponse<T = any> {
    id: string | number;
    success: boolean;
    data?: T;
    error?: string;
    tokens?: {
        input: number;
        output: number;
    };
}

/**
 * Process multiple Gemini API requests concurrently with intelligent rate limiting
 * 
 * Features:
 * - Automatic concurrency control based on model RPM limits
 * - Model rotation and logging integration
 * - Error isolation (one failed request doesn't stop others)
 * - Progress tracking
 * 
 * @param requests - Array of requests to process
 * @param onProgress - Optional callback for progress updates
 * @param maxConcurrency - Max concurrent requests (default: auto-detect from model limits)
 * @returns Array of responses matching request order
 */
export async function batchGenerateWithGemini<T = any>(
    requests: BatchRequest[],
    onProgress?: (completed: number, total: number) => void,
    maxConcurrency?: number,
    signal?: AbortSignal
): Promise<BatchResponse<T>[]> {
    if (requests.length === 0) {
        return [];
    }

    // Check if already aborted
    if (signal?.aborted) {
        throw new Error('Generation cancelled by user');
    }

    // Determine optimal concurrency based on model RPM limits
    const concurrency = maxConcurrency || await calculateOptimalConcurrency();

    const results: BatchResponse<T>[] = [];
    const errors: string[] = [];
    let completed = 0;

    // Process requests in batches to respect rate limits
    for (let i = 0; i < requests.length; i += concurrency) {
        // Check for cancellation between batches
        if (signal?.aborted) {
            throw new Error('Generation cancelled by user');
        }
        const batch = requests.slice(i, i + concurrency);

        const batchPromises = batch.map(async (request): Promise<BatchResponse<T>> => {
            try {
                const result = await generateSingleRequest<T>(request);
                completed++;

                if (onProgress) {
                    onProgress(completed, requests.length);
                }

                return result;
            } catch (error: any) {
                completed++;
                errors.push(`Request ${request.id}: ${error.message}`);

                if (onProgress) {
                    onProgress(completed, requests.length);
                }

                return {
                    id: request.id,
                    success: false,
                    error: error.message
                };
            }
        });

        const batchResults = await Promise.allSettled(batchPromises);

        for (const result of batchResults) {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            } else {
                // This should rarely happen since we catch errors above
                results.push({
                    id: 'unknown',
                    success: false,
                    error: result.reason?.message || 'Unknown error'
                });
            }
        }
    }

    return results;
}

/**
 * Process a single Gemini request with model rotation and logging
 */
async function generateSingleRequest<T>(request: BatchRequest): Promise<BatchResponse<T>> {
    const { id, prompt, options } = request;
    const { operation, temperature = 0.7, projectId, userId } = options;

    // Create API call log and get next available model
    const logResult = await createAPICallLog({
        operation,
        userId,
        projectId,
        promptPreview: prompt.substring(0, 500)
    });

    if (!logResult.success) {
        throw new Error(logResult.error || 'Failed to initialize API call log');
    }

    const logId = logResult.log!.id;
    const modelToUse = logResult.modelId!;

    // Get API key with fallback chain
    let apiKey = logResult.apiKey || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        const config = await prisma.systemConfig.findUnique({
            where: { id: "global_config" }
        });
        apiKey = (config as any)?.apiKey || process.env.GOOGLE_API_KEY || "";
    }

    const genAI = new GoogleGenAI({ apiKey });

    try {
        const response = await genAI.models.generateContent({
            model: modelToUse,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature,
            }
        });

        const inputTokens = (response as any).usage?.inputTokens || 0;
        const outputTokens = (response as any).usage?.outputTokens || 0;

        // Update log with success
        await updateAPICallLog({
            logId,
            status: 'SUCCESS',
            inputTokens,
            outputTokens,
            responsePreview: (response.text || '').substring(0, 500)
        });

        // Parse JSON response
        const data = response.text ? JSON.parse(response.text) : null;

        return {
            id,
            success: true,
            data,
            tokens: {
                input: inputTokens,
                output: outputTokens
            }
        };
    } catch (error: any) {
        // Update log with failure
        await updateAPICallLog({
            logId,
            status: 'FAILED',
            error: error.message,
            inputTokens: 0,
            outputTokens: 0,
            responsePreview: ''
        });

        throw error;
    }
}

/**
 * Calculate optimal concurrency based on model RPM limits
 * 
 * Logic:
 * - Get active models sorted by priority
 * - Use highest priority model's RPM to calculate safe concurrency
 * - Default to 5 concurrent requests if no model info available
 */
async function calculateOptimalConcurrency(): Promise<number> {
    try {
        const models = await prisma.aIModel.findMany({
            where: { enabled: true },
            orderBy: { priority: 'asc' },
            take: 1
        });

        if (models.length === 0) {
            return 5; // Default fallback
        }

        const primaryModel = models[0];
        const rpm = primaryModel.rpm;

        // Conservative calculation: use 60% of RPM capacity
        // Divided by 60 seconds, multiplied by estimated request duration (5s)
        const safeConcurrency = Math.max(1, Math.floor((rpm * 0.6 * 5) / 60));

        // Cap between 3 and 10 for safety
        return Math.min(10, Math.max(3, safeConcurrency));
    } catch (error) {
        console.error('Error calculating concurrency:', error);
        return 5; // Safe default
    }
}

/**
 * Helper to create batch requests from prompts
 */
export function createBatchRequests(
    prompts: Array<{ id: string | number; prompt: string }>,
    options: BatchRequestOptions
): BatchRequest[] {
    return prompts.map(({ id, prompt }) => ({
        id,
        prompt,
        options
    }));
}
