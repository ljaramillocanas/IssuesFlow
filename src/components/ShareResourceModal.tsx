'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showAlert, showConfirm } from '@/lib/sweetalert';
import { SolutionResource } from '@/types';

interface ShareResourceModalProps {
    resource: SolutionResource;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ShareResourceModal({ resource, onClose, onSuccess }: ShareResourceModalProps) {
    const [shareEnabled, setShareEnabled] = useState(resource.share_enabled);
    const [sharePermission] = useState<'public'>('public'); // Always public
    const [expirationDays, setExpirationDays] = useState<number | null>(null);
    const [updating, setUpdating] = useState(false);
    const [copied, setCopied] = useState(false);

    const shareUrl = resource.share_token
        ? `${window.location.origin}/share/${resource.share_token}`
        : '';

    const handleToggleShare = async () => {
        setUpdating(true);
        try {
            if (!shareEnabled && !resource.share_token) {
                // Generate new share token
                const { data, error } = await supabase.rpc('generate_share_token', {
                    resource_id: resource.id
                });

                if (error) throw error;

                setShareEnabled(true);
            } else {
                // Toggle share enabled
                const { error } = await supabase
                    .from('solution_resources')
                    .update({ share_enabled: !shareEnabled })
                    .eq('id', resource.id);

                if (error) throw error;

                setShareEnabled(!shareEnabled);
            }

            onSuccess();
        } catch (error: any) {
            console.error('Error toggling share:', error);
            showAlert('Error', 'Error al activar/desactivar compartir: ' + error.message, 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdatePermission = async () => {
        setUpdating(true);
        try {
            const updateData: any = {
                share_permission: 'public' // Always set to public
            };

            // Set expiration if specified
            if (expirationDays) {
                const expirationDate = new Date();
                expirationDate.setDate(expirationDate.getDate() + expirationDays);
                updateData.share_expires_at = expirationDate.toISOString();
            } else {
                updateData.share_expires_at = null;
            }

            const { error } = await supabase
                .from('solution_resources')
                .update(updateData)
                .eq('id', resource.id);

            if (error) throw error;

            onSuccess();
        } catch (error: any) {
            console.error('Error updating share settings:', error);
            showAlert('Error', 'Error al actualizar configuración: ' + error.message, 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handleRotateKey = async () => {
        const confirmed = await showConfirm('¿Regenerar enlace?', 'El enlace anterior dejará de funcionar.');
        if (!confirmed) return;

        setUpdating(true);
        try {
            // First disable current token
            await supabase
                .from('solution_resources')
                .update({ share_token: null, share_enabled: false })
                .eq('id', resource.id);

            // Generate new token
            const { data, error } = await supabase.rpc('generate_share_token', {
                resource_id: resource.id
            });

            if (error) throw error;

            setShareEnabled(true);
            onSuccess();
        } catch (error: any) {
            console.error('Error rotating key:', error);
            showAlert('Error', 'Error al regenerar enlace: ' + error.message, 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
                        🔗 Compartir Recurso
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: 0 }}>
                        {resource.title}
                    </p>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem' }}>
                    {/* Enable/Disable Toggle */}
                    <div className="form-group">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <label className="label" style={{ marginBottom: '0.25rem' }}>Compartir Recurso</label>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                                    {shareEnabled ? 'Enlace público activo' : 'El recurso no está compartido'}
                                </p>
                            </div>
                            <button
                                onClick={handleToggleShare}
                                disabled={updating}
                                style={{
                                    padding: '0.5rem 1.25rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    backgroundColor: shareEnabled ? 'var(--success)' : 'var(--bg-tertiary)',
                                    color: shareEnabled ? 'white' : 'var(--text-primary)',
                                    cursor: updating ? 'not-allowed' : 'pointer',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {shareEnabled ? '✓ Activado' : 'Activar'}
                            </button>
                        </div>
                    </div>

                    {shareEnabled && shareUrl && (
                        <>
                            {/* Share Link */}
                            <div className="form-group">
                                <label className="label">Enlace para Compartir</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        className="input"
                                        value={shareUrl}
                                        readOnly
                                        style={{ flex: 1, fontSize: '0.875rem' }}
                                    />
                                    <button
                                        onClick={handleCopyLink}
                                        className="btn btn-primary"
                                        style={{ whiteSpace: 'nowrap' }}
                                    >
                                        {copied ? '✓ Copiado' : '📋 Copiar'}
                                    </button>
                                </div>
                            </div>

                            {/* Permission Level - Removed, always public */}
                            <div style={{
                                padding: '1rem',
                                backgroundColor: 'var(--success)15',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--success)50'
                            }}>
                                <p style={{ fontSize: '0.875rem', color: 'var(--success)', marginBottom: '0.5rem', fontWeight: 600 }}>
                                    🌐 Acceso Público Global
                                </p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                                    ✓ Cualquier persona con el enlace puede acceder
                                    <br />
                                    ✓ No requiere autenticación
                                    <br />
                                    ✓ Accesible desde cualquier red
                                </p>
                            </div>

                            {/* Expiration */}
                            <div className="form-group">
                                <label className="label">Expiración (Opcional)</label>
                                <select
                                    className="input"
                                    value={expirationDays || ''}
                                    onChange={(e) => setExpirationDays(e.target.value ? parseInt(e.target.value) : null)}
                                >
                                    <option value="">Sin expiración</option>
                                    <option value="1">1 día</option>
                                    <option value="7">7 días</option>
                                    <option value="30">30 días</option>
                                    <option value="90">90 días</option>
                                </select>
                            </div>

                            {/* Apply Changes Button - Only for expiration now */}
                            {expirationDays !== null && (
                                <button
                                    onClick={handleUpdatePermission}
                                    disabled={updating}
                                    className="btn btn-primary"
                                    style={{ width: '100%', marginBottom: '1rem' }}
                                >
                                    {updating ? 'Aplicando...' : '✓ Aplicar Cambios'}
                                </button>
                            )}

                            {/* Regenerate Token */}
                            <div style={{
                                padding: '1rem',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)'
                            }}>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                    ⚠️ Regenerar enlace invalidará el enlace actual
                                </p>
                                <button
                                    onClick={handleRotateKey}
                                    disabled={updating}
                                    className="btn btn-secondary"
                                    style={{ width: '100%' }}
                                >
                                    🔄 Regenerar Enlace
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1.5rem',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                    >
                        Cerrar
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
