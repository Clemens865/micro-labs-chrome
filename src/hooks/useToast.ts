import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

export const useToast = () => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
        const id = crypto.randomUUID();
        const newToast: Toast = { id, message, type, duration };

        setToasts(prev => [...prev, newToast]);

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => {
                dismissToast(id);
            }, duration);
        }

        return id;
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const clearAllToasts = useCallback(() => {
        setToasts([]);
    }, []);

    // Convenience methods
    const success = useCallback((message: string, duration?: number) => {
        return showToast(message, 'success', duration);
    }, [showToast]);

    const error = useCallback((message: string, duration?: number) => {
        return showToast(message, 'error', duration);
    }, [showToast]);

    const info = useCallback((message: string, duration?: number) => {
        return showToast(message, 'info', duration);
    }, [showToast]);

    const warning = useCallback((message: string, duration?: number) => {
        return showToast(message, 'warning', duration);
    }, [showToast]);

    return {
        toasts,
        showToast,
        dismissToast,
        clearAllToasts,
        success,
        error,
        info,
        warning
    };
};
