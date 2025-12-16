'use client'

import { useState, useEffect } from "react";
import { updateSystemConfig } from "@/actions/systemConfig";
import { SystemConfig } from "@prisma/client";
import PromptsSettings from "./PromptsSettings";
import ModelRotationSettings from "./ModelRotationSettings";
import AIUsageDashboard from "./AIUsageDashboard";

interface Model {
    id: string;
    name: string;
    description: string;
}

interface PromptSettings {
    outlinePrompt: string;
    scriptsPrompt: string;
    veo3Prompt: string;
    characterPrompt: string;
    backgroundPrompt: string;
    itemsPrompt: string;
    veo3Template: string;
}

type TabType = 'channel' | 'prompts' | 'models' | 'usage';

export default function SettingsForm({
    initialConfig,
    initialPrompts
}: {
    initialConfig: SystemConfig;
    initialPrompts?: PromptSettings;
}) {
    const [activeTab, setActiveTab] = useState<TabType>('channel');
    const [config, setConfig] = useState(initialConfig);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    // Parse persona settings
    const persona = JSON.parse(config.personaSettings || '{}');
    const [channelName, setChannelName] = useState(config.channelName || 'My Channel');
    const [language, setLanguage] = useState(config.language || 'Vietnamese');
    const [character, setCharacter] = useState(persona.character || '');
    const [tone, setTone] = useState(persona.tone || '');
    const [style, setStyle] = useState(persona.style || '');
    const [background, setBackground] = useState(persona.background || '');



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage("");

        const personaSettings = JSON.stringify({
            character,
            tone,
            style,
            background
        });

        const result = await updateSystemConfig({
            minVideoDuration: config.minVideoDuration,
            avgSceneDuration: config.avgSceneDuration,
            speechRate: config.speechRate,
            maxWordsPerScene: config.maxWordsPerScene,
            channelName,
            language,
            personaSettings
        });

        setSaving(false);

        if (result.success) {
            setMessage("Settings saved successfully!");
            setTimeout(() => setMessage(""), 3000);
        } else {
            setMessage("Error: " + result.error);
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            {/* Tab Navigation */}
            <div className="bg-white rounded-t-lg shadow-sm border-b border-gray-200">
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('channel')}
                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'channel'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Channel & Persona</span>
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            <span>AI Prompts</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('models')}
                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'models'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Model Rotation</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('usage')}
                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'usage'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span>Usage Dashboard</span>
                        </div>
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-b-lg shadow-sm">
                <div className="p-8">
                    {/* Channel & Persona Tab */}
                    {activeTab === 'channel' && (
                        <div className="space-y-8">
                            {/* Video Generation Parameters */}
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                    </svg>
                                    <h3 className="text-lg font-semibold text-gray-900">Video Generation Parameters</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Minimum Video Duration
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={config.minVideoDuration}
                                                onChange={(e) => setConfig({ ...config, minVideoDuration: parseInt(e.target.value) })}
                                                min="60"
                                                max="3600"
                                                className="w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                            <span className="absolute right-4 top-3 text-sm text-gray-500">seconds</span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Target minimum length for generated videos (default: 600s / 10 min)
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Average Scene Duration
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={config.avgSceneDuration}
                                                onChange={(e) => setConfig({ ...config, avgSceneDuration: parseInt(e.target.value) })}
                                                min="5"
                                                max="30"
                                                className="w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                            <span className="absolute right-4 top-3 text-sm text-gray-500">seconds</span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Typical duration for each scene (default: 8s)
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Speech Rate (Words/Second)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={config.speechRate}
                                                onChange={(e) => setConfig({ ...config, speechRate: parseFloat(e.target.value) })}
                                                min="1.5"
                                                max="4.0"
                                                className="w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                            <span className="absolute right-4 top-3 text-sm text-gray-500">words/s</span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Average speaking speed (default: 2.5 words/second)
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Max Words Per Scene
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={config.maxWordsPerScene}
                                                onChange={(e) => setConfig({ ...config, maxWordsPerScene: parseInt(e.target.value) })}
                                                min="10"
                                                max="50"
                                                className="w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                            <span className="absolute right-4 top-3 text-sm text-gray-500">words</span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Maximum words to fit in scene duration (8s × 2.5 = 20 words)
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Channel Info */}
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <h3 className="text-lg font-semibold text-gray-900">Channel Information</h3>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Video Language
                                    </label>
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    >
                                        <option value="Vietnamese">Tiếng Việt (Vietnamese)</option>
                                        <option value="English">English</option>
                                        <option value="Japanese">日本語 (Japanese)</option>
                                        <option value="Korean">한국어 (Korean)</option>
                                        <option value="Chinese">中文 (Chinese)</option>
                                        <option value="Thai">ไทย (Thai)</option>
                                        <option value="Spanish">Español (Spanish)</option>
                                        <option value="French">Français (French)</option>
                                        <option value="German">Deutsch (German)</option>
                                    </select>
                                    <p className="text-xs text-gray-500">
                                        Language for video narration and character dialogue
                                    </p>
                                </div>
                            </section>

                            {/* Character Description */}
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <h3 className="text-lg font-semibold text-gray-900">Character Description</h3>
                                </div>
                                <div className="space-y-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Main Character
                                        </label>
                                        <input
                                            type="text"
                                            value={character}
                                            onChange={(e) => setCharacter(e.target.value)}
                                            placeholder="e.g., Young female tech reviewer, Asian male fitness coach..."
                                            className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                        <p className="text-xs text-gray-600">
                                            Describe the main character's appearance, age, gender, and role
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Tone
                                            </label>
                                            <input
                                                type="text"
                                                value={tone}
                                                onChange={(e) => setTone(e.target.value)}
                                                placeholder="professional, casual, friendly..."
                                                className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Visual Style
                                            </label>
                                            <input
                                                type="text"
                                                value={style}
                                                onChange={(e) => setStyle(e.target.value)}
                                                placeholder="cinematic, realistic, animated..."
                                                className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Background
                                            </label>
                                            <input
                                                type="text"
                                                value={background}
                                                onChange={(e) => setBackground(e.target.value)}
                                                placeholder="modern office, home studio..."
                                                className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* AI Prompts Tab */}
                    {activeTab === 'prompts' && initialPrompts && (
                        <PromptsSettings
                            initialPrompts={initialPrompts}
                            initialVeo3Template={config.veo3Template}
                        />
                    )}

                    {/* Model Rotation Tab */}
                    {activeTab === 'models' && <ModelRotationSettings />}

                    {/* Usage Dashboard Tab */}
                    {activeTab === 'usage' && <AIUsageDashboard />}
                </div>

                {/* Footer with Save Button - Only for channel and ai tabs */}
                {activeTab !== 'prompts' && activeTab !== 'models' && activeTab !== 'usage' && (
                    <div className="border-t border-gray-200 px-8 py-6 bg-gray-50 rounded-b-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                {message && (
                                    <div className={`flex items-center gap-2 text-sm ${message.includes("Error") ? "text-red-600" : "text-green-600"
                                        }`}>
                                        {message.includes("Error") ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                        <span className="font-medium">{message}</span>
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                            >
                                {saving ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Save Settings</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}
