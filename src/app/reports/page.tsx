'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { Case, Test, Application, Status, Profile } from '@/types';
import { exportCasesToExcel, exportTestsToExcel } from '@/lib/export';

export default function ReportsPage() {
    const router = useRouter();
    const [cases, setCases] = useState<Case[]>([]);
    const [tests, setTests] = useState<Test[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [filterStatus, setFilterStatus] = useState('');
    const [filterApp, setFilterApp] = useState('');

    useEffect(() => {
        checkAuthAndLoad();
    }, []);

    const checkAuthAndLoad = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        await loadData();
    };

    const loadData = async () => {
        setLoading(true);

        const [casesRes, testsRes, appsRes, statusesRes] = await Promise.all([
            supabase.from('cases').select(`
        *,
        application:applications(*),
        status:statuses(*),
        category:categories(*),
        case_type:case_types(*),
        responsible:profiles!cases_responsible_id_fkey(*),
        creator:profiles!cases_created_by_fkey(*)
      `).is('deleted_at', null),
            supabase.from('tests').select(`
        *,
        application:applications(*),
        status:statuses(*),
        category:categories(*),
        test_type:test_types(*),
        responsible:profiles!tests_responsible_id_fkey(*),
        case:cases(id, title),
        creator:profiles!tests_created_by_fkey(*)
      `).is('deleted_at', null),
            supabase.from('applications').select('*').is('deleted_at', null),
            supabase.from('statuses').select('*').is('deleted_at', null).order('display_order'),
        ]);

        if (casesRes.data) setCases(casesRes.data);
        if (testsRes.data) setTests(testsRes.data);
        if (appsRes.data) setApplications(appsRes.data);
        if (statusesRes.data) setStatuses(statusesRes.data);

        setLoading(false);
    };

    const getFilteredCases = () => {
        let filtered = [...cases];
        if (filterStatus) filtered = filtered.filter(c => c.status_id === filterStatus);
        if (filterApp) filtered = filtered.filter(c => c.application_id === filterApp);
        return filtered;
    };

    const getFilteredTests = () => {
        let filtered = [...tests];
        if (filterStatus) filtered = filtered.filter(t => t.status_id === filterStatus);
        if (filterApp) filtered = filtered.filter(t => t.application_id === filterApp);
        return filtered;
    };

    const handleExportCases = () => {
        const filtered = getFilteredCases();
        exportCasesToExcel(filtered, `casos-reporte-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleExportTests = () => {
        const filtered = getFilteredTests();
        exportTestsToExcel(filtered, `pruebas-reporte-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <>
            <Navbar />
            <main className="container" style={{ padding: '2rem 1.5rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    Reportes y Exportación
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    Genera y exporta reportes de casos y pruebas
                </p>

                {/* Filtros Globales */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                        Filtros de Exportación
                    </h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="label">Estado</label>
                            <select className="input select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                <option value="">Todos los estados</option>
                                {statuses.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="label">Aplicación</label>
                            <select className="input select" value={filterApp} onChange={(e) => setFilterApp(e.target.value)}>
                                <option value="">Todas las aplicaciones</option>
                                {applications.map((app) => (
                                    <option key={app.id} value={app.id}>{app.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button
                                onClick={() => { setFilterStatus(''); setFilterApp(''); }}
                                className="btn btn-secondary"
                                style={{ width: '100%' }}
                            >
                                Limpiar Filtros
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <div className="loading" style={{ width: '48px', height: '48px', margin: '0 auto' }} />
                    </div>
                ) : (
                    <div className="grid grid-cols-2" style={{ marginBottom: '2rem' }}>
                        <div className="card card-hover">
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Exportar Casos
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                Total: {cases.length} casos
                            </p>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                                Con filtros: {getFilteredCases().length} casos
                            </p>
                            <button onClick={handleExportCases} className="btn btn-primary btn-sm">
                                📊 Exportar a Excel
                            </button>
                        </div>

                        <div className="card card-hover">
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                Exportar Pruebas
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                Total: {tests.length} pruebas
                            </p>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                                Con filtros: {getFilteredTests().length} pruebas
                            </p>
                            <button onClick={handleExportTests} className="btn btn-primary btn-sm">
                                📊 Exportar a Excel
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
