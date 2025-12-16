'use server'

import { prisma } from "@/lib/db";
import { getSystemConfig } from "./systemConfig";
import { GoogleGenAI } from "@google/genai";
import { createTask, updateTask } from "./taskManager";
import { createAPICallLog, updateAPICallLog } from "./aiUsageTracking";

export async function generateSingleSceneVeo3({
    projectId,
    sceneId,
    taskId
}: {
    projectId: string;
    sceneId: string;
    taskId?: string;
}) {
    // Create task if not provided (for individual scene generation)
    let localTaskId = taskId;
    if (!localTaskId) {
        const taskResult = await createTask(projectId, 'GENERATE_VEO3_PROMPTS');
        if (!taskResult.success || !taskResult.task) {
            return { success: false, error: "Failed to create task" };
        }
        localTaskId = taskResult.task.id;
    }

    try {
        // Load scene with chapter info
        const scene = await prisma.scene.findUnique({
            where: { id: sceneId },
            include: {
                chapter: {
                    include: {
                        project: {
                            include: {
                                channel: true
                            }
                        }
                    }
                }
            }
        });

        if (!scene) {
            await updateTask(localTaskId, {
                status: 'FAILED',
                error: 'Scene not found',
                completedAt: new Date()
            });
            return { success: false, error: "Scene not found" };
        }

        const project = scene.chapter.project;

        await updateTask(localTaskId, {
            status: 'RUNNING',
            progress: 20,
            message: `🎬 Đang tạo VEO3 prompt cho Scene ${scene.sceneNumber} (Chapter ${scene.chapter.chapterNumber})...`,
            startedAt: new Date()
        });

        // Load system config
        const config = await getSystemConfig();
        if (!config) {
            return { success: false, error: "System configuration not found" };
        }

        const customInstructions = (config as any)?.veo3Prompt || '';

        await updateTask(localTaskId, {
            progress: 40,
            message: '🤖 Đang gửi request đến AI...'
        });

        // Parse persona settings
        const persona = JSON.parse(project.channel.personaSettings);

        // Load project items
        const items = await prisma.projectItem.findMany({
            where: { projectId }
        });

        // Prepare context
        const context = {
            projectTitle: project.title,
            channelName: project.channel.name,
            character: {
                description: persona.character || '',
                tone: persona.tone || '',
                style: persona.style || '',
                background: persona.background || ''
            },
            characterVisual: (project as any).characterVisual || '',
            backgroundVisual: (project as any).backgroundVisual || '',
            veo3Template: config.veo3Template,
            items: items.map((item: any) => ({
                name: item.name,
                description: item.description,
                visualDesc: item.visualDesc || item.description
            }))
        };

        // Initialize AI
        const apiKey = (config as any).apiKey || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return { success: false, error: "Google API key not configured" };
        }

        const genAI = new GoogleGenAI({ apiKey });

        // Build prompt
        const prompt = `You are a VEO3 prompt generator for AI video creation. Generate a detailed, cinematic prompt for this scene.

**Project Context:**
- Title: ${context.projectTitle}
- Channel: ${context.channelName}

**Character Settings (MUST use in every prompt):**
- Character: ${context.character.description}
- Tone: ${context.character.tone}
- Style: ${context.character.style}
- Background: ${context.character.background}

**Visual Assets:**
- Character Visual: ${context.characterVisual}
- Background Visual: ${context.backgroundVisual}

**Important Items in this project:**
${context.items.map((item: any) => `- ${item.name}: ${item.visualDesc}`).join('\n')}

**VEO3 Template:**
${context.veo3Template}

**Current Scene:**
- Chapter: ${scene.chapter.title}
- Scene ${scene.sceneNumber} (${scene.durationSeconds}s)
- **Character's Spoken Words (Voiceover):** "${scene.voiceover}"
- Visual Description: ${scene.visualDesc}

**CRITICAL Requirements:**
1. Use the VEO3 template structure
2. MUST include full character description (appearance, style, tone) in EVERY prompt
3. **The character MUST BE SPEAKING the voiceover text above** - show them talking/narrating these exact words
4. Include mouth movements and facial expressions appropriate for speaking
5. Include relevant items/props if mentioned in the scene
6. Be specific about camera angles, lighting, and movements
7. Keep the visual style consistent across all scenes
8. Make it cinematic and detailed (50-100 words)
9. Focus on what the character is DOING while speaking in this specific scene

${customInstructions ? `ADDITIONAL REQUIREMENTS:\n${customInstructions}\n\n` : ''}Generate ONLY the VEO3 prompt, no explanations:`;

        await updateTask(localTaskId, {
            progress: 60,
            message: '⏳ AI đang xử lý...'
        });

        // Create API call log and get next available model
        const logResult = await createAPICallLog({
            operation: 'GENERATE_VEO3_PROMPTS',
            userId: project.channel.userId,
            projectId,
            promptPreview: prompt.substring(0, 500)
        });

        if (!logResult.success) {
            await updateTask(localTaskId, {
                status: 'FAILED',
                error: logResult.error || 'Failed to initialize API call log',
                completedAt: new Date()
            });
            return { success: false, error: logResult.error || 'Failed to initialize API call log' };
        }

        const logId = logResult.log!.id;
        const modelToUse = logResult.modelId!;

        let veo3Prompt = '';
        try {
            const response = await genAI.models.generateContent({
                model: modelToUse,
                contents: prompt,
                config: {
                    temperature: 0.7,
                }
            });

            veo3Prompt = response.text || '';

            if (!veo3Prompt) {
                await updateAPICallLog({
                    logId,
                    status: 'FAILED',
                    error: 'AI returned empty response',
                    inputTokens: 0,
                    outputTokens: 0,
                    responsePreview: ''
                });
                await updateTask(localTaskId, {
                    status: 'FAILED',
                    error: 'AI returned empty response',
                    completedAt: new Date()
                });
                return { success: false, error: "AI returned empty response" };
            }

            // Update log with success
            await updateAPICallLog({
                logId,
                status: 'SUCCESS',
                inputTokens: (response as any).usage?.inputTokens || 0,
                outputTokens: (response as any).usage?.outputTokens || 0,
                responsePreview: veo3Prompt.substring(0, 500)
            });

        } catch (apiError: any) {
            // Update log with failure
            await updateAPICallLog({
                logId,
                status: 'FAILED',
                error: apiError.message,
                inputTokens: 0,
                outputTokens: 0,
                responsePreview: ''
            });
            throw apiError;
        }

        await updateTask(localTaskId, {
            progress: 80,
            message: '💾 Đang lưu VEO3 prompt...'
        });

        // Update scene with VEO3 prompt
        await prisma.scene.update({
            where: { id: sceneId },
            data: { veo3Prompt }
        });

        await updateTask(localTaskId, {
            status: 'COMPLETED',
            progress: 100,
            message: `✅ Hoàn thành VEO3 prompt cho Scene ${scene.sceneNumber}!`,
            result: { sceneId, sceneNumber: scene.sceneNumber, chapterNumber: scene.chapter.chapterNumber },
            completedAt: new Date()
        });

        return {
            success: true,
            prompt: veo3Prompt
        };

    } catch (error: any) {
        console.error(`Error generating VEO3 prompt for scene ${sceneId}:`, error);
        await updateTask(localTaskId, {
            status: 'FAILED',
            error: error.message || 'Unknown error',
            completedAt: new Date()
        });
        return {
            success: false,
            error: error.message || "Failed to generate VEO3 prompt"
        };
    }
}
