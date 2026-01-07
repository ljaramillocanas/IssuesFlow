'use client';

import React from 'react';
import { Status } from '@/types';

interface StatusBadgeProps {
    status: Status;
    size?: 'sm' | 'md' | 'lg';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    const sizeClasses = {
        sm: { fontSize: '0.6875rem', padding: '0.125rem 0.5rem' },
        md: { fontSize: '0.75rem', padding: '0.25rem 0.75rem' },
        lg: { fontSize: '0.875rem', padding: '0.375rem 1rem' },
    };

    return (
        <span
            className="badge"
            style={{
                ...sizeClasses[size],
                background: status.color ? `${status.color}20` : 'var(--bg-tertiary)',
                color: status.color || 'var(--text-primary)',
                borderRadius: '9999px',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
            }}
        >
            <span
                style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: status.color || 'var(--text-tertiary)',
                }}
            />
            {status.name}
        </span>
    );
}
