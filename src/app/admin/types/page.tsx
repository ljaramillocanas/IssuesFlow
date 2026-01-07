'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { CaseType, TestType } from '@/types';

export default function AdminTypesPage() {
    const [caseTypes, setCaseTypes] = useState<CaseType[]>([]);
    const [testTypes, setTestTypes] = useState<TestType[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'case' | 'test'>('case');
    const [editing, setEditing] = useState<CaseType | TestType | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });

    useEffect(() => {
        loadTypes();
    }, []);

    const loadTypes = async () => {
        const [caseRes, testRes] = await Promise.all([
            supabase.from('case_types').select('*').is('deleted_at', null).order('name'),
            supabase.from('test_types').select('*').is('deleted_at', null).order('name'),
        ]);

        if (caseRes.data) setCaseTypes(caseRes.data);
        if (testRes.data) setTestTypes(testRes.data);
        setLoading(false);
    };

    const handleSave = async () => {
        const table = activeTab === 'case' ? 'case_types' : 'test_types';

        if (editing) {
            await supabase
                .from(table)
                .update(formData)
                .eq('id', editing.id);
        } else {
            await supabase
                .from(table)
                .insert([formData]);
        }
        setShowModal(false);
        loadTypes();
        resetForm();
    };

    const handleEdit = (type: CaseType | TestType, tab: 'case' | 'test') => {
        setActiveTab(tab);
        setEditing(type);
        setFormData({
            name: type.name,
            description: type.description || '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string, tab: 'case' | 'test') => {
        if (confirm('¿Estás seguro de eliminar este tipo?')) {
            const table = tab === 'case' ? 'case_types' : 'test_types';
            await supabase
                .from(table)
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);
            loadTypes();
        }
    };

    const resetForm = () => {
        setEditing(null);
        setFormData({
            name: '',
            description: '',
        });
    };

    return (
        <>
            <Navbar />
            <main className="container" style={{ padding: '2rem 1.5rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem' }}>
                    Gestión de Tipos
                </h1>

                {/* Tabs */}
                <div className="flex gap-4" style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
                    <button
                        onClick={() => setActiveTab('case')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'case' ? '2px solid var(--primary)' : '2px solid transparent',
                            color: activeTab === 'case' ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        Tipos de Caso
                    </button>
                    <button
                        onClick={() => setActiveTab('test')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'test' ? '2px solid var(--primary)' : '2px solid transparent',
                            color: activeTab === 'test' ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        Tipos de Prueba
                    </button>
                </div>

                <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {activeTab === 'case' ? 'Tipos de caso disponibles' : 'Tipos de prueba disponibles'}
                    </p>
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="btn btn-primary"
                    >
                        + Nuevo Tipo
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <div className="loading" style={{ width: '48px', height: '48px', margin: '0 auto' }} />
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Descripción</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {(activeTab === 'case' ? caseTypes : testTypes).map((type) => (
                                    <tr key={type.id}>
                                        <td style={{ fontWeight: 500 }}>{type.name}</td>
                                        <td>{type.description || '-'}</td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(type, activeTab)}
                                                    className="btn btn-secondary btn-sm"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(type.id, activeTab)}
                                                    className="btn btn-danger btn-sm"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">
                                    {editing ? 'Editar Tipo' : 'Nuevo Tipo'}
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
