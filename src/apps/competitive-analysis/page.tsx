import React, { useState } from 'react';
import {
    Target, Plus, Trash2, ExternalLink, Loader2, Copy, Check,
    BarChart2, Globe, Sparkles, Building2, TrendingUp, UserCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useUserProfile } from '../../hooks/useUserProfile';

interface Competitor {
    url: string;
    name?: string;
}

interface AnalysisReport {
    id: string;
    yourBusiness: Competitor;
    competitors: Competitor[];
    analysis: string;
    sources: Array<{ uri: string; title?: string }>;
    timestamp: number;
}

const CompetitiveAnalysisApp: React.FC = () => {
    const { context } = usePageContext();
    const { analyzeUrls, loading } = useGemini();
    const { profile, hasProfile, getProfileContext } = useUserProfile();

    const [yourBusiness, setYourBusiness] = useState<Competitor>({ url: '', name: '' });
    const [competitors, setCompetitors] = useState<Competitor[]>([{ url: '', name: '' }]);
    const [analysisType, setAnalysisType] = useState<'full' | 'pricing' | 'features' | 'messaging'>('full');
    const [reports, setReports] = useState<AnalysisReport[]>([]);
    const [status, setStatus] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [includeProfile, setIncludeProfile] = useState(false);

    // Build profile context for AI
    const buildProfileContext = () => {
        if (!includeProfile || !hasProfile) return '';
        const ctx = getProfileContext();
        return ctx ? `\n\nAnalyst Context: ${ctx} Frame competitive insights from this business perspective.` : '';
    };

    const addCompetitor = () => {
        if (competitors.length < 10) setCompetitors([...competitors, { url: '', name: '' }]);
    };

    const removeCompetitor = (index: number) => {
        setCompetitors(competitors.filter((_, i) => i !== index));
    };

    const updateCompetitor = (index: number, field: 'url' | 'name', value: string) => {
        const updated = [...competitors];
        updated[index] = { ...updated[index], [field]: value };
        setCompetitors(updated);
    };

    const addCurrentPageAs = (type: 'yours' | 'competitor') => {
        if (!context?.url) return;
        if (type === 'yours') {
            setYourBusiness({ url: context.url, name: context.title?.split(' - ')[0] || '' });
        } else {
            const emptyIndex = competitors.findIndex(c => !c.url.trim());
            if (emptyIndex !== -1) {
                updateCompetitor(emptyIndex, 'url', context.url);
                updateCompetitor(emptyIndex, 'name', context.title?.split(' - ')[0] || '');
            } else if (competitors.length < 10) {
                setCompetitors([...competitors, { url: context.url, name: context.title?.split(' - ')[0] || '' }]);
            }
        }
    };

    const handleAnalysis = async () => {
        const validCompetitors = competitors.filter(c => c.url.trim());
        if (!yourBusiness.url.trim() || validCompetitors.length === 0) {
            setStatus('Add your business URL and at least one competitor');
            return;
        }

        const allUrls = [yourBusiness.url, ...validCompetitors.map(c => c.url)];

        const analysisPrompts = {
            full: `Perform a comprehensive competitive analysis. For each business, analyze: Value Proposition, Target Audience, Key Features, Pricing, Strengths, Weaknesses, and Differentiators. Then provide Market Position Analysis, Opportunities, Threats, and Strategic Recommendations.`,
            pricing: `Analyze pricing strategies: models, price points, tiers, value proposition, hidden costs, and promotions. Compare positioning and provide pricing strategy recommendations.`,
            features: `Create a feature comparison matrix: core features, unique features, gaps, advantages, and innovation opportunities. Provide feature development recommendations.`,
            messaging: `Analyze marketing messaging and positioning: brand voice, key themes, target audience messaging, CTAs, and trust signals. Provide messaging differentiation opportunities.`
        };

        setStatus(`Analyzing ${allUrls.length} websites...`);

        try {
            const profileContext = buildProfileContext();
            const result = await analyzeUrls(allUrls, analysisPrompts[analysisType] + profileContext, {
                includeSearch: true,
                systemInstruction: `You are an expert competitive intelligence analyst. Provide specific, actionable insights. The first URL is the client's business - frame analysis from their perspective.${includeProfile && hasProfile ? ' Consider the analyst\'s industry and role when providing recommendations.' : ''}`
            });

            const report: AnalysisReport = {
                id: Date.now().toString(),
                yourBusiness,
                competitors: validCompetitors,
                analysis: result.text,
                sources: result.sources,
                timestamp: Date.now()
            };

            setReports(prev => [report, ...prev]);
            setStatus('');
        } catch (err: any) {
            setStatus(`Analysis failed: ${err.message}`);
        }
    };

    const handleCopy = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const analysisTypes = [
        { id: 'full', label: 'Full Analysis', icon: BarChart2 },
        { id: 'pricing', label: 'Pricing', icon: TrendingUp },
        { id: 'features', label: 'Features', icon: Sparkles },
        { id: 'messaging', label: 'Messaging', icon: Globe }
    ];

    // Empty state
    if (reports.length === 0 && !loading) {
        return (
            <div className="space-y-8">
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-orange-600/10 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Target size={32} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Competitive Analysis</h3>
                    <p className="text-sm text-slate-500 max-w-[240px] mx-auto mb-6">
                        AI-powered competitor research with live website analysis
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Your Business */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs uppercase tracking-wider text-dim font-bold flex items-center gap-2">
                                <Building2 size={12} className="text-orange-400" /> Your Business
                            </label>
                            {context && !yourBusiness.url && (
                                <button onClick={() => addCurrentPageAs('yours')} className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
                                    <Plus size={12} /> Current Page
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={yourBusiness.name}
                                onChange={(e) => setYourBusiness({ ...yourBusiness, name: e.target.value })}
                                placeholder="Business Name"
                                style={{
                                    background: 'hsl(222 47% 11%)',
                                    color: 'hsl(210 40% 98%)',
                                    border: '1px solid hsl(222 47% 18% / 0.5)',
                                }}
                                className="w-1/3 px-3 py-2 rounded-xl focus:border-orange-500 focus:outline-none placeholder:text-slate-500"
                            />
                            <input
                                type="url"
                                value={yourBusiness.url}
                                onChange={(e) => setYourBusiness({ ...yourBusiness, url: e.target.value })}
                                placeholder="https://yourbusiness.com"
                                style={{
                                    background: 'hsl(222 47% 11%)',
                                    color: 'hsl(210 40% 98%)',
                                    border: '1px solid hsl(222 47% 18% / 0.5)',
                                }}
                                className="flex-1 px-3 py-2 rounded-xl focus:border-orange-500 focus:outline-none placeholder:text-slate-500"
                            />
                        </div>
                    </div>

                    {/* Competitors */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs uppercase tracking-wider text-dim font-bold flex items-center gap-2">
                                <Target size={12} className="text-red-400" /> Competitors
                            </label>
                            {context && (
                                <button onClick={() => addCurrentPageAs('competitor')} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                                    <Plus size={12} /> Current Page
                                </button>
                            )}
                        </div>
                        {competitors.map((comp, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input
                                    type="text"
                                    value={comp.name}
                                    onChange={(e) => updateCompetitor(idx, 'name', e.target.value)}
                                    placeholder="Competitor Name"
                                    style={{
                                        background: 'hsl(222 47% 11%)',
                                        color: 'hsl(210 40% 98%)',
                                        border: '1px solid hsl(222 47% 18% / 0.5)',
                                    }}
                                    className="w-1/3 px-3 py-2 rounded-xl focus:border-orange-500 focus:outline-none placeholder:text-slate-500"
                                />
                                <input
                                    type="url"
                                    value={comp.url}
                                    onChange={(e) => updateCompetitor(idx, 'url', e.target.value)}
                                    placeholder="https://competitor.com"
                                    style={{
                                        background: 'hsl(222 47% 11%)',
                                        color: 'hsl(210 40% 98%)',
                                        border: '1px solid hsl(222 47% 18% / 0.5)',
                                    }}
                                    className="flex-1 px-3 py-2 rounded-xl focus:border-orange-500 focus:outline-none placeholder:text-slate-500"
                                />
                                {competitors.length > 1 && (
                                    <button onClick={() => removeCompetitor(idx)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {competitors.length < 10 && (
                            <button onClick={addCompetitor} className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                                <Plus size={14} /> Add Competitor
                            </button>
                        )}
                    </div>

                    {/* Analysis Type */}
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-dim font-bold">Analysis Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {analysisTypes.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setAnalysisType(id as typeof analysisType)}
                                    style={analysisType === id ? {
                                        background: 'hsl(217 91% 60%)',
                                        borderColor: 'hsl(217 91% 60%)',
                                        color: 'hsl(210 40% 98%)',
                                    } : {
                                        background: 'hsl(222 47% 11%)',
                                        borderColor: 'hsl(222 47% 18% / 0.5)',
                                        color: 'hsl(215 20% 65%)',
                                    }}
                                    className={`flex items-center gap-2 p-2.5 text-xs font-medium rounded-xl border transition-all ${
                                        analysisType === id ? 'shadow-lg' : 'hover:bg-opacity-80'
                                    }`}
                                >
                                    <Icon size={14} />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Profile Toggle */}
                    {hasProfile && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            backgroundColor: 'hsl(222 47% 11%)',
                            borderRadius: '14px',
                            border: '1px solid hsl(222 47% 18%)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <UserCircle size={14} style={{ color: 'hsl(24 95% 55%)' }} />
                                <span style={{ fontSize: '13px', color: 'hsl(210 40% 98%)' }}>Include My Business Context</span>
                            </div>
                            <button
                                onClick={() => setIncludeProfile(!includeProfile)}
                                style={{
                                    position: 'relative',
                                    width: '40px',
                                    height: '22px',
                                    borderRadius: '11px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                    backgroundColor: includeProfile ? 'hsl(24 95% 55%)' : 'hsl(222 47% 20%)'
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    top: '2px',
                                    left: includeProfile ? '20px' : '2px',
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '9px',
                                    backgroundColor: 'white',
                                    transition: 'left 0.2s'
                                }} />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleAnalysis}
                        disabled={loading || !yourBusiness.url.trim() || competitors.every(c => !c.url.trim())}
                        className="btn-primary w-full flex items-center justify-center gap-2 !bg-orange-600 shadow-orange-600/20"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Target size={18} />}
                        {loading ? 'Analyzing...' : 'Run Competitive Analysis'}
                    </button>
                </div>

                {status && (
                    <div className={`p-3 rounded-xl text-sm ${status.includes('failed') || status.includes('Add') ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'}`}>
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
                    <div className="p-2 bg-orange-500/10 rounded-xl">
                        <Target size={18} className="text-orange-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-200">Competitive Analysis</h3>
                        <p className="text-[10px] text-slate-500">{reports.length} report{reports.length > 1 ? 's' : ''}</p>
                    </div>
                </div>
                <button onClick={() => setReports([])} className="btn-secondary text-xs py-1.5 px-3">New Analysis</button>
            </div>

            {reports.map((report) => (
                <div key={report.id} className="card overflow-hidden">
                    <div className="p-4 border-b border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <BarChart2 size={14} className="text-orange-400" />
                                <span className="text-sm font-medium text-slate-200">
                                    {report.yourBusiness.name || 'Your Business'} vs {report.competitors.length} Competitor{report.competitors.length > 1 ? 's' : ''}
                                </span>
                            </div>
                            <button onClick={() => handleCopy(report.analysis, report.id)} className="text-slate-500 hover:text-white transition-colors">
                                {copiedId === report.id ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 rounded-lg text-[10px] text-orange-300">
                                <Building2 size={10} />
                                {report.yourBusiness.name || new URL(report.yourBusiness.url).hostname}
                            </span>
                            {report.competitors.map((comp, idx) => (
                                <span key={idx} className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 rounded-lg text-[10px] text-red-300">
                                    <Target size={10} />
                                    {comp.name || new URL(comp.url).hostname}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="p-4">
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                            {report.analysis}
                        </p>
                    </div>

                    {report.sources.length > 0 && (
                        <div className="px-4 pb-4">
                            <p className="text-[10px] text-slate-500 mb-2">Sources</p>
                            <div className="flex flex-wrap gap-1">
                                {report.sources.slice(0, 6).map((source, idx) => (
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
                <div className={`p-3 rounded-xl text-sm ${status.includes('failed') ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'}`}>
                    {status}
                </div>
            )}
        </div>
    );
};

export default CompetitiveAnalysisApp;
