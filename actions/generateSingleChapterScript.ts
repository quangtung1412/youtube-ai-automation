'use server'

import { generateWithGemini, type ChapterScript, type SceneData } from "@/lib/gemini";
import { prisma } from "@/lib/db";
import { createTask, updateTask } from "./taskManager";

interface GenerateSingleChapterParams {
    projectId: string;
    chapterNumber: number;
    previousChapterScript?: ChapterScript; // Context from previous chapter
}

export async function generateSingleChapterScript({
    projectId,
    chapterNumber,
    previousChapterScript
}: GenerateSingleChapterParams) {
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
            message: `📝 Đang tạo script cho Chapter ${chapterNumber}...`,
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

        await updateTask(taskId, {
            progress: 15,
            message: `📚 Đã load project data. Đang phân tích Chapter ${chapterNumber}...`
        });

        const outline = JSON.parse(project.outlineData);
        const chapters = outline.chapters || [];

        // Find the target chapter
        const chapterData = chapters.find((ch: any) => ch.id === chapterNumber);
        if (!chapterData) {
            return { success: false, error: `Chapter ${chapterNumber} not found in outline` };
        }

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

        // 2. Load system config
        const config = await prisma.systemConfig.findUnique({
            where: { id: "global_config" }
        });

        const avgSceneDuration = config?.avgSceneDuration || 8;
        const speechRate = config?.speechRate || 2.5;
        const maxWordsPerScene = config?.maxWordsPerScene || 20;
        const veo3Template = config?.veo3Template || "[STYLE] of [CHARACTER] doing [ACTION], [BG], [LIGHTING]";
        const customInstructions = (config as any)?.scriptsPrompt || '';

        // 3. Build context
        const chapterIndex = chapters.findIndex((ch: any) => ch.id === chapterNumber);
        const prevChapter = chapterIndex > 0 ? chapters[chapterIndex - 1] : null;
        const nextChapter = chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : null;

        // Calculate timeline position
        const totalDuration = chapters.reduce((sum: number, ch: any) => sum + ch.duration_seconds, 0);
        const elapsedDuration = chapters
            .slice(0, chapterIndex)
            .reduce((sum: number, ch: any) => sum + ch.duration_seconds, 0);
        const progressPercent = Math.round((elapsedDuration / totalDuration) * 100);

        // System instruction
        const systemInstruction = `You are a professional video scriptwriter.

Channel: ${project.channel.name}
Persona: ${persona.character_desc}
Tone: ${persona.tone}
Style: ${persona.style}

Your task is to write a detailed, scene-by-scene script for this chapter.`;

        // Build context section
        let contextSection = `TIMELINE CONTEXT:
- Chapter Position: ${chapterIndex + 1} of ${chapters.length}
- Video Progress: ${progressPercent}% (${elapsedDuration}s elapsed, ${totalDuration - elapsedDuration}s remaining)
- Current Chapter Duration: ${chapterData.duration_seconds}s

VIDEO OVERVIEW:
Title: ${outline.title}${outline.title_vi ? ` (Vietnamese: ${outline.title_vi})` : ''}
Total Chapters: ${chapters.length}
Total Duration: ${totalDuration} seconds`;

        if (prevChapter) {
            contextSection += `

PREVIOUS CHAPTER (for continuity):
Title: ${prevChapter.title}
Summary: ${prevChapter.content_summary}`;

            // Add actual previous chapter script if available
            if (previousChapterScript && previousChapterScript.scenes.length > 0) {
                const lastScene = previousChapterScript.scenes[previousChapterScript.scenes.length - 1];
                contextSection += `
Last Scene from Previous Chapter:
- Voiceover: "${lastScene.voiceover}"
- Visual: "${lastScene.visual}"
→ Your script should naturally continue from this point.`;
            } else {
                contextSection += `
→ Your script should naturally transition from this topic.`;
            }
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
Title: ${chapterData.title}${chapterData.title_vi ? ` (Vietnamese: ${chapterData.title_vi})` : ''}
Content Summary: ${chapterData.content_summary}${chapterData.content_summary_vi ? `
Vietnamese Summary: ${chapterData.content_summary_vi}` : ''}
Target Duration: ${chapterData.duration_seconds} seconds

${contextSection}

VISUAL ASSETS (for consistency):
- Character: ${outline.veo3_assets.character}${outline.veo3_assets.character_vi ? ` (Vietnamese: ${outline.veo3_assets.character_vi})` : ''}
- Background: ${outline.veo3_assets.background_base}${outline.veo3_assets.background_base_vi ? ` (Vietnamese: ${outline.veo3_assets.background_base_vi})` : ''}
- Tone: ${outline.veo3_assets.tone}
- Style: ${outline.veo3_assets.style}

REQUIREMENTS:
1. Break into scenes of approximately ${avgSceneDuration} seconds each
2. Each scene must have:
   - Unique ID (sequential within chapter, starting from 1)
   - Duration in seconds
   - Voiceover text (what the narrator says)
   - Visual description (what appears on screen)
3. Total scenes should cover ${chapterData.duration_seconds} seconds
4. CRITICAL - Voiceover word count limit:
   - Maximum ${maxWordsPerScene} words per scene voiceover
   - This is to fit within ${avgSceneDuration}s video duration (speech rate: ${speechRate} words/second)
   - Count words carefully before finalizing each scene
   - Be concise and impactful
5. Make voiceover engaging and natural
6. Visual descriptions should be detailed and cinematically directed
7. Maintain narrative flow and coherence with previous chapter
8. Chapter position guidelines:
   ${chapterIndex === 0 ? '- Start with a strong hook to engage viewers' : ''}
   ${chapterIndex === chapters.length - 1 ? '- Conclude with a compelling ending and call-to-action' : ''}
   ${chapterIndex > 0 && chapterIndex < chapters.length - 1 ? '- Smoothly transition from previous chapter and lead into next chapter' : ''}

RESPONSE FORMAT (JSON):
{
  "chapter_id": ${chapterData.id},
  "chapter_title": "${chapterData.title}",
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
${previousChapterScript ? '- Continue smoothly from the previous chapter\'s ending' : ''}

${customInstructions ? `ADDITIONAL REQUIREMENTS:\n${customInstructions}` : ''}`;

        await updateTask(taskId, {
            progress: 40,
            message: `🤖 Đang gửi prompt cho AI để tạo ${Math.ceil(chapterData.duration_seconds / avgSceneDuration)} scenes...`
        });

        // Call Gemini
        const fullPrompt = `${systemInstruction}\n\n${prompt}`;
        const result = await generateWithGemini(fullPrompt, {
            projectId,
            userId: project.channel.userId,
            operation: 'GENERATE_SCRIPT'
        });

        if (!result.text) {
            await updateTask(taskId, {
                status: 'FAILED',
                error: 'No response from AI',
                completedAt: new Date()
            });
            return { success: false, error: "No response from AI" };
        }

        await updateTask(taskId, {
            progress: 70,
            message: `✅ Nhận được response từ AI. Đang xử lý và tạo VEO3 prompts...`
        });

        const chapterScript: ChapterScript = JSON.parse(result.text);

        await updateTask(taskId, {
            progress: 85,
            message: `💾 Đang lưu ${chapterScript.scenes.length} scenes vào database...`
        });

        // 4. Save to database
        const chapter = await prisma.chapter.findFirst({
            where: {
                projectId,
                chapterNumber
            }
        });

        if (!chapter) {
            return { success: false, error: `Chapter ${chapterNumber} not found in database` };
        }

        // Delete existing scenes for this chapter
        await prisma.scene.deleteMany({
            where: { chapterId: chapter.id }
        });

        // Create new scenes
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

        await updateTask(taskId, {
            status: 'COMPLETED',
            progress: 100,
            message: `✅ Hoàn thành Chapter ${chapterNumber}! Đã tạo ${chapterScript.scenes.length} scenes.`,
            result: {
                chapterNumber,
                scenesCreated: chapterScript.scenes.length,
                totalDuration: chapterScript.scenes.reduce((sum: number, s: SceneData) => sum + s.duration_seconds, 0)
            },
            completedAt: new Date()
        });

        return {
            success: true,
            script: chapterScript
        };

    } catch (error: any) {
        console.error(`Error generating script for chapter ${chapterNumber}:`, error);
        await updateTask(taskId, {
            status: 'FAILED',
            error: error.message || 'Unknown error',
            completedAt: new Date()
        });
        return {
            success: false,
            error: error.message || "Failed to generate chapter script"
        };
    }
}
