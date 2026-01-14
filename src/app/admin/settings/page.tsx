'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { showAlert } from '@/lib/sweetalert';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { Profile } from '@/types';
import { canAccessAdminPanel } from '@/lib/permissions';
import LiquidLoader from '@/components/LiquidLoader';

interface SystemSetting {
    key: string;
    value: any;
    description: string;
    updated_at: string;
}

export default function SettingsPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [settings, setSettings] = useState<Record<string, SystemSetting>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [appName, setAppName] = useState('SpeedIssueFlow');
    const [primaryColor, setPrimaryColor] = useState('#3B82F6');
    const [secondaryColor, setSecondaryColor] = useState('#8B5CF6');
    const [logoUrl, setLogoUrl] = useState('/logo.png');
    const [enableNotifications, setEnableNotifications] = useState(true);
    const [maxFileSize, setMaxFileSize] = useState('10');

    useEffect(() => {
        checkAuthAndLoad();
    }, []);

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

            // Check if user has admin permissions
            if (!canAccessAdminPanel(profileData.role)) {
                router.push('/');
                return;
            }

            await loadSettings();
        }
    };

    const loadSettings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('system_settings')
            .select('*');

        if (!error && data) {
            const settingsMap: Record<string, SystemSetting> = {};
            data.forEach(setting => {
                settingsMap[setting.key] = setting;
            });
            setSettings(settingsMap);

            // Populate form
            if (settingsMap['app_name']) setAppName(settingsMap['app_name'].value);
            if (settingsMap['theme_primary_color']) setPrimaryColor(settingsMap['theme_primary_color'].value);
            if (settingsMap['theme_secondary_color']) setSecondaryColor(settingsMap['theme_secondary_color'].value);
            if (settingsMap['logo_url']) setLogoUrl(settingsMap['logo_url'].value);
            if (settingsMap['enable_notifications']) setEnableNotifications(settingsMap['enable_notifications'].value);
            if (settingsMap['max_file_size_mb']) setMaxFileSize(String(settingsMap['max_file_size_mb'].value));
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!profile) return;

        setSaving(true);

        const updates = [
            { key: 'app_name', value: appName },
            { key: 'theme_primary_color', value: primaryColor },
            { key: 'theme_secondary_color', value: secondaryColor },
            { key: 'logo_url', value: logoUrl },
            { key: 'enable_notifications', value: enableNotifications },
            { key: 'max_file_size_mb', value: parseInt(maxFileSize) || 10 },
        ];

        try {
            for (const update of updates) {

                const { error } = await supabase
                    .from('system_settings')
                    .update({
                        value: update.value,
                        updated_by: profile.id
                    })
                    .eq('key', update.key);
                if (error) throw error;
            }
            showAlert('Éxito', '✅ Configuración guardada exitosamente', 'success');
            await loadSettings();
        } catch (error) {
            console.error(error);
            showAlert('Error', '❌ Error al guardar la configuración', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LiquidLoader />
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <main className="container" style={{ padding: '2rem 1.5rem', maxWidth: '900px' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        Configuración General
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Ajustes globales del sistema
                    </p>
                </div>

                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                        Identidad de la Aplicación
                    </h2>

                    <div className="form-group">
                        <label className="label">Nombre de la Aplicación</label>
                        <input
                            type="text"
                            className="input"
                            value={appName}
                            onChange={(e) => setAppName(e.target.value)}
                            placeholder="SpeedIssueFlow"
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                            Aparece en el navbar y título de la página
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="label">URL del Logo</label>
                        <input
                            type="text"
                            className="input"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            placeholder="/logo.png"
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                            Ruta relativa o URL completa del logo
                        </p>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                        Colores del Tema
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">Color Primario</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="color"
                                    className="input"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    style={{ width: '60px', height: '40px', padding: '0.25rem' }}
                                />
                                <input
                                    type="text"
                                    className="input"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    placeholder="#3B82F6"
                                    style={{ flex: 1 }}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="label">Color Secundario</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="color"
                                    className="input"
                                    value={secondaryColor}
                                    onChange={(e) => setSecondaryColor(e.target.value)}
                                    style={{ width: '60px', height: '40px', padding: '0.25rem' }}
                                />
                                <input
                                    type="text"
                                    className="input"
                                    value={secondaryColor}
                                    onChange={(e) => setSecondaryColor(e.target.value)}
                                    placeholder="#8B5CF6"
                                    style={{ flex: 1 }}
                                />
                            </div>
                        </div>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                        Los cambios de color requieren recargar la página para aplicarse
                    </p>
                </div>

                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                        Funcionalidades
                    </h2>

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={enableNotifications}
                                onChange={(e) => setEnableNotifications(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontWeight: 500 }}>Activar notificaciones por email</span>
                        </label>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', marginLeft: '1.625rem' }}>
                            Envía emails automáticos para cambios importantes
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="label">Tamaño máximo de archivos (MB)</label>
                        <input
                            type="number"
                            className="input"
                            value={maxFileSize}
                            onChange={(e) => setMaxFileSize(e.target.value)}
                            min="1"
                            max="100"
                            style={{ maxWidth: '200px' }}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                            Límite para imágenes y adjuntos (1-100 MB)
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                        onClick={() => loadSettings()}
                        className="btn btn-secondary"
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn btn-primary"
                        disabled={saving}
                    >
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </main>
        </>
    );
}
