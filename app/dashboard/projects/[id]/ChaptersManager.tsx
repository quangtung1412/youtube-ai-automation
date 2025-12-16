'use client'

import { useState } from "react";
import { updateAllChapters, deleteChapter, createChapter } from "@/actions/updateChapters";
import { generateOutline } from "@/actions/generateOutline";

interface Chapter {
    id: string;
    chapterNumber: number;
    title: string;
    title_vi?: string;
    contentSummary: string;
    contentSummary_vi?: string;
    durationSeconds: number;
    goal?: string;
}

export default function ChaptersManager({
    projectId,
    initialChapters,
    language = 'Vietnamese',
}: {
    projectId: string;
    initialChapters: Chapter[];
    language?: string;
}) {
    const isBilingual = !language.toLowerCase().includes('vietnam');
    const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [adding, setAdding] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [regenerating, setRegenerating] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const result = await updateAllChapters(projectId, chapters);
            if (result.success) {
                setEditMode(false);
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else {
                alert("Error: " + result.error);
            }
        } catch (error) {
            alert("Failed to save chapters");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setChapters(initialChapters);
        setEditMode(false);
    };

    const handleAddChapter = async () => {
        setAdding(true);
        try {
            const result = await createChapter(projectId);
            if (result.success) {
                window.location.reload();
            } else {
                alert("Error: " + result.error);
            }
        } catch (error) {
            alert("Failed to add chapter");
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteChapter = async (chapterId: string) => {
        if (!confirm("Are you sure you want to delete this chapter? All associated scenes will also be deleted.")) {
            return;
        }

        setDeleting(chapterId);
        try {
            const result = await deleteChapter(projectId, chapterId);
            if (result.success) {
                window.location.reload();
            } else {
                alert("Error: " + result.error);
            }
        } catch (error) {
            alert("Failed to delete chapter");
        } finally {
            setDeleting(null);
        }
    };

    const updateChapter = (id: string, field: keyof Chapter, value: string | number) => {
        setChapters(prev =>
            prev.map(ch =>
                ch.id === id ? { ...ch, [field]: value } : ch
            )
        );
    };

    const handleRegenerateOutline = async () => {
        if (!confirm("Are you sure you want to regenerate the outline? This will replace all current chapters with new AI-generated ones. All associated scenes will be deleted.")) {
            return;
        }

        setRegenerating(true);
        try {
            const result = await generateOutline(projectId);
            if (result.success) {
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else {
                alert("Error: " + result.error);
            }
        } catch (error) {
            alert("Failed to regenerate outline");
        } finally {
            setRegenerating(false);
        }
    };

    const totalDuration = chapters.reduce((sum, ch) => sum + ch.durationSeconds, 0);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Outline Structure</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {chapters.length} chapters • {Math.floor(totalDuration / 60)} phút {totalDuration % 60} giây
                    </p>
                </div>
                <div className="flex gap-3">
                    {!editMode ? (
                        <>
                            <button
                                onClick={handleRegenerateOutline}
                                disabled={regenerating}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition"
                            >
                                {regenerating ? '⏳ Generating...' : '✨ Regenerate with AI'}
                            </button>
                            <button
                                onClick={handleAddChapter}
                                disabled={adding}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition"
                            >
                                {adding ? '⏳ Adding...' : '➕ Add Chapter'}
                            </button>
                            <button
                                onClick={() => setEditMode(true)}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition"
                            >
                                📝 Edit Outline
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

            {/* Chapters List */}
            <div className="space-y-4">
                {chapters.map((chapter) => (
                    <div key={chapter.id} className={`border-2 rounded-lg overflow-hidden transition ${editMode ? 'border-indigo-300' : 'border-gray-200 hover:border-indigo-300'
                        }`}>
                        {/* Chapter Header */}
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center flex-1 gap-3">
                                    <span className="bg-white text-indigo-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                        {chapter.chapterNumber}
                                    </span>
                                    {editMode ? (
                                        <div className="flex-1 space-y-2">
                                            <input
                                                type="text"
                                                value={chapter.title}
                                                onChange={(e) => updateChapter(chapter.id, 'title', e.target.value)}
                                                className="w-full px-3 py-1 bg-white text-gray-900 rounded font-semibold text-lg"
                                                placeholder={isBilingual ? `Chapter title (${language})` : "Chapter title"}
                                            />
                                            {isBilingual && (
                                                <input
                                                    type="text"
                                                    value={chapter.title_vi || ''}
                                                    onChange={(e) => updateChapter(chapter.id, 'title_vi', e.target.value)}
                                                    className="w-full px-3 py-1 bg-green-50 text-gray-900 rounded font-semibold text-lg border-2 border-green-300"
                                                    placeholder="Chapter title (Vietnamese)"
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-lg">
                                                {chapter.title}
                                            </h4>
                                            {isBilingual && chapter.title_vi && (
                                                <p className="text-sm text-green-200 mt-1">
                                                    🇻🇳 {chapter.title_vi}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {editMode ? (
                                        <input
                                            type="number"
                                            value={chapter.durationSeconds}
                                            onChange={(e) => updateChapter(chapter.id, 'durationSeconds', parseInt(e.target.value) || 0)}
                                            className="w-20 px-2 py-1 bg-white text-gray-900 rounded text-center text-sm font-medium"
                                            placeholder="60"
                                        />
                                    ) : (
                                        <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                                            {chapter.durationSeconds}s
                                        </span>
                                    )}
                                    {editMode && (
                                        <button
                                            onClick={() => handleDeleteChapter(chapter.id)}
                                            disabled={deleting === chapter.id}
                                            className="ml-2 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium disabled:opacity-50 transition"
                                        >
                                            {deleting === chapter.id ? '⏳' : '🗑️'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Chapter Content */}
                        <div className="p-4 bg-gray-50">
                            {editMode ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            {isBilingual ? `Content Summary (${language})` : 'Content Summary'}
                                        </label>
                                        <textarea
                                            value={chapter.contentSummary}
                                            onChange={(e) => updateChapter(chapter.id, 'contentSummary', e.target.value)}
                                            rows={4}
                                            className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg text-sm text-gray-700 leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Content summary for this chapter..."
                                        />
                                    </div>
                                    {isBilingual && (
                                        <div>
                                            <label className="block text-xs font-medium text-green-700 mb-1">
                                                🇻🇳 Content Summary (Vietnamese)
                                            </label>
                                            <textarea
                                                value={chapter.contentSummary_vi || ''}
                                                onChange={(e) => updateChapter(chapter.id, 'contentSummary_vi', e.target.value)}
                                                rows={4}
                                                className="w-full px-3 py-2 border-2 border-green-300 bg-green-50 rounded-lg text-sm text-gray-700 leading-relaxed focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                placeholder="Tóm tắt nội dung chapter bằng tiếng Việt..."
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div>
                                        {isBilingual && <p className="text-xs font-medium text-blue-600 mb-1">📘 {language}</p>}
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                            {chapter.contentSummary}
                                        </p>
                                    </div>
                                    {isBilingual && chapter.contentSummary_vi && (
                                        <div className="border-t pt-3">
                                            <p className="text-xs font-medium text-green-700 mb-1">🇻🇳 Tiếng Việt</p>
                                            <p className="text-sm text-gray-700 leading-relaxed">
                                                {chapter.contentSummary_vi}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {editMode && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                    <p className="text-amber-800 text-sm">
                        ℹ️ <strong>Note:</strong> Deleting a chapter will also delete all its associated scenes and scripts.
                    </p>
                </div>
            )}
        </div>
    );
}
