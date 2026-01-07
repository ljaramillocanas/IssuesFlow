'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import { Test, Profile, Application, Status } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import { exportTestsToExcel } from '@/lib/export';

export default function TestsPage() {
    const [tests, setTests] = useState<Test[]>([]);
    const [filteredTests, setFilteredTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const router = useRouter();

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterApp, setFilterApp] = useState('');
    const [applications, setApplications] = useState<Application[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);

    useEffect(() => {
        checkAuthAndLoad();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [tests, searchTerm, filterStatus, filterApp]);

    const checkAuthAndLoad = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        setProfile(profileData);
        await loadTests();
        await loadFilterOptions();
    };

    const loadTests = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('tests')
            .select(`
        *,
        application:applications(*),
        status:statuses(*),
        responsible:profiles!tests_responsible_id_fkey(*),
        case:cases(*)
      `)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setTests(data);
        }
        setLoading(false);
    };

    const loadFilterOptions = async () => {
        const [appsRes, statusesRes] = await Promise.all([
            supabase.from('applications').select('*').is('deleted_at', null),
            supabase.from('statuses').select('*').is('deleted_at', null).order('display_order'),
        ]);

        if (appsRes.data) setApplications(appsRes.data);
        if (statusesRes.data) setStatuses(statusesRes.data);
    };

    const applyFilters = () => {
        let filtered = [...tests];

        if (searchTerm) {
            filtered = filtered.filter(t =>
                t.title.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filterStatus) {
            filtered = filtered.filter(t => t.status_id === filterStatus);
        }

        if (filterApp) {
            filtered = filtered.filter(t => t.application_id === filterApp);
        }

        setFilteredTests(filtered);
    };

    const handleExport = () => {
        exportTestsToExcel(filteredTests, `pruebas-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const canCreate = profile && hasPermission(profile.role, 'canCreateTest');

    return (
        <>
            <Navbar />
            <main className="container" style={{ padding: '2rem 1.5rem' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            Pruebas
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Gestión de pruebas técnicas
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExport} className="btn btn-secondary">
                            📊 Exportar a Excel
                        </button>
                        {canCreate && (
                            <Link href="/tests/new" className="btn btn-primary">
                                + Nueva Prueba
                            </Link>
                        )}
                    </div>
                </div>

                {/* Filtros */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="label">Buscar por título</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Escribe para buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="label">Estado</label>
                            <select
                                className="input select"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="">Todos los estados</option>
                                {statuses.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="label">Aplicación</label>
                            <select
                                className="input select"
                                value={filterApp}
                                onChange={(e) => setFilterApp(e.target.value)}
                            >
                                <option value="">Todas las aplicaciones</option>
                                {applications.map((app) => (
                                    <option key={app.id} value={app.id}>{app.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {(searchTerm || filterStatus || filterApp) && (
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Mostrando {filteredTests.length} de {tests.length} pruebas
                                {' • '}
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFilterStatus('');
                                        setFilterApp('');
                                    }}
                                    style={{ color: 'var(--primary)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    Limpiar filtros
                                </button>
                            </p>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <div className="loading" style={{ width: '48px', height: '48px', margin: '0 auto' }} />
                    </div>
                ) : filteredTests.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            {tests.length === 0 ? 'No hay pruebas registradas' : 'No se encontraron pruebas con los filtros aplicados'}
                        </p>
                        {canCreate && tests.length === 0 && (
                            <Link href="/tests/new" className="btn btn-primary">
                                Crear Primera Prueba
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Título</th>
                                    <th>Aplicación</th>
                                    <th>Caso Relacionado</th>
                                    <th>Estado</th>
                                    <th>Responsable</th>
                                    <th>Última Actualización</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTests.map((t) => (
                                    <tr key={t.id}>
                                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {t.title}
                                        </td>
                                        <td>
                                            {t.application?.name || '-'}
                                        </td>
                                        <td>
                                            {t.case ? (
                                                <Link href={`/cases/${t.case.id}`} style={{ color: 'var(--primary)' }}>
                                                    {t.case.title}
                                                </Link>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            {t.status && <StatusBadge status={t.status} size="sm" />}
                                        </td>
                                        <td>
                                            {t.responsible?.full_name || '-'}
                                        </td>
                                        <td style={{ fontSize: '0.8125rem' }}>
                                            {formatDateTime(t.updated_at)}
                                        </td>
                                        <td>
                                            <Link
                                                href={`/tests/${t.id}`}
                                                className="btn btn-secondary btn-sm"
                                            >
                                                Ver Detalles
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </>
    );
}
