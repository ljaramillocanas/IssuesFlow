'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import { canAccessAdminPanel } from '@/lib/permissions';

export default function Navbar() {
    const [darkMode, setDarkMode] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        // Check dark mode preference
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
        setDarkMode(isDark);
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

        // Load user profile
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
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

    return (
        <nav style={{
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-color)',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            backdropFilter: 'blur(10px)',
            backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        }}>
            <div className="container" style={{ padding: '0.75rem 1.5rem' }}>
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-4" style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                    }}>
                        {/* Logo Image - Reemplaza la ruta con tu logo */}
                        <img
                            src="/logo.png"
                            alt="SpeedIssueFlow Logo"
                            style={{
                                width: '72px',
                                height: '72px',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.15))'
                            }}
                            onError={(e) => {
                                // Si no existe el logo, ocultamos la imagen
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                        <span style={{
                            background: 'linear-gradient(135deg, #FCD34D 0%, #FBBF24 25%, #60A5FA 75%, #3B82F6 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            letterSpacing: '-0.03em',
                            filter: 'drop-shadow(0 1px 2px rgba(59, 130, 246, 0.2))',
                        }}>
                            SpeedIssueFlow
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="flex items-center gap-6" style={{ display: profile ? 'flex' : 'none' }}>
                        <Link
                            href="/"
                            className={isActive('/') ? 'active-link' : ''}
                            style={{
                                color: isActive('/') ? 'var(--primary)' : 'var(--text-secondary)',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                                transition: 'color var(--transition-fast)',
                            }}
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/cases"
                            className={isActive('/cases') ? 'active-link' : ''}
                            style={{
                                color: isActive('/cases') ? 'var(--primary)' : 'var(--text-secondary)',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                                transition: 'color var(--transition-fast)',
                            }}
                        >
                            Casos
                        </Link>
                        <Link
                            href="/tests"
                            className={isActive('/tests') ? 'active-link' : ''}
                            style={{
                                color: isActive('/tests') ? 'var(--primary)' : 'var(--text-secondary)',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                                transition: 'color var(--transition-fast)',
                            }}
                        >
                            Pruebas
                        </Link>
                        <Link
                            href="/solutions"
                            className={isActive('/solutions') ? 'active-link' : ''}
                            style={{
                                color: isActive('/solutions') ? 'var(--primary)' : 'var(--text-secondary)',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                                transition: 'color var(--transition-fast)',
                            }}
                        >
                            Soluciones
                        </Link>
                        <Link
                            href="/reports"
                            className={isActive('/reports') ? 'active-link' : ''}
                            style={{
                                color: isActive('/reports') ? 'var(--primary)' : 'var(--text-secondary)',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                                transition: 'color var(--transition-fast)',
                            }}
                        >
                            Reportes
                        </Link>
                        {profile && canAccessAdminPanel(profile.role) && (
                            <>
                                <Link
                                    href="/admin"
                                    className={pathname?.startsWith('/admin') ? 'active-link' : ''}
                                    style={{
                                        color: pathname?.startsWith('/admin') ? 'var(--primary)' : 'var(--text-secondary)',
                                        fontWeight: 500,
                                        fontSize: '0.875rem',
                                        transition: 'color var(--transition-fast)',
                                    }}
                                >
                                    Administración
                                </Link>
                                <Link
                                    href="/audit"
                                    className={pathname?.startsWith('/audit') ? 'active-link' : ''}
                                    style={{
                                        color: pathname?.startsWith('/audit') ? 'var(--primary)' : 'var(--text-secondary)',
                                        fontWeight: 500,
                                        fontSize: '0.875rem',
                                        transition: 'color var(--transition-fast)',
                                    }}
                                >
                                    Auditoría
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-4">
                        {/* Dark mode toggle */}
                        <button
                            onClick={toggleDarkMode}
                            className="btn-secondary btn-sm"
                            style={{ padding: '0.5rem' }}
                            aria-label="Toggle dark mode"
                        >
                            {darkMode ? '🌙' : '☀️'}
                        </button>

                        {/* User menu */}
                        {profile && (
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setMenuOpen(!menuOpen)}
                                    className="flex items-center gap-2"
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '9999px',
                                        border: '1px solid var(--border-color)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 600,
                                        fontSize: '0.875rem',
                                    }}>
                                        {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                        {profile.full_name || 'Usuario'}
                                    </span>
                                </button>

                                {/* Dropdown */}
                                {menuOpen && (
                                    <div style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: 'calc(100% + 0.5rem)',
                                        background: 'var(--bg-primary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        boxShadow: 'var(--shadow-lg)',
                                        minWidth: '200px',
                                        zIndex: 50,
                                    }}>
                                        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{profile.full_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{profile.role}</div>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem 1rem',
                                                textAlign: 'left',
                                                fontSize: '0.875rem',
                                                color: 'var(--danger)',
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Cerrar Sesión
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
