import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // @ts-ignore
        const accessToken = session.accessToken;

        if (!accessToken) {
            return NextResponse.json(
                { error: "No access token available" },
                { status: 401 }
            );
        }

        // Fetch YouTube channels
        const response = await fetch(
            'https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error('YouTube API Error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch YouTube channels' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Transform to simpler format
        const channels = data.items?.map((item: any) => ({
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails.default.url,
            customUrl: item.snippet.customUrl,
        })) || [];

        return NextResponse.json({ channels });
    } catch (error: any) {
        console.error('Error fetching YouTube channels:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
