import ChannelForm from "./ChannelForm";
import { SessionProvider } from "next-auth/react";

export default function NewChannelPage() {
    return (
        <SessionProvider>
            <div className="max-w-3xl mx-auto py-8 px-4">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Create New Channel
                    </h1>
                    <p className="text-gray-600">
                        Configure your channel persona and style settings
                    </p>
                </div>

                <ChannelForm />
            </div>
        </SessionProvider>
    );
}