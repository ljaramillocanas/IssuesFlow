'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/lib/sweetalert';
import { ResourceType, Solution, SolutionResource } from '@/types';

interface EditResourceModalProps {
    resource: SolutionResource;
    existingFolders: string[];
    solutions?: Pick<Solution, 'id' | 'title'>[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditResourceModal({ resource, existingFolders, solutions, onClose, onSuccess }: EditResourceModalProps) {
    const [title, setTitle] = useState(resource.title);
    const [type, setType] = useState<ResourceType>(resource.type);
    const [url, setUrl] = useState(resource.url);
    const [folder, setFolder] = useState(resource.folder);
    const [description, setDescription] = useState(resource.description || '');
    const [selectedSolution, setSelectedSolution] = useState(resource.solution_id || '');
    const [updating, setUpdating] = useState(false);

    const handleUpdate = async () => {
        if (!title.trim()) {
            showAlert('Error', 'Por favor ingrese un título', 'warning');
            return;
        }

        setUpdating(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error: updateError } = await supabase
                .from('solution_resources')
                .update({
                    title,
                    folder,
                    description: description || null,
                    solution_id: selectedSolution || null,
                    // Note: We don't update type or url as those would require re-uploading
                })
                .eq('id', resource.id);

            if (updateError) throw updateError;

            onSuccess();
        } catch (error: any) {
            console.error('Error updating resource:', error);
            showAlert('Error', 'Error al actualizar el recurso: ' + error.message, 'error');
        } finally {
            setUpdating(false);
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
                    maxWidth: '600px',
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
                        ✏️ Editar Recurso
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: 0 }}>
                        Modifica la información del recurso
                    </p>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
                    {/* Resource Type (read-only) */}
                    <div className="form-group">
                        <label className="label">Tipo de Recurso (No editable)</label>
                        <div style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span style={{ fontSize: '1.25rem' }}>
                                {type === 'video' ? '🎥' : type === 'image' ? '🖼️' : type === 'document' ? '📄' : '🔗'}
                            </span>
                            {type}
                        </div>
                    </div>

                    {/* URL (read-only) */}
                    <div className="form-group">
                        <label className="label">URL (No editable)</label>
                        <div style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {url}
                        </div>
                    </div>

                    {/* Solution Selector (optional) */}
                    {solutions && solutions.length > 0 && (
                        <div className="form-group">
                            <label className="label">Solución (Opcional)</label>
                            <select
                                className="input"
                                value={selectedSolution}
                                onChange={(e) => setSelectedSolution(e.target.value)}
                            >
                                <option value="">Sin vincular a solución</option>
                                {solutions.map((sol) => (
                                    <option key={sol.id} value={sol.id}>
                                        {sol.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Title */}
                    <div className="form-group">
                        <label className="label">Título *</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Nombre del recurso"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    {/* Folder */}
                    <div className="form-group">
                        <label className="label">Carpeta</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Escribe o selecciona una carpeta"
                            value={folder}
                            onChange={(e) => setFolder(e.target.value)}
                            list="folders-list-edit"
                        />
                        <datalist id="folders-list-edit">
                            {existingFolders.map((f) => (
                                <option key={f} value={f} />
                            ))}
                        </datalist>
                    </div>

                    {/* Description */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="label">Descripción (Opcional)</label>
                        <textarea
                            className="input"
                            rows={3}
                            placeholder="Agrega una descripción..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
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
                        disabled={updating}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleUpdate}
                        className="btn btn-primary"
                        disabled={updating || !title.trim()}
                    >
                        {updating ? (
                            <>
                                <span style={{ width: '16px', height: '16px', marginRight: '0.5rem', display: 'inline-block', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                Actualizando...
                            </>
                        ) : (
                            '✓ Guardar Cambios'
                        )}
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
        </div >
    );
}
