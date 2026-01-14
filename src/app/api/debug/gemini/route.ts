import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'No API Key' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // There isn't a direct "listModels" on the instance in some versions, 
        // but usually it is on the client or we can try a list request.
        // Actually the SDK might not expose listModels directly in the simplified 'genAI' object?
        // Let's check typical usage. 
        // It seems the Node SDK might not make listModels easy on the top level class.
        // We can try to just return "Debug endpoint ready" and try a specific known model like 'gemini-1.0-pro'

        // Changing strategy: return a simple "ping" with a model generation to see specific error detail
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        return NextResponse.json({
            message: 'Configured',
            keyPrefix: apiKey.substring(0, 4),
            model: 'gemini-1.5-flash'
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
