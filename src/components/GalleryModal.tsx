'use client';

import React, { useState } from 'react';
import { formatDateTime } from '@/lib/utils';

interface GalleryModalProps {
    attachments: {
        id: string;
        file_url: string;
        created_at: string;
    }[];
    onClose: () => void;
}

export default function GalleryModal({ attachments, onClose }: GalleryModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % attachments.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + attachments.length) % attachments.length);
    };

    if (attachments.length === 0) return null;

    const currentImage = attachments[currentIndex];

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '2rem',
                    cursor: 'pointer',
                    zIndex: 10001
                }}
            >
                ✕
            </button>

            <button
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                style={{
                    position: 'absolute',
                    left: '20px',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: 'white',
                    fontSize: '2rem',
                    cursor: 'pointer',
                    padding: '1rem',
                    borderRadius: '50%',
                    zIndex: 10001
                }}
            >
                ‹
            </button>

            <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', maxHeight: '90%', textAlign: 'center' }}>
                <img
                    src={currentImage.file_url}
                    alt="Gallery"
                    style={{
                        maxWidth: '100%',
                        maxHeight: '80vh',
                        objectFit: 'contain',
                        borderRadius: '4px'
                    }}
                />
                <div style={{ color: 'white', marginTop: '1rem', fontSize: '1.1rem' }}>
                    <p>Imagen {currentIndex + 1} de {attachments.length}</p>
                    <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                        Subida el {formatDateTime(currentImage.created_at)}
                    </p>
                </div>
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                style={{
                    position: 'absolute',
                    right: '20px',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: 'white',
                    fontSize: '2rem',
                    cursor: 'pointer',
                    padding: '1rem',
                    borderRadius: '50%',
                    zIndex: 10001
                }}
            >
                ›
            </button>

            {/* Thumbnails Strip */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '10px',
                maxWidth: '80%',
                overflowX: 'auto',
                padding: '10px',
                zIndex: 10001
            }} onClick={(e) => e.stopPropagation()}>
                {attachments.map((att, idx) => (
                    <img
                        key={att.id}
                        src={att.file_url}
                        alt="Thumbnail"
                        onClick={() => setCurrentIndex(idx)}
                        style={{
                            width: '60px',
                            height: '60px',
                            objectFit: 'cover',
                            cursor: 'pointer',
                            opacity: idx === currentIndex ? 1 : 0.5,
                            border: idx === currentIndex ? '2px solid white' : 'none',
                            borderRadius: '4px'
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
