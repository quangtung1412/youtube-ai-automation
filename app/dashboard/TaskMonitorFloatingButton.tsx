'use client'

import { useState } from "react";
import useSWR from 'swr';
import { getAllRunningTasks } from "@/actions/taskManager";
import GlobalTaskMonitor from "./GlobalTaskMonitor";

export default function TaskMonitorFloatingButton() {
    const [isOpen, setIsOpen] = useState(false);

    // Fetcher function for running tasks - using API route to avoid blocking
    const runningTasksFetcher = async () => {
        const response = await fetch('/api/tasks/running', {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });
        const result = await response.json();
        console.log('[FloatingButton] Running tasks:', result.count || 0);
        if (result.success) {
            return result.count || 0;
        }
        return 0;
    };

    // SWR with aggressive refresh for real-time badge updates
    const { data: runningCount = 0 } = useSWR(
        'running-tasks-count',
        runningTasksFetcher,
        {
            refreshInterval: 300, // Refresh every 300ms
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 0,
            focusThrottleInterval: 0,
            errorRetryInterval: 300,
            shouldRetryOnError: true,
            keepPreviousData: true,
        }
    );

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 group"
                title="Task Monitor - Theo dõi tiến trình"
            >
                {/* Main button */}
                <div className="relative bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all hover:scale-110">
                    {/* Computer Icon */}
                    <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                    </svg>

                    {/* Badge with running tasks count */}
                    {runningCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse shadow-md">
                            {runningCount}
                        </span>
                    )}

                    {/* Pulse animation when tasks are running */}
                    {runningCount > 0 && (
                        <>
                            <span className="absolute inset-0 rounded-full bg-indigo-600 animate-ping opacity-75"></span>
                            <span className="absolute inset-0 rounded-full bg-indigo-600 animate-pulse"></span>
                        </>
                    )}
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                        {runningCount > 0 ? (
                            <>
                                ⚡ {runningCount} task đang chạy
                            </>
                        ) : (
                            <>
                                💻 Task Monitor
                            </>
                        )}
                        <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                    </div>
                </div>
            </button>

            {/* Task Monitor Panel */}
            <GlobalTaskMonitor
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    );
}
