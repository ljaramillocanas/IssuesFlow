'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { formatDate } from '@/lib/utils';
import { showAlert } from '@/lib/sweetalert';
import LiquidLoader from '@/components/LiquidLoader';
import { Profile } from '@/types';
import { hasPermission, canAccessAdminPanel } from '@/lib/permissions';

interface AuditLogEntry {
    id: string;
    table_name: string;
    record_id: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    old_record: any;
    new_record: any;
    changed_by: string;
    created_at: string;
    user?: {
        full_name: string;
    };
}

export default function AuditPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
    const [users, setUsers] = useState<Pick<Profile, 'id' | 'full_name'>[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [filterUser, setFilterUser] = useState('');
    const [filterTable, setFilterTable] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    useEffect(() => {
        checkAuthAndLoad();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [logs, filterUser, filterTable, filterAction, filterDateFrom, filterDateTo]);

    const checkAuthAndLoad = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.error('Error fetching profile:', profileError);
                setLoading(false);
                return;
            }

            if (profileData) {
                setProfile(profileData);

                // Check if user has admin permissions
                if (!canAccessAdminPanel(profileData.role)) {
                    router.push('/');
                    return;
                }

                await loadAuditLogs();
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error('Unexpected error in checkAuthAndLoad:', error);
            setLoading(false);
        }
    };

    const loadAuditLogs = async () => {
        setLoading(true);
        try {
            // 1. Fetch Audit Logs (Raw, no join)
            const { data: auditData, error: auditError } = await supabase
                .from('audit_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1000);

            if (auditError) {
                console.error('Error fetching audit logs:', auditError);
                showAlert('Error', 'Error al cargar la auditoría. Por favor revise la consola.', 'error');
                return;
            }

            // 2. Fetch Users (Profiles)
            const { data: usersData, error: usersError } = await supabase
                .from('profiles')
                .select('id, full_name')
                .order('full_name');

            if (usersError) {
                console.error('Error fetching users:', usersError);
                // We continue even if users fail, to at least show the logs
            } else {
                setUsers(usersData || []);
            }

            // 3. Manual Join (Client-side)
            if (auditData) {
                const userMap = new Map((usersData || []).map(u => [u.id, u]));

                const joinedLogs: AuditLogEntry[] = auditData.map(log => ({
                    ...log,
                    user: userMap.get(log.changed_by) || { full_name: 'Usuario Desconocido' }
                }));

                setLogs(joinedLogs);
            }

        } catch (error) {
            console.error('Critical error in loadAuditLogs:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
            alert('Error al cargar la auditoría. Por favor revise la consola.');
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        // Warning: This function is now redundant as loadAuditLogs handles fetching users.
        // Keeping it compatible with existing calls if any, but logic is moved.
        // If filters need it re-fetched separately, we can keep it, but efficient to do once.
        // For now, let's leave it as a no-op or simple refresher if needed, 
        // but loadAuditLogs populates `users` state which filters use.
    };

    const applyFilters = () => {
        let filtered = [...logs];

        if (filterUser) {
            filtered = filtered.filter(log => log.changed_by === filterUser);
        }

        if (filterTable) {
            filtered = filtered.filter(log => log.table_name === filterTable);
        }

        if (filterAction) {
            filtered = filtered.filter(log => log.action === filterAction);
        }

        if (filterDateFrom) {
            const fromDate = new Date(filterDateFrom);
            filtered = filtered.filter(log => new Date(log.created_at) >= fromDate);
        }

        if (filterDateTo) {
            const toDate = new Date(filterDateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(log => new Date(log.created_at) <= toDate);
        }

        setFilteredLogs(filtered);
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilterUser('');
        setFilterTable('');
        setFilterAction('');
        setFilterDateFrom('');
        setFilterDateTo('');
    };

    const getActionBadge = (action: string) => {
        const badges = {
            INSERT: { label: 'Creado', color: 'var(--accent)' },
            UPDATE: { label: 'Modificado', color: 'var(--primary)' },
            DELETE: { label: 'Eliminado', color: 'var(--danger)' }
        };

        const badge = badges[action as keyof typeof badges] || { label: action, color: 'var(--text-secondary)' };

        return (
            <span style={{
                display: 'inline-block',
                padding: '0.25rem 0.625rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 500,
                backgroundColor: `${badge.color}15`,
                color: badge.color
            }}>
                {badge.label}
            </span>
        );
    };

    const getTableLabel = (tableName: string) => {
        const labels: Record<string, string> = {
            cases: 'Casos',
            tests: 'Pruebas',
            profiles: 'Usuarios',
            statuses: 'Estados',
            applications: 'Aplicaciones',
            categories: 'Categorías',
            case_types: 'Tipos de Caso',
            test_types: 'Tipos de Prueba'
        };

        return labels[tableName] || tableName;
    };

    // Pagination
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    return (
        <>
            <Navbar />
            <main className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1400px' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            Bitácora de Auditoría
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Registro completo de cambios en el sistema
                        </p>
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="btn btn-secondary"
                        style={{ backgroundColor: showFilters ? 'var(--bg-tertiary)' : undefined }}
                    >
                        🔍 Filtros
                    </button>
                </div>

                {/* Filters Card */}
                {showFilters && (
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                            Filtros
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={{ marginBottom: '1rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="label">Usuario</label>
                                <select
                                    className="input"
                                    value={filterUser}
                                    onChange={(e) => setFilterUser(e.target.value)}
                                >
                                    <option value="">Todos los usuarios</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>{user.full_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="label">Tabla</label>
                                <select
                                    className="input"
                                    value={filterTable}
                                    onChange={(e) => setFilterTable(e.target.value)}
                                >
                                    <option value="">Todas las tablas</option>
                                    <option value="cases">Casos</option>
                                    <option value="tests">Pruebas</option>
                                    <option value="profiles">Usuarios</option>
                                    <option value="statuses">Estados</option>
                                    <option value="applications">Aplicaciones</option>
                                    <option value="categories">Categorías</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="label">Acción</label>
                                <select
                                    className="input"
                                    value={filterAction}
                                    onChange={(e) => setFilterAction(e.target.value)}
                                >
                                    <option value="">Todas las acciones</option>
                                    <option value="INSERT">Creación</option>
                                    <option value="UPDATE">Modificación</option>
                                    <option value="DELETE">Eliminación</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="label">Fecha Desde</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={filterDateFrom}
                                    onChange={(e) => setFilterDateFrom(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                <label className="label">Fecha Hasta</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={filterDateTo}
                                    onChange={(e) => setFilterDateTo(e.target.value)}
                                />
                            </div>

                            <div style={{ paddingTop: '1.5rem' }}>
                                <button
                                    onClick={clearFilters}
                                    className="btn btn-secondary"
                                >
                                    Limpiar Filtros
                                </button>
                            </div>
                        </div>

                        {(filterUser || filterTable || filterAction || filterDateFrom || filterDateTo) && (
                            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    Mostrando {filteredLogs.length} de {logs.length} registros
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Audit Log Table */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <LiquidLoader />
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {logs.length === 0 ? 'No hay registros de auditoría' : 'No se encontraron registros con los filtros aplicados'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Fecha/Hora</th>
                                        <th>Usuario</th>
                                        <th>Tabla</th>
                                        <th>Acción</th>
                                        <th>ID Registro</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td style={{ fontSize: '0.8125rem' }}>
                                                {formatDate(log.created_at)}        </td>
                                            <td style={{ fontWeight: 500 }}>
                                                {log.user?.full_name || 'Usuario Desconocido'}
                                            </td>
                                            <td>{getTableLabel(log.table_name)}</td>
                                            <td>{getActionBadge(log.action)}</td>
                                            <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                                {log.record_id.slice(0, 8)}...
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="btn btn-secondary btn-sm"
                                    style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
                                >
                                    ← Anterior
                                </button>

                                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    Página {currentPage} de {totalPages}
                                </span>

                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="btn btn-secondary btn-sm"
                                    style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}
                                >
                                    Siguiente →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </>
    );
}
