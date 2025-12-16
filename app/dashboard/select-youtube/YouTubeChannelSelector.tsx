'use client'

import { useState, useEffect } from 'react';
import { linkYouTubeChannel } from '@/actions/linkYouTubeChannel';
import { useRouter } from 'next/navigation';

interface YouTubeChannel {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    customUrl?: string;
}

export default function YouTubeChannelSelector() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [channels, setChannels] = useState<YouTubeChannel[]>([]);
    const [error, setError] = useState('');
    const [linking, setLinking] = useState<string | null>(null);

    useEffect(() => {
        fetchChannels();
    }, []);

    const fetchChannels = async () => {
        try {
            const response = await fetch('/api/youtube/channels');
            const data = await response.json();

            if (response.ok) {
                setChannels(data.channels || []);
            } else {
                setError(data.error || 'Không thể tải danh sách kênh YouTube');
            }
        } catch (err: any) {
            setError('Lỗi khi tải danh sách kênh: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectChannel = async (channel: YouTubeChannel) => {
        setLinking(channel.id);
        setError('');

        try {
            const result = await linkYouTubeChannel(
                channel.id,
                channel.title,
                channel.thumbnail
            );

            if (result.success) {
                router.push('/dashboard');
            } else {
                setError(result.error || 'Lỗi khi liên kết kênh');
            }
        } catch (err: any) {
            setError('Lỗi: ' + err.message);
        } finally {
            setLinking(null);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Đang tải danh sách kênh YouTube...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Không thể tải kênh YouTube
                    </h3>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <div className="space-x-4">
                        <button
                            onClick={() => {
                                setError('');
                                setLoading(true);
                                fetchChannels();
                            }}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            Thử lại
                        </button>
                        <a
                            href="/dashboard/channels/new"
                            className="inline-block px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            Tạo channel thủ công
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    if (channels.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center">
                    <div className="text-gray-400 text-5xl mb-4">📺</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Không tìm thấy kênh YouTube
                    </h3>
                    <p className="text-gray-600 mb-6">
                        Tài khoản Google của bạn chưa có kênh YouTube nào.
                    </p>
                    <a
                        href="/dashboard/channels/new"
                        className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        Tạo channel thủ công
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Chọn YouTube Channel
            </h2>
            <div className="space-y-4">
                {channels.map((channel) => (
                    <button
                        key={channel.id}
                        onClick={() => handleSelectChannel(channel)}
                        disabled={linking !== null}
                        className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    >
                        <div className="flex items-center gap-4">
                            <img
                                src={channel.thumbnail}
                                alt={channel.title}
                                className="w-20 h-20 rounded-full object-cover"
                            />
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {channel.title}
                                </h3>
                                {channel.customUrl && (
                                    <p className="text-sm text-gray-600">
                                        {channel.customUrl}
                                    </p>
                                )}
                                {channel.description && (
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                        {channel.description}
                                    </p>
                                )}
                            </div>
                            {linking === channel.id ? (
                                <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                            ) : (
                                <svg
                                    className="w-6 h-6 text-indigo-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5l7 7-7 7"
                                    />
                                </svg>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
