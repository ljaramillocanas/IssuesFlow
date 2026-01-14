'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import AddProgress from '@/components/AddProgress';
import ImageGallery from '@/components/ImageGallery';
import ImageUpload from '@/components/ImageUpload';
import MediaViewer from '@/components/MediaViewer';
import { exportCasesWithProgress } from '@/lib/export';
import { Case, Application, Category, CaseType, Status, Profile, CaseProgress, Test, Solution } from '@/types';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import { deleteImage } from '@/lib/storage';
import ChangeHistory from '@/components/ChangeHistory';
import ReportModal from '@/components/ReportModal';
import LiquidLoader from '@/components/LiquidLoader';
import { showAlert, showConfirm } from '@/lib/sweetalert';

export default function CaseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [caseData, setCaseData] = useState<Case | null>(null);
    const [relatedTests, setRelatedTests] = useState<Test[]>([]);
    const [progress, setProgress] = useState<CaseProgress[]>([]);
    const [attachments, setAttachments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [showGallery, setShowGallery] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [activeTab, setActiveTab] = useState<'progress' | 'history'>('progress');
    const [solutions, setSolutions] = useState<Solution[]>([]);

    // Form data for editing
    const [applications, setApplications] = useState<Application[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [caseTypes, setCaseTypes] = useState<CaseType[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [users, setUsers] = useState<Profile[]>([]);

    // AI Report State
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportContent, setReportContent] = useState('');
    const [reportLoading, setReportLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        application_id: '',
        category_id: '',
        case_type_id: '',
        status_id: '',
        responsible_id: '',
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
        await loadCase();
        await loadFormOptions();
    };

    const loadCase = async () => {
        setLoading(true);

        // Load case details
        const { data: caseRes } = await supabase
            .from('cases')
            .select(`
        *,
        application:applications(*),
        category:categories(*),
        case_type:case_types(*),
        status:statuses(*),
        responsible:profiles!cases_responsible_id_fkey(*),
        creator:profiles!cases_created_by_fkey(*)
      `)
            .eq('id', params.id)
            .single();

        if (caseRes) {
            setCaseData(caseRes);
            setFormData({
                title: caseRes.title,
                description: caseRes.description || '',
                application_id: caseRes.application_id || '',
                category_id: caseRes.category_id || '',
                case_type_id: caseRes.case_type_id || '',
                status_id: caseRes.status_id,
                responsible_id: caseRes.responsible_id || '',
            });
        }

        // Load related tests
        const { data: testsRes } = await supabase
            .from('tests')
            .select('id, title, status:statuses(*)')
            .eq('case_id', params.id)
            .is('deleted_at', null);

        if (testsRes) setRelatedTests(testsRes as any);

        // Load progress
        const { data: progressRes } = await supabase
            .from('case_progress')
            .select(`
        *,
        creator:profiles(*)
      `)
            .eq('case_id', params.id)
            .order('created_at', { ascending: false });

        if (progressRes) setProgress(progressRes);

        // Load attachments
        const { data: attachmentsRes } = await supabase
            .from('case_attachments')
            .select('*')
            .eq('case_id', params.id)
            .order('created_at', { ascending: false });

        if (attachmentsRes) setAttachments(attachmentsRes);

        setLoading(false);
    };

    const loadFormOptions = async () => {
        const [appsRes, catsRes, typesRes, statusesRes, usersRes] = await Promise.all([
            supabase.from('applications').select('*').is('deleted_at', null),
            supabase.from('categories').select('*').is('deleted_at', null),
            supabase.from('case_types').select('*').is('deleted_at', null),
            supabase.from('statuses').select('*').is('deleted_at', null).order('display_order'),
            supabase.from('profiles').select('*').eq('is_active', true).is('deleted_at', null),
        ]);

        if (appsRes.data) setApplications(appsRes.data);
        if (catsRes.data) setCategories(catsRes.data);
        if (typesRes.data) setCaseTypes(typesRes.data);
        if (statusesRes.data) setStatuses(statusesRes.data);
        if (usersRes.data) setUsers(usersRes.data);
    };

    const handleUpdate = async () => {
        try {
            const { error } = await supabase
                .from('cases')
                .update(formData)
                .eq('id', params.id);

            if (error) throw error;

            setEditing(false);
            await loadCase();
            showAlert('Éxito', 'Caso actualizado exitosamente', 'success');
        } catch (error: any) {
            showAlert('Error', 'Error al actualizar: ' + error.message, 'error');
        }
    };

    const handleFinalize = async () => {
        const confirmed = await showConfirm('¿Estás seguro de finalizar este caso?');
        if (!confirmed) return;

        const finalStatus = statuses.find(s => s.is_final);
        if (!finalStatus) {
            showAlert('Error', 'No se encontró un estado final configurado.', 'error');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('cases')
                .update({
                    status_id: finalStatus.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', params.id);

            if (error) throw error;

            loadCase();
            showAlert('Éxito', 'Caso finalizado exitosamente', 'success');
        } catch (error: any) {
            showAlert('Error', 'Error al finalizar el caso: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!caseData) return;
        exportCasesWithProgress(
            [caseData],
            { [caseData.id]: progress },
            `Caso-${caseData.id.substring(0, 8)}.xlsx`
        );
    };

    const handleDelete = async () => {
        const confirmed = await showConfirm('¿Estás seguro de eliminar este caso?');
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('cases')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', params.id);

            if (error) throw error;

            showAlert('Éxito', 'Caso eliminado exitosamente', 'success');
            router.push('/cases');
        } catch (error: any) {
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
                    entityType: 'case'
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

    const canEdit = profile && hasPermission(profile.role, 'canEditCase');
    const canDelete = profile && hasPermission(profile.role, 'canDeleteCase');
    const isFinalStatus = caseData?.status?.is_final;

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

    if (!caseData) {
        return (
            <>
                <Navbar />
                <main className="container" style={{ padding: '2rem 1.5rem' }}>
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p>Caso no encontrado</p>
                        <Link href="/cases" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            Volver a Casos
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
                {/* Header */}
                <div className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
                    <div>
                        <div className="flex items-center gap-4" style={{ marginBottom: '0.5rem' }}>
                            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: 'var(--text-formal)' }}>
                                {caseData.title}
                            </h1>
                            {caseData.status && <StatusBadge status={caseData.status} />}
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Creado {formatRelativeTime(caseData.created_at)} • Última actualización {formatRelativeTime(caseData.updated_at)}
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
                            🔒 Este caso está finalizado y no puede ser editado
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-6">
                    {/* Main Content - 2 columns */}
                    <div style={{ gridColumn: 'span 2' }}>
                        {editing ? (
                            <div className="card">
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                                    Editar Caso
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
                                        <label className="label">Tipo de Caso</label>
                                        <select
                                            className="input select"
                                            value={formData.case_type_id}
                                            onChange={(e) => setFormData({ ...formData, case_type_id: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {caseTypes.map((type) => (
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
                                    {caseData.description || 'Sin descripción'}
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
                                        type: att.file_type || 'image',
                                        title: att.file_name
                                    }))}
                                />
                            )}

                            {canEdit && !isFinalStatus && (
                                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                                    <ImageUpload
                                        mode="button"
                                        folder={`cases/${params.id}`}
                                        onUploadComplete={async (url) => {
                                            const { data: { user } } = await supabase.auth.getUser();
                                            const fileName = url.split('/').pop() || 'image.jpg';

                                            await supabase.from('case_attachments').insert({
                                                case_id: params.id,
                                                file_url: url,
                                                file_name: fileName,
                                                file_type: 'image',
                                                uploaded_by: user?.id
                                            });

                                            // Update case updated_at
                                            await supabase
                                                .from('cases')
                                                .update({ updated_at: new Date().toISOString() })
                                                .eq('id', params.id);

                                            loadCase();
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
                                        await supabase.from('case_attachments').delete().eq('id', id);
                                        loadCase();
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
                                            entityType="case"
                                            onProgressAdded={loadCase}
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
                                <ChangeHistory tableName="cases" recordId={params.id as string} />
                            )}
                        </div>
                    </div>

                    {/* Sidebar - 1 column */}
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
                                        {caseData.application?.name || '-'}
                                    </p>
                                </div>

                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                        Categoría
                                    </p>
                                    <p style={{ fontWeight: 500 }}>
                                        {caseData.category?.name || '-'}
                                    </p>
                                </div>

                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                        Tipo
                                    </p>
                                    <p style={{ fontWeight: 500 }}>
                                        {caseData.case_type?.name || '-'}
                                    </p>
                                </div>

                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                        Responsable
                                    </p>
                                    <p style={{ fontWeight: 500 }}>
                                        {caseData.responsible?.full_name || '-'}
                                    </p>
                                </div>

                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                        Creado por
                                    </p>
                                    <p style={{ fontWeight: 500 }}>
                                        {caseData.creator?.full_name || '-'}
                                    </p>
                                </div>

                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                        Fecha de creación
                                    </p>
                                    <p style={{ fontSize: '0.875rem' }}>
                                        {formatDateTime(caseData.created_at)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Related Tests */}
                        {relatedTests.length > 0 && (
                            <div className="card" style={{ marginTop: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                                    Pruebas Relacionadas ({relatedTests.length})
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {relatedTests.map((test) => (
                                        <Link
                                            key={test.id}
                                            href={`/tests/${test.id}`}
                                            style={{
                                                display: 'block',
                                                padding: '0.75rem',
                                                background: 'var(--bg-secondary)',
                                                borderRadius: 'var(--radius-md)',
                                                textDecoration: 'none',
                                            }}
                                        >
                                            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                                {test.title}
                                            </div>
                                            {test.status && <StatusBadge status={test.status} size="sm" />}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <ReportModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                content={reportContent}
                loading={reportLoading}
                title={caseData.title}
            />
        </>
    );
}
