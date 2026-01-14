import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { geminiModel } from '@/lib/ai';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { entityId, entityType } = body;

        if (!entityId || !entityType) {
            return NextResponse.json(
                { error: 'Entity ID and Type are required' },
                { status: 400 }
            );
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'Gemini API Key is not configured' },
                { status: 500 }
            );
        }

        // 1. Fetch Entity Data
        let table = entityType === 'case' ? 'cases' : 'tests';

        const { data, error } = await supabase
            .from(table)
            .select(`
        *,
        application:applications(name),
        category:categories(name),
        status:statuses(name),
        responsible:profiles!${table}_responsible_id_fkey(full_name),
        creator:profiles!${table}_created_by_fkey(full_name)
      `)
            .eq('id', entityId)
            .single();

        if (error || !data) {
            return NextResponse.json(
                { error: `${entityType} not found` },
                { status: 404 }
            );
        }

        const entityData = data;

        // 2. Fetch Progress
        const progressTable = entityType === 'case' ? 'case_progress' : 'test_progress';
        const progressFK = entityType === 'case' ? 'case_id' : 'test_id';

        const { data: progressData } = await supabase
            .from(progressTable)
            .select(`
        description,
        created_at,
        creator:profiles(full_name),
        committee_notes
      `)
            .eq(progressFK, entityId)
            .order('created_at', { ascending: true });

        // 3. Construct Prompt
        const entityTitle = entityType === 'case' ? 'CASO' : 'PRUEBA';

        const progressText = progressData?.map(p => {
            return `- [${new Date(p.created_at).toLocaleDateString()}] ${(p.creator as any)?.full_name}: ${p.description} ${p.committee_notes ? `(Notas Comité: ${p.committee_notes})` : ''}`;
        }).join('\n');

        const prompt = `
      Actúa como una IA experta corporativa. Genera un informe ejecutivo formal.
      
      ${entityTitle}:
      - Título: ${(entityData as any).title}
      - Estado: ${(entityData as any).status?.name}
      - Prioridad: ${(entityData as any).priority || 'Normal'}
      - App: ${(entityData as any).application?.name}
      - Responsable: ${(entityData as any).responsible?.full_name}
      - Descripcion: ${(entityData as any).description || 'Sin descripción'}

      HISTORIAL:
      ${progressText || 'Sin avances.'}

      INSTRUCCIONES:
      - Estructura: "Resumen Ejecutivo", "Detalles Técnicos", "Cronología", "Conclusión".
      - Tono formal y profesional.
      - Usa Markdown.
    `;

        // 4. Call Gemini
        const result = await geminiModel.generateContent(prompt);
        const report = result.response.text();

        return NextResponse.json({ report });

    } catch (error: any) {
        console.error('Gemini Report Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
