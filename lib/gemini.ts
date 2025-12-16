// lib/gemini.ts
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/db";
import { createAPICallLog, updateAPICallLog } from "@/actions/aiUsageTracking";

// Client will be initialized per request with user's API key
// No default client to force users to provide their own API key

// 2. Hàm lấy danh sách Model từ API (server-side only)
export async function getAvailableModels() {
    // Return hardcoded list since we need API key to fetch from Google
    // Users can still add custom models in settings
    return [
        {
            id: "gemini-3-pro-preview",
            name: "Gemini 3 Pro",
            description: "Latest experimental model"
        },
        {
            id: "gemini-2.5-pro",
            name: "Gemini 2.5 Pro",
            description: "2M tokens input"
        },
        {
            id: "gemini-2.5-flash",
            name: "Gemini 2.5 Flash",
            description: "1M tokens input"
        },
    ];
}

// 3. Hàm generate content với config từ DB và model rotation + logging
export async function generateWithGemini(
    prompt: string,
    options?: {
        projectId?: string;
        userId?: string;
        operation?: 'GENERATE_OUTLINE' | 'GENERATE_SCRIPT' | 'GENERATE_IMAGE_PROMPTS' | 'ANALYZE_CONTENT';
        temperature?: number;
    }
) {
    const operation = options?.operation || 'GENERATE_OUTLINE';
    const temperature = options?.temperature || 0.7;
    const projectId = options?.projectId;
    const userId = options?.userId;

    // Create API call log and get next available model
    const logResult = await createAPICallLog({
        operation,
        projectId,
        userId,
        promptPreview: prompt.substring(0, 500)
    });

    if (!logResult.success) {
        throw new Error(logResult.error || 'Failed to initialize API call log');
    }

    const logId = logResult.log!.id;
    const modelToUse = logResult.modelId || 'gemini-2.5-flash';

    // Get API key from model or system config (user must provide)
    let apiKey = logResult.apiKey;

    if (!apiKey) {
        // Try to get from system config
        const config = await prisma.systemConfig.findUnique({
            where: { id: "global_config" }
        });
        apiKey = (config as any)?.apiKey;
    }

    if (!apiKey) {
        throw new Error(
            'API Key not configured. Please add your Google API Key in Settings > Model Rotation > Global API Configuration. ' +
            'Get your key from: https://aistudio.google.com/apikey'
        );
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

        // Extract token usage from response metadata
        const usage = (response as any).usage || (response as any).usageMetadata;
        const inputTokens = usage?.promptTokenCount || usage?.inputTokens || 0;
        const outputTokens = usage?.candidatesTokenCount || usage?.outputTokens || 0;

        // Update log with success
        await updateAPICallLog({
            logId,
            status: 'SUCCESS',
            inputTokens,
            outputTokens,
            responsePreview: (response.text || '').substring(0, 500)
        });

        return response;
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

// 4. Hàm generate content trực tiếp với model cụ thể
export async function generateWithModel(
    modelId: string,
    prompt: string,
    apiKey: string,
    temperature: number = 0.7
) {
    if (!apiKey) {
        throw new Error(
            'API Key required. Please configure your Google API Key in Settings. ' +
            'Get your key from: https://aistudio.google.com/apikey'
        );
    }

    const genAI = new GoogleGenAI({ apiKey });

    const response = await genAI.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            temperature: temperature,
        }
    });

    return response;
}

// 5. Types cho responses
export interface OutlineResponse {
    title: string;
    title_vi?: string; // Vietnamese translation if source language is not Vietnamese
    chapters: Array<{
        id: number;
        title: string;
        title_vi?: string; // Vietnamese translation
        content_summary: string;
        content_summary_vi?: string; // Vietnamese translation
        duration_seconds: number;
    }>;
    veo3_assets: {
        character: string;
        character_vi?: string; // Vietnamese translation
        background_base: string;
        background_base_vi?: string; // Vietnamese translation
        tone?: string;
        style?: string;
    };
}

export interface SceneData {
    id: number;
    duration_seconds: number;
    voiceover: string;
    visual: string;
    veo3_prompt?: string;
}

export interface ChapterScript {
    chapter_id: number;
    chapter_title: string;
    scenes: SceneData[];
}
