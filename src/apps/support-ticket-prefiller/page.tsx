import React, { useState, useEffect } from 'react';
import {
    FileText,
    Upload,
    Loader2,
    Copy,
    Check,
    Download,
    Send,
    AlertCircle,
    Sparkles,
    MessageSquare,
    Tag,
    Clock,
    User,
    AlertTriangle,
    CheckCircle,
    RefreshCw,
    Settings,
    ChevronDown,
    ChevronUp,
    Zap
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';
import { useIntegrations, useSendToIntegrations } from '../../hooks/useIntegrations';
import SendToIntegrations from '../../components/SendToIntegrations';

interface TicketData {
    subject: string;
    description: string;
    category: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
    suggestedTags: string[];
    affectedProduct?: string;
    affectedVersion?: string;
    customerType?: 'free' | 'pro' | 'enterprise' | 'unknown';
    suggestedResponse?: string;
    technicalDetails?: {
        browser?: string;
        os?: string;
        errorCode?: string;
        reproSteps?: string[];
    };
    escalation: {
        needed: boolean;
        reason?: string;
        suggestedTeam?: string;
    };
}

interface TemplateField {
    id: string;
    label: string;
    type: 'text' | 'select' | 'textarea';
    options?: string[];
    required?: boolean;
}

const SupportTicketPrefillerApp: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading: aiLoading } = useGemini();
    const { success, warning, info } = useToast();
    const { integrations } = useIntegrations();

    const [inputText, setInputText] = useState('');
    const [ticketData, setTicketData] = useState<TicketData | null>(null);
    const [processing, setProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showTemplateConfig, setShowTemplateConfig] = useState(false);
    const [templateFields, setTemplateFields] = useState<TemplateField[]>([
        { id: 'subject', label: 'Subject', type: 'text', required: true },
        { id: 'description', label: 'Description', type: 'textarea', required: true },
        { id: 'category', label: 'Category', type: 'select', options: ['Technical', 'Billing', 'Account', 'Feature Request', 'Bug Report', 'Other'] },
        { id: 'priority', label: 'Priority', type: 'select', options: ['Urgent', 'High', 'Medium', 'Low'] }
    ]);

    const extractFromPage = () => {
        if (context?.content) {
            setInputText(context.content.substring(0, 8000));
            info('Page content loaded');
        } else {
            warning('No page content available');
        }
    };

    const analyzeTicket = async () => {
        if (!inputText.trim()) {
            warning('Please enter customer message or email');
            return;
        }

        setProcessing(true);

        try {
            const result = await generateContent(
                `Analyze this customer support request and extract structured ticket data:

${inputText}

Extract and infer:
1. Clear, concise subject line (max 80 chars)
2. Formatted description with clear problem statement
3. Category: technical, billing, account, feature-request, bug-report, or other
4. Priority: urgent (customer blocked/critical), high (significant impact), medium (normal), low (minor)
5. Customer sentiment: positive, neutral, negative, or frustrated
6. Suggested tags for categorization
7. Affected product/feature (if mentioned)
8. Technical details if it's a bug/issue:
   - Browser/OS if mentioned
   - Error codes
   - Steps to reproduce
9. Whether escalation is needed and to which team

Also generate a professional, empathetic suggested response.

Return as JSON:
{
  "subject": "Clear ticket subject",
  "description": "Formatted description...",
  "category": "technical",
  "priority": "medium",
  "sentiment": "frustrated",
  "suggestedTags": ["tag1", "tag2"],
  "affectedProduct": "Product name or null",
  "affectedVersion": "Version or null",
  "customerType": "pro",
  "suggestedResponse": "Hi [Customer],\\n\\nThank you for reaching out...",
  "technicalDetails": {
    "browser": "Chrome 120",
    "os": "Windows 11",
    "errorCode": "ERR_500 or null",
    "reproSteps": ["Step 1", "Step 2"]
  },
  "escalation": {
    "needed": false,
    "reason": "null or reason",
    "suggestedTeam": "engineering or null"
  }
}`,
                `You are a customer support specialist. Extract accurate ticket information while maintaining empathy.
Focus on:
- Understanding the customer's actual problem
- Detecting urgency and sentiment correctly
- Suggesting appropriate tags and categories
- Writing helpful, professional responses
- Identifying when escalation is needed`,
                { jsonMode: true }
            );

            if (result) {
                setTicketData(result);
                success('Ticket data extracted');
            }
        } catch (err) {
            console.error('Analysis error:', err);
            warning('Failed to analyze message');
        } finally {
            setProcessing(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            success('Copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            warning('Failed to copy');
        }
    };

    const copyFullTicket = () => {
        if (!ticketData) return;

        const ticket = `SUBJECT: ${ticketData.subject}

CATEGORY: ${ticketData.category}
PRIORITY: ${ticketData.priority.toUpperCase()}
SENTIMENT: ${ticketData.sentiment}
TAGS: ${ticketData.suggestedTags.join(', ')}

DESCRIPTION:
${ticketData.description}

${ticketData.technicalDetails ? `TECHNICAL DETAILS:
Browser: ${ticketData.technicalDetails.browser || 'N/A'}
OS: ${ticketData.technicalDetails.os || 'N/A'}
Error: ${ticketData.technicalDetails.errorCode || 'N/A'}
${ticketData.technicalDetails.reproSteps ? `Steps to Reproduce:\n${ticketData.technicalDetails.reproSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : ''}
` : ''}

${ticketData.escalation.needed ? `ESCALATION NEEDED: Yes
Reason: ${ticketData.escalation.reason}
Team: ${ticketData.escalation.suggestedTeam}` : ''}

SUGGESTED RESPONSE:
${ticketData.suggestedResponse || 'N/A'}`;

        copyToClipboard(ticket);
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    const getSentimentColor = (sentiment: string) => {
        switch (sentiment) {
            case 'positive': return 'text-green-400';
            case 'neutral': return 'text-slate-400';
            case 'negative': return 'text-orange-400';
            case 'frustrated': return 'text-red-400';
            default: return 'text-slate-400';
        }
    };

    const getSentimentIcon = (sentiment: string) => {
        switch (sentiment) {
            case 'positive': return '😊';
            case 'neutral': return '😐';
            case 'negative': return '😕';
            case 'frustrated': return '😤';
            default: return '😐';
        }
    };

    return (
        <div className="space-y-6">
            {/* Input Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-300">Customer Message</h3>
                    <button
                        onClick={extractFromPage}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                        <Upload size={12} />
                        From Page
                    </button>
                </div>

                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste customer email, chat message, or support request here..."
                    className="input-field w-full min-h-[120px] text-sm"
                />

                <button
                    onClick={analyzeTicket}
                    disabled={processing || !inputText.trim()}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    {processing ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Pre-Fill Ticket
                        </>
                    )}
                </button>
            </div>

            {/* Ticket Data Output */}
            {ticketData && (
                <div className="space-y-4">
                    {/* Subject & Priority */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Subject</p>
                                <h2 className="text-sm font-bold text-white">{ticketData.subject}</h2>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${getPriorityColor(ticketData.priority)}`}>
                                {ticketData.priority}
                            </span>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                                <Tag size={12} />
                                {ticketData.category}
                            </span>
                            <span className={`flex items-center gap-1 ${getSentimentColor(ticketData.sentiment)}`}>
                                <span>{getSentimentIcon(ticketData.sentiment)}</span>
                                {ticketData.sentiment}
                            </span>
                            {ticketData.customerType && ticketData.customerType !== 'unknown' && (
                                <span className="flex items-center gap-1">
                                    <User size={12} />
                                    {ticketData.customerType}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Escalation Warning */}
                    {ticketData.escalation.needed && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                            <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-red-400">Escalation Recommended</p>
                                <p className="text-xs text-red-300/80 mt-0.5">
                                    {ticketData.escalation.reason} → <span className="font-medium">{ticketData.escalation.suggestedTeam}</span>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
                        <h3 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-2">
                            <MessageSquare size={12} />
                            Description
                        </h3>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">{ticketData.description}</p>
                    </div>

                    {/* Tags */}
                    {ticketData.suggestedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {ticketData.suggestedTags.map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="px-2 py-1 rounded-full bg-slate-700/50 text-xs text-slate-300"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Technical Details */}
                    {ticketData.technicalDetails && (ticketData.technicalDetails.browser || ticketData.technicalDetails.errorCode || ticketData.technicalDetails.reproSteps) && (
                        <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
                            <h3 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-2">
                                <Zap size={12} />
                                Technical Details
                            </h3>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {ticketData.technicalDetails.browser && (
                                    <div>
                                        <span className="text-slate-500">Browser:</span>
                                        <span className="text-slate-300 ml-1">{ticketData.technicalDetails.browser}</span>
                                    </div>
                                )}
                                {ticketData.technicalDetails.os && (
                                    <div>
                                        <span className="text-slate-500">OS:</span>
                                        <span className="text-slate-300 ml-1">{ticketData.technicalDetails.os}</span>
                                    </div>
                                )}
                                {ticketData.technicalDetails.errorCode && (
                                    <div className="col-span-2">
                                        <span className="text-slate-500">Error:</span>
                                        <span className="text-red-400 font-mono ml-1">{ticketData.technicalDetails.errorCode}</span>
                                    </div>
                                )}
                            </div>
                            {ticketData.technicalDetails.reproSteps && ticketData.technicalDetails.reproSteps.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-700/30">
                                    <span className="text-[10px] text-slate-500 uppercase">Steps to Reproduce:</span>
                                    <ol className="mt-1 text-xs text-slate-300 space-y-1">
                                        {ticketData.technicalDetails.reproSteps.map((step, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <span className="text-slate-500">{idx + 1}.</span>
                                                {step}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Suggested Response */}
                    {ticketData.suggestedResponse && (
                        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-bold text-green-400 flex items-center gap-2">
                                    <CheckCircle size={12} />
                                    Suggested Response
                                </h3>
                                <button
                                    onClick={() => copyToClipboard(ticketData.suggestedResponse || '')}
                                    className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                                >
                                    {copied ? <Check size={12} /> : <Copy size={12} />}
                                    Copy
                                </button>
                            </div>
                            <p className="text-xs text-green-300/80 whitespace-pre-wrap">{ticketData.suggestedResponse}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={copyFullTicket}
                            className="btn-secondary flex items-center gap-2 flex-1"
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            Copy Full Ticket
                        </button>
                        <button
                            onClick={() => setTicketData(null)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <RefreshCw size={14} />
                            New
                        </button>
                    </div>

                    {/* Send to Integrations */}
                    {integrations.length > 0 && (
                        <SendToIntegrations
                            appId="support-ticket-prefiller"
                            appName="Support Ticket Pre-Filler"
                            data={{
                                type: 'support_ticket',
                                ticket: {
                                    subject: ticketData.subject,
                                    description: ticketData.description,
                                    category: ticketData.category,
                                    priority: ticketData.priority,
                                    tags: ticketData.suggestedTags,
                                    sentiment: ticketData.sentiment,
                                    escalation: ticketData.escalation
                                }
                            }}
                            source={{ url: context?.url, title: context?.title }}
                        />
                    )}
                </div>
            )}

            {/* Empty State / Info */}
            {!ticketData && !processing && (
                <div className="text-center py-8 text-slate-500">
                    <FileText size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No ticket data yet</p>
                    <p className="text-xs text-slate-600 mt-1">
                        Paste a customer message and click "Pre-Fill Ticket"
                    </p>
                </div>
            )}

            {/* Info Box */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                <AlertCircle size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300/80">
                    AI analyzes customer messages to extract ticket fields, detect sentiment, suggest responses, and identify escalation needs.
                </p>
            </div>
        </div>
    );
};

export default SupportTicketPrefillerApp;
