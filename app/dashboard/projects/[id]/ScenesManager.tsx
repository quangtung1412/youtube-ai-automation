'use client'

import { useState } from "react";
import { updateAllScenes } from "@/actions/updateScenes";
import { generateScriptsBatch } from "@/actions/generateScript";

interface Scene {
    id: string;
    sceneNumber: number;
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
    scenes?: Scene[];
}

export default function ScenesManager({
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
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);

    // Update parent when chapters change
    const updateChapters = (newChapters: Chapter[]) => {
        setChapters(newChapters);
        onChaptersUpdate(newChapters);
    };

    // Flatten all scenes from all chapters
    const allScenes = chapters.flatMap(ch =>
        (ch.scenes || [])
    );

    const totalScenes = allScenes.length;

    const handleSave = async () => {
        setSaving(true);
        try {
            const result = await updateAllScenes(projectId, allScenes);
            if (result.success) {
                setEditMode(false);
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else {
                alert("Error: " + result.error);
            }
        } catch (error) {
            alert("Failed to save scenes");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setChapters(initialChapters);
        setEditMode(false);
    };

    const handleRegenerateScripts = async () => {
        if (!confirm("Are you sure you want to regenerate all scenes? This will replace all current scenes with new AI-generated ones.")) {
            return;
        }

        // Create abort controller
        const controller = new AbortController();
        setAbortController(controller);

        setIsGenerating(true);
        setGenerationProgress({ current: 0, total: chapters.length });

        try {
            const result = await generateScriptsBatch(projectId);
            if (result.success) {
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                alert("Error: " + result.error);
            }
        } catch (error: any) {
            if (error.message?.includes('cancel')) {
                // User cancelled - already handled by abort handler
            } else {
                alert("Failed to regenerate scenes");
            }
        } finally {
            setAbortController(null);
            setIsGenerating(false);
        }
    };

    const updateScene = (chapterId: string, sceneId: string, field: keyof Scene, value: string | number) => {
        setChapters(prev =>
            prev.map(ch =>
                ch.id === chapterId
                    ? {
                        ...ch,
                        scenes: ch.scenes?.map(sc =>
                            sc.id === sceneId ? { ...sc, [field]: value } : sc
                        ),
                    }
                    : ch
            )
        );
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Scenes & Scripts</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {totalScenes} scenes • {chapters.length} chapters
                    </p>
                </div>
                <div className="flex gap-3">
                    {isGenerating ? (
                        <button
                            onClick={onAbort}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-sm transition flex items-center gap-2"
                        >
                            <span className="text-xl">⏹</span>
                            Stop Generation
                        </button>
                    ) : !editMode ? (
                        <>
                            <button
                                onClick={handleRegenerateScripts}
                                disabled={isGenerating}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition"
                            >
                                ✨ Regenerate with AI
                            </button>
                            <button
                                onClick={() => setEditMode(true)}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition"
                            >
                                📝 Edit Scenes
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleCancel}
                                disabled={saving}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 font-medium shadow-sm transition"
                            >
                                ❌ Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition"
                            >
                                {saving ? '⏳ Saving...' : '💾 Save Changes'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Scenes by Chapter */}
            <div className="space-y-6">
                {chapters.map((chapter) =>
                    chapter.scenes && chapter.scenes.length > 0 && (
                        <div key={chapter.id} className={`border-2 rounded-lg overflow-hidden transition ${editMode ? 'border-indigo-300' : 'border-gray-200 hover:border-indigo-300'
                            }`}>
                            {/* Chapter Header */}
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
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
                                    <span className="ml-auto text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                                        {chapter.scenes.length} scenes
                                    </span>
                                </h4>
                            </div>

                            {/* Scenes */}
                            <div className="p-4 bg-gray-50 space-y-4">
                                {chapter.scenes.map((scene) => (
                                    <div key={scene.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                        {/* Scene Header */}
                                        <div className="bg-gray-100 px-4 py-2 flex justify-between items-center">
                                            <span className="text-sm font-semibold text-gray-700">
                                                🎬 Scene {scene.sceneNumber}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {editMode ? (
                                                    <input
                                                        type="number"
                                                        value={scene.durationSeconds}
                                                        onChange={(e) => updateScene(chapter.id, scene.id, 'durationSeconds', parseInt(e.target.value) || 0)}
                                                        className="w-16 px-2 py-1 text-xs bg-white border border-gray-300 rounded text-center font-medium"
                                                        placeholder="30"
                                                    />
                                                ) : (
                                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-medium">
                                                        {scene.durationSeconds}s
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-4 space-y-4">
                                            {/* Voiceover */}
                                            <div>
                                                <div className="flex items-center mb-2">
                                                    <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded">
                                                        🎤 VOICEOVER {isBilingual && `(${language})`}
                                                    </span>
                                                </div>
                                                {editMode ? (
                                                    <div className="space-y-2">
                                                        <textarea
                                                            value={scene.voiceover}
                                                            onChange={(e) => updateScene(chapter.id, scene.id, 'voiceover', e.target.value)}
                                                            rows={3}
                                                            className="w-full px-3 py-2 border-2 border-purple-200 bg-purple-50 rounded-lg text-sm text-gray-900 leading-relaxed focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                            placeholder="Voiceover text..."
                                                        />
                                                        {isBilingual && (
                                                            <>
                                                                <div className="flex items-center mb-1">
                                                                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                                                                        🇻🇳 VOICEOVER (Vietnamese)
                                                                    </span>
                                                                </div>
                                                                <textarea
                                                                    value={scene.voiceover_vi || ''}
                                                                    onChange={(e) => updateScene(chapter.id, scene.id, 'voiceover_vi', e.target.value)}
                                                                    rows={3}
                                                                    className="w-full px-3 py-2 border-2 border-green-300 bg-green-50 rounded-lg text-sm text-gray-900 leading-relaxed focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                                    placeholder="Lời thoại bằng tiếng Việt..."
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <p className="text-sm text-gray-900 leading-relaxed bg-purple-50 p-3 rounded border-l-4 border-purple-400">
                                                            {scene.voiceover}
                                                        </p>
                                                        {isBilingual && scene.voiceover_vi && (
                                                            <>
                                                                <div className="flex items-center mb-1">
                                                                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                                                                        🇻🇳 Vietnamese
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-gray-900 leading-relaxed bg-green-50 p-3 rounded border-l-4 border-green-400">
                                                                    {scene.voiceover_vi}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Visual Description */}
                                            <div>
                                                <div className="flex items-center mb-2">
                                                    <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                                                        🎨 VISUAL DESC {isBilingual && `(${language})`}
                                                    </span>
                                                </div>
                                                {editMode ? (
                                                    <div className="space-y-2">
                                                        <textarea
                                                            value={scene.visualDesc}
                                                            onChange={(e) => updateScene(chapter.id, scene.id, 'visualDesc', e.target.value)}
                                                            rows={3}
                                                            className="w-full px-3 py-2 border-2 border-blue-200 bg-blue-50 rounded-lg text-sm text-gray-700 leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                            placeholder="Visual description..."
                                                        />
                                                        {isBilingual && (
                                                            <>
                                                                <div className="flex items-center mb-1">
                                                                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                                                                        🇻🇳 VISUAL DESC (Vietnamese)
                                                                    </span>
                                                                </div>
                                                                <textarea
                                                                    value={scene.visualDesc_vi || ''}
                                                                    onChange={(e) => updateScene(chapter.id, scene.id, 'visualDesc_vi', e.target.value)}
                                                                    rows={3}
                                                                    className="w-full px-3 py-2 border-2 border-green-300 bg-green-50 rounded-lg text-sm text-gray-700 leading-relaxed focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                                    placeholder="Mô tả hình ảnh bằng tiếng Việt..."
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                                                            {scene.visualDesc}
                                                        </p>
                                                        {isBilingual && scene.visualDesc_vi && (
                                                            <>
                                                                <div className="flex items-center mb-1">
                                                                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                                                                        🇻🇳 Vietnamese
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-gray-700 bg-green-50 p-3 rounded border-l-4 border-green-400">
                                                                    {scene.visualDesc_vi}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                )}
            </div>

            {editMode && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                    <p className="text-amber-800 text-sm">
                        ℹ️ <strong>Note:</strong> Changes will be saved to the database. Make sure to review all edits before saving.
                    </p>
                </div>
            )}
        </div>
    );
}
