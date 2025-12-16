'use server'

import { generateWithGemini, type OutlineResponse } from "@/lib/gemini";
import { prisma } from "@/lib/db";
import { updateProject } from "./projects";
import { createTask, updateTask } from "./taskManager";

export async function generateOutline(projectId: string) {
    // Create task for tracking
    const taskResult = await createTask(projectId, 'GENERATE_OUTLINE');
    if (!taskResult.success || !taskResult.task) {
        return { success: false, error: "Failed to create task" };
    }
    const taskId = taskResult.task.id;

    try {
        // Update task to RUNNING
        await updateTask(taskId, {
            status: 'RUNNING',
            progress: 10,
            message: 'Đang tải thông tin project...',
            startedAt: new Date()
        });

        // 1. Lấy thông tin project (không cần channel nữa)
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { channel: true }
        });

        if (!project) {
            await updateTask(taskId, {
                status: 'FAILED',
                error: 'Project not found',
                completedAt: new Date()
            });
            return { success: false, error: "Project not found" };
        }

        await updateTask(taskId, {
            progress: 20,
            message: 'Đang tải cấu hình hệ thống...'
        });

        // 2. Lấy system config (bao gồm persona settings)
        const config = await prisma.systemConfig.findUnique({
            where: { id: "global_config" }
        });

        if (!config) {
            return { success: false, error: "System config not found" };
        }

        // Parse persona settings từ SystemConfig
        const persona = JSON.parse(config.personaSettings || '{}');
        const minDuration = config.minVideoDuration || 600;
        const language = config.language || "Vietnamese";
        const isVietnamese = language.toLowerCase().includes('vietnam');

        // 3. Tạo System Instruction
        let systemInstruction = `You are a professional Showrunner and Video Producer for the YouTube channel: "${config.channelName}".

Channel Persona:
- Character: ${persona.character || "Not specified"}
- Tone: ${persona.tone || "professional"}
- Style: ${persona.style || "cinematic"}
- Background Theme: ${persona.background || "minimalist"}
- Primary Language: ${language}

Your task is to analyze content and create a comprehensive video outline that will result in a ${Math.floor(minDuration / 60)}-minute or longer video.${!isVietnamese ? '\n\nIMPORTANT: Since the primary language is ' + language + ', you MUST provide BOTH versions:\n1. Original content in ' + language + '\n2. Vietnamese translation (with _vi suffix in JSON keys)' : ''}`;

        // Add custom instructions from settings if available
        const customInstructions = (config as any)?.outlinePrompt || '';
        if (customInstructions) {
            systemInstruction += `\n\nADDITIONAL INSTRUCTIONS:\n${customInstructions}`;
        }

        // 4. Tạo Prompt
        const bilingualExample = !isVietnamese ? `

FOR NON-VIETNAMESE LANGUAGE:
Since the primary language is ${language}, provide BOTH versions:
{
  "title": "Title in ${language}",
  "title_vi": "Tiêu đề tiếng Việt",
  "chapters": [
    {
      "id": 1,
      "title": "Chapter title in ${language}",
      "title_vi": "Tiêu đề chương tiếng Việt",
      "content_summary": "Summary in ${language}",
      "content_summary_vi": "Tóm tắt nội dung tiếng Việt",
      "duration_seconds": 120
    }
  ],
  "veo3_assets": {
    "character": "Character description in ${language}",
    "character_vi": "Mô tả nhân vật tiếng Việt",
    "background_base": "Background in ${language}",
    "background_base_vi": "Nền tiếng Việt",
    "tone": "Visual tone",
    "style": "Visual style"
  }
}` : '';

        const prompt = `Analyze the following content and create a detailed video outline:

CONTENT:
${project.inputContent}

REQUIREMENTS:
1. Create a compelling title for the video${!isVietnamese ? ' in ' + language + ' (and provide Vietnamese translation as title_vi)' : ''}
2. Break down into multiple chapters (at least ${Math.ceil(minDuration / 120)} chapters for ${Math.floor(minDuration / 60)}+ minutes)
3. Each chapter should have:
   - Unique ID (sequential number)
   - Descriptive title${!isVietnamese ? ' in ' + language + ' (and title_vi for Vietnamese)' : ''}
   - Content summary${!isVietnamese ? ' in ' + language + ' (and content_summary_vi for Vietnamese)' : ''}
   - Estimated duration in seconds (aim for 60-180 seconds per chapter)
4. Define visual assets:
   - Detailed character description for VEO3${!isVietnamese ? ' in ' + language + ' (and character_vi for Vietnamese)' : ''}
   - Background base description${!isVietnamese ? ' in ' + language + ' (and background_base_vi for Vietnamese)' : ''}
   - Overall tone and style

RESPONSE FORMAT (JSON):${bilingualExample || `
{
  "title": "Engaging video title",
  "chapters": [
    {
      "id": 1,
      "title": "Chapter title",
      "content_summary": "What this chapter covers in detail",
      "duration_seconds": 120
    }
  ],
  "veo3_assets": {
    "character": "Detailed character description for consistent video generation",
    "background_base": "Base background/environment description",
    "tone": "Visual tone (e.g., cinematic, dramatic, upbeat)",
    "style": "Visual style (e.g., realistic, anime, cartoon)"
  }
}`}

IMPORTANT:
- Total duration should be at least ${minDuration} seconds
- Be thorough - use the full context provided
- Make chapters engaging and well-structured
- Ensure visual descriptions are detailed and consistent`;

        // 5. Call Gemini
        await updateTask(taskId, {
            progress: 40,
            message: 'Đang gửi yêu cầu đến AI...'
        });

        const fullPrompt = `${systemInstruction}

${prompt}`;
        const result = await generateWithGemini(fullPrompt, {
            projectId,
            userId: project.channel.userId,
            operation: 'GENERATE_OUTLINE'
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
            message: 'Đang xử lý kết quả từ AI...'
        });

        const outlineData: OutlineResponse = JSON.parse(result.text);

        // 6. Validate and save
        if (!outlineData.title || !outlineData.chapters || outlineData.chapters.length === 0) {
            await updateTask(taskId, {
                status: 'FAILED',
                error: 'Invalid outline data from AI',
                completedAt: new Date()
            });
            return { success: false, error: "Invalid outline data from AI" };
        }

        await updateTask(taskId, {
            progress: 85,
            message: 'Đang lưu outline vào database...'
        });

        // Save VEO3 assets and update project
        await prisma.project.update({
            where: { id: projectId },
            data: {
                outlineData: JSON.stringify(outlineData),
                status: "OUTLINE_GENERATED"
            }
        });

        // Save chapters individually for editing
        await prisma.chapter.deleteMany({
            where: { projectId }
        });

        await prisma.chapter.createMany({
            data: outlineData.chapters.map(ch => ({
                projectId,
                chapterNumber: ch.id,
                title: ch.title,
                title_vi: ch.title_vi || "",
                contentSummary: ch.content_summary,
                contentSummary_vi: ch.content_summary_vi || "",
                durationSeconds: ch.duration_seconds,
                goal: ""
            }))
        });

        await updateTask(taskId, {
            status: 'COMPLETED',
            progress: 100,
            message: `✅ Đã tạo ${outlineData.chapters.length} chapters thành công!`,
            result: { chaptersCount: outlineData.chapters.length },
            completedAt: new Date()
        });

        return {
            success: true,
            outline: outlineData
        };

    } catch (error: any) {
        console.error("Error generating outline:", error);
        await updateTask(taskId, {
            status: 'FAILED',
            error: error.message || 'Unknown error',
            completedAt: new Date()
        });
        return {
            success: false,
            error: error.message || "Failed to generate outline"
        };
    }
}
