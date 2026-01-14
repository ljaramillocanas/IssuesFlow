import React, { useState } from 'react';
import { formatDateTime } from '@/lib/utils';
import { showAlert, showConfirm } from '@/lib/sweetalert'; // Added import for showAlert and showConfirm
import MediaViewer from './MediaViewer';

interface Attachment {
    id: string;
    file_url: string;
    created_at: string;
    // Assuming file_url works as source, and we can guess type or name
}

interface ImageGalleryProps {
    attachments: Attachment[];
    onDelete?: (id: string, url: string) => Promise<void>;
    canDelete?: boolean;
}

export default function ImageGallery({ attachments, onDelete, canDelete = false }: ImageGalleryProps) {
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [deleting, setDeleting] = useState<string | null>(null);

    const isVideo = (url: string) => {
        const ext = url.split('.').pop()?.toLowerCase();
        return ['mp4', 'webm', 'ogg', 'mov'].includes(ext || ''); // Basic check
    };

    const mediaItems = attachments.map(att => ({
        id: att.id,
        url: att.file_url,
        type: isVideo(att.file_url) ? 'video' as const : 'image' as const,
        title: formatDateTime(att.created_at)
    }));

    const handleDelete = async (id: string, url: string) => {
        if (!onDelete) return;
        const confirmed = await showConfirm('¿Estás seguro de eliminar este archivo?'); // Replaced confirm with showConfirm
        if (!confirmed) return;

        setDeleting(id);
        try {
            await onDelete(id, url);
            showAlert('Éxito', 'Archivo eliminado', 'success'); // Added success alert
        } catch (error: any) {
            console.error('Error deleting attachment:', error);
            showAlert('Error', 'Error al eliminar archivo: ' + error.message, 'error'); // Added error alert
        } finally {
            setDeleting(null);
        }
    };

    const openViewer = (index: number) => {
        setViewerIndex(index);
        setViewerOpen(true);
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
                No hay archivos adjuntos
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {attachments.map((attachment, index) => {
                    const video = isVideo(attachment.file_url);
                    return (
                        <div
                            key={attachment.id}
                            className="card card-hover"
                            style={{ padding: '0.5rem', position: 'relative', overflow: 'hidden' }}
                        >
                            <div
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openViewer(index);
                                }}
                                style={{ cursor: 'pointer', position: 'relative', height: '150px' }}
                            >
                                {video ? (
                                    <div style={{
                                        width: '100%', height: '100%',
                                        backgroundColor: '#000',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: 'var(--radius-sm)'
                                    }}>
                                        <span style={{ fontSize: '2rem' }}>▶️</span>
                                    </div>
                                ) : (
                                    <img
                                        src={attachment.file_url}
                                        alt={`Adjunto ${formatDateTime(attachment.created_at)}`}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            borderRadius: 'var(--radius-sm)',
                                            backgroundColor: '#f3f4f6'
                                        }}
                                        onError={(e) => {
                                            e.currentTarget.src = 'https://placehold.co/400x300?text=Error';
                                        }}
                                    />
                                )}
                            </div>

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
                                        background: 'rgba(239, 68, 68, 0.9)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '28px',
                                        height: '28px',
                                        cursor: deleting === attachment.id ? 'not-allowed' : 'pointer',
                                        fontSize: '0.875rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        opacity: deleting === attachment.id ? 0.5 : 1,
                                        zIndex: 10
                                    }}
                                    className="hover:scale-110 transition-transform"
                                    title="Eliminar"
                                >
                                    {deleting === attachment.id ? '⏳' : '✕'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <MediaViewer
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                items={mediaItems}
                initialIndex={viewerIndex}
            />
        </>
    );
}
