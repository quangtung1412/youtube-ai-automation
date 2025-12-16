import { NextResponse } from 'next/server';
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/tasks - Get all tasks for current user
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const tasks = await prisma.task.findMany({
            where: {
                project: {
                    channel: {
                        userId: session.user.id
                    }
                }
            },
            include: {
                project: {
                    select: {
                        id: true,
                        title: true,
                    }
                }
            },
            orderBy: { createdAt: 'asc' }, // Show oldest first, newest at bottom
            take: 100
        });

        return NextResponse.json({ success: true, tasks });
    } catch (error: any) {
        console.error('[API] Error getting tasks:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
