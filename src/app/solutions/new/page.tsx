'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import CaseSelector from '@/components/CaseSelector';
import ImageUpload from '@/components/ImageUpload';
import TestSelector from '@/components/TestSelector';
import { Case, Profile } from '@/types';
import { handleImagePaste, handleImageDrop } from '@/lib/imageUpload';

export default function NewSolutionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preSelectedCaseId = searchParams?.get('case_id');

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);

    const [formData, setFormData] = useState({
        case_id: preSelectedCaseId || '',
        title: '',
        description: '', // This maps to "Novedad"
        findings: '', // This maps to "Hallazgos"
        steps_to_reproduce: '',
        steps_to_resolve: '', // This maps to "Solución" (steps)
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
    const tempSolutionId = `temp-${Date.now()}`;

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
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
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            // 1. Create solution
            const { data: solutionData, error: solutionError } = await supabase
                .from('solutions')
                .insert([{
                    case_id: formData.case_id,
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
                    tests_performed: formData.tests_performed,
                    created_by: user?.id
                }])
                .select()
                .single();

            if (solutionError) throw solutionError;

            // 2. Save attachments if any
            if (attachments.length > 0) {
                const attachmentRecords = attachments.map(url => {
                    const fileName = url.split('/').pop() || 'image.jpg';
                    return {
                        solution_id: solutionData.id,
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

            // 3. Save selected tests if tests_performed is true
            if (formData.tests_performed && formData.selected_tests.length > 0) {
                const testRecords = formData.selected_tests.map(testId => ({
                    solution_id: solutionData.id,
                    test_id: testId
                }));

                const { error: testsError } = await supabase
                    .from('solution_tests')
                    .insert(testRecords);

                if (testsError) throw testsError;
            }

            alert('✅ Solución creada exitosamente');
            router.push(`/solutions/${solutionData.id}`);
        } catch (error: any) {
            alert('❌ Error al crear la solución: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        setUploading(true);
        await handleImagePaste(
            e.nativeEvent,
            `solutions/${tempSolutionId}`,
            (url) => setAttachments(prev => [...prev, url])
        );
        setUploading(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        setUploading(true);
        await handleImageDrop(
            e.nativeEvent,
            `solutions/${tempSolutionId}`,
            (url) => setAttachments(prev => [...prev, url])
        );
        setUploading(false);
    };

    return (
        <>
            <Navbar />
            <main className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1000px' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <Link href="/solutions" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        ← Volver a Soluciones
                    </Link>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem' }}>
                        Nueva Solución (Formato Reporte)
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
                                placeholder="Ej: Solución Error Transacciones SPL Noviembre"
                                style={{ fontSize: '1.1rem', fontWeight: 600 }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="label">1. Cliente / Caso Relacionado *</label>
                            <CaseSelector
                                value={formData.case_id}
                                onChange={(caseId) => setFormData({ ...formData, case_id: caseId })}
                                onCaseSelect={setSelectedCase}
                                preSelectedId={preSelectedCaseId || undefined}
                            />
                        </div>

                        {selectedCase && (
                            <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                <p><strong>Cliente (Aplicación):</strong> {selectedCase.application?.name || '-'}</p>
                                <p><strong>Caso:</strong> {selectedCase.title}</p>
                            </div>
                        )}
                    </div>

                    {/* Novedad y Hallazgos */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                            2. Análisis del Problema
                        </h2>

                        <div className="form-group">
                            <label className="label">Novedad (Descripción del Reporte) *</label>
                            <textarea
                                className="input textarea"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                onPaste={handlePaste}
                                onDrop={handleDrop}
                                rows={4}
                                required
                                placeholder="Cliente reporta finalizando el mes..."
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
                                placeholder="Se realiza análisis en conjunto..."
                            />
                        </div>
                    </div>

                    {/* Pruebas */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                                3. Reporte de Pruebas
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
                            4. Solución Aplicada
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
                                placeholder="1. Backup de aplicativo...&#10;2. Garantizar versión...&#10;3. Actualizar firmware..."
                            />
                        </div>

                        <div className="form-group">
                            <label className="label">Resultado Final / Observaciones Finales</label>
                            <textarea
                                className="input textarea"
                                value={formData.final_result}
                                onChange={(e) => setFormData({ ...formData, final_result: e.target.value })}
                                rows={3}
                                placeholder="Se garantizó el funcionamiento correcto..."
                            />
                        </div>
                    </div>

                    {/* Información Importante */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                            5. Información Importante para Solución
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-group">
                                <label className="label">URL Aplicativo SPL (Opcional)</label>
                                <input
                                    type="url"
                                    className="input"
                                    value={formData.spl_app_url}
                                    onChange={(e) => setFormData({ ...formData, spl_app_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">URL Aplicativo Adicional (Opcional)</label>
                                <input
                                    type="url"
                                    className="input"
                                    value={formData.additional_app_url}
                                    onChange={(e) => setFormData({ ...formData, additional_app_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Aplicativo Necesario</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.necessary_app}
                                    onChange={(e) => setFormData({ ...formData, necessary_app: e.target.value })}
                                    placeholder="Ej: SPL v2467"
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Firmware Necesario</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.necessary_firmware}
                                    onChange={(e) => setFormData({ ...formData, necessary_firmware: e.target.value })}
                                    placeholder="Ej: PrintLink v5.14.2"
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '1rem' }}>
                            <label className="label">Responsable de Solución</label>
                            <input
                                type="text"
                                className="input"
                                value={profile?.full_name || 'Cargando...'}
                                disabled
                                style={{ backgroundColor: 'var(--bg-secondary)' }}
                            />
                        </div>
                    </div>

                    {/* Imágenes */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                            6. Imágenes Adjuntas
                        </h2>
                        <ImageUpload
                            folder={`solutions/${tempSolutionId}`}
                            onUploadComplete={(url) => setAttachments([...attachments, url])}
                            disabled={loading}
                        />
                        {attachments.length > 0 && (
                            <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                                {attachments.length} imagen(es) subida(s)
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2" style={{ paddingBottom: '2rem' }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ flex: 1 }}
                        >
                            {loading ? 'Guardando...' : '💾 Guardar Solución Completa'}
                        </button>
                        <Link href="/solutions" className="btn btn-secondary">
                            Cancelar
                        </Link>
                    </div>
                </form>
            </main>
        </>
    );
}
