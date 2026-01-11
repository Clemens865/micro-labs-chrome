import React, { useState, useEffect } from 'react';
import {
    Users,
    Send,
    Loader2,
    Check,
    X,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Building2,
    Mail,
    Phone,
    Link as LinkIcon,
    Linkedin,
    Twitter,
    Globe,
    Plus,
    Trash2,
    Settings,
    Webhook,
    AlertCircle
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useIntegrations } from '../../hooks/useIntegrations';
import { WebhookPayload } from '../../services/webhookService';

interface ExtractedLead {
    id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    role?: string;
    linkedIn?: string;
    twitter?: string;
    website?: string;
    location?: string;
    confidence: 'high' | 'medium' | 'low';
    source: string;
}

interface PushResult {
    leadId: string;
    integrationId: string;
    success: boolean;
    message?: string;
}

const CRMLeadPusherApp: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading: aiLoading, error: aiError } = useGemini();
    const { integrations, sendToOne, getEnabledIntegrations, getTypeMeta } = useIntegrations();

    const [extractedLeads, setExtractedLeads] = useState<ExtractedLead[]>([]);
    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
    const [extracting, setExtracting] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [pushResults, setPushResults] = useState<PushResult[]>([]);
    const [expandedLead, setExpandedLead] = useState<string | null>(null);
    const [manualLeadOpen, setManualLeadOpen] = useState(false);
    const [manualLead, setManualLead] = useState<Partial<ExtractedLead>>({});

    // Filter to CRM integrations (HubSpot, Salesforce, or generic webhooks)
    const crmIntegrations = integrations.filter(i =>
        i.enabled && ['hubspot', 'salesforce', 'generic-webhook', 'zapier', 'make'].includes(i.type)
    );

    const extractLeads = async () => {
        if (!context?.content) {
            return;
        }

        setExtracting(true);
        setExtractedLeads([]);
        setPushResults([]);

        try {
            const content = context.content || '';

            const result = await generateContent(
                `Extract all potential sales leads/contacts from this webpage content. For each person or contact found, extract:
- name (full name)
- firstName, lastName (split if possible)
- email address
- phone number
- company name
- role/title
- LinkedIn URL
- Twitter handle
- website
- location

Also assess confidence level: high (verified contact info), medium (some info may be inferred), low (minimal/uncertain).

Content to analyze:
${content.substring(0, 8000)}

Page URL: ${context.url || 'unknown'}
Page Title: ${context.title || 'unknown'}`,
                `You are a lead extraction specialist. Extract contact information from web pages accurately.
Be thorough but don't hallucinate data. Mark confidence appropriately.
Return ONLY valid JSON array of leads.`,
                { jsonMode: true }
            );

            let leads: ExtractedLead[] = [];
            if (Array.isArray(result)) {
                leads = result.map((lead: any, idx: number) => ({
                    id: `lead-${idx}-${Date.now()}`,
                    ...lead,
                    confidence: lead.confidence || 'medium',
                    source: context.url || 'unknown'
                }));
            } else if (result.leads && Array.isArray(result.leads)) {
                leads = result.leads.map((lead: any, idx: number) => ({
                    id: `lead-${idx}-${Date.now()}`,
                    ...lead,
                    confidence: lead.confidence || 'medium',
                    source: context.url || 'unknown'
                }));
            }

            setExtractedLeads(leads);
            // Auto-select high confidence leads
            const highConfidence = leads.filter(l => l.confidence === 'high').map(l => l.id);
            setSelectedLeads(new Set(highConfidence));

        } catch (err) {
            console.error('Lead extraction error:', err);
        } finally {
            setExtracting(false);
        }
    };

    const toggleLeadSelection = (leadId: string) => {
        setSelectedLeads(prev => {
            const next = new Set(prev);
            if (next.has(leadId)) {
                next.delete(leadId);
            } else {
                next.add(leadId);
            }
            return next;
        });
    };

    const selectAll = () => {
        setSelectedLeads(new Set(extractedLeads.map(l => l.id)));
    };

    const deselectAll = () => {
        setSelectedLeads(new Set());
    };

    const pushToCRM = async (integrationId: string) => {
        if (selectedLeads.size === 0) return;

        setPushing(true);
        const results: PushResult[] = [];

        const integration = integrations.find(i => i.id === integrationId);
        if (!integration) {
            setPushing(false);
            return;
        }

        for (const leadId of selectedLeads) {
            const lead = extractedLeads.find(l => l.id === leadId);
            if (!lead) continue;

            const payload: WebhookPayload = {
                appId: 'crm-lead-pusher',
                appName: 'CRM Lead Pusher',
                timestamp: Date.now(),
                source: {
                    url: context?.url,
                    title: context?.title
                },
                data: {
                    ...lead,
                    // Map to common CRM fields
                    firstName: lead.firstName || lead.name?.split(' ')[0],
                    lastName: lead.lastName || lead.name?.split(' ').slice(1).join(' '),
                }
            };

            try {
                const result = await sendToOne(integrationId, payload);
                results.push({
                    leadId,
                    integrationId,
                    success: result.success,
                    message: result.message || result.error
                });
            } catch (err: any) {
                results.push({
                    leadId,
                    integrationId,
                    success: false,
                    message: err.message
                });
            }
        }

        setPushResults(results);
        setPushing(false);
    };

    const addManualLead = () => {
        if (!manualLead.name && !manualLead.email) return;

        const newLead: ExtractedLead = {
            id: `manual-${Date.now()}`,
            ...manualLead as any,
            confidence: 'high',
            source: 'manual'
        };

        setExtractedLeads(prev => [newLead, ...prev]);
        setSelectedLeads(prev => new Set([...prev, newLead.id]));
        setManualLead({});
        setManualLeadOpen(false);
    };

    const removeLead = (leadId: string) => {
        setExtractedLeads(prev => prev.filter(l => l.id !== leadId));
        setSelectedLeads(prev => {
            const next = new Set(prev);
            next.delete(leadId);
            return next;
        });
    };

    const getConfidenceColor = (confidence: string) => {
        switch (confidence) {
            case 'high': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'medium': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'low': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    const getSuccessCount = () => pushResults.filter(r => r.success).length;
    const getFailCount = () => pushResults.filter(r => !r.success).length;

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between gap-3">
                <button
                    onClick={extractLeads}
                    disabled={extracting || !context?.content}
                    className="btn-primary flex items-center gap-2 flex-1"
                >
                    {extracting ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Extracting Leads...
                        </>
                    ) : (
                        <>
                            <Users size={16} />
                            Extract Leads from Page
                        </>
                    )}
                </button>
                <button
                    onClick={() => setManualLeadOpen(!manualLeadOpen)}
                    className="btn-secondary p-3"
                    title="Add manual lead"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* CRM Integrations Status */}
            {crmIntegrations.length === 0 ? (
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
                    <AlertCircle size={18} className="text-orange-400 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-orange-300">No CRM Integrations Configured</p>
                        <p className="text-xs text-orange-400/70 mt-1">
                            Go to Settings → Integrations to add HubSpot, Salesforce, Zapier, or a webhook.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex gap-2 flex-wrap">
                    {crmIntegrations.map(integration => {
                        const meta = getTypeMeta(integration.type);
                        return (
                            <div
                                key={integration.id}
                                className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-2"
                            >
                                <div className="w-4 h-4 text-cyan-400">
                                    <Webhook size={14} />
                                </div>
                                <span className="text-xs font-medium text-cyan-300">{integration.name}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Manual Lead Form */}
            {manualLeadOpen && (
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
                    <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                        <Plus size={14} /> Add Lead Manually
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={manualLead.name || ''}
                            onChange={(e) => setManualLead(prev => ({ ...prev, name: e.target.value }))}
                            className="text-sm"
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={manualLead.email || ''}
                            onChange={(e) => setManualLead(prev => ({ ...prev, email: e.target.value }))}
                            className="text-sm"
                        />
                        <input
                            type="text"
                            placeholder="Company"
                            value={manualLead.company || ''}
                            onChange={(e) => setManualLead(prev => ({ ...prev, company: e.target.value }))}
                            className="text-sm"
                        />
                        <input
                            type="text"
                            placeholder="Role/Title"
                            value={manualLead.role || ''}
                            onChange={(e) => setManualLead(prev => ({ ...prev, role: e.target.value }))}
                            className="text-sm"
                        />
                        <input
                            type="tel"
                            placeholder="Phone"
                            value={manualLead.phone || ''}
                            onChange={(e) => setManualLead(prev => ({ ...prev, phone: e.target.value }))}
                            className="text-sm"
                        />
                        <input
                            type="text"
                            placeholder="LinkedIn URL"
                            value={manualLead.linkedIn || ''}
                            onChange={(e) => setManualLead(prev => ({ ...prev, linkedIn: e.target.value }))}
                            className="text-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={addManualLead}
                            className="btn-primary text-sm py-2"
                        >
                            Add Lead
                        </button>
                        <button
                            onClick={() => setManualLeadOpen(false)}
                            className="btn-secondary text-sm py-2"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Push Results Summary */}
            {pushResults.length > 0 && (
                <div className={`p-3 rounded-xl flex items-center justify-between ${
                    getFailCount() === 0
                        ? 'bg-green-500/10 border border-green-500/20'
                        : getSuccessCount() === 0
                            ? 'bg-red-500/10 border border-red-500/20'
                            : 'bg-yellow-500/10 border border-yellow-500/20'
                }`}>
                    <div className="flex items-center gap-2">
                        {getFailCount() === 0 ? (
                            <Check size={16} className="text-green-400" />
                        ) : (
                            <AlertCircle size={16} className={getSuccessCount() === 0 ? 'text-red-400' : 'text-yellow-400'} />
                        )}
                        <span className="text-sm font-medium">
                            {getSuccessCount()} pushed successfully
                            {getFailCount() > 0 && `, ${getFailCount()} failed`}
                        </span>
                    </div>
                    <button
                        onClick={() => setPushResults([])}
                        className="text-slate-400 hover:text-white"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Extracted Leads List */}
            {extractedLeads.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-300">
                            {extractedLeads.length} Lead{extractedLeads.length !== 1 ? 's' : ''} Found
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={selectAll}
                                className="text-[10px] uppercase tracking-wider text-blue-400 hover:text-blue-300 font-bold"
                            >
                                Select All
                            </button>
                            <button
                                onClick={deselectAll}
                                className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-400 font-bold"
                            >
                                Deselect
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {extractedLeads.map(lead => {
                            const isSelected = selectedLeads.has(lead.id);
                            const isExpanded = expandedLead === lead.id;
                            const pushResult = pushResults.find(r => r.leadId === lead.id);

                            return (
                                <div
                                    key={lead.id}
                                    className={`rounded-xl border transition-all ${
                                        isSelected
                                            ? 'bg-blue-500/5 border-blue-500/30'
                                            : 'bg-slate-800/30 border-slate-700/30'
                                    }`}
                                >
                                    <div
                                        className="p-3 flex items-center gap-3 cursor-pointer"
                                        onClick={() => toggleLeadSelection(lead.id)}
                                    >
                                        {/* Checkbox */}
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                            isSelected
                                                ? 'bg-blue-500 border-blue-500'
                                                : 'border-slate-600'
                                        }`}>
                                            {isSelected && <Check size={12} className="text-white" />}
                                        </div>

                                        {/* Lead Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm text-white truncate">
                                                    {lead.name || lead.email || 'Unknown'}
                                                </span>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold border ${getConfidenceColor(lead.confidence)}`}>
                                                    {lead.confidence}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                                {lead.company && (
                                                    <span className="flex items-center gap-1">
                                                        <Building2 size={10} />
                                                        {lead.company}
                                                    </span>
                                                )}
                                                {lead.role && <span>{lead.role}</span>}
                                            </div>
                                        </div>

                                        {/* Push Result */}
                                        {pushResult && (
                                            <div className={`p-1 rounded ${
                                                pushResult.success ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                                {pushResult.success ? <Check size={14} /> : <X size={14} />}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedLead(isExpanded ? null : lead.id);
                                            }}
                                            className="p-1 text-slate-500 hover:text-white"
                                        >
                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeLead(lead.id);
                                            }}
                                            className="p-1 text-slate-500 hover:text-red-400"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="px-3 pb-3 pt-0 grid grid-cols-2 gap-2 text-xs border-t border-slate-700/30 mt-2">
                                            {lead.email && (
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Mail size={12} />
                                                    <span className="truncate">{lead.email}</span>
                                                </div>
                                            )}
                                            {lead.phone && (
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Phone size={12} />
                                                    <span>{lead.phone}</span>
                                                </div>
                                            )}
                                            {lead.linkedIn && (
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Linkedin size={12} />
                                                    <a href={lead.linkedIn} target="_blank" className="text-blue-400 hover:underline truncate">
                                                        LinkedIn
                                                    </a>
                                                </div>
                                            )}
                                            {lead.twitter && (
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Twitter size={12} />
                                                    <span>{lead.twitter}</span>
                                                </div>
                                            )}
                                            {lead.website && (
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Globe size={12} />
                                                    <a href={lead.website} target="_blank" className="text-blue-400 hover:underline truncate">
                                                        Website
                                                    </a>
                                                </div>
                                            )}
                                            {lead.location && (
                                                <div className="flex items-center gap-2 text-slate-400 col-span-2">
                                                    <span>{lead.location}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Push to CRM Buttons */}
            {extractedLeads.length > 0 && selectedLeads.size > 0 && crmIntegrations.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Push {selectedLeads.size} Selected Lead{selectedLeads.size !== 1 ? 's' : ''} to:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {crmIntegrations.map(integration => (
                            <button
                                key={integration.id}
                                onClick={() => pushToCRM(integration.id)}
                                disabled={pushing}
                                className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
                            >
                                {pushing ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Send size={14} />
                                )}
                                {integration.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {extractedLeads.length === 0 && !extracting && (
                <div className="text-center py-12 text-slate-500">
                    <Users size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No leads extracted yet</p>
                    <p className="text-xs text-slate-600 mt-1">
                        Click "Extract Leads" to find contacts on this page
                    </p>
                </div>
            )}

            {/* Error State */}
            {aiError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {aiError}
                </div>
            )}
        </div>
    );
};

export default CRMLeadPusherApp;
