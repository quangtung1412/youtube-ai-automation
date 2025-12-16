'use client'

import { useState, useEffect } from "react";
import { getAIModels, saveAIModel, deleteAIModel, updateModelPriorities, toggleModelStatus, initializeDefaultModels } from "@/actions/aiModels";
import { getSystemConfig, updateSystemConfig } from "@/actions/systemConfig";
import { AIModelConfig } from "@/lib/modelRotation";

export default function ModelRotationSettings() {
    const [models, setModels] = useState<AIModelConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<AIModelConfig>>({});
    const [globalApiKey, setGlobalApiKey] = useState("");
    const [savingApiKey, setSavingApiKey] = useState(false);

    useEffect(() => {
        loadModels();
        loadGlobalApiKey();
    }, []);

    const loadGlobalApiKey = async () => {
        try {
            const config = await getSystemConfig();
            setGlobalApiKey(config.apiKey || "");
        } catch (error) {
            console.error("Error loading global API key:", error);
        }
    };

    const loadModels = async () => {
        setLoading(true);
        // Initialize default models if needed
        await initializeDefaultModels();

        const result = await getAIModels();
        if (result.success && result.models) {
            setModels(result.models);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!formData.modelId || !formData.displayName) {
            alert("Model ID and Display Name are required");
            return;
        }

        const result = await saveAIModel({
            modelId: formData.modelId,
            displayName: formData.displayName,
            apiKey: formData.apiKey || null,
            rpm: formData.rpm || 15,
            tpm: formData.tpm || 1000000,
            rpd: formData.rpd || 1500,
            priority: formData.priority || 999,
            enabled: formData.enabled ?? true
        });

        if (result.success) {
            setEditing(null);
            setFormData({});
            loadModels();
        } else {
            alert("Error: " + result.error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this model configuration?")) return;

        const result = await deleteAIModel(id);
        if (result.success) {
            loadModels();
        } else {
            alert("Error: " + result.error);
        }
    };

    const handleToggle = async (id: string, enabled: boolean) => {
        const result = await toggleModelStatus(id, enabled);
        if (result.success) {
            loadModels();
        }
    };

    const movePriority = async (id: string, direction: 'up' | 'down') => {
        const index = models.findIndex(m => m.id === id);
        if (index === -1) return;

        const newModels = [...models];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newModels.length) return;

        // Swap
        [newModels[index], newModels[targetIndex]] = [newModels[targetIndex], newModels[index]];

        // Update priorities
        const result = await updateModelPriorities(newModels.map(m => m.id));
        if (result.success) {
            loadModels();
        }
    };

    const handleSaveGlobalApiKey = async () => {
        setSavingApiKey(true);
        try {
            const result = await updateSystemConfig({ apiKey: globalApiKey });
            if (result.success) {
                alert("✓ Global API Key saved successfully!");
            } else {
                alert("Error: " + result.error);
            }
        } catch (error) {
            alert("Error saving API key");
        } finally {
            setSavingApiKey(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">🔄 AI Model Rotation & API Configuration</h1>
                <p className="text-gray-600 mt-2">
                    Configure AI models with rate limits and API keys. The system will automatically rotate to the next available model when quota is exhausted.
                </p>
            </div>

            {/* Global API Key Section */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-400 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-red-900 mb-2">🔑 API Key Required (IMPORTANT)</h3>
                        <p className="text-sm text-red-800 mb-3 font-medium">
                            ⚠️ You MUST provide your own Google API Key to use this platform. The system no longer uses shared API keys.
                        </p>
                        <div className="bg-white rounded-lg p-4 border-2 border-red-300">
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Your Google API Key *
                                <span className="text-red-600 font-semibold ml-2">(REQUIRED)</span>
                            </label>
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="password"
                                    placeholder="AIzaSy... (Paste your API key here)"
                                    value={globalApiKey}
                                    onChange={e => setGlobalApiKey(e.target.value)}
                                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <button
                                    onClick={handleSaveGlobalApiKey}
                                    disabled={savingApiKey}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {savingApiKey ? "Saving..." : "💾 Save"}
                                </button>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                                <p className="text-sm text-blue-900 font-medium mb-2">📝 How to get your API key:</p>
                                <ol className="text-xs text-blue-800 space-y-1 ml-4 list-decimal">
                                    <li>Visit <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline font-semibold">https://aistudio.google.com/apikey</a></li>
                                    <li>Sign in with your Google account</li>
                                    <li>Click "Create API Key" button</li>
                                    <li>Copy the key and paste it above</li>
                                </ol>
                            </div>
                            <p className="text-xs text-gray-600">
                                🔒 Your API key is stored securely and only used for your AI generations. Each model below can have its own key to override this default.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add New Model Button */}
            <div className="mb-6">
                <button
                    onClick={() => {
                        setEditing('new');
                        setFormData({ enabled: true, priority: models.length + 1 });
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                    ➕ Add New Model
                </button>
            </div>

            {/* Edit Form */}
            {editing && (
                <div className="bg-white border-2 border-indigo-500 rounded-lg p-6 mb-6 shadow-lg">
                    <h3 className="text-lg font-semibold mb-4">
                        {editing === 'new' ? 'Add New Model' : 'Edit Model'}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Model ID *</label>
                            <input
                                type="text"
                                value={formData.modelId || ''}
                                onChange={e => setFormData({ ...formData, modelId: e.target.value })}
                                placeholder="e.g., gemini-1.5-flash"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                disabled={editing !== 'new'}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
                            <input
                                type="text"
                                value={formData.displayName || ''}
                                onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                                placeholder="e.g., Gemini 1.5 Flash"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">API Key (optional)</label>
                            <input
                                type="password"
                                value={formData.apiKey || ''}
                                onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                                placeholder="Leave empty to use default key"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">RPM (Requests/Minute)</label>
                            <input
                                type="number"
                                value={formData.rpm || 15}
                                onChange={e => setFormData({ ...formData, rpm: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">TPM (Tokens/Minute)</label>
                            <input
                                type="number"
                                value={formData.tpm || 1000000}
                                onChange={e => setFormData({ ...formData, tpm: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">RPD (Requests/Day)</label>
                            <input
                                type="number"
                                value={formData.rpd || 1500}
                                onChange={e => setFormData({ ...formData, rpd: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            ✓ Save
                        </button>
                        <button
                            onClick={() => {
                                setEditing(null);
                                setFormData({});
                            }}
                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                        >
                            ✕ Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Models List */}
            <div className="space-y-4">
                {models.map((model, index) => (
                    <div
                        key={model.id}
                        className={`bg-white rounded-lg border-2 p-6 shadow-sm ${model.enabled ? 'border-green-300' : 'border-gray-300'
                            }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4 flex-1">
                                {/* Priority Controls */}
                                <div className="flex flex-col gap-1">
                                    <button
                                        onClick={() => movePriority(model.id, 'up')}
                                        disabled={index === 0}
                                        className="p-1 text-gray-600 hover:text-indigo-600 disabled:opacity-30"
                                    >
                                        ▲
                                    </button>
                                    <div className="text-center font-bold text-indigo-600 text-xl">
                                        {model.priority}
                                    </div>
                                    <button
                                        onClick={() => movePriority(model.id, 'down')}
                                        disabled={index === models.length - 1}
                                        className="p-1 text-gray-600 hover:text-indigo-600 disabled:opacity-30"
                                    >
                                        ▼
                                    </button>
                                </div>

                                {/* Model Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-semibold text-gray-900">
                                            {model.displayName}
                                        </h3>
                                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${model.enabled
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {model.enabled ? '✓ Enabled' : '✕ Disabled'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3 font-mono">{model.modelId}</p>

                                    {/* Limits */}
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-600">RPM:</span>
                                            <span className="ml-2 font-semibold text-indigo-600">
                                                {model.currentMinuteRequests}/{model.rpm}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">TPM:</span>
                                            <span className="ml-2 font-semibold text-purple-600">
                                                {model.currentMinuteTokens.toLocaleString()}/{model.tpm.toLocaleString()}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">RPD:</span>
                                            <span className="ml-2 font-semibold text-blue-600">
                                                {model.currentDayRequests}/{model.rpd}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => handleToggle(model.id, !model.enabled)}
                                    className={`px-3 py-1 rounded text-sm font-medium ${model.enabled
                                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                        }`}
                                >
                                    {model.enabled ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                    onClick={() => {
                                        setEditing(model.id);
                                        setFormData(model);
                                    }}
                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200"
                                >
                                    ✏️ Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(model.id)}
                                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200"
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {models.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No models configured. Click "Add New Model" to get started.
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                    💡 <strong>How it works:</strong> Models are tried in priority order (lower number = higher priority).
                    When a model reaches its rate limit, the system automatically switches to the next available model.
                    Counters reset every minute (RPM, TPM) and daily (RPD).
                </p>
            </div>
        </div>
    );
}
