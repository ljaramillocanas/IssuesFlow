import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import LiquidLoader from '@/components/LiquidLoader';

import { exportReportToWord } from '@/lib/export';
import { showAlert } from '@/lib/sweetalert';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
    loading: boolean;
    title: string;
    onRegenerate?: (instruction: string) => void;
}

export default function ReportModal({ isOpen, onClose, content, loading, title, onRegenerate }: ReportModalProps) {
    const [showRefine, setShowRefine] = useState(false);
    const [instruction, setInstruction] = useState('');

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        showAlert('Copiado', 'Informe copiado al portapapeles', 'success');
    };

    const handleExportWord = () => {
        exportReportToWord(content, title);
    };

    const handleRegenerateSubmit = () => {
        if (onRegenerate && instruction.trim()) {
            onRegenerate(instruction);
            setShowRefine(false);
            setInstruction('');
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div style={{
                background: 'var(--glass-surface)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '800px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.1)',
                overflow: 'hidden',
                animation: 'slideUp 0.3s ease-out'
            }} className="text-gray-900 dark:text-gray-100">
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }} className="border-gray-200 dark:border-gray-700">
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                        {loading ? 'Generando Informe IA...' : `Informe IA: ${title} `}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: '#6b7280'
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    padding: '1.5rem',
                    overflowY: 'auto',
                    flex: 1,
                    lineHeight: 1.6
                }}>
                    {loading ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '3rem 0'
                        }}>
                            <LiquidLoader />
                            <p style={{ color: '#6b7280' }}>Analizando datos y redactando resumen ejecutivo...</p>
                        </div>
                    ) : (
                        <div className="prose dark:prose-invert max-w-none" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {content}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Refine Section */}
                {showRefine && !loading && (
                    <div style={{ padding: '1rem 1.5rem', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }} className="bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                            Instrucciones para refinar el reporte:
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                value={instruction}
                                onChange={(e) => setInstruction(e.target.value)}
                                placeholder="Ej: Agrega una sección sobre riesgos financieros..."
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #d1d5db'
                                }}
                                className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                onKeyDown={(e) => e.key === 'Enter' && handleRegenerateSubmit()}
                            />
                            <button
                                onClick={handleRegenerateSubmit}
                                className="btn btn-primary"
                                disabled={!instruction.trim()}
                            >
                                Actualizar
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                {!loading && (
                    <div style={{
                        padding: '1rem 1.5rem',
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.75rem'
                    }} className="border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">

                        {!showRefine && onRegenerate && (
                            <button
                                onClick={() => setShowRefine(true)}
                                className="btn btn-secondary"
                                style={{ marginRight: 'auto' }} // Push to left
                            >
                                ✨ Refinar con IA
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="btn btn-secondary"
                        >
                            Cerrar
                        </button>
                        <button
                            onClick={handleCopy}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            Copiar
                        </button>
                        <button
                            onClick={handleExportWord}
                            className="btn btn-primary"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                background: 'linear-gradient(135deg, #2b5797 0%, #1e3a8a 100%)', // Word blueish
                                border: 'none'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            Word
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
