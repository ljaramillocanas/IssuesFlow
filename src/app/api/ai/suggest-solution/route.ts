import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { geminiModel } from '@/lib/ai';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { caseId } = body;

        if (!caseId) {
            return NextResponse.json(
                { error: 'Case ID is required' },
                { status: 400 }
            );
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'Gemini API Key is not configured' },
                { status: 500 }
            );
        }

        // 1. Fetch Case Data
        const { data: caseData, error } = await supabase
            .from('cases')
            .select(`
        *,
        application:applications(name),
        category:categories(name)
      `)
            .eq('id', caseId)
            .single();

        if (error || !caseData) {
            return NextResponse.json(
                { error: 'Case not found' },
                { status: 404 }
            );
        }

        const { data: progressData } = await supabase
            .from('case_progress')
            .select('description, committee_notes, created_at, creator:profiles(full_name)')
            .eq('case_id', caseId)
            .order('created_at', { ascending: true });

        // 2. Construct Prompt
        const progressText = progressData?.map(p =>
            `- ${(p.creator as any)?.full_name}: ${p.description} ${p.committee_notes ? `(Obs: ${p.committee_notes})` : ''}`
        ).join('\n');

        const prompt = `
      Basado en el caso "${caseData.title}" y su historial, genera el contenido JSON para una Solución Técnica.
      
      CONTEXTO:
      Descripción: ${caseData.description}
      App: ${(caseData.application as any)?.name}
      Historial:
      ${progressText}

      SALIDA REQUERIDA (SOLO JSON):
      {
        "findings": "Análisis técnico de la causa raíz...",
        "steps_to_reproduce": "Pasos para replicar...",
        "steps_to_resolve": "Pasos ejecutados para resolver..."
      }
      
      IMPORTANTE: Devuelve SOLO el JSON válido, sin bloques de código ni markdown.
    `;

        // 3. Call Gemini
        const result = await geminiModel.generateContent(prompt);
        let text = result.response.text();

        // Clean up if Gemini wraps in markdown code blocks
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const suggestions = JSON.parse(text);

        return NextResponse.json({ suggestions });

    } catch (error: any) {
        console.error('Gemini Suggestion Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
