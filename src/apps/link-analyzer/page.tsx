import React, { useState, useEffect } from 'react';
import {
    Link2, ExternalLink, Loader2, Copy, Check, Globe,
    ArrowRight, Filter, ScanLine, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';

interface ExtractedLink {
    url: string;
    text: string;
    type: 'internal' | 'external';
    domain: string;
    selected: boolean;
}

interface LinkAnalysis {
    id: string;
    sourceUrl: string;
    analyzedLinks: string[];
    summary: string;
    insights: {
        mainTopics: string[];
        keyFindings: string[];
        recommendations: string[];
    };
    sources: Array<{ uri: string; title?: string }>;
    timestamp: number;
}

const LinkAnalyzerApp: React.FC = () => {
    const { context } = usePageContext();
    const { analyzeUrls, loading } = useGemini();

    const [links, setLinks] = useState<ExtractedLink[]>([]);
    const [analyses, setAnalyses] = useState<LinkAnalysis[]>([]);
    const [status, setStatus] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'internal' | 'external'>('all');
    const [analysisDepth, setAnalysisDepth] = useState<'quick' | 'deep' | 'comprehensive'>('deep');
    const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);
    const [extracting, setExtracting] = useState(false);

    const extractLinks = async () => {
        if (!context?.content) {
            setStatus('No page content available. Navigate to a page first.');
            return;
        }

        setExtracting(true);
        setStatus('Extracting links...');

        try {
            const urlRegex = /https?:\/\/[^\s<>"')\]]+/g;
            const foundUrls = context.content.match(urlRegex) || [];
            const baseDomain = context.url ? new URL(context.url).hostname : '';

            const uniqueLinks = new Map<string, ExtractedLink>();

            foundUrls.forEach(url => {
                try {
                    let cleanUrl = url.replace(/[.,;:!?]+$/, '');
                    const urlObj = new URL(cleanUrl);

                    if (/\.(css|js|png|jpg|gif|svg|woff)/.test(urlObj.pathname)) return;

                    const domain = urlObj.hostname;
                    const isInternal = domain === baseDomain || domain.endsWith(`.${baseDomain}`);

                    if (!uniqueLinks.has(cleanUrl)) {
                        uniqueLinks.set(cleanUrl, {
                            url: cleanUrl,
                            text: urlObj.pathname.split('/').pop() || domain,
                            type: isInternal ? 'internal' : 'external',
                            domain,
                            selected: false
                        });
                    }
                } catch (e) { /* invalid URL */ }
            });

            const linkArray = Array.from(uniqueLinks.values());
            setLinks(linkArray);
            setStatus(`Found ${linkArray.length} links`);
        } catch (err: any) {
            setStatus(`Failed: ${err.message}`);
        } finally {
            setExtracting(false);
        }
    };

    useEffect(() => {
        if (context?.content && links.length === 0) extractLinks();
    }, [context?.url]);

    const toggleLink = (url: string) => {
        setLinks(links.map(l => l.url === url ? { ...l, selected: !l.selected } : l));
    };

    const selectAll = () => {
        const filtered = filteredLinks;
        const allSelected = filtered.every(l => l.selected);
        setLinks(links.map(l => filtered.includes(l) ? { ...l, selected: !allSelected } : l));
    };

    const filteredLinks = links.filter(l => filter === 'all' || l.type === filter);
    const selectedLinks = links.filter(l => l.selected);

    const handleAnalyze = async () => {
        if (selectedLinks.length === 0) {
            setStatus('Select at least one link');
            return;
        }
        if (selectedLinks.length > 20) {
            setStatus('Maximum 20 links at once');
            return;
        }

        const depthPrompts = {
            quick: `Quickly summarize each linked page: one-sentence summary and main topic. Then give overall synthesis.`,
            deep: `Analyze each linked page in detail: title, key points, relevance, credibility. Then provide common themes, key insights, connections, and recommendations.`,
            comprehensive: `Comprehensive deep-dive: full summary, key facts, credibility evaluation, unique information. Then complete topic mapping, evidence chains, contradictions, gap analysis, and expert recommendations.`
        };

        setStatus(`Analyzing ${selectedLinks.length} links...`);

        try {
            const urls = selectedLinks.map(l => l.url);

            const result = await analyzeUrls(urls, depthPrompts[analysisDepth], {
                includeSearch: true,
                systemInstruction: `You are an expert content analyst. Actually fetch and read each link's content - don't guess from URLs. Provide specific, actionable insights.`
            });

            const mainTopicsMatch = result.text.match(/(?:themes?|topics?):?\s*([\s\S]*?)(?=\n\n|\n#|key|$)/i);
            const findingsMatch = result.text.match(/(?:findings?|insights?|key points?):?\s*([\s\S]*?)(?=\n\n|\n#|recommendations?|$)/i);
            const recommendationsMatch = result.text.match(/(?:recommendations?|actions?|next steps?):?\s*([\s\S]*?)(?=\n\n|\n#|$)/i);

            const extractBullets = (text: string | undefined): string[] => {
                if (!text) return [];
                return text.split('\n').map(line => line.replace(/^[-•*\d.]+\s*/, '').trim()).filter(line => line.length > 10).slice(0, 5);
            };

            const analysis: LinkAnalysis = {
                id: Date.now().toString(),
                sourceUrl: context?.url || '',
                analyzedLinks: urls,
                summary: result.text,
                insights: {
                    mainTopics: extractBullets(mainTopicsMatch?.[1]),
                    keyFindings: extractBullets(findingsMatch?.[1]),
                    recommendations: extractBullets(recommendationsMatch?.[1])
                },
                sources: result.sources,
                timestamp: Date.now()
            };

            setAnalyses(prev => [analysis, ...prev]);
            setStatus('');
            setLinks(links.map(l => ({ ...l, selected: false })));
        } catch (err: any) {
            setStatus(`Analysis failed: ${err.message}`);
        }
    };

    const handleCopy = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center py-4">
                <div className="w-14 h-14 bg-cyan-600/10 text-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <Link2 size={28} />
                </div>
                <h3 className="text-lg font-bold mb-1">Link Analyzer</h3>
                <p className="text-xs text-slate-500">Deep-dive into linked pages</p>
            </div>

            {/* Current Page */}
            {context && (
                <div className="card p-3">
                    <div className="flex items-start gap-2">
                        <Globe size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">{context.title}</p>
                            <p className="text-[10px] text-slate-500 truncate">{context.url}</p>
                        </div>
                        <button
                            onClick={extractLinks}
                            disabled={extracting}
                            className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
                        >
                            {extracting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                            {extracting ? 'Extracting...' : 'Re-extract'}
                        </button>
                    </div>
                </div>
            )}

            {/* Filter & Selection */}
            {links.length > 0 && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <Filter size={12} className="text-slate-500" />
                        {(['all', 'external', 'internal'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                style={filter === f ? {
                                    background: 'hsl(217 91% 60%)',
                                    color: 'hsl(210 40% 98%)',
                                } : {
                                    background: 'hsl(222 47% 11%)',
                                    color: 'hsl(215 20% 65%)',
                                }}
                                className="px-2 py-1 text-[10px] font-medium rounded-lg transition-colors"
                            >
                                {f === 'all' ? `All (${links.length})` : f === 'external' ? `Ext (${links.filter(l => l.type === 'external').length})` : `Int (${links.filter(l => l.type === 'internal').length})`}
                            </button>
                        ))}
                    </div>
                    <button onClick={selectAll} className="text-[10px] text-slate-400 hover:text-white">
                        {filteredLinks.every(l => l.selected) ? 'Deselect All' : 'Select All'}
                    </button>
                </div>
            )}

            {/* Link List */}
            {links.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                    {filteredLinks.map((link) => (
                        <button
                            key={link.url}
                            onClick={() => toggleLink(link.url)}
                            className={`w-full flex items-center gap-2 p-2 rounded-xl text-left transition-all ${
                                link.selected ? 'glass border-cyan-500/30' : 'card hover:border-slate-600/50'
                            }`}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                link.selected ? 'bg-cyan-600 border-cyan-500' : 'border-slate-600'
                            }`}>
                                {link.selected && <Check size={10} className="text-white" />}
                            </div>
                            <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded ${
                                link.type === 'external' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                                {link.type === 'external' ? 'EXT' : 'INT'}
                            </span>
                            <span className="flex-1 text-xs text-slate-300 truncate">{link.domain}</span>
                            <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-slate-500 hover:text-cyan-400">
                                <ExternalLink size={12} />
                            </a>
                        </button>
                    ))}
                </div>
            )}

            {/* Analysis Depth */}
            <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-dim font-bold">Analysis Depth</label>
                <div className="grid grid-cols-3 gap-2">
                    {(['quick', 'deep', 'comprehensive'] as const).map((depth) => (
                        <button
                            key={depth}
                            onClick={() => setAnalysisDepth(depth)}
                            style={analysisDepth === depth ? {
                                background: 'hsl(217 91% 60%)',
                                borderColor: 'hsl(217 91% 60%)',
                                color: 'hsl(210 40% 98%)',
                            } : {
                                background: 'hsl(222 47% 11%)',
                                borderColor: 'hsl(222 47% 18% / 0.5)',
                                color: 'hsl(215 20% 65%)',
                            }}
                            className={`p-2 text-xs font-medium rounded-xl border transition-all ${
                                analysisDepth === depth ? 'shadow-lg' : ''
                            }`}
                        >
                            {depth.charAt(0).toUpperCase() + depth.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Analyze Button */}
            {selectedLinks.length > 0 && (
                <p className="text-xs text-cyan-400">
                    {selectedLinks.length} link{selectedLinks.length > 1 ? 's' : ''} selected
                    {selectedLinks.length > 20 && <span className="text-orange-400 ml-2">(max 20)</span>}
                </p>
            )}

            <button
                onClick={handleAnalyze}
                disabled={loading || selectedLinks.length === 0 || selectedLinks.length > 20}
                className="btn-primary w-full flex items-center justify-center gap-2 !bg-cyan-600 shadow-cyan-600/20"
            >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <ScanLine size={18} />}
                {loading ? 'Analyzing...' : 'Analyze Links'}
            </button>

            {status && (
                <div className={`p-3 rounded-xl text-sm ${
                    status.includes('failed') || status.includes('Select') || status.includes('Maximum')
                        ? 'bg-red-500/10 text-red-400' : 'bg-cyan-500/10 text-cyan-400'
                }`}>
                    {status}
                </div>
            )}

            {/* Results */}
            {analyses.map((analysis) => (
                <div key={analysis.id} className="card overflow-hidden">
                    <div className="p-4 border-b border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Link2 size={14} className="text-cyan-400" />
                                <span className="text-sm font-medium text-slate-200">
                                    {analysis.analyzedLinks.length} Links Analyzed
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => handleCopy(analysis.summary, analysis.id)} className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-500 hover:text-white">
                                    {copiedId === analysis.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                </button>
                                <button onClick={() => setExpandedAnalysis(expandedAnalysis === analysis.id ? null : analysis.id)} className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-500 hover:text-white">
                                    {expandedAnalysis === analysis.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {analysis.analyzedLinks.slice(0, 5).map((url, idx) => (
                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                                   className="flex items-center gap-1 px-2 py-0.5 bg-slate-800/50 rounded-lg text-[10px] text-slate-400 hover:text-white transition-colors">
                                    <Link2 size={8} />
                                    {new URL(url).hostname}
                                </a>
                            ))}
                            {analysis.analyzedLinks.length > 5 && (
                                <span className="px-2 py-0.5 text-[10px] text-slate-500">+{analysis.analyzedLinks.length - 5} more</span>
                            )}
                        </div>
                    </div>

                    {(analysis.insights.mainTopics.length > 0 || analysis.insights.keyFindings.length > 0) && (
                        <div className="p-4 bg-cyan-500/5 border-b border-slate-700/50">
                            {analysis.insights.mainTopics.length > 0 && (
                                <div className="mb-3">
                                    <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold mb-1">Topics</p>
                                    <div className="flex flex-wrap gap-1">
                                        {analysis.insights.mainTopics.map((topic, idx) => (
                                            <span key={idx} className="px-2 py-0.5 bg-cyan-600/20 rounded-lg text-[10px] text-cyan-300">{topic}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {analysis.insights.keyFindings.length > 0 && (
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold mb-1">Key Findings</p>
                                    <ul className="space-y-1">
                                        {analysis.insights.keyFindings.map((finding, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                                                <span className="text-cyan-400 mt-0.5">•</span>
                                                {finding}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {expandedAnalysis === analysis.id && (
                        <div className="p-4">
                            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                                {analysis.summary}
                            </p>
                        </div>
                    )}

                    {analysis.insights.recommendations.length > 0 && (
                        <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-700/50">
                            <p className="text-[10px] text-slate-500 mb-2">Recommendations</p>
                            <ul className="space-y-1">
                                {analysis.insights.recommendations.map((rec, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-400">
                                        <ArrowRight size={10} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ))}

            {/* Empty State */}
            {links.length === 0 && !extracting && (
                <div className="text-center py-8">
                    <Link2 size={32} className="mx-auto text-slate-600 mb-3" />
                    <p className="text-sm text-slate-400">No links extracted</p>
                    <p className="text-xs text-slate-500 mt-1">
                        {context ? 'Click "Re-extract" to find links' : 'Navigate to a page first'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default LinkAnalyzerApp;
