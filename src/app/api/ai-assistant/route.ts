import { NextRequest, NextResponse } from 'next/server';
import { geminiModel } from '@/lib/ai';

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt is required' },
                { status: 400 }
            );
        }

        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ result: text });
    } catch (error: any) {
        console.error('Error identifying AI assistant request:', error);
        return NextResponse.json(
            { error: 'Failed to generate content', details: error.message },
            { status: 500 }
        );
    }
}
