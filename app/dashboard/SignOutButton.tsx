'use client'

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";

export default function SignOutButton() {
    const { data: session } = useSession();

    return (
        <div className="flex items-center gap-3">
            {session?.user?.image && (
                <Image
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    width={32}
                    height={32}
                    className="rounded-full"
                />
            )}
            {session?.user?.name && (
                <span className="text-sm text-gray-700">{session.user.name}</span>
            )}
            <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-md hover:bg-gray-100 transition"
            >
                Sign Out
            </button>
        </div>
    );
}
