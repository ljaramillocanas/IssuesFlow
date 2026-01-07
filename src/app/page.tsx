'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { Profile } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCases: 0,
    totalTests: 0,
    pendingCases: 0,
    finishedCases: 0,
    pendingTests: 0,
    finishedTests: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Charts View Toggle
  const [chartView, setChartView] = useState<'cases' | 'tests'>('cases');
  const [statusData, setStatusData] = useState<any[]>([]);
  const [appData, setAppData] = useState<any[]>([]);
  const [testStatusData, setTestStatusData] = useState<any[]>([]);
  const [testAppData, setTestAppData] = useState<any[]>([]);

  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
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
      await loadStats();
    }

    setLoading(false);
  };

  const loadStats = async () => {
    try {
      // 1. Get Statuses
      const { data: statuses } = await supabase
        .from('statuses')
        .select('id, name, color, is_final')
        .is('deleted_at', null);

      const finalStatusIds = statuses?.filter(s => s.is_final).map(s => s.id) || [];
      const pendingStatusIds = statuses?.filter(s => !s.is_final).map(s => s.id) || [];

      // 2. Get All Cases
      const { data: allCases, count: casesCount } = await supabase
        .from('cases')
        .select(`
          id, 
          status_id, 
          application:applications(name)
        `, { count: 'exact' })
        .is('deleted_at', null);

      // 3. Get All Tests
      const { data: allTests, count: testsCount } = await supabase
        .from('tests')
        .select(`
          id, 
          status_id,
          application:applications(name)
        `, { count: 'exact' })
        .is('deleted_at', null);

      // Calculate Stats
      const pendingCases = allCases?.filter(c => pendingStatusIds.includes(c.status_id)).length || 0;
      const finishedCases = allCases?.filter(c => finalStatusIds.includes(c.status_id)).length || 0;

      const pendingTests = allTests?.filter(t => pendingStatusIds.includes(t.status_id)).length || 0;
      const finishedTests = allTests?.filter(t => finalStatusIds.includes(t.status_id)).length || 0;

      setStats({
        totalCases: casesCount || 0,
        totalTests: testsCount || 0,
        pendingCases,
        finishedCases,
        pendingTests,
        finishedTests,
      });

      // --- Process Chart Data (Cases) ---
      const processStatusData = (items: any[]) => {
        const map = new Map();
        statuses?.forEach(s => {
          const count = items?.filter(i => i.status_id === s.id).length || 0;
          if (count > 0) {
            map.set(s.name, {
              name: s.name,
              value: count,
              color: s.color || '#cccccc'
            });
          }
        });
        return Array.from(map.values());
      };

      const processAppData = (items: any[]) => {
        const map = new Map();
        items?.forEach(item => {
          const appName = item.application?.name || 'Sin App';
          map.set(appName, {
            name: appName,
            value: (map.get(appName)?.value || 0) + 1
          });
        });
        return Array.from(map.values());
      };

      // Set Cases Data
      setStatusData(processStatusData(allCases || []));
      setAppData(processAppData(allCases || []));

      // Set Tests Data
      setTestStatusData(processStatusData(allTests || []));
      setTestAppData(processAppData(allTests || []));

      // 4. Get Recent Activity - FULL MANUAL FETCH (No Joins)
      const { data: recentCases, error: recentError } = await supabase
        .from('cases')
        .select('*') // No relations, just raw fields
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (recentError) {
        console.error('Error fetching recent cases:', recentError);
      }

      if (recentCases && recentCases.length > 0) {
        // A. Fetch Profiles
        const responsibleIds = Array.from(new Set(recentCases.map(c => c.responsible_id).filter(Boolean)));
        let profilesMap: Record<string, any> = {};

        if (responsibleIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', responsibleIds);

          if (profiles) {
            profilesMap = profiles.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {});
          }
        }

        // B. Fetch Statuses
        const statusIds = Array.from(new Set(recentCases.map(c => c.status_id).filter(Boolean)));
        let statusesMap: Record<string, any> = {};

        if (statusIds.length > 0) {
          const { data: statusList } = await supabase
            .from('statuses')
            .select('id, name, color, is_final')
            .in('id', statusIds);

          if (statusList) {
            statusesMap = statusList.reduce((acc: any, s: any) => ({ ...acc, [s.id]: s }), {});
          }
        }

        // C. Merge Data
        const casesWithDetails = recentCases.map(c => ({
          ...c,
          responsible: c.responsible_id ? profilesMap[c.responsible_id] : null,
          status: c.status_id ? statusesMap[c.status_id] : null
        }));

        setRecentActivity(casesWithDetails);
      } else {
        setRecentActivity([]);
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading" style={{ width: '48px', height: '48px' }} />
      </div>
    );
  }

  // Decide what to show
  const currentStatusData = chartView === 'cases' ? statusData : testStatusData;
  const currentAppData = chartView === 'cases' ? appData : testAppData;
  const chartColor = chartView === 'cases' ? 'var(--primary)' : '#10B981'; // Use CSS var or static color

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1400px' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Dashboard Global
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Bienvenido de nuevo, {profile?.full_name}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/cases/new')} className="btn btn-primary">
              + Nuevo Caso
            </button>
          </div>
        </div>

        {/* Stats & Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginBottom: '2rem' }}>
          {/* Module: Casos */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--primary)', color: 'white' }}>
                📂
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Gestión de Casos</h2>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total</p>
                <p className="text-xl font-bold">{stats.totalCases}</p>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: '#FFF7ED' }}>
                <p className="text-sm" style={{ color: '#EA580C', marginBottom: '0.25rem' }}>Pendiente</p>
                <p className="text-xl font-bold" style={{ color: '#EA580C' }}>{stats.pendingCases}</p>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: '#F0FDF4' }}>
                <p className="text-sm" style={{ color: '#16A34A', marginBottom: '0.25rem' }}>Finalizado</p>
                <p className="text-xl font-bold" style={{ color: '#16A34A' }}>{stats.finishedCases}</p>
              </div>
            </div>
          </div>

          {/* Module: Pruebas */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ padding: '8px', borderRadius: '8px', background: '#10B981', color: 'white' }}>
                🧪
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Gestión de Pruebas</h2>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total</p>
                <p className="text-xl font-bold">{stats.totalTests}</p>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: '#FFFBEB' }}>
                <p className="text-sm" style={{ color: '#D97706', marginBottom: '0.25rem' }}>Pendiente</p>
                <p className="text-xl font-bold" style={{ color: '#D97706' }}>{stats.pendingTests}</p>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: '#ECFDF5' }}>
                <p className="text-sm" style={{ color: '#059669', marginBottom: '0.25rem' }}>Finalizado</p>
                <p className="text-xl font-bold" style={{ color: '#059669' }}>{stats.finishedTests}</p>
              </div>
            </div>
          </div>

          {/* Module: Acceso Rápido */}
          <div className="card flex flex-col justify-center" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', border: 'none' }}>
            <h3 className="font-semibold text-lg mb-1" style={{ color: 'white' }}>Acceso Rápido</h3>
            <p className="text-xs mb-4" style={{ color: '#e0e7ff' }}>Acciones frecuentes</p>

            <div className="flex flex-col gap-2">
              <button onClick={() => router.push('/tests/new')} className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', justifyContent: 'flex-start', border: '1px solid rgba(255,255,255,0.2)' }}>
                <span>🧪</span> Crear Nueva Prueba
              </button>
              <button onClick={() => router.push('/reports')} className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', justifyContent: 'flex-start', border: '1px solid rgba(255,255,255,0.2)' }}>
                <span>📊</span> Generar Reportes
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Charts & Toggle */}
        <div style={{ marginBottom: '2rem' }}>
          {/* Header with Switch */}
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Visualización Gráfica</h3>
            <div className="flex p-1 rounded-lg gap-1" style={{ background: 'var(--bg-secondary)' }}>
              <button
                onClick={() => setChartView('cases')}
                className="px-4 py-2 rounded-md text-sm font-semibold transition-all"
                style={{
                  background: chartView === 'cases' ? 'white' : 'transparent',
                  color: chartView === 'cases' ? 'var(--primary)' : 'var(--text-secondary)',
                  boxShadow: chartView === 'cases' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                Casos
              </button>
              <button
                onClick={() => setChartView('tests')}
                className="px-4 py-2 rounded-md text-sm font-semibold transition-all"
                style={{
                  background: chartView === 'tests' ? 'white' : 'transparent',
                  color: chartView === 'tests' ? '#10B981' : 'var(--text-secondary)',
                  boxShadow: chartView === 'tests' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                Pruebas
              </button>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card" style={{ height: '400px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                Distribución por Estados ({chartView === 'cases' ? 'Casos' : 'Pruebas'})
              </h3>
              <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
                {currentStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={currentStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {currentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    No hay datos para mostrar
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={{ height: '400px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                {chartView === 'cases' ? 'Casos' : 'Pruebas'} por Aplicación
              </h3>
              <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
                {currentAppData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={currentAppData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: 'var(--bg-secondary)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="value" fill={chartColor} radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    No hay datos para mostrar
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity - Full Width */}
        <div className="card w-full">
          <div className="flex justify-between items-center mb-4" style={{ padding: '0 0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              Actividad Reciente
            </h2>
            <button onClick={() => router.push('/cases')} className="btn btn-secondary btn-sm">
              Ver Todos
            </button>
          </div>

          {recentActivity.length > 0 ? (
            <div className="table-container">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th className="text-left py-3 pl-4">Caso/Prueba</th>
                    <th className="text-left py-3">Estado</th>
                    <th className="text-left py-3">Responsable</th>
                    <th className="text-left py-3">Aplicación</th>
                    <th className="text-left py-3">Fecha</th>
                    <th className="pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 500 }} className="pl-4 py-3">
                        <div className="flex flex-col">
                          <span style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {item.id.slice(0, 8)}...</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            backgroundColor: `${item.status?.color}15`,
                            color: item.status?.color
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: item.status?.color }}></span>
                          {item.status?.name}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {item.responsible ? (
                            <>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                                {item.responsible?.full_name?.charAt(0) || '?'}
                              </div>
                              <span style={{ fontSize: '0.875rem' }}>{item.responsible?.full_name?.split(' ')[0]}</span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '0.875rem' }}>Sin asignar</span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }} className="py-3">
                        {item.application_id === 'SFL' ? 'SFL' : 'General'}
                      </td>
                      <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }} className="py-3">
                        {new Date(item.updated_at).toLocaleDateString()}
                      </td>
                      <td className="text-right pr-4 py-3">
                        <button
                          onClick={() => router.push(`/cases/${item.id}`)}
                          style={{ color: 'var(--primary)', fontWeight: 500, fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          Ver →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No hay actividad reciente
            </div>
          )}
        </div>
      </main>
    </>
  );
}
