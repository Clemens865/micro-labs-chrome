import React, { useState, useEffect } from 'react';
import { useGemini } from '../../hooks/useGemini';
import {
    Bot, Play, Pause, Square, Plus, Trash2, Globe, Search,
    Loader2, Sparkles, ExternalLink, Eye, FileText, Download,
    Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw,
    ChevronDown, ChevronUp, Copy, Check, Image, Code
} from 'lucide-react';

interface BrowsingTask {
    id: string;
    url: string;
    status: 'pending' | 'loading' | 'completed' | 'failed';
    title?: string;
    content?: string;
    screenshot?: string;
    error?: string;
    startTime?: number;
    endTime?: number;
}

interface ResearchResult {
    query: string;
    tasks: BrowsingTask[];
    synthesis?: string;
    insights?: string[];
    timestamp: number;
}

const AutoBrowserAgent: React.FC = () => {
    const { generateContent, loading: aiLoading } = useGemini();
    const [urls, setUrls] = useState<string[]>(['']);
    const [query, setQuery] = useState('');
    const [tasks, setTasks] = useState<BrowsingTask[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<ResearchResult[]>([]);
    const [currentTask, setCurrentTask] = useState<string | null>(null);
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
    const [copied, setCopied] = useState<string | null>(null);
    const [mode, setMode] = useState<'urls' | 'search'>('urls');

    const addUrl = () => {
        if (urls.length < 10) setUrls([...urls, '']);
    };

    const removeUrl = (index: number) => {
        setUrls(urls.filter((_, i) => i !== index));
    };

    const updateUrl = (index: number, value: string) => {
        const newUrls = [...urls];
        newUrls[index] = value;
        setUrls(newUrls);
    };

    // Extract page content using content script
    const extractPageContent = async (tabId: number): Promise<{ title: string; content: string }> => {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId },
                func: () => {
                    // Get page title
                    const title = document.title;

                    // Get main content
                    const selectors = ['article', 'main', '[role="main"]', '.content', '#content', '.post', '.article'];
                    let content = '';

                    for (const selector of selectors) {
                        const el = document.querySelector(selector) as HTMLElement | null;
                        if (el && el.innerText) {
                            content = el.innerText;
                            break;
                        }
                    }

                    // Fallback to body
                    if (!content) {
                        content = document.body.innerText;
                    }

                    // Clean and truncate
                    content = content
                        .replace(/\s+/g, ' ')
                        .replace(/\n{3,}/g, '\n\n')
                        .trim()
                        .slice(0, 15000);

                    return { title, content };
                }
            });

            return results[0]?.result || { title: '', content: '' };
        } catch (err) {
            console.error('Content extraction failed:', err);
            return { title: '', content: '' };
        }
    };

    // Browse a single URL
    const browseUrl = async (task: BrowsingTask): Promise<BrowsingTask> => {
        setCurrentTask(task.id);
        const startTime = Date.now();

        try {
            // Create new tab
            const tab = await chrome.tabs.create({
                url: task.url,
                active: false
            });

            if (!tab.id) throw new Error('Failed to create tab');

            // Wait for page to load
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Page load timeout'));
                }, 30000);

                const listener = (tabId: number, changeInfo: { status?: string }) => {
                    if (tabId === tab.id && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        clearTimeout(timeout);
                        resolve();
                    }
                };

                chrome.tabs.onUpdated.addListener(listener);
            });

            // Wait a bit more for dynamic content
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Extract content
            const { title, content } = await extractPageContent(tab.id);

            // Close tab
            await chrome.tabs.remove(tab.id);

            return {
                ...task,
                status: 'completed',
                title: title || task.url,
                content,
                startTime,
                endTime: Date.now()
            };
        } catch (err: any) {
            return {
                ...task,
                status: 'failed',
                error: err.message,
                startTime,
                endTime: Date.now()
            };
        }
    };

    // Generate search URLs from query
    const generateSearchUrls = async (): Promise<string[]> => {
        const prompt = `Given this research question, suggest 5-8 specific URLs to visit for comprehensive research. Return JSON:
{
    "urls": [
        "https://example.com/specific-page",
        "https://another-site.com/relevant-article"
    ]
}

Research question: ${query}

Suggest authoritative sources like official documentation, reputable news sites, academic resources, and industry publications. Include specific pages, not just homepages.`;

        try {
            const result = await generateContent(prompt, 'You are a research assistant. Suggest relevant, specific URLs.', { jsonMode: true });
            return result.urls || [];
        } catch {
            return [];
        }
    };

    // Run the browser agent
    const runAgent = async () => {
        let urlsToProcess: string[] = [];

        if (mode === 'search' && query.trim()) {
            setIsRunning(true);
            urlsToProcess = await generateSearchUrls();
        } else {
            urlsToProcess = urls.filter(u => u.trim());
        }

        if (urlsToProcess.length === 0) return;

        setIsRunning(true);

        // Create tasks
        const newTasks: BrowsingTask[] = urlsToProcess.map(url => ({
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            url,
            status: 'pending'
        }));

        setTasks(newTasks);

        // Process tasks sequentially
        const completedTasks: BrowsingTask[] = [];
        for (let i = 0; i < newTasks.length; i++) {
            if (!isRunning) break;

            const task = newTasks[i];
            setTasks(prev => prev.map(t =>
                t.id === task.id ? { ...t, status: 'loading' } : t
            ));

            const result = await browseUrl(task);
            completedTasks.push(result);

            setTasks(prev => prev.map(t =>
                t.id === task.id ? result : t
            ));
        }

        // Synthesize results with AI
        const successfulTasks = completedTasks.filter(t => t.status === 'completed' && t.content);

        if (successfulTasks.length > 0) {
            const contentSummary = successfulTasks.map(t =>
                `## ${t.title}\nURL: ${t.url}\n\nContent:\n${t.content?.slice(0, 3000)}...`
            ).join('\n\n---\n\n');

            const synthesisPrompt = `Analyze and synthesize information from these web pages:

${contentSummary}

${query ? `Research Question: ${query}\n\n` : ''}Provide:
1. A comprehensive synthesis of the information
2. Key insights and findings
3. Any contradictions or varying perspectives
4. Recommendations or conclusions

Format as clear, well-structured analysis.`;

            try {
                const synthesis = await generateContent(
                    synthesisPrompt,
                    'You are an expert research analyst. Synthesize information thoroughly.',
                    { jsonMode: false }
                );

                // Extract insights
                const insightsMatch = typeof synthesis === 'string'
                    ? synthesis.match(/(?:key insights?|findings?|conclusions?):?\s*([\s\S]*?)(?=\n\n|$)/i)
                    : null;

                const result: ResearchResult = {
                    query: query || 'Multi-URL Analysis',
                    tasks: completedTasks,
                    synthesis: typeof synthesis === 'string' ? synthesis : JSON.stringify(synthesis),
                    insights: insightsMatch ? insightsMatch[1].split('\n').filter(l => l.trim()).slice(0, 5) : [],
                    timestamp: Date.now()
                };

                setResults(prev => [result, ...prev]);
            } catch (err) {
                console.error('Synthesis failed:', err);
            }
        }

        setIsRunning(false);
        setCurrentTask(null);
    };

    const stopAgent = () => {
        setIsRunning(false);
    };

    const toggleExpanded = (id: string) => {
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const copyContent = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const exportResults = () => {
        const exportData = results.map(r => ({
            query: r.query,
            timestamp: new Date(r.timestamp).toISOString(),
            pages: r.tasks.map(t => ({
                url: t.url,
                title: t.title,
                status: t.status,
                content: t.content?.slice(0, 5000)
            })),
            synthesis: r.synthesis
        }));

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `browser-research-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getStatusIcon = (status: BrowsingTask['status']) => {
        switch (status) {
            case 'pending': return <Clock size={14} style={{ color: 'hsl(215 20% 50%)' }} />;
            case 'loading': return <Loader2 className="animate-spin" size={14} style={{ color: 'hsl(217 91% 60%)' }} />;
            case 'completed': return <CheckCircle size={14} style={{ color: 'hsl(142 71% 55%)' }} />;
            case 'failed': return <XCircle size={14} style={{ color: 'hsl(0 84% 60%)' }} />;
        }
    };

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
                        background: 'linear-gradient(135deg, hsl(24 95% 50%) 0%, hsl(15 95% 45%) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Bot size={22} style={{ color: 'white' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(210 40% 98%)' }}>
                            Auto Browser Agent
                        </h3>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 55%)', marginTop: '2px' }}>
                            Automated multi-tab research & extraction
                        </p>
                    </div>
                </div>

                {/* Mode Toggle */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <button
                        onClick={() => setMode('urls')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: mode === 'urls' ? 'hsl(24 95% 50%)' : 'hsl(222 47% 16%)',
                            color: mode === 'urls' ? 'white' : 'hsl(215 20% 65%)'
                        }}
                    >
                        <Globe size={14} style={{ marginRight: '6px', display: 'inline' }} />
                        Browse URLs
                    </button>
                    <button
                        onClick={() => setMode('search')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: mode === 'search' ? 'hsl(24 95% 50%)' : 'hsl(222 47% 16%)',
                            color: mode === 'search' ? 'white' : 'hsl(215 20% 65%)'
                        }}
                    >
                        <Search size={14} style={{ marginRight: '6px', display: 'inline' }} />
                        AI Search
                    </button>
                </div>

                {/* URL Inputs */}
                {mode === 'urls' && (
                    <div className="space-y-2" style={{ marginBottom: '12px' }}>
                        {urls.map((url, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => updateUrl(idx, e.target.value)}
                                    placeholder={`https://example.com/page${idx + 1}`}
                                    disabled={isRunning}
                                    style={{
                                        flex: 1,
                                        padding: '10px 12px',
                                        backgroundColor: 'hsl(222 47% 8%)',
                                        border: '1px solid hsl(222 47% 18%)',
                                        borderRadius: '8px',
                                        color: 'hsl(210 40% 98%)',
                                        fontSize: '12px',
                                        outline: 'none'
                                    }}
                                />
                                {urls.length > 1 && (
                                    <button
                                        onClick={() => removeUrl(idx)}
                                        disabled={isRunning}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            backgroundColor: 'hsl(0 84% 60% / 0.2)',
                                            color: 'hsl(0 84% 65%)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {urls.length < 10 && (
                            <button
                                onClick={addUrl}
                                disabled={isRunning}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    border: '1px dashed hsl(222 47% 25%)',
                                    backgroundColor: 'transparent',
                                    color: 'hsl(215 20% 55%)',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Plus size={14} /> Add URL
                            </button>
                        )}
                    </div>
                )}

                {/* Search Query */}
                {mode === 'search' && (
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ position: 'relative' }}>
                            <Sparkles size={14} style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'hsl(24 95% 55%)'
                            }} />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="What would you like to research?"
                                disabled={isRunning}
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 36px',
                                    backgroundColor: 'hsl(222 47% 8%)',
                                    border: '1px solid hsl(222 47% 18%)',
                                    borderRadius: '8px',
                                    color: 'hsl(210 40% 98%)',
                                    fontSize: '13px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <p style={{ fontSize: '10px', color: 'hsl(215 20% 50%)', marginTop: '6px' }}>
                            AI will find and browse relevant pages automatically
                        </p>
                    </div>
                )}

                {/* Research Query (for URL mode) */}
                {mode === 'urls' && (
                    <div style={{ marginBottom: '12px' }}>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Research question (optional)"
                            disabled={isRunning}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                backgroundColor: 'hsl(222 47% 8%)',
                                border: '1px solid hsl(222 47% 18%)',
                                borderRadius: '8px',
                                color: 'hsl(210 40% 98%)',
                                fontSize: '12px',
                                outline: 'none'
                            }}
                        />
                    </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    {!isRunning ? (
                        <button
                            onClick={runAgent}
                            disabled={(mode === 'urls' && urls.every(u => !u.trim())) || (mode === 'search' && !query.trim())}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '10px',
                                border: 'none',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                background: 'linear-gradient(135deg, hsl(24 95% 50%) 0%, hsl(15 95% 45%) 100%)',
                                color: 'white',
                                opacity: ((mode === 'urls' && urls.every(u => !u.trim())) || (mode === 'search' && !query.trim())) ? 0.5 : 1
                            }}
                        >
                            <Play size={16} />
                            Start Browsing
                        </button>
                    ) : (
                        <button
                            onClick={stopAgent}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '10px',
                                border: 'none',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                backgroundColor: 'hsl(0 84% 60%)',
                                color: 'white'
                            }}
                        >
                            <Square size={16} />
                            Stop
                        </button>
                    )}

                    {results.length > 0 && (
                        <button
                            onClick={exportResults}
                            style={{
                                padding: '12px',
                                borderRadius: '10px',
                                border: 'none',
                                cursor: 'pointer',
                                backgroundColor: 'hsl(222 47% 16%)',
                                color: 'hsl(215 20% 65%)'
                            }}
                        >
                            <Download size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Active Tasks */}
            {tasks.length > 0 && (
                <div style={{
                    padding: '12px',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '12px',
                    border: '1px solid hsl(222 47% 18%)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(215 20% 65%)' }}>
                            Browsing Progress
                        </span>
                        <span style={{ fontSize: '11px', color: 'hsl(215 20% 50%)' }}>
                            {tasks.filter(t => t.status === 'completed').length}/{tasks.length} completed
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{
                        height: '6px',
                        backgroundColor: 'hsl(222 47% 18%)',
                        borderRadius: '3px',
                        marginBottom: '12px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${(tasks.filter(t => t.status === 'completed' || t.status === 'failed').length / tasks.length) * 100}%`,
                            background: 'linear-gradient(90deg, hsl(24 95% 50%), hsl(142 71% 45%))',
                            transition: 'width 0.3s'
                        }} />
                    </div>

                    <div className="space-y-2">
                        {tasks.map(task => (
                            <div key={task.id} style={{
                                padding: '10px 12px',
                                backgroundColor: 'hsl(222 47% 8%)',
                                borderRadius: '8px',
                                borderLeft: `3px solid ${
                                    task.status === 'completed' ? 'hsl(142 71% 45%)' :
                                    task.status === 'failed' ? 'hsl(0 84% 60%)' :
                                    task.status === 'loading' ? 'hsl(217 91% 60%)' :
                                    'hsl(215 20% 30%)'
                                }`
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {getStatusIcon(task.status)}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            fontSize: '11px',
                                            color: 'hsl(210 40% 98%)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {task.title || task.url}
                                        </p>
                                        {task.status === 'loading' && (
                                            <p style={{ fontSize: '10px', color: 'hsl(217 91% 60%)' }}>Loading...</p>
                                        )}
                                        {task.error && (
                                            <p style={{ fontSize: '10px', color: 'hsl(0 84% 60%)' }}>{task.error}</p>
                                        )}
                                    </div>
                                    {task.content && (
                                        <button
                                            onClick={() => toggleExpanded(task.id)}
                                            style={{
                                                padding: '4px',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: 'hsl(215 20% 55%)'
                                            }}
                                        >
                                            {expandedTasks.has(task.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                    )}
                                </div>
                                {expandedTasks.has(task.id) && task.content && (
                                    <div style={{
                                        marginTop: '10px',
                                        paddingTop: '10px',
                                        borderTop: '1px solid hsl(222 47% 18%)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '10px', color: 'hsl(215 20% 50%)' }}>
                                                {task.content.length} characters extracted
                                            </span>
                                            <button
                                                onClick={() => copyContent(task.content!, task.id)}
                                                style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    border: 'none',
                                                    fontSize: '10px',
                                                    cursor: 'pointer',
                                                    backgroundColor: 'hsl(222 47% 16%)',
                                                    color: 'hsl(215 20% 65%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                {copied === task.id ? <Check size={10} /> : <Copy size={10} />}
                                                {copied === task.id ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>
                                        <pre style={{
                                            fontSize: '10px',
                                            color: 'hsl(215 20% 70%)',
                                            backgroundColor: 'hsl(222 47% 6%)',
                                            padding: '8px',
                                            borderRadius: '6px',
                                            maxHeight: '150px',
                                            overflowY: 'auto',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word'
                                        }}>
                                            {task.content.slice(0, 2000)}...
                                        </pre>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Results */}
            {results.map((result, idx) => (
                <div key={idx} style={{
                    padding: '16px',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(142 71% 45% / 0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <Sparkles size={16} style={{ color: 'hsl(142 71% 55%)' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(142 71% 65%)' }}>
                            {result.query}
                        </span>
                        <span style={{ fontSize: '10px', color: 'hsl(215 20% 50%)', marginLeft: 'auto' }}>
                            {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                    </div>

                    {/* Pages visited */}
                    <div style={{ marginBottom: '12px' }}>
                        <p style={{ fontSize: '10px', color: 'hsl(215 20% 50%)', marginBottom: '6px' }}>
                            {result.tasks.filter(t => t.status === 'completed').length} pages analyzed
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {result.tasks.filter(t => t.status === 'completed').map((t, i) => (
                                <a
                                    key={i}
                                    href={t.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        padding: '4px 8px',
                                        backgroundColor: 'hsl(222 47% 16%)',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        color: 'hsl(217 91% 65%)',
                                        textDecoration: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <ExternalLink size={10} />
                                    {new URL(t.url).hostname}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Synthesis */}
                    {result.synthesis && (
                        <div style={{
                            padding: '12px',
                            backgroundColor: 'hsl(222 47% 8%)',
                            borderRadius: '10px',
                            maxHeight: '300px',
                            overflowY: 'auto'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '10px', fontWeight: 600, color: 'hsl(142 71% 55%)', textTransform: 'uppercase' }}>
                                    AI Synthesis
                                </span>
                                <button
                                    onClick={() => copyContent(result.synthesis!, `synthesis-${idx}`)}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: 'none',
                                        fontSize: '10px',
                                        cursor: 'pointer',
                                        backgroundColor: 'hsl(222 47% 16%)',
                                        color: 'hsl(215 20% 65%)'
                                    }}
                                >
                                    {copied === `synthesis-${idx}` ? <Check size={10} /> : <Copy size={10} />}
                                </button>
                            </div>
                            <p style={{
                                fontSize: '12px',
                                color: 'hsl(215 20% 80%)',
                                lineHeight: 1.6,
                                whiteSpace: 'pre-wrap'
                            }}>
                                {result.synthesis}
                            </p>
                        </div>
                    )}
                </div>
            ))}

            {/* Empty State */}
            {tasks.length === 0 && results.length === 0 && (
                <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(222 47% 18%)'
                }}>
                    <Bot size={40} style={{ color: 'hsl(215 20% 30%)', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '13px', color: 'hsl(215 20% 55%)', marginBottom: '6px' }}>
                        Ready to browse automatically
                    </p>
                    <p style={{ fontSize: '11px', color: 'hsl(215 20% 45%)' }}>
                        Add URLs or use AI search to start research
                    </p>
                </div>
            )}
        </div>
    );
};

export default AutoBrowserAgent;
