'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { Application } from '@/types';

export default function AdminApplicationsPage() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Application | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        color: '#3B82F6',
    });

    useEffect(() => {
        loadApplications();
    }, []);

    const loadApplications = async () => {
        const { data } = await supabase
            .from('applications')
            .select('*')
            .is('deleted_at', null)
            .order('name');

        if (data) setApplications(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (editing) {
            await supabase
                .from('applications')
                .update(formData)
                .eq('id', editing.id);
        } else {
            await supabase
                .from('applications')
                .insert([formData]);
        }
        setShowModal(false);
        loadApplications();
        resetForm();
    };

    const handleEdit = (app: Application) => {
        setEditing(app);
        setFormData({
            name: app.name,
            description: app.description || '',
            color: app.color || '#3B82F6',
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setEditing(null);
        setFormData({
            name: '',
            description: '',
            color: '#3B82F6',
        });
    };

    return (
        <>
            <Navbar />
            <main className="container" style={{ padding: '2rem 1.5rem' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Gestión de Aplicaciones</h1>
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="btn btn-primary"
                    >
                        + Nueva Aplicación
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <div className="loading" style={{ width: '48px', height: '48px', margin: '0 auto' }} />
                    </div>
                ) : (
                    <div className="grid grid-cols-3">
                        {applications.map((app) => (
                            <div key={app.id} className="card card-hover">
                                <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: 'var(--radius-md)',
                                        background: app.color || '#ccc',
                                    }} />
                                    <div>
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                                            {app.name}
                                        </h3>
                                    </div>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                                    {app.description || 'Sin descripción'}
                                </p>
                                <button
                                    onClick={() => handleEdit(app)}
                                    className="btn btn-secondary btn-sm"
                                >
                                    Editar
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">
                                    {editing ? 'Editar Aplicación' : 'Nueva Aplicación'}
                                </h2>
                                <button onClick={() => setShowModal(false)} style={{ fontSize: '1.5rem' }}>×</button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="label">Nombre *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">Descripción</label>
                                    <textarea
                                        className="input textarea"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">Color</label>
                                    <input
                                        type="color"
                                        className="input"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button onClick={handleSave} className="btn btn-primary">
                                    Guardar
                                </button>
                                <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
