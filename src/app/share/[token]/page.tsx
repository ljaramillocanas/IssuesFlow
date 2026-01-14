'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SolutionResource } from '@/types';
import LiquidLoader from '@/components/LiquidLoader';

export default function SharePage() {
    const params = useParams();
    const router = useRouter();
    const [resource, setResource] = useState<SolutionResource | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [requiresAuth, setRequiresAuth] = useState(false);

    useEffect(() => {
        loadSharedResource();
    }, [params.token]);

    const loadSharedResource = async () => {
        try {
            const token = params.token as string;

            // Try to load resource with public access
            const { data, error: fetchError } = await supabase
                .from('solution_resources')
                .select('*')
                .eq('share_token', token)
                .eq('share_enabled', true)
                .single();

            if (fetchError || !data) {
                setError('Recurso no encontrado o enlace inválido');
                setLoading(false);
                return;
            }

            // Check expiration
            if (data.share_expires_at && new Date(data.share_expires_at) < new Date()) {
                setError('Este enlace ha expirado');
                setLoading(false);
                return;
            }

            // Check if requires authentication
            if (data.share_permission === 'authenticated') {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setRequiresAuth(true);
                    setLoading(false);
                    return;
                }
            }

            setResource(data);
            setLoading(false);
        } catch (err: any) {
            console.error('Error loading shared resource:', err);
            setError('Error al cargar el recurso');
            setLoading(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'video': return '🎥';
            case 'image': return '🖼️';
            case 'document': return '📄';
            case 'link': return '🔗';
            default: return '📎';
        }
    };

    const getYoutubeEmbedUrl = (url: string) => {
        const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
        return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : null;
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-primary)'
            }}>
                <LiquidLoader />
            </div>
        );
    }

    if (requiresAuth) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-primary)',
                padding: '2rem'
            }}>
                <div className="card" style={{ maxWidth: '500px', textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-formal)' }}>
                        Autenticación Requerida
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        Este recurso requiere que inicies sesión para verlo
                    </p>
                    <button
                        onClick={() => router.push('/login')}
                        className="btn btn-primary"
                    >
                        Iniciar Sesión
                    </button>
                </div>
            </div>
        );
    }

    if (error || !resource) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-primary)',
                padding: '2rem'
            }}>
                <div className="card" style={{ maxWidth: '500px', textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❌</div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-formal)' }}>
                        Recurso No Disponible
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {error || 'El recurso que buscas no está disponible'}
                    </p>
                </div>
            </div>
        );
    }

    const youtubeEmbedUrl = resource.type === 'video' ? getYoutubeEmbedUrl(resource.url) : null;

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--bg-primary)',
            padding: '2rem'
        }}>
            {/* Header with Branding */}
            <div style={{
                maxWidth: '900px',
                margin: '0 auto 2rem',
                padding: '1.5rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                textAlign: 'center'
            }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-formal)', marginBottom: '0.5rem' }}>
                    SpeedIssuesFlow
                </h1>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Recurso Compartido
                </p>
            </div>

            {/* Resource Content */}
            <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* Resource Header */}
                <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '3rem' }}>{getIcon(resource.type)}</div>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-formal)' }}>
                                {resource.title}
                            </h2>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                <span>📁 {resource.folder}</span>
                                <span>📅 {new Date(resource.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    {resource.description && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
                            {resource.description}
                        </p>
                    )}
                </div>

                {/* Resource Viewer/Player */}
                <div style={{ padding: '2rem' }}>
                    {resource.type === 'video' && youtubeEmbedUrl ? (
                        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                            <iframe
                                src={youtubeEmbedUrl}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)'
                                }}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    ) : resource.type === 'image' ? (
                        <div style={{ textAlign: 'center' }}>
                            <img
                                src={resource.url}
                                alt={resource.title}
                                style={{
                                    maxWidth: '100%',
                                    height: 'auto',
                                    borderRadius: 'var(--radius-md)',
                                    boxShadow: 'var(--shadow-md)'
                                }}
                            />
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                                style={{ fontSize: '1.125rem', padding: '1rem 2rem' }}
                            >
                                {resource.type === 'link' ? '🔗 Abrir Enlace' : '📥 Descargar Recurso'}
                            </a>
                            {resource.file_size && (
                                <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    Tamaño: {(resource.file_size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div style={{
                maxWidth: '900px',
                margin: '2rem auto 0',
                textAlign: 'center',
                padding: '1rem',
                fontSize: '0.875rem',
                color: 'var(--text-tertiary)'
            }}>
                <p>Compartido desde SpeedIssuesFlow - Sistema de Gestión de Casos</p>
            </div>
        </div>
    );
}
