import React, { useState, useEffect } from 'react';
import {
    MessageSquare,
    Upload,
    Loader2,
    Copy,
    Check,
    AlertCircle,
    Sparkles,
    Plus,
    Trash2,
    Star,
    ThumbsUp,
    Quote,
    ExternalLink,
    Filter,
    Download,
    ChevronDown,
    ChevronUp,
    Users,
    Building2,
    Award
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';
import { useIntegrations } from '../../hooks/useIntegrations';
import SendToIntegrations from '../../components/SendToIntegrations';

interface SocialProof {
    id: string;
    type: 'testimonial' | 'review' | 'case-study' | 'stat' | 'logo' | 'award';
    source: string;
    sourceUrl: string;
    capturedAt: number;
    content: {
        quote?: string;
        author?: string;
        role?: string;
        company?: string;
        companyLogo?: string;
        rating?: number;
        metric?: string;
        metricValue?: string;
        awardName?: string;
    };
    sentiment: 'positive' | 'neutral' | 'mixed';
    themes: string[];
    useCases: string[];
}

const STORAGE_KEY = 'social_proof_data';

const SocialProofHarvesterApp: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading: aiLoading } = useGemini();
    const { success, warning, info } = useToast();
    const { integrations } = useIntegrations();

    const [proofs, setProofs] = useState<SocialProof[]>([]);
    const [processing, setProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [expandedProof, setExpandedProof] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string>('all');

    // Load saved data
    useEffect(() => {
        chrome.storage.local.get(STORAGE_KEY, (data) => {
            const savedProofs = data[STORAGE_KEY] as SocialProof[] | undefined;
            if (savedProofs && Array.isArray(savedProofs)) {
                setProofs(savedProofs);
            }
        });
    }, []);

    // Save data
    const saveProofs = (updated: SocialProof[]) => {
        setProofs(updated);
        chrome.storage.local.set({ [STORAGE_KEY]: updated });
    };

    const extractSocialProof = async () => {
        if (!context?.content) {
            warning('No page content available');
            return;
        }

        setProcessing(true);

        try {
            const result = await generateContent(
                `Extract social proof elements from this page:

${context.content.substring(0, 12000)}

URL: ${context.url}
Title: ${context.title}

Find and extract ALL of these:
1. Testimonials (customer quotes)
2. Reviews (with ratings)
3. Case studies (results, metrics)
4. Statistics (usage numbers, growth)
5. Company logos (notable clients)
6. Awards and certifications

For each item found, extract:
- Type (testimonial, review, case-study, stat, logo, award)
- The quote/content
- Author name and role
- Company name
- Rating (1-5 if applicable)
- Key metrics mentioned
- Sentiment (positive/neutral/mixed)
- Main themes (e.g., "ease of use", "ROI", "support")
- Suggested use cases for this proof

Return as JSON array:
[
  {
    "type": "testimonial",
    "content": {
      "quote": "This product changed our workflow...",
      "author": "Jane Smith",
      "role": "VP of Engineering",
      "company": "TechCorp",
      "rating": 5
    },
    "sentiment": "positive",
    "themes": ["productivity", "ease of use"],
    "useCases": ["landing page hero", "sales deck"]
  },
  {
    "type": "stat",
    "content": {
      "metric": "Time saved",
      "metricValue": "40%"
    },
    "sentiment": "positive",
    "themes": ["efficiency"],
    "useCases": ["comparison page", "case study"]
  }
]`,
                `You are a marketing specialist focused on extracting and categorizing social proof.
Find every testimonial, review, statistic, and endorsement on the page.
Be thorough - extract ALL social proof elements.`,
                { jsonMode: true }
            );

            if (Array.isArray(result) && result.length > 0) {
                const newProofs: SocialProof[] = result.map((item, idx) => ({
                    id: `proof-${Date.now()}-${idx}`,
                    type: item.type || 'testimonial',
                    source: context.title || 'Unknown',
                    sourceUrl: context.url || '',
                    capturedAt: Date.now(),
                    content: item.content || {},
                    sentiment: item.sentiment || 'positive',
                    themes: item.themes || [],
                    useCases: item.useCases || []
                }));

                const updated = [...newProofs, ...proofs];
                saveProofs(updated);
                success(`Extracted ${newProofs.length} social proof items`);
            } else {
                info('No social proof found on this page');
            }
        } catch (err) {
            console.error('Extraction error:', err);
            warning('Failed to extract social proof');
        } finally {
            setProcessing(false);
        }
    };

    const removeProof = (id: string) => {
        const updated = proofs.filter(p => p.id !== id);
        saveProofs(updated);
        success('Item removed');
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

    const exportCollection = () => {
        let md = `# Social Proof Collection\n\n`;
        md += `Generated: ${new Date().toLocaleDateString()}\n`;
        md += `Total items: ${proofs.length}\n\n`;

        // Group by type
        const grouped = proofs.reduce((acc, proof) => {
            if (!acc[proof.type]) acc[proof.type] = [];
            acc[proof.type].push(proof);
            return acc;
        }, {} as Record<string, SocialProof[]>);

        Object.entries(grouped).forEach(([type, items]) => {
            md += `## ${type.charAt(0).toUpperCase() + type.slice(1)}s (${items.length})\n\n`;

            items.forEach((proof, idx) => {
                if (proof.type === 'testimonial' || proof.type === 'review') {
                    md += `### ${idx + 1}. ${proof.content.author || 'Anonymous'}\n`;
                    if (proof.content.role) md += `*${proof.content.role}${proof.content.company ? ` at ${proof.content.company}` : ''}*\n\n`;
                    md += `> "${proof.content.quote}"\n\n`;
                    if (proof.content.rating) md += `Rating: ${'⭐'.repeat(proof.content.rating)}\n\n`;
                } else if (proof.type === 'stat') {
                    md += `- **${proof.content.metric}:** ${proof.content.metricValue}\n`;
                } else if (proof.type === 'award') {
                    md += `- 🏆 ${proof.content.awardName}\n`;
                }
                md += `Themes: ${proof.themes.join(', ')}\n\n`;
            });
        });

        copyToClipboard(md);
        info('Collection exported');
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'testimonial': return <Quote size={14} />;
            case 'review': return <Star size={14} />;
            case 'case-study': return <Building2 size={14} />;
            case 'stat': return <ThumbsUp size={14} />;
            case 'logo': return <Users size={14} />;
            case 'award': return <Award size={14} />;
            default: return <MessageSquare size={14} />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'testimonial': return 'bg-blue-500/20 text-blue-400';
            case 'review': return 'bg-yellow-500/20 text-yellow-400';
            case 'case-study': return 'bg-purple-500/20 text-purple-400';
            case 'stat': return 'bg-green-500/20 text-green-400';
            case 'logo': return 'bg-slate-500/20 text-slate-400';
            case 'award': return 'bg-orange-500/20 text-orange-400';
            default: return 'bg-slate-500/20 text-slate-400';
        }
    };

    const filteredProofs = proofs.filter(p =>
        filterType === 'all' || p.type === filterType
    );

    const types = [...new Set(proofs.map(p => p.type))];
    const stats = {
        testimonials: proofs.filter(p => p.type === 'testimonial').length,
        reviews: proofs.filter(p => p.type === 'review').length,
        stats: proofs.filter(p => p.type === 'stat').length,
        other: proofs.filter(p => !['testimonial', 'review', 'stat'].includes(p.type)).length
    };

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex gap-2">
                <button
                    onClick={extractSocialProof}
                    disabled={processing}
                    className="btn-primary flex items-center gap-2 flex-1"
                >
                    {processing ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Harvesting...
                        </>
                    ) : (
                        <>
                            <Plus size={16} />
                            Harvest from Page
                        </>
                    )}
                </button>
                {proofs.length > 0 && (
                    <button
                        onClick={exportCollection}
                        className="btn-secondary p-3"
                        title="Export collection"
                    >
                        <Download size={16} />
                    </button>
                )}
            </div>

            {/* Stats Summary */}
            {proofs.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-center">
                        <p className="text-lg font-bold text-blue-400">{stats.testimonials}</p>
                        <p className="text-[10px] text-blue-300/60">Testimonials</p>
                    </div>
                    <div className="p-2 rounded-lg bg-yellow-500/10 text-center">
                        <p className="text-lg font-bold text-yellow-400">{stats.reviews}</p>
                        <p className="text-[10px] text-yellow-300/60">Reviews</p>
                    </div>
                    <div className="p-2 rounded-lg bg-green-500/10 text-center">
                        <p className="text-lg font-bold text-green-400">{stats.stats}</p>
                        <p className="text-[10px] text-green-300/60">Stats</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-500/10 text-center">
                        <p className="text-lg font-bold text-slate-400">{stats.other}</p>
                        <p className="text-[10px] text-slate-300/60">Other</p>
                    </div>
                </div>
            )}

            {/* Filter */}
            {types.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                            filterType === 'all'
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-700/50 text-slate-400'
                        }`}
                    >
                        All ({proofs.length})
                    </button>
                    {types.map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                                filterType === type
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-slate-700/50 text-slate-400'
                            }`}
                        >
                            {getTypeIcon(type)}
                            {type}
                        </button>
                    ))}
                </div>
            )}

            {/* Proofs List */}
            {filteredProofs.length > 0 && (
                <div className="space-y-3">
                    {filteredProofs.map((proof) => (
                        <div
                            key={proof.id}
                            className="rounded-xl bg-slate-800/30 border border-slate-700/30 overflow-hidden"
                        >
                            <button
                                onClick={() => setExpandedProof(
                                    expandedProof === proof.id ? null : proof.id
                                )}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`p-2 rounded-lg ${getTypeColor(proof.type)}`}>
                                        {getTypeIcon(proof.type)}
                                    </span>
                                    <div className="text-left">
                                        {proof.type === 'testimonial' || proof.type === 'review' ? (
                                            <>
                                                <h4 className="text-sm font-medium text-slate-200">
                                                    {proof.content.author || 'Anonymous'}
                                                </h4>
                                                <p className="text-xs text-slate-500">
                                                    {proof.content.role}{proof.content.company ? ` at ${proof.content.company}` : ''}
                                                </p>
                                            </>
                                        ) : proof.type === 'stat' ? (
                                            <>
                                                <h4 className="text-sm font-medium text-slate-200">
                                                    {proof.content.metric}
                                                </h4>
                                                <p className="text-xs text-green-400 font-bold">
                                                    {proof.content.metricValue}
                                                </p>
                                            </>
                                        ) : (
                                            <h4 className="text-sm font-medium text-slate-200">
                                                {proof.content.awardName || proof.content.company || proof.type}
                                            </h4>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {proof.content.rating && (
                                        <span className="text-yellow-400 text-xs">
                                            {'⭐'.repeat(Math.min(proof.content.rating, 5))}
                                        </span>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeProof(proof.id);
                                        }}
                                        className="p-1 text-slate-500 hover:text-red-400"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    {expandedProof === proof.id ?
                                        <ChevronUp size={14} /> :
                                        <ChevronDown size={14} />
                                    }
                                </div>
                            </button>

                            {expandedProof === proof.id && (
                                <div className="px-4 pb-4 space-y-3">
                                    {/* Quote */}
                                    {proof.content.quote && (
                                        <div className="p-3 rounded-lg bg-slate-900/50 border-l-2 border-blue-500">
                                            <p className="text-sm text-slate-300 italic">
                                                "{proof.content.quote}"
                                            </p>
                                        </div>
                                    )}

                                    {/* Themes */}
                                    {proof.themes.length > 0 && (
                                        <div>
                                            <span className="text-[10px] text-slate-500 uppercase">Themes</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {proof.themes.map((theme, i) => (
                                                    <span key={i} className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px]">
                                                        {theme}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Use Cases */}
                                    {proof.useCases.length > 0 && (
                                        <div>
                                            <span className="text-[10px] text-slate-500 uppercase">Suggested Use Cases</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {proof.useCases.map((useCase, i) => (
                                                    <span key={i} className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[10px]">
                                                        {useCase}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Source */}
                                    <div className="flex items-center justify-between text-xs">
                                        <a
                                            href={proof.sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                        >
                                            <ExternalLink size={10} />
                                            {proof.source}
                                        </a>
                                        <button
                                            onClick={() => copyToClipboard(proof.content.quote || JSON.stringify(proof.content))}
                                            className="text-slate-500 hover:text-slate-400 flex items-center gap-1"
                                        >
                                            <Copy size={10} />
                                            Copy
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Send to Integrations */}
            {integrations.length > 0 && proofs.length > 0 && (
                <SendToIntegrations
                    appId="social-proof-harvester"
                    appName="Social Proof Harvester"
                    data={{
                        type: 'social_proof_collection',
                        stats,
                        proofs: proofs.slice(0, 20)
                    }}
                    source={{ url: context?.url, title: context?.title }}
                />
            )}

            {/* Empty State */}
            {proofs.length === 0 && !processing && (
                <div className="text-center py-8 text-slate-500">
                    <Quote size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No social proof collected yet</p>
                    <p className="text-xs text-slate-600 mt-1">
                        Visit a page with testimonials and click "Harvest"
                    </p>
                </div>
            )}

            {/* Info Box */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                <AlertCircle size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300/80">
                    Extract testimonials, reviews, case studies, and stats from any page. Build your swipe file for marketing.
                </p>
            </div>
        </div>
    );
};

export default SocialProofHarvesterApp;
