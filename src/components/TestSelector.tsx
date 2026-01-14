'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import LiquidLoader from '@/components/LiquidLoader';
import { Test } from '@/types';

interface TestSelectorProps {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    disabled?: boolean;
}

export default function TestSelector({ selectedIds, onChange, disabled }: TestSelectorProps) {
    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadTests();
    }, []);

    const loadTests = async () => {
        const { data, error } = await supabase
            .from('tests')
            .select(`
                id, title, status_id, created_at,
                status:statuses(id, name, color),
                case:cases(id, title)
            `)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(100);

        if (!error && data) {
            setTests(data as unknown as Test[]);
        }
        setLoading(false);
    };

    const toggleTest = (testId: string) => {
        if (selectedIds.includes(testId)) {
            onChange(selectedIds.filter(id => id !== testId));
        } else {
            onChange([...selectedIds, testId]);
        }
    };

    const filteredTests = tests.filter(test =>
        test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.case?.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><LiquidLoader /></div>;

    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div className="form-group">
                <input
                    type="text"
                    className="input"
                    placeholder="🔍 Buscar prueba por nombre o caso..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={disabled}
                />
            </div>

            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {filteredTests.map(test => (
                    <label
                        key={test.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: selectedIds.includes(test.id) ? 'var(--bg-secondary)' : 'transparent',
                            cursor: disabled ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={selectedIds.includes(test.id)}
                            onChange={() => toggleTest(test.id)}
                            disabled={disabled}
                            style={{ width: '16px', height: '16px' }}
                        />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{test.title}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                Caso: {test.case?.title || 'Sin caso'} • Estado: {test.status?.name || '-'}
                            </p>
                        </div>
                    </label>
                ))}

                {filteredTests.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '1rem' }}>
                        No se encontraron pruebas
                    </p>
                )}
            </div>

            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {selectedIds.length} prueba(s) seleccionada(s)
            </p>
        </div>
    );
}
