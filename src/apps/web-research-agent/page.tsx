import React, { useState } from 'react';
import {
    Bot, Plus, Trash2, Search, ExternalLink, Loader2, Copy, Check,
    Globe, Sparkles, Link2, ArrowRight, UserCircle, Building2, ChevronDown, ChevronUp
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useUserProfile } from '../../hooks/useUserProfile';

interface ResearchSession {
    id: string;
    query: string;
    urls: string[];
    analysis: string;
    sources: Array<{ uri: string; title?: string }>;
    insights: string[];
    timestamp: number;
}

const WebResearchAgentApp: React.FC = () => {
    const { context } = usePageContext();
    const { analyzeUrls, generateWithSearch, loading } = useGemini();
    const { profile, hasProfile, getProfileContext } = useUserProfile();

    const [urls, setUrls] = useState<string[]>(['']);
    const [query, setQuery] = useState('');
    const [sessions, setSessions] = useState<ResearchSession[]>([]);
    const [status, setStatus] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [includeSearch, setIncludeSearch] = useState(true);
    const [researchMode, setResearchMode] = useState<'compare' | 'synthesize' | 'discover'>('synthesize');
    const [includeProfile, setIncludeProfile] = useState(false);

    // Build profile context for AI
    const buildProfileContext = () => {
        if (!includeProfile || !hasProfile) return '';
        const ctx = getProfileContext();
        return ctx ? `\n\nResearcher Context: ${ctx} Frame insights for this professional background.` : '';
    };

    const addUrl = () => {
        if (urls.length < 20) setUrls([...urls, '']);
    };

    const removeUrl = (index: number) => {
        setUrls(urls.filter((_, i) => i !== index));
    };

    const updateUrl = (index: number, value: string) => {
        const newUrls = [...urls];
        newUrls[index] = value;
        setUrls(newUrls);
    };

    const addCurrentPage = () => {
        if (context?.url && !urls.includes(context.url)) {
            const emptyIndex = urls.findIndex(u => !u.trim());
            if (emptyIndex !== -1) {
                updateUrl(emptyIndex, context.url);
            } else if (urls.length < 20) {
                setUrls([...urls, context.url]);
            }
        }
    };

    const handleResearch = async () => {
        const validUrls = urls.filter(u => u.trim());
        if (validUrls.length === 0 && !query.trim()) return;

        const modeInstructions = {
            compare: `Compare and contrast the content from these sources. Identify key similarities, differences, unique perspectives, and points of agreement/disagreement.`,
            synthesize: `Synthesize information from all sources into a comprehensive analysis. Include main themes, key findings, supporting evidence, and actionable insights.`,
            discover: `Discover new insights and connections. Focus on hidden patterns, unexpected findings, emerging trends, and research gaps.`
        };

        setStatus(`Analyzing ${validUrls.length} URLs...`);

        try {
            let result;
            if (validUrls.length > 0) {
                const profileContext = buildProfileContext();
                const prompt = query.trim()
                    ? `Research Question: ${query}\n\n${modeInstructions[researchMode]}${profileContext}`
                    : `${modeInstructions[researchMode]}${profileContext}`;

                result = await analyzeUrls(validUrls, prompt, {
                    includeSearch,
                    systemInstruction: `You are an expert research agent. Analyze web content thoroughly and provide well-structured, insightful analysis. Always cite specific information from the sources.${includeProfile && hasProfile ? ' Tailor insights to the researcher\'s professional context.' : ''}`
                });
            } else {
                result = await generateWithSearch(query, `You are an expert research agent. Provide comprehensive research.`);
            }

            const insightsMatch = result.text.match(/(?:key insights?|key findings?|main points?):?\s*([\s\S]*?)(?=\n\n|\n#|$)/i);
            const insights: string[] = [];
            if (insightsMatch) {
                insightsMatch[1].split('\n').forEach(line => {
                    const cleaned = line.replace(/^[-•*\d.]+\s*/, '').trim();
                    if (cleaned.length > 10) insights.push(cleaned);
                });
            }

            const session: ResearchSession = {
                id: Date.now().toString(),
                query: query || 'Multi-URL Analysis',
                urls: validUrls,
                analysis: result.text,
                sources: result.sources,
                insights: insights.slice(0, 5),
                timestamp: Date.now()
            };

            setSessions(prev => [session, ...prev]);
            setStatus('');
        } catch (err: any) {
            setStatus(`Research failed: ${err.message}`);
        }
    };

    const handleCopy = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const quickResearch = ['Compare pricing and features', 'Summarize key arguments', 'Find supporting evidence', 'Identify trends'];

    // Empty state
    if (sessions.length === 0 && !loading) {
        return (
            <div className="space-y-6">
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-purple-600/10 text-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Bot size={32} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Web Research Agent</h3>
                    <p className="text-sm text-dim max-w-[240px] mx-auto mb-6">
                        AI-powered multi-URL analysis with agentic web browsing
                    </p>
                </div>

                <div className="space-y-4">
                    {/* URL Inputs */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs uppercase tracking-wider text-dim font-bold">URLs to Analyze</label>
                            {context && (
                                <button onClick={addCurrentPage} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                                    <Plus size={12} /> Current Page
                                </button>
                            )}
                        </div>
                        {urls.map((url, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => updateUrl(idx, e.target.value)}
                                    placeholder={`https://example.com/page${idx + 1}`}
                                    className="flex-1"
                                />
                                {urls.length > 1 && (
                                    <button onClick={() => removeUrl(idx)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {urls.length < 20 && (
                            <button onClick={addUrl} className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                                <Plus size={14} /> Add URL
                            </button>
                        )}
                    </div>

                    {/* Research Mode */}
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-dim font-bold">Research Mode</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['synthesize', 'compare', 'discover'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setResearchMode(mode)}
                                    style={researchMode === mode ? {
                                        background: 'hsl(217 91% 60%)',
                                        borderColor: 'hsl(217 91% 60%)',
                                        color: 'hsl(210 40% 98%)'
                                    } : {
                                        background: 'hsl(222 47% 11%)',
                                        border: '1px solid hsl(222 47% 18% / 0.5)',
                                        color: 'hsl(215 20% 65%)'
                                    }}
                                    className={`p-2.5 text-xs font-medium rounded-xl transition-all ${
                                        researchMode === mode ? 'shadow-lg shadow-purple-600/20' : 'hover:border-slate-600'
                                    }`}
                                >
                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Research Query */}
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-dim font-bold">Research Question</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="What would you like to research?"
                                className="pr-12"
                            />
                            <Sparkles size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-500" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {quickResearch.map((q, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setQuery(q)}
                                    className="px-2.5 py-1 text-[10px] font-medium bg-slate-800/50 text-slate-400 rounded-lg hover:bg-slate-700/50 hover:text-white transition-colors"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search Toggle */}
                    <div className="flex items-center justify-between p-3 glass rounded-xl">
                        <div className="flex items-center gap-2">
                            <Search size={14} className="text-slate-500" />
                            <span className="text-sm text-slate-300">Include Google Search</span>
                        </div>
                        <button
                            onClick={() => setIncludeSearch(!includeSearch)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${includeSearch ? 'bg-purple-600' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${includeSearch ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                    </div>

                    {/* Profile Toggle */}
                    {hasProfile && (
                        <div className="flex items-center justify-between p-3 glass rounded-xl">
                            <div className="flex items-center gap-2">
                                <UserCircle size={14} className="text-purple-400" />
                                <span className="text-sm text-slate-300">Personalize for My Role</span>
                            </div>
                            <button
                                onClick={() => setIncludeProfile(!includeProfile)}
                                className={`relative w-10 h-5 rounded-full transition-colors ${includeProfile ? 'bg-purple-600' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${includeProfile ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleResearch}
                        disabled={loading || (urls.every(u => !u.trim()) && !query.trim())}
                        className="btn-primary w-full flex items-center justify-center gap-2 !bg-purple-600 shadow-purple-600/20"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Bot size={18} />}
                        {loading ? 'Researching...' : 'Start Research'}
                    </button>
                </div>

                {status && (
                    <div className={`p-3 rounded-xl text-sm ${status.includes('failed') ? 'bg-red-500/10 text-red-400' : 'bg-purple-500/10 text-purple-400'}`}>
                        {status}
                    </div>
                )}
            </div>
        );
    }

    // Results view
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-500/10 rounded-xl">
                        <Bot size={18} className="text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-200">Research Agent</h3>
                        <p className="text-[10px] text-slate-500">{sessions.length} session{sessions.length > 1 ? 's' : ''}</p>
                    </div>
                </div>
                <button onClick={() => setSessions([])} className="btn-secondary text-xs py-1.5 px-3">New Research</button>
            </div>

            {sessions.map((session) => (
                <div key={session.id} className="card overflow-hidden">
                    <div className="p-4 border-b border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Sparkles size={14} className="text-purple-400" />
                                <span className="text-sm font-medium text-slate-200">{session.query}</span>
                            </div>
                            <button onClick={() => handleCopy(session.analysis, session.id)} className="text-slate-500 hover:text-white transition-colors">
                                {copiedId === session.id ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                            </button>
                        </div>
                        {session.urls.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {session.urls.map((url, idx) => (
                                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                                       className="flex items-center gap-1 px-2 py-0.5 bg-slate-800/50 rounded-lg text-[10px] text-slate-400 hover:text-white transition-colors">
                                        <Link2 size={10} />
                                        {new URL(url).hostname}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {session.insights.length > 0 && (
                        <div className="p-4 bg-purple-500/5 border-b border-slate-700/50">
                            <p className="text-[10px] uppercase tracking-wider text-purple-400 font-bold mb-2">Key Insights</p>
                            <ul className="space-y-1">
                                {session.insights.map((insight, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                                        <span className="text-purple-400 mt-0.5">•</span>
                                        {insight}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="p-4">
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                            {session.analysis}
                        </p>
                    </div>

                    {session.sources.length > 0 && (
                        <div className="px-4 pb-4">
                            <p className="text-[10px] text-slate-500 mb-2">Sources</p>
                            <div className="flex flex-wrap gap-1">
                                {session.sources.slice(0, 6).map((source, idx) => (
                                    <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer"
                                       className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 rounded-lg text-[10px] text-blue-400 hover:text-blue-300 transition-colors">
                                        <ExternalLink size={10} />
                                        {source.title || new URL(source.uri).hostname}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {status && (
                <div className={`p-3 rounded-xl text-sm ${status.includes('failed') ? 'bg-red-500/10 text-red-400' : 'bg-purple-500/10 text-purple-400'}`}>
                    {status}
                </div>
            )}
        </div>
    );
};

export default WebResearchAgentApp;
