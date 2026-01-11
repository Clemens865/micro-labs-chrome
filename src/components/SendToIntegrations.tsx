/**
 * SendToIntegrations Component
 * A button + dropdown to send app outputs to configured integrations
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    Send,
    Check,
    X,
    Loader2,
    ChevronDown,
    Webhook,
    MessageSquare,
    FileText,
    Table,
    Zap,
    Boxes,
    Users,
    Cloud,
    HardDrive,
    Settings,
    ExternalLink
} from 'lucide-react';
import { useIntegrations } from '../hooks/useIntegrations';
import { WebhookPayload, WebhookResult, IntegrationType } from '../services/webhookService';

interface SendToIntegrationsProps {
    appId: string;
    appName: string;
    data: Record<string, any>;
    source?: { url?: string; title?: string };
    onSuccess?: (results: WebhookResult[]) => void;
    onError?: (error: string) => void;
    variant?: 'button' | 'icon' | 'minimal';
    className?: string;
}

const IntegrationIcon: React.FC<{ type: IntegrationType; size?: number }> = ({ type, size = 16 }) => {
    const icons: Record<IntegrationType, React.ReactNode> = {
        'generic-webhook': <Webhook size={size} />,
        'slack': <MessageSquare size={size} />,
        'notion': <FileText size={size} />,
        'airtable': <Table size={size} />,
        'zapier': <Zap size={size} />,
        'make': <Boxes size={size} />,
        'hubspot': <Users size={size} />,
        'salesforce': <Cloud size={size} />,
        'google-drive': <HardDrive size={size} />,
    };
    return <>{icons[type] || <Webhook size={size} />}</>;
};

export const SendToIntegrations: React.FC<SendToIntegrationsProps> = ({
    appId,
    appName,
    data,
    source,
    onSuccess,
    onError,
    variant = 'button',
    className = '',
}) => {
    const { integrations, sendToOne, sendToAll, getEnabledIntegrations } = useIntegrations();
    const [isOpen, setIsOpen] = useState(false);
    const [sending, setSending] = useState<string | null>(null); // 'all' or integration id
    const [results, setResults] = useState<WebhookResult[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const enabledIntegrations = getEnabledIntegrations();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const createPayload = (): WebhookPayload => ({
        appId,
        appName,
        timestamp: Date.now(),
        source: source || {},
        data,
    });

    const handleSendToAll = async () => {
        if (enabledIntegrations.length === 0) return;

        setSending('all');
        try {
            const payload = createPayload();
            const results = await sendToAll(payload);
            setResults(results);

            const failed = results.filter(r => !r.success);
            if (failed.length === 0) {
                onSuccess?.(results);
            } else if (failed.length === results.length) {
                onError?.('All integrations failed');
            } else {
                onSuccess?.(results);
            }
        } catch (err: any) {
            onError?.(err.message || 'Failed to send');
        } finally {
            setSending(null);
            setTimeout(() => setResults([]), 3000);
        }
    };

    const handleSendToOne = async (integrationId: string) => {
        setSending(integrationId);
        try {
            const payload = createPayload();
            const result = await sendToOne(integrationId, payload);
            setResults([result]);

            if (result.success) {
                onSuccess?.([result]);
            } else {
                onError?.(result.error || 'Failed to send');
            }
        } catch (err: any) {
            onError?.(err.message || 'Failed to send');
        } finally {
            setSending(null);
            setTimeout(() => setResults([]), 3000);
        }
    };

    const getResultForIntegration = (integrationId: string) => {
        return results.find(r => r.integrationId === integrationId);
    };

    if (integrations.length === 0) {
        return null; // Don't show if no integrations configured
    }

    if (variant === 'minimal') {
        return (
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`text-slate-400 hover:text-blue-400 transition-colors ${className}`}
                title="Send to integrations"
            >
                <Send size={14} />
            </button>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={enabledIntegrations.length === 0}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg
                    ${enabledIntegrations.length > 0
                        ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white'
                        : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'}
                    transition-all text-sm font-medium
                    ${className}
                `}
            >
                <Send size={14} />
                {variant === 'button' && (
                    <>
                        <span>Send to...</span>
                        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                )}
            </button>

            {isOpen && (
                <div
                    className="absolute right-0 top-full mt-2 w-64 rounded-xl overflow-hidden z-50"
                    style={{
                        background: 'hsl(222 47% 11%)',
                        border: '1px solid hsl(222 47% 18%)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                    }}
                >
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-slate-700/50">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Send to Integration
                            </span>
                            <span className="text-xs text-slate-600">
                                {enabledIntegrations.length} enabled
                            </span>
                        </div>
                    </div>

                    {/* Send to All */}
                    {enabledIntegrations.length > 1 && (
                        <button
                            onClick={handleSendToAll}
                            disabled={sending !== null}
                            className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-700/50 transition-colors border-b border-slate-700/30"
                        >
                            <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
                                <Send size={14} className="text-blue-400" />
                                Send to All ({enabledIntegrations.length})
                            </span>
                            {sending === 'all' && <Loader2 size={14} className="animate-spin text-blue-400" />}
                        </button>
                    )}

                    {/* Individual Integrations */}
                    <div className="max-h-64 overflow-y-auto">
                        {enabledIntegrations.map((integration) => {
                            const result = getResultForIntegration(integration.id);
                            const isSending = sending === integration.id;

                            return (
                                <button
                                    key={integration.id}
                                    onClick={() => handleSendToOne(integration.id)}
                                    disabled={sending !== null}
                                    className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
                                >
                                    <span className="flex items-center gap-2 text-sm text-slate-300">
                                        <span className="text-slate-400">
                                            <IntegrationIcon type={integration.type} />
                                        </span>
                                        <span className="truncate">{integration.name}</span>
                                    </span>

                                    {isSending && <Loader2 size={14} className="animate-spin text-blue-400" />}
                                    {result?.success && <Check size={14} className="text-green-400" />}
                                    {result && !result.success && <X size={14} className="text-red-400" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Disabled Integrations Info */}
                    {integrations.length > enabledIntegrations.length && (
                        <div className="px-3 py-2 border-t border-slate-700/30 text-xs text-slate-500">
                            {integrations.length - enabledIntegrations.length} integration(s) disabled
                        </div>
                    )}

                    {/* Settings Link */}
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            // Emit event to open settings
                            window.dispatchEvent(new CustomEvent('open-integrations-settings'));
                        }}
                        className="w-full px-3 py-2 flex items-center gap-2 text-xs text-slate-500 hover:text-slate-400 hover:bg-slate-700/30 transition-colors border-t border-slate-700/30"
                    >
                        <Settings size={12} />
                        Manage Integrations
                    </button>
                </div>
            )}
        </div>
    );
};

export default SendToIntegrations;
