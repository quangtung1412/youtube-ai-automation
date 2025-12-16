import { getChannels } from "@/actions/channels";
import { auth } from "@/auth";
import ProjectForm from "./ProjectForm";

export default async function NewProjectPage() {
    const session = await auth();
    const channels = await getChannels(session?.user?.id || "");

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Create New Project
                </h1>
                <p className="text-gray-600">
                    Input your content and let AI generate a complete video script
                </p>
            </div>

            {channels.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                        No channels available
                    </h3>
                    <p className="text-yellow-800 mb-4">
                        You need to create a channel first before creating a project.
                    </p>
                    <a
                        href="/dashboard/channels/new"
                        className="inline-block bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition"
                    >
                        Create Channel
                    </a>
                </div>
            ) : (
                <ProjectForm channels={channels} />
            )}
        </div>
    );
}
