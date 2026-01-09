import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                        <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Something went wrong</h2>
                    <p className="text-xs text-slate-400 max-w-xs">{this.state.error?.message}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center gap-2 transition-colors border border-white/5"
                    >
                        <RefreshCw size={14} />
                        <span>Reload Extension</span>
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
