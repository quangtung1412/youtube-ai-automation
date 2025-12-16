'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { generateOutline } from "@/actions/generateOutline";
import { generateScriptsBatch } from "@/actions/generateScript";
import { generateVeo3Prompts } from "@/actions/generateVeo3Prompts";
import { updateProjectSettings } from "@/actions/updateProjectSettings";
import { generateCharacterPrompt, generateBackgroundPrompt, generateAllItemPrompts } from "@/actions/generateImagePrompts";
// TODO: Enable after restarting dev server and running: npx prisma generate
// import { getRunningTasks, type TaskType } from "@/actions/taskManager";
import type { OutlineResponse, ChapterScript } from "@/lib/gemini";
import CharacterEditor from "./CharacterEditor";
import BackgroundEditor from "./BackgroundEditor";
import ItemsManager from "./ItemsManager";
import ChaptersManager from "./ChaptersManager";
import ScenesManager from "./ScenesManager";
import ScenesManagerSequential from "./ScenesManagerSequential";
import VEO3PromptsManager from "./VEO3PromptsManager";

interface Project {
    id: string;
    title: string;
    inputContent: string;
    status: string;
    outlineData: string;
    fullScript: string;
    characterVisual: string | null;
    characterVisualVi: string | null;
    backgroundVisual: string | null;
    backgroundVisualVi: string | null;
    visualStyleGuide: string | null;
    videoRatio: string;
    styleStorytelling: string;
    mainCharacterDesc: string;
    visualStyle?: string;
    channel: {
        id: string;
        name: string;
        personaSettings: string;
    };
}

interface Chapter {
    id: string;
    chapterNumber: number;
    title: string;
    contentSummary: string;
    durationSeconds: number;
    scenes?: Scene[];
}

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

interface ProjectItem {
    id: string;
    name: string;
    description: string;
    context: string;
    visualDesc: string | null;
}

type TabType = 'settings' | 'images' | 'outline' | 'scenes' | 'prompts';

export default function ProjectDetailNew({
    project,
    initialChapters,
    items,
    language = 'Vietnamese'
}: {
    project: Project;
    initialChapters: Chapter[];
    items: ProjectItem[];
    language?: string;
}) {
    const [activeTab, setActiveTab] = useState<TabType>('settings');
    const [generating, setGenerating] = useState(false);
    const [generatingScripts, setGeneratingScripts] = useState(false);
    const [saving, setSaving] = useState(false);
    const [generatingCharacter, setGeneratingCharacter] = useState(false);
    const [generatingBackground, setGeneratingBackground] = useState(false);
    const [generatingItems, setGeneratingItems] = useState(false);
    // TODO: Enable after restarting dev server
    // const [runningTasksCount, setRunningTasksCount] = useState(0);
    const [chapters, setChapters] = useState<Chapter[]>(initialChapters);

    // Scene generation state - persist across tab changes
    const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);
    const [sceneGenerationProgress, setSceneGenerationProgress] = useState({ current: 0, total: 0 });
    const [sceneAbortController, setSceneAbortController] = useState<AbortController | null>(null);

    // Chapter generation states - persist across tab changes
    type ChapterStatus = 'idle' | 'queued' | 'generating' | 'completed' | 'error';
    const [chapterGenerationStates, setChapterGenerationStates] = useState<Record<number, { status: ChapterStatus; error?: string }>>({
        // Initialize with idle state for all chapters
        ...Object.fromEntries(initialChapters.map(ch => [ch.chapterNumber, { status: 'idle' as ChapterStatus }]))
    });

    // VEO3 generation state - persist across tab changes
    const [isGeneratingVeo3, setIsGeneratingVeo3] = useState(false);
    const [veo3GenerationProgress, setVeo3GenerationProgress] = useState({ current: 0, total: 0 });
    const [veo3AbortController, setVeo3AbortController] = useState<AbortController | null>(null);

    // Abort handlers
    const handleAbortSceneGeneration = () => {
        if (sceneAbortController) {
            sceneAbortController.abort();
            setSceneAbortController(null);
            setIsGeneratingScenes(false);
            setProgress('⚠️ Generation cancelled by user');
            setTimeout(() => setProgress(''), 3000);
        }
    };

    const handleAbortVeo3Generation = () => {
        if (veo3AbortController) {
            veo3AbortController.abort();
            setVeo3AbortController(null);
            setIsGeneratingVeo3(false);
            setProgress('⚠️ VEO3 generation cancelled by user');
            setTimeout(() => setProgress(''), 3000);
        }
    };

    const [outline, setOutline] = useState<OutlineResponse | null>(
        project.outlineData ? JSON.parse(project.outlineData) : null
    );
    const [error, setError] = useState("");
    const [progress, setProgress] = useState("");

    // Editable form state
    const [formData, setFormData] = useState({
        title: project.title,
        inputContent: project.inputContent,
        videoRatio: project.videoRatio || "16:9",
        styleStorytelling: project.styleStorytelling || "",
        mainCharacterDesc: project.mainCharacterDesc || "",
        visualStyle: project.visualStyle || "",
    });

    const handleSaveSettings = async () => {
        setSaving(true);
        setError("");
        setProgress("Đang lưu thay đổi...");

        try {
            const result = await updateProjectSettings({
                projectId: project.id,
                ...formData,
            });

            if (result.success) {
                setProgress("✅ Đã lưu thành công!");
                setTimeout(() => {
                    setProgress("");
                }, 2000);
            } else {
                setError(result.error || "Lỗi khi lưu settings");
            }
        } catch (err: any) {
            setError(err.message || "Đã xảy ra lỗi không mong muốn");
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateOutline = async () => {
        setGenerating(true);
        setError("");
        setProgress("Đang phân tích nội dung và tạo Master Plan...");

        try {
            const result = await generateOutline(project.id);

            if (result.success) {
                setOutline(result.outline!);
                window.location.reload();
            } else {
                setError(result.error || "Lỗi khi tạo outline");
            }
        } catch (err: any) {
            setError(err.message || "Đã xảy ra lỗi không mong muốn");
        } finally {
            setGenerating(false);
        }
    };

    const handleGenerateScriptsWithPrompts = async () => {
        setGeneratingScripts(true);
        setError("");
        setProgress("Đang tạo kịch bản chi tiết và VEO3 prompts...");

        try {
            // Step 1: Generate scripts (creates scenes in DB)
            const scriptResult = await generateScriptsBatch(project.id);

            if (!scriptResult.success) {
                throw new Error(scriptResult.error || "Lỗi khi tạo scripts");
            }

            setProgress("✅ Scripts hoàn tất. Đang tạo VEO3 prompts...");

            // Step 2: Generate VEO3 prompts for all scenes
            const promptResult = await generateVeo3Prompts(project.id);

            if (promptResult.success) {
                setProgress(`✅ Hoàn thành! Đã tạo ${promptResult.successCount} scenes với VEO3 prompts.`);
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                // Even if VEO3 fails, scripts are already created
                setError("Scripts đã tạo nhưng VEO3 prompts có lỗi: " + promptResult.error);
            }
        } catch (err: any) {
            setError(err.message || "Đã xảy ra lỗi không mong muốn");
        } finally {
            setGeneratingScripts(false);
        }
    };

    const handleGenerateCharacterPrompt = async () => {
        setGeneratingCharacter(true);
        setError("");
        setProgress("Đang tạo mô tả nhân vật với AI...");

        try {
            const result = await generateCharacterPrompt(project.id);

            if (result.success) {
                setProgress("✅ Đã tạo mô tả nhân vật thành công!");
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                setError(result.error || "Lỗi khi tạo mô tả nhân vật");
            }
        } catch (err: any) {
            setError(err.message || "Đã xảy ra lỗi không mong muốn");
        } finally {
            setGeneratingCharacter(false);
        }
    };

    const handleGenerateBackgroundPrompt = async () => {
        setGeneratingBackground(true);
        setError("");
        setProgress("Đang tạo mô tả background với AI...");

        try {
            const result = await generateBackgroundPrompt(project.id);

            if (result.success) {
                setProgress("✅ Đã tạo mô tả background thành công!");
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                setError(result.error || "Lỗi khi tạo mô tả background");
            }
        } catch (err: any) {
            setError(err.message || "Đã xảy ra lỗi không mong muốn");
        } finally {
            setGeneratingBackground(false);
        }
    };

    const handleGenerateAllItemPrompts = async () => {
        setGeneratingItems(true);
        setError("");
        setProgress("Đang tạo mô tả cho tất cả items với AI...");

        try {
            const result = await generateAllItemPrompts(project.id);

            if (result.success) {
                setProgress(`✅ Đã tạo mô tả cho ${result.items?.length || 0} items thành công!`);
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                setError(result.error || "Lỗi khi tạo mô tả items");
            }
        } catch (err: any) {
            setError(err.message || "Đã xảy ra lỗi không mong muốn");
        } finally {
            setGeneratingItems(false);
        }
    };

    const totalDuration = chapters.reduce((sum, ch) => sum + ch.durationSeconds, 0);
    const totalScenes = chapters.reduce((sum, ch) => sum + (ch.scenes?.length || 0), 0);
    const hasScenes = totalScenes > 0;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    // TODO: Enable after restarting dev server and running: npx prisma generate
    // Check for running tasks periodically
    // useEffect(() => {
    //     const checkRunningTasks = async () => {
    //         const result = await getRunningTasks(project.id);
    //         if (result.success && result.tasks) {
    //             setRunningTasksCount(result.tasks.length);
    //         }
    //     };

    //     checkRunningTasks();
    //     const interval = setInterval(checkRunningTasks, 3000); // Check every 3 seconds

    //     return () => clearInterval(interval);
    // }, [project.id]);

    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
            {/* Breadcrumb */}
            <div className="mb-4 text-sm">
                <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800">
                    Dashboard
                </Link>
                <span className="mx-2 text-gray-400">/</span>
                <Link href="/dashboard/projects" className="text-indigo-600 hover:text-indigo-800">
                    Projects
                </Link>
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-700">{project.title}</span>
            </div>

            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            {project.title}
                        </h1>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <Link
                                href={`/dashboard/channels/${project.channel.id}`}
                                className="text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                                📺 {project.channel.name}
                            </Link>
                            <span>•</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${project.status === 'DRAFT' ? 'bg-gray-200 text-gray-700' :
                                project.status === 'OUTLINE_GENERATED' ? 'bg-blue-200 text-blue-700' :
                                    project.status === 'SCRIPT_GENERATED' ? 'bg-green-200 text-green-700' :
                                        'bg-purple-200 text-purple-700'
                                }`}>
                                {project.status.replace(/_/g, ' ')}
                            </span>
                        </div>
                    </div>
                    {/* TODO: Enable after restarting dev server and running: npx prisma generate */}
                    {/* <div className="flex gap-3">
                        <Link
                            href={`/dashboard/projects/${project.id}/tasks`}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium shadow-sm transition relative"
                        >
                            📊 Tasks
                            {runningTasksCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                                    {runningTasksCount}
                                </span>
                            )}
                        </Link>
                    </div> */}
                </div>

                {/* Progress Indicator */}
                {progress && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-blue-800 text-sm flex items-center">
                            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            {progress}
                        </p>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-800 text-sm">❌ {error}</p>
                    </div>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-t-lg shadow-sm border-b border-gray-200 mb-0">
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'settings'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Project Settings</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('images')}
                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'images'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Images & Assets</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('outline')}
                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'outline'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Outline</span>
                            {generating && chapters.length === 0 && (
                                <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full animate-pulse">
                                    Generating...
                                </span>
                            )}
                            {chapters.length > 0 && !generating && (
                                <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                                    {chapters.length}
                                </span>
                            )}
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('scenes')}
                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'scenes'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Scenes & Scripts</span>
                            {hasScenes && (
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                                    {totalScenes}
                                </span>
                            )}
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('prompts')}
                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'prompts'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <span>VEO3 Prompts</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-b-lg shadow-sm p-6">
                {/* TAB 1: Project Settings */}
                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">⚙️ Project Configuration</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        title="Project Name"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Input Content</label>
                                    <textarea
                                        value={formData.inputContent}
                                        onChange={(e) => setFormData({ ...formData, inputContent: e.target.value })}
                                        rows={8}
                                        title="Input Content"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                    <div className="mt-1 text-xs text-gray-500">
                                        {formData.inputContent.split(/\s+/).length} từ • {Math.ceil(formData.inputContent.length / 1000)} KB
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Video Ratio</label>
                                        <select
                                            value={formData.videoRatio}
                                            onChange={(e) => setFormData({ ...formData, videoRatio: e.target.value })}
                                            title="Video Ratio"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        >
                                            <option value="16:9">16:9 (Landscape)</option>
                                            <option value="9:16">9:16 (Portrait/Shorts)</option>
                                            <option value="1:1">1:1 (Square)</option>
                                            <option value="4:3">4:3 (Classic)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Style Storytelling</label>
                                        <input
                                            type="text"
                                            value={formData.styleStorytelling}
                                            onChange={(e) => setFormData({ ...formData, styleStorytelling: e.target.value })}
                                            placeholder="e.g., Documentary, Cinematic, Educational"
                                            title="Style Storytelling"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Main Character Description</label>
                                        <textarea
                                            value={formData.mainCharacterDesc}
                                            onChange={(e) => setFormData({ ...formData, mainCharacterDesc: e.target.value })}
                                            placeholder="Describe the main character's appearance, personality, and role..."
                                            rows={3}
                                            title="Main Character Description"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Visual Style</label>
                                        <textarea
                                            value={formData.visualStyle}
                                            onChange={(e) => setFormData({ ...formData, visualStyle: e.target.value })}
                                            placeholder="e.g., Minimalist, Dark & Moody, Vibrant & Colorful..."
                                            rows={3}
                                            title="Visual Style"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleSaveSettings}
                                        disabled={saving}
                                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition"
                                    >
                                        {saving ? '⏳ Saving...' : '💾 Save Changes'}
                                    </button>
                                    <button
                                        onClick={handleGenerateOutline}
                                        disabled={generating}
                                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition"
                                    >
                                        {generating ? '⏳ Analyzing...' : '🔍 Analyze Content'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: Images & Assets */}
                {activeTab === 'images' && (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">🎨 Visual Assets Management</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                Manage characters, backgrounds, and items. Generate AI prompts for each asset.
                            </p>
                        </div>

                        {/* Character & Background Editors */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <CharacterEditor
                                    projectId={project.id}
                                    initialValue={project.characterVisual}
                                    initialValueVi={project.characterVisualVi}
                                    language={language}
                                />
                                <button
                                    onClick={handleGenerateCharacterPrompt}
                                    disabled={generatingCharacter}
                                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition"
                                >
                                    {generatingCharacter ? '⏳ Generating...' : '✨ Generate Character Prompt'}
                                </button>
                            </div>

                            <div className="space-y-4">
                                <BackgroundEditor
                                    projectId={project.id}
                                    initialValue={project.backgroundVisual}
                                    initialValueVi={project.backgroundVisualVi}
                                    language={language}
                                />
                                <button
                                    onClick={handleGenerateBackgroundPrompt}
                                    disabled={generatingBackground}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition"
                                >
                                    {generatingBackground ? '⏳ Generating...' : '✨ Generate Background Prompt'}
                                </button>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-4">
                            <ItemsManager
                                projectId={project.id}
                                initialItems={items}
                            />
                            <button
                                onClick={handleGenerateAllItemPrompts}
                                disabled={generatingItems || items.length === 0}
                                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition"
                            >
                                {generatingItems ? '⏳ Generating...' : `✨ Generate All Item Prompts (${items.length} items)`}
                            </button>
                            {items.length === 0 && (
                                <p className="text-center text-sm text-amber-600">
                                    ⚠️ Add some items first before generating prompts
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 3: Outline */}
                {activeTab === 'outline' && (
                    <div className="space-y-6">
                        {chapters.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">📝</div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    Chưa có Outline
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    Tạo outline để chia nội dung thành các chapters
                                </p>
                                <button
                                    onClick={handleGenerateOutline}
                                    disabled={generating}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium shadow-md hover:shadow-lg"
                                >
                                    {generating ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 inline mr-2" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Đang tạo...
                                        </>
                                    ) : (
                                        <>
                                            ✨ Tạo Outline với AI
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <ChaptersManager
                                projectId={project.id}
                                initialChapters={chapters}
                                language={language}
                            />
                        )}
                    </div>
                )}

                {/* TAB 4: Scenes & Scripts */}
                {activeTab === 'scenes' && (
                    <div className="space-y-6">
                        {chapters.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">📝</div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    Chưa có Outline
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    Vui lòng tạo outline trước khi tạo scenes
                                </p>
                            </div>
                        ) : (
                            <ScenesManagerSequential
                                projectId={project.id}
                                chapters={chapters}
                                language={language}
                                isGenerating={isGeneratingScenes}
                                setIsGenerating={setIsGeneratingScenes}
                                generationProgress={sceneGenerationProgress}
                                setGenerationProgress={setSceneGenerationProgress}
                                onChaptersUpdate={setChapters}
                                abortController={sceneAbortController}
                                setAbortController={setSceneAbortController}
                                onAbort={handleAbortSceneGeneration}
                                chapterGenerationStates={chapterGenerationStates}
                                setChapterGenerationStates={setChapterGenerationStates}
                            />
                        )}
                    </div>
                )}

                {/* TAB 5: VEO3 Prompts */}
                {activeTab === 'prompts' && (
                    <div className="space-y-6">
                        {!hasScenes ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">🤖</div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    Chưa có Scenes
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    Cần tạo scenes trước khi generate VEO3 prompts
                                </p>
                                <p className="text-sm text-amber-600">
                                    ⚠️ Vui lòng tạo scenes ở tab "Scenes & Scripts" trước
                                </p>
                            </div>
                        ) : (
                            <VEO3PromptsManager
                                projectId={project.id}
                                chapters={chapters}
                                language={language}
                                isGenerating={isGeneratingVeo3}
                                setIsGenerating={setIsGeneratingVeo3}
                                generationProgress={veo3GenerationProgress}
                                setGenerationProgress={setVeo3GenerationProgress}
                                onChaptersUpdate={setChapters}
                                abortController={veo3AbortController}
                                setAbortController={setVeo3AbortController}
                                onAbort={handleAbortVeo3Generation}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
