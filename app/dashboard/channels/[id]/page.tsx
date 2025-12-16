import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getChannel } from "@/actions/channels";
import ChannelDetailClient from "./ChannelDetailClient";

export default async function ChannelDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    const { id } = await params;
    const channel = await getChannel(id);

    if (!channel) {
        notFound();
    }

    // Check if user owns this channel
    if (channel.userId !== session?.user?.id) {
        notFound();
    }

    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
            <div className="mb-6">
                <Link
                    href="/dashboard/channels"
                    className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Channels
                </Link>
            </div>

            <ChannelDetailClient channel={channel} />
        </div>
    );
}
