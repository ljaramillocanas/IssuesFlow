'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import LiquidLoader from '@/components/LiquidLoader';
import Navbar from '@/components/Navbar';
import ImageGallery from '@/components/ImageGallery';
import ChangeHistory from '@/components/ChangeHistory';
import { Solution, Profile, Test } from '@/types';
import { generateEmbedCode, formatDateTime } from '@/lib/utils';
import { showAlert, showConfirm } from '@/lib/sweetalert';
import { hasPermission } from '@/lib/permissions';
import { deleteImage } from '@/lib/storage';
import { downloadSolutionAsWord } from '@/lib/exportSolution';
import ResourceModal from '@/components/ResourceModal';
import VideoPlayerModal from '@/components/VideoPlayerModal';
import { SolutionResource } from '@/types';

export default function SolutionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [solution, setSolution] = useState<Solution | null>(null);
    const [attachments, setAttachments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [exporting, setExporting] = useState(false);
    const [relatedTests, setRelatedTests] = useState<Test[]>([]);
    const [resources, setResources] = useState<SolutionResource[]>([]);
    const [selectedFolder, setSelectedFolder] = useState('General');
    const [showResourceModal, setShowResourceModal] = useState(false);
    const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null);

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
            showAlert('Error', 'Solución no encontrada', 'error');
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

        // Load resources
        const { data: resourcesData } = await supabase
            .from('solution_resources')
            .select('*, creator:profiles(id, full_name)')
            .eq('solution_id', params.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (resourcesData) {
            setResources(resourcesData);
            // Set first folder as default if exists
            if (resourcesData.length > 0) {
                setSelectedFolder(resourcesData[0].folder || 'General');
            }
        }

        setLoading(false);
    };

    const handleDelete = async () => {
        const confirmed = await showConfirm('¿Estás seguro de eliminar esta solución? Esta acción no se puede deshacer.');
        if (!confirmed) {
            return;
        }

        const { error } = await supabase
            .from('solutions')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', params.id);

        if (error) {
            showAlert('Error', 'Error al eliminar la solución', 'error');
            return;
        }

        showAlert('Éxito', 'Solución eliminada exitosamente', 'success');
        router.push('/solutions');
    };

    const handleDeleteAttachment = async (id: string, url: string) => {
        await deleteImage(url);
        await supabase.from('solution_attachments').delete().eq('id', id);
        loadSolution();
    };

    const handleDeleteResource = async (id: string, url: string, type: string) => {
        const confirmed = await showConfirm('¿Eliminar este recurso?');
        if (!confirmed) return;

        // Delete from storage if it's a file
        if (type !== 'link' && type !== 'video') {
            try {
                const path = url.split('/solution-resources/')[1];
                if (path) {
                    await supabase.storage.from('solution-resources').remove([path]);
                }
            } catch (e) {
                console.error('Error deleting file:', e);
            }
        }

        await supabase.from('solution_resources').delete().eq('id', id);
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
        } catch (error: any) {
            console.error('Export error:', error);
            showAlert('Error', 'Error al exportar: ' + error.message, 'error');
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LiquidLoader />
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
                            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-formal)' }}>
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
                <div className="card" style={{ marginBottom: '1.5rem', boxShadow: 'var(--shadow-formal)' }}>
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
                                backgroundColor: `${solution.case?.application?.color ?? '#666666'}15`,
                                color: solution.case?.application?.color ?? '#666666'
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
                                backgroundColor: `${solution.case?.status?.color ?? '#666666'}15`,
                                color: solution.case?.status?.color ?? '#666666'
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
                                            backgroundColor: `${test.status?.color ?? '#666666'}15`,
                                            color: test.status?.color ?? '#666666'
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

                {/* Resources & Multimedia Section */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                            📚 Recursos y Multimedia
                        </h2>
                        {canEdit && (
                            <button
                                onClick={() => setShowResourceModal(true)}
                                className="btn btn-primary btn-sm"
                            >
                                + Agregar Recurso
                            </button>
                        )}
                    </div>

                    {resources.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem 1rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            border: '2px dashed var(--border-color)'
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                No hay recursos adjuntos todavía
                            </p>
                            {canEdit && (
                                <button
                                    onClick={() => setShowResourceModal(true)}
                                    className="btn btn-secondary"
                                >
                                    Agregar Primer Recurso
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Folder Tabs */}
                            <div style={{
                                display: 'flex',
                                gap: '0.5rem',
                                marginBottom: '1.5rem',
                                flexWrap: 'wrap',
                                borderBottom: '1px solid var(--border-color)',
                                paddingBottom: '0.75rem'
                            }}>
                                {Array.from(new Set(resources.map(r => r.folder))).map((folder) => (
                                    <button
                                        key={folder}
                                        onClick={() => setSelectedFolder(folder)}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: 'none',
                                            backgroundColor: selectedFolder === folder ? 'var(--primary)' : 'var(--bg-secondary)',
                                            color: selectedFolder === folder ? 'white' : 'var(--text-primary)',
                                            cursor: 'pointer',
                                            fontWeight: selectedFolder === folder ? 600 : 400,
                                            transition: 'all 0.2s',
                                            fontSize: '0.875rem'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (selectedFolder !== folder) {
                                                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedFolder !== folder) {
                                                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                                            }
                                        }}
                                    >
                                        📁 {folder} ({resources.filter(r => r.folder === folder).length})
                                    </button>
                                ))}
                            </div>

                            {/* Resource Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '1rem'
                            }}>
                                {resources.filter(r => r.folder === selectedFolder).map((resource) => {
                                    const getIcon = (type: string) => {
                                        switch (type) {
                                            case 'video': return '🎥';
                                            case 'image': return '🖼️';
                                            case 'document': return '📄';
                                            case 'link': return '🔗';
                                            default: return '📎';
                                        }
                                    };

                                    return (
                                        <div
                                            key={resource.id}
                                            style={{
                                                padding: '1.25rem',
                                                backgroundColor: 'var(--bg-secondary)',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border-color)',
                                                transition: 'all 0.3s',
                                                cursor: 'pointer',
                                                position: 'relative'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-4px)';
                                                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                            onClick={() => {
                                                if (resource.type === 'video') {
                                                    setPlayingVideo({ url: resource.url, title: resource.title });
                                                } else {
                                                    window.open(resource.url, '_blank');
                                                }
                                            }}
                                        >
                                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                                                {getIcon(resource.type)}
                                            </div>
                                            <h3 style={{
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                marginBottom: '0.5rem',
                                                color: 'var(--text-primary)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {resource.title}
                                            </h3>
                                            {resource.description && (
                                                <p style={{
                                                    fontSize: '0.875rem',
                                                    color: 'var(--text-secondary)',
                                                    marginBottom: '0.75rem',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical'
                                                }}>
                                                    {resource.description}
                                                </p>
                                            )}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                fontSize: '0.75rem',
                                                color: 'var(--text-tertiary)',
                                                marginTop: 'auto'
                                            }}>
                                                <span>{resource.creator?.full_name || 'Sistema'}</span>
                                                {resource.file_size && (
                                                    <span>{(resource.file_size / 1024 / 1024).toFixed(2)} MB</span>
                                                )}
                                            </div>

                                            {/* Delete Button */}
                                            {canEdit && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteResource(resource.id, resource.url, resource.type);
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '0.5rem',
                                                        right: '0.5rem',
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '50%',
                                                        border: 'none',
                                                        backgroundColor: 'var(--danger)15',
                                                        color: 'var(--danger)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.875rem',
                                                        opacity: 0.7,
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.opacity = '1';
                                                        e.currentTarget.style.backgroundColor = 'var(--danger)';
                                                        e.currentTarget.style.color = 'white';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.opacity = '0.7';
                                                        e.currentTarget.style.backgroundColor = 'var(--danger)15';
                                                        e.currentTarget.style.color = 'var(--danger)';
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
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

            {/* Modals */}
            {showResourceModal && (
                <ResourceModal
                    solutionId={params.id as string}
                    existingFolders={Array.from(new Set(resources.map(r => r.folder)))}
                    onClose={() => setShowResourceModal(false)}
                    onSuccess={() => {
                        setShowResourceModal(false);
                        loadSolution();
                    }}
                />
            )}

            {playingVideo && (
                <VideoPlayerModal
                    videoUrl={playingVideo.url}
                    title={playingVideo.title}
                    onClose={() => setPlayingVideo(null)}
                />
            )}
        </>
    );
}
