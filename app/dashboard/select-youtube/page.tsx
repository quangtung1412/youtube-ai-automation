import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import YouTubeChannelSelector from "./YouTubeChannelSelector";

export default async function SelectYouTubePage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/api/auth/signin");
    }

    // Check if user already has channels
    const existingChannels = await prisma.channel.findMany({
        where: { userId: session.user.id }
    });

    // If user already has channels, redirect to dashboard
    if (existingChannels.length > 0) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        🎬 Chào mừng đến với AI Video Platform!
                    </h1>
                    <p className="text-lg text-gray-700">
                        Hãy liên kết với YouTube Channel của bạn để bắt đầu
                    </p>
                </div>

                <YouTubeChannelSelector />

                <div className="text-center mt-6">
                    <a
                        href="/dashboard/channels/new"
                        className="text-indigo-600 hover:text-indigo-800 text-sm"
                    >
                        Hoặc tạo channel thủ công →
                    </a>
                </div>
            </div>
        </div>
    );
}
