'use client'

import { useState, useEffect } from "react";
import { generateVeo3Prompts } from "@/actions/generateVeo3Prompts";
import { generateSingleSceneVeo3 } from "@/actions/generateSingleSceneVeo3";
import { cancelTask } from "@/actions/taskManager";

interface Scene {
    id: string;
    sceneNumber: string;
    durationSeconds: number;
    voiceover: string;
    voiceover_vi?: string;
    visualDesc: string;
    visualDesc_vi?: string;
    veo3Prompt?: string;
}

interface Chapter {
    id: string;
    chapterNumber: number;
    title: string;
    title_vi?: string;
    contentSummary: string;
    contentSummary_vi?: string;
    durationSeconds: number;
    scenes?: Scene[];
}

interface SceneGenerationState {
    status: 'idle' | 'generating' | 'completed' | 'error';
    error?: string;
    prompt?: string;
}

export default function VEO3PromptsManager({
    projectId,
    chapters: initialChapters,
    language = 'Vietnamese',
    isGenerating,
    setIsGenerating,
    generationProgress,
    setGenerationProgress,
    onChaptersUpdate,
    abortController,
    setAbortController,
    onAbort,
}: {
    projectId: string;
    chapters: Chapter[];
    language?: string;
    isGenerating: boolean;
    setIsGenerating: (value: boolean) => void;
    generationProgress: { current: number; total: number };
    setGenerationProgress: (value: { current: number; total: number }) => void;
    onChaptersUpdate: (chapters: Chapter[]) => void;
    abortController: AbortController | null;
    setAbortController: (controller: AbortController | null) => void;
    onAbort: () => void;
}) {
    const isBilingual = !language.toLowerCase().includes('vietnam');
    const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
    const [sceneStates, setSceneStates] = useState<Record<string, SceneGenerationState>>({});
    const [regeneratingScene, setRegeneratingScene] = useState<string | null>(null);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    const [expandedChapters, setExpandedChapters] = useState<Set<number>>(
        // Auto-expand all chapters initially
        new Set(initialChapters.map(ch => ch.chapterNumber))
    );

    const toggleChapter = (chapterNumber: number) => {
        setExpandedChapters(prev => {
            const newSet = new Set(prev);
            if (newSet.has(chapterNumber)) {
                newSet.delete(chapterNumber);
            } else {
                newSet.add(chapterNumber);
            }
            return newSet;
        });
    };

    // Update local chapters when props change
    useEffect(() => {
        setChapters(initialChapters);
    }, [initialChapters]);

    const totalScenes = chapters.reduce((sum, ch) => sum + (ch.scenes?.length || 0), 0);
    const scenesWithPrompts = chapters.reduce(
        (sum, ch) => sum + (ch.scenes?.filter(s => s.veo3Prompt).length || 0),
        0
    );

    // Collect all scenes in order
    const allScenes: Array<Scene & { chapterId: string; chapterNumber: number; chapterTitle: string }> = [];
    chapters.forEach(ch => {
        if (ch.scenes) {
            ch.scenes.forEach(scene => {
                allScenes.push({
                    ...scene,
                    chapterId: ch.id,
                    chapterNumber: ch.chapterNumber,
                    chapterTitle: ch.title
                });
            });
        }
    });

    // Handle abort by cancelling task
    const handleAbortGeneration = async () => {
        if (currentTaskId) {
            try {
                await cancelTask(currentTaskId);
                setCurrentTaskId(null);
                setIsGenerating(false);
                setAbortController(null);
                alert('⚠️ Generation cancelled. Current scene will finish, then stop.');
            } catch (error) {
                console.error('Failed to cancel task:', error);
            }
        }
    };

    // Handle Generate All - Batch processing (concurrent)
    const handleGenerateAll = async () => {
        if (allScenes.length === 0) {
            alert("No scenes to generate prompts for");
            return;
        }

        // Create abort controller
        const controller = new AbortController();
        setAbortController(controller);

        setIsGenerating(true);
        setGenerationProgress({ current: 0, total: totalScenes });

        console.log(`\n🚀 === STARTING BATCH VEO3 GENERATION FOR ${totalScenes} SCENES ===`);

        // Mark all scenes as generating
        const generatingStates: Record<string, SceneGenerationState> = {};
        allScenes.forEach(scene => {
            generatingStates[scene.id] = { status: 'generating' };
        });
        setSceneStates(generatingStates);

        try {
            const startTime = Date.now();

            // Call batch generation - processes all scenes concurrently with PQueue
            const result = await generateVeo3Prompts(projectId);

            // Store taskId for cancellation
            if (result.taskId) {
                setCurrentTaskId(result.taskId);
            }

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

            if (result.success) {
                console.log(`✅ [BATCH VEO3] Completed ${totalScenes} scenes in ${elapsed}s`);

                // Fetch updated chapters without full page reload
                window.location.reload();
            } else {
                console.error('❌ [BATCH VEO3] Failed:', result.error);
                alert(`Failed to generate VEO3 prompts: ${result.error}`);
            }
        } catch (error: any) {
            if (error.message?.includes('cancel')) {
                // User cancelled - already handled by abort handler
            } else {
                console.error('💥 [BATCH VEO3] Exception:', error);
                alert(`Error: ${error.message}`);
            }
        } finally {
            setAbortController(null);
            setCurrentTaskId(null);
            setIsGenerating(false);
        }
    };



    // Handle individual scene generation
    const handleGenerateForScene = async (sceneId: string) => {
        setRegeneratingScene(sceneId);

        try {
            const result = await generateSingleSceneVeo3({
                projectId,
                sceneId
            });
            if (result.success) {
                // Update the scene in local state
                setChapters(prevChapters => {
                    const newChapters = prevChapters.map(chapter => {
                        if (chapter.scenes) {
                            return {
                                ...chapter,
                                scenes: chapter.scenes.map(s =>
                                    s.id === sceneId ? { ...s, veo3Prompt: result.prompt } : s
                                )
                            };
                        }
                        return chapter;
                    });
                    // Call onChaptersUpdate after state update completes
                    setTimeout(() => onChaptersUpdate(newChapters), 0);
                    return newChapters;
                });
            } else {
                alert("Error: " + result.error);
            }
        } catch (error) {
            alert("Failed to generate VEO3 prompt");
        } finally {
            setRegeneratingScene(null);
        }
    };

    // Copy to clipboard utility
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">VEO3 Prompts Generator</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {scenesWithPrompts} / {totalScenes} scenes have VEO3 prompts
                    </p>
                </div>
                <div className="flex gap-3">
                    {/* Expand/Collapse All button */}
                    {!isGenerating && (
                        <button
                            onClick={() => {
                                if (expandedChapters.size === chapters.length) {
                                    // Collapse all
                                    setExpandedChapters(new Set());
                                } else {
                                    // Expand all
                                    setExpandedChapters(new Set(chapters.map(ch => ch.chapterNumber)));
                                }
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium shadow-sm transition flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                            </svg>
                            {expandedChapters.size === chapters.length ? 'Collapse All' : 'Expand All'}
                        </button>
                    )}
                    {isGenerating ? (
                        <button
                            onClick={handleAbortGeneration}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-sm transition flex items-center gap-2"
                        >
                            <span className="text-xl">⏹</span>
                            Stop Generation
                        </button>
                    ) : (
                        <button
                            onClick={handleGenerateAll}
                            disabled={isGenerating}
                            className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition"
                        >
                            🤖 Generate All VEO3 Prompts
                        </button>
                    )}
                </div>
            </div>

            {/* Prompts by Chapter */}
            <div className="space-y-6">
                {chapters.map((chapter) => {
                    const isExpanded = expandedChapters.has(chapter.chapterNumber);
                    const hasScenes = chapter.scenes && chapter.scenes.length > 0;

                    if (!hasScenes) return null;

                    return (
                        <div key={chapter.id} className="border-2 border-gray-200 rounded-lg overflow-hidden hover:border-indigo-300 transition">
                            {/* Chapter Header */}
                            <div
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 cursor-pointer"
                                onClick={() => toggleChapter(chapter.chapterNumber)}
                            >
                                <h4 className="font-semibold text-lg flex items-center">
                                    <span className="bg-white text-indigo-600 rounded-full w-7 h-7 flex items-center justify-center text-sm mr-3">
                                        {chapter.chapterNumber}
                                    </span>
                                    {chapter.title}
                                    {isBilingual && chapter.title_vi && (
                                        <span className="ml-2 text-sm text-green-200">
                                            🇻🇳 {chapter.title_vi}
                                        </span>
                                    )}
                                    {/* Expand/Collapse Icon */}
                                    <svg
                                        className={`ml-3 h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    <span className="ml-auto text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                                        {chapter.scenes!.filter(s => s.veo3Prompt && s.veo3Prompt.trim()).length}/{chapter.scenes!.length} prompts
                                    </span>
                                </h4>
                            </div>

                            {/* Scenes - Collapsible */}
                            {isExpanded && (
                                <div className="p-4 bg-gray-50 space-y-4">
                                    {chapter.scenes!.map((scene) => (
                                        <div key={scene.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                            {/* Scene Header */}
                                            <div className="bg-gray-100 px-4 py-2 flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-gray-700">
                                                        🎬 Scene {scene.sceneNumber}
                                                    </span>
                                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-medium">
                                                        {scene.durationSeconds}s
                                                    </span>
                                                    {sceneStates[scene.id]?.status === 'generating' ? (
                                                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-medium flex items-center gap-1">
                                                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Generating...
                                                        </span>
                                                    ) : scene.veo3Prompt && scene.veo3Prompt.trim() ? (
                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                                                            ✓ Generated
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <button
                                                    onClick={() => handleGenerateForScene(scene.id)}
                                                    disabled={regeneratingScene === scene.id || sceneStates[scene.id]?.status === 'generating'}
                                                    className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
                                                >
                                                    {regeneratingScene === scene.id || sceneStates[scene.id]?.status === 'generating' ? '⏳ Gen...' : '🔄 Regenerate'}
                                                </button>
                                            </div>                                        <div className="p-4 space-y-3">
                                                {/* Scene Context (collapsed view) */}
                                                <details className="group">
                                                    <summary className="cursor-pointer text-xs font-medium text-gray-600 hover:text-indigo-600 flex items-center gap-2">
                                                        <span className="group-open:rotate-90 transition-transform">▶</span>
                                                        View Scene Details
                                                    </summary>
                                                    <div className="mt-2 space-y-2 border-l-2 border-gray-200 pl-3">
                                                        <div>
                                                            <p className="text-xs font-semibold text-purple-700 mb-1">🎤 Voiceover</p>
                                                            <p className="text-xs text-gray-700 bg-purple-50 p-2 rounded">
                                                                {scene.voiceover}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-blue-700 mb-1">🎨 Visual</p>
                                                            <p className="text-xs text-gray-700 bg-blue-50 p-2 rounded">
                                                                {scene.visualDesc}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </details>

                                                {/* VEO3 Prompt or Generation State */}
                                                {sceneStates[scene.id]?.status === 'generating' ? (
                                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                                        <div className="flex items-center gap-3">
                                                            <svg className="animate-spin h-5 w-5 text-yellow-600" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            <div>
                                                                <p className="text-sm font-medium text-yellow-800">🤖 Generating VEO3 Prompt...</p>
                                                                <p className="text-xs text-yellow-600 mt-1">AI is crafting the perfect video prompt for this scene</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : sceneStates[scene.id]?.status === 'error' ? (
                                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                        <p className="text-xs text-red-800">
                                                            ❌ Error: {sceneStates[scene.id]?.error || 'Failed to generate'}
                                                        </p>
                                                    </div>
                                                ) : scene.veo3Prompt && scene.veo3Prompt.trim() ? (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-1 rounded">
                                                                🤖 VEO3 PROMPT
                                                            </span>
                                                            <button
                                                                onClick={() => copyToClipboard(scene.veo3Prompt!)}
                                                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded transition"
                                                            >
                                                                📋 Copy
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-indigo-900 bg-indigo-50 p-3 rounded font-mono border-l-4 border-indigo-400 leading-relaxed whitespace-pre-wrap">
                                                            {scene.veo3Prompt}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="bg-gray-100 rounded-lg p-4">
                                                        <div className="space-y-2">
                                                            {/* Skeleton loading for prompt */}
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className="text-xs font-semibold text-gray-400 bg-gray-200 px-2 py-1 rounded">
                                                                    🤖 VEO3 PROMPT
                                                                </span>
                                                                <span className="text-xs text-gray-400 bg-gray-200 px-3 py-1 rounded">
                                                                    Not Generated
                                                                </span>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                                                                <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6"></div>
                                                                <div className="h-3 bg-gray-200 rounded animate-pulse w-4/6"></div>
                                                            </div>
                                                            <div className="text-center mt-4">
                                                                <p className="text-xs text-gray-500 mb-2">
                                                                    Click "Generate" to create VEO3 prompt for this scene
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <p className="text-blue-800 text-sm">
                    💡 <strong>About VEO3 Prompts:</strong> These prompts are optimized for Google's VEO3 video generation model.
                    Each prompt describes the visual elements, camera movements, and scene composition based on your scene's voiceover and visual description.
                </p>
            </div>
        </div>
    );
}

