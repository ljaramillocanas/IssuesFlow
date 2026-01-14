'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDateTime } from '@/lib/utils';
import LiquidLoader from '@/components/LiquidLoader';

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

interface ChangeHistoryProps {
    tableName: 'cases' | 'tests' | 'solutions';
    recordId: string;
}

export default function ChangeHistory({ tableName, recordId }: ChangeHistoryProps) {
    const [changes, setChanges] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadChanges();
    }, [tableName, recordId]);

    const loadChanges = async () => {
        setLoading(true);
        try {
            // 1. Fetch Audit Logs
            const { data: logsData, error: logsError } = await supabase
                .from('audit_log')
                .select('*')
                .eq('table_name', tableName)
                .eq('record_id', recordId)
                .order('created_at', { ascending: false });

            if (logsError) throw logsError;

            // 2. Fetch Users involved
            const userIds = Array.from(new Set(logsData?.map(l => l.changed_by) || []));
            let userMap = new Map();

            if (userIds.length > 0) {
                const { data: usersData } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .in('id', userIds);

                if (usersData) {
                    userMap = new Map(usersData.map(u => [u.id, u]));
                }
            }

            // 3. manual Join
            if (logsData) {
                const joinedChanges: AuditLogEntry[] = logsData.map(log => ({
                    ...log,
                    user: userMap.get(log.changed_by) || { full_name: 'Usuario Desconocido' }
                }));
                setChanges(joinedChanges);
            }
        } catch (error) {
            console.error('Error loading changes:', error);
        } finally {
            setLoading(false);
        }
    };

    const getChangedFields = (oldData: any, newData: any) => {
        if (!oldData || !newData) return [];

        const fields: { field: string; oldValue: any; newValue: any }[] = [];
        const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

        allKeys.forEach(key => {
            // Skip metadata fields and IDs
            if (['id', 'created_at', 'updated_at', 'deleted_at', 'created_by', 'updated_by'].includes(key)) {
                return;
            }

            if (oldData[key] !== newData[key]) {
                fields.push({
                    field: key,
                    oldValue: oldData[key],
                    newValue: newData[key]
                });
            }
        });

        return fields;
    };

    const formatFieldName = (field: string): string => {
        const fieldMap: Record<string, string> = {
            title: 'Título',
            description: 'Descripción',
            status_id: 'Estado',
            responsible_id: 'Responsable',
            priority: 'Prioridad',
            application_id: 'Aplicación',
            category_id: 'Categoría',
            case_type_id: 'Tipo de Caso',
            test_type_id: 'Tipo de Prueba',
            case_id: 'Caso Relacionado',
            notes: 'Notas',
        };

        return fieldMap[field] || field;
    };

    const formatValue = (value: any): string => {
        if (value === null || value === undefined) return 'N/A';
        if (typeof value === 'boolean') return value ? 'Sí' : 'No';
        if (typeof value === 'string' && value.length > 100) return value.substring(0, 100) + '...';
        return String(value);
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
                <LiquidLoader />
            </div>
        );
    }

    if (changes.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                No hay historial de cambios disponible
            </div>
        );
    }

    return (
        <div style={{ position: 'relative' }}>
            {/* Timeline Line */}
            <div style={{
                position: 'absolute',
                left: '20px',
                top: '30px',
                bottom: '30px',
                width: '2px',
                background: 'var(--border-color)'
            }} />

            {/* Changes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {changes.map((change, index) => {
                    const changedFields = change.action === 'UPDATE'
                        ? getChangedFields(change.old_record, change.new_record)
                        : [];

                    return (
                        <div key={change.id} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                            {/* Avatar Circle */}
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: change.action === 'INSERT'
                                    ? 'var(--accent)'
                                    : change.action === 'DELETE'
                                        ? 'var(--danger)'
                                        : 'var(--primary)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                flexShrink: 0,
                                zIndex: 1,
                                border: '3px solid var(--bg-primary)',
                            }}>
                                {change.user?.full_name?.charAt(0).toUpperCase() || '?'}
                            </div>

                            {/* Content Card */}
                            <div className="card" style={{
                                flex: 1,
                                padding: '1rem',
                                background: index === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)'
                            }}>
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.25rem' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {change.user?.full_name || 'Usuario Desconocido'}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {formatDateTime(change.created_at)}
                                        </span>
                                    </div>

                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        {change.action === 'INSERT' && '📝 Creó el registro'}
                                        {change.action === 'DELETE' && '🗑️ Eliminó el registro'}
                                        {change.action === 'UPDATE' && `✏️ Modificó ${changedFields.length} campo(s)`}
                                    </div>
                                </div>

                                {/* Changed Fields */}
                                {change.action === 'UPDATE' && changedFields.length > 0 && (
                                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {changedFields.map((field, idx) => (
                                            <div key={idx} style={{
                                                padding: '0.5rem',
                                                background: 'var(--bg-hover)',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '0.8125rem'
                                            }}>
                                                <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                                                    {formatFieldName(field.field)}
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <span style={{
                                                        color: 'var(--danger)',
                                                        textDecoration: 'line-through',
                                                        opacity: 0.7
                                                    }}>
                                                        {formatValue(field.oldValue)}
                                                    </span>
                                                    <span style={{ color: 'var(--text-secondary)' }}>→</span>
                                                    <span style={{ color: 'var(--accent)', fontWeight: 500 }}>
                                                        {formatValue(field.newValue)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
