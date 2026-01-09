import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Toast, ToastType } from '../hooks/useToast';

interface ToastContainerProps {
    toasts: Toast[];
    onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
    if (toasts.length === 0) return null;

    const getToastStyles = (type: ToastType) => {
        const styles: Record<ToastType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
            success: {
                bg: 'hsl(142 71% 45% / 0.1)',
                border: 'hsl(142 71% 45% / 0.3)',
                text: 'hsl(142 71% 55%)',
                icon: <CheckCircle size={16} />
            },
            error: {
                bg: 'hsl(0 84% 60% / 0.1)',
                border: 'hsl(0 84% 60% / 0.3)',
                text: 'hsl(0 84% 65%)',
                icon: <AlertCircle size={16} />
            },
            warning: {
                bg: 'hsl(32 95% 44% / 0.1)',
                border: 'hsl(32 95% 44% / 0.3)',
                text: 'hsl(32 95% 55%)',
                icon: <AlertTriangle size={16} />
            },
            info: {
                bg: 'hsl(217 91% 60% / 0.1)',
                border: 'hsl(217 91% 60% / 0.3)',
                text: 'hsl(217 91% 70%)',
                icon: <Info size={16} />
            }
        };
        return styles[type];
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxWidth: 'calc(100% - 32px)',
            width: '320px'
        }}>
            {toasts.map(toast => {
                const style = getToastStyles(toast.type);
                return (
                    <div
                        key={toast.id}
                        className="animate-in"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 14px',
                            backgroundColor: style.bg,
                            border: `1px solid ${style.border}`,
                            borderRadius: '12px',
                            color: style.text,
                            fontSize: '13px',
                            fontWeight: 600,
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                            backdropFilter: 'blur(12px)'
                        }}
                    >
                        <span style={{ flexShrink: 0 }}>{style.icon}</span>
                        <span style={{ flex: 1 }}>{toast.message}</span>
                        <button
                            onClick={() => onDismiss(toast.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: '4px',
                                cursor: 'pointer',
                                color: 'inherit',
                                opacity: 0.6,
                                transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                        >
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default ToastContainer;
