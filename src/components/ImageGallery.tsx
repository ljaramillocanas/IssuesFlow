'use client';

import React, { useState } from 'react';
import { formatDateTime } from '@/lib/utils';

interface Attachment {
    id: string;
    file_url: string;
    created_at: string;
}

interface ImageGalleryProps {
    attachments: Attachment[];
    onDelete?: (id: string, url: string) => Promise<void>;
    canDelete?: boolean;
}

export default function ImageGallery({ attachments, onDelete, canDelete = false }: ImageGalleryProps) {
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    const handleDelete = async (id: string, url: string) => {
        if (!onDelete) return;

        if (!confirm('¿Estás seguro de eliminar esta imagen?')) return;

        setDeleting(id);
        try {
            await onDelete(id, url);
        } finally {
            setDeleting(null);
        }
    };

    if (attachments.length === 0) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: 'var(--text-secondary)',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
            }}>
                No hay imágenes adjuntas
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-3 gap-4">
                {attachments.map((attachment) => (
                    <div
                        key={attachment.id}
                        className="card card-hover"
                        style={{ padding: '0.5rem', position: 'relative' }}
                    >
                        <a href={attachment.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                            <img
                                src={attachment.file_url}
                                alt={`Adjunto ${formatDateTime(attachment.created_at)}`}
                                style={{
                                    width: '100%',
                                    height: '150px',
                                    objectFit: 'cover',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    backgroundColor: '#f3f4f6' // Placeholder color
                                }}
                                onError={(e) => {
                                    e.currentTarget.src = 'https://placehold.co/400x300?text=Error+Carga';
                                    e.currentTarget.style.objectFit = 'contain';
                                }}
                            />
                        </a>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {formatDateTime(attachment.created_at)}
                        </div>
                        {canDelete && onDelete && (
                            <button
                                onClick={() => handleDelete(attachment.id, attachment.file_url)}
                                disabled={deleting === attachment.id}
                                style={{
                                    position: 'absolute',
                                    top: '0.75rem',
                                    right: '0.75rem',
                                    background: 'var(--danger)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '28px',
                                    height: '28px',
                                    cursor: deleting === attachment.id ? 'not-allowed' : 'pointer',
                                    fontSize: '1rem',
                                    opacity: deleting === attachment.id ? 0.5 : 1,
                                }}
                                className="hover:opacity-80"
                            >
                                {deleting === attachment.id ? '⏳' : '🗑️'}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Lightbox Modal */}
            {lightboxImage && (
                <div
                    className="modal-overlay"
                    onClick={() => setLightboxImage(null)}
                    style={{ zIndex: 1000 }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'relative',
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                        }}
                    >
                        <img
                            src={lightboxImage}
                            alt="Full size"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '90vh',
                                borderRadius: 'var(--radius-md)',
                            }}
                        />
                        <button
                            onClick={() => setLightboxImage(null)}
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                background: 'var(--danger)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                            }}
                            className="hover:opacity-80"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
