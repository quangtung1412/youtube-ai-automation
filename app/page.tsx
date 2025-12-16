import { auth } from "@/auth";
import Link from "next/link";

export default async function Home() {
    const session = await auth();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center">
                <h1 className="text-5xl font-bold text-gray-900 mb-4">
                    AI Video Automation Platform
                </h1>
                <p className="text-xl text-gray-600 mb-8">
                    Powered by Google Gemini
                </p>

                {session ? (
                    <Link
                        href="/dashboard"
                        className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
                    >
                        Go to Dashboard
                    </Link>
                ) : (
                    <Link
                        href="/auth/signin"
                        className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
                    >
                        Sign In to Get Started
                    </Link>
                )}
            </div>
        </div>
    );
}