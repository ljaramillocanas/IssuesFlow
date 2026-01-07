'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to statuses page by default
        router.push('/admin/statuses');
    }, [router]);

    return (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="loading" style={{ width: '48px', height: '48px', margin: '0 auto' }} />
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Redirigiendo...</p>
        </div>
    );
}
