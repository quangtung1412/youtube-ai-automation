'use server'

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getPromptSettings() {
    try {
        const config = await prisma.systemConfig.findUnique({
            where: { id: "global_config" }
        });

        if (!config) {
            return { success: false, error: "System config not found" };
        }

        return {
            success: true,
            prompts: {
                outlinePrompt: config.outlinePrompt || getDefaultOutlinePrompt(),
                scriptsPrompt: config.scriptsPrompt || getDefaultScriptsPrompt(),
                veo3Prompt: config.veo3Prompt || getDefaultVeo3Prompt(),
                characterPrompt: config.characterPrompt || getDefaultCharacterPrompt(),
                backgroundPrompt: config.backgroundPrompt || getDefaultBackgroundPrompt(),
                itemsPrompt: config.itemsPrompt || getDefaultItemsPrompt(),
                veo3Template: config.veo3Template || '[STYLE] of [CHARACTER] doing [ACTION], [BG], [LIGHTING]'
            }
        };
    } catch (error: any) {
        console.error("Error getting prompt settings:", error);
        return {
            success: false,
            error: error.message || "Failed to get prompt settings"
        };
    }
}

export async function updatePromptSettings(prompts: {
    outlinePrompt?: string;
    scriptsPrompt?: string;
    veo3Prompt?: string;
    characterPrompt?: string;
    backgroundPrompt?: string;
    itemsPrompt?: string;
    veo3Template?: string;
}) {
    try {
        await prisma.systemConfig.update({
            where: { id: "global_config" },
            data: prompts
        });

        revalidatePath("/dashboard/settings");

        return { success: true };
    } catch (error: any) {
        console.error("Error updating prompt settings:", error);
        return {
            success: false,
            error: error.message || "Failed to update prompt settings"
        };
    }
}

export async function resetPromptToDefault(promptType:
    'outlinePrompt' | 'scriptsPrompt' | 'veo3Prompt' |
    'characterPrompt' | 'backgroundPrompt' | 'itemsPrompt'
) {
    try {
        const defaults: Record<string, string> = {
            outlinePrompt: getDefaultOutlinePrompt(),
            scriptsPrompt: getDefaultScriptsPrompt(),
            veo3Prompt: getDefaultVeo3Prompt(),
            characterPrompt: getDefaultCharacterPrompt(),
            backgroundPrompt: getDefaultBackgroundPrompt(),
            itemsPrompt: getDefaultItemsPrompt()
        };

        await prisma.systemConfig.update({
            where: { id: "global_config" },
            data: { [promptType]: defaults[promptType] }
        });

        revalidatePath("/dashboard/settings");

        return { success: true, defaultValue: defaults[promptType] };
    } catch (error: any) {
        console.error("Error resetting prompt:", error);
        return {
            success: false,
            error: error.message || "Failed to reset prompt"
        };
    }
}

// Default prompts are empty - base prompts are in generation code
// Users can add custom instructions here if needed
function getDefaultOutlinePrompt(): string {
    return '';
}

function getDefaultScriptsPrompt(): string {
    return '';
}

function getDefaultVeo3Prompt(): string {
    return '';
}

function getDefaultCharacterPrompt(): string {
    return '';
}

function getDefaultBackgroundPrompt(): string {
    return '';
}

function getDefaultItemsPrompt(): string {
    return '';
}
