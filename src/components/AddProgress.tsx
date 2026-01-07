'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import ImageUpload from './ImageUpload';
import { handleImagePaste, handleImageDrop } from '@/lib/imageUpload';

interface AddProgressProps {
    entityId: string;
    entityType: 'case' | 'test';
    onProgressAdded: () => void;
}

export default function AddProgress({ entityId, entityType, onProgressAdded }: AddProgressProps) {
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        description: '',
        committee_notes: '',
    });
    const [attachments, setAttachments] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const table = entityType === 'case' ? 'case_progress' : 'test_progress';
            const idField = entityType === 'case' ? 'case_id' : 'test_id';

            const { data: progressData, error } = await supabase
                .from(table)
                .insert([{
                    [idField]: entityId,
                    description: formData.description,
                    committee_notes: formData.committee_notes || null,
                    created_by: user?.id,
                }])
                .select()
                .single();

            if (error) throw error;

            // Save attachments if any
            if (attachments.length > 0) {
                const attachmentTable = entityType === 'case' ? 'case_attachments' : 'test_attachments';
                const attachmentIdField = entityType === 'case' ? 'case_id' : 'test_id';

                const attachmentRecords = attachments.map(url => {
                    const fileName = url.split('/').pop() || 'image.jpg';
                    return {
                        [attachmentIdField]: entityId,
                        progress_id: progressData.id,
                        file_url: url,
                        file_name: fileName,
                        file_type: 'image',
                        uploaded_by: user?.id,
                    };
                });

                const { error: attachError } = await supabase
                    .from(attachmentTable)
                    .insert(attachmentRecords);

                if (attachError) throw attachError;
            }

            // Update parent entity updated_at
            await supabase
                .from(entityType === 'case' ? 'cases' : 'tests')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', entityId);

            setFormData({ description: '', committee_notes: '' });
            setAttachments([]);
            setShowForm(false);
            onProgressAdded();
            alert('Avance agregado exitosamente');
        } catch (error: any) {
            alert('Error al agregar avance: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!showForm) {
        return (
            <button
                onClick={() => setShowForm(true)}
                className="btn btn-primary"
            >
                + Agregar Avance
            </button>
        );
    }

    return (
        <div className="card" style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                Nuevo Avance
            </h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="label">Descripción del Avance *</label>
                    <textarea
                        className="input textarea"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        onPaste={async (e) => {
                            setUploading(true);
                            await handleImagePaste(
                                e.nativeEvent,
                                `${entityType}s/${entityId}`,
                                (url) => setAttachments(prev => [...prev, url])
                            );
                            setUploading(false);
                        }}
                        onDrop={async (e) => {
                            setUploading(true);
                            await handleImageDrop(
                                e.nativeEvent,
                                `${entityType}s/${entityId}`,
                                (url) => setAttachments(prev => [...prev, url])
                            );
                            setUploading(false);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        rows={4}
                        required
                        placeholder="Describe el progreso realizado... (Puedes pegar o arrastrar imágenes)"
                        style={{
                            borderColor: uploading ? 'var(--primary)' : undefined,
                            borderWidth: uploading ? '2px' : undefined
                        }}
                    />
                </div>

                <div className="form-group">
                    <label className="label">Notas de Comité (Opcional)</label>
                    <textarea
                        className="input textarea"
                        value={formData.committee_notes}
                        onChange={(e) => setFormData({ ...formData, committee_notes: e.target.value })}
                        onPaste={async (e) => {
                            setUploading(true);
                            await handleImagePaste(
                                e.nativeEvent,
                                `${entityType}s/${entityId}`,
                                (url) => setAttachments(prev => [...prev, url])
                            );
                            setUploading(false);
                        }}
                        onDrop={async (e) => {
                            setUploading(true);
                            await handleImageDrop(
                                e.nativeEvent,
                                `${entityType}s/${entityId}`,
                                (url) => setAttachments(prev => [...prev, url])
                            );
                            setUploading(false);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        rows={3}
                        placeholder="Notas del comité de ingeniería... (Puedes pegar o arrastrar imágenes)"
                        style={{
                            borderColor: uploading ? 'var(--primary)' : undefined,
                            borderWidth: uploading ? '2px' : undefined
                        }}
                    />
                </div>

                <div className="form-group">
                    <label className="label">Imágenes Adjuntas (Opcional)</label>
                    <ImageUpload
                        folder={`${entityType}s/${entityId}`}
                        onUploadComplete={(url) => setAttachments([...attachments, url])}
                        disabled={loading}
                    />
                    {attachments.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                {attachments.length} imagen(es) lista(s) para adjuntar
                            </p>
                            <button
                                type="button"
                                onClick={() => setAttachments([])}
                                className="btn btn-secondary btn-sm"
                            >
                                Limpiar Todas
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Guardar Avance'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setShowForm(false);
                            setFormData({ description: '', committee_notes: '' });
                            setAttachments([]);
                        }}
                        className="btn btn-secondary"
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
}
