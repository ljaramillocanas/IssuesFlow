'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import AddProgress from '@/components/AddProgress';
import { Test, Application, Category, TestType, Status, Profile, TestProgress, Case } from '@/types';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import { showAlert, showConfirm } from '@/lib/sweetalert';
import { hasPermission } from '@/lib/permissions';
import { deleteImage } from '@/lib/storage';
import ImageGallery from '@/components/ImageGallery';
import ImageUpload from '@/components/ImageUpload';
import MediaViewer from '@/components/MediaViewer';
import { exportTestsWithProgress } from '@/lib/export';
import ChangeHistory from '@/components/ChangeHistory';
import ReportModal from '@/components/ReportModal';
import LiquidLoader from '@/components/LiquidLoader';

export default function TestDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [testData, setTestData] = useState<Test | null>(null);
    const [progress, setProgress] = useState<TestProgress[]>([]);
    const [attachments, setAttachments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [showGallery, setShowGallery] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [activeTab, setActiveTab] = useState<'progress' | 'history'>('progress');

    const [applications, setApplications] = useState<Application[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [testTypes, setTestTypes] = useState<TestType[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [users, setUsers] = useState<Profile[]>([]);

    const [cases, setCases] = useState<Array<{ id: string; title: string }>>([]);

    // AI Report State
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportContent, setReportContent] = useState('');
    const [reportLoading, setReportLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        application_id: '',
        category_id: '',
        test_type_id: '',
        status_id: '',
        responsible_id: '',
        case_id: '',
    });

    useEffect(() => {
        checkAuthAndLoad();
    }, [params.id]);

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

        setProfile(profileData);
        await loadTest();
        await loadFormOptions();
    };

    const loadTest = async () => {
        setLoading(true);

        const { data: testRes } = await supabase
            .from('tests')
            .select(`
        *,
        application:applications(*),
        category:categories(*),
        test_type:test_types(*),
        status:statuses(*),
        responsible:profiles!tests_responsible_id_fkey(*),
        case:cases(id, title),
        creator:profiles!tests_created_by_fkey(*)
      `)
            .eq('id', params.id)
            .single();

        if (testRes) {
            setTestData(testRes);
            setFormData({
                title: testRes.title,
                description: testRes.description || '',
                application_id: testRes.application_id || '',
                category_id: testRes.category_id || '',
                test_type_id: testRes.test_type_id || '',
                status_id: testRes.status_id,
                responsible_id: testRes.responsible_id || '',
                case_id: testRes.case_id || '',
            });
        }

        const { data: progressRes } = await supabase
            .from('test_progress')
            .select(`
        *,
        creator:profiles(*)
      `)
            .eq('test_id', params.id)
            .order('created_at', { ascending: false });

        if (progressRes) setProgress(progressRes);

        // Load attachments
        const { data: attachmentsRes } = await supabase
            .from('test_attachments')
            .select('*')
            .eq('test_id', params.id)
            .order('created_at', { ascending: false });

        if (attachmentsRes) setAttachments(attachmentsRes);

        setLoading(false);
    };

    const loadFormOptions = async () => {
        const [appsRes, catsRes, typesRes, statusesRes, usersRes, casesRes] = await Promise.all([
            supabase.from('applications').select('*').is('deleted_at', null),
            supabase.from('categories').select('*').is('deleted_at', null),
            supabase.from('test_types').select('*').is('deleted_at', null),
            supabase.from('statuses').select('*').is('deleted_at', null).order('display_order'),
            supabase.from('profiles').select('*').eq('is_active', true).is('deleted_at', null),
            supabase.from('cases').select('id, title').is('deleted_at', null).order('created_at', { ascending: false }),
        ]);

        if (appsRes.data) setApplications(appsRes.data);
        if (catsRes.data) setCategories(catsRes.data);
        if (typesRes.data) setTestTypes(typesRes.data);
        if (statusesRes.data) setStatuses(statusesRes.data);
        if (usersRes.data) setUsers(usersRes.data);
        if (casesRes.data) setCases(casesRes.data);
    };

    const handleUpdate = async () => {
        try {
            const dataToUpdate = {
                ...formData,
                case_id: formData.case_id || null,
            };

            const { error } = await supabase
                .from('tests')
                .update(dataToUpdate)
                .eq('id', params.id);

            if (error) throw error;

            setEditing(false);
            await loadTest();
            showAlert('Éxito', 'Prueba actualizada exitosamente', 'success');
        } catch (error: any) {
            showAlert('Error', 'Error al actualizar: ' + error.message, 'error');
        }
    };



    const handleFinalize = async () => {
        const confirmed = await showConfirm('¿Estás seguro de finalizar esta prueba?');
        if (!confirmed) return;

        const finalStatus = statuses.find(s => s.is_final);
        if (!finalStatus) {
            showAlert('Advertencia', 'No se encontró un estado final configurado.', 'warning');
            return;
        }

        setLoading(true);
        const { error } = await supabase
            .from('tests')
            .update({
                status_id: finalStatus.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', params.id);

        if (error) {
            showAlert('Error', 'Error al finalizar la prueba', 'error');
        } else {
            loadTest();
            showAlert('Éxito', 'Prueba finalizada exitosamente', 'success');
        }
        setLoading(false);
    };

    const handleExport = () => {
        if (!testData) return;
        exportTestsWithProgress(
            [testData],
            { [testData.id]: progress },
            `Prueba-${testData.id.substring(0, 8)}.xlsx`
        );
    };

    const handleDelete = async () => {
        const confirmed = await showConfirm('¿Estás seguro de eliminar esta prueba?');
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('tests')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', params.id);

            if (error) throw error;

            router.push('/tests');
        } catch (error: any) {
            console.error('Error deleting test:', error);
            showAlert('Error', 'Error al eliminar: ' + error.message, 'error');
        }
    };

    const handleGenerateAIReport = async () => {
        setShowReportModal(true);
        setReportLoading(true);
        setReportContent('');

        try {
            const response = await fetch('/api/ai/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entityId: params.id,
                    entityType: 'test'
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Error generating report');
            }

            const data = await response.json();
            setReportContent(data.report);
        } catch (error: any) {
            setReportContent('Error al generar el informe: ' + error.message);
        } finally {
            setReportLoading(false);
        }
    };

    const canEdit = profile && hasPermission(profile.role, 'canEditTest');
    const canDelete = profile && hasPermission(profile.role, 'canDeleteTest');
    const isFinalStatus = testData?.status?.is_final;

    if (loading) {
        return (
            <>
                <Navbar />
                <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LiquidLoader />
                </div>
            </>
        );
    }

    if (!testData) {
        return (
            <>
                <Navbar />
                <main className="container" style={{ padding: '2rem 1.5rem' }}>
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p>Prueba no encontrada</p>
                        <Link href="/tests" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            Volver a Pruebas
                        </Link>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <main className="container" style={{ padding: '2rem 1.5rem' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
                    <div>
                        <div className="flex items-center gap-4" style={{ marginBottom: '0.5rem' }}>
                            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: 'var(--text-formal)' }}>
                                {testData.title}
                            </h1>
                            {testData.status && <StatusBadge status={testData.status} />}
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Creado {formatRelativeTime(testData.created_at)} • Última actualización {formatRelativeTime(testData.updated_at)}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExport} className="btn btn-secondary">
                            📊 Exportar
                        </button>
                        <button
                            onClick={handleGenerateAIReport}
                            className="btn btn-primary"
                            style={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                border: 'none',
                                color: 'white'
                            }}
                        >
                            ✨ Informe IA
                        </button>
                        {canEdit && !isFinalStatus && (
                            <>
                                <button
                                    onClick={handleFinalize}
                                    className="btn btn-success"
                                    style={{ backgroundColor: '#10B981', color: 'white', border: 'none' }}
                                >
                                    ✓ Finalizar
                                </button>
                                <button
                                    onClick={() => setEditing(!editing)}
                                    className="btn btn-secondary"
                                >
                                    {editing ? 'Cancelar' : 'Editar'}
                                </button>
                            </>
                        )}
                        {canDelete && (
                            <button onClick={handleDelete} className="btn btn-danger">
                                Eliminar
                            </button>
                        )}
                    </div>
                </div>

                {isFinalStatus && (
                    <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '0.75rem 1rem' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                            🔒 Esta prueba está finalizada y no puede ser editada
                        </p>
                    </div>
                )}

                {testData.case && (
                    <div className="card" style={{ marginBottom: '1.5rem', background: '#DBEAFE', border: '1px solid #3B82F6', padding: '0.75rem 1rem' }}>
                        <p style={{ fontSize: '0.875rem', margin: 0 }}>
                            📋 Esta prueba está vinculada al caso:{' '}
                            <Link href={`/cases/${testData.case.id}`} style={{ fontWeight: 600, color: '#3B82F6' }}>
                                {testData.case.title}
                            </Link>
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-6">
                    <div style={{ gridColumn: 'span 2' }}>
                        {editing ? (
                            <div className="card">
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                                    Editar Prueba
                                </h2>

                                <div className="form-group">
                                    <label className="label">Título *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="label">Descripción</label>
                                    <textarea
                                        className="input textarea"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={5}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="label">Caso Relacionado</label>
                                    <select
                                        className="input select"
                                        value={formData.case_id}
                                        onChange={(e) => setFormData({ ...formData, case_id: e.target.value })}
                                    >
                                        <option value="">Sin vincular</option>
                                        {cases.map((c) => (
                                            <option key={c.id} value={c.id}>{c.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="label">Aplicación</label>
                                        <select
                                            className="input select"
                                            value={formData.application_id}
                                            onChange={(e) => setFormData({ ...formData, application_id: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {applications.map((app) => (
                                                <option key={app.id} value={app.id}>{app.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="label">Categoría</label>
                                        <select
                                            className="input select"
                                            value={formData.category_id}
                                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="label">Tipo de Prueba</label>
                                        <select
                                            className="input select"
                                            value={formData.test_type_id}
                                            onChange={(e) => setFormData({ ...formData, test_type_id: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {testTypes.map((type) => (
                                                <option key={type.id} value={type.id}>{type.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="label">Estado *</label>
                                        <select
                                            className="input select"
                                            value={formData.status_id}
                                            onChange={(e) => setFormData({ ...formData, status_id: e.target.value })}
                                        >
                                            {statuses.map((status) => (
                                                <option key={status.id} value={status.id}>{status.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="label">Responsable</label>
                                    <select
                                        className="input select"
                                        value={formData.responsible_id}
                                        onChange={(e) => setFormData({ ...formData, responsible_id: e.target.value })}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
                                    <button onClick={handleUpdate} className="btn btn-primary">
                                        Guardar Cambios
                                    </button>
                                    <button onClick={() => setEditing(false)} className="btn btn-secondary">
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="card">
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                                    Descripción
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                                    {testData.description || 'Sin descripción'}
                                </p>
                            </div>
                        )}

                        {/* Image Gallery */}
                        <div className="card" style={{ marginTop: '1.5rem' }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                                    Archivos Adjuntos ({attachments.length})
                                </h2>
                                {attachments.length > 0 && (
                                    <button
                                        onClick={() => setShowGallery(true)}
                                        className="btn btn-secondary btn-sm"
                                        style={{ fontSize: '0.875rem' }}
                                    >
                                        📷 Ver Galería Completa
                                    </button>
                                )}
                            </div>

                            {showGallery && (
                                <MediaViewer
                                    isOpen={showGallery}
                                    onClose={() => setShowGallery(false)}
                                    items={attachments.map(att => ({
                                        id: att.id,
                                        url: att.file_url,
                                        type: att.file_url.match(/\.(mp4|webm|ogg|mov)$/i) ? 'video' : 'image',
                                        title: att.file_name || 'Adjunto'
                                    }))}
                                    initialIndex={0}
                                />
                            )}

                            {canEdit && !isFinalStatus && (
                                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                                    <ImageUpload
                                        mode="button"
                                        folder={`tests/${params.id}`}
                                        onUploadComplete={async (url) => {
                                            const { data: { user } } = await supabase.auth.getUser();
                                            const fileName = url.split('/').pop() || 'image.jpg';

                                            await supabase.from('test_attachments').insert({
                                                test_id: params.id,
                                                file_url: url,
                                                file_name: fileName,
                                                file_type: 'image',
                                                uploaded_by: user?.id
                                            });

                                            // Update test updated_at
                                            await supabase
                                                .from('tests')
                                                .update({ updated_at: new Date().toISOString() })
                                                .eq('id', params.id);

                                            loadTest();
                                        }}
                                    />
                                </div>
                            )}

                            {attachments.length > 0 ? (
                                <ImageGallery
                                    attachments={attachments}
                                    canDelete={!!(canEdit && !isFinalStatus)}
                                    onDelete={async (id, url) => {
                                        await deleteImage(url);
                                        await supabase.from('test_attachments').delete().eq('id', id);
                                        loadTest();
                                    }}
                                />
                            ) : (
                                <p style={{ color: 'var(--text-secondary)', padding: '1rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                    No hay imágenes adjuntas.
                                </p>
                            )}
                        </div>

                        {/* Progress & History Section with Tabs */}
                        <div className="card" style={{ marginTop: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                                    {activeTab === 'progress' ? `Avances (${progress.length})` : 'Historial de Cambios'}
                                </h2>

                                {/* Tab Switcher */}
                                <div className="flex p-1 rounded-lg gap-1" style={{ background: 'var(--bg-secondary)' }}>
                                    <button
                                        onClick={() => setActiveTab('progress')}
                                        className="px-4 py-2 rounded-md text-sm font-semibold transition-all"
                                        style={{
                                            background: activeTab === 'progress' ? 'white' : 'transparent',
                                            color: activeTab === 'progress' ? 'var(--primary)' : 'var(--text-secondary)',
                                            boxShadow: activeTab === 'progress' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        📝 Avances
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('history')}
                                        className="px-4 py-2 rounded-md text-sm font-semibold transition-all"
                                        style={{
                                            background: activeTab === 'history' ? 'white' : 'transparent',
                                            color: activeTab === 'history' ? 'var(--secondary)' : 'var(--text-secondary)',
                                            boxShadow: activeTab === 'history' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🕐 Historial
                                    </button>
                                </div>
                            </div>

                            {activeTab === 'progress' ? (
                                <>
                                    {canEdit && !isFinalStatus && (
                                        <AddProgress
                                            entityId={params.id as string}
                                            entityType="test"
                                            onProgressAdded={loadTest}
                                        />
                                    )}

                                    {progress.length === 0 ? (
                                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                                            No hay avances registrados
                                        </p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {progress.map((p) => (
                                                <div key={p.id} style={{
                                                    padding: '1rem',
                                                    background: 'var(--bg-secondary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    borderLeft: '3px solid var(--primary)'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                        <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                                            {p.creator?.full_name || 'Usuario'}
                                                        </span>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                            {formatRelativeTime(p.created_at)}
                                                        </span>
                                                    </div>
                                                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                                                        {p.description}
                                                    </p>
                                                    {p.committee_notes && (
                                                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Notas de Comité:</span>
                                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{p.committee_notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <ChangeHistory tableName="tests" recordId={params.id as string} />
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="card">
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                                Detalles
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                        Aplicación
                                    </p>
                                    <p style={{ fontWeight: 500 }}>
                                        {testData.application?.name || '-'}
                                    </p>
                                </div>

                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                        Categoría
                                    </p>
                                    <p style={{ fontWeight: 500 }}>
                                        {testData.category?.name || '-'}
                                    </p>
                                </div>

                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                        Tipo
                                    </p>
                                    <p style={{ fontWeight: 500 }}>
                                        {testData.test_type?.name || '-'}
                                    </p>
                                </div>

                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                        Responsable
                                    </p>
                                    <p style={{ fontWeight: 500 }}>
                                        {testData.responsible?.full_name || '-'}
                                    </p>
                                </div>

                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                        Creado por
                                    </p>
                                    <p style={{ fontWeight: 500 }}>
                                        {testData.creator?.full_name || '-'}
                                    </p>
                                </div>

                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                        Fecha de creación
                                    </p>
                                    <p style={{ fontSize: '0.875rem' }}>
                                        {formatDateTime(testData.created_at)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {testData && (
                <ReportModal
                    isOpen={showReportModal}
                    onClose={() => setShowReportModal(false)}
                    content={reportContent}
                    loading={reportLoading}
                    title={testData.title}
                />
            )}
        </>
    );
}
