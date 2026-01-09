import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGemini } from '../../hooks/useGemini';
import {
    Terminal,
    AlertTriangle,
    XCircle,
    Info,
    Bug,
    Trash2,
    Pause,
    Play,
    Download,
    Filter,
    Copy,
    Check,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    AlertCircle,
    Sparkles,
    Loader2,
    Wand2,
    FileCode,
    ClipboardList,
    Wifi,
    WifiOff,
    MessageSquare,
    Send,
    X,
    User,
    Bot
} from 'lucide-react';

interface ConsoleEntry {
    id: string;
    type: 'log' | 'warn' | 'error' | 'info' | 'debug' | 'verbose';
    message: string;
    timestamp: Date;
    count: number;
    stack?: string;
    source?: string;
    url?: string;
    lineNumber?: number;
}

interface ErrorAnalysis {
    summary: string;
    rootCause: string;
    suggestedFixes: string[];
    relatedFiles: string[];
    searchTerms: string[];
    codeSnippet?: string;
    aiPrompt: string;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const ConsoleMonitor: React.FC = () => {
    const { generateContent, loading: aiLoading } = useGemini();
    const [logs, setLogs] = useState<ConsoleEntry[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [filter, setFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [copied, setCopied] = useState<string | null>(null);
    const [expandedStacks, setExpandedStacks] = useState<Set<string>>(new Set());
    const [isConnected, setIsConnected] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const [errorAnalysis, setErrorAnalysis] = useState<ErrorAnalysis | null>(null);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [selectedErrors, setSelectedErrors] = useState<Set<string>>(new Set());
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [currentTabId, setCurrentTabId] = useState<number | null>(null);
    // Chat state
    const [showChat, setShowChat] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const pausedRef = useRef(isPaused);
    const isAttachedRef = useRef(false);

    // Keep ref in sync with state
    useEffect(() => {
        pausedRef.current = isPaused;
    }, [isPaused]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (autoScroll && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, autoScroll]);

    // Map Chrome console API types to our types
    const mapConsoleType = (type: string): ConsoleEntry['type'] => {
        switch (type) {
            case 'error': return 'error';
            case 'warning': return 'warn';
            case 'info': return 'info';
            case 'debug': return 'debug';
            case 'verbose': return 'verbose';
            default: return 'log';
        }
    };

    // Format console arguments from debugger
    const formatArgs = (args: any[]): string => {
        if (!args || args.length === 0) return '';

        return args.map(arg => {
            if (!arg) return 'undefined';

            // Handle different remote object types
            if (arg.type === 'string') return arg.value || '';
            if (arg.type === 'number') return String(arg.value);
            if (arg.type === 'boolean') return String(arg.value);
            if (arg.type === 'undefined') return 'undefined';
            if (arg.type === 'null' || arg.subtype === 'null') return 'null';
            if (arg.type === 'symbol') return arg.description || 'Symbol()';
            if (arg.type === 'function') return arg.description || '[Function]';
            if (arg.subtype === 'array') return arg.description || '[Array]';
            if (arg.subtype === 'regexp') return arg.description || '[RegExp]';
            if (arg.subtype === 'date') return arg.description || '[Date]';
            if (arg.subtype === 'error') return arg.description || '[Error]';
            if (arg.type === 'object') {
                if (arg.preview) {
                    // Try to format object preview
                    const props = arg.preview.properties || [];
                    const entries = props.map((p: any) => `${p.name}: ${p.value}`).join(', ');
                    return `{${entries}}`;
                }
                return arg.description || '[Object]';
            }

            return arg.description || arg.value || String(arg);
        }).join(' ');
    };

    // Handle debugger events
    const handleDebuggerEvent = useCallback((source: chrome.debugger.Debuggee, method: string, params: any) => {
        if (source.tabId !== currentTabId) return;
        if (pausedRef.current) return;

        if (method === 'Runtime.consoleAPICalled') {
            const entry: ConsoleEntry = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: mapConsoleType(params.type),
                message: formatArgs(params.args),
                timestamp: new Date(params.timestamp || Date.now()),
                count: 1,
                stack: params.stackTrace?.callFrames?.map((f: any) =>
                    `    at ${f.functionName || '(anonymous)'} (${f.url}:${f.lineNumber}:${f.columnNumber})`
                ).join('\n'),
                url: params.stackTrace?.callFrames?.[0]?.url,
                lineNumber: params.stackTrace?.callFrames?.[0]?.lineNumber
            };

            setLogs(prev => {
                // Deduplicate consecutive identical messages
                const lastEntry = prev[prev.length - 1];
                if (lastEntry &&
                    lastEntry.message === entry.message &&
                    lastEntry.type === entry.type &&
                    (entry.timestamp.getTime() - lastEntry.timestamp.getTime()) < 1000) {
                    return prev.map((log, i) =>
                        i === prev.length - 1 ? { ...log, count: log.count + 1 } : log
                    );
                }
                const newLogs = [...prev, entry];
                return newLogs.slice(-500);
            });
        } else if (method === 'Runtime.exceptionThrown') {
            const exception = params.exceptionDetails;
            const entry: ConsoleEntry = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'error',
                message: exception.text + (exception.exception?.description ? '\n' + exception.exception.description : ''),
                timestamp: new Date(params.timestamp || Date.now()),
                count: 1,
                stack: exception.stackTrace?.callFrames?.map((f: any) =>
                    `    at ${f.functionName || '(anonymous)'} (${f.url}:${f.lineNumber}:${f.columnNumber})`
                ).join('\n'),
                url: exception.url,
                lineNumber: exception.lineNumber
            };

            setLogs(prev => [...prev, entry].slice(-500));
        }
    }, [currentTabId]);

    // Handle debugger detach
    const handleDebuggerDetach = useCallback((source: chrome.debugger.Debuggee, reason: string) => {
        if (source.tabId === currentTabId) {
            isAttachedRef.current = false;
            setIsConnected(false);
            if (reason !== 'canceled_by_user') {
                setConnectionError(`Debugger detached: ${reason}`);
            }
        }
    }, [currentTabId]);

    // Attach debugger and enable console
    const startMonitoring = async () => {
        try {
            setConnectionError(null);

            // Detach from previous tab if any
            if (currentTabId && isAttachedRef.current) {
                try {
                    await chrome.debugger.detach({ tabId: currentTabId });
                } catch (e) {
                    // Ignore detach errors
                }
                isAttachedRef.current = false;
            }

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab?.id) {
                setConnectionError('No active tab found');
                return;
            }

            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
                setConnectionError('Cannot monitor console on browser internal pages. Navigate to a regular website.');
                return;
            }

            setCurrentTabId(tab.id);

            // Attach debugger
            await chrome.debugger.attach({ tabId: tab.id }, '1.3');
            isAttachedRef.current = true;

            // Enable Runtime domain to receive console events
            await chrome.debugger.sendCommand({ tabId: tab.id }, 'Runtime.enable');

            // Enable Log domain for additional logging
            await chrome.debugger.sendCommand({ tabId: tab.id }, 'Log.enable');

            setIsConnected(true);

            // Add initial log
            setLogs(prev => [...prev, {
                id: Date.now().toString(),
                type: 'info',
                message: `🔍 Connected to: ${tab.url}`,
                timestamp: new Date(),
                count: 1,
                source: 'system'
            }]);

        } catch (err: any) {
            console.error('Failed to start console monitoring:', err);
            isAttachedRef.current = false;

            if (err.message?.includes('Another debugger is already attached')) {
                setConnectionError('DevTools or another debugger is attached. Close DevTools to use Console Monitor, or use both side by side.');
            } else {
                setConnectionError(err.message || 'Failed to connect');
            }
            setIsConnected(false);
        }
    };

    // Stop monitoring
    const stopMonitoring = async () => {
        if (currentTabId && isAttachedRef.current) {
            try {
                await chrome.debugger.detach({ tabId: currentTabId });
            } catch (e) {
                // Ignore
            }
            isAttachedRef.current = false;
        }
        setIsConnected(false);
    };

    // Set up debugger event listeners
    useEffect(() => {
        chrome.debugger.onEvent.addListener(handleDebuggerEvent);
        chrome.debugger.onDetach.addListener(handleDebuggerDetach);

        return () => {
            chrome.debugger.onEvent.removeListener(handleDebuggerEvent);
            chrome.debugger.onDetach.removeListener(handleDebuggerDetach);

            // Cleanup: detach debugger
            if (currentTabId && isAttachedRef.current) {
                chrome.debugger.detach({ tabId: currentTabId }).catch(() => {});
            }
        };
    }, [handleDebuggerEvent, handleDebuggerDetach, currentTabId]);

    // Start monitoring on mount
    useEffect(() => {
        startMonitoring();

        return () => {
            // Cleanup on unmount
            if (currentTabId && isAttachedRef.current) {
                chrome.debugger.detach({ tabId: currentTabId }).catch(() => {});
            }
        };
    }, []);

    const clearLogs = () => {
        setLogs([]);
        setSelectedErrors(new Set());
    };

    const toggleStack = (id: string) => {
        setExpandedStacks(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const copyToClipboard = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const exportLogs = () => {
        const content = logs.map(log =>
            `[${log.timestamp.toISOString()}] [${log.type.toUpperCase()}] ${log.message}${log.stack ? '\n' + log.stack : ''}`
        ).join('\n\n');

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `console-logs-${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const toggleErrorSelection = (id: string) => {
        setSelectedErrors(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAllErrors = () => {
        const errorLogs = logs.filter(l => l.type === 'error' || l.type === 'warn');
        setSelectedErrors(new Set(errorLogs.map(l => l.id)));
    };

    const analyzeErrors = async () => {
        const errorsToAnalyze = selectedErrors.size > 0
            ? logs.filter(l => selectedErrors.has(l.id))
            : logs.filter(l => l.type === 'error' || l.type === 'warn');

        if (errorsToAnalyze.length === 0) return;

        const errorSummary = errorsToAnalyze.map(log =>
            `[${log.type.toUpperCase()}] ${log.message}${log.stack ? '\nStack: ' + log.stack : ''}${log.url ? '\nSource: ' + log.url + ':' + log.lineNumber : ''}`
        ).join('\n\n---\n\n');

        const prompt = `Analyze these console errors/warnings from a web application and provide debugging assistance.

ERRORS/WARNINGS:
${errorSummary}

Provide analysis in this exact JSON structure:
{
    "summary": "<Brief 1-2 sentence summary of all the errors - what's going wrong>",
    "rootCause": "<Explain the likely root cause of these errors in developer-friendly language>",
    "suggestedFixes": [
        "<Step-by-step fix 1>",
        "<Step-by-step fix 2>",
        "<Step-by-step fix 3>"
    ],
    "relatedFiles": [
        "<file1.js - extracted from stack traces or error messages>",
        "<file2.tsx>"
    ],
    "searchTerms": [
        "<term to Google for more help>",
        "<another useful search term>"
    ],
    "codeSnippet": "<If applicable, provide a code snippet that might fix the issue. Use \\n for newlines.>",
    "aiPrompt": "<A ready-to-paste prompt for AI coding assistants like Claude, Cursor, or Copilot that explains the error and asks for help fixing it. Include the key error messages and context. Make it detailed enough that another AI can understand and help fix the issue.>"
}

IMPORTANT:
- Be specific and actionable
- Extract file names from stack traces
- The aiPrompt should be comprehensive and ready to paste into another AI assistant
- Include common causes for these types of errors
- If it's a React/Next.js/Node error, provide framework-specific advice`;

        try {
            const data = await generateContent(
                prompt,
                'You are an expert full-stack developer and debugger. You help developers quickly understand and fix console errors. Be practical and action-oriented.',
                { jsonMode: true }
            );
            setErrorAnalysis(data);
            setShowAnalysis(true);
        } catch (err) {
            console.error('Analysis error:', err);
        }
    };

    const generateBugReport = () => {
        const errors = selectedErrors.size > 0
            ? logs.filter(l => selectedErrors.has(l.id))
            : logs.filter(l => l.type === 'error' || l.type === 'warn');

        const report = `## Bug Report

### Environment
- Timestamp: ${new Date().toISOString()}
- Source: Console Monitor

### Console Errors/Warnings (${errors.length})

${errors.map(log => `#### ${log.type.toUpperCase()} at ${log.timestamp.toLocaleTimeString()}
\`\`\`
${log.message}
\`\`\`
${log.stack ? `**Stack Trace:**\n\`\`\`\n${log.stack}\n\`\`\`` : ''}
${log.url ? `**Source:** ${log.url}:${log.lineNumber}` : ''}`).join('\n\n')}

### Steps to Reproduce
1. [Describe what you were doing]
2. [When the error occurred]

### Expected Behavior
[What should have happened]

### Actual Behavior
[What actually happened - the errors above]
`;
        copyToClipboard(report, 'bug-report');
    };

    // Generate AI-ready prompt with all error context
    const copyForAI = () => {
        const errors = selectedErrors.size > 0
            ? logs.filter(l => selectedErrors.has(l.id))
            : logs.filter(l => l.type === 'error' || l.type === 'warn');

        const recentLogs = logs.slice(-20); // Include recent context

        const aiPrompt = `I'm getting the following console errors/warnings in my web application and need help debugging them.

## Console Errors (${errors.length} total)

${errors.map((log, i) => `### Error ${i + 1}: ${log.type.toUpperCase()}
**Time:** ${log.timestamp.toLocaleTimeString()}
**Message:**
\`\`\`
${log.message}
\`\`\`
${log.stack ? `**Stack Trace:**
\`\`\`
${log.stack}
\`\`\`` : ''}
${log.url ? `**Source File:** ${log.url}:${log.lineNumber}` : ''}`).join('\n\n')}

## Recent Console Activity (for context)
\`\`\`
${recentLogs.map(log => `[${log.type.toUpperCase()}] ${log.message.slice(0, 200)}${log.message.length > 200 ? '...' : ''}`).join('\n')}
\`\`\`

## What I Need
1. Explain what's causing these errors
2. Identify the root cause
3. Provide step-by-step fix instructions
4. Show me the code changes needed

Please be specific and actionable. If you need more context about my codebase, let me know what files to share.`;

        copyToClipboard(aiPrompt, 'copy-for-ai');
    };

    // Build console context for chat
    const buildConsoleContext = () => {
        const errors = selectedErrors.size > 0
            ? logs.filter(l => selectedErrors.has(l.id))
            : logs.filter(l => l.type === 'error' || l.type === 'warn');

        const recentLogs = logs.slice(-30);

        return `## Current Console State

### Errors/Warnings (${errors.length})
${errors.map(log => `[${log.type.toUpperCase()}] ${log.message}${log.stack ? '\nStack: ' + log.stack.split('\n').slice(0, 3).join('\n') : ''}${log.url ? '\nSource: ' + log.url + ':' + log.lineNumber : ''}`).join('\n\n')}

### Recent Console Activity
${recentLogs.map(log => `[${log.timestamp.toLocaleTimeString()}] [${log.type.toUpperCase()}] ${log.message.slice(0, 150)}${log.message.length > 150 ? '...' : ''}`).join('\n')}

### Summary
- Total logs: ${logs.length}
- Errors: ${logs.filter(l => l.type === 'error').length}
- Warnings: ${logs.filter(l => l.type === 'warn').length}
- Selected for analysis: ${selectedErrors.size > 0 ? selectedErrors.size : 'all errors'}`;
    };

    // Send chat message
    const sendChatMessage = async () => {
        if (!chatInput.trim() || chatLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: chatInput.trim(),
            timestamp: new Date()
        };

        setChatMessages(prev => [...prev, userMessage]);
        setChatInput('');
        setChatLoading(true);

        try {
            const consoleContext = buildConsoleContext();
            const conversationHistory = chatMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');

            const prompt = `You are a debugging assistant helping analyze console output from a web application.

${consoleContext}

${conversationHistory ? `## Previous Conversation\n${conversationHistory}\n\n` : ''}## User Question
${userMessage.content}

Provide a helpful, specific answer. If asked to summarize, be concise. If asked about specific errors, reference the exact error messages. If suggesting fixes, be actionable and include code snippets where helpful.`;

            const response = await generateContent(
                prompt,
                'You are an expert web developer and debugger. Help users understand and fix console errors. Be concise but thorough. Use markdown formatting for code snippets.',
                { jsonMode: false }
            );

            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: typeof response === 'string' ? response : JSON.stringify(response),
                timestamp: new Date()
            };

            setChatMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            console.error('Chat error:', err);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error processing your request. Please try again.',
                timestamp: new Date()
            };
            setChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setChatLoading(false);
        }
    };

    // Auto-scroll chat
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages]);

    // Quick chat prompts
    const quickPrompts = [
        { label: 'Summarize errors', prompt: 'Summarize all the errors and warnings in the console. What are the main issues?' },
        { label: 'Root cause', prompt: 'What is the most likely root cause of these errors? Explain in simple terms.' },
        { label: 'Fix priority', prompt: 'Which errors should I fix first and why? Give me a prioritized list.' },
        { label: 'Code fix', prompt: 'Show me the code changes needed to fix the most critical error.' },
    ];

    const getTypeIcon = (type: string, size = 14) => {
        switch (type) {
            case 'error': return <XCircle size={size} style={{ color: 'hsl(0 84% 60%)' }} />;
            case 'warn': return <AlertTriangle size={size} style={{ color: 'hsl(45 93% 55%)' }} />;
            case 'info': return <Info size={size} style={{ color: 'hsl(207 90% 60%)' }} />;
            case 'debug': return <Bug size={size} style={{ color: 'hsl(280 65% 60%)' }} />;
            case 'verbose': return <Terminal size={size} style={{ color: 'hsl(215 20% 50%)' }} />;
            default: return <Terminal size={size} style={{ color: 'hsl(215 20% 65%)' }} />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'error': return { bg: 'hsl(0 84% 60% / 0.1)', border: 'hsl(0 84% 60% / 0.3)', text: 'hsl(0 84% 70%)' };
            case 'warn': return { bg: 'hsl(45 93% 47% / 0.1)', border: 'hsl(45 93% 47% / 0.3)', text: 'hsl(45 93% 65%)' };
            case 'info': return { bg: 'hsl(207 90% 54% / 0.1)', border: 'hsl(207 90% 54% / 0.3)', text: 'hsl(207 90% 70%)' };
            case 'debug': return { bg: 'hsl(280 65% 55% / 0.1)', border: 'hsl(280 65% 55% / 0.3)', text: 'hsl(280 65% 70%)' };
            case 'verbose': return { bg: 'hsl(215 20% 20% / 0.5)', border: 'hsl(215 20% 30%)', text: 'hsl(215 20% 60%)' };
            default: return { bg: 'hsl(222 47% 13%)', border: 'hsl(222 47% 20%)', text: 'hsl(215 20% 75%)' };
        }
    };

    const filteredLogs = logs.filter(log => {
        if (filter !== 'all' && log.type !== filter) return false;
        if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const counts = {
        all: logs.length,
        error: logs.filter(l => l.type === 'error').length,
        warn: logs.filter(l => l.type === 'warn').length,
        log: logs.filter(l => l.type === 'log').length,
        info: logs.filter(l => l.type === 'info').length,
        debug: logs.filter(l => l.type === 'debug').length
    };

    const hasErrors = logs.some(l => l.type === 'error' || l.type === 'warn');

    return (
        <div className="space-y-4">
            {/* Header */}
            <div style={{
                padding: '16px',
                backgroundColor: 'hsl(222 47% 11%)',
                borderRadius: '14px',
                border: '1px solid hsl(222 47% 18%)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, hsl(142 71% 45%) 0%, hsl(142 71% 35%) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Terminal size={22} style={{ color: 'white' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(210 40% 98%)' }}>
                            Console Monitor
                        </h3>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 55%)', marginTop: '2px' }}>
                            Live console streaming with AI debugging
                        </p>
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        backgroundColor: isConnected ? 'hsl(142 71% 45% / 0.2)' : 'hsl(0 84% 60% / 0.2)'
                    }}>
                        {isConnected ? <Wifi size={14} style={{ color: 'hsl(142 71% 55%)' }} /> : <WifiOff size={14} style={{ color: 'hsl(0 84% 60%)' }} />}
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: isConnected ? 'hsl(142 71% 65%)' : 'hsl(0 84% 65%)'
                        }}>
                            {isConnected ? 'Streaming' : 'Disconnected'}
                        </span>
                    </div>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: isPaused ? 'hsl(142 71% 45% / 0.2)' : 'hsl(45 93% 47% / 0.2)',
                            color: isPaused ? 'hsl(142 71% 65%)' : 'hsl(45 93% 65%)'
                        }}
                    >
                        {isPaused ? <Play size={14} /> : <Pause size={14} />}
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>

                    <button
                        onClick={clearLogs}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: 'hsl(0 84% 60% / 0.2)',
                            color: 'hsl(0 84% 65%)'
                        }}
                    >
                        <Trash2 size={14} />
                        Clear
                    </button>

                    {isConnected ? (
                        <button
                            onClick={stopMonitoring}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: 'hsl(0 84% 60% / 0.2)',
                                color: 'hsl(0 84% 65%)'
                            }}
                        >
                            <WifiOff size={14} />
                            Disconnect
                        </button>
                    ) : (
                        <button
                            onClick={startMonitoring}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: 'hsl(142 71% 45% / 0.2)',
                                color: 'hsl(142 71% 65%)'
                            }}
                        >
                            <Wifi size={14} />
                            Connect
                        </button>
                    )}

                    <button
                        onClick={exportLogs}
                        disabled={logs.length === 0}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: logs.length === 0 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: 'hsl(222 47% 16%)',
                            color: logs.length === 0 ? 'hsl(215 20% 40%)' : 'hsl(215 20% 65%)',
                            opacity: logs.length === 0 ? 0.5 : 1
                        }}
                    >
                        <Download size={14} />
                        Export
                    </button>
                </div>

                {/* AI Analysis Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid hsl(222 47% 18%)' }}>
                    <button
                        onClick={analyzeErrors}
                        disabled={aiLoading || !hasErrors}
                        style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: aiLoading || !hasErrors ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            background: aiLoading || !hasErrors ? 'hsl(222 47% 16%)' : 'linear-gradient(135deg, hsl(24 95% 50%) 0%, hsl(15 95% 55%) 100%)',
                            color: aiLoading || !hasErrors ? 'hsl(215 20% 50%)' : 'white',
                            boxShadow: aiLoading || !hasErrors ? 'none' : '0 4px 12px hsl(24 95% 50% / 0.3)',
                            opacity: !hasErrors ? 0.5 : 1
                        }}
                    >
                        {aiLoading ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
                        {aiLoading ? 'Analyzing...' : `Analyze Errors${selectedErrors.size > 0 ? ` (${selectedErrors.size})` : ''}`}
                    </button>

                    <button
                        onClick={copyForAI}
                        disabled={!hasErrors}
                        style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: !hasErrors ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: !hasErrors ? 'hsl(222 47% 16%)' : 'linear-gradient(135deg, hsl(262 83% 58%) 0%, hsl(262 83% 48%) 100%)',
                            color: !hasErrors ? 'hsl(215 20% 50%)' : 'white',
                            boxShadow: !hasErrors ? 'none' : '0 4px 12px hsl(262 83% 58% / 0.3)',
                            opacity: !hasErrors ? 0.5 : 1
                        }}
                    >
                        {copied === 'copy-for-ai' ? <Check size={14} /> : <Copy size={14} />}
                        {copied === 'copy-for-ai' ? 'Copied!' : 'Copy for AI'}
                    </button>

                    <button
                        onClick={() => setShowChat(!showChat)}
                        style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: showChat ? 'linear-gradient(135deg, hsl(142 71% 45%) 0%, hsl(142 71% 35%) 100%)' : 'linear-gradient(135deg, hsl(207 90% 54%) 0%, hsl(207 90% 44%) 100%)',
                            color: 'white',
                            boxShadow: '0 4px 12px hsl(207 90% 54% / 0.3)'
                        }}
                    >
                        <MessageSquare size={14} />
                        {showChat ? 'Hide Chat' : 'Chat'}
                    </button>
                </div>
            </div>

            {/* Connection Error */}
            {connectionError && (
                <div style={{
                    padding: '12px 16px',
                    backgroundColor: 'hsl(45 93% 47% / 0.1)',
                    borderRadius: '10px',
                    border: '1px solid hsl(45 93% 47% / 0.2)',
                    fontSize: '13px',
                    color: 'hsl(45 93% 60%)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <div>{connectionError}</div>
                        {connectionError.includes('DevTools') && (
                            <div style={{ fontSize: '11px', marginTop: '6px', opacity: 0.8 }}>
                                💡 Tip: You can close DevTools and use Console Monitor instead, or keep DevTools open and view logs there.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Chat Panel */}
            {showChat && (
                <div style={{
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(207 90% 54% / 0.3)',
                    overflow: 'hidden'
                }}>
                    {/* Chat Header */}
                    <div style={{
                        padding: '12px 16px',
                        background: 'linear-gradient(135deg, hsl(207 90% 54% / 0.1) 0%, hsl(207 90% 54% / 0.05) 100%)',
                        borderBottom: '1px solid hsl(222 47% 18%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <MessageSquare size={18} style={{ color: 'hsl(207 90% 60%)' }} />
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'hsl(207 90% 70%)' }}>
                                Chat with Console
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                onClick={() => setChatMessages([])}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    backgroundColor: 'hsl(222 47% 16%)',
                                    color: 'hsl(215 20% 60%)'
                                }}
                            >
                                Clear Chat
                            </button>
                            <button
                                onClick={() => setShowChat(false)}
                                style={{
                                    padding: '4px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: 'transparent',
                                    color: 'hsl(215 20% 60%)',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Quick Prompts */}
                    <div style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid hsl(222 47% 18%)',
                        display: 'flex',
                        gap: '6px',
                        flexWrap: 'wrap'
                    }}>
                        {quickPrompts.map((qp, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    setChatInput(qp.prompt);
                                }}
                                disabled={chatLoading}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: '14px',
                                    border: '1px solid hsl(207 90% 54% / 0.3)',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    cursor: chatLoading ? 'not-allowed' : 'pointer',
                                    backgroundColor: 'hsl(207 90% 54% / 0.1)',
                                    color: 'hsl(207 90% 70%)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {qp.label}
                            </button>
                        ))}
                    </div>

                    {/* Chat Messages */}
                    <div style={{
                        maxHeight: '300px',
                        overflowY: 'auto',
                        padding: '12px 16px'
                    }}>
                        {chatMessages.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '30px 20px',
                                color: 'hsl(215 20% 50%)'
                            }}>
                                <Bot size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                                <p style={{ fontSize: '13px', marginBottom: '6px' }}>Ask me about the console output</p>
                                <p style={{ fontSize: '11px', opacity: 0.7 }}>
                                    I can summarize errors, explain issues, suggest fixes, or answer any debugging questions.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {chatMessages.map(msg => (
                                    <div
                                        key={msg.id}
                                        style={{
                                            display: 'flex',
                                            gap: '10px',
                                            alignItems: 'flex-start'
                                        }}
                                    >
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '8px',
                                            backgroundColor: msg.role === 'user' ? 'hsl(262 83% 58% / 0.2)' : 'hsl(207 90% 54% / 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {msg.role === 'user' ? (
                                                <User size={14} style={{ color: 'hsl(262 83% 65%)' }} />
                                            ) : (
                                                <Bot size={14} style={{ color: 'hsl(207 90% 65%)' }} />
                                            )}
                                        </div>
                                        <div style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            backgroundColor: msg.role === 'user' ? 'hsl(262 83% 58% / 0.1)' : 'hsl(222 47% 13%)',
                                            borderRadius: '10px',
                                            borderTopLeftRadius: msg.role === 'user' ? '10px' : '2px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    color: msg.role === 'user' ? 'hsl(262 83% 65%)' : 'hsl(207 90% 65%)'
                                                }}>
                                                    {msg.role === 'user' ? 'You' : 'AI Assistant'}
                                                </span>
                                                <span style={{ fontSize: '10px', color: 'hsl(215 20% 45%)' }}>
                                                    {msg.timestamp.toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <div style={{
                                                fontSize: '13px',
                                                color: 'hsl(215 20% 80%)',
                                                lineHeight: 1.5,
                                                whiteSpace: 'pre-wrap'
                                            }}>
                                                {msg.content}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(msg.content, `chat-${msg.id}`)}
                                            style={{
                                                padding: '4px',
                                                borderRadius: '4px',
                                                border: 'none',
                                                backgroundColor: 'transparent',
                                                color: 'hsl(215 20% 45%)',
                                                cursor: 'pointer',
                                                flexShrink: 0
                                            }}
                                        >
                                            {copied === `chat-${msg.id}` ? <Check size={12} /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                ))}
                                {chatLoading && (
                                    <div style={{
                                        display: 'flex',
                                        gap: '10px',
                                        alignItems: 'flex-start'
                                    }}>
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '8px',
                                            backgroundColor: 'hsl(207 90% 54% / 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <Bot size={14} style={{ color: 'hsl(207 90% 65%)' }} />
                                        </div>
                                        <div style={{
                                            padding: '12px',
                                            backgroundColor: 'hsl(222 47% 13%)',
                                            borderRadius: '10px',
                                            borderTopLeftRadius: '2px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <Loader2 className="animate-spin" size={14} style={{ color: 'hsl(207 90% 60%)' }} />
                                            <span style={{ fontSize: '12px', color: 'hsl(215 20% 55%)' }}>Thinking...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Chat Input */}
                    <div style={{
                        padding: '12px 16px',
                        borderTop: '1px solid hsl(222 47% 18%)',
                        display: 'flex',
                        gap: '8px'
                    }}>
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                            placeholder="Ask about the console output..."
                            disabled={chatLoading}
                            style={{
                                flex: 1,
                                padding: '10px 14px',
                                backgroundColor: 'hsl(222 47% 8%)',
                                border: '1px solid hsl(222 47% 20%)',
                                borderRadius: '10px',
                                color: 'hsl(210 40% 98%)',
                                fontSize: '13px',
                                outline: 'none'
                            }}
                        />
                        <button
                            onClick={sendChatMessage}
                            disabled={chatLoading || !chatInput.trim()}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '10px',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: chatLoading || !chatInput.trim() ? 'hsl(222 47% 16%)' : 'linear-gradient(135deg, hsl(207 90% 54%) 0%, hsl(207 90% 44%) 100%)',
                                color: chatLoading || !chatInput.trim() ? 'hsl(215 20% 50%)' : 'white'
                            }}
                        >
                            {chatLoading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                        </button>
                    </div>
                </div>
            )}

            {/* AI Analysis Results */}
            {showAnalysis && errorAnalysis && (
                <div style={{
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(24 95% 50% / 0.3)',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '14px 16px',
                        background: 'linear-gradient(135deg, hsl(24 95% 50% / 0.1) 0%, hsl(24 95% 50% / 0.05) 100%)',
                        borderBottom: '1px solid hsl(222 47% 18%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Sparkles size={18} style={{ color: 'hsl(24 95% 60%)' }} />
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'hsl(24 95% 65%)' }}>
                                AI Error Analysis
                            </span>
                        </div>
                        <button
                            onClick={() => setShowAnalysis(false)}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '11px',
                                cursor: 'pointer',
                                backgroundColor: 'hsl(222 47% 16%)',
                                color: 'hsl(215 20% 60%)'
                            }}
                        >
                            Hide
                        </button>
                    </div>

                    <div style={{ padding: '16px' }} className="space-y-4">
                        {/* Summary */}
                        <div>
                            <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'hsl(215 20% 55%)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                Summary
                            </h4>
                            <p style={{ fontSize: '14px', color: 'hsl(210 40% 98%)', lineHeight: 1.5 }}>
                                {errorAnalysis.summary}
                            </p>
                        </div>

                        {/* Root Cause */}
                        <div style={{
                            padding: '12px',
                            backgroundColor: 'hsl(0 84% 60% / 0.1)',
                            borderRadius: '10px',
                            borderLeft: '3px solid hsl(0 84% 60%)'
                        }}>
                            <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'hsl(0 84% 65%)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                Root Cause
                            </h4>
                            <p style={{ fontSize: '13px', color: 'hsl(215 20% 75%)', lineHeight: 1.5 }}>
                                {errorAnalysis.rootCause}
                            </p>
                        </div>

                        {/* Suggested Fixes */}
                        <div>
                            <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'hsl(142 71% 55%)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Suggested Fixes
                            </h4>
                            <div className="space-y-2">
                                {errorAnalysis.suggestedFixes?.map((fix, i) => (
                                    <div key={i} style={{
                                        display: 'flex',
                                        gap: '10px',
                                        padding: '10px 12px',
                                        backgroundColor: 'hsl(142 71% 45% / 0.1)',
                                        borderRadius: '8px'
                                    }}>
                                        <span style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            backgroundColor: 'hsl(142 71% 45%)',
                                            color: 'white',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {i + 1}
                                        </span>
                                        <p style={{ fontSize: '13px', color: 'hsl(215 20% 75%)', lineHeight: 1.4 }}>
                                            {fix}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Code Snippet */}
                        {errorAnalysis.codeSnippet && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'hsl(207 90% 60%)', textTransform: 'uppercase' }}>
                                        Suggested Code
                                    </h4>
                                    <button
                                        onClick={() => copyToClipboard(errorAnalysis.codeSnippet || '', 'code')}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            backgroundColor: 'hsl(222 47% 16%)',
                                            color: 'hsl(215 20% 60%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        {copied === 'code' ? <Check size={10} /> : <Copy size={10} />}
                                        {copied === 'code' ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <pre style={{
                                    padding: '12px',
                                    backgroundColor: 'hsl(222 47% 8%)',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontFamily: 'ui-monospace, "SF Mono", Menlo, Monaco, monospace',
                                    color: 'hsl(142 71% 70%)',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    lineHeight: 1.5,
                                    overflow: 'auto'
                                }}>
                                    {errorAnalysis.codeSnippet.replace(/\\n/g, '\n')}
                                </pre>
                            </div>
                        )}

                        {/* AI Prompt - Ready to Copy */}
                        <div style={{
                            padding: '14px',
                            backgroundColor: 'hsl(24 95% 50% / 0.1)',
                            borderRadius: '12px',
                            border: '1px solid hsl(24 95% 50% / 0.2)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileCode size={16} style={{ color: 'hsl(24 95% 60%)' }} />
                                    <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'hsl(24 95% 65%)' }}>
                                        Ready for AI Assistant
                                    </h4>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(errorAnalysis.aiPrompt, 'ai-prompt')}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        background: 'linear-gradient(135deg, hsl(24 95% 50%) 0%, hsl(15 95% 55%) 100%)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {copied === 'ai-prompt' ? <Check size={12} /> : <Copy size={12} />}
                                    {copied === 'ai-prompt' ? 'Copied!' : 'Copy Prompt'}
                                </button>
                            </div>
                            <p style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', marginBottom: '10px' }}>
                                Paste this into Claude, Cursor, Copilot, or any AI coding assistant:
                            </p>
                            <div style={{
                                padding: '12px',
                                backgroundColor: 'hsl(222 47% 8%)',
                                borderRadius: '8px',
                                fontSize: '12px',
                                color: 'hsl(215 20% 70%)',
                                lineHeight: 1.5,
                                maxHeight: '150px',
                                overflowY: 'auto',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {errorAnalysis.aiPrompt}
                            </div>
                        </div>

                        {/* Related Files & Search Terms */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {errorAnalysis.relatedFiles?.length > 0 && (
                                <div style={{
                                    padding: '12px',
                                    backgroundColor: 'hsl(222 47% 13%)',
                                    borderRadius: '10px'
                                }}>
                                    <h4 style={{ fontSize: '10px', fontWeight: 700, color: 'hsl(215 20% 50%)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        Files to Check
                                    </h4>
                                    {errorAnalysis.relatedFiles.map((file, i) => (
                                        <div key={i} style={{
                                            fontSize: '11px',
                                            color: 'hsl(207 90% 65%)',
                                            fontFamily: 'monospace',
                                            marginBottom: '4px'
                                        }}>
                                            {file}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {errorAnalysis.searchTerms?.length > 0 && (
                                <div style={{
                                    padding: '12px',
                                    backgroundColor: 'hsl(222 47% 13%)',
                                    borderRadius: '10px'
                                }}>
                                    <h4 style={{ fontSize: '10px', fontWeight: 700, color: 'hsl(215 20% 50%)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        Search For
                                    </h4>
                                    {errorAnalysis.searchTerms.map((term, i) => (
                                        <div key={i} style={{
                                            fontSize: '11px',
                                            color: 'hsl(45 93% 60%)',
                                            marginBottom: '4px'
                                        }}>
                                            "{term}"
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <div style={{
                display: 'flex',
                gap: '6px',
                padding: '8px',
                backgroundColor: 'hsl(222 47% 11%)',
                borderRadius: '10px',
                overflowX: 'auto'
            }}>
                {(['all', 'error', 'warn', 'log', 'info', 'debug'] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => setFilter(type)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s',
                            ...(filter === type
                                ? {
                                    backgroundColor: type === 'all' ? 'hsl(24 95% 50%)' : getTypeColor(type).bg,
                                    color: type === 'all' ? 'white' : getTypeColor(type).text
                                }
                                : {
                                    backgroundColor: 'transparent',
                                    color: 'hsl(215 20% 55%)'
                                })
                        }}
                    >
                        {type !== 'all' && getTypeIcon(type, 12)}
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                        {counts[type] > 0 && (
                            <span style={{
                                padding: '1px 6px',
                                borderRadius: '10px',
                                backgroundColor: filter === type ? 'rgba(255,255,255,0.2)' : 'hsl(222 47% 18%)',
                                fontSize: '10px'
                            }}>
                                {counts[type]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
                <Filter size={14} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'hsl(215 20% 45%)'
                }} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter logs..."
                    style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        backgroundColor: 'hsl(222 47% 11%)',
                        border: '1px solid hsl(222 47% 18%)',
                        borderRadius: '10px',
                        color: 'hsl(210 40% 98%)',
                        fontSize: '13px',
                        outline: 'none'
                    }}
                />
            </div>

            {/* Logs List */}
            <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                backgroundColor: 'hsl(222 47% 8%)',
                borderRadius: '12px',
                border: '1px solid hsl(222 47% 15%)'
            }}>
                {filteredLogs.length === 0 ? (
                    <div style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        color: 'hsl(215 20% 50%)'
                    }}>
                        <Terminal size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                        <p style={{ fontSize: '13px' }}>
                            {!isConnected ? 'Not connected' : logs.length === 0 ? 'Waiting for console output...' : 'No logs match your filter'}
                        </p>
                        <p style={{ fontSize: '11px', marginTop: '6px', opacity: 0.7 }}>
                            {!isConnected ? 'Click Connect to start streaming' : logs.length === 0 ? 'Console logs will appear here in real-time' : 'Try a different filter'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1" style={{ padding: '8px' }}>
                        {filteredLogs.map(log => {
                            const colors = getTypeColor(log.type);
                            const isError = log.type === 'error' || log.type === 'warn';
                            return (
                                <div
                                    key={log.id}
                                    onClick={() => isError && toggleErrorSelection(log.id)}
                                    style={{
                                        padding: '10px 12px',
                                        backgroundColor: selectedErrors.has(log.id) ? 'hsl(24 95% 50% / 0.15)' : colors.bg,
                                        borderRadius: '8px',
                                        borderLeft: `3px solid ${selectedErrors.has(log.id) ? 'hsl(24 95% 50%)' : colors.border}`,
                                        fontSize: '12px',
                                        fontFamily: 'ui-monospace, "SF Mono", Menlo, Monaco, monospace',
                                        cursor: isError ? 'pointer' : 'default'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                        <div style={{ flexShrink: 0, marginTop: '2px' }}>
                                            {getTypeIcon(log.type)}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '10px', color: 'hsl(215 20% 50%)' }}>
                                                    {log.timestamp.toLocaleTimeString()}
                                                </span>
                                                {log.count > 1 && (
                                                    <span style={{
                                                        padding: '1px 6px',
                                                        borderRadius: '10px',
                                                        backgroundColor: 'hsl(24 95% 50%)',
                                                        color: 'white',
                                                        fontSize: '10px',
                                                        fontWeight: 600
                                                    }}>
                                                        ×{log.count}
                                                    </span>
                                                )}
                                                {log.url && (
                                                    <span style={{ fontSize: '9px', color: 'hsl(207 90% 55%)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {log.url.split('/').pop()}:{log.lineNumber}
                                                    </span>
                                                )}
                                                {isError && (
                                                    <span style={{
                                                        fontSize: '9px',
                                                        color: 'hsl(215 20% 45%)'
                                                    }}>
                                                        {selectedErrors.has(log.id) ? '✓ selected' : 'click to select'}
                                                    </span>
                                                )}
                                            </div>
                                            <pre style={{
                                                margin: 0,
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                                color: colors.text,
                                                lineHeight: 1.4
                                            }}>
                                                {log.message}
                                            </pre>
                                            {log.stack && (
                                                <div style={{ marginTop: '8px' }}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleStack(log.id); }}
                                                        style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            border: 'none',
                                                            fontSize: '10px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            backgroundColor: 'hsl(222 47% 15%)',
                                                            color: 'hsl(215 20% 60%)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        {expandedStacks.has(log.id) ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                                        Stack trace
                                                    </button>
                                                    {expandedStacks.has(log.id) && (
                                                        <pre style={{
                                                            marginTop: '8px',
                                                            padding: '8px',
                                                            backgroundColor: 'hsl(222 47% 12%)',
                                                            borderRadius: '6px',
                                                            fontSize: '10px',
                                                            color: 'hsl(215 20% 55%)',
                                                            whiteSpace: 'pre-wrap',
                                                            wordBreak: 'break-word',
                                                            lineHeight: 1.4
                                                        }}>
                                                            {log.stack}
                                                        </pre>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); copyToClipboard(log.message, log.id); }}
                                            style={{
                                                padding: '4px',
                                                borderRadius: '4px',
                                                border: 'none',
                                                backgroundColor: 'transparent',
                                                color: 'hsl(215 20% 50%)',
                                                cursor: 'pointer',
                                                flexShrink: 0
                                            }}
                                        >
                                            {copied === log.id ? <Check size={12} /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={logsEndRef} />
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: 'hsl(222 47% 11%)',
                borderRadius: '8px',
                fontSize: '11px',
                color: 'hsl(215 20% 55%)'
            }}>
                <span>
                    {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
                    {filter !== 'all' && ` (filtered from ${logs.length})`}
                    {selectedErrors.size > 0 && ` • ${selectedErrors.size} selected`}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {hasErrors && selectedErrors.size === 0 && (
                        <button
                            onClick={selectAllErrors}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: 'none',
                                fontSize: '10px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                backgroundColor: 'hsl(24 95% 50% / 0.2)',
                                color: 'hsl(24 95% 60%)'
                            }}
                        >
                            Select all errors
                        </button>
                    )}
                    <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: 'none',
                            fontSize: '10px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: autoScroll ? 'hsl(142 71% 45% / 0.2)' : 'hsl(222 47% 16%)',
                            color: autoScroll ? 'hsl(142 71% 60%)' : 'hsl(215 20% 55%)'
                        }}
                    >
                        Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConsoleMonitor;
