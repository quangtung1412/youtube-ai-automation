'use client'

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProjectTasks, clearCompletedTasks, deleteTask } from "@/actions/taskManager";

interface Task {
    id: string;
    type: string;
    status: string;
    progress: number;
    message: string;
    result: string | null;
    error: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
}

const taskTypeLabels: Record<string, string> = {
    'GENERATE_OUTLINE': '🎯 Tạo Outline',
    'GENERATE_SCRIPTS': '🎬 Tạo Scripts',
    'GENERATE_VEO3_PROMPTS': '🤖 Tạo VEO3 Prompts',
    'GENERATE_CHARACTER': '👤 Tạo Character Prompt',
    'GENERATE_BACKGROUND': '🌄 Tạo Background Prompt',
    'GENERATE_ITEMS': '📦 Tạo Item Prompts',
};

const statusColors: Record<string, string> = {
    'PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'RUNNING': 'bg-blue-100 text-blue-800 border-blue-300',
    'COMPLETED': 'bg-green-100 text-green-800 border-green-300',
    'FAILED': 'bg-red-100 text-red-800 border-red-300',
};

const statusIcons: Record<string, string> = {
    'PENDING': '⏳',
    'RUNNING': '⚡',
    'COMPLETED': '✅',
    'FAILED': '❌',
};

export default function TaskMonitorPage({
    projectId,
    projectTitle,
}: {
    projectId: string;
    projectTitle: string;
}) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);

    const loadTasks = async () => {
        const result = await getProjectTasks(projectId);
        if (result.success && result.tasks) {
            setTasks(result.tasks as Task[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadTasks();

        // Auto-refresh every 2 seconds if there are running tasks
        const interval = setInterval(() => {
            const hasRunning = tasks.some(t => t.status === 'PENDING' || t.status === 'RUNNING');
            if (hasRunning) {
                loadTasks();
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [projectId, tasks]);

    const handleClearCompleted = async () => {
        if (!confirm('Xóa tất cả tasks đã hoàn thành?')) return;

        setClearing(true);
        const result = await clearCompletedTasks(projectId);
        if (result.success) {
            loadTasks();
        }
        setClearing(false);
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Xóa task này?')) return;

        const result = await deleteTask(taskId);
        if (result.success) {
            loadTasks();
        }
    };

    const runningTasks = tasks.filter(t => t.status === 'PENDING' || t.status === 'RUNNING');
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
    const failedTasks = tasks.filter(t => t.status === 'FAILED');

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto py-8 px-4">
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            {/* Breadcrumb */}
            <div className="mb-4 text-sm">
                <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800">
                    Dashboard
                </Link>
                <span className="mx-2 text-gray-400">/</span>
                <Link href="/dashboard/projects" className="text-indigo-600 hover:text-indigo-800">
                    Projects
                </Link>
                <span className="mx-2 text-gray-400">/</span>
                <Link href={`/dashboard/projects/${projectId}`} className="text-indigo-600 hover:text-indigo-800">
                    {projectTitle}
                </Link>
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-700">Tasks</span>
            </div>

            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            📊 Task Monitor
                        </h1>
                        <p className="text-gray-600">
                            Theo dõi trạng thái các tác vụ của project
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href={`/dashboard/projects/${projectId}`}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium shadow-sm transition"
                        >
                            ← Về Project
                        </Link>
                        <button
                            onClick={handleClearCompleted}
                            disabled={clearing || (completedTasks.length === 0 && failedTasks.length === 0)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition"
                        >
                            {clearing ? '⏳ Đang xóa...' : '🗑️ Xóa Hoàn Thành'}
                        </button>
                        <button
                            onClick={loadTasks}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition"
                        >
                            🔄 Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-4">
                    <div className="text-sm text-gray-600 mb-1">Tổng Tasks</div>
                    <div className="text-3xl font-bold text-gray-900">{tasks.length}</div>
                </div>
                <div className="bg-blue-50 rounded-lg shadow-sm border-2 border-blue-300 p-4">
                    <div className="text-sm text-blue-700 mb-1">Đang Chạy</div>
                    <div className="text-3xl font-bold text-blue-900">{runningTasks.length}</div>
                </div>
                <div className="bg-green-50 rounded-lg shadow-sm border-2 border-green-300 p-4">
                    <div className="text-sm text-green-700 mb-1">Hoàn Thành</div>
                    <div className="text-3xl font-bold text-green-900">{completedTasks.length}</div>
                </div>
                <div className="bg-red-50 rounded-lg shadow-sm border-2 border-red-300 p-4">
                    <div className="text-sm text-red-700 mb-1">Thất Bại</div>
                    <div className="text-3xl font-bold text-red-900">{failedTasks.length}</div>
                </div>
            </div>

            {/* Tasks List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Danh Sách Tasks</h2>

                    {tasks.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📋</div>
                            <p className="text-gray-600">Chưa có tasks nào</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className={`border-2 rounded-lg p-4 transition ${statusColors[task.status]}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-2xl">{statusIcons[task.status]}</span>
                                                <div>
                                                    <h3 className="font-semibold text-lg">
                                                        {taskTypeLabels[task.type] || task.type}
                                                    </h3>
                                                    <p className="text-sm opacity-75">
                                                        {task.message}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            {(task.status === 'RUNNING' || task.status === 'PENDING') && (
                                                <div className="mt-3">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-medium">Progress</span>
                                                        <span className="text-xs font-medium">{task.progress}%</span>
                                                    </div>
                                                    <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                                                        <div
                                                            className="bg-current h-2 rounded-full transition-all duration-300"
                                                            style={{ width: `${task.progress}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Error Message */}
                                            {task.error && (
                                                <div className="mt-3 p-2 bg-white bg-opacity-50 rounded text-sm">
                                                    <strong>Error:</strong> {task.error}
                                                </div>
                                            )}

                                            {/* Timestamps */}
                                            <div className="mt-3 flex gap-4 text-xs opacity-75">
                                                <span>Tạo: {new Date(task.createdAt).toLocaleString('vi-VN')}</span>
                                                {task.startedAt && (
                                                    <span>Bắt đầu: {new Date(task.startedAt).toLocaleString('vi-VN')}</span>
                                                )}
                                                {task.completedAt && (
                                                    <span>Hoàn thành: {new Date(task.completedAt).toLocaleString('vi-VN')}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            disabled={task.status === 'RUNNING'}
                                            className="ml-4 px-3 py-1 bg-white bg-opacity-50 hover:bg-opacity-75 rounded text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
