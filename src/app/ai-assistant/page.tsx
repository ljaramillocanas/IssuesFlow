'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AiAssistantPage() {
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setLoading(true);
        setError('');
        setResponse('');

        try {
            const res = await fetch('/api/ai-assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            if (!res.ok) {
                throw new Error('Error al conectar con el asistente');
            }

            const data = await res.json();
            setResponse(data.result);
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error inesperado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <main className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1000px' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        Asistente AI
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Tu compañero inteligente para redactar, resumir y mejorar textos.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ minHeight: '600px' }}>
                    {/* Input Section */}
                    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
                            Tu Solicitud
                        </h2>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ej: Escribe un correo formal para un cliente solicitando una reunión..."
                            style={{
                                width: '100%',
                                flex: 1,
                                padding: '1rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                resize: 'none',
                                minHeight: '200px',
                                marginBottom: '1rem',
                                fontSize: '1rem',
                                fontFamily: 'inherit'
                            }}
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={handleGenerate}
                                disabled={loading || !prompt.trim()}
                                className="btn btn-primary"
                                style={{
                                    width: '100%',
                                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                                    justifyContent: 'center',
                                    opacity: loading ? 0.7 : 1
                                }}
                            >
                                {loading ? 'Generando...' : '✨ Generar Respuesta'}
                            </button>
                        </div>
                        {error && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#EF4444',
                                fontSize: '0.875rem'
                            }}>
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Output Section */}
                    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                Respuesta
                            </h2>
                            {response && (
                                <button
                                    onClick={() => navigator.clipboard.writeText(response)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--primary)',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: 500
                                    }}
                                >
                                    Copiar
                                </button>
                            )}
                        </div>

                        <div style={{
                            flex: 1,
                            padding: '1rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-primary)',
                            overflowY: 'auto',
                            minHeight: '200px'
                        }}>
                            {loading ? (
                                <div className="flex items-center justify-center h-full text-secondary">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        <span style={{ fontSize: '0.875rem' }}>Pensando...</span>
                                    </div>
                                </div>
                            ) : response ? (
                                <div className="markdown-content">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {response}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                    La respuesta aparecerá aquí...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
