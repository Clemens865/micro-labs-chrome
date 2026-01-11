/**
 * IntegrationsSettings Component
 * Settings panel for managing webhook integrations
 */

import React, { useState } from 'react';
import {
    Plus,
    Trash2,
    Check,
    X,
    Loader2,
    Settings,
    TestTube,
    Power,
    PowerOff,
    ChevronRight,
    Webhook,
    MessageSquare,
    FileText,
    Table,
    Zap,
    Boxes,
    Users,
    Cloud,
    HardDrive,
    ArrowLeft,
    Eye,
    EyeOff
} from 'lucide-react';
import { useIntegrations } from '../hooks/useIntegrations';
import { IntegrationType, IntegrationConfig } from '../services/webhookService';

interface IntegrationsSettingsProps {
    onBack?: () => void;
}

const IntegrationIcon: React.FC<{ type: IntegrationType; size?: number }> = ({ type, size = 20 }) => {
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

export const IntegrationsSettings: React.FC<IntegrationsSettingsProps> = ({ onBack }) => {
    const {
        integrations,
        loading,
        addIntegration,
        removeIntegration,
        toggleIntegration,
        testOne,
        getTypeMeta,
        availableTypes
    } = useIntegrations();

    const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
    const [selectedType, setSelectedType] = useState<IntegrationType | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [integrationName, setIntegrationName] = useState('');
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<string, { success: boolean; message?: string }>>({});
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

    const handleAddNew = (type: IntegrationType) => {
        setSelectedType(type);
        setIntegrationName(getTypeMeta(type).name);
        setFormData({});
        setView('add');
    };

    const handleEdit = (integration: IntegrationConfig) => {
        setEditingId(integration.id);
        setSelectedType(integration.type);
        setIntegrationName(integration.name);
        setFormData(integration.config);
        setView('edit');
    };

    const handleSave = async () => {
        if (!selectedType) return;

        setSaving(true);
        try {
            await addIntegration(selectedType, integrationName, formData);
            setView('list');
            setSelectedType(null);
            setFormData({});
            setIntegrationName('');
        } catch (err) {
            console.error('Failed to save integration:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this integration?')) {
            await removeIntegration(id);
        }
    };

    const handleTest = async (id: string) => {
        setTesting(id);
        try {
            const result = await testOne(id);
            setTestResults(prev => ({
                ...prev,
                [id]: { success: result.success, message: result.message || result.error }
            }));
        } catch (err: any) {
            setTestResults(prev => ({
                ...prev,
                [id]: { success: false, message: err.message }
            }));
        } finally {
            setTesting(null);
            setTimeout(() => {
                setTestResults(prev => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
            }, 3000);
        }
    };

    const toggleSecretVisibility = (fieldKey: string) => {
        setShowSecrets(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
    };

    // List View
    if (view === 'list') {
        return (
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
                    {onBack && (
                        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-lg font-bold text-white">Integrations</h2>
                        <p className="text-xs text-slate-500">Send outputs to external services</p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="animate-spin text-blue-400" size={24} />
                        </div>
                    ) : integrations.length === 0 ? (
                        <div className="text-center py-8">
                            <Webhook size={32} className="mx-auto text-slate-600 mb-3" />
                            <p className="text-slate-400 text-sm">No integrations configured</p>
                            <p className="text-slate-500 text-xs mt-1">Add one to send app outputs to external services</p>
                        </div>
                    ) : (
                        integrations.map((integration) => {
                            const testResult = testResults[integration.id];
                            const isTesting = testing === integration.id;

                            return (
                                <div
                                    key={integration.id}
                                    className={`
                                        p-3 rounded-xl border transition-all
                                        ${integration.enabled
                                            ? 'bg-slate-800/50 border-slate-700/50'
                                            : 'bg-slate-800/30 border-slate-700/30 opacity-60'}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`
                                            w-10 h-10 rounded-lg flex items-center justify-center
                                            ${integration.enabled ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700/50 text-slate-500'}
                                        `}>
                                            <IntegrationIcon type={integration.type} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-white text-sm truncate">
                                                {integration.name}
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                {getTypeMeta(integration.type).name}
                                                {integration.lastUsed && (
                                                    <span className="ml-2">
                                                        · Last used {new Date(integration.lastUsed).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </p>
                                        </div>

                                        {/* Test Result */}
                                        {testResult && (
                                            <div className={`
                                                flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
                                                ${testResult.success
                                                    ? 'bg-green-500/10 text-green-400'
                                                    : 'bg-red-500/10 text-red-400'}
                                            `}>
                                                {testResult.success ? <Check size={12} /> : <X size={12} />}
                                                {testResult.success ? 'OK' : 'Failed'}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleTest(integration.id)}
                                                disabled={isTesting || !integration.enabled}
                                                className="p-2 text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-50"
                                                title="Test integration"
                                            >
                                                {isTesting ? <Loader2 size={14} className="animate-spin" /> : <TestTube size={14} />}
                                            </button>

                                            <button
                                                onClick={() => toggleIntegration(integration.id)}
                                                className={`p-2 transition-colors ${
                                                    integration.enabled
                                                        ? 'text-green-400 hover:text-green-300'
                                                        : 'text-slate-500 hover:text-slate-400'
                                                }`}
                                                title={integration.enabled ? 'Disable' : 'Enable'}
                                            >
                                                {integration.enabled ? <Power size={14} /> : <PowerOff size={14} />}
                                            </button>

                                            <button
                                                onClick={() => handleDelete(integration.id)}
                                                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Add New Section */}
                    <div className="pt-4 border-t border-slate-700/30">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                            Add Integration
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {availableTypes.map((type) => {
                                const meta = getTypeMeta(type);
                                return (
                                    <button
                                        key={type}
                                        onClick={() => handleAddNew(type)}
                                        className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 border border-slate-700/30 hover:border-slate-600/50 transition-all text-left"
                                    >
                                        <span className="text-slate-400">
                                            <IntegrationIcon type={type} size={16} />
                                        </span>
                                        <span className="text-xs font-medium text-slate-300 truncate">
                                            {meta.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Add/Edit View
    const typeMeta = selectedType ? getTypeMeta(selectedType) : null;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
                <button
                    onClick={() => {
                        setView('list');
                        setSelectedType(null);
                        setEditingId(null);
                    }}
                    className="text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h2 className="text-lg font-bold text-white">
                        {view === 'add' ? 'Add' : 'Edit'} {typeMeta?.name}
                    </h2>
                    <p className="text-xs text-slate-500">{typeMeta?.description}</p>
                </div>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Name Field */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                        Integration Name
                    </label>
                    <input
                        type="text"
                        value={integrationName}
                        onChange={(e) => setIntegrationName(e.target.value)}
                        className="w-full"
                        placeholder="My Integration"
                    />
                </div>

                {/* Config Fields */}
                {typeMeta?.configFields.map((field) => (
                    <div key={field.key}>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            {field.label}
                            {field.required && <span className="text-red-400 ml-1">*</span>}
                        </label>

                        {field.type === 'select' ? (
                            <select
                                value={formData[field.key] || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                className="w-full"
                            >
                                <option value="">Select...</option>
                                {field.options?.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="relative">
                                <input
                                    type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
                                    value={formData[field.key] || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                    className="w-full pr-10"
                                    placeholder={field.placeholder}
                                />
                                {field.type === 'password' && (
                                    <button
                                        type="button"
                                        onClick={() => toggleSecretVisibility(field.key)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400"
                                    >
                                        {showSecrets[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-700/50 flex gap-2">
                <button
                    onClick={() => {
                        setView('list');
                        setSelectedType(null);
                        setEditingId(null);
                    }}
                    className="btn-secondary flex-1"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving || !integrationName.trim()}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                    {saving ? (
                        <>
                            <Loader2 size={14} className="animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Check size={14} />
                            Save
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default IntegrationsSettings;
