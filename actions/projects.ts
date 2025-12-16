'use server'

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createProject(data: {
    title: string;
    inputContent: string;
    channelId: string;
}) {
    try {
        const project = await prisma.project.create({
            data: {
                title: data.title,
                inputContent: data.inputContent,
                channelId: data.channelId,
                status: "DRAFT"
            }
        });

        revalidatePath('/dashboard');
        return { success: true, project };
    } catch (error) {
        console.error("Error creating project:", error);
        return { success: false, error: "Failed to create project" };
    }
}

export async function updateProject(projectId: string, data: {
    title?: string;
    inputContent?: string;
    status?: string;
    outlineData?: string;
    fullScript?: string;
}) {
    try {
        const project = await prisma.project.update({
            where: { id: projectId },
            data
        });

        revalidatePath(`/dashboard/projects/${projectId}`);
        return { success: true, project };
    } catch (error) {
        console.error("Error updating project:", error);
        return { success: false, error: "Failed to update project" };
    }
}

export async function getProject(projectId: string) {
    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                channel: true
            }
        });

        return project;
    } catch (error) {
        console.error("Error getting project:", error);
        return null;
    }
}

export async function deleteProject(projectId: string) {
    try {
        await prisma.project.delete({
            where: { id: projectId }
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error("Error deleting project:", error);
        return { success: false, error: "Failed to delete project" };
    }
}
