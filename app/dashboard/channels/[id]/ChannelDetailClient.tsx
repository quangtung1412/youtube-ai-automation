"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteChannel } from "@/actions/channels";

type Channel = {
    id: string;
    name: string;
    personaSettings: string;
    createdAt: Date;
    projects: Array<{
        id: string;
        title: string;
        status: string;
        createdAt: Date;
    }>;
};

export default function ChannelDetailClient({ channel }: { channel: Channel }) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        const result = await deleteChannel(channel.id);

        if (result.success) {
            router.push("/dashboard/channels");
        } else {
            alert(result.error || "Failed to delete channel");
            setIsDeleting(false);
        }
    };

    let personaSettings;
    try {
        personaSettings = JSON.parse(channel.personaSettings);
    } catch {
        personaSettings = {};
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            {channel.name}
                        </h1>
                        <p className="text-sm text-gray-500">
                            Created {new Date(channel.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href={`/dashboard/channels/${channel.id}/edit`}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                        >
                            Edit
                        </Link>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            {/* Persona Settings */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    Persona Settings
                </h2>
                <div className="space-y-4">
                    {personaSettings.character && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-1">Character</h3>
                            <p className="text-gray-900">{personaSettings.character}</p>
                        </div>
                    )}
                    {personaSettings.visualStyle && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-1">Visual Style</h3>
                            <p className="text-gray-900">{personaSettings.visualStyle}</p>
                        </div>
                    )}
                    {personaSettings.tone && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-1">Tone</h3>
                            <p className="text-gray-900">{personaSettings.tone}</p>
                        </div>
                    )}
                    {personaSettings.background && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-1">Background</h3>
                            <p className="text-gray-900">{personaSettings.background}</p>
                        </div>
                    )}
                    {Object.keys(personaSettings).length === 0 && (
                        <p className="text-gray-500 italic">No persona settings configured</p>
                    )}
                </div>
            </div>

            {/* Projects */}
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900">
                        Projects ({channel.projects.length})
                    </h2>
                    <Link
                        href={`/dashboard/projects/new?channelId=${channel.id}`}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                        Create Project
                    </Link>
                </div>

                {channel.projects.length === 0 ? (
                    <div className="text-center py-12">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Get started by creating a new project for this channel.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {channel.projects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/dashboard/projects/${project.id}`}
                                className="block p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-md transition"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">
                                            {project.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Created {new Date(project.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-medium ${project.status === "completed"
                                                ? "bg-green-100 text-green-800"
                                                : project.status === "in_progress"
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : "bg-gray-100 text-gray-800"
                                            }`}
                                    >
                                        {project.status.replace("_", " ")}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Delete Channel
                        </h3>
                        <p className="text-gray-700 mb-6">
                            Are you sure you want to delete "{channel.name}"? This will also delete all
                            associated projects. This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
