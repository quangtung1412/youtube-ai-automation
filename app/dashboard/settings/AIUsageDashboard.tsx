'use client'

import { useState, useEffect } from "react";
import { getAIUsageStats, getAPICallLogs } from "@/actions/aiUsageTracking";

export default function AIUsageDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({
        operation: '',
        status: '',
        page: 1
    });

    useEffect(() => {
        loadData();
    }, [filter]);

    const loadData = async () => {
        setLoading(true);

        const [statsResult, logsResult] = await Promise.all([
            getAIUsageStats({}),
            getAPICallLogs({
                page: filter.page,
                operation: filter.operation || undefined,
                status: filter.status || undefined
            })
        ]);

        setStats(statsResult);
        setLogs(logsResult.calls);
        setLoading(false);
    };

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">📊 AI Usage Dashboard</h1>
                <p className="text-gray-600 mt-2">
                    Monitor all AI API calls, token usage, and costs
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg border-2 border-indigo-200 p-6 shadow-sm">
                    <div className="text-sm text-gray-600 mb-1">Total API Calls</div>
                    <div className="text-3xl font-bold text-indigo-600">
                        {stats?.totalCalls?.toLocaleString() || 0}
                    </div>
                </div>

                <div className="bg-white rounded-lg border-2 border-purple-200 p-6 shadow-sm">
                    <div className="text-sm text-gray-600 mb-1">Total Tokens</div>
                    <div className="text-3xl font-bold text-purple-600">
                        {(stats?.totalTokens / 1000000).toFixed(2)}M
                    </div>
                </div>

                <div className="bg-white rounded-lg border-2 border-green-200 p-6 shadow-sm">
                    <div className="text-sm text-gray-600 mb-1">Est. Cost</div>
                    <div className="text-3xl font-bold text-green-600">
                        ${stats?.totalCost?.toFixed(4) || 0}
                    </div>
                </div>

                <div className="bg-white rounded-lg border-2 border-blue-200 p-6 shadow-sm">
                    <div className="text-sm text-gray-600 mb-1">Avg Duration</div>
                    <div className="text-3xl font-bold text-blue-600">
                        {(stats?.avgDuration / 1000).toFixed(1)}s
                    </div>
                </div>
            </div>

            {/* Usage by Model */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">📈 Usage by Model</h2>
                <div className="space-y-3">
                    {stats?.byModel && Object.entries(stats.byModel).map(([model, data]: [string, any]) => (
                        <div key={model} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                                <div className="font-semibold text-gray-900">{model}</div>
                                <div className="text-sm text-gray-600 mt-1">
                                    {data.calls} calls • {(data.tokens / 1000).toFixed(0)}K tokens
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-green-600">
                                    ${data.cost.toFixed(4)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Usage by Operation */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">🔧 Usage by Operation</h2>
                <div className="grid grid-cols-2 gap-4">
                    {stats?.byOperation && Object.entries(stats.byOperation).map(([operation, data]: [string, any]) => (
                        <div key={operation} className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                            <div className="font-semibold text-gray-900 mb-2">{operation}</div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                    <div className="text-gray-600">Calls</div>
                                    <div className="font-semibold text-indigo-600">{data.calls}</div>
                                </div>
                                <div>
                                    <div className="text-gray-600">Tokens</div>
                                    <div className="font-semibold text-purple-600">
                                        {(data.tokens / 1000).toFixed(0)}K
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-600">Cost</div>
                                    <div className="font-semibold text-green-600">
                                        ${data.cost.toFixed(4)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent API Calls */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">📝 Recent API Calls</h2>
                    <button
                        onClick={loadData}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm hover:bg-indigo-200"
                    >
                        🔄 Refresh
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-4">
                    <select
                        value={filter.operation}
                        onChange={e => setFilter({ ...filter, operation: e.target.value, page: 1 })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                    >
                        <option value="">All Operations</option>
                        <option value="GENERATE_OUTLINE">Generate Outline</option>
                        <option value="GENERATE_SCRIPT">Generate Script</option>
                        <option value="GENERATE_VEO3_PROMPTS">Generate VEO3</option>
                        <option value="GENERATE_IMAGE_PROMPTS">Generate Images</option>
                    </select>

                    <select
                        value={filter.status}
                        onChange={e => setFilter({ ...filter, status: e.target.value, page: 1 })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                    >
                        <option value="">All Status</option>
                        <option value="SUCCESS">Success</option>
                        <option value="FAILED">Failed</option>
                        <option value="PENDING">Pending</option>
                    </select>
                </div>

                {/* Logs Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Time</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Operation</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Model</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">Tokens</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">Duration</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">Cost</th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-600">
                                        {new Date(log.startedAt).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-medium text-gray-900">{log.operation}</span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {log.model?.displayName || 'N/A'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="text-gray-900 font-medium">
                                            {log.totalTokens.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {log.inputTokens}↑ {log.outputTokens}↓
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600">
                                        {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-green-600">
                                        ${log.estimatedCost?.toFixed(4) || '0.0000'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${log.status === 'SUCCESS'
                                                ? 'bg-green-100 text-green-700'
                                                : log.status === 'FAILED'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {log.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {logs.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No API calls found
                    </div>
                )}
            </div>
        </div>
    );
}
