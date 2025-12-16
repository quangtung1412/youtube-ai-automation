'use client'

import { useState, useEffect, useRef } from "react";
import { generateScriptsBatch } from "@/actions/generateScript";
import { generateSingleChapterScript } from "@/actions/generateSingleChapterScript";

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

type ChapterStatus = 'idle' | 'queued' | 'generating' | 'completed' | 'error';

interface ChapterGenerationState {
    status: ChapterStatus;
    error?: string;
    scenes?: any[];
}

export default function ScenesManagerSequential({
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
    chapterGenerationStates,
    setChapterGenerationStates,
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
    chapterGenerationStates: Record<number, { status: ChapterStatus; error?: string }>;
    setChapterGenerationStates: (states: Record<number, { status: ChapterStatus; error?: string }>) => void;
}) {
    const isBilingual = !language.toLowerCase().includes('vietnam');
    const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
    const [regeneratingChapter, setRegeneratingChapter] = useState<number | null>(null);
    const [expandedChapters, setExpandedChapters] = useState<Set<number>>(
        // Auto-expand all chapters initially
        new Set(initialChapters.map(ch => ch.chapterNumber))
    );

    const hasAnyScenes = chapters.some(ch => ch.scenes && ch.scenes.length > 0);

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

    const handleGenerateAll = async () => {
        if (!confirm("Generate scripts for all chapters? This will use BATCH processing for faster generation.")) {
            return;
        }

        // Create abort controller
        const controller = new AbortController();
        setAbortController(controller);

        console.log('🚀 [BATCH GENERATION] Starting generation for', chapters.length, 'chapters');
        setIsGenerating(true);
        setGenerationProgress({ current: 0, total: chapters.length });

        // Mark all as queued first (waiting to be processed in batch)
        const queuedStates: Record<number, { status: ChapterStatus; error?: string }> = {};
        chapters.forEach(ch => {
            queuedStates[ch.chapterNumber] = { status: 'queued' };
        });
        setChapterGenerationStates(queuedStates);

        try {
            const startTime = Date.now();

            // Call batch generation - processes all chapters CONCURRENTLY
            // We cannot track individual chapters, so all stay as "queued" during processing
            const result = await generateScriptsBatch(projectId);

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

            if (result.success && result.scripts) {
                console.log(`✅ [BATCH GENERATION] Completed ${result.scripts.length} chapters in ${elapsed}s`);

                // Update all chapter states to completed
                const completedStates: Record<number, { status: ChapterStatus; error?: string }> = {};
                result.scripts.forEach((script: any) => {
                    completedStates[script.chapter_id] = {
                        status: 'completed'
                    };
                });
                setChapterGenerationStates(completedStates);

                // Show errors if any
                if (result.errors && result.errors.length > 0) {
                    console.warn('⚠️ Some chapters had errors:', result.errors);
                }
            } else {
                console.error('❌ [BATCH GENERATION] Failed:', result.error);
                // Mark all as error
                const errorStates: Record<number, { status: ChapterStatus; error?: string }> = {};
                chapters.forEach(ch => {
                    errorStates[ch.chapterNumber] = {
                        status: 'error',
                        error: result.error || 'Batch generation failed'
                    };
                });
                setChapterGenerationStates(errorStates);
            }
        } catch (error: any) {
            if (error.message?.includes('cancel')) {
                // User cancelled - already handled by abort handler
            } else {
                console.error('💥 [BATCH GENERATION] Exception:', error);
                const errorStates: Record<number, { status: ChapterStatus; error?: string }> = {};
                chapters.forEach(ch => {
                    errorStates[ch.chapterNumber] = {
                        status: 'error',
                        error: error.message || 'Unknown error'
                    };
                });
                setChapterGenerationStates(errorStates);
            }
        }

        setAbortController(null);
        setIsGenerating(false);

        // Reload page after completion to get fresh data from DB
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    };

    const handleRegenerateChapter = async (chapterNumber: number) => {
        if (!confirm(`Regenerate script for Chapter ${chapterNumber}? This will replace existing scenes.`)) {
            return;
        }

        console.log(`🔄 [REGENERATE] Starting for Chapter ${chapterNumber}`);
        setRegeneratingChapter(chapterNumber);

        // Set to generating state
        setChapterGenerationStates({
            ...chapterGenerationStates,
            [chapterNumber]: { status: 'generating' }
        });

        try {
            // Find previous chapter for context
            const chapterIndex = chapters.findIndex(ch => ch.chapterNumber === chapterNumber);
            let previousChapterScript: any = null;

            if (chapterIndex > 0) {
                const prevChapter = chapters[chapterIndex - 1];
                if (prevChapter.scenes && prevChapter.scenes.length > 0) {
                    previousChapterScript = {
                        chapter_id: prevChapter.chapterNumber,
                        chapter_title: prevChapter.title,
                        scenes: prevChapter.scenes.map(s => ({
                            id: parseInt(s.sceneNumber) || 0,
                            duration_seconds: s.durationSeconds,
                            voiceover: s.voiceover,
                            visual: s.visualDesc,
                            veo3_prompt: s.veo3Prompt
                        }))
                    };
                }
            }

            const result = await generateSingleChapterScript({
                projectId,
                chapterNumber,
                previousChapterScript
            });

            if (result.success && result.script) {
                console.log(`✅ [REGENERATE] Success for Chapter ${chapterNumber}`);

                // Update state with completed
                setChapterGenerationStates({
                    ...chapterGenerationStates,
                    [chapterNumber]: {
                        status: 'completed'
                    }
                });

                // Update chapters data
                const updatedChapters = chapters.map(ch =>
                    ch.chapterNumber === chapterNumber
                        ? {
                            ...ch,
                            scenes: result.script.scenes
                                .map((scene: any) => ({
                                    id: scene.id.toString(),
                                    sceneNumber: scene.id.toString(),
                                    durationSeconds: scene.duration_seconds,
                                    voiceover: scene.voiceover,
                                    visualDesc: scene.visual,
                                    veo3Prompt: scene.veo3_prompt || ''
                                }))
                                .sort((a: any, b: any) => {
                                    const numA = parseInt(a.sceneNumber) || 0;
                                    const numB = parseInt(b.sceneNumber) || 0;
                                    return numA - numB;
                                })
                        }
                        : ch
                );
                setChapters(updatedChapters);
                onChaptersUpdate(updatedChapters);

                // Reload page after 1 second
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                console.log(`❌ [REGENERATE] Error: ${result.error}`);
                setChapterGenerationStates({
                    ...chapterGenerationStates,
                    [chapterNumber]: {
                        status: 'error',
                        error: result.error || 'Failed to regenerate'
                    }
                });
            }
        } catch (error: any) {
            console.log(`💥 [REGENERATE] Exception: ${error.message}`);
            setChapterGenerationStates({
                ...chapterGenerationStates,
                [chapterNumber]: {
                    status: 'error',
                    error: error.message || 'Unknown error'
                }
            });
        } finally {
            setRegeneratingChapter(null);
        }
    };

    const getChapterState = (chapterNumber: number): ChapterGenerationState => {
        const state = chapterGenerationStates[chapterNumber] || { status: 'idle' as ChapterStatus };
        const chapterData = chapters.find(ch => ch.chapterNumber === chapterNumber);
        return {
            ...state,
            scenes: chapterData?.scenes
        };
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Scenes & Scripts</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {chapters.length} chapters • ⚡ Batch generation (2-3x faster) • 💡 VEO3 prompts generated separately
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
                            onClick={onAbort}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-sm transition flex items-center gap-2"
                        >
                            <span className="text-xl">⏹</span>
                            Stop Generation
                        </button>
                    ) : (
                        <button
                            onClick={handleGenerateAll}
                            disabled={isGenerating}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg transition"
                        >
                            ✨ Generate with AI
                        </button>
                    )}
                </div>
            </div>

            {isGenerating && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-blue-800 text-sm flex items-center">
                        <svg className="animate-spin h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <strong>⚡ Batch Processing:</strong> Tất cả chapters đang được xử lý song song bởi AI. Không thể theo dõi từng chapter riêng lẻ do xử lý concurrent.
                    </p>
                    <p className="text-blue-600 text-xs mt-2 ml-7">
                        💡 Tip: Chế độ batch nhanh hơn 2-3x so với xử lý tuần tự. Tất cả chapters sẽ hoàn thành gần như cùng lúc.
                    </p>
                </div>
            )}

            {/* Chapters */}
            <div className="space-y-6">
                {chapters.map((chapter) => {
                    const state = getChapterState(chapter.chapterNumber);
                    const displayScenes = state.scenes || chapter.scenes || [];
                    const isExpanded = expandedChapters.has(chapter.chapterNumber);

                    return (
                        <div
                            key={chapter.id}
                            className={`border-2 rounded-lg overflow-hidden transition ${state.status === 'generating'
                                ? 'border-yellow-400 shadow-lg'
                                : state.status === 'completed'
                                    ? 'border-green-400'
                                    : state.status === 'error'
                                        ? 'border-red-400'
                                        : 'border-gray-200 hover:border-indigo-300'
                                }`}
                        >
                            {/* Chapter Header */}
                            <div className={`p-4 ${state.status === 'generating'
                                ? 'bg-gradient-to-r from-yellow-400 to-orange-400'
                                : state.status === 'queued'
                                    ? 'bg-gradient-to-r from-blue-400 to-cyan-400'
                                    : state.status === 'completed'
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                        : state.status === 'error'
                                            ? 'bg-gradient-to-r from-red-500 to-pink-500'
                                            : 'bg-gradient-to-r from-indigo-600 to-purple-600'
                                } text-white cursor-pointer`}
                                onClick={() => toggleChapter(chapter.chapterNumber)}
                            >
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-lg flex items-center">
                                        <span className="bg-white text-indigo-600 rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3 font-bold">
                                            {chapter.chapterNumber}
                                        </span>
                                        {chapter.title}
                                        {isBilingual && chapter.title_vi && (
                                            <span className="ml-2 text-sm">
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
                                    </h4>
                                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                        {/* Regenerate button - show for all chapters except when generating in batch */}
                                        {state.status !== 'generating' && !isGenerating && (
                                            <button
                                                onClick={() => handleRegenerateChapter(chapter.chapterNumber)}
                                                disabled={regeneratingChapter === chapter.chapterNumber}
                                                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded-full text-sm font-medium transition disabled:opacity-50"
                                            >
                                                {regeneratingChapter === chapter.chapterNumber ? '⏳ Regenerating...' : displayScenes.length > 0 ? '🔄 Regenerate' : '✨ Generate'}
                                            </button>
                                        )}

                                        {state.status === 'queued' && isGenerating && (
                                            <span className="flex items-center bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium">
                                                <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path>
                                                </svg>
                                                Batch Processing...
                                            </span>
                                        )}
                                        {state.status === 'generating' && (
                                            <span className="flex items-center bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium">
                                                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Generating...
                                            </span>
                                        )}
                                        {state.status === 'completed' && (
                                            <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium">
                                                ✓ {displayScenes.length} scenes
                                            </span>
                                        )}
                                        {state.status === 'error' && (
                                            <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium">
                                                ✗ Error
                                            </span>
                                        )}
                                        {state.status === 'idle' && displayScenes.length > 0 && (
                                            <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium">
                                                {displayScenes.length} scenes
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm mt-2 text-white text-opacity-90">
                                    {chapter.contentSummary}
                                </p>
                            </div>

                            {/* Content Area - Collapsible */}
                            {isExpanded && (
                                <>
                                    {state.status === 'queued' && isGenerating && (
                                        <div className="p-8 bg-blue-50 text-center">
                                            <div className="inline-block">
                                                <div className="text-6xl mb-4 animate-pulse">⚡</div>
                                            </div>
                                            <p className="text-blue-800 font-medium">
                                                Processing in batch...
                                            </p>
                                            <p className="text-blue-600 text-sm mt-2">
                                                This chapter is being generated concurrently with others for maximum speed
                                            </p>
                                        </div>
                                    )}
                                    {state.status === 'generating' && (
                                        <div className="p-8 bg-yellow-50 text-center">
                                            <div className="inline-block animate-bounce">
                                                <div className="text-6xl mb-4">🤖</div>
                                            </div>
                                            <p className="text-yellow-800 font-medium">
                                                AI is crafting scenes for this chapter...
                                            </p>
                                            <p className="text-yellow-600 text-sm mt-2">
                                                Using context from previous chapters for better flow
                                            </p>
                                        </div>
                                    )}

                                    {state.status === 'error' && (
                                        <div className="p-6 bg-red-50">
                                            <div className="text-red-800">
                                                <p className="font-medium mb-2">❌ Generation Error</p>
                                                <p className="text-sm mb-4">{state.error}</p>
                                                <button
                                                    onClick={() => handleRegenerateChapter(chapter.chapterNumber)}
                                                    disabled={regeneratingChapter === chapter.chapterNumber}
                                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition"
                                                >
                                                    {regeneratingChapter === chapter.chapterNumber ? '⏳ Retrying...' : '🔄 Retry Generate'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {displayScenes.length > 0 && state.status !== 'generating' && (
                                        <div className="p-4 bg-gray-50 space-y-4">
                                            {displayScenes
                                                .sort((a: any, b: any) => {
                                                    const numA = parseInt(a.sceneNumber || a.id) || 0;
                                                    const numB = parseInt(b.sceneNumber || b.id) || 0;
                                                    return numA - numB;
                                                })
                                                .map((scene: any, idx: number) => (
                                                    <div key={scene.id || idx} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                                        {/* Scene Header */}
                                                        <div className="bg-gray-100 px-4 py-2 flex justify-between items-center">
                                                            <span className="text-sm font-semibold text-gray-700">
                                                                🎬 Scene {scene.sceneNumber || scene.id}
                                                            </span>
                                                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-medium">
                                                                {scene.durationSeconds || scene.duration_seconds}s
                                                            </span>
                                                        </div>

                                                        <div className="p-4 space-y-4">
                                                            {/* Voiceover */}
                                                            <div>
                                                                <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded">
                                                                    🎤 VOICEOVER
                                                                </span>
                                                                <p className="text-sm text-gray-900 leading-relaxed bg-purple-50 p-3 rounded border-l-4 border-purple-400 mt-2">
                                                                    {scene.voiceover}
                                                                </p>
                                                            </div>

                                                            {/* Visual Description */}
                                                            <div>
                                                                <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                                                                    🎨 VISUAL
                                                                </span>
                                                                <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded border-l-4 border-blue-400 mt-2">
                                                                    {scene.visualDesc || scene.visual}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}

                                    {state.status === 'idle' && displayScenes.length === 0 && !isGenerating && (
                                        <div className="p-8 bg-gray-50 text-center text-gray-500">
                                            <div className="text-4xl mb-2">📝</div>
                                            <p className="mb-3">No scenes yet for this chapter.</p>
                                            <p className="text-sm text-gray-400">Click "✨ Generate" above or use "Generate with AI" to create all chapters at once.</p>
                                        </div>
                                    )}

                                    {state.status === 'queued' && !isGenerating && displayScenes.length === 0 && (
                                        <div className="p-8 bg-gray-50 text-center text-gray-500">
                                            <div className="text-4xl mb-2">📝</div>
                                            <p className="mb-3">No scenes yet for this chapter.</p>
                                            <p className="text-sm text-gray-400">Click "✨ Generate" above to create scenes for this chapter.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
