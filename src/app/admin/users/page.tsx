'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { Profile } from '@/types';
import { formatDateTime } from '@/lib/utils';

export default function UsersPage() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const router = useRouter();

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        full_name: '',
        role: 'Consulta' as 'Administrador' | 'Postventa' | 'Consulta',
    });

    useEffect(() => {
        checkAuthAndLoad();
    }, []);

    const checkAuthAndLoad = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'Administrador') {
            router.push('/');
            return;
        }

        loadUsers();
    };

    const loadUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setUsers(data);
        }
        setLoading(false);
    };

    const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('profiles')
            .update({ is_active: !currentStatus })
            .eq('id', userId);

        if (!error) {
            loadUsers();
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);

        try {
            // Call our new API route
            const response = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password,
                    role: formData.role,
                    fullName: formData.full_name
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al crear usuario');
            }

            alert('Usuario creado exitosamente');
            setShowModal(false);
            setFormData({ username: '', password: '', full_name: '', role: 'Consulta' });
            loadUsers();

        } catch (error: any) {
            alert(`Error al crear usuario: ${error.message}`);
        } finally {
            setCreating(false);
        }
    };

    return (
        <>
            <Navbar />
            <main className="container" style={{ padding: '2rem 1.5rem' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            Gestión de Usuarios
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Administra los usuarios del sistema
                        </p>
                    </div>
                    <button onClick={() => setShowModal(true)} className="btn btn-primary">
                        + Crear Usuario
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <div className="loading" style={{ width: '48px', height: '48px', margin: '0 auto' }} />
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Email</th>
                                    <th>Rol</th>
                                    <th>Estado</th>
                                    <th>Fecha de Registro</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td style={{ fontWeight: 500 }}>{user.full_name}</td>
                                        <td>{user.email}</td>
                                        <td>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: user.role === 'Administrador' ? 'var(--danger-bg)' :
                                                    user.role === 'Postventa' ? 'var(--warning-bg)' : 'var(--info-bg)',
                                                color: user.role === 'Administrador' ? 'var(--danger)' :
                                                    user.role === 'Postventa' ? 'var(--warning)' : 'var(--info)',
                                            }}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: user.is_active ? 'var(--success-bg)' : 'var(--danger-bg)',
                                                color: user.is_active ? 'var(--success)' : 'var(--danger)',
                                            }}>
                                                {user.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.8125rem' }}>{formatDateTime(user.created_at)}</td>
                                        <td>
                                            <button
                                                onClick={() => toggleUserStatus(user.id, user.is_active)}
                                                className="btn btn-secondary btn-sm"
                                            >
                                                {user.is_active ? 'Desactivar' : 'Activar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Create User Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => !creating && setShowModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                                Crear Nuevo Usuario
                            </h2>
                            <form onSubmit={handleCreateUser}>
                                <div className="form-group">
                                    <label className="label">Nombre Completo *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        required
                                        disabled={creating}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="label">Usuario *</label>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                        Se usará para iniciar sesión (ej: juan.perez)
                                    </div>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/\s/g, '') })}
                                        required
                                        disabled={creating}
                                        placeholder="usuario.sistema"
                                        pattern="[a-zA-Z0-9._-]+"
                                        title="Solo letras, números, puntos y guiones bajos"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="label">Contraseña *</label>
                                    <input
                                        type="password"
                                        className="input"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        minLength={6}
                                        disabled={creating}
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="label">Rol *</label>
                                    <select
                                        className="input select"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                        required
                                        disabled={creating}
                                    >
                                        <option value="Consulta">Consulta</option>
                                        <option value="Postventa">Postventa</option>
                                        <option value="Administrador">Administrador</option>
                                    </select>
                                </div>

                                <div className="flex gap-2" style={{ marginTop: '2rem' }}>
                                    <button type="submit" className="btn btn-primary" disabled={creating}>
                                        {creating ? 'Creando...' : 'Crear Usuario'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="btn btn-secondary"
                                        disabled={creating}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
