import * as XLSX from 'xlsx';
import { Case, Test } from '@/types';
import { formatDateTime } from './utils';

export function exportCasesToExcel(cases: Case[], filename: string = 'casos.xlsx') {
    // Preparar datos para exportación
    const data = cases.map(c => ({
        'ID': c.id.substring(0, 8),
        'Título': c.title,
        'Descripción': c.description || '',
        'Aplicación': c.application?.name || '',
        'Categoría': c.category?.name || '',
        'Tipo': c.case_type?.name || '',
        'Estado': c.status?.name || '',
        'Responsable': c.responsible?.full_name || '',
        'Creado por': c.creator?.full_name || '',
        'Fecha de Creación': formatDateTime(c.created_at),
        'Última Actualización': formatDateTime(c.updated_at),
    }));

    // Crear workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Casos');

    // Ajustar anchos de columnas
    const colWidths = [
        { wch: 10 },  // ID
        { wch: 40 },  // Título
        { wch: 50 },  // Descripción
        { wch: 15 },  // Aplicación
        { wch: 15 },  // Categoría
        { wch: 15 },  // Tipo
        { wch: 20 },  // Estado
        { wch: 20 },  // Responsable
        { wch: 20 },  // Creado por
        { wch: 20 },  // Fecha Creación
        { wch: 20 },  // Última Actualización
    ];
    ws['!cols'] = colWidths;

    // Descargar archivo
    XLSX.writeFile(wb, filename);
}

export function exportTestsToExcel(tests: Test[], filename: string = 'pruebas.xlsx') {
    const data = tests.map(t => ({
        'ID': t.id.substring(0, 8),
        'Título': t.title,
        'Descripción': t.description || '',
        'Caso Relacionado': t.case?.title || '',
        'Aplicación': t.application?.name || '',
        'Categoría': t.category?.name || '',
        'Tipo': t.test_type?.name || '',
        'Estado': t.status?.name || '',
        'Responsable': t.responsible?.full_name || '',
        'Creado por': t.creator?.full_name || '',
        'Fecha de Creación': formatDateTime(t.created_at),
        'Última Actualización': formatDateTime(t.updated_at),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pruebas');

    const colWidths = [
        { wch: 10 },  // ID
        { wch: 40 },  // Título
        { wch: 50 },  // Descripción
        { wch: 30 },  // Caso Relacionado
        { wch: 15 },  // Aplicación
        { wch: 15 },  // Categoría
        { wch: 15 },  // Tipo
        { wch: 20 },  // Estado
        { wch: 20 },  // Responsable
        { wch: 20 },  // Creado por
        { wch: 20 },  // Fecha Creación
        { wch: 20 },  // Última Actualización
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, filename);
}

export function exportCasesWithProgress(
    cases: Case[],
    progressData: Record<string, any[]>,
    filename: string = 'casos-detallado.xlsx'
) {
    const wb = XLSX.utils.book_new();

    // Hoja principal de casos
    const casesData = cases.map(c => ({
        'ID': c.id.substring(0, 8),
        'Título': c.title,
        'Descripción': c.description || '', // Agregado por solicitud
        'Estado': c.status?.name || '',
        'Responsable': c.responsible?.full_name || '',
        'Fecha Creación': formatDateTime(c.created_at),
    }));
    const casesWs = XLSX.utils.json_to_sheet(casesData);
    XLSX.utils.book_append_sheet(wb, casesWs, 'Resumen');

    // Hoja de avances
    const allProgress: any[] = [];
    cases.forEach(c => {
        const caseProgress = progressData[c.id] || [];
        caseProgress.forEach((p: any) => {
            allProgress.push({
                'Caso': c.title,
                'Fecha': formatDateTime(p.created_at),
                'Usuario': p.creator?.full_name || '',
                'Descripción': p.description,
                'Observación': p.observacion || '', // Nuevo campo
                'Notas Comité': p.committee_notes || '',
            });
        });
    });

    if (allProgress.length > 0) {
        const progressWs = XLSX.utils.json_to_sheet(allProgress);
        XLSX.utils.book_append_sheet(wb, progressWs, 'Avances');
    }

    XLSX.writeFile(wb, filename);
}

export function exportTestsWithProgress(
    tests: Test[],
    progressData: Record<string, any[]>,
    filename: string = 'pruebas-detallado.xlsx'
) {
    const wb = XLSX.utils.book_new();

    // Hoja principal de pruebas
    const testsData = tests.map(t => ({
        'ID': t.id.substring(0, 8),
        'Título': t.title,
        'Estado': t.status?.name || '',
        'Responsable': t.responsible?.full_name || '',
        'Fecha Creación': formatDateTime(t.created_at),
    }));
    const testsWs = XLSX.utils.json_to_sheet(testsData);
    XLSX.utils.book_append_sheet(wb, testsWs, 'Resumen');

    // Hoja de avances
    const allProgress: any[] = [];
    tests.forEach(t => {
        const testProgress = progressData[t.id] || [];
        testProgress.forEach((p: any) => {
            allProgress.push({
                'Prueba': t.title,
                'Fecha': formatDateTime(p.created_at),
                'Usuario': p.creator?.full_name || '',
                'Descripción': p.description,
                'Notas Comité': p.committee_notes || '',
            });
        });
    });

    if (allProgress.length > 0) {
        const progressWs = XLSX.utils.json_to_sheet(allProgress);
        XLSX.utils.book_append_sheet(wb, progressWs, 'Avances');
    }

    XLSX.writeFile(wb, filename);
}
