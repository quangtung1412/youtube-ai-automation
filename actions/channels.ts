'use server'

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createChannel(data: {
    name: string;
    userId: string;
    personaSettings: string;
}) {
    try {
        const channel = await prisma.channel.create({
            data: {
                name: data.name,
                userId: data.userId,
                personaSettings: data.personaSettings,
            }
        });

        revalidatePath('/dashboard/channels');
        return { success: true, channel };
    } catch (error) {
        console.error("Error creating channel:", error);
        return { success: false, error: "Failed to create channel" };
    }
}

export async function updateChannel(channelId: string, data: {
    name?: string;
    personaSettings?: string;
}) {
    try {
        const channel = await prisma.channel.update({
            where: { id: channelId },
            data
        });

        revalidatePath('/dashboard/channels');
        return { success: true, channel };
    } catch (error) {
        console.error("Error updating channel:", error);
        return { success: false, error: "Failed to update channel" };
    }
}

export async function getChannels(userId: string) {
    try {
        const channels = await prisma.channel.findMany({
            where: { userId },
            include: {
                _count: {
                    select: { projects: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return channels;
    } catch (error) {
        console.error("Error getting channels:", error);
        return [];
    }
}

export async function getChannel(channelId: string) {
    try {
        const channel = await prisma.channel.findUnique({
            where: { id: channelId },
            include: {
                projects: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        return channel;
    } catch (error) {
        console.error("Error getting channel:", error);
        return null;
    }
}

export async function deleteChannel(channelId: string) {
    try {
        await prisma.channel.delete({
            where: { id: channelId }
        });

        revalidatePath('/dashboard/channels');
        return { success: true };
    } catch (error) {
        console.error("Error deleting channel:", error);
        return { success: false, error: "Failed to delete channel" };
    }
}
