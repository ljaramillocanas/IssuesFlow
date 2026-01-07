'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { Status } from '@/types';

export default function AdminStatusesPage() {
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingStatus, setEditingStatus] = useState<Status | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        color: '#3B82F6',
        is_final: false,
        display_order: 0,
    });

    useEffect(() => {
        loadStatuses();
    }, []);

    const loadStatuses = async () => {
        const { data } = await supabase
            .from('statuses')
            .select('*')
            .is('deleted_at', null)
            .order('display_order');

        if (data) setStatuses(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (editingStatus) {
            await supabase
                .from('statuses')
                .update(formData)
                .eq('id', editingStatus.id);
        } else {
            await supabase
                .from('statuses')
                .insert([formData]);
        }
        setShowModal(false);
        loadStatuses();
        resetForm();
    };

    const handleEdit = (status: Status) => {
        setEditingStatus(status);
        setFormData({
            name: status.name,
            description: status.description || '',
            color: status.color || '#3B82F6',
            is_final: status.is_final,
            display_order: status.display_order,
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar este estado?')) {
            await supabase
                .from('statuses')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);
            loadStatuses();
        }
    };

    const resetForm = () => {
        setEditingStatus(null);
        setFormData({
            name: '',
            description: '',
            color: '#3B82F6',
            is_final: false,
            display_order: 0,
        });
    };

    return (
        <>
            <Navbar />
            <main className="container" style={{ padding: '2rem 1.5rem' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Gestión de Estados</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Configura los estados disponibles para casos y pruebas
                        </p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="btn btn-primary"
                    >
                        + Nuevo Estado
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
                                    <th>Color</th>
                                    <th>Estado Final</th>
                                    <th>Orden</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {statuses.map((status) => (
                                    <tr key={status.id}>
                                        <td style={{ fontWeight: 500 }}>{status.name}</td>
                                        <td>{status.description || '-'}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '4px',
                                                    background: status.color || '#ccc',
                                                }} />
                                                {status.color}
                                            </div>
                                        </td>
                                        <td>{status.is_final ? '✓ Sí' : 'No'}</td>
                                        <td>{status.display_order}</td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(status)}
                                                    className="btn btn-secondary btn-sm"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(status.id)}
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

                {/* Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">
                                    {editingStatus ? 'Editar Estado' : 'Nuevo Estado'}
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="label">Color</label>
                                        <input
                                            type="color"
                                            className="input"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Orden</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={formData.display_order}
                                            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.is_final}
                                            onChange={(e) => setFormData({ ...formData, is_final: e.target.checked })}
                                        />
                                        <span>Estado Final (bloquea ediciones)</span>
                                    </label>
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
