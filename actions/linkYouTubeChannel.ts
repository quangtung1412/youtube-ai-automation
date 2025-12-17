'use server'

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function linkYouTubeChannel(
    youtubeChannelId: string,
    youtubeTitle: string,
    youtubeThumbnail: string
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        // Check if YouTube channel already linked
        const existing = await prisma.channel.findUnique({
            where: { youtubeChannelId }
        });

        if (existing) {
            return {
                success: false,
                error: "YouTube channel đã được liên kết với channel khác"
            };
        }

        // Create new channel
        const channel = await prisma.channel.create({
            data: {
                name: youtubeTitle,
                userId: session.user.id,
                youtubeChannelId,
                youtubeThumbnail,
                personaSettings: JSON.stringify({}),
                defaultOutlinePrompt: ''
            }
        });

        revalidatePath('/dashboard/channels');

        return { success: true, channelId: channel.id };
    } catch (error: any) {
        console.error("Error linking YouTube channel:", error);
        return { success: false, error: error.message };
    }
}

export async function getYouTubeChannels() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized", channels: [] };
        }

        // @ts-ignore
        const accessToken = session.accessToken as string | undefined;
        if (!accessToken) {
            return { success: false, error: "No access token available", channels: [] };
        }

        const response = await fetch(
            'https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to fetch YouTube channels');
        }

        const data = await response.json();
        const channels = data.items?.map((item: any) => ({
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails.default.url,
            customUrl: item.snippet.customUrl,
        })) || [];

        return { success: true, channels };
    } catch (error: any) {
        console.error("Error getting YouTube channels:", error);
        return { success: false, error: error.message, channels: [] };
    }
}
