'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import ImageGallery from '@/components/ImageGallery';
import ChangeHistory from '@/components/ChangeHistory';
import { Solution, Profile, Test } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import { deleteImage } from '@/lib/storage';
import { downloadSolutionAsWord } from '@/lib/exportSolution';

export default function SolutionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [solution, setSolution] = useState<Solution | null>(null);
    const [attachments, setAttachments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [exporting, setExporting] = useState(false);
    const [relatedTests, setRelatedTests] = useState<Test[]>([]);

    useEffect(() => {
        checkAuthAndLoad();
    }, []);

    const checkAuthAndLoad = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileData) {
            setProfile(profileData);
            await loadSolution();
        }
    };

    const loadSolution = async () => {
        setLoading(true);

        const { data: solutionData, error } = await supabase
            .from('solutions')
            .select(`
        *,
        case:cases!inner(
          id, title, description, created_at,
          application:applications(id, name, color),
          category:categories(id, name),
          case_type:case_types(id, name),
          status:statuses(id, name, color),
          responsible:profiles!cases_responsible_id_fkey(id, full_name),
          creator:profiles!cases_created_by_fkey(id, full_name)
        ),
        creator:profiles(id, full_name)
      `)
            .eq('id', params.id)
            .is('deleted_at', null)
            .single();

        if (error || !solutionData) {
            alert('Solución no encontrada');
            router.push('/solutions');
            return;
        }

        setSolution(solutionData);

        // Load attachments
        const { data: attachmentsData } = await supabase
            .from('solution_attachments')
            .select('*, uploader:profiles(id, full_name)')
            .eq('solution_id', params.id)
            .order('created_at', { ascending: false });

        if (attachmentsData) {
            setAttachments(attachmentsData);
        }

        // Load related tests if any
        if (solutionData.tests_performed) {
            const { data: testsData } = await supabase
                .from('solution_tests')
                .select(`
                    test:tests (
                        id, title, status:statuses(name, color)
                    )
                `)
                .eq('solution_id', params.id);

            if (testsData) {
                // @ts-ignore
                const tests: Test[] = testsData.map(t => t.test);
                setRelatedTests(tests);
            }
        }

        setLoading(false);
    };

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de eliminar esta solución? Esta acción no se puede deshacer.')) {
            return;
        }

        const { error } = await supabase
            .from('solutions')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', params.id);

        if (error) {
            alert('Error al eliminar la solución');
            return;
        }

        alert('Solución eliminada exitosamente');
        router.push('/solutions');
    };

    const handleDeleteAttachment = async (id: string, url: string) => {
        await deleteImage(url);
        await supabase.from('solution_attachments').delete().eq('id', id);
        loadSolution();
    };

    const canEdit = profile && solution && (
        solution.created_by === profile.id ||
        hasPermission(profile.role, 'canManageConfig')
    );

    const handleExport = async () => {
        if (!solution) return;

        setExporting(true);
        try {
            // Pass related tests to export function
            const solutionWithTests = { ...solution, tests: relatedTests };
            await downloadSolutionAsWord(solutionWithTests, attachments);
        } catch (error) {
            console.error('Export error:', error);
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="loading" style={{ width: '48px', height: '48px' }} />
                </div>
            </>
        );
    }

    if (!solution) {
        return null;
    }

    return (
        <>
            <Navbar />
            <main className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1200px' }}>
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem' }}>
                        <Link href="/solutions" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            ← Volver a Soluciones
                        </Link>
                    </div>

                    <div className="flex items-start justify-between">
                        <div style={{ flex: 1 }}>
                            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                                {solution.title}
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                Creado por {solution.creator?.full_name || 'Sistema'} el {formatDateTime(solution.created_at)}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleExport}
                                className="btn btn-primary"
                                disabled={exporting}
                            >
                                {exporting ? '⏳ Generando...' : '📄 Exportar a Word'}
                            </button>
                            {canEdit && (
                                <>
                                    <Link href={`/solutions/${solution.id}/edit`} className="btn btn-secondary">
                                        ✏️ Editar
                                    </Link>
                                    <button onClick={handleDelete} className="btn btn-danger">
                                        🗑️ Eliminar
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Case Information Card */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                        📋 Información del Caso
                    </h2>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                Cliente / Aplicación
                            </p>
                            <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                backgroundColor: `${solution.case?.application?.color || '#000000'}15`,
                                color: solution.case?.application?.color || '#000000'
                            }}>
                                {solution.case?.application?.name || '-'}
                            </span>
                        </div>

                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                Caso
                            </p>
                            <Link
                                href={`/cases/${solution.case?.id}`}
                                style={{ fontWeight: 500, color: 'var(--primary)', textDecoration: 'none' }}
                            >
                                {solution.case?.title}
                            </Link>
                        </div>

                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                Estado del Caso
                            </p>
                            <span style={{
                                padding: '0.25rem 0.625rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                backgroundColor: `${solution.case?.status?.color}15`,
                                color: solution.case?.status?.color
                            }}>
                                {solution.case?.status?.name || '-'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Analysis Section (Novedad + Hallazgos) */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                        🔍 Análisis del Problema
                    </h2>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--primary)' }}>
                            Novedad (Reporte)
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {solution.description}
                        </p>
                    </div>

                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--accent)' }}>
                            Hallazgos
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {solution.findings || 'No se registraron hallazgos específicos.'}
                        </p>
                    </div>
                </div>

                {/* Tests Section */}
                {solution.tests_performed && (
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                            🧪 Reporte de Pruebas
                        </h2>

                        {relatedTests.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {relatedTests.map(test => (
                                    <div key={test.id} style={{
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <Link href={`/tests/${test.id}`} style={{ fontWeight: 500, color: 'var(--text-primary)', textDecoration: 'none' }}>
                                            {test.title}
                                        </Link>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            padding: '0.125rem 0.5rem',
                                            borderRadius: '9999px',
                                            backgroundColor: `${test.status?.color}15`,
                                            color: test.status?.color
                                        }}>
                                            {test.status?.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                Se indicó que se realizaron pruebas, pero no se vincularon registros específicos.
                            </p>
                        )}
                    </div>
                )}

                {/* Solution Section */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                        ✅ Solución Aplicada
                    </h2>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            Pasos para Resolver
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {solution.steps_to_resolve}
                        </p>
                    </div>

                    {solution.final_result && (
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Resultado Final / Observaciones
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                {solution.final_result}
                            </p>
                        </div>
                    )}
                </div>

                {/* Important Info Section */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                        ℹ️ Información Importante para Solución
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                URL Aplicativo SPL
                            </p>
                            {solution.spl_app_url ? (
                                <a href={solution.spl_app_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', wordBreak: 'break-all' }}>
                                    {solution.spl_app_url}
                                </a>
                            ) : (
                                <span style={{ color: 'var(--text-secondary)' }}>-</span>
                            )}
                        </div>

                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                URL Aplicativo Adicional
                            </p>
                            {solution.additional_app_url ? (
                                <a href={solution.additional_app_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', wordBreak: 'break-all' }}>
                                    {solution.additional_app_url}
                                </a>
                            ) : (
                                <span style={{ color: 'var(--text-secondary)' }}>-</span>
                            )}
                        </div>

                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                Aplicativo Necesario
                            </p>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                {solution.necessary_app || '-'}
                            </span>
                        </div>

                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                Firmware Necesario
                            </p>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                {solution.necessary_firmware || '-'}
                            </span>
                        </div>

                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                Responsable de Solución
                            </p>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                {solution.creator?.full_name || 'Sistema'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Images */}
                {attachments.length > 0 && (
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                            🖼️ Imágenes Adjuntas ({attachments.length})
                        </h2>
                        <ImageGallery
                            attachments={attachments}
                            canDelete={!!canEdit}
                            onDelete={handleDeleteAttachment}
                        />
                    </div>
                )}

                {/* Change History */}
                <div className="card">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                        🕐 Historial de Cambios
                    </h2>
                    <ChangeHistory tableName="solutions" recordId={params.id as string} />
                </div>
            </main>
        </>
    );
}
