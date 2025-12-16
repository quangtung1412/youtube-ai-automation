'use server'

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateProjectItem(
    itemId: string,
    data: { name?: string; description?: string; context?: string; visualDesc?: string }
) {
    try {
        await prisma.projectItem.update({
            where: { id: itemId },
            data
        });

        revalidatePath('/dashboard/projects/[id]', 'page');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating project item:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteProjectItem(itemId: string) {
    try {
        await prisma.projectItem.delete({
            where: { id: itemId }
        });

        revalidatePath('/dashboard/projects/[id]', 'page');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting project item:", error);
        return { success: false, error: error.message };
    }
}

export async function createProjectItem(
    projectId: string,
    data: { name: string; description: string; context: string; visualDesc: string }
) {
    try {
        const item = await prisma.projectItem.create({
            data: {
                projectId,
                ...data
            }
        });

        revalidatePath('/dashboard/projects/[id]', 'page');
        return { success: true, item };
    } catch (error: any) {
        console.error("Error creating project item:", error);
        return { success: false, error: error.message };
    }
}
