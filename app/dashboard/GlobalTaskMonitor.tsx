'use client'

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import useSWR from 'swr';
import { getAllTasks, clearAllCompletedTasks, deleteTask } from "@/actions/taskManager";

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
    projectId: string;
    project: {
        id: string;
        title: string;
    };
}

const taskTypeLabels: Record<string, string> = {
    'GENERATE_OUTLINE': '🎯 Outline',
    'GENERATE_SCRIPTS': '🎬 Scripts',
    'GENERATE_VEO3_PROMPTS': '🤖 VEO3',
    'GENERATE_CHARACTER': '👤 Character',
    'GENERATE_BACKGROUND': '🌄 Background',
    'GENERATE_ITEMS': '📦 Items',
};

export default function GlobalTaskMonitor({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [clearing, setClearing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'running' | 'completed' | 'failed'>('all');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const previousTasksLengthRef = useRef(0);

    // Fetcher function for SWR - using API route to avoid blocking
    const tasksFetcher = async () => {
        console.log('[GlobalTaskMonitor] Fetching tasks via API...');
        const response = await fetch('/api/tasks', {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });
        const result = await response.json();
        console.log('[GlobalTaskMonitor] Tasks loaded:', result.tasks?.length || 0);
        if (result.success && result.tasks) {
            return result.tasks as Task[];
        }
        return [];
    };

    // SWR with aggressive refresh for real-time updates
    const { data: tasks = [], error, mutate, isValidating } = useSWR(
        isOpen ? 'global-tasks' : null, // Only fetch when panel is open
        tasksFetcher,
        {
            refreshInterval: 300, // Refresh every 300ms for real-time feeling
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 0, // Disable deduping for real-time
            focusThrottleInterval: 0, // No throttling
            errorRetryInterval: 300, // Retry quickly on error
            shouldRetryOnError: true,
            keepPreviousData: true, // Keep showing old data while fetching new
        }
    );

    // Auto-scroll when tasks change or new tasks added
    useEffect(() => {
        if (autoScroll && scrollRef.current && tasks.length > 0) {
            // Check if new tasks were added
            const hasNewTasks = tasks.length > previousTasksLengthRef.current;

            // Always scroll to bottom when panel opens or new tasks are added
            if (hasNewTasks || isOpen) {
                setTimeout(() => {
                    if (scrollRef.current) {
                        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                    }
                }, 50);
            }

            previousTasksLengthRef.current = tasks.length;
        }
    }, [tasks, autoScroll, isOpen]);

    const handleClearCompleted = async () => {
        if (!confirm('Xóa tất cả tasks đã hoàn thành và thất bại?')) return;

        setClearing(true);
        const result = await clearAllCompletedTasks();
        if (result.success) {
            mutate(); // Revalidate immediately
        }
        setClearing(false);
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Xóa task này?')) return;

        const result = await deleteTask(taskId);
        if (result.success) {
            mutate(); // Revalidate immediately
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'all') return true;
        if (filter === 'running') return task.status === 'PENDING' || task.status === 'RUNNING';
        if (filter === 'completed') return task.status === 'COMPLETED';
        if (filter === 'failed') return task.status === 'FAILED';
        return true;
    });

    const runningTasks = tasks.filter(t => t.status === 'PENDING' || t.status === 'RUNNING');
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
    const failedTasks = tasks.filter(t => t.status === 'FAILED');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-2xl flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                                💻 Global Task Monitor
                            </h1>
                            <p className="text-indigo-100 text-sm">
                                Theo dõi tất cả các tác vụ đang chạy trên server
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition"
                            title="Đóng"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-3 mt-4">
                        <div className="bg-white bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
                            <div className="text-xs text-indigo-100 mb-1">Tổng</div>
                            <div className="text-2xl font-bold">{tasks.length}</div>
                        </div>
                        <div className="bg-white bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
                            <div className="text-xs text-indigo-100 mb-1">Đang Chạy</div>
                            <div className="text-2xl font-bold flex items-center gap-2">
                                {runningTasks.length}
                                {isValidating && <span className="text-xs animate-pulse">●</span>}
                            </div>
                        </div>
                        <div className="bg-white bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
                            <div className="text-xs text-indigo-100 mb-1">Hoàn Thành</div>
                            <div className="text-2xl font-bold">{completedTasks.length}</div>
                        </div>
                        <div className="bg-white bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
                            <div className="text-xs text-indigo-100 mb-1">Thất Bại</div>
                            <div className="text-2xl font-bold">{failedTasks.length}</div>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${filter === 'all'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Tất cả ({tasks.length})
                        </button>
                        <button
                            onClick={() => setFilter('running')}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${filter === 'running'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            ⚡ Đang chạy ({runningTasks.length})
                        </button>
                        <button
                            onClick={() => setFilter('completed')}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${filter === 'completed'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            ✅ Hoàn thành ({completedTasks.length})
                        </button>
                        <button
                            onClick={() => setFilter('failed')}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${filter === 'failed'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            ❌ Thất bại ({failedTasks.length})
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => mutate()}
                            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition"
                        >
                            🔄 Refresh
                        </button>
                        <button
                            onClick={handleClearCompleted}
                            disabled={clearing || (completedTasks.length === 0 && failedTasks.length === 0)}
                            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition"
                        >
                            {clearing ? '⏳ Đang xóa...' : '🗑️ Xóa hoàn thành'}
                        </button>
                    </div>
                </div>

                {/* Terminal-Style Tasks List */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 bg-gray-900 font-mono text-sm"
                >
                    {filteredTasks.length === 0 ? (
                        <div className="text-green-400">
                            <div className="mb-2">$ waiting for tasks...</div>
                            <div className="text-gray-500">No active processes</div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="border-l-2 border-gray-700 pl-3 py-2 hover:border-indigo-500 transition"
                                >
                                    {/* Terminal Log Entry Header */}
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-gray-500 text-xs">
                                            [{new Date(task.createdAt).toLocaleTimeString('vi-VN')}]
                                        </span>
                                        <span className={`text-xs font-bold ${task.status === 'RUNNING' ? 'text-yellow-400 animate-pulse' :
                                            task.status === 'COMPLETED' ? 'text-green-400' :
                                                task.status === 'FAILED' ? 'text-red-400' :
                                                    'text-gray-400'
                                            }`}>
                                            {task.status === 'RUNNING' ? '● RUNNING' :
                                                task.status === 'COMPLETED' ? '✓ COMPLETED' :
                                                    task.status === 'FAILED' ? '✗ FAILED' :
                                                        '○ PENDING'}
                                        </span>
                                        <Link
                                            href={`/dashboard/projects/${task.project.id}`}
                                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                                            onClick={onClose}
                                        >
                                            {task.project.title}
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            disabled={task.status === 'RUNNING'}
                                            className="ml-auto text-xs text-gray-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                            title="Xóa task"
                                        >
                                            [delete]
                                        </button>
                                    </div>

                                    {/* Task Type and Message */}
                                    <div className="text-gray-300 mb-1">
                                        <span className="text-cyan-400">$ {taskTypeLabels[task.type] || task.type}</span>
                                    </div>
                                    <div className="text-gray-400 text-xs pl-2 mb-1">
                                        → {task.message}
                                    </div>

                                    {/* Progress Bar (Terminal Style) */}
                                    {(task.status === 'RUNNING' || task.status === 'PENDING') && (
                                        <div className="text-xs text-gray-400 pl-2">
                                            <span className="text-yellow-400">[{task.progress}%]</span> {'█'.repeat(Math.floor(task.progress / 5))}{'░'.repeat(20 - Math.floor(task.progress / 5))}
                                        </div>
                                    )}

                                    {/* Error Message */}
                                    {task.error && (
                                        <div className="pl-2 mt-1 text-xs text-red-400">
                                            ERROR: {task.error}
                                        </div>
                                    )}

                                    {/* Completion Time */}
                                    {task.completedAt && (
                                        <div className="text-xs text-gray-500 pl-2 mt-1">
                                            completed at {new Date(task.completedAt).toLocaleTimeString('vi-VN')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
