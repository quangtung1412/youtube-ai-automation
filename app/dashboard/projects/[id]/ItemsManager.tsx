'use client'

import { useState } from 'react';
import ItemEditor from './ItemEditor';
import { createProjectItem } from '@/actions/updateProjectItems';

interface ProjectItem {
    id: string;
    name: string;
    description: string;
    context: string;
    visualDesc: string | null;
}

interface ItemsManagerProps {
    projectId: string;
    initialItems: ProjectItem[];
}

export default function ItemsManager({ projectId, initialItems }: ItemsManagerProps) {
    const [items, setItems] = useState(initialItems);
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newContext, setNewContext] = useState('');
    const [saving, setSaving] = useState(false);

    const handleAddItem = async () => {
        if (!newName.trim()) {
            alert('Tên item không được để trống');
            return;
        }

        setSaving(true);
        const result = await createProjectItem(projectId, {
            name: newName,
            description: newDescription,
            context: newContext,
            visualDesc: ''
        });
        setSaving(false);

        if (result.success && result.item) {
            setItems([...items, result.item]);
            setNewName('');
            setNewDescription('');
            setNewContext('');
            setIsAdding(false);
        } else {
            alert('Lỗi: ' + result.error);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                    🎨 Visual Items & Objects
                </h2>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                    >
                        + Thêm Item
                    </button>
                )}
            </div>

            {/* Add New Item Form */}
            {isAdding && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Thêm Item Mới</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tên Item *
                            </label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="VD: Laptop MacBook, Cốc Coffee..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mô tả
                            </label>
                            <input
                                type="text"
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="Mô tả ngắn gọn về item..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ngữ cảnh xuất hiện
                            </label>
                            <input
                                type="text"
                                value={newContext}
                                onChange={(e) => setNewContext(e.target.value)}
                                placeholder="Khi nào/ở đâu item này xuất hiện..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddItem}
                                disabled={saving}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                            >
                                {saving ? 'Đang lưu...' : 'Lưu Item'}
                            </button>
                            <button
                                onClick={() => {
                                    setIsAdding(false);
                                    setNewName('');
                                    setNewDescription('');
                                    setNewContext('');
                                }}
                                disabled={saving}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Items List */}
            {items.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-4xl mb-2">📦</div>
                    <p className="text-gray-600 text-sm">
                        Chưa có items nào. Nhấn "Thêm Item" để bắt đầu.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map((item) => (
                        <ItemEditor key={item.id} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}
