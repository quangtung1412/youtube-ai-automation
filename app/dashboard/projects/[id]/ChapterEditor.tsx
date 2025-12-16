'use client'

import { useState } from "react";
import { updateChapter, deleteChapter } from "@/actions/updateChapters";

interface Chapter {
    id: string;
    chapterNumber: number;
    title: string;
    contentSummary: string;
    durationSeconds: number;
}

export default function ChapterEditor({ chapter: initialChapter, projectId, onDelete }: {
    chapter: Chapter;
    projectId: string;
    onDelete: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [chapter, setChapter] = useState(initialChapter);

    const handleSave = async () => {
        setSaving(true);

        const result = await updateChapter(chapter.id, {
            title: chapter.title,
            contentSummary: chapter.contentSummary,
            durationSeconds: chapter.durationSeconds
        });

        if (result.success) {
            setEditing(false);
        } else {
            alert('Error: ' + result.error);
        }

        setSaving(false);
    };

    const handleDelete = async () => {
        if (!confirm('Xóa chapter này?')) return;

        const result = await deleteChapter(projectId, chapter.id);

        if (result.success) {
            onDelete();
        } else {
            alert('Error: ' + result.error);
        }
    };

    if (editing) {
        return (
            <div className="border-2 border-indigo-400 rounded-lg p-4 bg-indigo-50">
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tiêu đề Chapter
                        </label>
                        <input
                            type="text"
                            value={chapter.title}
                            onChange={(e) => setChapter({ ...chapter, title: e.target.value })}
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nội dung tóm tắt
                        </label>
                        <textarea
                            value={chapter.contentSummary}
                            onChange={(e) => setChapter({ ...chapter, contentSummary: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Thời lượng (giây)
                        </label>
                        <input
                            type="number"
                            value={chapter.durationSeconds}
                            onChange={(e) => setChapter({ ...chapter, durationSeconds: parseInt(e.target.value) })}
                            min="10"
                            max="600"
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                        <button
                            onClick={() => {
                                setChapter(initialChapter);
                                setEditing(false);
                            }}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {saving ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition">
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900">
                    {chapter.chapterNumber}. {chapter.title}
                </h4>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                        {chapter.durationSeconds}s
                    </span>
                    <button
                        onClick={() => setEditing(true)}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                        ✏️
                    </button>
                    <button
                        onClick={handleDelete}
                        className="text-sm text-red-600 hover:text-red-800"
                    >
                        🗑️
                    </button>
                </div>
            </div>
            <p className="text-sm text-gray-600">
                {chapter.contentSummary}
            </p>
        </div>
    );
}
