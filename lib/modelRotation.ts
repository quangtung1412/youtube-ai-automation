'use server'

import { prisma } from "./db";

export interface AIModelConfig {
    id: string;
    modelId: string;
    displayName: string;
    apiKey?: string | null;
    rpm: number;  // Requests per minute
    tpm: number;  // Tokens per minute
    rpd: number;  // Requests per day
    priority: number;
    enabled: boolean;
    currentMinuteRequests: number;
    currentMinuteTokens: number;
    currentDayRequests: number;
    lastResetMinute?: Date | null;
    lastResetDay?: Date | null;
}

/**
 * Get the next available AI model based on rotation policy
 * Checks rate limits and returns the highest priority model that has quota available
 * @param userId - Optional user ID to get user-specific models, null for default models
 */
export async function getNextAvailableModel(userId?: string | null): Promise<AIModelConfig | null> {
    const now = new Date();

    // Get all enabled models sorted by priority
    // If userId is provided, get user's models, otherwise get default models (userId = null)
    const models = await prisma.aIModel.findMany({
        where: {
            enabled: true,
            ...(userId ? { userId } : { userId: null })
        },
        orderBy: { priority: 'asc' }  // Lower number = higher priority
    });

    for (const model of models) {
        // Reset counters if time windows have elapsed
        const needsMinuteReset = !model.lastResetMinute ||
            (now.getTime() - model.lastResetMinute.getTime()) >= 60000; // 1 minute

        const needsDayReset = !model.lastResetDay ||
            now.toDateString() !== model.lastResetDay.toDateString();

        if (needsMinuteReset || needsDayReset) {
            await prisma.aIModel.update({
                where: { id: model.id },
                data: {
                    ...(needsMinuteReset && {
                        currentMinuteRequests: 0,
                        currentMinuteTokens: 0,
                        lastResetMinute: now
                    }),
                    ...(needsDayReset && {
                        currentDayRequests: 0,
                        lastResetDay: now
                    })
                }
            });

            // Refresh model data after reset
            const updatedModel = await prisma.aIModel.findUnique({
                where: { id: model.id }
            });

            if (!updatedModel) continue;
            Object.assign(model, updatedModel);
        }

        // Check if model has available quota
        const hasMinuteQuota = model.currentMinuteRequests < model.rpm;
        const hasDayQuota = model.currentDayRequests < model.rpd;

        if (hasMinuteQuota && hasDayQuota) {
            return model;
        }
    }

    return null; // No models available
}

/**
 * Increment usage counters for a model after making a request
 */
export async function incrementModelUsage(modelId: string, tokensUsed: number) {
    await prisma.aIModel.update({
        where: { id: modelId },
        data: {
            currentMinuteRequests: { increment: 1 },
            currentMinuteTokens: { increment: tokensUsed },
            currentDayRequests: { increment: 1 }
        }
    });
}

/**
 * Get all models with their current usage statistics
 * @param userId - Optional user ID to get user-specific models, null for default models
 */
export async function getAllModelsWithUsage(userId?: string | null): Promise<AIModelConfig[]> {
    return await prisma.aIModel.findMany({
        where: { userId: userId || null },
        orderBy: { priority: 'asc' }
    });
}

/**
 * Create or update a model configuration
 */
export async function upsertModel(config: {
    modelId: string;
    displayName: string;
    apiKey?: string | null;
    rpm: number;
    tpm: number;
    rpd: number;
    priority: number;
    enabled?: boolean;
    userId?: string | null;
}) {
    const { userId, ...modelData } = config;

    // Find existing model with same modelId and userId
    const existing = await prisma.aIModel.findFirst({
        where: {
            modelId: config.modelId,
            ...(userId ? { userId } : { userId: null })
        }
    });

    if (existing) {
        return await prisma.aIModel.update({
            where: { id: existing.id },
            data: modelData
        });
    } else {
        return await prisma.aIModel.create({
            data: {
                ...modelData,
                userId: userId ?? null,
                enabled: config.enabled ?? true
            }
        });
    }
}

/**
 * Delete a model configuration
 */
export async function deleteModel(modelId: string) {
    await prisma.aIModel.delete({
        where: { id: modelId }
    });
}

/**
 * Reorder models by updating their priorities
 */
export async function reorderModels(modelIds: string[]) {
    // Update each model's priority based on its position in the array
    const updates = modelIds.map((id, index) =>
        prisma.aIModel.update({
            where: { id },
            data: { priority: index + 1 }
        })
    );

    await prisma.$transaction(updates);
}
