import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { geminiModel } from '@/lib/ai';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const bodyContent = await req.json().catch(() => ({})); // Handle empty body if any
        // If called without body (initial load might differ?) or with body.
        // Actually the client always sends POST.

        const { additionalInstructions } = bodyContent || {};

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'Gemini API Key is not configured' },
                { status: 500 }
            );
        }

        // 2. Fetch All Cases and Filter in Memory
        const { data: allCases, error } = await supabase
            .from('cases')
            .select(`
        id,
        title,
        description,
        updated_at,
        created_at,
        application:applications(name),
        status:statuses(name, is_final, id),
        responsible:profiles!cases_responsible_id_fkey(full_name)
      `)
            .is('deleted_at', null)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        // Filter active cases
        const cases = allCases?.filter(c => {
            const s = c.status as any;
            if (!s) return true;
            return s.is_final !== true;
        }) || [];

        if (!cases || cases.length === 0) {
            return NextResponse.json({ report: 'No hay casos activos para reportar en este momento.' });
        }

        // 3. Construct Prompt
        const casesSummary = cases.map(c =>
            `- [Estado: ${(c.status as any)?.name}] "${c.title}"
               App: ${(c.application as any)?.name || 'N/A'} | Resp: ${(c.responsible as any)?.full_name || 'Sin asignar'}
               Creado: ${new Date(c.created_at).toLocaleDateString()} | Actualizado: ${new Date(c.updated_at).toLocaleDateString()}
               Desc: ${c.description || 'Sin descripción'}`
        ).join('\n---\n');

        const prompt = `
      Actúa como una IA experta y Senior en Gestión de Proyectos y Soporte Técnico.
      Tu objetivo es generar un "Informe de Estado de Casos Activos" de alto nivel y muy detallado.

      FECHA DEL REPORTE: ${new Date().toLocaleDateString()}

      LISTADO DE CASOS ACTIVOS (PENDIENTES):
      ${casesSummary}

      INSTRUCCIONES CLAVE:
      1.  **Clasificación de Áreas**: Clasifica cada caso en "Ingeniería" o "Postventa" según su estado y descripción.
          -   *Ingeniería*: Desarrollo, QA, Pruebas, Implementación, Bugfix.
          -   *Postventa*: Soporte, Espera Cliente, Análisis, Requerimiento, Capacitación.
      2.  **Preferencia de Prioridad**: Como no hay campo de prioridad explícito, **INFIERE la prioridad** (Alta/Media/Baja) basándote en el título, descripción y antigüedad.
      3.  **Métricas**: Debes iniciar con un resumen numérico:
          -   Total de Casos.
          -   Pendientes por Ingeniería.
          -   Pendientes por Postventa.
      4.  **Detalle**: Lista CADA caso con:
          -   ID/Título.
          -   Prioridad (Infrerida).
          -   Breve descripción (1 línea).

      ESTRUCTURA SUGERIDA:
      # Reporte General de Casos
      ## Resumen de Métricas
      - **Total Casos Activos**: X
      - **Pendientes Ingeniería**: Y
      - **Pendientes Postventa**: Z

      ## Detalle de Casos
      (Lista detallada, NO uses tablas. Formato recomendado por caso:)
      
      ### [ID] Título del Caso
      - **Estado**: ...
      - **Prioridad Est.** : ...
      - **Responsable**: ...
      - **Descripción**: ...

      ## Observaciones Finales
      (Cualquier patrón notado)

      ${additionalInstructions ? `
      ---
      INSTRUCCIONES ADICIONALES DEL USUARIO:
      "${additionalInstructions}"
      
      IMPORTANTE: Ajusta el informe basándote estrictamente en estas nuevas instrucciones.
      ---
      ` : ''}
    `;

        // 4. Call Gemini
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const report = response.text();

        return NextResponse.json({ report });

    } catch (error: any) {
        console.error('Gemini Active Cases Report Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
