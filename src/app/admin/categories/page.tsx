'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showAlert, showConfirm } from '@/lib/sweetalert';
import Navbar from '@/components/Navbar';
import { Category } from '@/types';
import LiquidLoader from '@/components/LiquidLoader';

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        const { data } = await supabase
            .from('categories')
            .select('*')
            .is('deleted_at', null)
            .order('name');

        if (data) setCategories(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (editing) {
            await supabase
                .from('categories')
                .update(formData)
                .eq('id', editing.id);
        } else {
            await supabase
                .from('categories')
                .insert([formData]);
        }
        setShowModal(false);
        loadCategories();
        resetForm();
    };

    const handleEdit = (category: Category) => {
        setEditing(category);
        setFormData({
            name: category.name,
            description: category.description || '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        const confirmed = await showConfirm('¿Estás seguro de eliminar esta categoría?');
        if (!confirmed) return;
        await supabase
            .from('categories')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
        loadCategories();
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
                <div className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Gestión de Categorías</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Configura las categorías disponibles
                        </p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="btn btn-primary"
                    >
                        + Nueva Categoría
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <LiquidLoader />
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
                                {categories.map((category) => (
                                    <tr key={category.id}>
                                        <td style={{ fontWeight: 500 }}>{category.name}</td>
                                        <td>{category.description || '-'}</td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(category)}
                                                    className="btn btn-secondary btn-sm"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(category.id)}
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
                                    {editing ? 'Editar Categoría' : 'Nueva Categoría'}
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
