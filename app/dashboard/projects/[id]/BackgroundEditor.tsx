'use client'

import { useState } from 'react';
import { updateBackgroundVisual } from '@/actions/updateProjectVisuals';

interface BackgroundEditorProps {
    projectId: string;
    initialValue: string | null;
    initialValueVi?: string | null;
    language?: string;
}

export default function BackgroundEditor({ projectId, initialValue, initialValueVi, language = 'Vietnamese' }: BackgroundEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue || '');
    const [valueVi, setValueVi] = useState(initialValueVi || '');
    const [saving, setSaving] = useState(false);
    const isBilingual = !language.toLowerCase().includes('vietnam');

    const handleSave = async () => {
        setSaving(true);
        const result = await updateBackgroundVisual(projectId, value, valueVi);
        setSaving(false);

        if (result.success) {
            setIsEditing(false);
        } else {
            alert('Lỗi: ' + result.error);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                    {isBilingual ? '🌐 Background Visual (Bilingual)' : '🎨 Background Visual Base'}
                </h3>
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Chỉnh sửa
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                            {saving ? 'Đang lưu...' : 'Lưu'}
                        </button>
                        <button
                            onClick={() => {
                                setValue(initialValue || '');
                                setValueVi(initialValueVi || '');
                                setIsEditing(false);
                            }}
                            disabled={saving}
                            className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
                        >
                            Hủy
                        </button>
                    </div>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-4">
                    {isBilingual && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                📝 {language} Version
                            </label>
                            <textarea
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-gray-50 focus:ring-2 focus:ring-blue-500"
                                placeholder={`Background description in ${language}...`}
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            🇻🇳 {isBilingual ? 'Vietnamese Translation' : 'Mô tả background'}
                        </label>
                        <textarea
                            value={isBilingual ? valueVi : value}
                            onChange={(e) => isBilingual ? setValueVi(e.target.value) : setValue(e.target.value)}
                            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-gray-50 focus:ring-2 focus:ring-blue-500"
                            placeholder="Mô tả môi trường/background chung..."
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {isBilingual && value && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <p className="text-xs font-semibold text-blue-700 mb-2">📝 {language}</p>
                            <p className="text-gray-800 whitespace-pre-wrap text-sm">
                                {value || `No ${language} description`}
                            </p>
                        </div>
                    )}
                    <div className={isBilingual ? "bg-green-50 p-4 rounded-lg border border-green-200" : ""}>
                        {isBilingual && <p className="text-xs font-semibold text-green-700 mb-2">🇻🇳 Tiếng Việt</p>}
                        <p className="text-gray-800 whitespace-pre-wrap text-sm">
                            {(isBilingual ? valueVi : value) || 'Chưa có mô tả background'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
