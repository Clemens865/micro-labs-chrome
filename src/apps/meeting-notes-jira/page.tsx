import React, { useState, useEffect } from 'react';
import {
    FileText,
    Upload,
    Loader2,
    Copy,
    Check,
    Download,
    Send,
    Settings,
    AlertCircle,
    CheckCircle,
    ExternalLink,
    Trash2,
    Plus,
    ChevronDown,
    ChevronUp,
    Users,
    Calendar,
    Target,
    ListChecks,
    Sparkles
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';
import { useIntegrations } from '../../hooks/useIntegrations';
import SendToIntegrations from '../../components/SendToIntegrations';

interface JiraTicket {
    id: string;
    type: 'task' | 'story' | 'bug' | 'action-item';
    title: string;
    description: string;
    assignee?: string;
    priority: 'highest' | 'high' | 'medium' | 'low' | 'lowest';
    dueDate?: string;
    labels?: string[];
}

interface MeetingData {
    title: string;
    date: string;
    attendees: string[];
    summary: string;
    keyDecisions: string[];
    actionItems: JiraTicket[];
}

const MeetingNotesJiraApp: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading: aiLoading } = useGemini();
    const { success, warning, info } = useToast();
    const { integrations } = useIntegrations();

    const [notesInput, setNotesInput] = useState('');
    const [meetingData, setMeetingData] = useState<MeetingData | null>(null);
    const [processing, setProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
    const [jiraConfig, setJiraConfig] = useState({
        projectKey: '',
        baseUrl: ''
    });
    const [showConfig, setShowConfig] = useState(false);

    // Load config from storage
    useEffect(() => {
        chrome.storage.local.get('jiraConfig', (data) => {
            if (data.jiraConfig && typeof data.jiraConfig === 'object') {
                const stored = data.jiraConfig as { projectKey?: string; baseUrl?: string };
                setJiraConfig({
                    projectKey: stored.projectKey || '',
                    baseUrl: stored.baseUrl || ''
                });
            }
        });
    }, []);

    // Save config
    const saveConfig = () => {
        chrome.storage.local.set({ jiraConfig });
        success('Jira configuration saved');
        setShowConfig(false);
    };

    const extractFromPage = () => {
        if (context?.content) {
            setNotesInput(context.content.substring(0, 10000));
            info('Page content loaded');
        } else {
            warning('No page content available');
        }
    };

    const processNotes = async () => {
        if (!notesInput.trim()) {
            warning('Please enter meeting notes');
            return;
        }

        setProcessing(true);

        try {
            const result = await generateContent(
                `Analyze these meeting notes and extract structured data for Jira ticket creation:

${notesInput}

Extract:
1. Meeting title and date
2. List of attendees (names)
3. Summary of the meeting (2-3 sentences)
4. Key decisions made
5. Action items as potential Jira tickets

For each action item, determine:
- Type: task, story, bug, or action-item
- Title: Clear, concise ticket title
- Description: Detailed description with context
- Suggested assignee (if mentioned)
- Priority: highest, high, medium, low, or lowest (based on urgency/importance)
- Due date (if mentioned or inferred)
- Labels (relevant categories)

Return as JSON:
{
  "title": "Meeting title",
  "date": "YYYY-MM-DD",
  "attendees": ["Name 1", "Name 2"],
  "summary": "Brief summary...",
  "keyDecisions": ["Decision 1", "Decision 2"],
  "actionItems": [
    {
      "id": "unique-id",
      "type": "task",
      "title": "Clear ticket title",
      "description": "Detailed description...",
      "assignee": "Person name or null",
      "priority": "medium",
      "dueDate": "YYYY-MM-DD or null",
      "labels": ["label1", "label2"]
    }
  ]
}`,
                `You are a meeting notes analyst specializing in extracting actionable items for Jira.
Focus on clear, actionable ticket titles and descriptions.
Infer priorities from context (words like "urgent", "ASAP", "critical" = high/highest).
If dates are relative ("next week", "by Friday"), calculate actual dates.`,
                { jsonMode: true }
            );

            if (result) {
                // Ensure each action item has a unique ID
                const processedResult = {
                    ...result,
                    actionItems: (result.actionItems || []).map((item: JiraTicket, idx: number) => ({
                        ...item,
                        id: item.id || `ticket-${Date.now()}-${idx}`
                    }))
                };
                setMeetingData(processedResult);
                success(`Found ${processedResult.actionItems.length} action items`);
            }
        } catch (err) {
            console.error('Processing error:', err);
            warning('Failed to process meeting notes');
        } finally {
            setProcessing(false);
        }
    };

    const updateTicket = (id: string, updates: Partial<JiraTicket>) => {
        if (!meetingData) return;
        setMeetingData({
            ...meetingData,
            actionItems: meetingData.actionItems.map(item =>
                item.id === id ? { ...item, ...updates } : item
            )
        });
    };

    const removeTicket = (id: string) => {
        if (!meetingData) return;
        setMeetingData({
            ...meetingData,
            actionItems: meetingData.actionItems.filter(item => item.id !== id)
        });
    };

    const addTicket = () => {
        if (!meetingData) return;
        const newTicket: JiraTicket = {
            id: `ticket-${Date.now()}`,
            type: 'task',
            title: '',
            description: '',
            priority: 'medium'
        };
        setMeetingData({
            ...meetingData,
            actionItems: [...meetingData.actionItems, newTicket]
        });
        setExpandedTicket(newTicket.id);
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

    const exportAsMarkdown = () => {
        if (!meetingData) return;

        let md = `# ${meetingData.title}\n\n`;
        md += `**Date:** ${meetingData.date}\n\n`;
        md += `**Attendees:** ${meetingData.attendees.join(', ')}\n\n`;
        md += `## Summary\n${meetingData.summary}\n\n`;
        md += `## Key Decisions\n${meetingData.keyDecisions.map(d => `- ${d}`).join('\n')}\n\n`;
        md += `## Action Items\n\n`;

        meetingData.actionItems.forEach((item, idx) => {
            md += `### ${idx + 1}. ${item.title}\n`;
            md += `- **Type:** ${item.type}\n`;
            md += `- **Priority:** ${item.priority}\n`;
            if (item.assignee) md += `- **Assignee:** ${item.assignee}\n`;
            if (item.dueDate) md += `- **Due:** ${item.dueDate}\n`;
            md += `\n${item.description}\n\n`;
        });

        copyToClipboard(md);
    };

    const exportAsJiraFormat = () => {
        if (!meetingData) return;

        const jiraData = meetingData.actionItems.map(item => ({
            fields: {
                project: { key: jiraConfig.projectKey || 'PROJECT' },
                summary: item.title,
                description: item.description,
                issuetype: { name: item.type === 'action-item' ? 'Task' : item.type.charAt(0).toUpperCase() + item.type.slice(1) },
                priority: { name: item.priority.charAt(0).toUpperCase() + item.priority.slice(1) },
                ...(item.dueDate && { duedate: item.dueDate }),
                ...(item.labels && item.labels.length > 0 && { labels: item.labels })
            }
        }));

        copyToClipboard(JSON.stringify(jiraData, null, 2));
        info('Jira-formatted JSON copied');
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'highest': return 'text-red-500';
            case 'high': return 'text-orange-500';
            case 'medium': return 'text-yellow-500';
            case 'low': return 'text-blue-500';
            case 'lowest': return 'text-slate-500';
            default: return 'text-slate-400';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'story': return '📖';
            case 'bug': return '🐛';
            case 'task': return '✅';
            default: return '📌';
        }
    };

    return (
        <div className="space-y-6">
            {/* Config Toggle */}
            <button
                onClick={() => setShowConfig(!showConfig)}
                className="w-full btn-secondary flex items-center justify-between"
            >
                <span className="flex items-center gap-2">
                    <Settings size={16} />
                    Jira Configuration
                </span>
                {showConfig ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showConfig && (
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Project Key</label>
                        <input
                            type="text"
                            value={jiraConfig.projectKey}
                            onChange={(e) => setJiraConfig({ ...jiraConfig, projectKey: e.target.value })}
                            placeholder="e.g., PROJ"
                            className="input-field w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Jira Base URL</label>
                        <input
                            type="text"
                            value={jiraConfig.baseUrl}
                            onChange={(e) => setJiraConfig({ ...jiraConfig, baseUrl: e.target.value })}
                            placeholder="e.g., https://yourcompany.atlassian.net"
                            className="input-field w-full"
                        />
                    </div>
                    <button onClick={saveConfig} className="btn-primary w-full">
                        Save Configuration
                    </button>
                </div>
            )}

            {/* Input Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-300">Meeting Notes</h3>
                    <button
                        onClick={extractFromPage}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                        <Upload size={12} />
                        From Page
                    </button>
                </div>

                <textarea
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="Paste your meeting notes, transcript, or minutes here..."
                    className="input-field w-full min-h-[150px] text-sm"
                />

                <button
                    onClick={processNotes}
                    disabled={processing || !notesInput.trim()}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    {processing ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Extract Action Items
                        </>
                    )}
                </button>
            </div>

            {/* Meeting Summary */}
            {meetingData && (
                <div className="space-y-4">
                    {/* Header */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                        <h2 className="text-lg font-bold text-white">{meetingData.title}</h2>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {meetingData.date}
                            </span>
                            <span className="flex items-center gap-1">
                                <Users size={12} />
                                {meetingData.attendees.length} attendees
                            </span>
                        </div>
                        <p className="text-sm text-slate-300 mt-3">{meetingData.summary}</p>
                    </div>

                    {/* Key Decisions */}
                    {meetingData.keyDecisions.length > 0 && (
                        <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
                            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-2">
                                <Target size={14} />
                                Key Decisions
                            </h3>
                            <ul className="space-y-1">
                                {meetingData.keyDecisions.map((decision, idx) => (
                                    <li key={idx} className="text-xs text-slate-400 flex items-start gap-2">
                                        <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                                        {decision}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Action Items / Tickets */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                <ListChecks size={14} />
                                Action Items ({meetingData.actionItems.length})
                            </h3>
                            <button
                                onClick={addTicket}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                                <Plus size={12} />
                                Add Ticket
                            </button>
                        </div>

                        {meetingData.actionItems.map((ticket, idx) => (
                            <div
                                key={ticket.id}
                                className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30"
                            >
                                <div
                                    className="flex items-center gap-2 cursor-pointer"
                                    onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                                >
                                    <span className="text-lg">{getTypeIcon(ticket.type)}</span>
                                    <div className="flex-1 min-w-0">
                                        <input
                                            type="text"
                                            value={ticket.title}
                                            onChange={(e) => updateTicket(ticket.id, { title: e.target.value })}
                                            onClick={(e) => e.stopPropagation()}
                                            placeholder="Ticket title..."
                                            className="bg-transparent text-sm font-medium text-slate-200 w-full focus:outline-none"
                                        />
                                    </div>
                                    <span className={`text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                        {ticket.priority}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeTicket(ticket.id);
                                        }}
                                        className="p-1 text-slate-500 hover:text-red-400"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                    {expandedTicket === ticket.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>

                                {expandedTicket === ticket.id && (
                                    <div className="mt-3 pt-3 border-t border-slate-700/30 space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] text-slate-500 block mb-1">Type</label>
                                                <select
                                                    value={ticket.type}
                                                    onChange={(e) => updateTicket(ticket.id, { type: e.target.value as JiraTicket['type'] })}
                                                    className="input-field w-full text-xs py-1"
                                                >
                                                    <option value="task">Task</option>
                                                    <option value="story">Story</option>
                                                    <option value="bug">Bug</option>
                                                    <option value="action-item">Action Item</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 block mb-1">Priority</label>
                                                <select
                                                    value={ticket.priority}
                                                    onChange={(e) => updateTicket(ticket.id, { priority: e.target.value as JiraTicket['priority'] })}
                                                    className="input-field w-full text-xs py-1"
                                                >
                                                    <option value="highest">Highest</option>
                                                    <option value="high">High</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="low">Low</option>
                                                    <option value="lowest">Lowest</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] text-slate-500 block mb-1">Assignee</label>
                                                <input
                                                    type="text"
                                                    value={ticket.assignee || ''}
                                                    onChange={(e) => updateTicket(ticket.id, { assignee: e.target.value })}
                                                    placeholder="Name..."
                                                    className="input-field w-full text-xs py-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 block mb-1">Due Date</label>
                                                <input
                                                    type="date"
                                                    value={ticket.dueDate || ''}
                                                    onChange={(e) => updateTicket(ticket.id, { dueDate: e.target.value })}
                                                    className="input-field w-full text-xs py-1"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] text-slate-500 block mb-1">Description</label>
                                            <textarea
                                                value={ticket.description}
                                                onChange={(e) => updateTicket(ticket.id, { description: e.target.value })}
                                                placeholder="Detailed description..."
                                                className="input-field w-full text-xs min-h-[60px]"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Export Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={exportAsMarkdown}
                            className="btn-secondary flex items-center gap-2 flex-1"
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            Copy Markdown
                        </button>
                        <button
                            onClick={exportAsJiraFormat}
                            className="btn-secondary flex items-center gap-2 flex-1"
                        >
                            <FileText size={14} />
                            Jira JSON
                        </button>
                    </div>

                    {/* Send to Integrations */}
                    {integrations.length > 0 && (
                        <SendToIntegrations
                            appId="meeting-notes-jira"
                            appName="Meeting Notes to Jira"
                            data={{
                                type: 'meeting_notes',
                                meeting: meetingData,
                                tickets: meetingData.actionItems
                            }}
                            source={{ url: context?.url, title: context?.title }}
                        />
                    )}
                </div>
            )}

            {/* Info */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                <AlertCircle size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300/80">
                    Paste meeting notes, transcripts, or minutes. AI will extract action items as Jira-ready tickets.
                    Configure webhooks in settings to push directly to Jira.
                </p>
            </div>
        </div>
    );
};

export default MeetingNotesJiraApp;
