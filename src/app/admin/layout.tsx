'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <div>
            <div style={{
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
                padding: '1rem 0',
            }}>
                <div className="container">
                    <nav className="flex gap-6">
                        <Link
                            href="/admin/statuses"
                            style={{
                                color: isActive('/admin/statuses') ? 'var(--primary)' : 'var(--text-secondary)',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                            }}
                        >
                            Estados
                        </Link>
                        <Link
                            href="/admin/applications"
                            style={{
                                color: isActive('/admin/applications') ? 'var(--primary)' : 'var(--text-secondary)',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                            }}
                        >
                            Aplicaciones
                        </Link>
                        <Link
                            href="/admin/categories"
                            style={{
                                color: isActive('/admin/categories') ? 'var(--primary)' : 'var(--text-secondary)',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                            }}
                        >
                            Categorías
                        </Link>
                        <Link
                            href="/admin/types"
                            style={{
                                color: isActive('/admin/types') ? 'var(--primary)' : 'var(--text-secondary)',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                            }}
                        >
                            Tipos
                        </Link>
                        <Link
                            href="/admin/users"
                            style={{
                                color: isActive('/admin/users') ? 'var(--primary)' : 'var(--text-secondary)',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                            }}
                        >
                            Usuarios
                        </Link>
                    </nav>
                </div>
            </div>
            {children}
        </div>
    );
}
