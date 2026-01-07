'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Case } from '@/types';

interface CaseSelectorProps {
    value: string;
    onChange: (caseId: string) => void;
    onCaseSelect?: (caseData: Case) => void;
    disabled?: boolean;
    preSelectedId?: string;
}

export default function CaseSelector({ value, onChange, onCaseSelect, disabled, preSelectedId }: CaseSelectorProps) {
    const [cases, setCases] = useState<Case[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadCases();
    }, []);

    useEffect(() => {
        if (preSelectedId && cases.length > 0) {
            const selectedCase = cases.find(c => c.id === preSelectedId);
            if (selectedCase && onCaseSelect) {
                onCaseSelect(selectedCase);
            }
        }
    }, [preSelectedId, cases]);

    const loadCases = async () => {
        const { data, error } = await supabase
            .from('cases')
            .select(`
        id, title, description, created_at,
        application:applications(id, name, color),
        category:categories(id, name),
        case_type:case_types(id, name),
        status:statuses(id, name, color),
        responsible:profiles!cases_responsible_id_fkey(id, full_name),
        creator:profiles!cases_created_by_fkey(id, full_name)
      `)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(200);

        if (!error && data) {
            setCases(data);
        }
        setLoading(false);
    };

    const handleChange = (caseId: string) => {
        onChange(caseId);
        if (onCaseSelect) {
            const selectedCase = cases.find(c => c.id === caseId);
            if (selectedCase) {
                onCaseSelect(selectedCase);
            }
        }
    };

    const filteredCases = searchQuery
        ? cases.filter(c =>
            c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.application?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : cases;

    if (loading) {
        return <div className="loading" style={{ width: '24px', height: '24px' }} />;
    }

    return (
        <div>
            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <input
                    type="text"
                    className="input"
                    placeholder="🔍 Buscar caso por nombre o aplicación..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={disabled || !!preSelectedId}
                />
            </div>

            <select
                className="input"
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                disabled={disabled || !!preSelectedId}
                required
            >
                <option value="">Selecciona un caso...</option>
                {filteredCases.map(c => (
                    <option key={c.id} value={c.id}>
                        {c.title} - {c.application?.name || 'Sin app'} ({c.status?.name})
                    </option>
                ))}
            </select>

            {searchQuery && filteredCases.length === 0 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                    No se encontraron casos con "{searchQuery}"
                </p>
            )}

            {!searchQuery && filteredCases.length === 0 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                    No hay casos disponibles
                </p>
            )}
        </div>
    );
}
