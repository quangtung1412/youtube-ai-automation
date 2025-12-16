'use server'

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { unstable_noStore as noStore } from 'next/cache';

export type TaskType =
    | 'GENERATE_OUTLINE'
    | 'GENERATE_SCRIPTS'
    | 'GENERATE_VEO3_PROMPTS'
    | 'GENERATE_CHARACTER'
    | 'GENERATE_BACKGROUND'
    | 'GENERATE_ITEMS';

export type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export async function cancelTask(taskId: string) {
    try {
        const task = await prisma.task.update({
            where: { id: taskId },
            data: {
                status: 'CANCELLED',
                completedAt: new Date(),
                message: 'Cancelled by user'
            }
        });

        console.log(`[TaskManager] Task cancelled: ${taskId}`);

        const projectId = task.projectId;
        revalidatePath(`/dashboard/projects/${projectId}`);
        revalidatePath(`/dashboard/projects/${projectId}/tasks`);
        revalidatePath('/dashboard');

        return { success: true, task };
    } catch (error: any) {
        console.error('[TaskManager] Error cancelling task:', error);
        return { success: false, error: error.message };
    }
}

export async function createTask(projectId: string, type: TaskType) {
    try {
        const task = await prisma.task.create({
            data: {
                projectId,
                type,
                status: 'PENDING',
                progress: 0,
                message: 'Đang khởi tạo...'
            }
        });

        console.log(`[TaskManager] Task created: ${task.id} - ${type}`);

        revalidatePath(`/dashboard/projects/${projectId}`);
        revalidatePath(`/dashboard/projects/${projectId}/tasks`);
        revalidatePath('/dashboard');

        return { success: true, task };
    } catch (error: any) {
        console.error('[TaskManager] Error creating task:', error);
        return { success: false, error: error.message };
    }
}

export async function updateTask(
    taskId: string,
    data: {
        status?: TaskStatus;
        progress?: number;
        message?: string;
        result?: any;
        error?: string;
        startedAt?: Date;
        completedAt?: Date;
    }
) {
    try {
        const task = await prisma.task.update({
            where: { id: taskId },
            data: {
                ...data,
                result: data.result ? JSON.stringify(data.result) : undefined,
            }
        });

        console.log(`[TaskManager] Task updated: ${taskId} - Status: ${task.status}, Progress: ${task.progress}%`);

        // Get projectId for revalidation
        const projectId = task.projectId;
        revalidatePath(`/dashboard/projects/${projectId}`);
        revalidatePath(`/dashboard/projects/${projectId}/tasks`);
        revalidatePath('/dashboard');

        return { success: true, task };
    } catch (error: any) {
        console.error('[TaskManager] Error updating task:', error);
        return { success: false, error: error.message };
    }
}

export async function getProjectTasks(projectId: string) {
    noStore();
    try {
        const tasks = await prisma.task.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' }
        });

        return { success: true, tasks };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getRunningTasks(projectId: string) {
    noStore();
    try {
        const tasks = await prisma.task.findMany({
            where: {
                projectId,
                status: { in: ['PENDING', 'RUNNING'] }
            },
            orderBy: { createdAt: 'desc' }
        });

        return { success: true, tasks };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function hasRunningTask(projectId: string, taskType?: TaskType) {
    noStore();
    try {
        const where: any = {
            projectId,
            status: { in: ['PENDING', 'RUNNING'] }
        };

        if (taskType) {
            where.type = taskType;
        }

        const count = await prisma.task.count({ where });

        return { success: true, hasRunning: count > 0, count };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteTask(taskId: string) {
    try {
        const task = await prisma.task.delete({
            where: { id: taskId }
        });

        const projectId = task.projectId;
        revalidatePath(`/dashboard/projects/${projectId}`);
        revalidatePath(`/dashboard/projects/${projectId}/tasks`);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function clearCompletedTasks(projectId: string) {
    try {
        await prisma.task.deleteMany({
            where: {
                projectId,
                status: { in: ['COMPLETED', 'FAILED'] }
            }
        });

        revalidatePath(`/dashboard/projects/${projectId}`);
        revalidatePath(`/dashboard/projects/${projectId}/tasks`);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Get all tasks across all projects (for global monitoring)
export async function getAllTasks() {
    noStore();
    try {
        const tasks = await prisma.task.findMany({
            include: {
                project: {
                    select: {
                        id: true,
                        title: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit to most recent 100 tasks
        });

        console.log(`[TaskManager] getAllTasks: Found ${tasks.length} tasks`);
        return { success: true, tasks };
    } catch (error: any) {
        console.error('[TaskManager] Error getting all tasks:', error);
        return { success: false, error: error.message };
    }
}

// Get all running tasks across all projects
export async function getAllRunningTasks() {
    noStore();
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

        console.log(`[TaskManager] getAllRunningTasks: Found ${tasks.length} running tasks`);
        return { success: true, tasks, count: tasks.length };
    } catch (error: any) {
        console.error('[TaskManager] Error getting running tasks:', error);
        return { success: false, error: error.message };
    }
}

// Clear all completed tasks across all projects
export async function clearAllCompletedTasks() {
    try {
        const result = await prisma.task.deleteMany({
            where: {
                status: { in: ['COMPLETED', 'FAILED'] }
            }
        });

        revalidatePath('/dashboard');

        return { success: true, deletedCount: result.count };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
