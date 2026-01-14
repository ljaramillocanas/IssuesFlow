'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import { canAccessAdminPanel } from '@/lib/permissions';

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
        setDarkMode(isDark);
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setProfile(data);
        }
    };

    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        localStorage.setItem('theme', newMode ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const isActive = (path: string) => pathname === path;

    const navLinks = [
        { name: 'Dashboard', path: '/', icon: '📊' },
        { name: 'Casos', path: '/cases', icon: '📂' },
        { name: 'Pruebas', path: '/tests', icon: '🧪' },
        { name: 'Soluciones', path: '/solutions', icon: '💡' },
        { name: 'Recursos', path: '/resources', icon: '📚' },
        { name: 'Asistente AI', path: '/ai-assistant', icon: '🤖' },
        { name: 'Ayuda / Reportes', path: '/reports', icon: '📑' },
    ];

    return (
        <>
            <nav style={{
                background: 'rgba(var(--bg-rgb), 0.8)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--border-color)',
                position: 'sticky',
                top: 0,
                zIndex: 40,
                height: '60px',
                display: 'flex',
                alignItems: 'center'
            }}>
                <div className="container" style={{ padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>

                    {/* Left: Hamburger & Logo */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        </button>

                        <Link href="/" className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
                            <div style={{
                                width: '40px', height: '40px',
                                background: 'white',
                                borderRadius: '8px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                overflow: 'hidden',
                                padding: '4px'
                            }}>
                                <img src="/logo.png" alt="SIF Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                            <div className="flex flex-col">
                                <span style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)' }}>
                                    SIF
                                </span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                                    SpeedIssuesFlow
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* Right: User & Theme */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleDarkMode}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.2rem',
                                padding: '4px'
                            }}
                        >
                            {darkMode ? '🌙' : '☀️'}
                        </button>

                        {profile && (
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setMenuOpen(!menuOpen)}
                                    style={{
                                        width: '32px', height: '32px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                        border: '2px solid var(--bg-primary)',
                                        color: 'white',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {profile.full_name?.charAt(0).toUpperCase()}
                                </button>

                                {menuOpen && (
                                    <div style={{
                                        position: 'absolute', right: 0, top: '120%',
                                        background: 'var(--bg-primary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        boxShadow: 'var(--shadow-lg)',
                                        minWidth: '180px',
                                        padding: '0.5rem',
                                        zIndex: 100
                                    }}>
                                        <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{profile.full_name?.split(' ')[0]}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{profile.role}</div>
                                        </div>
                                        <button onClick={handleLogout} style={{
                                            display: 'block', width: '100%', textAlign: 'left',
                                            padding: '0.5rem 1rem', background: 'transparent', border: 'none',
                                            color: 'var(--danger)', cursor: 'pointer', fontSize: '0.875rem'
                                        }}>
                                            Cerrar Sesión
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Sidebar / Drawer */}
            {sidebarOpen && (
                <>
                    <div
                        onClick={() => setSidebarOpen(false)}
                        style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(0,0,0,0.4)',
                            backdropFilter: 'blur(2px)',
                            zIndex: 49
                        }}
                    />
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, bottom: 0,
                        width: '280px',
                        background: 'var(--bg-primary)',
                        borderRight: '1px solid var(--border-color)',
                        zIndex: 50,
                        padding: '2rem 1.5rem',
                        display: 'flex', flexDirection: 'column',
                        transform: 'translateX(0)',
                        transition: 'transform 0.3s ease',
                        boxShadow: 'var(--shadow-xl)'
                    }}>
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-3">
                                <div style={{
                                    width: '40px', height: '40px',
                                    background: 'white',
                                    borderRadius: '10px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: 'var(--shadow-sm)',
                                    padding: '4px'
                                }}>
                                    <img src="/logo.png" alt="SIF" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, lineHeight: 1 }}>SIF</h2>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SpeedIssuesFlow</span>
                                </div>
                            </div>
                            <button onClick={() => setSidebarOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            {navLinks.map(link => (
                                <Link
                                    key={link.path}
                                    href={link.path}
                                    onClick={() => setSidebarOpen(false)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        textDecoration: 'none',
                                        color: isActive(link.path) ? 'var(--primary)' : 'var(--text-secondary)',
                                        background: isActive(link.path) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                        fontWeight: isActive(link.path) ? 600 : 500,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <span style={{ fontSize: '1.2rem' }}>{link.icon}</span>
                                    {link.name}
                                </Link>
                            ))}

                            {profile && canAccessAdminPanel(profile.role) && (
                                <>
                                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '1rem 0' }} />
                                    <Link href="/admin" onClick={() => setSidebarOpen(false)} style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '12px 16px', borderRadius: '12px',
                                        color: isActive('/admin') ? 'var(--primary)' : 'var(--text-secondary)',
                                        fontWeight: 500, textDecoration: 'none'
                                    }}>
                                        <span>⚙️</span> Admin
                                    </Link>
                                    <Link href="/audit" onClick={() => setSidebarOpen(false)} style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '12px 16px', borderRadius: '12px',
                                        color: isActive('/audit') ? 'var(--primary)' : 'var(--text-secondary)',
                                        fontWeight: 500, textDecoration: 'none'
                                    }}>
                                        <span>🛡️</span> Auditoría
                                    </Link>
                                </>
                            )}
                        </div>

                        <div style={{ marginTop: 'auto' }}>
                            <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Versión 2.5.0</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: 0 }}>Soporte AI Enabled</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
