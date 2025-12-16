'use client'

import { useState } from 'react';
import { updateChannel } from '@/actions/updateChannel';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Channel {
    id: string;
    name: string;
    personaSettings: string;
    defaultOutlinePrompt: string;
    youtubeChannelId: string | null;
    youtubeThumbnail: string | null;
}

export default function ChannelEditForm({ channel }: { channel: Channel }) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [name, setName] = useState(channel.name);
    const [defaultOutlinePrompt, setDefaultOutlinePrompt] = useState(
        channel.defaultOutlinePrompt || ''
    );

    // Parse persona settings
    const persona = JSON.parse(channel.personaSettings || '{}');
    const [character, setCharacter] = useState(persona.character || '');
    const [tone, setTone] = useState(persona.tone || '');
    const [style, setStyle] = useState(persona.style || '');
    const [background, setBackground] = useState(persona.background || '');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const personaSettings = JSON.stringify({
                character,
                tone,
                style,
                background
            });

            const result = await updateChannel(channel.id, {
                name,
                personaSettings,
                defaultOutlinePrompt
            });

            if (result.success) {
                router.push(`/dashboard/channels/${channel.id}`);
            } else {
                setError(result.error || 'Lỗi khi lưu');
            }
        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="space-y-6">
            {/* YouTube Integration Info */}
            {channel.youtubeChannelId && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-4">
                    {channel.youtubeThumbnail && (
                        <img
                            src={channel.youtubeThumbnail}
                            alt={channel.name}
                            className="w-16 h-16 rounded-full"
                        />
                    )}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-green-600 font-semibold">✓ Đã liên kết với YouTube</span>
                        </div>
                        <p className="text-sm text-gray-600">
                            Channel ID: {channel.youtubeChannelId}
                        </p>
                    </div>
                </div>
            )}

            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Thông tin cơ bản
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tên Channel
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-gray-50 focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                </div>
            </div>

            {/* Persona Settings */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Persona Settings
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                    Các thông tin này sẽ được sử dụng để tạo character visual và style cho video
                </p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Character Description
                        </label>
                        <input
                            type="text"
                            value={character}
                            onChange={(e) => setCharacter(e.target.value)}
                            placeholder="VD: Young female tech reviewer in casual style"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-gray-50 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tone
                            </label>
                            <input
                                type="text"
                                value={tone}
                                onChange={(e) => setTone(e.target.value)}
                                placeholder="VD: professional, casual, humorous"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-gray-50 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Visual Style
                            </label>
                            <input
                                type="text"
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                placeholder="VD: cinematic, realistic, anime"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-gray-50 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Background
                        </label>
                        <input
                            type="text"
                            value={background}
                            onChange={(e) => setBackground(e.target.value)}
                            placeholder="VD: modern office, cozy studio, outdoor garden"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-gray-50 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Default Outline Prompt */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Default Outline Prompt
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                    Prompt mặc định này sẽ được thêm vào khi tạo outline cho mọi project trong channel.
                    Để trống nếu muốn dùng prompt mặc định của hệ thống.
                </p>
                <textarea
                    value={defaultOutlinePrompt}
                    onChange={(e) => setDefaultOutlinePrompt(e.target.value)}
                    rows={8}
                    placeholder="VD: Hãy tạo outline theo phong cách giải trí, dễ hiểu cho người xem trẻ tuổi..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-gray-50 focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">❌ {error}</p>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center">
                <Link
                    href={`/dashboard/channels/${channel.id}`}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                    ← Quay lại
                </Link>
                <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                    {saving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
                </button>
            </div>
        </form>
    );
}
