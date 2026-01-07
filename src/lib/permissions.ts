import { UserRole } from '@/types';

// Permisos por rol
export const permissions = {
    Administrador: {
        canCreateCase: true,
        canEditCase: true,
        canDeleteCase: true,
        canCreateTest: true,
        canEditTest: true,
        canDeleteTest: true,
        canManageUsers: true,
        canManageConfig: true,
        canViewAudit: true,
        canExport: true,
        canEditFinalStatus: true,
    },
    Postventa: {
        canCreateCase: true,
        canEditCase: true,
        canDeleteCase: false,
        canCreateTest: true,
        canEditTest: true,
        canDeleteTest: false,
        canManageUsers: false,
        canManageConfig: false,
        canViewAudit: true,
        canExport: true,
        canEditFinalStatus: false,
    },
    Consulta: {
        canCreateCase: false,
        canEditCase: false,
        canDeleteCase: false,
        canCreateTest: false,
        canEditTest: false,
        canDeleteTest: false,
        canManageUsers: false,
        canManageConfig: false,
        canViewAudit: true,
        canExport: true,
        canEditFinalStatus: false,
    },
};

export const hasPermission = (role: UserRole, permission: keyof typeof permissions.Administrador): boolean => {
    return permissions[role][permission] ?? false;
};

export const canAccessAdminPanel = (role: UserRole): boolean => {
    return role === 'Administrador';
};
