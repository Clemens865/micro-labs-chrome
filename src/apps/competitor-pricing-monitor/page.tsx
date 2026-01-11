import React, { useState, useEffect } from 'react';
import {
    DollarSign,
    Upload,
    Loader2,
    Copy,
    Check,
    AlertCircle,
    Sparkles,
    Plus,
    Trash2,
    Bell,
    BellOff,
    TrendingUp,
    TrendingDown,
    Minus,
    RefreshCw,
    ExternalLink,
    Calendar,
    ChevronDown,
    ChevronUp,
    Settings
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';
import { useIntegrations } from '../../hooks/useIntegrations';
import SendToIntegrations from '../../components/SendToIntegrations';

interface PricingTier {
    name: string;
    price: string;
    billingPeriod: 'monthly' | 'yearly' | 'one-time' | 'custom';
    features: string[];
    highlighted?: boolean;
}

interface CompetitorPricing {
    id: string;
    name: string;
    url: string;
    lastChecked: number;
    tiers: PricingTier[];
    currency: string;
    notes?: string;
}

interface PriceChange {
    competitorId: string;
    competitorName: string;
    tierName: string;
    oldPrice: string;
    newPrice: string;
    changePercent: number;
    detectedAt: number;
}

const STORAGE_KEY = 'competitor_pricing_data';
const CHANGES_KEY = 'competitor_pricing_changes';

const CompetitorPricingMonitorApp: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading: aiLoading } = useGemini();
    const { success, warning, info } = useToast();
    const { integrations } = useIntegrations();

    const [competitors, setCompetitors] = useState<CompetitorPricing[]>([]);
    const [priceChanges, setPriceChanges] = useState<PriceChange[]>([]);
    const [processing, setProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [alertsEnabled, setAlertsEnabled] = useState(true);

    // Load saved data
    useEffect(() => {
        chrome.storage.local.get([STORAGE_KEY, CHANGES_KEY], (data) => {
            const comps = data[STORAGE_KEY] as CompetitorPricing[] | undefined;
            const changes = data[CHANGES_KEY] as PriceChange[] | undefined;
            if (comps && Array.isArray(comps)) {
                setCompetitors(comps);
            }
            if (changes && Array.isArray(changes)) {
                setPriceChanges(changes);
            }
        });
    }, []);

    // Save data
    const saveData = (comps: CompetitorPricing[], changes: PriceChange[]) => {
        chrome.storage.local.set({
            [STORAGE_KEY]: comps,
            [CHANGES_KEY]: changes
        });
    };

    const extractPricingFromPage = async () => {
        if (!context?.content) {
            warning('No page content available');
            return;
        }

        setProcessing(true);

        try {
            const result = await generateContent(
                `Extract pricing information from this page:

${context.content.substring(0, 12000)}

URL: ${context.url}
Title: ${context.title}

Extract:
1. Company/Product name
2. All pricing tiers with:
   - Tier name (e.g., "Free", "Pro", "Enterprise")
   - Price (include currency symbol)
   - Billing period (monthly, yearly, one-time, custom)
   - Key features included
   - Whether it's the highlighted/recommended tier
3. Currency used
4. Any notes about pricing (discounts, enterprise pricing, etc.)

Return as JSON:
{
  "name": "Company Name",
  "tiers": [
    {
      "name": "Pro",
      "price": "$29",
      "billingPeriod": "monthly",
      "features": ["Feature 1", "Feature 2"],
      "highlighted": true
    }
  ],
  "currency": "USD",
  "notes": "20% discount for annual billing"
}`,
                `You are a pricing analyst. Extract accurate pricing information from SaaS pricing pages.
Focus on exact prices, all tiers, and key differentiating features.`,
                { jsonMode: true }
            );

            if (result) {
                const newCompetitor: CompetitorPricing = {
                    id: `comp-${Date.now()}`,
                    name: result.name || context.title || 'Unknown',
                    url: context.url || '',
                    lastChecked: Date.now(),
                    tiers: result.tiers || [],
                    currency: result.currency || 'USD',
                    notes: result.notes
                };

                // Check for existing competitor
                const existingIndex = competitors.findIndex(c =>
                    c.url === newCompetitor.url || c.name.toLowerCase() === newCompetitor.name.toLowerCase()
                );

                let updatedCompetitors: CompetitorPricing[];

                if (existingIndex >= 0) {
                    // Check for price changes
                    const existing = competitors[existingIndex];
                    const changes: PriceChange[] = [];

                    newCompetitor.tiers.forEach(newTier => {
                        const oldTier = existing.tiers.find(t => t.name === newTier.name);
                        if (oldTier && oldTier.price !== newTier.price) {
                            const oldNum = parseFloat(oldTier.price.replace(/[^0-9.]/g, ''));
                            const newNum = parseFloat(newTier.price.replace(/[^0-9.]/g, ''));
                            const changePercent = oldNum > 0 ? ((newNum - oldNum) / oldNum) * 100 : 0;

                            changes.push({
                                competitorId: newCompetitor.id,
                                competitorName: newCompetitor.name,
                                tierName: newTier.name,
                                oldPrice: oldTier.price,
                                newPrice: newTier.price,
                                changePercent,
                                detectedAt: Date.now()
                            });
                        }
                    });

                    if (changes.length > 0) {
                        const allChanges = [...changes, ...priceChanges].slice(0, 50);
                        setPriceChanges(allChanges);
                        saveData(competitors, allChanges);

                        if (alertsEnabled) {
                            warning(`${changes.length} price change(s) detected!`);
                        }
                    }

                    updatedCompetitors = [...competitors];
                    updatedCompetitors[existingIndex] = { ...newCompetitor, id: existing.id };
                    success('Pricing updated');
                } else {
                    updatedCompetitors = [...competitors, newCompetitor];
                    success('Competitor added');
                }

                setCompetitors(updatedCompetitors);
                saveData(updatedCompetitors, priceChanges);
                setExpandedCompetitor(newCompetitor.id);
            }
        } catch (err) {
            console.error('Extraction error:', err);
            warning('Failed to extract pricing');
        } finally {
            setProcessing(false);
        }
    };

    const removeCompetitor = (id: string) => {
        const updated = competitors.filter(c => c.id !== id);
        setCompetitors(updated);
        saveData(updated, priceChanges);
        success('Competitor removed');
    };

    const clearChanges = () => {
        setPriceChanges([]);
        saveData(competitors, []);
        info('Change history cleared');
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

    const exportComparison = () => {
        let md = `# Competitor Pricing Comparison\n\n`;
        md += `Generated: ${new Date().toLocaleDateString()}\n\n`;

        competitors.forEach(comp => {
            md += `## ${comp.name}\n`;
            md += `URL: ${comp.url}\n`;
            md += `Last checked: ${new Date(comp.lastChecked).toLocaleString()}\n\n`;

            md += `| Tier | Price | Billing | Key Features |\n`;
            md += `|------|-------|---------|---------------|\n`;
            comp.tiers.forEach(tier => {
                md += `| ${tier.name}${tier.highlighted ? ' ⭐' : ''} | ${tier.price} | ${tier.billingPeriod} | ${tier.features.slice(0, 3).join(', ')} |\n`;
            });
            md += '\n';

            if (comp.notes) {
                md += `**Notes:** ${comp.notes}\n\n`;
            }
        });

        if (priceChanges.length > 0) {
            md += `## Recent Price Changes\n\n`;
            priceChanges.slice(0, 10).forEach(change => {
                const direction = change.changePercent > 0 ? '📈' : '📉';
                md += `- ${direction} **${change.competitorName}** ${change.tierName}: ${change.oldPrice} → ${change.newPrice} (${change.changePercent > 0 ? '+' : ''}${change.changePercent.toFixed(1)}%)\n`;
            });
        }

        copyToClipboard(md);
    };

    const getChangeIcon = (percent: number) => {
        if (percent > 0) return <TrendingUp size={14} className="text-red-400" />;
        if (percent < 0) return <TrendingDown size={14} className="text-green-400" />;
        return <Minus size={14} className="text-slate-400" />;
    };

    const formatTimeAgo = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        return 'Just now';
    };

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex gap-2">
                <button
                    onClick={extractPricingFromPage}
                    disabled={processing}
                    className="btn-primary flex items-center gap-2 flex-1"
                >
                    {processing ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Extracting...
                        </>
                    ) : (
                        <>
                            <Plus size={16} />
                            Add from Page
                        </>
                    )}
                </button>
                <button
                    onClick={() => setAlertsEnabled(!alertsEnabled)}
                    className={`btn-secondary p-3 ${alertsEnabled ? 'text-yellow-400' : 'text-slate-500'}`}
                    title={alertsEnabled ? 'Alerts enabled' : 'Alerts disabled'}
                >
                    {alertsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                </button>
            </div>

            {/* Price Changes Alert */}
            {priceChanges.length > 0 && (
                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2">
                            <Bell size={14} />
                            Recent Price Changes ({priceChanges.length})
                        </h3>
                        <button
                            onClick={clearChanges}
                            className="text-xs text-slate-500 hover:text-slate-400"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="space-y-1 max-h-[100px] overflow-y-auto">
                        {priceChanges.slice(0, 5).map((change, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                                {getChangeIcon(change.changePercent)}
                                <span className="text-slate-300">{change.competitorName}</span>
                                <span className="text-slate-500">{change.tierName}:</span>
                                <span className="text-slate-400 line-through">{change.oldPrice}</span>
                                <span className="text-white font-medium">{change.newPrice}</span>
                                <span className={change.changePercent > 0 ? 'text-red-400' : 'text-green-400'}>
                                    ({change.changePercent > 0 ? '+' : ''}{change.changePercent.toFixed(1)}%)
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Competitors List */}
            {competitors.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-300">
                            Tracked Competitors ({competitors.length})
                        </h3>
                        <button
                            onClick={exportComparison}
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                            Export
                        </button>
                    </div>

                    <div className="space-y-2">
                        {competitors.map((comp) => (
                            <div
                                key={comp.id}
                                className="rounded-xl bg-slate-800/30 border border-slate-700/30 overflow-hidden"
                            >
                                <button
                                    onClick={() => setExpandedCompetitor(
                                        expandedCompetitor === comp.id ? null : comp.id
                                    )}
                                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <DollarSign size={16} className="text-green-400" />
                                        <div className="text-left">
                                            <h4 className="text-sm font-medium text-slate-200">{comp.name}</h4>
                                            <p className="text-xs text-slate-500">
                                                {comp.tiers.length} tiers • Updated {formatTimeAgo(comp.lastChecked)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={comp.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1 text-slate-500 hover:text-blue-400"
                                        >
                                            <ExternalLink size={14} />
                                        </a>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeCompetitor(comp.id);
                                            }}
                                            className="p-1 text-slate-500 hover:text-red-400"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        {expandedCompetitor === comp.id ?
                                            <ChevronUp size={14} /> :
                                            <ChevronDown size={14} />
                                        }
                                    </div>
                                </button>

                                {expandedCompetitor === comp.id && (
                                    <div className="px-4 pb-4 space-y-3">
                                        {/* Pricing Tiers */}
                                        <div className="grid gap-2">
                                            {comp.tiers.map((tier, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`p-3 rounded-lg ${
                                                        tier.highlighted
                                                            ? 'bg-blue-500/10 border border-blue-500/30'
                                                            : 'bg-slate-900/50'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-slate-200">
                                                                {tier.name}
                                                            </span>
                                                            {tier.highlighted && (
                                                                <span className="text-[10px] text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">
                                                                    Popular
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-lg font-bold text-white">{tier.price}</span>
                                                            <span className="text-xs text-slate-500 ml-1">/{tier.billingPeriod}</span>
                                                        </div>
                                                    </div>
                                                    {tier.features.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            {tier.features.slice(0, 4).map((f, fidx) => (
                                                                <span key={fidx} className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                                                    {f}
                                                                </span>
                                                            ))}
                                                            {tier.features.length > 4 && (
                                                                <span className="text-[10px] text-slate-500">
                                                                    +{tier.features.length - 4} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Notes */}
                                        {comp.notes && (
                                            <p className="text-xs text-slate-400 italic">
                                                💡 {comp.notes}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Send to Integrations */}
            {integrations.length > 0 && competitors.length > 0 && (
                <SendToIntegrations
                    appId="competitor-pricing-monitor"
                    appName="Competitor Pricing Monitor"
                    data={{
                        type: 'pricing_comparison',
                        competitors,
                        recentChanges: priceChanges.slice(0, 10)
                    }}
                    source={{ url: context?.url, title: context?.title }}
                />
            )}

            {/* Empty State */}
            {competitors.length === 0 && !processing && (
                <div className="text-center py-8 text-slate-500">
                    <DollarSign size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No competitors tracked yet</p>
                    <p className="text-xs text-slate-600 mt-1">
                        Visit a pricing page and click "Add from Page"
                    </p>
                </div>
            )}

            {/* Info Box */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                <AlertCircle size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300/80">
                    Track competitor SaaS pricing. Visit pricing pages to extract and monitor changes over time.
                </p>
            </div>
        </div>
    );
};

export default CompetitorPricingMonitorApp;
