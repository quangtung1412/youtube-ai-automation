import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export default async function ProjectsPage() {
    const session = await auth();
    
    // Get all projects for user's channels
    const projects = await prisma.project.findMany({
        where: {
            channel: {
                userId: session?.user?.id || ""
            }
        },
        include: {
            channel: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Projects
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Quản lý và tạo kịch bản video với AI
                    </p>
                </div>
                <Link
                    href="/dashboard/projects/new"
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-medium shadow-md hover:shadow-lg"
                >
                    ✨ Create New Project
                </Link>
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg shadow-md">
                    <svg
                        className="mx-auto h-16 w-16 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Chưa có project nào</h3>
                    <p className="mt-2 text-sm text-gray-500">
                        Bắt đầu bằng cách tạo project đầu tiên của bạn
                    </p>
                    <div className="mt-6">
                        <Link
                            href="/dashboard/projects/new"
                            className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            ✨ Create Project
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                    {projects.map((project) => {
                        let outline = null;
                        let scripts = null;
                        try {
                            if (project.outlineData) outline = JSON.parse(project.outlineData);
                            if (project.fullScript) scripts = JSON.parse(project.fullScript);
                        } catch {}

                        const totalScenes = scripts ? scripts.reduce((sum: number, ch: any) => sum + ch.scenes.length, 0) : 0;

                        return (
                            <Link
                                key={project.id}
                                href={`/dashboard/projects/${project.id}`}
                                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all p-6 border border-gray-200 hover:border-indigo-300"
                            >
                                {/* Status Badge */}
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                        project.status === 'DRAFT' ? 'bg-gray-200 text-gray-700' :
                                        project.status === 'OUTLINE_GENERATED' ? 'bg-blue-200 text-blue-700' :
                                        project.status === 'SCRIPT_GENERATED' ? 'bg-green-200 text-green-700' :
                                        'bg-purple-200 text-purple-700'
                                    }`}>
                                        {project.status.replace(/_/g, ' ')}
                                    </span>
                                </div>

                                {/* Project Title */}
                                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                                    {project.title}
                                </h3>

                                {/* Channel Info */}
                                <p className="text-sm text-gray-600 mb-4">
                                    📺 {project.channel.name}
                                </p>

                                {/* Stats */}
                                <div className="flex items-center space-x-4 text-xs text-gray-500 mb-4">
                                    {outline && (
                                        <span className="flex items-center">
                                            📑 {outline.chapters?.length || 0} chapters
                                        </span>
                                    )}
                                    {totalScenes > 0 && (
                                        <span className="flex items-center">
                                            🎬 {totalScenes} scenes
                                        </span>
                                    )}
                                </div>

                                {/* Content Preview */}
                                <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                                    {project.inputContent.substring(0, 150)}...
                                </p>

                                {/* Created Date */}
                                <p className="text-xs text-gray-400">
                                    Created {new Date(project.createdAt).toLocaleDateString('vi-VN')}
                                </p>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
