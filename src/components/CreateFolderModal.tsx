'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/lib/sweetalert';

interface CreateFolderModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateFolderModal({ onClose, onSuccess }: CreateFolderModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('📁');
    const [color, setColor] = useState('#3B82F6');
    const [creating, setCreating] = useState(false);

    const iconOptions = ['📁', '📂', '🗂️', '📋', '📚', '📦', '🎯', '⭐', '🔧', '💡'];
    const colorOptions = [
        { name: 'Azul', value: '#3B82F6' },
        { name: 'Verde', value: '#10B981' },
        { name: 'Rojo', value: '#EF4444' },
        { name: 'Amarillo', value: '#F59E0B' },
        { name: 'Morado', value: '#8B5CF6' },
        { name: 'Rosa', value: '#EC4899' },
        { name: 'Gris', value: '#6B7280' },
    ];

    const handleCreate = async () => {
        if (!name.trim()) {
            showAlert('Error', 'Por favor ingresa un nombre para la carpeta', 'warning');
            return;
        }

        setCreating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No autenticado');

            const { error } = await supabase
                .from('resource_folders')
                .insert({
                    name: name.trim(),
                    description: description.trim() || null,
                    icon,
                    color,
                    created_by: user.id
                });

            if (error) {
                if (error.code === '23505') { // Unique constraint violation
                    showAlert('Error', 'Ya existe una carpeta con ese nombre', 'warning');
                    setCreating(false); // Assuming setLoading is equivalent to setCreating here
                    return;
                } else {
                    throw error;
                }
            }

            onSuccess();
        } catch (error: any) {
            console.error('Error creating folder:', error);
            showAlert('Error', 'Error al crear carpeta: ' + error.message, 'error');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                backdropFilter: 'blur(4px)',
                animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '500px',
                    background: 'var(--glass-surface)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    animation: 'slideUp 0.3s ease-out'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border-color)'
                }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-formal)' }}>
                        📁 Nueva Carpeta
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: 0 }}>
                        Organiza tus recursos en carpetas
                    </p>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem' }}>
                    {/* Name */}
                    <div className="form-group">
                        <label className="label">Nombre *</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Ej: Manuales, Diagramas, Videos..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label className="label">Descripción (Opcional)</label>
                        <textarea
                            className="input"
                            rows={2}
                            placeholder="Describe el contenido de esta carpeta..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Icon Selection */}
                    <div className="form-group">
                        <label className="label">Icono</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {iconOptions.map((iconOption) => (
                                <button
                                    key={iconOption}
                                    onClick={() => setIcon(iconOption)}
                                    style={{
                                        padding: '0.75rem',
                                        fontSize: '1.5rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: icon === iconOption ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                        backgroundColor: icon === iconOption ? 'var(--primary)15' : 'var(--bg-secondary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {iconOption}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Selection */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="label">Color</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {colorOptions.map((colorOption) => (
                                <button
                                    key={colorOption.value}
                                    onClick={() => setColor(colorOption.value)}
                                    style={{
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: 'var(--radius-md)',
                                        border: color === colorOption.value ? '3px solid var(--text-primary)' : '1px solid var(--border-color)',
                                        backgroundColor: colorOption.value,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                    title={colorOption.name}
                                >
                                    {color === colorOption.value && (
                                        <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '1.5rem' }}>
                                            ✓
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1.5rem',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                        disabled={creating}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCreate}
                        className="btn btn-primary"
                        disabled={creating || !name.trim()}
                    >
                        {creating ? 'Creando...' : '✓ Crear Carpeta'}
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
