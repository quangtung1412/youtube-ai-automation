'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/actions/projects";

interface Channel {
    id: string;
    name: string;
    personaSettings: string;
}

export default function ProjectForm({ channels }: { channels: Channel[] }) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [channelId, setChannelId] = useState(channels[0]?.id || "");
    const [inputContent, setInputContent] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title || !channelId || !inputContent) {
            alert("Please fill in all required fields");
            return;
        }

        setSaving(true);

        const result = await createProject({
            title,
            channelId,
            inputContent
        });

        if (result.success && result.project) {
            router.push(`/dashboard/projects/${result.project.id}`);
        } else {
            alert('Error creating project: ' + result.error);
            setSaving(false);
        }
    };

    const wordCount = inputContent.trim().split(/\s+/).filter(w => w).length;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Info */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">
                    Project Information
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Project Title *
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., The History of AI Technology"
                            className="w-full px-3 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Channel *
                        </label>
                        <select
                            required
                            value={channelId}
                            onChange={(e) => setChannelId(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {channels.map((channel) => (
                                <option key={channel.id} value={channel.id}>
                                    {channel.name}
                                </option>
                            ))}
                        </select>
                        <p className="mt-2 text-sm text-gray-500">
                            The AI will use this channel's persona settings
                        </p>
                    </div>
                </div>
            </div>

            {/* Input Content */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">
                    Input Content
                </h2>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content Source *
                    </label>
                    <textarea
                        required
                        value={inputContent}
                        onChange={(e) => setInputContent(e.target.value)}
                        rows={15}
                        placeholder="Paste your article, research paper, documentation, or any text content here. The AI will analyze it and create a structured video script.

Gemini 1.5 Pro can handle up to 2 million tokens, so feel free to paste extensive content!"
                        className="w-full px-3 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    />
                    <div className="mt-2 flex justify-between text-sm text-gray-500">
                        <span>Minimum 100 words recommended</span>
                        <span className={wordCount < 100 ? "text-orange-600" : "text-green-600"}>
                            {wordCount} words
                        </span>
                    </div>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-md">
                    <h4 className="font-semibold text-blue-900 mb-2">Tips:</h4>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                        <li>Paste complete articles, research papers, or documentation</li>
                        <li>The more detailed your input, the better the AI output</li>
                        <li>Gemini handles long context - no need to summarize</li>
                        <li>Include key facts, figures, and quotes you want featured</li>
                    </ul>
                </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={saving || wordCount < 50}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    {saving ? "Creating..." : "Create Project"}
                </button>
            </div>
        </form>
    );
}
