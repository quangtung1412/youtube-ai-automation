'use client'

import { useState } from "react";
import { updatePromptSettings } from "@/actions/updatePromptSettings";

interface PromptsSettingsProps {
    initialPrompts: {
        outlinePrompt: string;
        scriptsPrompt: string;
        veo3Prompt: string;
        characterPrompt: string;
        backgroundPrompt: string;
        itemsPrompt: string;
        veo3Template: string;
    };
    initialVeo3Template: string;
}

type PromptType = 'outlinePrompt' | 'scriptsPrompt' | 'veo3Prompt' | 'characterPrompt' | 'backgroundPrompt' | 'itemsPrompt';

const promptConfigs: Record<PromptType, { label: string; description: string; icon: string }> = {
    outlinePrompt: {
        label: "Outline Generation Prompt",
        description: "Used when generating video outline from input content",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    },
    scriptsPrompt: {
        label: "Scripts Generation Prompt",
        description: "Used when generating scene-by-scene scripts for chapters",
        icon: "M15 10l-4 4m0 0l-4-4m4 4V3"
    },
    veo3Prompt: {
        label: "VEO3 Prompt Generation",
        description: "Used when generating VEO3 video prompts for each scene",
        icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
    },
    characterPrompt: {
        label: "Character Visual Description",
        description: "Used when generating character visual description for image prompts",
        icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    },
    backgroundPrompt: {
        label: "Background/Environment Description",
        description: "Used when generating background and environment visual descriptions",
        icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    },
    itemsPrompt: {
        label: "Items Visual Description",
        description: "Used when generating visual descriptions for items/props in videos",
        icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    }
};

export default function PromptsSettings({ initialPrompts, initialVeo3Template }: PromptsSettingsProps) {
    const [prompts, setPrompts] = useState(initialPrompts);
    const [veo3Template, setVeo3Template] = useState(initialVeo3Template);
    const [saving, setSaving] = useState<PromptType | 'veo3Template' | null>(null);
    const [messages, setMessages] = useState<Record<PromptType | 'veo3Template', string>>({} as any);
    const [expandedPrompts, setExpandedPrompts] = useState<Set<PromptType>>(new Set());

    const handleUpdate = async (promptType: PromptType) => {
        setSaving(promptType);
        setMessages({ ...messages, [promptType]: "" });

        const result = await updatePromptSettings({
            [promptType]: prompts[promptType]
        });

        setSaving(null);

        if (result.success) {
            setMessages({ ...messages, [promptType]: "✓ Saved successfully!" });
            setTimeout(() => {
                setMessages(prev => ({ ...prev, [promptType]: "" }));
            }, 3000);
        } else {
            setMessages({ ...messages, [promptType]: "✗ Error: " + result.error });
        }
    };

    const handleVeo3TemplateUpdate = async () => {
        setSaving('veo3Template');
        setMessages({ ...messages, veo3Template: "" });

        const result = await updatePromptSettings({
            veo3Template: veo3Template
        });

        setSaving(null);

        if (result.success) {
            setMessages({ ...messages, veo3Template: "✓ Saved successfully!" });
            setTimeout(() => {
                setMessages(prev => ({ ...prev, veo3Template: "" }));
            }, 3000);
        } else {
            setMessages({ ...messages, veo3Template: "✗ Error: " + result.error });
        }
    };

    const toggleExpand = (promptType: PromptType) => {
        const newExpanded = new Set(expandedPrompts);
        if (newExpanded.has(promptType)) {
            newExpanded.delete(promptType);
        } else {
            newExpanded.add(promptType);
        }
        setExpandedPrompts(newExpanded);
    };

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Prompt Templates</h2>
                <p className="text-gray-600">
                    Customize the prompts used by AI for content generation.
                </p>
            </div>

            {(Object.keys(promptConfigs) as PromptType[]).map((promptType) => {
                const config = promptConfigs[promptType];
                const isExpanded = expandedPrompts.has(promptType);
                const isSaving = saving === promptType;
                const message = messages[promptType];

                return (
                    <div key={promptType} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        {/* Header */}
                        <div
                            className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleExpand(promptType)}
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <svg className="w-5 h-5 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
                                </svg>
                                <div className="flex-1">
                                    <h3 className="text-base font-semibold text-gray-900">{config.label}</h3>
                                    <p className="text-sm text-gray-600 mt-0.5">{config.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {message && (
                                    <span className={`text-sm font-medium ${message.includes('✗') ? 'text-red-600' : 'text-green-600'}`}>
                                        {message}
                                    </span>
                                )}
                                <svg
                                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Expandable Content */}
                        {isExpanded && (
                            <div className="p-5 pt-0 border-t border-gray-100 bg-gray-50">
                                <div className="space-y-4">
                                    <textarea
                                        value={prompts[promptType]}
                                        onChange={(e) => setPrompts({ ...prompts, [promptType]: e.target.value })}
                                        rows={12}
                                        className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm resize-y"
                                        placeholder="Enter custom prompt template..."
                                    />

                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-gray-500">
                                            {prompts[promptType].length} characters
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleUpdate(promptType)}
                                            disabled={isSaving}
                                            className="flex items-center gap-2 px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                        >
                                            {isSaving ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Save Changes
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* VEO3 Template Section */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <button
                    onClick={() => {
                        const newExpanded = new Set(expandedPrompts);
                        if (expandedPrompts.has('veo3Template' as PromptType)) {
                            newExpanded.delete('veo3Template' as PromptType);
                        } else {
                            newExpanded.add('veo3Template' as PromptType);
                        }
                        setExpandedPrompts(newExpanded);
                    }}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                        </svg>
                        <div className="text-left">
                            <div className="font-medium text-gray-900">VEO3 Video Template</div>
                            <div className="text-sm text-gray-500">Template structure for generating VEO3 video prompts</div>
                        </div>
                    </div>
                    <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${expandedPrompts.has('veo3Template' as PromptType) ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {expandedPrompts.has('veo3Template' as PromptType) && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Template Content
                                    </label>
                                    <span className="text-xs text-gray-500">
                                        {veo3Template.length} characters
                                    </span>
                                </div>
                                <textarea
                                    value={veo3Template}
                                    onChange={(e) => setVeo3Template(e.target.value)}
                                    rows={8}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                                    placeholder="Enter VEO3 video template..."
                                />
                                <p className="mt-2 text-xs text-gray-500">
                                    Use placeholders like {'{'}visualDescription{'}'}, {'{'}cinematography{'}'}, {'{'}cameraMovement{'}'} for dynamic content.
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleVeo3TemplateUpdate}
                                    disabled={saving === 'veo3Template'}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                                >
                                    {saving === 'veo3Template' ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Save Template
                                        </>
                                    )}
                                </button>
                                {messages.veo3Template && (
                                    <span className={`text-sm ${messages.veo3Template.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                                        {messages.veo3Template}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
