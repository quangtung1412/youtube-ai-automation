import { NextResponse } from 'next/server';
import { getAvailableModels } from '@/lib/gemini';
import { auth } from '@/auth';

export async function GET() {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get models from Gemini API
        const models = await getAvailableModels();

        return NextResponse.json({ models });
    } catch (error: any) {
        console.error('Error fetching models:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch models' },
            { status: 500 }
        );
    }
}
