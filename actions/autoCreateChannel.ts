'use server'

import { prisma } from "@/lib/db";
import { initializeDefaultModels } from "./aiModels";

interface YouTubeChannelInfo {
    id: string;
    snippet: {
        title: string;
        description: string;
        thumbnails: {
            default: { url: string };
            medium: { url: string };
            high: { url: string };
        };
        customUrl?: string;
    };
    statistics: {
        viewCount: string;
        subscriberCount: string;
        videoCount: string;
    };
}

/**
 * Fetch YouTube channel information using access token
 */
async function fetchYouTubeChannelInfo(accessToken: string): Promise<YouTubeChannelInfo | null> {
    try {
        const response = await fetch(
            'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            console.error('Failed to fetch YouTube channel info:', response.statusText);
            return null;
        }

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            console.log('No YouTube channel found for this user');
            return null;
        }

        return data.items[0];
    } catch (error) {
        console.error('Error fetching YouTube channel info:', error);
        return null;
    }
}

/**
 * Auto-create or update channel for user after login
 */
export async function autoCreateChannelForUser(
    userId: string,
    accessToken?: string
): Promise<{ success: boolean; channelId?: string; error?: string }> {
    try {
        // Check if user already has a channel
        const existingChannel = await prisma.channel.findFirst({
            where: { userId }
        });

        let youtubeChannelId: string | undefined;
        let channelName = 'My Channel';
        let youtubeThumbnail: string | undefined;
        let personaSettings = '{}';

        // If we have access token, fetch YouTube channel info
        if (accessToken) {
            const youtubeInfo = await fetchYouTubeChannelInfo(accessToken);

            if (youtubeInfo) {
                youtubeChannelId = youtubeInfo.id;
                channelName = youtubeInfo.snippet.title;
                youtubeThumbnail = youtubeInfo.snippet.thumbnails.medium?.url ||
                    youtubeInfo.snippet.thumbnails.default?.url;

                // Build persona settings from YouTube channel info
                personaSettings = JSON.stringify({
                    channelName: youtubeInfo.snippet.title,
                    channelDescription: youtubeInfo.snippet.description || '',
                    subscriberCount: parseInt(youtubeInfo.statistics.subscriberCount || '0'),
                    videoCount: parseInt(youtubeInfo.statistics.videoCount || '0'),
                    customUrl: youtubeInfo.snippet.customUrl || '',
                });
            }
        }

        if (existingChannel) {
            // Update existing channel with latest YouTube info
            if (accessToken && youtubeChannelId) {
                await prisma.channel.update({
                    where: { id: existingChannel.id },
                    data: {
                        name: channelName,
                        youtubeChannelId,
                        youtubeThumbnail,
                        personaSettings
                    }
                });
            }

            return {
                success: true,
                channelId: existingChannel.id
            };
        }

        // Create new channel
        const newChannel = await prisma.channel.create({
            data: {
                userId,
                name: channelName,
                youtubeChannelId,
                youtubeThumbnail,
                personaSettings
            }
        });

        // Initialize default AI models for new user
        await initializeDefaultModels();

        return {
            success: true,
            channelId: newChannel.id
        };

    } catch (error: any) {
        console.error('Error auto-creating channel:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get channel info with YouTube statistics
 */
export async function getChannelWithYouTubeInfo(userId: string) {
    try {
        const channel = await prisma.channel.findFirst({
            where: { userId },
            include: {
                _count: {
                    select: {
                        projects: true
                    }
                }
            }
        });

        if (!channel) {
            return null;
        }

        // Parse persona settings to get YouTube stats
        let youtubeStats = null;
        try {
            const settings = JSON.parse(channel.personaSettings || '{}');
            if (settings.subscriberCount !== undefined) {
                youtubeStats = {
                    subscriberCount: settings.subscriberCount,
                    videoCount: settings.videoCount,
                    customUrl: settings.customUrl,
                    channelDescription: settings.channelDescription
                };
            }
        } catch (e) {
            // Ignore parse errors
        }

        return {
            ...channel,
            projectCount: channel._count.projects,
            youtubeStats
        };

    } catch (error) {
        console.error('Error getting channel info:', error);
        return null;
    }
}
