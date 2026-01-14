'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/lib/sweetalert';
import Navbar from '@/components/Navbar';
import ImageUpload from '@/components/ImageUpload';
import { Application, Category, CaseType, Status, Profile } from '@/types';

export default function NewCasePage() {
    const [loading, setLoading] = useState(false);
    const [applications, setApplications] = useState<Application[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [caseTypes, setCaseTypes] = useState<CaseType[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [users, setUsers] = useState<Profile[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        application_id: '',
        category_id: '',
        case_type_id: '',
        status_id: '',
        responsible_id: '',
    });

    const [attachments, setAttachments] = useState<string[]>([]);

    const router = useRouter();

    useEffect(() => {
        loadFormData();
    }, []);

    const loadFormData = async () => {
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
        if (statusesRes.data) {
            setStatuses(statusesRes.data);
            if (statusesRes.data.length > 0) {
                setFormData(prev => ({ ...prev, status_id: statusesRes.data[0].id }));
            }
        }
        if (usersRes.data) setUsers(usersRes.data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await supabase
                .from('cases')
                .insert([{
                    ...formData,
                    created_by: user?.id,
                }])
                .select()
                .single();

            if (error) throw error;

            // Save attachments
            if (attachments.length > 0) {
                const attachmentRecords = attachments.map(url => ({
                    case_id: data.id,
                    file_url: url,
                    uploaded_by: user?.id,
                }));

                await supabase.from('case_attachments').insert(attachmentRecords);
            }

            router.push(`/cases/${data.id}`);
        } catch (error: any) {
            console.error('Error creating case:', error);
            showAlert('Error', 'Error al crear el caso: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <main className="container" style={{ padding: '2rem 1.5rem', maxWidth: '800px' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-formal)' }}>
                    Nuevo Caso
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    Registra un nuevo caso en el sistema
                </p>

                <form onSubmit={handleSubmit} className="card" style={{ boxShadow: 'var(--shadow-formal)' }}>
                    <div className="form-group">
                        <label className="label" htmlFor="title">
                            Título *
                        </label>
                        <input
                            id="title"
                            type="text"
                            className="input"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="label" htmlFor="description">
                            Descripción
                        </label>
                        <textarea
                            id="description"
                            className="input textarea"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label" htmlFor="application">
                                Aplicación
                            </label>
                            <select
                                id="application"
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
                            <label className="label" htmlFor="category">
                                Categoría
                            </label>
                            <select
                                id="category"
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
                            <label className="label" htmlFor="case_type">
                                Tipo de Caso
                            </label>
                            <select
                                id="case_type"
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
                            <label className="label" htmlFor="status">
                                Estado *
                            </label>
                            <select
                                id="status"
                                className="input select"
                                value={formData.status_id}
                                onChange={(e) => setFormData({ ...formData, status_id: e.target.value })}
                                required
                            >
                                {statuses.map((status) => (
                                    <option key={status.id} value={status.id}>{status.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="label">
                            Imágenes Adjuntas
                        </label>
                        <ImageUpload
                            folder="temp"
                            onUploadComplete={(url) => setAttachments([...attachments, url])}
                            disabled={loading}
                        />
                        {attachments.length > 0 && (
                            <div style={{ marginTop: '1rem' }}>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                    {attachments.length} imagen(es) lista(s) para adjuntar
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setAttachments([])}
                                    className="btn btn-secondary btn-sm"
                                >
                                    Limpiar Todas
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="label" htmlFor="responsible">
                            Responsable
                        </label>
                        <select
                            id="responsible"
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

                    <div className="flex gap-4" style={{ marginTop: '2rem' }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Creando...' : 'Crear Caso'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => router.back()}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </main>
        </>
    );
}
