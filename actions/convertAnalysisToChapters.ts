'use server'

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { AnalysisResult } from "./analyzeContent";

export async function convertAnalysisToChapters(
    projectId: string,
    analysis: AnalysisResult
) {
    try {
        // 1. Update project với character visual, background, và visual style guide
        await prisma.project.update({
            where: { id: projectId },
            data: {
                characterVisual: analysis.character_visual_base || undefined,
                backgroundVisual: analysis.background_base || undefined,
                visualStyleGuide: JSON.stringify(analysis.visual_style_guide || {}),
                outlineData: JSON.stringify(analysis),
                status: "OUTLINE_GENERATED"
            }
        });

        // 2. Xóa dữ liệu cũ
        await prisma.chapter.deleteMany({ where: { projectId } });
        await prisma.projectItem.deleteMany({ where: { projectId } });

        // 3. Tạo chapters mới (chỉ có thông tin cơ bản từ analysis)
        await prisma.chapter.createMany({
            data: analysis.chapters.map((ch) => ({
                projectId,
                chapterNumber: ch.id,
                title: ch.title,
                goal: ch.goal || '',
                contentSummary: ch.key_points?.join('\n• ') || '',
                durationSeconds: ch.duration,
            }))
        });

        // 4. Tạo important items
        if (analysis.important_items && analysis.important_items.length > 0) {
            await prisma.projectItem.createMany({
                data: analysis.important_items.map((item) => ({
                    projectId,
                    name: item.name || '',
                    description: item.description || '',
                    context: item.context || '',
                    visualDesc: analysis.assets?.[item.name] || '' // Lấy visual description từ assets
                }))
            });
        }

        revalidatePath('/dashboard/projects/[id]', 'page');

        return { success: true };
    } catch (error: any) {
        console.error("Error converting analysis to chapters:", error);
        return { success: false, error: error.message };
    }
}
