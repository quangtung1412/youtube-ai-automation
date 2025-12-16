'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createChannel } from "@/actions/channels";
import { useSession } from "next-auth/react";

interface PersonaSettings {
    character_desc: string;
    tone: string;
    style: string;
    veo3_character_template: string;
    background_theme: string;
}

export default function ChannelForm() {
    const router = useRouter();
    const { data: session } = useSession();
    const [saving, setSaving] = useState(false);
    const [channelName, setChannelName] = useState("");
    const [persona, setPersona] = useState<PersonaSettings>({
        character_desc: "",
        tone: "professional",
        style: "cinematic",
        veo3_character_template: "",
        background_theme: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!session?.user?.id) {
            alert('You must be logged in to create a channel');
            return;
        }

        setSaving(true);

        const result = await createChannel({
            name: channelName,
            userId: session.user.id,
            personaSettings: JSON.stringify(persona)
        });

        if (result.success) {
            router.push('/dashboard/channels');
        } else {
            alert('Error creating channel: ' + result.error);
            setSaving(false);
        }
    }; return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Channel Name */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">
                    Channel Information
                </h2>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Channel Name *
                    </label>
                    <input
                        type="text"
                        required
                        value={channelName}
                        onChange={(e) => setChannelName(e.target.value)}
                        placeholder="e.g., Tech Explained, Story Time"
                        className="w-full px-3 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Character Description */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">
                    Character & Persona
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Character Description *
                        </label>
                        <textarea
                            required
                            value={persona.character_desc}
                            onChange={(e) => setPersona({ ...persona, character_desc: e.target.value })}
                            rows={4}
                            placeholder="e.g., An anime boy, silver hair, wearing hoodies, friendly expression, young adult..."
                            className="w-full px-3 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="mt-2 text-sm text-gray-500">
                            Detailed physical description of your main character
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            VEO3 Character Template
                        </label>
                        <input
                            type="text"
                            value={persona.veo3_character_template}
                            onChange={(e) => setPersona({ ...persona, veo3_character_template: e.target.value })}
                            placeholder="e.g., A 3D animated character with..."
                            className="w-full px-3 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="mt-2 text-sm text-gray-500">
                            Specific prompt format for VEO3 video generation
                        </p>
                    </div>
                </div>
            </div>

            {/* Style Settings */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">
                    Visual Style
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tone
                        </label>
                        <select
                            value={persona.tone}
                            onChange={(e) => setPersona({ ...persona, tone: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="professional">Professional</option>
                            <option value="casual">Casual</option>
                            <option value="humorous">Humorous</option>
                            <option value="educational">Educational</option>
                            <option value="dramatic">Dramatic</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Visual Style
                        </label>
                        <select
                            value={persona.style}
                            onChange={(e) => setPersona({ ...persona, style: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="cinematic">Cinematic</option>
                            <option value="anime">Anime</option>
                            <option value="realistic">Realistic</option>
                            <option value="cartoon">Cartoon</option>
                            <option value="documentary">Documentary</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Background Theme
                        </label>
                        <input
                            type="text"
                            value={persona.background_theme}
                            onChange={(e) => setPersona({ ...persona, background_theme: e.target.value })}
                            placeholder="e.g., Futuristic clean laboratory, modern office, fantasy landscape..."
                            className="w-full px-3 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
            </div>

            {/* Submit Button */}
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
                    disabled={saving}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    {saving ? "Creating..." : "Create Channel"}
                </button>
            </div>
        </form>
    );
}
