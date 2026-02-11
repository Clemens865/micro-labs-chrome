import React, { useState, useRef, useEffect } from 'react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import {
    MessageSquare,
    Send,
    Loader2,
    Copy,
    Check,
    UserCircle,
    Building2,
    ChevronDown,
    ChevronUp,
    Globe,
    Search,
    ExternalLink,
    Sparkles,
    Download,
    Trash2,
    BookOpen,
    Lightbulb,
    Zap,
    FileJson,
    FileText,
    FileType,
    X
} from 'lucide-react';

interface Source {
    uri: string;
    title?: string;
}

interface Message {
    role: 'user' | 'model';
    content: string;
    sources?: Source[];
    searchQueries?: string[];
    timestamp: number;
}

const AdvancedChatWithPage: React.FC = () => {
    const { context } = usePageContext();
    const { chatWithSearch, loading } = useGemini();
    const { profile, hasProfile, getProfileContext, getPersonalContext } = useUserProfile();

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
    const [includeProfile, setIncludeProfile] = useState(false);
    const [showProfilePreview, setShowProfilePreview] = useState(false);
    const [enableSearch, setEnableSearch] = useState(true);
    const [includePageContext, setIncludePageContext] = useState(true);
    const [showSources, setShowSources] = useState<number | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    // Close export menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
                setShowExportMenu(false);
            }
        };
        if (showExportMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showExportMenu]);

    const handleCopy = async (content: string, idx: number) => {
        await navigator.clipboard.writeText(content);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Build profile context for AI
    const buildProfileContext = () => {
        if (!includeProfile || !hasProfile) return '';
        const parts: string[] = [];
        const professionalContext = getProfileContext();
        if (professionalContext) {
            parts.push(`Professional: ${professionalContext}`);
        }
        const personalContext = getPersonalContext();
        if (personalContext) {
            parts.push(`Background: ${personalContext}`);
        }
        return parts.length > 0 ? `\n\nUser Profile: ${parts.join('. ')}` : '';
    };

    // Build system prompt
    const buildSystemPrompt = () => {
        const profileContext = buildProfileContext();
        const pageInfo = includePageContext && context ? `
Current Page Context:
- Title: ${context.title || 'Unknown'}
- URL: ${context.url || 'Unknown'}
- Content Preview: ${context.content?.substring(0, 8000) || 'No content available'}
` : '';

        return `You are an elite Research Intelligence Assistant with access to live web search. Your capabilities include:

1. **Page Analysis**: When the user asks about the current page, analyze the provided page context thoroughly.
2. **Live Research**: When enabled, you can search the web for current information, facts, and data.
3. **Deep Investigation**: Find comprehensive information about companies, products, people, certifications, technologies, or any topic.
4. **Synthesis**: Combine page context with live research to provide complete, accurate answers.

${pageInfo}
${profileContext}

RESPONSE GUIDELINES:
- Be comprehensive but organized - use headers, bullet points, and tables when appropriate
- When doing research, cite your findings and explain what you discovered
- If you searched the web, mention key findings from your research
- Provide actionable insights and highlight important details
- Use markdown formatting for rich, scannable responses
- When comparing or analyzing, use tables for clarity
- If asked about the page AND external topics, address both

RESEARCH CAPABILITIES:
- Company research: history, products, funding, team, certifications, reviews
- Product analysis: features, pricing, competitors, technical specs
- Topic deep-dives: trends, best practices, expert opinions
- Fact verification: cross-reference claims with current sources
- Market research: industry trends, competitor analysis, market size`;
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = {
            role: 'user',
            content: input,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // Build conversation history for multi-turn
        const conversationHistory = messages.map(m => ({
            role: m.role,
            content: m.content
        }));

        try {
            const result = await chatWithSearch(
                input,
                conversationHistory,
                {
                    systemInstruction: buildSystemPrompt(),
                    enableSearch,
                    pageContext: includePageContext && context ? {
                        title: context.title,
                        url: context.url,
                        content: context.content?.substring(0, 8000)
                    } : undefined
                }
            );

            const modelMsg: Message = {
                role: 'model',
                content: result.text,
                sources: result.sources,
                searchQueries: result.searchQueries,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, modelMsg]);
        } catch (err) {
            console.error(err);
            const errorMsg: Message = {
                role: 'model',
                content: 'Sorry, I encountered an error while processing your request. Please try again.',
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        }
    };

    const handleQuickAction = (prompt: string) => {
        setInput(prompt);
    };

    const handleClearChat = () => {
        setMessages([]);
    };

    // Generate filename base
    const getExportFilename = (ext: string) => {
        const date = new Date().toISOString().split('T')[0];
        const topic = context?.title?.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-') || 'research';
        return `chat-${topic}-${date}.${ext}`;
    };

    // Export as JSON
    const exportAsJson = () => {
        const exportData = {
            exportDate: new Date().toISOString(),
            pageContext: context ? { title: context.title, url: context.url } : null,
            conversation: messages.map(m => ({
                role: m.role,
                content: m.content,
                sources: m.sources,
                searchQueries: m.searchQueries,
                timestamp: new Date(m.timestamp).toISOString()
            }))
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getExportFilename('json');
        a.click();
        URL.revokeObjectURL(url);
        setShowExportMenu(false);
    };

    // Export as Markdown
    const exportAsMarkdown = () => {
        let md = `# Research Chat Export\n\n`;
        md += `**Date:** ${new Date().toLocaleDateString()}\n\n`;

        if (context) {
            md += `## Page Context\n\n`;
            md += `- **Title:** ${context.title || 'N/A'}\n`;
            md += `- **URL:** ${context.url || 'N/A'}\n\n`;
        }

        md += `---\n\n## Conversation\n\n`;

        messages.forEach((msg, idx) => {
            const time = new Date(msg.timestamp).toLocaleTimeString();

            if (msg.role === 'user') {
                md += `### 💬 User (${time})\n\n`;
                md += `${msg.content}\n\n`;
            } else {
                md += `### 🤖 AI Assistant (${time})\n\n`;
                md += `${msg.content}\n\n`;

                // Add sources if available
                if (msg.sources && msg.sources.length > 0) {
                    md += `**Sources:**\n\n`;
                    msg.sources.forEach((source, i) => {
                        const title = source.title || new URL(source.uri).hostname;
                        md += `${i + 1}. [${title}](${source.uri})\n`;
                    });
                    md += `\n`;
                }

                // Add search queries if available
                if (msg.searchQueries && msg.searchQueries.length > 0) {
                    md += `*Search queries used: ${msg.searchQueries.join(', ')}*\n\n`;
                }
            }

            md += `---\n\n`;
        });

        md += `\n*Exported from MicroLabs Advanced Chat*\n`;

        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getExportFilename('md');
        a.click();
        URL.revokeObjectURL(url);
        setShowExportMenu(false);
    };

    // Export as Word (DOCX) - simple clean format
    const exportAsWord = () => {
        let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Research Chat</title>
</head>
<body style="font-family: Calibri, sans-serif; font-size: 11pt; line-height: 1.5;">

<h1>Research Chat Export</h1>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
`;

        if (context) {
            html += `
<h2>Page Context</h2>
<p><strong>Title:</strong> ${escapeHtml(context.title || 'N/A')}</p>
<p><strong>URL:</strong> ${escapeHtml(context.url || 'N/A')}</p>
`;
        }

        html += `
<h2>Conversation</h2>
`;

        messages.forEach((msg) => {
            if (msg.role === 'user') {
                html += `
<p><strong>User:</strong></p>
<p>${escapeHtml(msg.content)}</p>
`;
            } else {
                // Convert basic markdown to HTML
                let content = escapeHtml(msg.content);
                content = content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/^### (.*$)/gm, '<h4>$1</h4>')
                    .replace(/^## (.*$)/gm, '<h3>$1</h3>')
                    .replace(/^# (.*$)/gm, '<h2>$1</h2>')
                    .replace(/^- (.*$)/gm, '• $1<br>')
                    .replace(/^\d+\. (.*$)/gm, '$&<br>')
                    .replace(/\n\n/g, '</p><p>')
                    .replace(/\n/g, '<br>');

                html += `
<p><strong>Assistant:</strong></p>
<p>${content}</p>
`;

                if (msg.sources && msg.sources.length > 0) {
                    html += `<p><strong>Sources:</strong></p><ul>`;
                    msg.sources.forEach((source) => {
                        const title = source.title || source.uri;
                        html += `<li>${escapeHtml(title)}</li>`;
                    });
                    html += `</ul>`;
                }
            }

            html += `<hr>`;
        });

        html += `
</body>
</html>`;

        const blob = new Blob([html], {
            type: 'application/vnd.ms-word;charset=utf-8'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getExportFilename('doc');
        a.click();
        URL.revokeObjectURL(url);
        setShowExportMenu(false);
    };

    // Helper to escape HTML
    const escapeHtml = (text: string) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // Quick research prompts based on page context
    const quickPrompts = context ? [
        { icon: Building2, label: 'Company Info', prompt: `Tell me everything about the company or organization behind this page. Include their history, products/services, team, funding, certifications, and any notable achievements.` },
        { icon: Search, label: 'Deep Research', prompt: `Do a comprehensive research on the main topic of this page. Find current information, expert opinions, recent developments, and related resources.` },
        { icon: Zap, label: 'Competitors', prompt: `Find and analyze the main competitors of this product/company. Compare features, pricing, market position, and unique selling points.` },
        { icon: Lightbulb, label: 'Key Facts', prompt: `Extract and verify the key facts and claims from this page. Search for supporting evidence or contradicting information.` },
    ] : [
        { icon: Globe, label: 'Web Research', prompt: 'Help me research: ' },
        { icon: Building2, label: 'Company Research', prompt: 'Tell me everything about this company: ' },
        { icon: BookOpen, label: 'Topic Deep-Dive', prompt: 'Do a comprehensive analysis of: ' },
        { icon: Zap, label: 'Compare Options', prompt: 'Compare these options for me: ' },
    ];

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: 'hsl(222 47% 7%)',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid hsl(222 47% 15%)'
        }}>
            {/* Header with Controls */}
            <div style={{
                padding: '12px 16px',
                backgroundColor: 'hsl(222 47% 9%)',
                borderBottom: '1px solid hsl(222 47% 15%)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                {/* Mode Toggles */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Live Search Toggle */}
                    <button
                        onClick={() => setEnableSearch(!enableSearch)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: `1px solid ${enableSearch ? 'hsl(142 71% 45% / 0.4)' : 'hsl(222 47% 20%)'}`,
                            backgroundColor: enableSearch ? 'hsl(142 71% 45% / 0.15)' : 'hsl(222 47% 11%)',
                            color: enableSearch ? 'hsl(142 71% 55%)' : 'hsl(215 20% 55%)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                    >
                        <Globe size={12} />
                        <span>Live Search</span>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: enableSearch ? 'hsl(142 71% 55%)' : 'hsl(222 47% 30%)',
                            transition: 'all 0.2s'
                        }} />
                    </button>

                    {/* Page Context Toggle */}
                    {context && (
                        <button
                            onClick={() => setIncludePageContext(!includePageContext)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: `1px solid ${includePageContext ? 'hsl(207 90% 55% / 0.4)' : 'hsl(222 47% 20%)'}`,
                                backgroundColor: includePageContext ? 'hsl(207 90% 55% / 0.15)' : 'hsl(222 47% 11%)',
                                color: includePageContext ? 'hsl(207 90% 65%)' : 'hsl(215 20% 55%)',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 600,
                                transition: 'all 0.2s'
                            }}
                        >
                            <BookOpen size={12} />
                            <span>Page Context</span>
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: includePageContext ? 'hsl(207 90% 65%)' : 'hsl(222 47% 30%)',
                                transition: 'all 0.2s'
                            }} />
                        </button>
                    )}

                    {/* Profile Toggle */}
                    {hasProfile && (
                        <button
                            onClick={() => setIncludeProfile(!includeProfile)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: `1px solid ${includeProfile ? 'hsl(262 83% 58% / 0.4)' : 'hsl(222 47% 20%)'}`,
                                backgroundColor: includeProfile ? 'hsl(262 83% 58% / 0.15)' : 'hsl(222 47% 11%)',
                                color: includeProfile ? 'hsl(262 83% 70%)' : 'hsl(215 20% 55%)',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 600,
                                transition: 'all 0.2s'
                            }}
                        >
                            <UserCircle size={12} />
                            <span>My Profile</span>
                        </button>
                    )}

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* Export & Clear */}
                    {messages.length > 0 && (
                        <>
                            {/* Export Dropdown */}
                            <div ref={exportMenuRef} style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        border: showExportMenu ? '1px solid hsl(142 71% 45% / 0.4)' : '1px solid transparent',
                                        backgroundColor: showExportMenu ? 'hsl(142 71% 45% / 0.1)' : 'transparent',
                                        color: showExportMenu ? 'hsl(142 71% 55%)' : 'hsl(215 20% 55%)',
                                        cursor: 'pointer',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        transition: 'all 0.2s'
                                    }}
                                    title="Export chat"
                                >
                                    <Download size={12} />
                                    <span>Export</span>
                                    <ChevronDown size={10} style={{
                                        transform: showExportMenu ? 'rotate(180deg)' : 'rotate(0)',
                                        transition: 'transform 0.2s'
                                    }} />
                                </button>

                                {/* Export Menu Dropdown */}
                                {showExportMenu && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '4px',
                                        backgroundColor: 'hsl(222 47% 11%)',
                                        border: '1px solid hsl(222 47% 20%)',
                                        borderRadius: '10px',
                                        padding: '6px',
                                        zIndex: 100,
                                        minWidth: '160px',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
                                    }}>
                                        <div style={{
                                            fontSize: '9px',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            color: 'hsl(215 20% 45%)',
                                            padding: '6px 10px 8px',
                                            borderBottom: '1px solid hsl(222 47% 18%)',
                                            marginBottom: '4px'
                                        }}>
                                            Export Format
                                        </div>

                                        {/* JSON Export */}
                                        <button
                                            onClick={exportAsJson}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                width: '100%',
                                                padding: '10px 12px',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: 'hsl(215 20% 70%)',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'hsl(222 47% 15%)';
                                                e.currentTarget.style.color = 'hsl(210 40% 98%)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = 'hsl(215 20% 70%)';
                                            }}
                                        >
                                            <FileJson size={16} style={{ color: 'hsl(45 93% 55%)' }} />
                                            <div>
                                                <div>JSON</div>
                                                <div style={{ fontSize: '10px', color: 'hsl(215 20% 50%)' }}>Raw data format</div>
                                            </div>
                                        </button>

                                        {/* Markdown Export */}
                                        <button
                                            onClick={exportAsMarkdown}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                width: '100%',
                                                padding: '10px 12px',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: 'hsl(215 20% 70%)',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'hsl(222 47% 15%)';
                                                e.currentTarget.style.color = 'hsl(210 40% 98%)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = 'hsl(215 20% 70%)';
                                            }}
                                        >
                                            <FileText size={16} style={{ color: 'hsl(215 70% 60%)' }} />
                                            <div>
                                                <div>Markdown</div>
                                                <div style={{ fontSize: '10px', color: 'hsl(215 20% 50%)' }}>For docs & notes</div>
                                            </div>
                                        </button>

                                        {/* Word Export */}
                                        <button
                                            onClick={exportAsWord}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                width: '100%',
                                                padding: '10px 12px',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: 'hsl(215 20% 70%)',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'hsl(222 47% 15%)';
                                                e.currentTarget.style.color = 'hsl(210 40% 98%)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = 'hsl(215 20% 70%)';
                                            }}
                                        >
                                            <FileType size={16} style={{ color: 'hsl(217 91% 60%)' }} />
                                            <div>
                                                <div>Word Document</div>
                                                <div style={{ fontSize: '10px', color: 'hsl(215 20% 50%)' }}>Styled .doc file</div>
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleClearChat}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    color: 'hsl(0 70% 50%)',
                                    cursor: 'pointer',
                                    fontSize: '10px'
                                }}
                                title="Clear chat"
                            >
                                <Trash2 size={12} />
                            </button>
                        </>
                    )}
                </div>

                {/* Profile Preview (if enabled) */}
                {includeProfile && hasProfile && (
                    <div style={{
                        padding: '8px 10px',
                        backgroundColor: 'hsl(262 83% 58% / 0.1)',
                        borderRadius: '8px',
                        border: '1px solid hsl(262 83% 58% / 0.2)',
                        fontSize: '10px',
                        color: 'hsl(215 20% 65%)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <UserCircle size={12} style={{ color: 'hsl(262 83% 60%)' }} />
                            <span style={{ fontWeight: 600, color: 'hsl(262 83% 70%)' }}>{profile.name || 'User'}</span>
                            {profile.role && <span>• {profile.role}</span>}
                            {profile.companyName && <span>• {profile.companyName}</span>}
                        </div>
                    </div>
                )}
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}
            >
                {/* Empty State */}
                {messages.length === 0 && (
                    <div style={{ padding: '24px 12px' }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            background: 'linear-gradient(135deg, hsl(142 71% 45% / 0.15) 0%, hsl(262 83% 58% / 0.15) 100%)',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                            <Sparkles size={28} style={{ color: 'hsl(142 71% 55%)' }} />
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'hsl(210 40% 98%)', marginBottom: '8px', textAlign: 'center' }}>
                            Advanced Research Chat
                        </h3>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 55%)', textAlign: 'center', maxWidth: '260px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                            Chat with live web search. Research companies, verify facts, and explore topics in depth.
                        </p>

                        {/* Quick Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 45%)' }}>
                                Quick Research
                            </span>
                            {quickPrompts.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleQuickAction(item.prompt)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '12px 14px',
                                        backgroundColor: 'hsl(222 47% 11%)',
                                        border: '1px solid hsl(222 47% 18%)',
                                        borderRadius: '10px',
                                        color: 'hsl(215 20% 70%)',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'hsl(222 47% 15%)';
                                        e.currentTarget.style.borderColor = 'hsl(142 71% 45% / 0.3)';
                                        e.currentTarget.style.color = 'hsl(210 40% 98%)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'hsl(222 47% 11%)';
                                        e.currentTarget.style.borderColor = 'hsl(222 47% 18%)';
                                        e.currentTarget.style.color = 'hsl(215 20% 70%)';
                                    }}
                                >
                                    <item.icon size={16} style={{ color: 'hsl(142 71% 55%)', flexShrink: 0 }} />
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Messages */}
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        style={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                    >
                        {msg.role === 'model' ? (
                            <div style={{ maxWidth: '90%', width: '100%' }}>
                                {/* AI Response */}
                                <div style={{
                                    backgroundColor: 'hsl(222 47% 11%)',
                                    color: 'hsl(215 20% 80%)',
                                    border: '1px solid hsl(222 47% 18%)',
                                    borderRadius: '16px',
                                    borderTopLeftRadius: '4px',
                                    padding: '14px',
                                    fontSize: '13px',
                                    lineHeight: 1.6
                                }}>
                                    <MarkdownRenderer content={msg.content} className="prose-sm" />
                                </div>

                                {/* Sources & Actions Row */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginTop: '8px',
                                    flexWrap: 'wrap'
                                }}>
                                    {/* Copy Button */}
                                    <button
                                        onClick={() => handleCopy(msg.content, i)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '10px',
                                            color: copiedIdx === i ? 'hsl(142 71% 45%)' : 'hsl(215 20% 50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '4px 6px',
                                            borderRadius: '4px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {copiedIdx === i ? <Check size={10} /> : <Copy size={10} />}
                                        <span>{copiedIdx === i ? 'Copied!' : 'Copy'}</span>
                                    </button>

                                    {/* Sources Toggle */}
                                    {msg.sources && msg.sources.length > 0 && (
                                        <button
                                            onClick={() => setShowSources(showSources === i ? null : i)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '10px',
                                                color: showSources === i ? 'hsl(142 71% 55%)' : 'hsl(207 90% 60%)',
                                                background: showSources === i ? 'hsl(142 71% 45% / 0.1)' : 'hsl(207 90% 55% / 0.1)',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <ExternalLink size={10} />
                                            <span>{msg.sources.length} Sources</span>
                                            {showSources === i ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                        </button>
                                    )}

                                    {/* Search Queries Badge */}
                                    {msg.searchQueries && msg.searchQueries.length > 0 && (
                                        <span style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '10px',
                                            color: 'hsl(142 71% 55%)',
                                            backgroundColor: 'hsl(142 71% 45% / 0.1)',
                                            padding: '3px 8px',
                                            borderRadius: '4px'
                                        }}>
                                            <Search size={10} />
                                            <span>Searched: {msg.searchQueries[0]}</span>
                                        </span>
                                    )}
                                </div>

                                {/* Expandable Sources Panel */}
                                {showSources === i && msg.sources && msg.sources.length > 0 && (
                                    <div style={{
                                        marginTop: '10px',
                                        padding: '12px',
                                        backgroundColor: 'hsl(222 47% 9%)',
                                        borderRadius: '10px',
                                        border: '1px solid hsl(207 90% 55% / 0.2)'
                                    }}>
                                        <div style={{
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            color: 'hsl(207 90% 60%)',
                                            marginBottom: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            <Globe size={12} />
                                            Research Sources
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {msg.sources.map((source, idx) => (
                                                <a
                                                    key={idx}
                                                    href={source.uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        padding: '8px 10px',
                                                        backgroundColor: 'hsl(222 47% 13%)',
                                                        borderRadius: '8px',
                                                        fontSize: '11px',
                                                        color: 'hsl(207 90% 65%)',
                                                        textDecoration: 'none',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'hsl(222 47% 18%)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)';
                                                    }}
                                                >
                                                    <ExternalLink size={12} style={{ flexShrink: 0 }} />
                                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {source.title || new URL(source.uri).hostname}
                                                    </span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{
                                maxWidth: '85%',
                                padding: '12px 16px',
                                borderRadius: '16px',
                                borderTopRightRadius: '4px',
                                fontSize: '13px',
                                lineHeight: 1.6,
                                background: 'linear-gradient(135deg, hsl(142 71% 45%) 0%, hsl(172 66% 40%) 100%)',
                                color: 'white',
                                boxShadow: '0 4px 16px hsl(142 71% 45% / 0.25)'
                            }}>
                                {msg.content}
                            </div>
                        )}
                    </div>
                ))}

                {/* Loading State */}
                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{
                            backgroundColor: 'hsl(222 47% 11%)',
                            border: '1px solid hsl(222 47% 18%)',
                            padding: '14px 18px',
                            borderRadius: '16px',
                            borderTopLeftRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <Loader2 size={16} className="animate-spin" style={{ color: 'hsl(142 71% 55%)' }} />
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(215 20% 55%)' }}>
                                {enableSearch ? 'Researching...' : 'Thinking...'}
                            </span>
                            {enableSearch && (
                                <span style={{
                                    fontSize: '9px',
                                    padding: '2px 6px',
                                    backgroundColor: 'hsl(142 71% 45% / 0.15)',
                                    borderRadius: '4px',
                                    color: 'hsl(142 71% 55%)'
                                }}>
                                    Live Search
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div style={{
                padding: '12px 16px 16px',
                backgroundColor: 'hsl(222 47% 9%)',
                borderTop: '1px solid hsl(222 47% 15%)'
            }}>
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    style={{ display: 'flex', gap: '10px' }}
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={enableSearch ? "Ask anything - I'll search the web..." : "Ask about this page..."}
                        style={{
                            flex: 1,
                            padding: '14px 16px',
                            backgroundColor: 'hsl(222 47% 11%)',
                            border: '1px solid hsl(222 47% 20%)',
                            borderRadius: '14px',
                            color: 'hsl(210 40% 98%)',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'all 0.2s'
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = 'hsl(142 71% 45%)';
                            e.target.style.boxShadow = '0 0 0 3px hsl(142 71% 45% / 0.15)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = 'hsl(222 47% 20%)';
                            e.target.style.boxShadow = 'none';
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        style={{
                            width: '52px',
                            height: '52px',
                            background: !input.trim() || loading
                                ? 'hsl(222 47% 20%)'
                                : 'linear-gradient(135deg, hsl(142 71% 45%) 0%, hsl(172 66% 40%) 100%)',
                            border: 'none',
                            borderRadius: '14px',
                            color: !input.trim() || loading ? 'hsl(215 20% 50%)' : 'white',
                            cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.2s ease',
                            boxShadow: !input.trim() || loading ? 'none' : '0 4px 16px hsl(142 71% 45% / 0.35)'
                        }}
                        onMouseEnter={(e) => {
                            if (input.trim() && !loading) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 24px hsl(142 71% 45% / 0.45)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = !input.trim() || loading ? 'none' : '0 4px 16px hsl(142 71% 45% / 0.35)';
                        }}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdvancedChatWithPage;
