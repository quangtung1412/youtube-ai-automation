import { NextResponse } from 'next/server';
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/tasks/running - Get running tasks count
export async function GET() {
    try {
        const tasks = await prisma.task.findMany({
            where: {
                status: { in: ['PENDING', 'RUNNING'] }
            },
            include: {
                project: {
                    select: {
                        id: true,
                        title: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            tasks,
            count: tasks.length
        });
    } catch (error: any) {
        console.error('[API] Error getting running tasks:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
