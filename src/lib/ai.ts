import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini Client
// We check for key later to avoid init errors, or we can init lazily.
// But to match previous pattern, we export a function or client.

const apiKey = process.env.GEMINI_API_KEY || 'dummy-key';

if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY is missing. AI features will fail.");
}

const genAI = new GoogleGenerativeAI(apiKey);

export const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
