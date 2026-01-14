'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/lib/sweetalert';
import LiquidLoader from '@/components/LiquidLoader';
import Navbar from '@/components/Navbar';
import CaseSelector from '@/components/CaseSelector';
import ImageUpload from '@/components/ImageUpload';
import TestSelector from '@/components/TestSelector';
import { Case, Profile, Solution } from '@/types';
import { handleImagePaste, handleImageDrop } from '@/lib/imageUpload';
import { hasPermission } from '@/lib/permissions';

export default function EditSolutionPage() {
    const params = useParams();
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [solution, setSolution] = useState<Solution | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        case_id: '',
        title: '',
        description: '', // Novedad
        findings: '', // Hallazgos
        steps_to_reproduce: '',
        steps_to_resolve: '', // Solución
        final_result: '',
        observations: '',
        spl_app_url: '',
        additional_app_url: '',
        necessary_app: '',
        necessary_firmware: '',
        tests_performed: false,
        selected_tests: [] as string[]
    });

    const [attachments, setAttachments] = useState<string[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

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
            await loadSolution(profileData);
        }
    };

    const loadSolution = async (profileData: Profile) => {
        const { data: solutionData, error } = await supabase
            .from('solutions')
            .select(`
        *,
        case:cases!inner(
          id, title, description, created_at,
          application:applications(id, name, color),
          category:categories(id, name),
          case_type:case_types(id, name),
          status:statuses(id, name, color)
        )
      `)
            .eq('id', params.id)
            .is('deleted_at', null)
            .single();

        if (error || !solutionData) {
            showAlert('Error', 'Solución no encontrada', 'error');
            router.push('/solutions');
            return;
        }

        // Check permissions
        const canEdit = solutionData.created_by === profileData.id ||
            hasPermission(profileData.role, 'canManageConfig');

        if (!canEdit) {
            showAlert('Error', 'No tienes permisos para editar esta solución', 'error');
            router.push(`/solutions/${params.id}`);
            return;
        }

        setSolution(solutionData);

        // Load connected tests
        const { data: testData } = await supabase
            .from('solution_tests')
            .select('test_id')
            .eq('solution_id', params.id);

        const selectedTests = testData ? testData.map(t => t.test_id) : [];

        setFormData({
            case_id: solutionData.case_id,
            title: solutionData.title,
            description: solutionData.description || '',
            findings: solutionData.findings || '',
            steps_to_reproduce: solutionData.steps_to_reproduce || '',
            steps_to_resolve: solutionData.steps_to_resolve,
            final_result: solutionData.final_result || '',
            observations: solutionData.observations || '',
            spl_app_url: solutionData.spl_app_url || '',
            additional_app_url: solutionData.additional_app_url || '',
            necessary_app: solutionData.necessary_app || '',
            necessary_firmware: solutionData.necessary_firmware || '',
            tests_performed: solutionData.tests_performed || false,
            selected_tests: selectedTests
        });

        // Load existing attachments
        const { data: attachmentsData } = await supabase
            .from('solution_attachments')
            .select('*')
            .eq('solution_id', params.id);

        if (attachmentsData) {
            setExistingAttachments(attachmentsData);
        }

        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            // 1. Update solution
            const { error: updateError } = await supabase
                .from('solutions')
                .update({
                    title: formData.title,
                    description: formData.description,
                    findings: formData.findings,
                    steps_to_reproduce: formData.steps_to_reproduce,
                    steps_to_resolve: formData.steps_to_resolve,
                    final_result: formData.final_result,
                    observations: formData.observations,
                    spl_app_url: formData.spl_app_url,
                    additional_app_url: formData.additional_app_url,
                    necessary_app: formData.necessary_app,
                    necessary_firmware: formData.necessary_firmware,
                    tests_performed: formData.tests_performed
                })
                .eq('id', params.id);

            if (updateError) throw updateError;

            // 2. Manage tests relationship
            // First delete existing connection
            await supabase.from('solution_tests').delete().eq('solution_id', params.id);

            // Then insert new if enabled
            if (formData.tests_performed && formData.selected_tests.length > 0) {
                const testRecords = formData.selected_tests.map(testId => ({
                    solution_id: params.id,
                    test_id: testId
                }));
                const { error: testsError } = await supabase.from('solution_tests').insert(testRecords);
                if (testsError) throw testsError;
            }

            // 3. Save new attachments if any
            if (attachments.length > 0) {
                const { data: { user } } = await supabase.auth.getUser();
                const attachmentRecords = attachments.map(url => {
                    const fileName = url.split('/').pop() || 'image.jpg';
                    return {
                        solution_id: params.id,
                        file_url: url,
                        file_name: fileName,
                        file_type: 'image',
                        uploaded_by: user?.id
                    };
                });

                const { error: attachError } = await supabase
                    .from('solution_attachments')
                    .insert(attachmentRecords);

                if (attachError) throw attachError;
            }

            showAlert('Éxito', '✅ Solución actualizada exitosamente', 'success');
            router.push(`/solutions/${params.id}`);
        } catch (error: any) {
            showAlert('Error', '❌ Error al actualizar la solución: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        setUploading(true);
        await handleImagePaste(
            e.nativeEvent,
            `solutions/${params.id}`,
            (url) => setAttachments(prev => [...prev, url])
        );
        setUploading(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        setUploading(true);
        await handleImageDrop(
            e.nativeEvent,
            `solutions/${params.id}`,
            (url) => setAttachments(prev => [...prev, url])
        );
        setUploading(false);
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

    return (
        <>
            <Navbar />
            <main className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1000px' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <Link href={`/solutions/${params.id}`} style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        ← Volver a Detalle
                    </Link>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem' }}>
                        Editar Solución (Formato Reporte)
                    </h1>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Header: Cliente y Título */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label className="label">Título de la Solución *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                style={{ fontSize: '1.1rem', fontWeight: 600 }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="label">Caso Relacionado</label>
                            <CaseSelector
                                value={formData.case_id}
                                onChange={() => { }} // Disabled
                                preSelectedId={formData.case_id}
                                disabled={true}
                            />
                            {solution && (
                                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                    <p><strong>Cliente:</strong> {solution.case?.application?.name || '-'}</p>
                                    <p><strong>Caso:</strong> {solution.case?.title}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Novedad y Hallazgos */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                            Análisis del Problema
                        </h2>

                        <div className="form-group">
                            <label className="label">Novedad (Descripción) *</label>
                            <textarea
                                className="input textarea"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                onPaste={handlePaste}
                                onDrop={handleDrop}
                                rows={4}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="label">Hallazgos *</label>
                            <textarea
                                className="input textarea"
                                value={formData.findings}
                                onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                                onPaste={handlePaste}
                                onDrop={handleDrop}
                                rows={4}
                                required
                            />
                        </div>
                    </div>

                    {/* Pruebas */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                                Reporte de Pruebas
                            </h2>
                            <label className="switch" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.tests_performed}
                                    onChange={(e) => setFormData({ ...formData, tests_performed: e.target.checked })}
                                    style={{ width: '20px', height: '20px' }}
                                />
                                <span style={{ fontWeight: 500 }}>¿Se realizaron pruebas?</span>
                            </label>
                        </div>

                        {formData.tests_performed && (
                            <div className="form-group">
                                <label className="label">Seleccionar Pruebas Realizadas</label>
                                <TestSelector
                                    selectedIds={formData.selected_tests}
                                    onChange={(ids) => setFormData({ ...formData, selected_tests: ids })}
                                />
                            </div>
                        )}
                    </div>

                    {/* Solución */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                            Solución Aplicada
                        </h2>

                        <div className="form-group">
                            <label className="label">Pasos para Resolver (Solución) *</label>
                            <textarea
                                className="input textarea"
                                value={formData.steps_to_resolve}
                                onChange={(e) => setFormData({ ...formData, steps_to_resolve: e.target.value })}
                                onPaste={handlePaste}
                                onDrop={handleDrop}
                                rows={6}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="label">Resultado Final</label>
                            <textarea
                                className="input textarea"
                                value={formData.final_result}
                                onChange={(e) => setFormData({ ...formData, final_result: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Información Importante */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                            Información Importante
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-group">
                                <label className="label">URL Aplicativo SPL</label>
                                <input
                                    type="url"
                                    className="input"
                                    value={formData.spl_app_url}
                                    onChange={(e) => setFormData({ ...formData, spl_app_url: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">URL Aplicativo Adicional</label>
                                <input
                                    type="url"
                                    className="input"
                                    value={formData.additional_app_url}
                                    onChange={(e) => setFormData({ ...formData, additional_app_url: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Aplicativo Necesario</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.necessary_app}
                                    onChange={(e) => setFormData({ ...formData, necessary_app: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Firmware Necesario</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.necessary_firmware}
                                    onChange={(e) => setFormData({ ...formData, necessary_firmware: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Images */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                            Imágenes Adjuntas
                        </h2>

                        {existingAttachments.length > 0 && (
                            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                                {existingAttachments.length} imágenes existentes.
                            </p>
                        )}

                        <ImageUpload
                            folder={`solutions/${params.id}`}
                            onUploadComplete={(url) => setAttachments([...attachments, url])}
                            disabled={saving}
                        />
                        {attachments.length > 0 && (
                            <div style={{ marginTop: '1rem' }}>
                                <p style={{ color: 'var(--text-secondary)' }}>{attachments.length} nuevas imágenes.</p>
                                <button type="button" onClick={() => setAttachments([])} className="btn btn-secondary btn-sm">Limpiar Nuevas</button>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving}
                            style={{ flex: 1 }}
                        >
                            {saving ? 'Guardando...' : '💾 Guardar Cambios'}
                        </button>
                        <Link href={`/solutions/${params.id}`} className="btn btn-secondary">
                            Cancelar
                        </Link>
                    </div>
                </form>
            </main>
        </>
    );
}
