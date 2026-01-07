'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import { Case, Profile, Application, Status } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import { exportCasesToExcel } from '@/lib/export';

export default function CasesPage() {
    const [cases, setCases] = useState<Case[]>([]);
    const [filteredCases, setFilteredCases] = useState<Case[]>([]);
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
    }, [cases, searchTerm, filterStatus, filterApp]);

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
        await loadCases();
        await loadFilterOptions();
    };

    const loadCases = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('cases')
            .select(`
        *,
        application:applications(*),
        status:statuses(*),
        responsible:profiles!cases_responsible_id_fkey(*)
      `)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setCases(data);
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
        let filtered = [...cases];

        if (searchTerm) {
            filtered = filtered.filter(c =>
                c.title.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filterStatus) {
            filtered = filtered.filter(c => c.status_id === filterStatus);
        }

        if (filterApp) {
            filtered = filtered.filter(c => c.application_id === filterApp);
        }

        setFilteredCases(filtered);
    };

    const handleExport = async () => {
        try {
            const exportBtn = document.getElementById('export-btn');
            if (exportBtn) {
                exportBtn.innerText = '⏳ Generando...';
                (exportBtn as HTMLButtonElement).disabled = true;
            }

            // 1. Obtener IDs de los casos filtrados
            const caseIds = filteredCases.map(c => c.id);

            if (caseIds.length === 0) {
                alert('No hay casos para exportar');
                if (exportBtn) {
                    exportBtn.innerText = '📊 Exportar a Excel';
                    (exportBtn as HTMLButtonElement).disabled = false;
                }
                return;
            }

            // 2. Traer el historial (audit_log) de esos casos
            // Lo hacemos en lotes si son muchos, pero por ahora directo
            const { data: logs, error } = await supabase
                .from('audit_log')
                .select(`
                    *,
                    creator:profiles!audit_log_changed_by_fkey(full_name)
                `)
                .in('record_id', caseIds)
                .order('created_at', { ascending: true }); // Orden cronológico para lectura

            if (error) throw error;

            // 3. Agrupar logs por caso
            const progressData: Record<string, any[]> = {};
            logs?.forEach(log => {
                if (!progressData[log.record_id]) {
                    progressData[log.record_id] = [];
                }

                // Formateamos un poco la descripción según la acción
                let desc = '';
                if (log.action === 'INSERT') desc = 'Caso creado';
                else if (log.action === 'UPDATE') {
                    // Generar un texto legible de los cambios
                    const changes = [];
                    const oldD = log.old_data || {};
                    const newD = log.new_data || {};

                    for (const key in newD) {
                        if (JSON.stringify(newD[key]) !== JSON.stringify(oldD[key])) {
                            // Ignorar campos técnicos
                            if (['updated_at', 'created_at'].includes(key)) continue;
                            changes.push(`${key}: ${newD[key]}`);
                        }
                    }
                    desc = changes.length > 0 ? `Cambios: ${changes.join(', ')}` : 'Actualización';
                }

                // Extraemos la observación explícitamente si existe en new_data
                const observacion = log.new_data?.observacion || '';

                progressData[log.record_id].push({
                    created_at: log.created_at,
                    creator: log.creator,
                    description: desc + (log.changed_fields ? ` (${log.changed_fields})` : ''),
                    observacion: observacion, // Nuevo campo
                    committee_notes: ''
                });
            });

            // 4. Exportar
            const { exportCasesWithProgress } = await import('@/lib/export'); // Dynamic import to avoid cycles or heavy load
            exportCasesWithProgress(filteredCases, progressData, `Reporte_Casos_Completo_${new Date().toISOString().split('T')[0]}.xlsx`);

        } catch (err: any) {
            console.error('Error export:', err);
            alert('Error al exportar: ' + err.message);
        } finally {
            const exportBtn = document.getElementById('export-btn');
            if (exportBtn) {
                exportBtn.innerText = '📊 Exportar a Excel';
                (exportBtn as HTMLButtonElement).disabled = false;
            }
        }
    };

    const canCreate = profile && hasPermission(profile.role, 'canCreateCase');

    return (
        <>
            <Navbar />
            <main className="container" style={{ padding: '2rem 1.5rem' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            Casos
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Gestión de casos de SFL, SCA y PrintLink
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button id="export-btn" onClick={handleExport} className="btn btn-secondary">
                            📊 Exportar a Excel
                        </button>
                        {canCreate && (
                            <Link href="/cases/new" className="btn btn-primary">
                                + Nuevo Caso
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
                                Mostrando {filteredCases.length} de {cases.length} casos
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
                ) : filteredCases.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            {cases.length === 0 ? 'No hay casos registrados' : 'No se encontraron casos con los filtros aplicados'}
                        </p>
                        {canCreate && cases.length === 0 && (
                            <Link href="/cases/new" className="btn btn-primary">
                                Crear Primer Caso
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
                                    <th>Estado</th>
                                    <th>Responsable</th>
                                    <th>Última Actualización</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCases.map((c) => (
                                    <tr key={c.id}>
                                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {c.title}
                                        </td>
                                        <td>
                                            {c.application?.name || '-'}
                                        </td>
                                        <td>
                                            {c.status && <StatusBadge status={c.status} size="sm" />}
                                        </td>
                                        <td>
                                            {c.responsible?.full_name || '-'}
                                        </td>
                                        <td style={{ fontSize: '0.8125rem' }}>
                                            {formatDateTime(c.updated_at)}
                                        </td>
                                        <td>
                                            <Link
                                                href={`/cases/${c.id}`}
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
