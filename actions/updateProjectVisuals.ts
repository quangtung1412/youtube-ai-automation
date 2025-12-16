'use server'

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateCharacterVisual(projectId: string, characterVisual: string, characterVisualVi?: string) {
    try {
        const data: any = { characterVisual };
        if (characterVisualVi !== undefined) {
            data.characterVisualVi = characterVisualVi;
        }

        await prisma.project.update({
            where: { id: projectId },
            data
        });

        revalidatePath('/dashboard/projects/[id]', 'page');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating character visual:", error);
        return { success: false, error: error.message };
    }
}

export async function updateBackgroundVisual(projectId: string, backgroundVisual: string, backgroundVisualVi?: string) {
    try {
        const data: any = { backgroundVisual };
        if (backgroundVisualVi !== undefined) {
            data.backgroundVisualVi = backgroundVisualVi;
        }

        await prisma.project.update({
            where: { id: projectId },
            data
        });

        revalidatePath('/dashboard/projects/[id]', 'page');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating background visual:", error);
        return { success: false, error: error.message };
    }
}

export async function updateVisualStyleGuide(projectId: string, visualStyleGuide: string) {
    try {
        await prisma.project.update({
            where: { id: projectId },
            data: { visualStyleGuide }
        });

        revalidatePath('/dashboard/projects/[id]', 'page');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating visual style guide:", error);
        return { success: false, error: error.message };
    }
}
