'use client'

import { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { getChannelWithYouTubeInfo } from "@/actions/autoCreateChannel";

interface UserMenuProps {
    userId: string;
}

export default function UserMenu({ userId }: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [channelInfo, setChannelInfo] = useState<any>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadChannel = async () => {
            const info = await getChannelWithYouTubeInfo(userId);
            setChannelInfo(info);
        };
        loadChannel();
    }, [userId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!channelInfo) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 hover:bg-gray-100 rounded-lg p-2 transition-colors"
            >
                {channelInfo.youtubeThumbnail && (
                    <Image
                        src={channelInfo.youtubeThumbnail}
                        alt={channelInfo.name}
                        width={32}
                        height={32}
                        className="rounded-full"
                    />
                )}
                <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-gray-700">
                        {channelInfo.name}
                    </span>
                    <svg
                        className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {/* Channel Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            {channelInfo.youtubeThumbnail && (
                                <Image
                                    src={channelInfo.youtubeThumbnail}
                                    alt={channelInfo.name}
                                    width={48}
                                    height={48}
                                    className="rounded-full"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate">
                                    {channelInfo.name}
                                </p>
                                {channelInfo.youtubeStats && (
                                    <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                        <span>👥 {channelInfo.youtubeStats.subscriberCount.toLocaleString()}</span>
                                        <span>🎬 {channelInfo.youtubeStats.videoCount.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* YouTube Link */}
                    {channelInfo.youtubeStats?.customUrl && (
                        <a
                            href={`https://youtube.com/${channelInfo.youtubeStats.customUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors"
                        >
                            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                            <span className="text-sm text-gray-700">View YouTube Channel</span>
                        </a>
                    )}

                    {/* Divider */}
                    <div className="border-t border-gray-100 my-1"></div>

                    {/* Sign Out Button */}
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="text-sm font-medium">Sign Out</span>
                    </button>
                </div>
            )}
        </div>
    );
}
