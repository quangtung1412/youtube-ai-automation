'use server'

import { generateWithGemini, type ChapterScript, type SceneData } from "@/lib/gemini";
import { batchGenerateWithGemini, createBatchRequests } from "@/lib/batchGemini";
import { prisma } from "@/lib/db";
import { updateProject } from "./projects";
import PQueue from "p-queue";
import { createTask, updateTask } from "./taskManager";

/**
 * Generate scripts for all chapters using optimized batch processing
 * This is faster than generateScripts() as it sends all requests concurrently
 */
export async function generateScriptsBatch(projectId: string) {
    const taskResult = await createTask(projectId, 'GENERATE_SCRIPTS');
    if (!taskResult.success || !taskResult.task) {
        return { success: false, error: "Failed to create task" };
    }
    const taskId = taskResult.task.id;

    try {
        await updateTask(taskId, {
            status: 'RUNNING',
            progress: 5,
            message: '🚀 Đang tải thông tin project...',
            startedAt: new Date()
        });

        // 1. Load project data
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { channel: true }
        });

        if (!project || !project.outlineData) {
            await updateTask(taskId, {
                status: 'FAILED',
                error: 'Project or outline not found',
                completedAt: new Date()
            });
            return { success: false, error: "Project or outline not found" };
        }

        const outline = JSON.parse(project.outlineData);
        const persona = JSON.parse(project.channel.personaSettings);

        if (!outline.veo3_assets) {
            outline.veo3_assets = {
                character: persona.character_desc || "A character",
                background_base: "neutral background",
                tone: persona.tone || "professional",
                style: persona.style || "cinematic"
            };
        }

        // 2. Load system config
        const config = await prisma.systemConfig.findUnique({
            where: { id: "global_config" }
        });

        const avgSceneDuration = config?.avgSceneDuration || 8;
        const speechRate = config?.speechRate || 2.5;
        const maxWordsPerScene = config?.maxWordsPerScene || 20;
        const veo3Template = config?.veo3Template || "[STYLE] of [CHARACTER] doing [ACTION], [BG], [LIGHTING]";
        const customInstructions = (config as any)?.scriptsPrompt || '';

        await updateTask(taskId, {
            progress: 10,
            message: `⚡ Chuẩn bị gửi ${outline.chapters.length} requests song song...`
        });

        // 3. Build all prompts first
        const totalChapters = outline.chapters.length;
        const totalDuration = outline.chapters.reduce((sum: number, ch: any) => sum + ch.duration_seconds, 0);

        const batchRequests = outline.chapters.map((chapter: any, index: number) => {
            const prevChapter = index > 0 ? outline.chapters[index - 1] : null;
            const nextChapter = index < outline.chapters.length - 1 ? outline.chapters[index + 1] : null;
            const elapsedDuration = outline.chapters
                .slice(0, index)
                .reduce((sum: number, ch: any) => sum + ch.duration_seconds, 0);
            const progressPercent = Math.round((elapsedDuration / totalDuration) * 100);

            const systemInstruction = `You are a professional video scriptwriter.

Channel: ${project.channel.name}
Persona: ${persona.character_desc}
Tone: ${persona.tone}
Style: ${persona.style}

Your task is to write a detailed, scene-by-scene script for this chapter.`;

            let contextSection = `TIMELINE CONTEXT:
- Chapter Position: ${index + 1} of ${totalChapters}
- Video Progress: ${progressPercent}% (${elapsedDuration}s elapsed, ${totalDuration - elapsedDuration}s remaining)
- Current Chapter Duration: ${chapter.duration_seconds}s

VIDEO OVERVIEW:
Title: ${outline.title}${outline.title_vi ? ` (Vietnamese: ${outline.title_vi})` : ''}
Total Chapters: ${totalChapters}
Total Duration: ${totalDuration} seconds`;

            if (prevChapter) {
                contextSection += `

PREVIOUS CHAPTER (for continuity):
Title: ${prevChapter.title}
Summary: ${prevChapter.content_summary}
→ Your script should naturally transition from this topic.`;
            }

            if (nextChapter) {
                contextSection += `

NEXT CHAPTER (upcoming):
Title: ${nextChapter.title}
Summary: ${nextChapter.content_summary}
→ Prepare viewers for this upcoming topic.`;
            }

            const prompt = `Create a detailed script for this chapter:

CURRENT CHAPTER:
Title: ${chapter.title}${chapter.title_vi ? ` (Vietnamese: ${chapter.title_vi})` : ''}
Content Summary: ${chapter.content_summary}${chapter.content_summary_vi ? `
Vietnamese Summary: ${chapter.content_summary_vi}` : ''}
Target Duration: ${chapter.duration_seconds} seconds

${contextSection}

VISUAL ASSETS (for consistency):
- Character: ${outline.veo3_assets.character}${outline.veo3_assets.character_vi ? ` (Vietnamese: ${outline.veo3_assets.character_vi})` : ''}
- Background: ${outline.veo3_assets.background_base}${outline.veo3_assets.background_base_vi ? ` (Vietnamese: ${outline.veo3_assets.background_base_vi})` : ''}
- Tone: ${outline.veo3_assets.tone}
- Style: ${outline.veo3_assets.style}

REQUIREMENTS:
1. Break into scenes of approximately ${avgSceneDuration} seconds each
2. Each scene must have:
   - Unique ID (sequential within chapter)
   - Duration in seconds
   - Voiceover text (what the narrator says)
   - Visual description (what appears on screen)
3. Total scenes should cover ${chapter.duration_seconds} seconds
4. CRITICAL - Voiceover word count limit:
   - Maximum ${maxWordsPerScene} words per scene voiceover
   - This is to fit within ${avgSceneDuration}s video duration (speech rate: ${speechRate} words/second)
   - Count words carefully before finalizing each scene
   - Be concise and impactful
5. Make voiceover engaging and natural
6. Visual descriptions should be detailed and cinematically directed
7. Maintain narrative flow and coherence with surrounding chapters
8. If this is chapter ${index + 1}:
   ${index === 0 ? '- Start with a strong hook to engage viewers' : ''}
   ${index === totalChapters - 1 ? '- Conclude with a compelling ending and call-to-action' : ''}
   ${index > 0 && index < totalChapters - 1 ? '- Smoothly transition from previous chapter and lead into next chapter' : ''}

RESPONSE FORMAT (JSON):
{
  "chapter_id": ${chapter.id},
  "chapter_title": "${chapter.title}",
  "scenes": [
    {
      "id": 1,
      "duration_seconds": ${avgSceneDuration},
      "voiceover": "Engaging narration text...",
      "visual": "Detailed visual description for this scene..."
    }
  ]
}

IMPORTANT:
- Be specific with visual descriptions
- Reference the character and background assets
- Keep consistent with the overall style
- Ensure smooth transitions between scenes
- Align with the timeline position (${progressPercent}% through video)

${customInstructions ? `ADDITIONAL REQUIREMENTS:\n${customInstructions}` : ''}`;

            return {
                id: chapter.id,
                prompt: `${systemInstruction}\n\n${prompt}`
            };
        });

        await updateTask(taskId, {
            progress: 20,
            message: `🔥 Đang gửi ${totalChapters} requests song song tới Gemini API...`
        });

        // 4. Execute batch requests with progress tracking
        const results = await batchGenerateWithGemini<ChapterScript>(
            createBatchRequests(batchRequests, {
                userId: project.channel.userId,
                projectId,
                operation: 'GENERATE_SCRIPT'
            }),
            (completed, total) => {
                const progress = Math.round(20 + (completed / total) * 60);
                updateTask(taskId, {
                    progress,
                    message: `⚡ Đã hoàn thành ${completed}/${total} chapters (${Math.round((completed / total) * 100)}%)...`
                });
            }
        );

        await updateTask(taskId, {
            progress: 80,
            message: '✅ Đã nhận tất cả responses. Đang xử lý và lưu vào database...'
        });

        // 5. Process results
        const allScripts: ChapterScript[] = [];
        const errors: string[] = [];

        for (const result of results) {
            if (result.success && result.data) {
                const chapterScript = result.data;
                allScripts.push(chapterScript);
            } else {
                errors.push(`Chapter ${result.id}: ${result.error || 'Unknown error'}`);
            }
        }

        if (allScripts.length === 0) {
            await updateTask(taskId, {
                status: 'FAILED',
                error: 'No scripts generated. Errors: ' + errors.join(", "),
                completedAt: new Date()
            });
            return {
                success: false,
                error: "No scripts generated. Errors: " + errors.join(", ")
            };
        }

        // Sort by chapter ID
        allScripts.sort((a, b) => a.chapter_id - b.chapter_id);

        // 6. Save to database
        await prisma.scene.deleteMany({
            where: { chapter: { projectId } }
        });

        const chapters = await prisma.chapter.findMany({
            where: { projectId },
            orderBy: { chapterNumber: 'asc' }
        });

        for (const chapterScript of allScripts) {
            const chapter = chapters.find(ch => ch.chapterNumber === chapterScript.chapter_id);
            if (!chapter) continue;

            const scenesData = chapterScript.scenes.map((scene) => ({
                chapterId: chapter.id,
                sceneNumber: String(scene.id),
                durationSeconds: scene.duration_seconds,
                voiceover: scene.voiceover,
                visualDesc: scene.visual,
                veo3Prompt: '' // Will be generated in separate step
            })) as any;

            await prisma.scene.createMany({
                data: scenesData
            });
        }

        await updateProject(projectId, {
            fullScript: JSON.stringify(allScripts),
            status: "SCRIPT_GENERATED"
        });

        await updateTask(taskId, {
            status: 'COMPLETED',
            progress: 100,
            message: `🎉 Đã tạo scripts cho ${allScripts.length} chapters thành công! ${errors.length > 0 ? `(${errors.length} lỗi)` : ''}`,
            result: {
                chaptersCount: allScripts.length,
                errors: errors.length > 0 ? errors : undefined
            },
            completedAt: new Date()
        });

        return {
            success: true,
            scripts: allScripts,
            errors: errors.length > 0 ? errors : undefined
        };

    } catch (error: any) {
        console.error("Error generating scripts batch:", error);
        await updateTask(taskId, {
            status: 'FAILED',
            error: error.message || 'Unknown error',
            completedAt: new Date()
        });
        return {
            success: false,
            error: error.message || "Failed to generate scripts"
        };
    }
}

export async function generateScripts(projectId: string) {
    // Create task for tracking
    const taskResult = await createTask(projectId, 'GENERATE_SCRIPTS');
    if (!taskResult.success || !taskResult.task) {
        return { success: false, error: "Failed to create task" };
    }
    const taskId = taskResult.task.id;

    try {
        await updateTask(taskId, {
            status: 'RUNNING',
            progress: 5,
            message: 'Đang tải thông tin project...',
            startedAt: new Date()
        });

        // 1. Lấy project data
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { channel: true }
        });

        if (!project || !project.outlineData) {
            await updateTask(taskId, {
                status: 'FAILED',
                error: 'Project or outline not found',
                completedAt: new Date()
            });
            return { success: false, error: "Project or outline not found" };
        }

        await updateTask(taskId, {
            progress: 10,
            message: 'Chuẩn bị tạo scripts cho các chapters...'
        });

        const outline = JSON.parse(project.outlineData);
        const persona = JSON.parse(project.channel.personaSettings);

        // Ensure veo3_assets exists with defaults
        if (!outline.veo3_assets) {
            outline.veo3_assets = {
                character: persona.character_desc || "A character",
                background_base: "neutral background",
                tone: persona.tone || "professional",
                style: persona.style || "cinematic"
            };
        }

        // 2. Lấy system config
        const config = await prisma.systemConfig.findUnique({
            where: { id: "global_config" }
        });

        const avgSceneDuration = config?.avgSceneDuration || 8;
        const speechRate = config?.speechRate || 2.5;
        const maxWordsPerScene = config?.maxWordsPerScene || 20;
        const veo3Template = config?.veo3Template || "[STYLE] of [CHARACTER] doing [ACTION], [BG], [LIGHTING]";

        // Get custom instructions from DB (only additional requirements, not full template)
        const customInstructions = (config as any)?.scriptsPrompt || '';

        // 3. Setup queue (optimized concurrency for faster processing)
        // Note: Increased from 2 to 5 concurrent requests to speed up generation
        // This respects API rate limits while maximizing throughput
        const queue = new PQueue({ concurrency: 5 });
        const allScripts: ChapterScript[] = [];
        const errors: string[] = [];
        const totalChapters = outline.chapters.length;
        let completedChapters = 0;

        // 4. Process each chapter
        const tasks = outline.chapters.map((chapter: any, index: number) => {
            return queue.add(async () => {
                try {
                    // Update task with current chapter being processed
                    const chapterProgress = Math.round(10 + (completedChapters / totalChapters) * 70);
                    await updateTask(taskId, {
                        progress: chapterProgress,
                        message: `📝 Đang tạo script Chapter ${index + 1}/${totalChapters}: "${chapter.title}"...`
                    });

                    console.log(`[Task ${taskId}] Processing chapter ${chapter.id}: ${chapter.title}`);

                    // Build context about previous and next chapters for coherence
                    const prevChapter = index > 0 ? outline.chapters[index - 1] : null;
                    const nextChapter = index < outline.chapters.length - 1 ? outline.chapters[index + 1] : null;

                    // Calculate timeline position
                    const totalDuration = outline.chapters.reduce((sum: number, ch: any) => sum + ch.duration_seconds, 0);
                    const elapsedDuration = outline.chapters
                        .slice(0, index)
                        .reduce((sum: number, ch: any) => sum + ch.duration_seconds, 0);
                    const progressPercent = Math.round((elapsedDuration / totalDuration) * 100);

                    // System instruction for this chapter
                    const systemInstruction = `You are a professional video scriptwriter.

Channel: ${project.channel.name}
Persona: ${persona.character_desc}
Tone: ${persona.tone}
Style: ${persona.style}

Your task is to write a detailed, scene-by-scene script for this chapter.`;

                    // Build context section
                    let contextSection = `TIMELINE CONTEXT:
- Chapter Position: ${index + 1} of ${outline.chapters.length}
- Video Progress: ${progressPercent}% (${elapsedDuration}s elapsed, ${totalDuration - elapsedDuration}s remaining)
- Current Chapter Duration: ${chapter.duration_seconds}s

VIDEO OVERVIEW:
Title: ${outline.title}${outline.title_vi ? ` (Vietnamese: ${outline.title_vi})` : ''}
Total Chapters: ${outline.chapters.length}
Total Duration: ${totalDuration} seconds`;

                    if (prevChapter) {
                        contextSection += `

PREVIOUS CHAPTER (for continuity):
Title: ${prevChapter.title}
Summary: ${prevChapter.content_summary}
→ Your script should naturally transition from this topic.`;
                    }

                    if (nextChapter) {
                        contextSection += `

NEXT CHAPTER (upcoming):
Title: ${nextChapter.title}
Summary: ${nextChapter.content_summary}
→ Prepare viewers for this upcoming topic.`;
                    }

                    // Prompt
                    const prompt = `Create a detailed script for this chapter:

CURRENT CHAPTER:
Title: ${chapter.title}${chapter.title_vi ? ` (Vietnamese: ${chapter.title_vi})` : ''}
Content Summary: ${chapter.content_summary}${chapter.content_summary_vi ? `
Vietnamese Summary: ${chapter.content_summary_vi}` : ''}
Target Duration: ${chapter.duration_seconds} seconds

${contextSection}

VISUAL ASSETS (for consistency):
- Character: ${outline.veo3_assets.character}${outline.veo3_assets.character_vi ? ` (Vietnamese: ${outline.veo3_assets.character_vi})` : ''}
- Background: ${outline.veo3_assets.background_base}${outline.veo3_assets.background_base_vi ? ` (Vietnamese: ${outline.veo3_assets.background_base_vi})` : ''}
- Tone: ${outline.veo3_assets.tone}
- Style: ${outline.veo3_assets.style}

REQUIREMENTS:
1. Break into scenes of approximately ${avgSceneDuration} seconds each
2. Each scene must have:
   - Unique ID (sequential within chapter)
   - Duration in seconds
   - Voiceover text (what the narrator says)
   - Visual description (what appears on screen)
3. Total scenes should cover ${chapter.duration_seconds} seconds
4. CRITICAL - Voiceover word count limit:
   - Maximum ${maxWordsPerScene} words per scene voiceover
   - This is to fit within ${avgSceneDuration}s video duration (speech rate: ${speechRate} words/second)
   - Count words carefully before finalizing each scene
   - Be concise and impactful
5. Make voiceover engaging and natural
6. Visual descriptions should be detailed and cinematically directed
7. Maintain narrative flow and coherence with surrounding chapters
8. If this is chapter ${index + 1}:
   ${index === 0 ? '- Start with a strong hook to engage viewers' : ''}
   ${index === outline.chapters.length - 1 ? '- Conclude with a compelling ending and call-to-action' : ''}
   ${index > 0 && index < outline.chapters.length - 1 ? '- Smoothly transition from previous chapter and lead into next chapter' : ''}

RESPONSE FORMAT (JSON):
{
  "chapter_id": ${chapter.id},
  "chapter_title": "${chapter.title}",
  "scenes": [
    {
      "id": 1,
      "duration_seconds": ${avgSceneDuration},
      "voiceover": "Engaging narration text...",
      "visual": "Detailed visual description for this scene..."
    }
  ]
}

IMPORTANT:
- Be specific with visual descriptions
- Reference the character and background assets
- Keep consistent with the overall style
- Ensure smooth transitions between scenes
- Align with the timeline position (${progressPercent}% through video)

${customInstructions ? `ADDITIONAL REQUIREMENTS:\n${customInstructions}` : ''}`;

                    // Call Gemini
                    const fullPrompt = `${systemInstruction}

${prompt}`;
                    const result = await generateWithGemini(fullPrompt, {
                        projectId,
                        userId: project.channel.userId,
                        operation: 'GENERATE_SCRIPT'
                    });

                    if (!result.text) {
                        throw new Error("No response from AI");
                    }

                    const chapterScript: ChapterScript = JSON.parse(result.text);

                    allScripts.push(chapterScript);
                    completedChapters++;

                    // Update progress after completing chapter
                    const progressAfterChapter = Math.round(10 + (completedChapters / totalChapters) * 70);
                    await updateTask(taskId, {
                        progress: progressAfterChapter,
                        message: `✅ Hoàn thành Chapter ${index + 1}/${totalChapters}. Đã tạo ${completedChapters}/${totalChapters} chapters...`
                    });

                    console.log(`[Task ${taskId}] ✓ Completed chapter ${chapter.id} (${completedChapters}/${totalChapters})`);

                } catch (error: any) {
                    console.error(`[Task ${taskId}] Error processing chapter ${chapter.id}:`, error);
                    errors.push(`Chapter ${chapter.id}: ${error.message}`);
                    completedChapters++;

                    // Update task with error info
                    await updateTask(taskId, {
                        message: `⚠️ Lỗi tại Chapter ${index + 1}/${totalChapters}. Tiếp tục với chapter tiếp theo...`
                    });
                }
            });
        });

        // Wait for all tasks
        await queue.onIdle();

        // 5. Check results
        if (allScripts.length === 0) {
            await updateTask(taskId, {
                status: 'FAILED',
                error: 'No scripts generated. Errors: ' + errors.join(", "),
                completedAt: new Date()
            });
            return {
                success: false,
                error: "No scripts generated. Errors: " + errors.join(", ")
            };
        }

        await updateTask(taskId, {
            progress: 80,
            message: `Đang lưu ${allScripts.length} scripts vào database...`
        });

        // Sort by chapter ID
        allScripts.sort((a, b) => a.chapter_id - b.chapter_id);

        // 6. Save scripts to database as Scene records
        // First, delete existing scenes
        await prisma.scene.deleteMany({
            where: {
                chapter: {
                    projectId
                }
            }
        });

        // Get all chapters for this project
        const chapters = await prisma.chapter.findMany({
            where: { projectId },
            orderBy: { chapterNumber: 'asc' }
        });

        // Create scene records for each chapter
        for (const chapterScript of allScripts) {
            const chapter = chapters.find(ch => ch.chapterNumber === chapterScript.chapter_id);
            if (!chapter) continue;

            const scenesData = chapterScript.scenes.map((scene) => ({
                chapterId: chapter.id,
                sceneNumber: String(scene.id), // Convert to string for schema compatibility
                durationSeconds: scene.duration_seconds,
                voiceover: scene.voiceover,
                visualDesc: scene.visual,
                veo3Prompt: '' // Will be generated in separate step
            })) as any; // Type assertion needed due to TS cache, will work at runtime

            await prisma.scene.createMany({
                data: scenesData
            });
        }

        // 7. Also save to fullScript field for backward compatibility
        await updateProject(projectId, {
            fullScript: JSON.stringify(allScripts),
            status: "SCRIPT_GENERATED"
        });

        await updateTask(taskId, {
            status: 'COMPLETED',
            progress: 100,
            message: `✅ Đã tạo scripts cho ${allScripts.length} chapters thành công!`,
            result: { chaptersCount: allScripts.length },
            completedAt: new Date()
        });

        return {
            success: true,
            scripts: allScripts,
            errors: errors.length > 0 ? errors : undefined
        };

    } catch (error: any) {
        console.error("Error generating scripts:", error);
        await updateTask(taskId, {
            status: 'FAILED',
            error: error.message || 'Unknown error',
            completedAt: new Date()
        });
        return {
            success: false,
            error: error.message || "Failed to generate scripts"
        };
    }
}
