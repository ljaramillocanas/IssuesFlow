'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { Solution, Application, CaseType, Status, Profile } from '@/types';
import { formatDateTime } from '@/lib/utils';

export default function SolutionsPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [solutions, setSolutions] = useState<Solution[]>([]);
    const [filteredSolutions, setFilteredSolutions] = useState<Solution[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [applications, setApplications] = useState<Application[]>([]);
    const [caseTypes, setCaseTypes] = useState<CaseType[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);

    const [filterApp, setFilterApp] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    useEffect(() => {
        checkAuthAndLoad();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [solutions, filterApp, filterType, filterStatus, searchQuery, filterDateFrom, filterDateTo]);

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

        if (profileData) {
            setProfile(profileData);
            await Promise.all([
                loadSolutions(),
                loadFiltersData()
            ]);
        }
    };

    const loadSolutions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('solutions')
            .select(`
        *,
        case:cases!inner(
          id, title, application_id, case_type_id, status_id,
          application:applications(id, name, color),
          case_type:case_types(id, name),
          status:statuses(id, name, color)
        ),
        creator:profiles(id, full_name)
      `)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setSolutions(data);
        }
        setLoading(false);
    };

    const loadFiltersData = async () => {
        const [appsData, typesData, statusesData] = await Promise.all([
            supabase.from('applications').select('*').is('deleted_at', null).order('name'),
            supabase.from('case_types').select('*').is('deleted_at', null).order('name'),
            supabase.from('statuses').select('*').is('deleted_at', null).order('display_order')
        ]);

        if (appsData.data) setApplications(appsData.data);
        if (typesData.data) setCaseTypes(typesData.data);
        if (statusesData.data) setStatuses(statusesData.data);
    };

    const applyFilters = () => {
        let filtered = [...solutions];

        if (filterApp) {
            filtered = filtered.filter(s => s.case?.application_id === filterApp);
        }

        if (filterType) {
            filtered = filtered.filter(s => s.case?.case_type_id === filterType);
        }

        if (filterStatus) {
            filtered = filtered.filter(s => s.case?.status_id === filterStatus);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(s =>
                s.title.toLowerCase().includes(query) ||
                s.description.toLowerCase().includes(query) ||
                s.case?.title.toLowerCase().includes(query)
            );
        }

        if (filterDateFrom) {
            const fromDate = new Date(filterDateFrom);
            filtered = filtered.filter(s => new Date(s.created_at) >= fromDate);
        }

        if (filterDateTo) {
            const toDate = new Date(filterDateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(s => new Date(s.created_at) <= toDate);
        }

        setFilteredSolutions(filtered);
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilterApp('');
        setFilterType('');
        setFilterStatus('');
        setSearchQuery('');
        setFilterDateFrom('');
        setFilterDateTo('');
    };

    // Pagination
    const totalPages = Math.ceil(filteredSolutions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedSolutions = filteredSolutions.slice(startIndex, endIndex);

    return (
        <>
            <Navbar />
            <main className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1400px' }}>
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                                Base de Conocimiento
                            </h1>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                Soluciones documentadas para casos resueltos
                            </p>
                        </div>
                        <Link href="/solutions/new" className="btn btn-primary">
                            + Nueva Solución
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
                        Filtros y Búsqueda
                    </h2>

                    {/* Search bar */}
                    <div className="form-group">
                        <input
                            type="text"
                            className="input"
                            placeholder="🔍 Buscar por título, descripción o nombre del caso..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="label">Aplicación</label>
                            <select className="input" value={filterApp} onChange={(e) => setFilterApp(e.target.value)}>
                                <option value="">Todas las aplicaciones</option>
                                {applications.map(app => (
                                    <option key={app.id} value={app.id}>{app.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="label">Tipo de Caso</label>
                            <select className="input" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                                <option value="">Todos los tipos</option>
                                {caseTypes.map(type => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="label">Estado del Caso</label>
                            <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                <option value="">Todos los estados</option>
                                {statuses.map(status => (
                                    <option key={status.id} value={status.id}>{status.name}</option>
                                ))}
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

                    <div className="flex items-center gap-4" style={{ marginTop: '1rem' }}>
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
                            <button onClick={clearFilters} className="btn btn-secondary">
                                Limpiar Filtros
                            </button>
                        </div>
                    </div>

                    {(filterApp || filterType || filterStatus || searchQuery || filterDateFrom || filterDateTo) && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Mostrando {filteredSolutions.length} de {solutions.length} soluciones
                            </p>
                        </div>
                    )}
                </div>

                {/* Solutions Table */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <div className="loading" style={{ width: '48px', height: '48px', margin: '0 auto' }} />
                    </div>
                ) : filteredSolutions.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {solutions.length === 0 ? 'No hay soluciones registradas' : 'No se encontraron soluciones con los filtros aplicados'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Título de Solución</th>
                                        <th>Caso Relacionado</th>
                                        <th>Aplicación</th>
                                        <th>Tipo</th>
                                        <th>Estado</th>
                                        <th>Creado por</th>
                                        <th>Fecha</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedSolutions.map(solution => (
                                        <tr key={solution.id}>
                                            <td style={{ fontWeight: 500 }}>
                                                <Link
                                                    href={`/solutions/${solution.id}`}
                                                    style={{ color: 'var(--primary)', textDecoration: 'none' }}
                                                >
                                                    {solution.title}
                                                </Link>
                                            </td>
                                            <td>
                                                <Link
                                                    href={`/cases/${solution.case?.id}`}
                                                    style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}
                                                >
                                                    {solution.case?.title}
                                                </Link>
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '0.75rem',
                                                    backgroundColor: `${solution.case?.application?.color}15`,
                                                    color: solution.case?.application?.color
                                                }}>
                                                    {solution.case?.application?.name || '-'}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.875rem' }}>{solution.case?.case_type?.name || '-'}</td>
                                            <td>
                                                <span style={{
                                                    padding: '0.25rem 0.625rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    backgroundColor: `${solution.case?.status?.color}15`,
                                                    color: solution.case?.status?.color
                                                }}>
                                                    {solution.case?.status?.name || '-'}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.875rem' }}>{solution.creator?.full_name || 'Sistema'}</td>
                                            <td style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                                                {formatDateTime(solution.created_at)}
                                            </td>
                                            <td>
                                                <Link href={`/solutions/${solution.id}`} className="btn btn-secondary btn-sm">
                                                    Ver
                                                </Link>
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
