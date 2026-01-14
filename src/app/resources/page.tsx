'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import VideoPlayerModal from '@/components/VideoPlayerModal';
import LiquidLoader from '@/components/LiquidLoader';
import ResourceModal from '@/components/ResourceModal';
import EditResourceModal from '@/components/EditResourceModal';
import ShareResourceModal from '@/components/ShareResourceModal';
import CreateFolderModal from '@/components/CreateFolderModal';
import UploadFolderModal from '@/components/UploadFolderModal';
import { SolutionResource, Profile, Solution } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { showAlert, showConfirm } from '@/lib/sweetalert';

interface ResourceWithSolution extends SolutionResource {
    solution?: Solution;
}

export default function ResourcesRepositoryPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [resources, setResources] = useState<ResourceWithSolution[]>([]);
    const [filteredResources, setFilteredResources] = useState<ResourceWithSolution[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterFolder, setFilterFolder] = useState('');
    const [filterSolution, setFilterSolution] = useState('');
    const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null);
    const [showResourceModal, setShowResourceModal] = useState(false);
    const [editingResource, setEditingResource] = useState<ResourceWithSolution | null>(null);
    const [sharingResource, setSharingResource] = useState<ResourceWithSolution | null>(null);
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [showUploadFolderModal, setShowUploadFolderModal] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<string>('all'); // 'all' or folder name
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // Display mode

    // For filter options
    const [solutions, setSolutions] = useState<Pick<Solution, 'id' | 'title'>[]>([]);
    const [folders, setFolders] = useState<Array<{ name: string; icon: string; color: string; count: number }>>([]);

    useEffect(() => {
        checkAuthAndLoad();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [resources, searchTerm, filterType, filterFolder, filterSolution, selectedFolder]);

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
            await loadResources();
        }
    };

    const loadResources = async () => {
        setLoading(true);

        const { data: resourcesData, error } = await supabase
            .from('solution_resources')
            .select(`
                *,
                creator:profiles(id, full_name),
                solution:solutions(id, title)
            `)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (!error && resourcesData) {
            setResources(resourcesData);
        }

        // Load solutions for filter
        const { data: solutionsData } = await supabase
            .from('solutions')
            .select('id, title')
            .is('deleted_at', null)
            .order('title');

        if (solutionsData) {
            setSolutions(solutionsData);
        }

        // Load folders from resource_folders table
        const { data: foldersData } = await supabase
            .from('resource_folders')
            .select('name, icon, color')
            .is('deleted_at', null)
            .order('name');

        if (foldersData && resourcesData) {
            // Count resources per folder and merge with folder metadata
            const folderCounts = resourcesData.reduce((acc: any, r: any) => {
                acc[r.folder] = (acc[r.folder] || 0) + 1;
                return acc;
            }, {});

            const foldersWithCount = foldersData.map(f => ({
                name: f.name,
                icon: f.icon,
                color: f.color,
                count: folderCounts[f.name] || 0
            }));

            // Also include folders that have resources but no metadata
            const folderNames = new Set(foldersData.map(f => f.name));
            Object.keys(folderCounts).forEach(folderName => {
                if (!folderNames.has(folderName)) {
                    foldersWithCount.push({
                        name: folderName,
                        icon: '📁',
                        color: '#6B7280',
                        count: folderCounts[folderName]
                    });
                }
            });

            setFolders(foldersWithCount);
        }

        setLoading(false);
    };

    const handleDeleteFolder = async (folderName: string) => {
        const resourcesInFolder = resources.filter(r => r.folder === folderName);

        let confirmMessage = `¿Eliminar la carpeta "${folderName}"?`;
        if (resourcesInFolder.length > 0) {
            confirmMessage += `\n\nEsta carpeta contiene ${resourcesInFolder.length} recurso(s).\nLos recursos NO se eliminarán, solo la carpeta personalizada.`;
        }

        const confirmed = await showConfirm(confirmMessage);
        if (!confirmed) return;

        try {
            // Delete all resources in the folder (including subfolders)
            if (resourcesInFolder.length > 0) {
                // Delete files from storage
                for (const resource of resourcesInFolder) {
                    if (resource.url && resource.url.includes('solution-resources/')) {
                        const urlParts = resource.url.split('solution-resources/');
                        if (urlParts.length > 1) {
                            const filePath = urlParts[1].split('?')[0];
                            try {
                                await supabase.storage.from('solution-resources').remove([filePath]);
                            } catch (storageError) {
                                console.error(`Error deleting file:`, storageError);
                            }
                        }
                    }
                }
                // Soft delete resources from database
                const { error: resourcesError } = await supabase
                    .from('solution_resources')
                    .update({ deleted_at: new Date().toISOString() })
                    .in('id', resourcesInFolder.map(r => r.id));
                if (resourcesError) throw resourcesError;
            }
            // Soft delete the folder from resource_folders table
            const { error: folderError } = await supabase
                .from('resource_folders')
                .update({ deleted_at: new Date().toISOString() })
                .eq('name', folderName);

            if (folderError) {
                console.error('Folder deletion error:', folderError);
                throw folderError;
            }

            // Reload resources to update folder list
            loadResources();
            showAlert('Éxito', 'Carpeta eliminada exitosamente', 'success');
        } catch (error: any) {
            console.error('Error deleting folder:', error);
            showAlert('Error', 'Error al eliminar carpeta: ' + error.message, 'error');
        }
    };

    const applyFilters = () => {
        let filtered = [...resources];

        if (searchTerm) {
            const query = searchTerm.toLowerCase();
            filtered = filtered.filter(r =>
                r.title.toLowerCase().includes(query) ||
                r.description?.toLowerCase().includes(query) ||
                r.solution?.title.toLowerCase().includes(query)
            );
        }

        if (filterType) {
            filtered = filtered.filter(r => r.type === filterType);
        }

        if (filterFolder) {
            filtered = filtered.filter(r => r.folder === filterFolder);
        }

        if (filterSolution) {
            if (filterSolution === 'unlinked') {
                filtered = filtered.filter(r => !r.solution_id);
            } else {
                filtered = filtered.filter(r => r.solution_id === filterSolution);
            }
        }

        // Apply folder filter
        if (selectedFolder !== 'all') {
            filtered = filtered.filter(r => r.folder === selectedFolder);
        }

        setFilteredResources(filtered);
    };

    const handleDeleteResource = async (resource: ResourceWithSolution) => {
        const confirmed = await showConfirm(`¿Eliminar "${resource.title}"?`);
        if (!confirmed) return;

        try {
            // Delete from storage if it's a file
            if (resource.type !== 'link' && resource.type !== 'video') {
                try {
                    const path = resource.url.split('/solution-resources/')[1];
                    if (path) {
                        await supabase.storage.from('solution-resources').remove([path]);
                    }
                } catch (e) {
                    console.error('Error deleting file:', e);
                }
            }

            const { error } = await supabase
                .from('solution_resources')
                .delete()
                .eq('id', resource.id);

            if (error) throw error;

            await loadResources();
            showAlert('Éxito', 'Recurso eliminado exitosamente', 'success');
        } catch (error: any) {
            console.error('Error deleting resource:', error);
            showAlert('Error', 'Error al eliminar el recurso: ' + error.message, 'error');
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'video': return '🎥';
            case 'image': return '🖼️';
            case 'document': return '📄';
            case 'link': return '🔗';
            default: return '📎';
        }
    };

    const uniqueFolders = Array.from(new Set(resources.map(r => r.folder)));
    const activeFiltersCount = [searchTerm, filterType, filterFolder, filterSolution].filter(Boolean).length;

    return (
        <>
            <Navbar />
            <main className="main-content" style={{ padding: '2rem' }}>
                {/* Page Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '1.5rem',
                        flexWrap: 'wrap'
                    }}>
                        <div>
                            <h1 className="page-title">📁 Repositorio de Recursos</h1>
                            <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                Gestiona y organiza todos tus recursos multimedia
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={() => setShowCreateFolderModal(true)}
                                className="btn btn-secondary"
                            >
                                + Nueva Carpeta
                            </button>
                            <button
                                onClick={() => setShowUploadFolderModal(true)}
                                className="btn btn-secondary"
                            >
                                📂 Subir Carpeta
                            </button>
                            <button
                                onClick={() => setShowResourceModal(true)}
                                className="btn btn-primary"
                            >
                                + Agregar Recurso
                            </button>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="btn btn-secondary"
                                style={{ backgroundColor: showFilters ? 'var(--bg-tertiary)' : undefined }}
                            >
                                🔍 Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
                            Filtros de Búsqueda
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="label">Buscar</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="🔍 Buscar por título o descripción..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="label">Tipo de Recurso</label>
                                <select
                                    className="input"
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                >
                                    <option value="">Todos los tipos</option>
                                    <option value="video">🎥 Videos</option>
                                    <option value="image">🖼️ Imágenes</option>
                                    <option value="document">📄 Documentos</option>
                                    <option value="link">🔗 Enlaces</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="label">Carpeta</label>
                                <select
                                    className="input"
                                    value={filterFolder}
                                    onChange={(e) => setFilterFolder(e.target.value)}
                                >
                                    <option value="">Todas las carpetas</option>
                                    {uniqueFolders.map((folder) => (
                                        <option key={folder} value={folder}>
                                            📁 {folder}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="label">Solución</label>
                                <select
                                    className="input"
                                    value={filterSolution}
                                    onChange={(e) => setFilterSolution(e.target.value)}
                                >
                                    <option value="">Todas las soluciones</option>
                                    <option value="unlinked">📂 Recursos sin vincular</option>
                                    {solutions.map((sol) => (
                                        <option key={sol.id} value={sol.id}>
                                            {sol.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {activeFiltersCount > 0 && (
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        Mostrando {filteredResources.length} de {resources.length} recursos
                                    </p>
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setFilterType('');
                                            setFilterFolder('');
                                            setFilterSolution('');
                                        }}
                                        className="btn btn-secondary btn-sm"
                                    >
                                        Limpiar Filtros
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Two-column layout: Sidebar + Content */}
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                    {/* Left Sidebar - Folder Navigation */}
                    <aside style={{
                        width: '240px',
                        flexShrink: 0,
                        position: 'sticky',
                        top: '2rem',
                        maxHeight: 'calc(100vh - 4rem)',
                        overflowY: 'auto'
                    }}>
                        <div style={{
                            background: 'var(--glass-surface)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            borderRadius: '24px',
                            border: '1px solid var(--glass-border)',
                            boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.1)',
                            overflow: 'hidden'
                        }}>
                            {/* Sidebar Header */}
                            <div style={{
                                padding: '1rem',
                                borderBottom: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-secondary)'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.625rem'
                                }}>
                                    <div style={{
                                        fontSize: '1.125rem',
                                        width: '28px',
                                        height: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: 'var(--primary)12',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--primary)'
                                    }}>
                                        📁
                                    </div>
                                    <div>
                                        <h3 style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            margin: 0,
                                            color: 'var(--text-formal)'
                                        }}>
                                            Carpetas
                                        </h3>
                                        <p style={{
                                            fontSize: '0.6875rem',
                                            color: 'var(--text-secondary)',
                                            margin: '0.125rem 0 0 0'
                                        }}>
                                            {folders.length} categorías
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Folder List */}
                            <nav style={{ padding: '0.5rem' }}>
                                {/* All button */}
                                <button
                                    onClick={() => setSelectedFolder('all')}
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem 0.75rem',
                                        marginBottom: '0.375rem',
                                        borderRadius: '8px',
                                        border: selectedFolder === 'all' ? '1px solid var(--primary)' : '1px solid transparent',
                                        background: selectedFolder === 'all'
                                            ? 'var(--primary)'
                                            : 'transparent',
                                        color: selectedFolder === 'all' ? 'white' : 'var(--text-primary)',
                                        cursor: 'pointer',
                                        fontWeight: selectedFolder === 'all' ? 600 : 500,
                                        fontSize: '0.8125rem',
                                        transition: 'all 0.2s ease',
                                        boxShadow: selectedFolder === 'all'
                                            ? '0 2px 4px rgba(59, 130, 246, 0.2)'
                                            : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        textAlign: 'left'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (selectedFolder !== 'all') {
                                            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selectedFolder !== 'all') {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '1rem' }}>🌐</span>
                                        <span>Todos</span>
                                    </div>
                                    <span style={{
                                        padding: '0.125rem 0.5rem',
                                        backgroundColor: selectedFolder === 'all' ? 'rgba(255,255,255,0.25)' : 'var(--primary)12',
                                        color: selectedFolder === 'all' ? 'white' : 'var(--primary)',
                                        borderRadius: '10px',
                                        fontSize: '0.6875rem',
                                        fontWeight: 600
                                    }}>
                                        {resources.length}
                                    </span>
                                </button>

                                {/* Folder buttons */}
                                {folders.map((folder) => (
                                    <div
                                        key={folder.name}
                                        style={{
                                            position: 'relative',
                                            marginBottom: '0.375rem'
                                        }}
                                    >
                                        <button
                                            onClick={() => setSelectedFolder(folder.name)}
                                            style={{
                                                width: '100%',
                                                padding: '0.625rem 2rem 0.625rem 0.75rem',
                                                borderRadius: '8px',
                                                border: selectedFolder === folder.name ? `1px solid ${folder.color}` : '1px solid transparent',
                                                background: selectedFolder === folder.name
                                                    ? folder.color
                                                    : 'transparent',
                                                color: selectedFolder === folder.name ? 'white' : 'var(--text-primary)',
                                                cursor: 'pointer',
                                                fontWeight: selectedFolder === folder.name ? 600 : 500,
                                                fontSize: '0.8125rem',
                                                transition: 'all 0.2s ease',
                                                boxShadow: selectedFolder === folder.name
                                                    ? `0 2px 4px ${folder.color}30`
                                                    : 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                textAlign: 'left'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (selectedFolder !== folder.name) {
                                                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (selectedFolder !== folder.name) {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                                                <span style={{ fontSize: '0.9375rem', flexShrink: 0 }}>{folder.icon}</span>
                                                <span style={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>{folder.name}</span>
                                            </div>
                                            <span style={{
                                                padding: '0.125rem 0.5rem',
                                                backgroundColor: selectedFolder === folder.name ? 'rgba(255,255,255,0.25)' : `${folder.color}15`,
                                                color: selectedFolder === folder.name ? 'white' : folder.color,
                                                borderRadius: '10px',
                                                fontSize: '0.6875rem',
                                                fontWeight: 600,
                                                flexShrink: 0
                                            }}>
                                                {folder.count}
                                            </span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteFolder(folder.name);
                                            }}
                                            className="folder-delete-btn"
                                            style={{
                                                position: 'absolute',
                                                right: '0.5rem',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: 'var(--radius-sm)',
                                                border: 'none',
                                                backgroundColor: 'var(--danger)15',
                                                color: 'var(--danger)',
                                                cursor: 'pointer',
                                                fontSize: '0.75rem',
                                                opacity: 0,
                                                transition: 'opacity 0.2s',
                                                pointerEvents: 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--danger)';
                                                e.currentTarget.style.color = 'white';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--danger)15';
                                                e.currentTarget.style.color = 'var(--danger)';
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <div style={{ flex: 1, minWidth: 0 }}>

                        {/* View Mode Toggle */}
                        <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', width: 'fit-content' }}>
                            <button
                                onClick={() => setViewMode('grid')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    backgroundColor: viewMode === 'grid' ? 'var(--bg-primary)' : 'transparent',
                                    color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    transition: 'all 0.2s',
                                    boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none'
                                }}
                            >
                                ☰ Tarjetas
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    backgroundColor: viewMode === 'list' ? 'var(--bg-primary)' : 'transparent',
                                    color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    transition: 'all 0.2s',
                                    boxShadow: viewMode === 'list' ? 'var(--shadow-sm)' : 'none'
                                }}
                            >
                                ≡ Lista
                            </button>
                        </div>

                        {/* Resources Display - Grid or List */}

                        {/* Resources Grid */}
                        {
                            loading ? (
                                <div style={{ textAlign: 'center', padding: '3rem' }}>
                                    <LiquidLoader />
                                </div>
                            ) : filteredResources.length === 0 ? (
                                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                        {resources.length === 0 ? 'No hay recursos en el repositorio' : 'No se encontraron recursos con los filtros aplicados'}
                                    </p>
                                </div>
                            ) : viewMode === 'grid' ? (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                    gap: '1.25rem'
                                }}>
                                    {filteredResources.map((resource) => (
                                        <div
                                            key={resource.id}
                                            style={{
                                                padding: '1.5rem',
                                                backgroundColor: 'var(--bg-secondary)',
                                                borderRadius: 'var(--radius-lg)',
                                                border: '1px solid var(--border-color)',
                                                transition: 'all 0.3s',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '1rem'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-4px)';
                                                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                            onClick={() => {
                                                if (resource.type === 'video') {
                                                    setPlayingVideo({ url: resource.url, title: resource.title });
                                                } else {
                                                    window.open(resource.url, '_blank');
                                                }
                                            }}
                                        >
                                            {/* Icon & Type Badge */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ fontSize: '2.5rem' }}>
                                                    {getIcon(resource.type)}
                                                </div>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 500,
                                                    backgroundColor: 'var(--primary)15',
                                                    color: 'var(--primary)'
                                                }}>
                                                    {resource.type}
                                                </span>
                                            </div>

                                            {/* Title */}
                                            <h3 style={{
                                                fontSize: '1.125rem',
                                                fontWeight: 600,
                                                color: 'var(--text-primary)',
                                                margin: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {resource.title}
                                            </h3>

                                            {/* Description */}
                                            {resource.description && (
                                                <p style={{
                                                    fontSize: '0.875rem',
                                                    color: 'var(--text-secondary)',
                                                    margin: 0,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical'
                                                }}>
                                                    {resource.description}
                                                </p>
                                            )}

                                            {/* Solution Link */}
                                            {resource.solution_id ? (
                                                <Link
                                                    href={`/solutions/${resource.solution_id}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        fontSize: '0.875rem',
                                                        color: 'var(--primary)',
                                                        textDecoration: 'none',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem'
                                                    }}
                                                >
                                                    📋 {resource.solution?.title || 'Solución'}
                                                </Link>
                                            ) : (
                                                <div style={{
                                                    fontSize: '0.875rem',
                                                    color: 'var(--text-tertiary)',
                                                    fontStyle: 'italic',
                                                    padding: '0.5rem 0'
                                                }}>
                                                    📂 Recurso independiente
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div style={{
                                                display: 'flex',
                                                gap: '0.5rem',
                                                paddingTop: '0.75rem',
                                                borderTop: '1px solid var(--border-color)'
                                            }}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingResource(resource);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '0.5rem',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: '1px solid var(--border-color)',
                                                        backgroundColor: 'var(--bg-primary)',
                                                        color: 'var(--text-primary)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.875rem',
                                                        fontWeight: 500,
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.5rem'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'var(--primary)15';
                                                        e.currentTarget.style.borderColor = 'var(--primary)';
                                                        e.currentTarget.style.color = 'var(--primary)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                                                        e.currentTarget.style.borderColor = 'var(--border-color)';
                                                        e.currentTarget.style.color = 'var(--text-primary)';
                                                    }}
                                                >
                                                    ✏️ Editar
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSharingResource(resource);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '0.5rem',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: '1px solid var(--border-color)',
                                                        backgroundColor: resource.share_enabled ? 'var(--success)15' : 'var(--bg-primary)',
                                                        color: resource.share_enabled ? 'var(--success)' : 'var(--text-primary)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.875rem',
                                                        fontWeight: 500,
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.5rem'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!resource.share_enabled) {
                                                            e.currentTarget.style.backgroundColor = 'var(--primary)15';
                                                            e.currentTarget.style.borderColor = 'var(--primary)';
                                                            e.currentTarget.style.color = 'var(--primary)';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!resource.share_enabled) {
                                                            e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                                                            e.currentTarget.style.borderColor = 'var(--border-color)';
                                                            e.currentTarget.style.color = 'var(--text-primary)';
                                                        }
                                                    }}
                                                >
                                                    🔗 {resource.share_enabled ? 'Compartido' : 'Compartir'}
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteResource(resource);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '0.5rem',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: '1px solid var(--border-color)',
                                                        backgroundColor: 'var(--bg-primary)',
                                                        color: 'var(--text-primary)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.875rem',
                                                        fontWeight: 500,
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.5rem'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'var(--danger)15';
                                                        e.currentTarget.style.borderColor = 'var(--danger)';
                                                        e.currentTarget.style.color = 'var(--danger)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                                                        e.currentTarget.style.borderColor = 'var(--border-color)';
                                                        e.currentTarget.style.color = 'var(--text-primary)';
                                                    }}
                                                >
                                                    🗑️ Eliminar
                                                </button>
                                            </div>

                                            {/* Metadata */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                paddingTop: '0.75rem',
                                                borderTop: '1px solid var(--border-color)',
                                                fontSize: '0.75rem',
                                                color: 'var(--text-tertiary)'
                                            }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    <span>📁 {resource.folder}</span>
                                                    <span>👤 {resource.creator?.full_name || 'Sistema'}</span>
                                                </div>
                                                {resource.file_size && (
                                                    <span style={{ fontWeight: 500 }}>
                                                        {(resource.file_size / 1024 / 1024).toFixed(2)} MB
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* List View */
                                <div className="card" style={{ overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)' }}>
                                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600 }}>Tipo</th>
                                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600 }}>Título</th>
                                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600 }}>Carpeta</th>
                                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600 }}>Tamaño</th>
                                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600 }}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredResources.map((resource, index) => (
                                                <tr
                                                    key={resource.id}
                                                    style={{
                                                        borderBottom: '1px solid var(--border-color)',
                                                        backgroundColor: index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                                                        transition: 'background-color 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'}
                                                >
                                                    <td style={{ padding: '1rem' }}>
                                                        <span style={{ fontSize: '1.5rem' }}>{getIcon(resource.type)}</span>
                                                    </td>
                                                    <td
                                                        style={{ padding: '1rem', cursor: 'pointer', color: 'var(--primary)' }}
                                                        onClick={() => {
                                                            if (resource.type === 'video') {
                                                                setPlayingVideo({ url: resource.url, title: resource.title });
                                                            } else {
                                                                window.open(resource.url, '_blank');
                                                            }
                                                        }}
                                                    >
                                                        <div style={{ fontWeight: 500 }}>{resource.title}</div>
                                                        {resource.description && (
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                                                                {resource.description.substring(0, 60)}{resource.description.length > 60 ? '...' : ''}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                        📁 {resource.folder}
                                                    </td>
                                                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                        {resource.file_size ? `${(resource.file_size / 1024 / 1024).toFixed(2)} MB` : '-'}
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingResource(resource);
                                                                }}
                                                                style={{
                                                                    padding: '0.375rem 0.75rem',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    border: '1px solid var(--border-color)',
                                                                    backgroundColor: 'var(--bg-primary)',
                                                                    color: 'var(--text-primary)',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.75rem',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'var(--primary)15';
                                                                    e.currentTarget.style.borderColor = 'var(--primary)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                                                                    e.currentTarget.style.borderColor = 'var(--border-color)';
                                                                }}
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSharingResource(resource);
                                                                }}
                                                                style={{
                                                                    padding: '0.375rem 0.75rem',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    border: '1px solid var(--border-color)',
                                                                    backgroundColor: resource.share_enabled ? 'var(--success)15' : 'var(--bg-primary)',
                                                                    color: resource.share_enabled ? 'var(--success)' : 'var(--text-primary)',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.75rem',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                🔗
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteResource(resource);
                                                                }}
                                                                style={{
                                                                    padding: '0.375rem 0.75rem',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    border: '1px solid var(--border-color)',
                                                                    backgroundColor: 'var(--bg-primary)',
                                                                    color: 'var(--text-primary)',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.75rem',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'var(--danger)15';
                                                                    e.currentTarget.style.borderColor = 'var(--danger)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                                                                    e.currentTarget.style.borderColor = 'var(--border-color)';
                                                                }}
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                    </div>
                    {/* Close main content area */}
                </div >
                {/* Close two-column flex container */}
            </main >

            {/* Modals */}
            {
                showResourceModal && (
                    <ResourceModal
                        existingFolders={Array.from(new Set(resources.map(r => r.folder)))}
                        solutions={solutions}
                        onClose={() => setShowResourceModal(false)}
                        onSuccess={() => {
                            setShowResourceModal(false);
                            loadResources();
                        }}
                    />
                )
            }

            {
                editingResource && (
                    <EditResourceModal
                        resource={editingResource}
                        existingFolders={Array.from(new Set(resources.map(r => r.folder)))}
                        solutions={solutions}
                        onClose={() => setEditingResource(null)}
                        onSuccess={() => {
                            setEditingResource(null);
                            loadResources();
                        }}
                    />
                )
            }

            {
                sharingResource && (
                    <ShareResourceModal
                        resource={sharingResource}
                        onClose={() => setSharingResource(null)}
                        onSuccess={() => {
                            setSharingResource(null);
                            loadResources();
                        }}
                    />
                )
            }

            {
                showCreateFolderModal && (
                    <CreateFolderModal
                        onClose={() => setShowCreateFolderModal(false)}
                        onSuccess={() => {
                            setShowCreateFolderModal(false);
                            loadResources();
                        }}
                    />
                )
            }

            {
                showUploadFolderModal && (
                    <UploadFolderModal
                        existingFolders={Array.from(new Set(resources.map(r => r.folder)))}
                        solutions={solutions}
                        onClose={() => setShowUploadFolderModal(false)}
                        onSuccess={() => {
                            setShowUploadFolderModal(false);
                            loadResources();
                        }}
                    />
                )
            }

            {/* Video Player Modal */}
            {
                playingVideo && (
                    <VideoPlayerModal
                        videoUrl={playingVideo.url}
                        title={playingVideo.title}
                        onClose={() => setPlayingVideo(null)}
                    />
                )
            }
            <style jsx global>{`
                .folder-delete-btn {
                    pointer-events: none !important;
                    opacity: 0 !important;
                }
                div:hover > .folder-delete-btn {
                    pointer-events: auto !important;
                    opacity: 1 !important;
                }
            `}</style>
        </>
    );
}
