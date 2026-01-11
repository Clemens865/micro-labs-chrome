import React, { useState } from 'react';
import {
    Target,
    Upload,
    Loader2,
    Copy,
    Check,
    Download,
    AlertCircle,
    Sparkles,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    FileText,
    Lightbulb,
    Shield,
    TrendingUp,
    Users,
    Zap,
    Star,
    AlertTriangle
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';
import { useIntegrations } from '../../hooks/useIntegrations';
import SendToIntegrations from '../../components/SendToIntegrations';

interface FeatureAnalysis {
    name: string;
    description: string;
    userBenefit: string;
    implementation: 'easy' | 'medium' | 'hard';
    priority: 'must-have' | 'should-have' | 'nice-to-have';
    marketAdvantage: string;
}

interface CompetitorPRD {
    productName: string;
    tagline: string;
    problemStatement: string;
    targetAudience: {
        primary: string;
        secondary: string[];
        personas: { name: string; description: string; needs: string[] }[];
    };
    competitorAnalysis: {
        strengths: string[];
        weaknesses: string[];
        opportunities: string[];
        threats: string[];
    };
    features: FeatureAnalysis[];
    differentiators: string[];
    goToMarket: {
        positioning: string;
        channels: string[];
        pricingStrategy: string;
    };
    successMetrics: { metric: string; target: string }[];
    risks: { risk: string; mitigation: string }[];
    timeline: { phase: string; duration: string; deliverables: string[] }[];
}

const CompetitorPRDApp: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading: aiLoading } = useGemini();
    const { success, warning, info } = useToast();
    const { integrations } = useIntegrations();

    const [inputText, setInputText] = useState('');
    const [prd, setPrd] = useState<CompetitorPRD | null>(null);
    const [processing, setProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [expandedSection, setExpandedSection] = useState<string | null>('features');

    const extractFromPage = () => {
        if (context?.content) {
            setInputText(context.content.substring(0, 15000));
            info('Competitor page content loaded');
        } else {
            warning('No page content available');
        }
    };

    const analyzePage = async () => {
        if (!inputText.trim()) {
            warning('Please enter competitor product information');
            return;
        }

        setProcessing(true);

        try {
            const result = await generateContent(
                `Analyze this competitor product and generate a comprehensive PRD for building a better alternative:

${inputText}

Current page URL: ${context?.url || 'unknown'}
Page title: ${context?.title || 'unknown'}

Create a detailed Product Requirements Document with:

1. Product Name - A compelling name for our alternative
2. Tagline - Clear value proposition
3. Problem Statement - What problem does this solve better?
4. Target Audience - Primary users, secondary users, and detailed personas
5. Competitor SWOT Analysis - Their strengths, weaknesses, opportunities, threats
6. Feature List - Each feature with:
   - Name and description
   - User benefit
   - Implementation difficulty (easy/medium/hard)
   - Priority (must-have/should-have/nice-to-have)
   - Market advantage gained
7. Key Differentiators - What makes our product better
8. Go-to-Market Strategy - Positioning, channels, pricing
9. Success Metrics - KPIs and targets
10. Risks and Mitigations
11. Implementation Timeline

Return as JSON:
{
  "productName": "Better Product Name",
  "tagline": "Clear value proposition",
  "problemStatement": "The problem we're solving...",
  "targetAudience": {
    "primary": "Main user group",
    "secondary": ["Secondary group 1"],
    "personas": [{"name": "Sarah the PM", "description": "...", "needs": ["need1"]}]
  },
  "competitorAnalysis": {
    "strengths": ["strength1"],
    "weaknesses": ["weakness1"],
    "opportunities": ["opportunity1"],
    "threats": ["threat1"]
  },
  "features": [
    {
      "name": "Feature Name",
      "description": "What it does",
      "userBenefit": "Why users want it",
      "implementation": "medium",
      "priority": "must-have",
      "marketAdvantage": "Why this beats competitors"
    }
  ],
  "differentiators": ["differentiator1"],
  "goToMarket": {
    "positioning": "How we position",
    "channels": ["channel1"],
    "pricingStrategy": "Pricing approach"
  },
  "successMetrics": [{"metric": "DAU", "target": "10K in 6 months"}],
  "risks": [{"risk": "Competition", "mitigation": "How we handle it"}],
  "timeline": [{"phase": "MVP", "duration": "8 weeks", "deliverables": ["Core features"]}]
}`,
                `You are a senior product manager specializing in competitive analysis and PRD creation.
Create actionable, specific product requirements that would genuinely beat the competitor.
Focus on:
- Identifying real pain points in competitor products
- Proposing innovative features that address gaps
- Being realistic about implementation complexity
- Providing concrete success metrics`,
                { jsonMode: true }
            );

            if (result) {
                setPrd(result);
                success('PRD generated successfully');
            }
        } catch (err) {
            console.error('Analysis error:', err);
            warning('Failed to generate PRD');
        } finally {
            setProcessing(false);
        }
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
        if (!prd) return;

        let md = `# ${prd.productName}\n\n`;
        md += `> ${prd.tagline}\n\n`;

        md += `## Problem Statement\n${prd.problemStatement}\n\n`;

        md += `## Target Audience\n`;
        md += `**Primary:** ${prd.targetAudience.primary}\n\n`;
        md += `**Secondary:** ${prd.targetAudience.secondary.join(', ')}\n\n`;

        md += `### User Personas\n`;
        prd.targetAudience.personas.forEach(p => {
            md += `#### ${p.name}\n${p.description}\n\n**Needs:**\n${p.needs.map(n => `- ${n}`).join('\n')}\n\n`;
        });

        md += `## Competitor SWOT Analysis\n`;
        md += `### Strengths\n${prd.competitorAnalysis.strengths.map(s => `- ${s}`).join('\n')}\n\n`;
        md += `### Weaknesses\n${prd.competitorAnalysis.weaknesses.map(w => `- ${w}`).join('\n')}\n\n`;
        md += `### Opportunities\n${prd.competitorAnalysis.opportunities.map(o => `- ${o}`).join('\n')}\n\n`;
        md += `### Threats\n${prd.competitorAnalysis.threats.map(t => `- ${t}`).join('\n')}\n\n`;

        md += `## Features\n\n`;
        prd.features.forEach((f, idx) => {
            md += `### ${idx + 1}. ${f.name}\n`;
            md += `${f.description}\n\n`;
            md += `- **User Benefit:** ${f.userBenefit}\n`;
            md += `- **Priority:** ${f.priority}\n`;
            md += `- **Implementation:** ${f.implementation}\n`;
            md += `- **Market Advantage:** ${f.marketAdvantage}\n\n`;
        });

        md += `## Key Differentiators\n${prd.differentiators.map(d => `- ${d}`).join('\n')}\n\n`;

        md += `## Go-to-Market Strategy\n`;
        md += `**Positioning:** ${prd.goToMarket.positioning}\n\n`;
        md += `**Channels:** ${prd.goToMarket.channels.join(', ')}\n\n`;
        md += `**Pricing:** ${prd.goToMarket.pricingStrategy}\n\n`;

        md += `## Success Metrics\n`;
        md += `| Metric | Target |\n|--------|--------|\n`;
        prd.successMetrics.forEach(m => {
            md += `| ${m.metric} | ${m.target} |\n`;
        });
        md += `\n`;

        md += `## Risks & Mitigations\n`;
        prd.risks.forEach(r => {
            md += `- **${r.risk}:** ${r.mitigation}\n`;
        });
        md += `\n`;

        md += `## Timeline\n`;
        prd.timeline.forEach(t => {
            md += `### ${t.phase} (${t.duration})\n`;
            md += `${t.deliverables.map(d => `- ${d}`).join('\n')}\n\n`;
        });

        copyToClipboard(md);
        info('Markdown PRD copied');
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'must-have': return 'bg-red-500/20 text-red-400';
            case 'should-have': return 'bg-yellow-500/20 text-yellow-400';
            case 'nice-to-have': return 'bg-green-500/20 text-green-400';
            default: return 'bg-slate-500/20 text-slate-400';
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'text-green-400';
            case 'medium': return 'text-yellow-400';
            case 'hard': return 'text-red-400';
            default: return 'text-slate-400';
        }
    };

    const Section: React.FC<{ id: string; title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ id, title, icon, children }) => (
        <div className="rounded-xl bg-slate-800/30 border border-slate-700/30 overflow-hidden">
            <button
                onClick={() => setExpandedSection(expandedSection === id ? null : id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
            >
                <span className="flex items-center gap-2 text-sm font-bold text-slate-200">
                    {icon}
                    {title}
                </span>
                {expandedSection === id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSection === id && (
                <div className="px-4 pb-4">
                    {children}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Input Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-300">Competitor Product</h3>
                    <button
                        onClick={extractFromPage}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                        <Upload size={12} />
                        From Page
                    </button>
                </div>

                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste competitor product page, features, or documentation..."
                    className="input-field w-full min-h-[120px] text-sm"
                />

                <button
                    onClick={analyzePage}
                    disabled={processing || !inputText.trim()}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    {processing ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Analyzing Competitor...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Generate PRD
                        </>
                    )}
                </button>
            </div>

            {/* PRD Output */}
            {prd && (
                <div className="space-y-4">
                    {/* Header */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                        <h2 className="text-xl font-bold text-white">{prd.productName}</h2>
                        <p className="text-sm text-slate-300 mt-1 italic">"{prd.tagline}"</p>
                        <p className="text-xs text-slate-400 mt-3">{prd.problemStatement}</p>
                    </div>

                    {/* Target Audience */}
                    <Section id="audience" title="Target Audience" icon={<Users size={14} />}>
                        <div className="space-y-3 text-sm">
                            <div>
                                <span className="text-slate-500">Primary:</span>
                                <span className="text-slate-300 ml-2">{prd.targetAudience.primary}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Secondary:</span>
                                <span className="text-slate-300 ml-2">{prd.targetAudience.secondary.join(', ')}</span>
                            </div>
                            <div className="space-y-2">
                                {prd.targetAudience.personas.map((p, idx) => (
                                    <div key={idx} className="p-2 rounded bg-slate-900/50">
                                        <p className="font-medium text-slate-200">{p.name}</p>
                                        <p className="text-xs text-slate-400">{p.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Section>

                    {/* SWOT Analysis */}
                    <Section id="swot" title="Competitor SWOT" icon={<Target size={14} />}>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                                <p className="font-bold text-green-400 mb-1">Strengths</p>
                                {prd.competitorAnalysis.strengths.map((s, i) => (
                                    <p key={i} className="text-slate-300">• {s}</p>
                                ))}
                            </div>
                            <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                                <p className="font-bold text-red-400 mb-1">Weaknesses</p>
                                {prd.competitorAnalysis.weaknesses.map((w, i) => (
                                    <p key={i} className="text-slate-300">• {w}</p>
                                ))}
                            </div>
                            <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                                <p className="font-bold text-blue-400 mb-1">Opportunities</p>
                                {prd.competitorAnalysis.opportunities.map((o, i) => (
                                    <p key={i} className="text-slate-300">• {o}</p>
                                ))}
                            </div>
                            <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                                <p className="font-bold text-yellow-400 mb-1">Threats</p>
                                {prd.competitorAnalysis.threats.map((t, i) => (
                                    <p key={i} className="text-slate-300">• {t}</p>
                                ))}
                            </div>
                        </div>
                    </Section>

                    {/* Features */}
                    <Section id="features" title={`Features (${prd.features.length})`} icon={<Zap size={14} />}>
                        <div className="space-y-2">
                            {prd.features.map((feature, idx) => (
                                <div key={idx} className="p-3 rounded bg-slate-900/50">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-200">{feature.name}</h4>
                                            <p className="text-xs text-slate-400 mt-1">{feature.description}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${getPriorityColor(feature.priority)}`}>
                                            {feature.priority}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-[10px]">
                                        <span className={getDifficultyColor(feature.implementation)}>
                                            {feature.implementation} to build
                                        </span>
                                        <span className="text-slate-500">|</span>
                                        <span className="text-slate-400">{feature.marketAdvantage}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Differentiators */}
                    <Section id="diff" title="Key Differentiators" icon={<Star size={14} />}>
                        <div className="space-y-1">
                            {prd.differentiators.map((d, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                    <Lightbulb size={12} className="text-yellow-400 mt-1 flex-shrink-0" />
                                    {d}
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Go-to-Market */}
                    <Section id="gtm" title="Go-to-Market" icon={<TrendingUp size={14} />}>
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="text-slate-500">Positioning:</span>
                                <p className="text-slate-300">{prd.goToMarket.positioning}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Channels:</span>
                                <p className="text-slate-300">{prd.goToMarket.channels.join(', ')}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Pricing:</span>
                                <p className="text-slate-300">{prd.goToMarket.pricingStrategy}</p>
                            </div>
                        </div>
                    </Section>

                    {/* Risks */}
                    <Section id="risks" title="Risks & Mitigations" icon={<AlertTriangle size={14} />}>
                        <div className="space-y-2">
                            {prd.risks.map((r, idx) => (
                                <div key={idx} className="text-sm">
                                    <span className="text-red-400 font-medium">{r.risk}:</span>
                                    <span className="text-slate-400 ml-2">{r.mitigation}</span>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Export Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={exportAsMarkdown}
                            className="btn-secondary flex items-center gap-2 flex-1"
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            Copy as Markdown
                        </button>
                        <button
                            onClick={() => copyToClipboard(JSON.stringify(prd, null, 2))}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <FileText size={14} />
                            JSON
                        </button>
                    </div>

                    {/* Send to Integrations */}
                    {integrations.length > 0 && (
                        <SendToIntegrations
                            appId="competitor-prd"
                            appName="CompetitorLens PRD"
                            data={{
                                type: 'competitor_prd',
                                prd
                            }}
                            source={{ url: context?.url, title: context?.title }}
                        />
                    )}
                </div>
            )}

            {/* Empty State */}
            {!prd && !processing && (
                <div className="text-center py-8 text-slate-500">
                    <Target size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No PRD generated yet</p>
                    <p className="text-xs text-slate-600 mt-1">
                        Paste competitor product info to generate a PRD
                    </p>
                </div>
            )}

            {/* Info Box */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                <AlertCircle size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300/80">
                    Analyze competitor products and generate comprehensive PRDs with SWOT analysis,
                    feature specs, and go-to-market strategy.
                </p>
            </div>
        </div>
    );
};

export default CompetitorPRDApp;
