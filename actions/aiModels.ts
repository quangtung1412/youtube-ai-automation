'use server'

import { getAllModelsWithUsage, upsertModel, deleteModel, reorderModels, AIModelConfig } from "@/lib/modelRotation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

/**
 * Get all AI models with their usage statistics
 * Returns user's models if logged in, otherwise default models
 */
export async function getAIModels(): Promise<{ success: boolean; models?: AIModelConfig[]; error?: string }> {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        const models = await getAllModelsWithUsage(userId);
        return {
            success: true,
            models
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Save or update a model configuration
 */
export async function saveAIModel(config: {
    modelId: string;
    displayName: string;
    apiKey?: string | null;
    rpm: number;
    tpm: number;
    rpd: number;
    priority: number;
    enabled?: boolean;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        await upsertModel({ ...config, userId });
        return { success: true };
    } catch (error: any) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Delete a model configuration
 */
export async function deleteAIModel(modelId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await deleteModel(modelId);
        return { success: true };
    } catch (error: any) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Update model priorities (reorder)
 */
export async function updateModelPriorities(modelIds: string[]): Promise<{ success: boolean; error?: string }> {
    try {
        await reorderModels(modelIds);
        return { success: true };
    } catch (error: any) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Toggle model enabled/disabled status
 */
export async function toggleModelStatus(modelId: string, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    try {
        await prisma.aIModel.update({
            where: { id: modelId },
            data: { enabled }
        });
        return { success: true };
    } catch (error: any) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Initialize default models for a user (copies from default/system models)
 */
export async function initializeDefaultModels(): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        // Check if user already has models
        if (userId) {
            const userModels = await prisma.aIModel.count({
                where: { userId }
            });

            if (userModels > 0) {
                return { success: true }; // User already has models
            }
        }

        // Check if default models exist (userId = null)
        const defaultModelsCount = await prisma.aIModel.count({
            where: { userId: null }
        });

        if (defaultModelsCount === 0) {
            // Create system default models first
            await createSystemDefaultModels();
        }

        // If user is logged in, copy default models to user
        if (userId) {
            await copyDefaultModelsToUser(userId);
        }

        return { success: true };
    } catch (error: any) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Create system default models (userId = null)
 */
async function createSystemDefaultModels() {
    // Default Gemini models based on actual quota limits from Google AI Studio
    const defaultModels = [
        {
            modelId: "gemini-2.5-pro",
            displayName: "Gemini 2.5 Pro",
            rpm: 2,
            tpm: 125_000,
            rpd: 50,
            priority: 1,
            enabled: true,
            userId: null
        },
        {
            modelId: "gemini-2.5-flash",
            displayName: "Gemini 2.5 Flash",
            rpm: 10,
            tpm: 250_000,
            rpd: 250,
            priority: 2,
            enabled: true,
            userId: null
        },
        {
            modelId: "gemini-2.0-flash-lite",
            displayName: "Gemini 2.0 Flash Lite",
            rpm: 30,
            tpm: 1_000_000,
            rpd: 200,
            priority: 3,
            enabled: true,
            userId: null
        },
        {
            modelId: "gemini-2.5-flash-lite",
            displayName: "Gemini 2.5 Flash Lite",
            rpm: 15,
            tpm: 250_000,
            rpd: 1000,
            priority: 4,
            enabled: true,
            userId: null
        },
        {
            modelId: "gemini-2.0-flash",
            displayName: "Gemini 2.0 Flash",
            rpm: 15,
            tpm: 1_000_000,
            rpd: 200,
            priority: 5,
            enabled: true,
            userId: null
        }
    ];

    for (const model of defaultModels) {
        await upsertModel(model);
    }
}

/**
 * Copy default models to a specific user
 */
async function copyDefaultModelsToUser(userId: string) {
    const defaultModels = await prisma.aIModel.findMany({
        where: { userId: null }
    });

    for (const model of defaultModels) {
        await upsertModel({
            modelId: model.modelId,
            displayName: model.displayName,
            apiKey: model.apiKey || undefined,
            rpm: model.rpm,
            tpm: model.tpm,
            rpd: model.rpd,
            priority: model.priority,
            enabled: model.enabled,
            userId
        });
    }
}
