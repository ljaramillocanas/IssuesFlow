'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { showAlert } from '@/lib/sweetalert';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Logic for internal users (username login)
            let emailToUse = email;
            if (!email.includes('@')) {
                emailToUse = `${email.replace(/\s/g, '').toLowerCase()}@internal.sfl`;
            }

            const { error } = await supabase.auth.signInWithPassword({
                email: emailToUse,
                password,
            });

            if (error) {
                // Friendly error for invalid login
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('Usuario o contraseña incorrectos');
                }
                showAlert('Error', error.message, 'error');
            } else {
                router.push('/');
            }
        } catch (error: any) {
            showAlert('Error', error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // Removed background properties from here
            padding: '1rem',
        }}>
            {/* Animated Background Div */}
            <div className="bg-animate" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'url(/login_background.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                zIndex: 0
            }} />

            {/* Overlay darker to ensure readability */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(2px)',
                zIndex: 0
            }} />

            <div className="card" style={{
                position: 'relative',
                zIndex: 1,
                maxWidth: '450px',
                width: '100%',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                borderRadius: '16px',
                padding: '2.5rem',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    {/* Logo Section */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: '1.5rem',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <img
                            src="/logo.png"
                            alt="SpeedIssuesFlow Logo"
                            style={{
                                height: '60px',
                                objectFit: 'contain'
                            }}
                        />
                        <span style={{
                            fontSize: '2rem',
                            fontWeight: 800,
                            color: '#1e3a8a', // Dark blue professional color
                            letterSpacing: '2px'
                        }}>SIF</span>
                    </div>

                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        color: '#1f2937',
                        marginBottom: '0.5rem',
                        letterSpacing: '-0.5px'
                    }}>
                        SpeedIssuesFlow
                    </h1>
                    <p style={{
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        Sistema Especializado de Casos y Pruebas
                    </p>
                </div>

                <form onSubmit={handleLogin}>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label className="label" style={{
                            color: '#374151',
                            fontWeight: 600,
                            marginBottom: '0.5rem'
                        }}>Email o Usuario</label>
                        <input
                            type="text"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="usuario@empresa.com"
                            style={{
                                background: 'rgba(255, 255, 255, 0.8)',
                                border: '1px solid #e5e7eb',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                width: '100%'
                            }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '2rem' }}>
                        <label className="label" htmlFor="password" style={{
                            color: '#374151',
                            fontWeight: 600,
                            marginBottom: '0.5rem'
                        }}>
                            Contraseña
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                background: 'rgba(255, 255, 255, 0.8)',
                                border: '1px solid #e5e7eb',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                width: '100%'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: '0.75rem',
                            background: '#fee2e2',
                            color: '#991b1b',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            marginBottom: '1.5rem',
                            border: '1px solid #fecaca'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            padding: '0.875rem',
                            fontSize: '1rem',
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 6px -1px rgba(30, 58, 138, 0.3)'
                        }}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="loading-liquid" style={{ marginRight: '8px' }} />
                                Accesando...
                            </>
                        ) : (
                            'Ingresar al Sistema'
                        )}
                    </button>
                </form>

                <div style={{
                    marginTop: '2rem',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                }}>
                    &copy; {new Date().getFullYear()} SpeedIssuesFlow. Todos los derechos reservados.
                </div>
            </div>
        </div>
    );
}
