'use server'

import { generateWithGemini } from "@/lib/gemini";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createTask, updateTask } from "./taskManager";

interface GenerateCharacterPromptResult {
    success: boolean;
    characterVisual?: string;
    characterVisualVi?: string;
    error?: string;
}

interface GenerateBackgroundPromptResult {
    success: boolean;
    backgroundVisual?: string;
    backgroundVisualVi?: string;
    error?: string;
}

interface GenerateItemPromptsResult {
    success: boolean;
    items?: Array<{ id: string; visualDesc: string; visualDescVi?: string }>;
    error?: string;
}

export async function generateCharacterPrompt(projectId: string): Promise<GenerateCharacterPromptResult> {
    const taskResult = await createTask(projectId, 'GENERATE_CHARACTER');
    if (!taskResult.success || !taskResult.task) {
        return { success: false, error: "Failed to create task" };
    }
    const taskId = taskResult.task.id;

    try {
        await updateTask(taskId, {
            status: 'RUNNING',
            progress: 10,
            message: '🎨 Bắt đầu tạo mô tả character visual...',
            startedAt: new Date()
        });

        console.log(`[Task ${taskId}] Starting character prompt generation for project ${projectId}`);

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { channel: true }
        });

        if (!project) {
            return { success: false, error: "Project not found" };
        }

        await updateTask(taskId, {
            progress: 20,
            message: '📖 Đang phân tích nội dung project...'
        });

        const config = await prisma.systemConfig.findUnique({
            where: { id: "global_config" }
        });

        if (!config) {
            return { success: false, error: "System config not found" };
        }

        await updateTask(taskId, {
            progress: 30,
            message: '🤖 Đang chuẩn bị prompt cho AI...'
        });

        const persona = JSON.parse(config.personaSettings || '{}');
        const language = config.language || "Vietnamese";
        const isVietnamese = language.toLowerCase().includes('vietnam');

        // Get custom instructions from DB
        const customInstructions = (config as any)?.characterPrompt || '';

        const systemInstruction = `You are a professional Visual Designer and Character Artist.

Project Context:
- Video Language: ${language}
- Video Ratio: ${project.videoRatio}
- Storytelling Style: ${project.styleStorytelling || 'Cinematic'}
- Main Character: ${project.mainCharacterDesc || 'Not specified'}

Channel Persona:
- Character: ${persona.character || "Not specified"}
- Tone: ${persona.tone || "professional"}
- Style: ${persona.style || "cinematic"}

Your task is to create a detailed, professional character description for AI video generation (VEO3, Runway, etc.).`;

        const prompt = `Based on the following project content, create a comprehensive CHARACTER VISUAL DESCRIPTION:

PROJECT CONTENT:
${project.inputContent}

MAIN CHARACTER HINT:
${project.mainCharacterDesc || 'Extract from content'}

REQUIREMENTS:
Create a single, cohesive paragraph covering:
- Physical appearance (age, gender, build, facial features)
- Clothing/costume details (colors, style, materials)
- Distinctive features or accessories
- Overall visual style consistent with ${project.styleStorytelling || 'cinematic'} storytelling
- Technical details for AI video generation (camera angles, lighting preferences)

${!isVietnamese ? `
BILINGUAL OUTPUT REQUIRED:
Provide TWO versions as single paragraphs.

IMPORTANT: Return ONLY valid JSON. Each field must be a SINGLE STRING (one paragraph), NOT an object or numbered list.

Response JSON format:
{
  "character_visual": "A single comprehensive paragraph describing the character in ${language}. Include all details in one flowing text without numbering or sections.",
  "character_visual_vi": "Một đoạn văn duy nhất mô tả chi tiết nhân vật bằng tiếng Việt. Bao gồm tất cả chi tiết trong một văn bản liền mạch."
}
` : `
IMPORTANT: Return ONLY valid JSON. The field must be a SINGLE STRING (one paragraph), NOT an object or numbered list.

Response JSON format:
{
  "character_visual": "Một đoạn văn duy nhất mô tả chi tiết nhân vật chính. Bao gồm tất cả các yếu tố trong một văn bản liền mạch."
}
`}

${customInstructions ? `ADDITIONAL REQUIREMENTS:\n${customInstructions}\n\n` : ''}Make the description vivid, specific, and optimized for AI video generation tools.`;

        await updateTask(taskId, {
            progress: 60,
            message: '📡 Đang gửi request đến Gemini API...'
        });

        console.log(`[Task ${taskId}] Sending character prompt to Gemini...`);

        const fullPrompt = `${systemInstruction}\n\n${prompt}`;
        const result = await generateWithGemini(fullPrompt, {
            userId: project.channel.userId,
            projectId,
            operation: 'GENERATE_IMAGE_PROMPTS'
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
            progress: 80,
            message: '💾 Đang xử lý và lưu kết quả...'
        });

        console.log(`[Task ${taskId}] Processing AI response...`);

        const response = JSON.parse(result.text);

        // Handle structured response (with numbered sections) - convert to single string
        let characterVisual = response.character_visual;
        let characterVisualVi = response.character_visual_vi;

        // If AI returned an object with numbered keys, concatenate them into a single string
        if (typeof characterVisual === 'object' && characterVisual !== null) {
            characterVisual = Object.values(characterVisual).join(' ');
        }
        if (typeof characterVisualVi === 'object' && characterVisualVi !== null) {
            characterVisualVi = Object.values(characterVisualVi).join(' ');
        }

        // Save to database
        const updateData: any = {
            characterVisual: characterVisual
        };

        if (!isVietnamese && characterVisualVi) {
            updateData.characterVisualVi = characterVisualVi;
        }

        await prisma.project.update({
            where: { id: projectId },
            data: updateData
        });

        revalidatePath(`/dashboard/projects/${projectId}`);

        await updateTask(taskId, {
            status: 'COMPLETED',
            progress: 100,
            message: '✅ Hoàn thành tạo character visual description!',
            result: { characterVisual, characterVisualVi },
            completedAt: new Date()
        });

        console.log(`[Task ${taskId}] ✓ Character prompt generation completed`);

        return {
            success: true,
            characterVisual: response.character_visual,
            characterVisualVi: response.character_visual_vi
        };

    } catch (error: any) {
        console.error(`[Task ${taskId}] Error:`, error);
        await updateTask(taskId, {
            status: 'FAILED',
            error: error.message || 'Unknown error',
            completedAt: new Date()
        });
        return {
            success: false,
            error: error.message || "Failed to generate character prompt"
        };
    }
}

export async function generateBackgroundPrompt(projectId: string): Promise<GenerateBackgroundPromptResult> {
    const taskResult = await createTask(projectId, 'GENERATE_BACKGROUND');
    if (!taskResult.success || !taskResult.task) {
        return { success: false, error: "Failed to create task" };
    }
    const taskId = taskResult.task.id;

    try {
        await updateTask(taskId, {
            status: 'RUNNING',
            progress: 10,
            message: 'Đang tạo mô tả background...',
            startedAt: new Date()
        });
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { channel: true }
        });

        if (!project) {
            return { success: false, error: "Project not found" };
        }

        const config = await prisma.systemConfig.findUnique({
            where: { id: "global_config" }
        });

        if (!config) {
            return { success: false, error: "System config not found" };
        }

        const persona = JSON.parse(config.personaSettings || '{}');
        const language = config.language || "Vietnamese";
        const isVietnamese = language.toLowerCase().includes('vietnam');

        // Get custom instructions from DB
        const customInstructions = (config as any)?.backgroundPrompt || '';

        const systemInstruction = `You are a professional Visual Designer and Environment Artist.

Project Context:
- Video Language: ${language}
- Video Ratio: ${project.videoRatio}
- Storytelling Style: ${project.styleStorytelling || 'Cinematic'}

Channel Persona:
- Background Theme: ${persona.background || "minimalist"}
- Tone: ${persona.tone || "professional"}
- Style: ${persona.style || "cinematic"}

Your task is to create a detailed, professional background/environment description for AI video generation.`;

        const prompt = `Based on the following project content, create a comprehensive BACKGROUND/ENVIRONMENT VISUAL DESCRIPTION:

PROJECT CONTENT:
${project.inputContent}

REQUIREMENTS:
Create a single, cohesive paragraph covering:
- Overall environment setting (indoor/outdoor, time period, location type)
- Lighting conditions and atmosphere
- Color palette and mood
- Key environmental elements and props
- Spatial layout and composition (optimized for ${project.videoRatio} aspect ratio)
- Technical details for AI video generation (depth, perspective, camera movement)

${!isVietnamese ? `
BILINGUAL OUTPUT REQUIRED:
Provide TWO versions as single paragraphs.

IMPORTANT: Return ONLY valid JSON. Each field must be a SINGLE STRING (one paragraph), NOT an object or numbered list.

Response JSON format:
{
  "background_visual": "A single comprehensive paragraph describing the entire background in ${language}. Include all details in one flowing text without numbering or sections.",
  "background_visual_vi": "Một đoạn văn duy nhất mô tả toàn bộ background bằng tiếng Việt. Bao gồm tất cả chi tiết trong một văn bản liền mạch."
}
` : `
IMPORTANT: Return ONLY valid JSON. The field must be a SINGLE STRING (one paragraph), NOT an object or numbered list.

Response JSON format:
{
  "background_visual": "Một đoạn văn duy nhất mô tả chi tiết môi trường/background. Bao gồm tất cả các yếu tố trong một văn bản liền mạch."
}
`}

${customInstructions ? `ADDITIONAL REQUIREMENTS:\n${customInstructions}\n\n` : ''}Make the description atmospheric, specific, and optimized for AI video generation tools.`;

        await updateTask(taskId, {
            progress: 60,
            message: '📡 Đang gửi request đến Gemini API...'
        });

        console.log(`[Task ${taskId}] Sending background prompt to Gemini...`);

        const fullPrompt = `${systemInstruction}\n\n${prompt}`;
        const result = await generateWithGemini(fullPrompt, {
            userId: project.channel.userId,
            projectId,
            operation: 'GENERATE_IMAGE_PROMPTS'
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
            progress: 80,
            message: '💾 Đang xử lý và lưu kết quả...'
        });

        console.log(`[Task ${taskId}] Processing AI response...`);

        const response = JSON.parse(result.text);

        // Handle structured response (with numbered sections) - convert to single string
        let backgroundVisual = response.background_visual;
        let backgroundVisualVi = response.background_visual_vi;

        // If AI returned an object with numbered keys, concatenate them into a single string
        if (typeof backgroundVisual === 'object' && backgroundVisual !== null) {
            backgroundVisual = Object.values(backgroundVisual).join(' ');
        }
        if (typeof backgroundVisualVi === 'object' && backgroundVisualVi !== null) {
            backgroundVisualVi = Object.values(backgroundVisualVi).join(' ');
        }

        // Save to database
        const updateData: any = {
            backgroundVisual: backgroundVisual
        };

        if (!isVietnamese && backgroundVisualVi) {
            updateData.backgroundVisualVi = backgroundVisualVi;
        }

        await prisma.project.update({
            where: { id: projectId },
            data: updateData
        });

        revalidatePath(`/dashboard/projects/${projectId}`);

        await updateTask(taskId, {
            status: 'COMPLETED',
            progress: 100,
            message: '✅ Đã tạo mô tả background thành công!',
            completedAt: new Date()
        });

        return {
            success: true,
            backgroundVisual: response.background_visual,
            backgroundVisualVi: response.background_visual_vi
        };

    } catch (error: any) {
        console.error("Error generating background prompt:", error);
        await updateTask(taskId, {
            status: 'FAILED',
            error: error.message || 'Unknown error',
            completedAt: new Date()
        });
        return {
            success: false,
            error: error.message || "Failed to generate background prompt"
        };
    }
}

export async function generateAllItemPrompts(projectId: string): Promise<GenerateItemPromptsResult> {
    const taskResult = await createTask(projectId, 'GENERATE_ITEMS');
    if (!taskResult.success || !taskResult.task) {
        return { success: false, error: "Failed to create task" };
    }
    const taskId = taskResult.task.id;

    try {
        await updateTask(taskId, {
            status: 'RUNNING',
            progress: 10,
            message: 'Đang tạo mô tả cho các items...',
            startedAt: new Date()
        });
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                channel: true,
                items: true
            }
        });

        if (!project) {
            return { success: false, error: "Project not found" };
        }

        if (!project.items || project.items.length === 0) {
            return { success: false, error: "No items to generate prompts for" };
        }

        const config = await prisma.systemConfig.findUnique({
            where: { id: "global_config" }
        });

        if (!config) {
            return { success: false, error: "System config not found" };
        }

        // Get custom instructions from DB
        const customInstructions = (config as any)?.itemsPrompt || '';

        const language = config.language || "Vietnamese";
        const isVietnamese = language.toLowerCase().includes('vietnam');

        const systemInstruction = `You are a professional Visual Designer specializing in object and prop design for video content.

Project Context:
- Video Language: ${language}
- Video Ratio: ${project.videoRatio}
- Storytelling Style: ${project.styleStorytelling || 'Cinematic'}

Your task is to create detailed visual descriptions for multiple items/objects that will appear in the video.`;

        const itemsContext = project.items.map((item, idx) =>
            `Item ${idx + 1}:
Name: ${item.name}
Description: ${item.description}
Context: ${item.context}`
        ).join('\n\n');

        const prompt = `Based on the project content and item details, create VISUAL DESCRIPTIONS for each item:

PROJECT CONTENT:
${project.inputContent.substring(0, 1000)}...

ITEMS TO DESCRIBE:
${itemsContext}

REQUIREMENTS for each item:
Create a single, cohesive sentence or paragraph covering:
- Physical appearance (size, shape, color, material)
- Distinctive features or details
- How it should appear in the video context
- Visual style consistent with the project's storytelling style

${!isVietnamese ? `
BILINGUAL OUTPUT REQUIRED:
Provide TWO versions for each item as single paragraphs.

IMPORTANT: Return ONLY valid JSON. Each description must be a SINGLE STRING, NOT an object or numbered list.

Response JSON format:
{
  "items": [
    {
      "item_index": 1,
      "visual_desc": "A single comprehensive paragraph describing the item in ${language}. Include all details in one flowing text.",
      "visual_desc_vi": "Một đoạn văn duy nhất mô tả item bằng tiếng Việt. Bao gồm tất cả chi tiết trong một văn bản liền mạch."
    }
  ]
}
` : `
IMPORTANT: Return ONLY valid JSON. Each description must be a SINGLE STRING, NOT an object or numbered list.

Response JSON format:
{
  "items": [
    {
      "item_index": 1,
      "visual_desc": "Một đoạn văn duy nhất mô tả chi tiết visual của item"
    }
  ]
}
`}

${customInstructions ? `ADDITIONAL REQUIREMENTS:\n${customInstructions}\n\n` : ''}Return descriptions for ALL ${project.items.length} items.`;

        await updateTask(taskId, {
            progress: 60,
            message: '📡 Đang gửi request đến Gemini API...'
        });

        console.log(`[Task ${taskId}] Sending items prompt to Gemini...`);

        const fullPrompt = `${systemInstruction}\n\n${prompt}`;
        const result = await generateWithGemini(fullPrompt, {
            userId: project.channel.userId,
            projectId,
            operation: 'GENERATE_IMAGE_PROMPTS'
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
            progress: 80,
            message: '💾 Đang xử lý và lưu kết quả...'
        });

        console.log(`[Task ${taskId}] Processing AI response...`);

        const response = JSON.parse(result.text);

        if (!response.items || !Array.isArray(response.items)) {
            return { success: false, error: "Invalid response format from AI" };
        }

        // Update all items in database
        const updatedItems = [];
        for (let i = 0; i < project.items.length && i < response.items.length; i++) {
            const item = project.items[i];
            const aiItem = response.items[i];

            const updateData: any = {
                visualDesc: aiItem.visual_desc
            };

            if (!isVietnamese && aiItem.visual_desc_vi) {
                updateData.visualDescVi = aiItem.visual_desc_vi;
            }

            await prisma.projectItem.update({
                where: { id: item.id },
                data: updateData
            });

            updatedItems.push({
                id: item.id,
                visualDesc: aiItem.visual_desc,
                visualDescVi: aiItem.visual_desc_vi
            });
        }

        revalidatePath(`/dashboard/projects/${projectId}`);

        await updateTask(taskId, {
            status: 'COMPLETED',
            progress: 100,
            message: `✅ Đã tạo mô tả cho ${updatedItems.length} items!`,
            completedAt: new Date()
        });

        return {
            success: true,
            items: updatedItems
        };

    } catch (error: any) {
        console.error("Error generating item prompts:", error);
        await updateTask(taskId, {
            status: 'FAILED',
            error: error.message || 'Unknown error',
            completedAt: new Date()
        });
        return {
            success: false,
            error: error.message || "Failed to generate item prompts"
        };
    }
}
