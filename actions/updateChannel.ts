'use server'

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateChannel(
    channelId: string,
    data: {
        name?: string;
        personaSettings?: string;
        defaultOutlinePrompt?: string;
    }
) {
    try {
        await prisma.channel.update({
            where: { id: channelId },
            data
        });

        revalidatePath('/dashboard/channels/[id]/edit', 'page');
        revalidatePath('/dashboard/channels', 'page');

        return { success: true };
    } catch (error: any) {
        console.error("Error updating channel:", error);
        return { success: false, error: error.message };
    }
}

export async function getChannel(channelId: string) {
    try {
        const channel = await prisma.channel.findUnique({
            where: { id: channelId },
            include: {
                _count: {
                    select: { projects: true }
                }
            }
        });

        return channel;
    } catch (error: any) {
        console.error("Error getting channel:", error);
        return null;
    }
}
