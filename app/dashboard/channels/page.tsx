import Link from "next/link";
import { auth } from "@/auth";
import { getChannels } from "@/actions/channels";

export default async function ChannelsPage() {
    const session = await auth();
    const channels = await getChannels(session?.user?.id || "");

    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    Your Channels
                </h1>
                <Link
                    href="/dashboard/channels/new"
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                    Create Channel
                </Link>
            </div>

            {channels.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                    <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                        />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No channels</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Get started by creating a new channel.
                    </p>
                    <div className="mt-6">
                        <Link
                            href="/dashboard/channels/new"
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            Create Channel
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {channels.map((channel) => (
                        <Link
                            key={channel.id}
                            href={`/dashboard/channels/${channel.id}`}
                            className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                        >
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {channel.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                                {channel._count?.projects || 0} projects
                            </p>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
