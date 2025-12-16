import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getChannelWithYouTubeInfo } from "@/actions/autoCreateChannel";
import Image from "next/image";

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    // Get user's channel with YouTube info
    const channelInfo = await getChannelWithYouTubeInfo(session.user.id);

    // Get recent projects
    const recentProjects = await prisma.project.findMany({
        where: {
            channel: {
                userId: session?.user?.id || ""
            }
        },
        include: {
            channel: true
        },
        orderBy: {
            updatedAt: 'desc'
        },
        take: 6
    });

    // Get statistics
    const stats = await prisma.project.groupBy({
        by: ['status'],
        where: {
            channel: {
                userId: session?.user?.id || ""
            }
        },
        _count: true
    });

    const totalProjects = stats.reduce((sum, s) => sum + s._count, 0);
    const completedProjects = stats.find(s => s.status === 'SCRIPT_GENERATED')?._count || 0;

    // Check if user has API key configured
    const systemConfig = await prisma.systemConfig.findUnique({
        where: { id: "global_config" }
    });
    const hasApiKey = !!(systemConfig as any)?.apiKey;

    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
            {/* API Key Warning Banner */}
            {!hasApiKey && (
                <div className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-400 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-red-900 mb-1">⚠️ API Key Required</h3>
                            <p className="text-sm text-red-800 mb-3">
                                You need to configure your Google API Key before creating projects. The platform requires your own API key to function.
                            </p>
                            <Link
                                href="/dashboard/settings"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Go to Settings to Add API Key
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Welcome Section with YouTube Channel Info */}
            <div className="mb-8">
                <div className="flex items-start gap-4">
                    {/* YouTube Channel Avatar */}
                    {channelInfo?.youtubeThumbnail && (
                        <div className="flex-shrink-0">
                            <Image
                                src={channelInfo.youtubeThumbnail}
                                alt={channelInfo.name}
                                width={80}
                                height={80}
                                className="rounded-full border-4 border-indigo-500 shadow-lg"
                            />
                        </div>
                    )}

                    <div className="flex-1">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">
                            👋 Chào mừng, {session?.user?.name?.split(' ')[0] || 'User'}!
                        </h1>

                        {/* YouTube Channel Info */}
                        {channelInfo?.youtubeChannelId && (
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-red-600">📺</span>
                                    <span className="font-semibold">{channelInfo.name}</span>
                                </div>

                                {channelInfo.youtubeStats && (
                                    <>
                                        <div className="flex items-center gap-1">
                                            <span>👥</span>
                                            <span>{channelInfo.youtubeStats.subscriberCount.toLocaleString()} subscribers</span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <span>🎬</span>
                                            <span>{channelInfo.youtubeStats.videoCount.toLocaleString()} videos</span>
                                        </div>

                                        {channelInfo.youtubeStats.customUrl && (
                                            <a
                                                href={`https://youtube.com/${channelInfo.youtubeStats.customUrl}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                            >
                                                <span>🔗</span>
                                                <span>{channelInfo.youtubeStats.customUrl}</span>
                                            </a>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        <p className="text-gray-600">
                            Quản lý dự án video và tạo kịch bản tự động với AI
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-indigo-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Tổng Projects</p>
                            <p className="text-3xl font-bold text-gray-900">{totalProjects}</p>
                        </div>
                        <div className="text-4xl">📁</div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Hoàn thành</p>
                            <p className="text-3xl font-bold text-gray-900">{completedProjects}</p>
                        </div>
                        <div className="text-4xl">✅</div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Đang xử lý</p>
                            <p className="text-3xl font-bold text-gray-900">
                                {stats.find(s => s.status === 'OUTLINE_GENERATED')?._count || 0}
                            </p>
                        </div>
                        <div className="text-4xl">⚙️</div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Draft</p>
                            <p className="text-3xl font-bold text-gray-900">
                                {stats.find(s => s.status === 'DRAFT')?._count || 0}
                            </p>
                        </div>
                        <div className="text-4xl">📝</div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Link
                    href="/dashboard/projects/new"
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-md hover:shadow-xl transition-all p-6"
                >
                    <div className="text-4xl mb-3">✨</div>
                    <h3 className="text-xl font-semibold mb-2">Tạo Project Mới</h3>
                    <p className="text-indigo-100 text-sm">
                        Bắt đầu tạo kịch bản video mới với AI
                    </p>
                </Link>

                <Link
                    href="/dashboard/channels"
                    className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg shadow-md hover:shadow-xl transition-all p-6"
                >
                    <div className="text-4xl mb-3">📺</div>
                    <h3 className="text-xl font-semibold mb-2">Quản Lý Channels</h3>
                    <p className="text-blue-100 text-sm">
                        Cấu hình persona và style cho channels
                    </p>
                </Link>

                <Link
                    href="/dashboard/settings"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow-md hover:shadow-xl transition-all p-6"
                >
                    <div className="text-4xl mb-3">⚙️</div>
                    <h3 className="text-xl font-semibold mb-2">Settings</h3>
                    <p className="text-green-100 text-sm">
                        Cấu hình AI model và VEO3 templates
                    </p>
                </Link>
            </div>

            {/* Recent Projects */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                        📋 Projects Gần Đây
                    </h2>
                    <Link
                        href="/dashboard/projects"
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                        Xem tất cả →
                    </Link>
                </div>

                {recentProjects.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">📄</div>
                        <p className="text-gray-600 mb-4">Chưa có project nào</p>
                        <Link
                            href="/dashboard/projects/new"
                            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-medium"
                        >
                            Tạo Project Đầu Tiên
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {recentProjects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/dashboard/projects/${project.id}`}
                                className="block p-4 border border-gray-200 rounded-lg hover:border-indigo-400 hover:shadow-md transition"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                            {project.title}
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-2">
                                            📺 {project.channel.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Cập nhật: {new Date(project.updatedAt).toLocaleDateString('vi-VN')}
                                        </p>
                                    </div>
                                    <div className="ml-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${project.status === 'DRAFT' ? 'bg-gray-200 text-gray-700' :
                                            project.status === 'OUTLINE_GENERATED' ? 'bg-blue-200 text-blue-700' :
                                                project.status === 'SCRIPT_GENERATED' ? 'bg-green-200 text-green-700' :
                                                    'bg-purple-200 text-purple-700'
                                            }`}>
                                            {project.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

