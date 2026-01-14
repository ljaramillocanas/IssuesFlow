'use client';

import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ResourceType, Solution } from '@/types';
import { showAlert } from '@/lib/sweetalert';

interface ResourceModalProps {
    solutionId?: string; // Optional now - required if from solution detail, optional if from repository
    existingFolders: string[];
    solutions?: Pick<Solution, 'id' | 'title'>[]; // Optional - only needed when solutionId is not provided
    onClose: () => void;
    onSuccess: () => void;
}

export default function ResourceModal({ solutionId, existingFolders, solutions, onClose, onSuccess }: ResourceModalProps) {
    const [selectedSolution, setSelectedSolution] = useState(solutionId || '');
    const [title, setTitle] = useState('');
    const [type, setType] = useState<ResourceType>('document');
    const [url, setUrl] = useState('');
    const [folder, setFolder] = useState('General');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-detect type from URL
    const handleUrlChange = (value: string) => {
        setUrl(value);

        // Auto-detect YouTube
        if (value.includes('youtube.com') || value.includes('youtu.be')) {
            setType('video');
            if (!title) {
                setTitle('Video de YouTube');
            }
        }
        // Auto-detect common image extensions
        else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value)) {
            setType('image');
        }
        // Auto-detect document extensions
        else if (/\.(pdf|doc|docx|xls|xlsx|txt)$/i.test(value)) {
            setType('document');
        }
    };

    // Handle drag events
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            setFile(droppedFile);
            if (!title) {
                setTitle(droppedFile.name);
            }

            // Auto-detect type from file
            if (droppedFile.type.startsWith('image/')) {
                setType('image');
            } else if (droppedFile.type.startsWith('video/')) {
                setType('video');
            } else {
                setType('document');
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            if (!title) {
                setTitle(selectedFile.name);
            }

            if (selectedFile.type.startsWith('image/')) {
                setType('image');
            } else if (selectedFile.type.startsWith('video/')) {
                setType('video');
            } else {
                setType('document');
            }
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            showAlert('Error', 'Por favor ingrese un título', 'warning');
            return;
        }

        // Solution is now optional - no validation required

        setUploading(true);

        try {
            let finalUrl = url;
            let fileSize: number | null = null;
            let mimeType: string | null = null;

            // Upload file if selected
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${selectedSolution}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('solution-resources')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('solution-resources')
                    .getPublicUrl(fileName);

                finalUrl = publicUrl;
                fileSize = file.size;
                mimeType = file.type;
            }

            if (!file && !url.trim()) {
                showAlert('Error', 'Debe proporcionar una URL o subir un archivo', 'warning');
                setUploading(false);
                return;
            }

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();

            // Insert resource
            const { error: insertError } = await supabase
                .from('solution_resources')
                .insert({
                    solution_id: selectedSolution || null, // Allow null for independent resources
                    title,
                    type,
                    url: finalUrl,
                    folder,
                    description: description || null,
                    file_size: fileSize,
                    mime_type: mimeType,
                    created_by: user?.id
                });

            if (insertError) throw insertError;

            onSuccess();
        } catch (error: any) {
            console.error('Error creating resource:', error);
            showAlert('Error', 'Error al crear el recurso: ' + error.message, 'error');
        } finally {
            setUploading(false);
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
                        📎 Agregar Recurso
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: 0 }}>
                        Sube archivos o agrega enlaces a videos y documentos
                    </p>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
                    {/* Type Selection */}
                    <div className="form-group">
                        <label className="label">Tipo de Recurso</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                            {[
                                { value: 'document', icon: '📄', label: 'Documento' },
                                { value: 'image', icon: '🖼️', label: 'Imagen' },
                                { value: 'video', icon: '🎥', label: 'Video' },
                                { value: 'link', icon: '🔗', label: 'Enlace' }
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setType(option.value as ResourceType)}
                                    style={{
                                        padding: '0.75rem',
                                        border: `2px solid ${type === option.value ? 'var(--primary)' : 'var(--border-color)'}`,
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: type === option.value ? 'var(--primary)15' : 'var(--bg-secondary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        fontSize: '0.875rem',
                                        fontWeight: 500
                                    }}
                                >
                                    <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{option.icon}</div>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Drag and Drop / File Upload */}
                    {(type === 'document' || type === 'image' || type === 'video') && (
                        <div className="form-group">
                            <label className="label">Archivo</label>
                            <div
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-color)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    padding: '2rem',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    backgroundColor: dragActive ? 'var(--primary)10' : 'var(--bg-secondary)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                    accept={type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : '*'}
                                />
                                {file ? (
                                    <div>
                                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                                        <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{file.name}</p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📤</div>
                                        <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                                            Arrastra un archivo aquí
                                        </p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            o haz clic para seleccionar
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* URL Input (for links and videos) */}
                    {(type === 'link' || type === 'video') && !file && (
                        <div className="form-group">
                            <label className="label">
                                {type === 'video' ? 'URL de YouTube' : 'URL del Enlace'}
                            </label>
                            <input
                                type="url"
                                className="input"
                                placeholder={type === 'video' ? 'https://youtube.com/watch?v=...' : 'https://...'}
                                value={url}
                                onChange={(e) => handleUrlChange(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Solution Selector (optional) */}
                    {!solutionId && solutions && solutions.length > 0 && (
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
                            list="folders-list"
                        />
                        <datalist id="folders-list">
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
                        disabled={uploading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="btn btn-primary"
                        disabled={uploading || !title}
                    >
                        {uploading ? (
                            <>
                                <span className="loading-liquid" style={{ width: '16px', height: '16px', marginRight: '0.5rem' }} />
                                Subiendo...
                            </>
                        ) : (
                            '✓ Agregar Recurso'
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
        </div>
    );
}
