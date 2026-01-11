import React, { useState, useEffect } from 'react';
import {
    Eye,
    Upload,
    Loader2,
    Copy,
    Check,
    AlertCircle,
    Sparkles,
    Plus,
    Trash2,
    Image,
    Video,
    FileText,
    ExternalLink,
    Calendar,
    ChevronDown,
    ChevronUp,
    Tag,
    Target,
    TrendingUp,
    Filter,
    Download
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';
import { useIntegrations } from '../../hooks/useIntegrations';
import SendToIntegrations from '../../components/SendToIntegrations';

interface AdCreative {
    id: string;
    type: 'image' | 'video' | 'carousel' | 'text';
    headline?: string;
    description?: string;
    cta?: string;
    imageUrl?: string;
    landingPage?: string;
}

interface CompetitorAd {
    id: string;
    competitorName: string;
    platform: 'facebook' | 'google' | 'linkedin' | 'twitter' | 'instagram' | 'tiktok' | 'other';
    capturedAt: number;
    sourceUrl: string;
    creative: AdCreative;
    targeting?: {
        audience?: string;
        placement?: string;
        format?: string;
    };
    analysis?: {
        hooks: string[];
        valueProps: string[];
        emotions: string[];
        ctas: string[];
        effectiveness: 'high' | 'medium' | 'low';
        recommendations: string[];
    };
}

const STORAGE_KEY = 'competitor_ads_data';

const CompetitorAdSpyApp: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading: aiLoading } = useGemini();
    const { success, warning, info } = useToast();
    const { integrations } = useIntegrations();

    const [ads, setAds] = useState<CompetitorAd[]>([]);
    const [processing, setProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [expandedAd, setExpandedAd] = useState<string | null>(null);
    const [filterPlatform, setFilterPlatform] = useState<string>('all');
    const [analyzing, setAnalyzing] = useState<string | null>(null);

    // Load saved data
    useEffect(() => {
        chrome.storage.local.get(STORAGE_KEY, (data) => {
            const savedAds = data[STORAGE_KEY] as CompetitorAd[] | undefined;
            if (savedAds && Array.isArray(savedAds)) {
                setAds(savedAds);
            }
        });
    }, []);

    // Save data
    const saveAds = (updatedAds: CompetitorAd[]) => {
        setAds(updatedAds);
        chrome.storage.local.set({ [STORAGE_KEY]: updatedAds });
    };

    const detectPlatform = (url: string): CompetitorAd['platform'] => {
        if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook';
        if (url.includes('google.com') || url.includes('googleads')) return 'google';
        if (url.includes('linkedin.com')) return 'linkedin';
        if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
        if (url.includes('instagram.com')) return 'instagram';
        if (url.includes('tiktok.com')) return 'tiktok';
        return 'other';
    };

    const captureAdFromPage = async () => {
        if (!context?.content) {
            warning('No page content available');
            return;
        }

        setProcessing(true);

        try {
            const result = await generateContent(
                `Analyze this page and extract advertising/marketing content:

${context.content.substring(0, 10000)}

URL: ${context.url}
Title: ${context.title}

Extract:
1. Company/Brand name running the ad
2. Ad creative details:
   - Type (image, video, carousel, text)
   - Headline text
   - Description/body text
   - Call-to-action text
   - Landing page URL if visible
3. Any targeting information visible
4. Platform indicators

Return as JSON:
{
  "competitorName": "Company Name",
  "creative": {
    "type": "image",
    "headline": "Main headline",
    "description": "Ad description text",
    "cta": "Learn More",
    "landingPage": "https://..."
  },
  "targeting": {
    "audience": "Business professionals",
    "placement": "News Feed",
    "format": "Sponsored Post"
  }
}`,
                `You are an advertising analyst. Extract ad creative details accurately.
Focus on headlines, value propositions, and CTAs.`,
                { jsonMode: true }
            );

            if (result) {
                const newAd: CompetitorAd = {
                    id: `ad-${Date.now()}`,
                    competitorName: result.competitorName || 'Unknown',
                    platform: detectPlatform(context.url || ''),
                    capturedAt: Date.now(),
                    sourceUrl: context.url || '',
                    creative: {
                        id: `creative-${Date.now()}`,
                        type: result.creative?.type || 'text',
                        headline: result.creative?.headline,
                        description: result.creative?.description,
                        cta: result.creative?.cta,
                        landingPage: result.creative?.landingPage
                    },
                    targeting: result.targeting
                };

                const updatedAds = [newAd, ...ads];
                saveAds(updatedAds);
                setExpandedAd(newAd.id);
                success('Ad captured');
            }
        } catch (err) {
            console.error('Capture error:', err);
            warning('Failed to capture ad');
        } finally {
            setProcessing(false);
        }
    };

    const analyzeAd = async (adId: string) => {
        const ad = ads.find(a => a.id === adId);
        if (!ad) return;

        setAnalyzing(adId);

        try {
            const result = await generateContent(
                `Analyze this advertisement for marketing insights:

Competitor: ${ad.competitorName}
Platform: ${ad.platform}
Headline: ${ad.creative.headline || 'N/A'}
Description: ${ad.creative.description || 'N/A'}
CTA: ${ad.creative.cta || 'N/A'}
Landing Page: ${ad.creative.landingPage || 'N/A'}

Provide:
1. Hooks used (attention grabbers)
2. Value propositions
3. Emotional triggers
4. CTA analysis
5. Overall effectiveness rating (high/medium/low)
6. Recommendations for competing

Return as JSON:
{
  "hooks": ["Hook 1", "Hook 2"],
  "valueProps": ["Value prop 1"],
  "emotions": ["urgency", "FOMO"],
  "ctas": ["CTA insight 1"],
  "effectiveness": "high",
  "recommendations": ["Recommendation 1"]
}`,
                `You are a marketing strategist. Analyze ads for copywriting techniques and effectiveness.`,
                { jsonMode: true }
            );

            if (result) {
                const updatedAds = ads.map(a =>
                    a.id === adId ? { ...a, analysis: result } : a
                );
                saveAds(updatedAds);
                success('Analysis complete');
            }
        } catch (err) {
            console.error('Analysis error:', err);
            warning('Failed to analyze ad');
        } finally {
            setAnalyzing(null);
        }
    };

    const removeAd = (id: string) => {
        const updated = ads.filter(a => a.id !== id);
        saveAds(updated);
        success('Ad removed');
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

    const exportSwipeFile = () => {
        let md = `# Competitor Ad Swipe File\n\n`;
        md += `Generated: ${new Date().toLocaleDateString()}\n\n`;

        const grouped = ads.reduce((acc, ad) => {
            if (!acc[ad.competitorName]) acc[ad.competitorName] = [];
            acc[ad.competitorName].push(ad);
            return acc;
        }, {} as Record<string, CompetitorAd[]>);

        Object.entries(grouped).forEach(([competitor, competitorAds]) => {
            md += `## ${competitor}\n\n`;
            competitorAds.forEach((ad, idx) => {
                md += `### Ad ${idx + 1} (${ad.platform})\n`;
                md += `- **Headline:** ${ad.creative.headline || 'N/A'}\n`;
                md += `- **Description:** ${ad.creative.description || 'N/A'}\n`;
                md += `- **CTA:** ${ad.creative.cta || 'N/A'}\n`;
                if (ad.analysis) {
                    md += `- **Hooks:** ${ad.analysis.hooks.join(', ')}\n`;
                    md += `- **Effectiveness:** ${ad.analysis.effectiveness}\n`;
                }
                md += `\n`;
            });
        });

        copyToClipboard(md);
        info('Swipe file copied');
    };

    const getPlatformIcon = (platform: string) => {
        switch (platform) {
            case 'facebook': return '📘';
            case 'google': return '🔍';
            case 'linkedin': return '💼';
            case 'twitter': return '🐦';
            case 'instagram': return '📸';
            case 'tiktok': return '🎵';
            default: return '📢';
        }
    };

    const getEffectivenessColor = (effectiveness: string) => {
        switch (effectiveness) {
            case 'high': return 'bg-green-500/20 text-green-400';
            case 'medium': return 'bg-yellow-500/20 text-yellow-400';
            case 'low': return 'bg-red-500/20 text-red-400';
            default: return 'bg-slate-500/20 text-slate-400';
        }
    };

    const filteredAds = ads.filter(ad =>
        filterPlatform === 'all' || ad.platform === filterPlatform
    );

    const platforms = [...new Set(ads.map(a => a.platform))];

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex gap-2">
                <button
                    onClick={captureAdFromPage}
                    disabled={processing}
                    className="btn-primary flex items-center gap-2 flex-1"
                >
                    {processing ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Capturing...
                        </>
                    ) : (
                        <>
                            <Plus size={16} />
                            Capture Ad
                        </>
                    )}
                </button>
                {ads.length > 0 && (
                    <button
                        onClick={exportSwipeFile}
                        className="btn-secondary p-3"
                        title="Export swipe file"
                    >
                        <Download size={16} />
                    </button>
                )}
            </div>

            {/* Filter */}
            {platforms.length > 1 && (
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterPlatform('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                            filterPlatform === 'all'
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-700/50 text-slate-400'
                        }`}
                    >
                        All ({ads.length})
                    </button>
                    {platforms.map(platform => (
                        <button
                            key={platform}
                            onClick={() => setFilterPlatform(platform)}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                filterPlatform === platform
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-slate-700/50 text-slate-400'
                            }`}
                        >
                            {getPlatformIcon(platform)} {platform}
                        </button>
                    ))}
                </div>
            )}

            {/* Ads List */}
            {filteredAds.length > 0 && (
                <div className="space-y-3">
                    {filteredAds.map((ad) => (
                        <div
                            key={ad.id}
                            className="rounded-xl bg-slate-800/30 border border-slate-700/30 overflow-hidden"
                        >
                            <button
                                onClick={() => setExpandedAd(
                                    expandedAd === ad.id ? null : ad.id
                                )}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{getPlatformIcon(ad.platform)}</span>
                                    <div className="text-left">
                                        <h4 className="text-sm font-medium text-slate-200">{ad.competitorName}</h4>
                                        <p className="text-xs text-slate-500 truncate max-w-[200px]">
                                            {ad.creative.headline || ad.creative.description?.substring(0, 50) || 'No headline'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {ad.analysis && (
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${getEffectivenessColor(ad.analysis.effectiveness)}`}>
                                            {ad.analysis.effectiveness}
                                        </span>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeAd(ad.id);
                                        }}
                                        className="p-1 text-slate-500 hover:text-red-400"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    {expandedAd === ad.id ?
                                        <ChevronUp size={14} /> :
                                        <ChevronDown size={14} />
                                    }
                                </div>
                            </button>

                            {expandedAd === ad.id && (
                                <div className="px-4 pb-4 space-y-4">
                                    {/* Creative Details */}
                                    <div className="p-3 rounded-lg bg-slate-900/50 space-y-2">
                                        {ad.creative.headline && (
                                            <div>
                                                <span className="text-[10px] text-slate-500 uppercase">Headline</span>
                                                <p className="text-sm text-white font-medium">{ad.creative.headline}</p>
                                            </div>
                                        )}
                                        {ad.creative.description && (
                                            <div>
                                                <span className="text-[10px] text-slate-500 uppercase">Description</span>
                                                <p className="text-xs text-slate-300">{ad.creative.description}</p>
                                            </div>
                                        )}
                                        {ad.creative.cta && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-500 uppercase">CTA:</span>
                                                <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-medium">
                                                    {ad.creative.cta}
                                                </span>
                                            </div>
                                        )}
                                        {ad.creative.landingPage && (
                                            <a
                                                href={ad.creative.landingPage}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                            >
                                                <ExternalLink size={10} />
                                                View Landing Page
                                            </a>
                                        )}
                                    </div>

                                    {/* Targeting */}
                                    {ad.targeting && (
                                        <div className="flex flex-wrap gap-2">
                                            {ad.targeting.audience && (
                                                <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 text-[10px]">
                                                    👥 {ad.targeting.audience}
                                                </span>
                                            )}
                                            {ad.targeting.placement && (
                                                <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-[10px]">
                                                    📍 {ad.targeting.placement}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Analysis */}
                                    {ad.analysis ? (
                                        <div className="space-y-3">
                                            {/* Hooks */}
                                            {ad.analysis.hooks.length > 0 && (
                                                <div>
                                                    <span className="text-[10px] text-slate-500 uppercase">Hooks Used</span>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {ad.analysis.hooks.map((hook, i) => (
                                                            <span key={i} className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px]">
                                                                🎣 {hook}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Emotions */}
                                            {ad.analysis.emotions.length > 0 && (
                                                <div>
                                                    <span className="text-[10px] text-slate-500 uppercase">Emotional Triggers</span>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {ad.analysis.emotions.map((emotion, i) => (
                                                            <span key={i} className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 text-[10px]">
                                                                💡 {emotion}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Recommendations */}
                                            {ad.analysis.recommendations.length > 0 && (
                                                <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                                                    <span className="text-[10px] text-green-400 uppercase font-bold">Recommendations</span>
                                                    <ul className="mt-1 space-y-1">
                                                        {ad.analysis.recommendations.map((rec, i) => (
                                                            <li key={i} className="text-xs text-slate-300 flex items-start gap-1">
                                                                <span className="text-green-400">→</span>
                                                                {rec}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => analyzeAd(ad.id)}
                                            disabled={analyzing === ad.id}
                                            className="btn-secondary w-full flex items-center justify-center gap-2"
                                        >
                                            {analyzing === ad.id ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    Analyzing...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={14} />
                                                    Analyze Ad
                                                </>
                                            )}
                                        </button>
                                    )}

                                    {/* Copy Ad */}
                                    <button
                                        onClick={() => copyToClipboard(
                                            `Headline: ${ad.creative.headline || 'N/A'}\nDescription: ${ad.creative.description || 'N/A'}\nCTA: ${ad.creative.cta || 'N/A'}`
                                        )}
                                        className="text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1"
                                    >
                                        <Copy size={10} />
                                        Copy ad text
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Send to Integrations */}
            {integrations.length > 0 && ads.length > 0 && (
                <SendToIntegrations
                    appId="competitor-ad-spy"
                    appName="Competitor Ad Spy"
                    data={{
                        type: 'competitor_ads',
                        ads: ads.map(a => ({
                            competitor: a.competitorName,
                            platform: a.platform,
                            creative: a.creative,
                            analysis: a.analysis
                        }))
                    }}
                    source={{ url: context?.url, title: context?.title }}
                />
            )}

            {/* Empty State */}
            {ads.length === 0 && !processing && (
                <div className="text-center py-8 text-slate-500">
                    <Eye size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No ads captured yet</p>
                    <p className="text-xs text-slate-600 mt-1">
                        Visit an ad or sponsored post and click "Capture Ad"
                    </p>
                </div>
            )}

            {/* Info Box */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                <AlertCircle size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300/80">
                    Capture competitor ads from Facebook, Google, LinkedIn, and more. AI analyzes hooks, emotions, and effectiveness.
                </p>
            </div>
        </div>
    );
};

export default CompetitorAdSpyApp;
