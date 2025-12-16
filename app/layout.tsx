import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
    title: "AI Video Automation Platform",
    description: "Automated video content generation with Google Gemini",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="antialiased">
                <SessionProvider>
                    {children}
                </SessionProvider>
            </body>
        </html>
    );
}
