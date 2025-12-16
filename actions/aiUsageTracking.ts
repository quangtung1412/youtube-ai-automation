'use server'

import { prisma } from "@/lib/db";
import { getNextAvailableModel, incrementModelUsage } from "@/lib/modelRotation";

export interface AIAPICallLog {
    id: string;
    modelId?: string;
    operation: string;
    projectId?: string;
    userId?: string;
    startedAt: Date;
    completedAt?: Date;
    durationMs?: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    promptPreview?: string;
    responsePreview?: string;
    status: string;
    error?: string;
    estimatedCost?: number;
}

/**
 * Create a new API call log entry
 */
export async function createAPICallLog({
    operation,
    projectId,
    userId,
    promptPreview
}: {
    operation: string;
    projectId?: string;
    userId?: string;
    promptPreview?: string;
}): Promise<{ success: boolean; log?: AIAPICallLog; modelId?: string; apiKey?: string; error?: string }> {
    try {
        // Get next available model for this user (or default if no userId)
        const model = await getNextAvailableModel(userId);

        if (!model) {
            return {
                success: false,
                error: "No AI models available. All quota limits reached."
            };
        }

        // Create log entry
        const log = await prisma.aIAPICall.create({
            data: {
                modelId: model.id,
                operation,
                projectId,
                userId,
                promptPreview: promptPreview?.substring(0, 500),
                status: 'PENDING',
                startedAt: new Date()
            }
        });

        return {
            success: true,
            log: log as AIAPICallLog,
            modelId: model.modelId,  // Return the actual model ID (e.g., "gemini-1.5-flash")
            apiKey: model.apiKey || undefined  // Return model-specific API key if available
        };

    } catch (error: any) {
        console.error('Error creating API call log:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Update an API call log with completion details
 */
export async function updateAPICallLog({
    logId,
    status,
    inputTokens,
    outputTokens,
    responsePreview,
    error
}: {
    logId: string;
    status: 'SUCCESS' | 'FAILED';
    inputTokens?: number;
    outputTokens?: number;
    responsePreview?: string;
    error?: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const log = await prisma.aIAPICall.findUnique({
            where: { id: logId }
        });

        if (!log) {
            return { success: false, error: "Log not found" };
        }

        const completedAt = new Date();
        const durationMs = completedAt.getTime() - log.startedAt.getTime();
        const totalTokens = (inputTokens || 0) + (outputTokens || 0);

        // Calculate estimated cost based on Gemini 1.5 Flash pricing
        // Input: $0.075 per 1M tokens (up to 128k context)
        // Output: $0.30 per 1M tokens
        const INPUT_COST_PER_M = 0.075;
        const OUTPUT_COST_PER_M = 0.30;

        const estimatedCost = Number(
            (((inputTokens || 0) / 1_000_000 * INPUT_COST_PER_M) +
                ((outputTokens || 0) / 1_000_000 * OUTPUT_COST_PER_M)).toFixed(6)
        );

        const updated = await prisma.aIAPICall.update({
            where: { id: logId },
            data: {
                status,
                completedAt,
                durationMs,
                inputTokens: inputTokens || 0,
                outputTokens: outputTokens || 0,
                totalTokens,
                estimatedCost,
                responsePreview: responsePreview?.substring(0, 500),
                error: error || null
            }
        });

        // Increment model usage counters
        if (log.modelId && status === 'SUCCESS') {
            await incrementModelUsage(log.modelId, totalTokens);
        }

        return { success: true };

    } catch (error: any) {
        console.error('Error updating API call log:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get AI usage statistics
 */
export async function getAIUsageStats({
    projectId,
    startDate,
    endDate,
    operation
}: {
    projectId?: string;
    startDate?: Date;
    endDate?: Date;
    operation?: string;
} = {}) {
    const where: any = {
        status: 'SUCCESS'
    };

    if (projectId) where.projectId = projectId;
    if (operation) where.operation = operation;
    if (startDate || endDate) {
        where.startedAt = {};
        if (startDate) where.startedAt.gte = startDate;
        if (endDate) where.startedAt.lte = endDate;
    }

    const calls = await prisma.aIAPICall.findMany({
        where,
        include: {
            model: true
        },
        orderBy: {
            startedAt: 'desc'
        }
    });

    // Calculate statistics
    const totalCalls = calls.length;
    const totalTokens = calls.reduce((sum, call) => sum + call.totalTokens, 0);
    const totalCost = calls.reduce((sum, call) => sum + (call.estimatedCost || 0), 0);
    const avgDuration = calls.reduce((sum, call) => sum + (call.durationMs || 0), 0) / totalCalls || 0;

    // Group by model
    const byModel = calls.reduce((acc, call) => {
        const modelName = call.model?.displayName || 'Unknown';
        if (!acc[modelName]) {
            acc[modelName] = {
                calls: 0,
                tokens: 0,
                cost: 0
            };
        }
        acc[modelName].calls++;
        acc[modelName].tokens += call.totalTokens;
        acc[modelName].cost += call.estimatedCost || 0;
        return acc;
    }, {} as Record<string, { calls: number; tokens: number; cost: number }>);

    // Group by operation
    const byOperation = calls.reduce((acc, call) => {
        if (!acc[call.operation]) {
            acc[call.operation] = {
                calls: 0,
                tokens: 0,
                cost: 0
            };
        }
        acc[call.operation].calls++;
        acc[call.operation].tokens += call.totalTokens;
        acc[call.operation].cost += call.estimatedCost || 0;
        return acc;
    }, {} as Record<string, { calls: number; tokens: number; cost: number }>);

    return {
        totalCalls,
        totalTokens,
        totalCost,
        avgDuration,
        byModel,
        byOperation,
        recentCalls: calls.slice(0, 100)  // Last 100 calls
    };
}

/**
 * Get all API calls with pagination
 */
export async function getAPICallLogs({
    page = 1,
    limit = 50,
    projectId,
    operation,
    status
}: {
    page?: number;
    limit?: number;
    projectId?: string;
    operation?: string;
    status?: string;
} = {}) {
    const where: any = {};

    if (projectId) where.projectId = projectId;
    if (operation) where.operation = operation;
    if (status) where.status = status;

    const [calls, total] = await Promise.all([
        prisma.aIAPICall.findMany({
            where,
            include: {
                model: true
            },
            orderBy: {
                startedAt: 'desc'
            },
            skip: (page - 1) * limit,
            take: limit
        }),
        prisma.aIAPICall.count({ where })
    ]);

    return {
        calls,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };
}
