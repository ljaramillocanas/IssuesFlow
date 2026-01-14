import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

// Color palette matching the app (based on observation)
const colors = {
    primary: '#3b82f6',
    secondary: '#64748b',
    success: '#10b981',
    info: '#3b82f6',
    warning: '#f59e0b',
    danger: '#ef4444',
    background: '#1f2937', // Dark theme assumption or auto
};

// Generic toast
export const showToast = (title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    return MySwal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: icon,
        title: title,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });
};

// Alert replacement
export const showAlert = async (title: string, text?: string, icon: 'success' | 'error' | 'warning' | 'info' | 'question' = 'info') => {
    return MySwal.fire({
        title: title,
        text: text,
        icon: icon,
        confirmButtonColor: colors.primary,
        confirmButtonText: 'Entendido',
        // Styling tweaks
        customClass: {
            popup: 'swal2-custom-popup',
            confirmButton: 'swal2-custom-confirm'
        }
    });
};

// Confirm replacement
export const showConfirm = async (
    title: string,
    text: string = '¿Estás seguro de realizar esta acción?',
    confirmText: string = 'Sí, continuar',
    cancelText: string = 'Cancelar'
): Promise<boolean> => {
    const result = await MySwal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: colors.primary,
        cancelButtonColor: colors.danger,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        reverseButtons: true, // Cancel left, Confirm right usually safer
        focusCancel: true
    });

    return result.isConfirmed;
};

// Input Alert (like prompt)
export const showPrompt = async (title: string, text?: string, placeholder?: string): Promise<string | null> => {
    const { value: textValue } = await MySwal.fire({
        title: title,
        input: 'text',
        inputLabel: text,
        inputPlaceholder: placeholder,
        showCancelButton: true,
        confirmButtonColor: colors.primary,
        cancelButtonColor: colors.secondary,
        inputValidator: (value) => {
            if (!value) {
                return '¡Debes escribir algo!';
            }
            return null;
        }
    });

    return textValue || null;
};
