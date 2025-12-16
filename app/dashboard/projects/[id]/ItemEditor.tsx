'use client'

import { useState } from 'react';
import { updateProjectItem, deleteProjectItem } from '@/actions/updateProjectItems';

interface ItemEditorProps {
    item: {
        id: string;
        name: string;
        description: string;
        context: string;
        visualDesc: string | null;
    };
}

export default function ItemEditor({ item }: ItemEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(item.name);
    const [description, setDescription] = useState(item.description);
    const [context, setContext] = useState(item.context);
    const [visualDesc, setVisualDesc] = useState(item.visualDesc || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        const result = await updateProjectItem(item.id, {
            name,
            description,
            context,
            visualDesc
        });
        setSaving(false);

        if (result.success) {
            setIsEditing(false);
        } else {
            alert('Lỗi: ' + result.error);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Xóa item này?')) return;

        setSaving(true);
        const result = await deleteProjectItem(item.id);
        setSaving(false);

        if (!result.success) {
            alert('Lỗi: ' + result.error);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">
                    {isEditing ? (
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50"
                            placeholder="Tên item..."
                        />
                    ) : (
                        name
                    )}
                </h4>
                {!isEditing ? (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Sửa
                        </button>
                        <button
                            onClick={handleDelete}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            Xóa
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                            {saving ? '...' : 'Lưu'}
                        </button>
                        <button
                            onClick={() => {
                                setName(item.name);
                                setDescription(item.description);
                                setContext(item.context);
                                setVisualDesc(item.visualDesc || '');
                                setIsEditing(false);
                            }}
                            disabled={saving}
                            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                            Hủy
                        </button>
                    </div>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-2">
                    <div>
                        <label className="text-xs text-gray-600">Description:</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-600">Context:</label>
                        <input
                            type="text"
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-600">Visual Description:</label>
                        <textarea
                            value={visualDesc}
                            onChange={(e) => setVisualDesc(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50"
                            rows={3}
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-1 text-sm text-gray-700">
                    <p><span className="font-medium">Description:</span> {description}</p>
                    <p><span className="font-medium">Context:</span> {context}</p>
                    {visualDesc && (
                        <p><span className="font-medium">Visual:</span> {visualDesc}</p>
                    )}
                </div>
            )}
        </div>
    );
}
