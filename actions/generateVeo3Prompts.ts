'use server'

import { prisma } from "@/lib/db";
import { getSystemConfig } from "./systemConfig";
import { GoogleGenAI } from "@google/genai";
import PQueue from "p-queue";
import { createTask, updateTask } from "./taskManager";
import { createAPICallLog, updateAPICallLog } from "./aiUsageTracking";

interface SceneWithChapter {
    id: string;
    sceneNumber: string;
    durationSeconds: number;
    voiceover: string;
    visualDesc: string;
    chapter: {
        id: string;
        chapterNumber: number;
        title: string;
        contentSummary: string;
    };
}

export async function generateVeo3Prompts(projectId: string) {
    // Create task for tracking
    const taskResult = await createTask(projectId, 'GENERATE_VEO3_PROMPTS');
    if (!taskResult.success || !taskResult.task) {
        return { success: false, error: "Failed to create task" };
    }
    const taskId = taskResult.task.id;

    try {
        await updateTask(taskId, {
            status: 'RUNNING',
            progress: 5,
            message: 'Đang tải cấu hình...',
            startedAt: new Date()
        });

        // 1. Load system config
        const config = await getSystemConfig();
        if (!config) {
            return {
                success: false,
                error: "System configuration not found"
            };
        }

        // Get custom instructions from DB (only additional requirements)
        const customInstructions = (config as any)?.veo3Prompt || '';

        // Note: VEO3 prompt generation uses concurrent processing for speed optimization
        // Concurrency set to 5 to balance between speed and API rate limits

        await updateTask(taskId, {
            progress: 10,
            message: 'Đang tải thông tin project và scenes...'
        });

        // 2. Load project with all necessary data
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { channel: true }
        });

        if (!project) {
            return {
                success: false,
                error: "Project not found"
            };
        }

        const chapters = await prisma.chapter.findMany({
            where: { projectId },
            include: {
                scenes: true
            },
            orderBy: { chapterNumber: 'asc' }
        });

        // Sort scenes numerically (sceneNumber is string like "1", "2", ..., "10")
        chapters.forEach(chapter => {
            if (chapter.scenes) {
                chapter.scenes.sort((a, b) => {
                    const numA = parseInt(a.sceneNumber) || 0;
                    const numB = parseInt(b.sceneNumber) || 0;
                    return numA - numB;
                });
            }
        });

        const items = await prisma.projectItem.findMany({
            where: { projectId }
        });

        // 3. Collect all scenes
        const allScenes: SceneWithChapter[] = [];
        for (const chapter of chapters) {
            for (const scene of chapter.scenes) {
                allScenes.push({
                    ...scene,
                    chapter: {
                        id: chapter.id,
                        chapterNumber: chapter.chapterNumber,
                        title: chapter.title,
                        contentSummary: chapter.contentSummary
                    }
                });
            }
        }

        if (allScenes.length === 0) {
            await updateTask(taskId, {
                status: 'FAILED',
                error: 'No scenes found in this project',
                completedAt: new Date()
            });
            return {
                success: false,
                error: "No scenes found in this project"
            };
        }

        await updateTask(taskId, {
            progress: 20,
            message: `Bắt đầu tạo VEO3 prompts cho ${allScenes.length} scenes...`
        });

        // 4. Parse persona settings
        const persona = JSON.parse((config as any).personaSettings || '{}');

        // 5. Prepare context for AI
        const context = {
            projectTitle: project.title,
            inputContent: project.inputContent.substring(0, 5000), // Limit context size
            channelName: (config as any).channelName || 'My Channel',
            videoRatio: project.videoRatio || '16:9',
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

        // 6. Initialize AI
        const apiKey = (config as any).apiKey || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return {
                success: false,
                error: "Google API key not configured"
            };
        }

        const genAI = new GoogleGenAI({ apiKey });

        // 7. Process scenes in batches with rate limiting
        const queue = new PQueue({
            concurrency: 3, // Process 3 scenes at a time
            interval: 1000, // Wait 1 second between batches
            intervalCap: 3
        });

        const results: Array<{ sceneId: string; prompt: string; error?: string }> = [];
        const totalScenes = allScenes.length;
        let completedScenes = 0;

        const generatePromptForScene = async (scene: SceneWithChapter, sceneIndex: number) => {
            try {
                // Check if task was cancelled
                const currentTask = await prisma.task.findUnique({
                    where: { id: taskId },
                    select: { status: true }
                });

                if (currentTask?.status === 'CANCELLED') {
                    throw new Error('Generation cancelled by user');
                }

                // Update task with current scene being processed
                const sceneProgress = Math.round(20 + (completedScenes / totalScenes) * 70);
                await updateTask(taskId, {
                    progress: sceneProgress,
                    message: `🎬 Scene ${sceneIndex + 1}/${totalScenes}: Chapter ${scene.chapter.chapterNumber} - Scene ${scene.sceneNumber}...`
                });

                console.log(`[Task ${taskId}] Processing scene ${sceneIndex + 1}/${totalScenes}: Chapter ${scene.chapter.chapterNumber}, Scene ${scene.sceneNumber}`);

                const prompt = `You are a VEO3 prompt generator for AI video creation. Generate a detailed, cinematic prompt for this scene.

**Project Context:**
- Title: ${context.projectTitle}
- Channel: ${context.channelName}
- Video Ratio: ${context.videoRatio}

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
- Voiceover: ${scene.voiceover}
- Visual Description: ${scene.visualDesc}

**Requirements:**
1. Use the VEO3 template structure
2. MUST include full character description (appearance, style, tone) in EVERY prompt
3. Include relevant items/props if mentioned in the scene
4. Be specific about camera angles, lighting, and movements
5. Keep the visual style consistent across all scenes
6. Make it cinematic and detailed (50-100 words)
7. Focus on what the character is DOING in this specific scene
8. Ensure the composition works for ${context.videoRatio} aspect ratio

${customInstructions ? `ADDITIONAL REQUIREMENTS:\n${customInstructions}\n\n` : ''}Generate ONLY the VEO3 prompt, no explanations:`;

                // Create API call log and get next available model
                const logResult = await createAPICallLog({
                    operation: 'GENERATE_VEO3_PROMPTS',
                    projectId,
                    userId: project.channel.userId,
                    promptPreview: prompt.substring(0, 500)
                });

                if (!logResult.success) {
                    throw new Error(logResult.error || 'Failed to initialize API call log');
                }

                const logId = logResult.log!.id;
                const modelToUse = logResult.modelId;

                if (!modelToUse) {
                    throw new Error('No model available for API call');
                }

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

                completedScenes++;

                // Update progress after completing scene
                const progressAfterScene = Math.round(20 + (completedScenes / totalScenes) * 70);
                await updateTask(taskId, {
                    progress: progressAfterScene,
                    message: `✅ Hoàn thành ${completedScenes}/${totalScenes} scenes...`
                });

                console.log(`[Task ${taskId}] ✓ Completed scene ${sceneIndex + 1}/${totalScenes}`);

                return {
                    sceneId: scene.id,
                    prompt: veo3Prompt
                };
            } catch (error: any) {
                console.error(`[Task ${taskId}] Error generating prompt for scene ${scene.id}:`, error);
                completedScenes++;
                return {
                    sceneId: scene.id,
                    prompt: '',
                    error: error.message
                };
            }
        };

        // Add all scene generation tasks to queue
        const tasks = allScenes.map((scene, index) =>
            queue.add(() => generatePromptForScene(scene, index))
        );

        // Wait for all tasks to complete
        const taskResults = await Promise.all(tasks);
        results.push(...(taskResults.filter(r => r !== undefined) as Array<{ sceneId: string; prompt: string; error?: string }>));

        await updateTask(taskId, {
            progress: 90,
            message: 'Đang lưu VEO3 prompts vào database...'
        });

        // 8. Update database with generated prompts
        const updatePromises = results
            .filter(r => r.prompt && !r.error)
            .map(r =>
                prisma.scene.update({
                    where: { id: r.sceneId },
                    data: { veo3Prompt: r.prompt }
                })
            );

        await Promise.all(updatePromises);

        // 9. Count successes and failures
        const successCount = results.filter(r => !r.error).length;
        const failureCount = results.filter(r => r.error).length;

        await updateTask(taskId, {
            status: 'COMPLETED',
            progress: 100,
            message: `✅ Đã tạo ${successCount}/${allScenes.length} VEO3 prompts!`,
            result: { successCount, failureCount, totalScenes: allScenes.length },
            completedAt: new Date()
        });

        return {
            success: true,
            taskId,
            totalScenes: allScenes.length,
            successCount,
            failureCount,
            errors: results.filter(r => r.error).map(r => r.error)
        };

    } catch (error: any) {
        console.error("Error in generateVeo3Prompts:", error);
        await updateTask(taskId, {
            status: 'FAILED',
            error: error.message || 'Unknown error',
            completedAt: new Date()
        });
        return {
            success: false,
            error: error.message || "Unknown error occurred"
        };
    }
}
