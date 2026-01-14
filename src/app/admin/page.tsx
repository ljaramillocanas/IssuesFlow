'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LiquidLoader from '@/components/LiquidLoader';

export default function AdminPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to statuses page by default
        router.push('/admin/statuses');
    }, [router]);

    return (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
            <LiquidLoader />
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Redirigiendo...</p>
        </div>
    );
}
