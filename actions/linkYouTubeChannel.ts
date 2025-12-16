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
        const response = await fetch('/api/youtube/channels');
        if (!response.ok) {
            throw new Error('Failed to fetch YouTube channels');
        }
        const data = await response.json();
        return { success: true, channels: data.channels };
    } catch (error: any) {
        console.error("Error getting YouTube channels:", error);
        return { success: false, error: error.message, channels: [] };
    }
}
