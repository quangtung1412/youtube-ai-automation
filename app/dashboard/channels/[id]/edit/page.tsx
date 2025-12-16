import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { getChannel } from "@/actions/updateChannel";
import ChannelEditForm from "./ChannelEditForm";

export default async function ChannelEditPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/api/auth/signin");
    }

    const { id } = await params;
    const channel = await getChannel(id);

    if (!channel || channel.userId !== session.user.id) {
        notFound();
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Chỉnh sửa Channel Settings
                </h1>
                <p className="text-gray-600">
                    Tùy chỉnh persona và prompt mặc định cho channel này
                </p>
            </div>

            <ChannelEditForm channel={channel} />
        </div>
    );
}
