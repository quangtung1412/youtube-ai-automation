'use server'

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

interface UpdateProjectSettingsInput {
    projectId: string;
    title?: string;
    inputContent?: string;
    videoRatio?: string;
    styleStorytelling?: string;
    mainCharacterDesc?: string;
    visualStyle?: string;
}

export async function updateProjectSettings(input: UpdateProjectSettingsInput) {
    try {
        const { projectId, ...updateData } = input;

        // Remove undefined fields
        const cleanData = Object.fromEntries(
            Object.entries(updateData).filter(([_, value]) => value !== undefined)
        );

        const project = await prisma.project.update({
            where: { id: projectId },
            data: cleanData,
        });

        revalidatePath(`/dashboard/projects/${projectId}`);

        return {
            success: true,
            project,
        };
    } catch (error: any) {
        console.error("Error updating project settings:", error);
        return {
            success: false,
            error: error.message || "Failed to update project settings",
        };
    }
}
