'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/lib/sweetalert';

interface UploadFolderModalProps {
    existingFolders: string[];
    solutions?: Array<{ id: string; title: string }>;
    onClose: () => void;
    onSuccess: () => void;
}

export default function UploadFolderModal({ existingFolders, solutions, onClose, onSuccess }: UploadFolderModalProps) {
    const [folderName, setFolderName] = useState('');
    const [selectedSolution, setSelectedSolution] = useState('');
    const [files, setFiles] = useState<FileList | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (selectedFiles && selectedFiles.length > 0) {
            setFiles(selectedFiles);

            // Auto-detect folder name from first file's path
            const firstFile = selectedFiles[0] as any;
            if (firstFile.webkitRelativePath) {
                const pathParts = firstFile.webkitRelativePath.split('/');
                if (pathParts.length > 1) {
                    setFolderName(pathParts[0]); // First part is folder name
                }
            }
        }
    };

    const detectResourceType = (file: File): 'image' | 'video' | 'document' => {
        const mimeType = file.type;
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        return 'document';
    };

    const handleUpload = async () => {
        if (!files || files.length === 0) {
            showAlert('Error', 'Por favor selecciona una carpeta', 'warning');
            return;
        }

        if (!folderName.trim()) {
            showAlert('Error', 'Por favor ingresa un nombre para la carpeta', 'warning');
            return;
        }

        setUploading(true);
        setUploadProgress({ current: 0, total: files.length });

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No autenticado');

            const solutionId = selectedSolution || null;
            let successCount = 0;
            let errorCount = 0;

            // Upload each file
            for (let i = 0; i < files.length; i++) {
                const file = files[i] as any;
                setUploadProgress({ current: i + 1, total: files.length });

                try {
                    // Extract folder structure from file path
                    let resourceFolder = folderName.trim();
                    if (file.webkitRelativePath) {
                        const pathParts = file.webkitRelativePath.split('/');
                        // Remove the file name (last part) to get folder path
                        if (pathParts.length > 1) {
                            pathParts.pop(); // Remove filename
                            // Join with '/' to create full path: "MainFolder/Subfolder"
                            resourceFolder = pathParts.join('/');
                        }
                    }

                    // Upload file to storage
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${solutionId || 'general'}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('solution-resources')
                        .upload(fileName, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('solution-resources')
                        .getPublicUrl(fileName);

                    // Insert resource into database with full folder path
                    const { error: insertError } = await supabase
                        .from('solution_resources')
                        .insert({
                            solution_id: solutionId,
                            title: file.name,
                            type: detectResourceType(file),
                            url: publicUrl,
                            folder: resourceFolder, // Full path like "MainFolder/Subfolder"
                            description: `Subido desde: ${resourceFolder}`,
                            file_size: file.size,
                            mime_type: file.type,
                            created_by: user.id
                        });

                    if (insertError) throw insertError;
                    successCount++;
                } catch (error) {
                    console.error(`Error uploading ${file.name}:`, error);
                    errorCount++;
                }
            }

            if (errorCount === 0) {
                showAlert('Éxito', `Se subieron ${successCount} archivos exitosamente.`, 'success');
                onClose();
            } else {
                showAlert('Atención', `Se subieron ${successCount} archivos exitosamente. ${errorCount} fallaron.`, 'warning');
            }

            onSuccess();
        } catch (error: any) {
            console.error('Error uploading folder:', error);
            showAlert('Error', 'Error al subir carpeta: ' + error.message, 'error');
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
                        📁 Subir Carpeta Completa
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: 0 }}>
                        Selecciona una carpeta de tu computadora para subir todos sus archivos
                    </p>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem' }}>
                    {/* Folder Selection */}
                    <div className="form-group">
                        <label className="label">Seleccionar Carpeta</label>
                        <input
                            type="file"
                            /* @ts-ignore */
                            webkitdirectory="true"
                            directory="true"
                            multiple
                            onChange={handleFileSelect}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '2px dashed var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'var(--bg-secondary)',
                                cursor: 'pointer'
                            }}
                        />
                        {files && (
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                {files.length} archivo(s) seleccionado(s)
                            </p>
                        )}
                    </div>

                    {/* Folder Name */}
                    <div className="form-group">
                        <label className="label">Nombre de Carpeta *</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Nombre para organizar los recursos"
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            list="existing-folders"
                        />
                        <datalist id="existing-folders">
                            {existingFolders.map((f) => (
                                <option key={f} value={f} />
                            ))}
                        </datalist>
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

                    {/* Upload Progress */}
                    {uploading && (
                        <div style={{
                            padding: '1rem',
                            backgroundColor: 'var(--primary)15',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '1rem'
                        }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                                Subiendo archivos... ({uploadProgress.current}/{uploadProgress.total})
                            </p>
                            <div style={{
                                width: '100%',
                                height: '8px',
                                backgroundColor: 'var(--bg-tertiary)',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                                    height: '100%',
                                    backgroundColor: 'var(--primary)',
                                    transition: 'width 0.3s'
                                }} />
                            </div>
                        </div>
                    )}
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
                        onClick={handleUpload}
                        className="btn btn-primary"
                        disabled={uploading || !files || !folderName.trim()}
                    >
                        {uploading ? 'Subiendo...' : `✓ Subir ${files?.length || 0} Archivo(s)`}
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
