'use client';

import React, { useState, useRef } from 'react';
import { showAlert } from '@/lib/sweetalert';

interface ImageUploadProps {
    onUploadComplete: (url: string) => void;
    folder: string;
    disabled?: boolean;
    mode?: 'dropzone' | 'button';
}

export default function ImageUpload({ onUploadComplete, folder, disabled, mode = 'dropzone' }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (file: File) => {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showAlert('Error', 'Por favor selecciona solo archivos de imagen', 'warning');
            return;
        }

        // Validate file size (50MB max)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            showAlert('Error', 'La imagen no debe superar 50MB', 'warning');
            return;
        }

        // Show preview (only for dropzone)
        if (mode === 'dropzone') {
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }

        // Upload
        setUploading(true);
        try {
            const { uploadImage } = await import('@/lib/storage');
            const url = await uploadImage(file, folder);

            if (url) {
                onUploadComplete(url);
                setPreview(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        } catch (error: any) {
            console.error('Error uploading image:', error);
            showAlert('Error', `Error al subir imagen: ${error.message}`, 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (disabled || uploading || mode === 'button') return;

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                }}
                disabled={disabled || uploading}
            />

            {mode === 'button' ? (
                <button
                    type="button"
                    onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
                    className="btn btn-primary"
                    disabled={disabled || uploading}
                    style={{ width: '100%', maxWidth: '200px' }}
                >
                    {uploading ? 'Subiendo...' : '+ Agregar Imagen'}
                </button>
            ) : (
                <div
                    onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    style={{
                        border: '2px dashed var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '2rem',
                        textAlign: 'center',
                        cursor: disabled || uploading ? 'not-allowed' : 'pointer',
                        background: 'var(--bg-secondary)',
                        transition: 'all var(--transition-fast)',
                        opacity: disabled || uploading ? 0.5 : 1,
                    }}
                    className="hover:border-primary"
                >
                    {preview ? (
                        <div>
                            <img
                                src={preview}
                                alt="Preview"
                                style={{
                                    maxWidth: '200px',
                                    maxHeight: '200px',
                                    margin: '0 auto',
                                    borderRadius: 'var(--radius-sm)',
                                }}
                            />
                            {uploading && (
                                <p style={{ marginTop: '1rem', color: 'var(--primary)' }}>
                                    Subiendo...
                                </p>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📎</div>
                            <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                                {uploading ? 'Subiendo...' : 'Click o arrastra una imagen'}
                            </p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                PNG, JPG, GIF hasta 50MB
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
