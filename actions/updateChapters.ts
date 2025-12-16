'use server'

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateChapter(
    chapterId: string,
    data: {
        title?: string;
        title_vi?: string;
        contentSummary?: string;
        contentSummary_vi?: string;
        durationSeconds?: number;
        goal?: string;
    }
) {
    try {
        const chapter = await prisma.chapter.update({
            where: { id: chapterId },
            data
        });

        revalidatePath('/dashboard/projects/[id]', 'page');

        return { success: true, chapter };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateAllChapters(
    projectId: string,
    chapters: Array<{
        id: string;
        title: string;
        title_vi?: string;
        contentSummary: string;
        contentSummary_vi?: string;
        durationSeconds: number;
        goal?: string;
    }>
) {
    try {
        // Update all chapters in parallel
        await Promise.all(
            chapters.map(chapter =>
                prisma.chapter.update({
                    where: { id: chapter.id },
                    data: {
                        title: chapter.title,
                        title_vi: chapter.title_vi || "",
                        contentSummary: chapter.contentSummary,
                        contentSummary_vi: chapter.contentSummary_vi || "",
                        durationSeconds: chapter.durationSeconds,
                        goal: chapter.goal || "",
                    },
                })
            )
        );

        revalidatePath(`/dashboard/projects/${projectId}`);

        return { success: true };
    } catch (error: any) {
        console.error("Error updating chapters:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteChapter(projectId: string, chapterId: string) {
    try {
        // Delete the chapter (scenes will be cascade deleted)
        await prisma.chapter.delete({
            where: { id: chapterId },
        });

        // Re-number remaining chapters
        const remainingChapters = await prisma.chapter.findMany({
            where: { projectId },
            orderBy: { chapterNumber: 'asc' },
        });

        // Update chapter numbers sequentially
        for (let i = 0; i < remainingChapters.length; i++) {
            await prisma.chapter.update({
                where: { id: remainingChapters[i].id },
                data: { chapterNumber: i + 1 },
            });
        }

        revalidatePath(`/dashboard/projects/${projectId}`);

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting chapter:", error);
        return { success: false, error: error.message };
    }
}

export async function createChapter(
    projectId: string,
    data?: {
        title?: string;
        contentSummary?: string;
        durationSeconds?: number;
    }
) {
    try {
        // Get the highest chapter number
        const lastChapter = await prisma.chapter.findFirst({
            where: { projectId },
            orderBy: { chapterNumber: 'desc' },
        });

        const newChapterNumber = (lastChapter?.chapterNumber || 0) + 1;

        const chapter = await prisma.chapter.create({
            data: {
                projectId,
                chapterNumber: newChapterNumber,
                title: data?.title || `Chapter ${newChapterNumber}`,
                contentSummary: data?.contentSummary || "Add content summary here...",
                durationSeconds: data?.durationSeconds || 60,
                goal: "",
            }
        });

        revalidatePath(`/dashboard/projects/${projectId}`);

        return { success: true, chapter };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
