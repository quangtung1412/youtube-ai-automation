'use server'

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateScene(
    sceneId: string,
    data: {
        voiceover?: string;
        voiceover_vi?: string;
        visualDesc?: string;
        visualDesc_vi?: string;
        durationSeconds?: number;
        veo3Prompt?: string;
    }
) {
    try {
        const scene = await prisma.scene.update({
            where: { id: sceneId },
            data
        });

        revalidatePath('/dashboard/projects/[id]', 'page');

        return { success: true, scene };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateAllScenes(
    projectId: string,
    scenes: Array<{
        id: string;
        voiceover: string;
        voiceover_vi?: string;
        visualDesc: string;
        visualDesc_vi?: string;
        durationSeconds: number;
        veo3Prompt?: string;
    }>
) {
    try {
        // Update all scenes in parallel
        await Promise.all(
            scenes.map(scene =>
                prisma.scene.update({
                    where: { id: scene.id },
                    data: {
                        voiceover: scene.voiceover,
                        voiceover_vi: scene.voiceover_vi || "",
                        visualDesc: scene.visualDesc,
                        visualDesc_vi: scene.visualDesc_vi || "",
                        durationSeconds: scene.durationSeconds,
                        veo3Prompt: scene.veo3Prompt || "",
                    },
                })
            )
        );

        revalidatePath(`/dashboard/projects/${projectId}`);

        return { success: true };
    } catch (error: any) {
        console.error("Error updating scenes:", error);
        return { success: false, error: error.message };
    }
}
