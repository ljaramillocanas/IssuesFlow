
import { NextResponse } from 'next/server';
import { geminiModel } from '@/lib/ai';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'Gemini API Key is not configured' },
                { status: 500 }
            );
        }

        const data = await req.json();
        const { stats, statusData, appData, recentActivity } = data;

        // Construct Prompt
        const prompt = `
      Actúa como un Consultor Estratégico de TI experto en Gestión de Proyectos.
      Analiza los siguientes KPIs del Dashboard de Soporte y Desarrollo:

      ## 1. Estadísticas Generales
      - Total Casos: ${stats.totalCases} (Pendientes: ${stats.pendingCases}, Finalizados: ${stats.finishedCases})
      - Total Pruebas: ${stats.totalTests} (Pendientes: ${stats.pendingTests}, Finalizados: ${stats.finishedTests})

      ## 2. Distribución por Estados (Top)
      ${JSON.stringify(statusData, null, 2)}

      ## 3. Distribución por Aplicación (Carga de trabajo)
      ${JSON.stringify(appData, null, 2)}

      ## 4. Actividad Reciente (Últimos movimientos)
      ${JSON.stringify(recentActivity.map((r: any) => ({
            title: r.title,
            status: r.status?.name,
            responsible: r.responsible?.full_name,
            updated: r.updated_at
        })), null, 2)}

      INSTRUCCIONES DE SALIDA:
      Genera un reporte estratégico de "Salud del Proyecto" en formato Markdown limpio.
      
      Estructura deseada:
      # 🧠 Análisis Inteligente del Proyecto
      
      ## 🚦 Semáforo de Salud
      (Indica si el estado es Verde/Amarillo/Rojo basándote en la proporción de pendientes vs finalizados y cuellos de botella).

      ## 🔍 Hallazgos Principales
      - (Punto 1: ¿Dónde está la mayor carga? ¿Qué aplicación demanda más atención?)
      - (Punto 2: Análisis de velocidad de resolución según actividad reciente)
      - (Punto 3: Anomalías o riesgos detectados)

      ## 💡 Recomendaciones Estratégicas
      (3 acciones concretas para el líder del proyecto para desbloquear temas o mejorar flujo)

      Sé directo, profesional y enfocado en la toma de decisiones. No seas redundante.
    `;

        const result = await geminiModel.generateContent(prompt);
        const report = result.response.text();

        return NextResponse.json({ report });
    } catch (error: any) {
        console.error('AI Dashboard Error:', error);
        return NextResponse.json(
            { error: 'Error generating AI insights: ' + error.message },
            { status: 500 }
        );
    }
}
