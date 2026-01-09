import React, { useState } from 'react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import {
    Search,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Copy,
    ChevronDown,
    ChevronUp,
    Sparkles,
    FileCode,
    Users,
    Shield,
    MessageSquareQuote,
    HelpCircle,
    BarChart3,
    Check,
    Zap
} from 'lucide-react';

interface AEOScore {
    total: number;
    directAnswers: number;
    questionStructure: number;
    eeatSignals: number;
    technicalQuality: number;
}

interface AEOIssue {
    type: 'critical' | 'warning' | 'passed';
    category: string;
    title: string;
    description: string;
    recommendation?: string;
}

interface AEOAnalysis {
    score: AEOScore;
    contentType: string;
    summary: string;
    issues: AEOIssue[];
    targetAudience: string[];
    schemaRecommendations: string[];
    quickWins: string[];
}

interface PageMetrics {
    headings: { h1: number; h2: number; h3: number; questions: number };
    wordCount: number;
    hasSchema: boolean;
    schemaTypes: string[];
    hasFAQ: boolean;
    hasAuthor: boolean;
    hasDate: boolean;
    metaDescription: boolean;
    imagesWithAlt: number;
    imagesTotal: number;
}

const AEOAnalyzer: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading, error } = useGemini();
    const [analysis, setAnalysis] = useState<AEOAnalysis | null>(null);
    const [metrics, setMetrics] = useState<PageMetrics | null>(null);
    const [status, setStatus] = useState<string>('');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['score', 'issues']));
    const [generatedSchema, setGeneratedSchema] = useState<string>('');
    const [copied, setCopied] = useState(false);

    const toggleSection = (section: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(section)) {
            newExpanded.delete(section);
        } else {
            newExpanded.add(section);
        }
        setExpandedSections(newExpanded);
    };

    const extractPageMetrics = (): Promise<PageMetrics> => {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];
                if (!tab?.id) {
                    resolve({
                        headings: { h1: 0, h2: 0, h3: 0, questions: 0 },
                        wordCount: 0,
                        hasSchema: false,
                        schemaTypes: [],
                        hasFAQ: false,
                        hasAuthor: false,
                        hasDate: false,
                        metaDescription: false,
                        imagesWithAlt: 0,
                        imagesTotal: 0
                    });
                    return;
                }

                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        const h1s = document.querySelectorAll('h1');
                        const h2s = document.querySelectorAll('h2');
                        const h3s = document.querySelectorAll('h3');
                        const allHeadings = [...h1s, ...h2s, ...h3s];
                        const questionHeadings = allHeadings.filter(h =>
                            h.textContent?.includes('?') ||
                            /^(what|how|why|when|where|who|which|can|do|does|is|are|should|would|could)/i.test(h.textContent?.trim() || '')
                        );

                        const bodyText = document.body?.innerText || '';
                        const wordCount = bodyText.split(/\s+/).filter(w => w.length > 0).length;

                        const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
                        const schemaTypes: string[] = [];
                        schemaScripts.forEach(script => {
                            try {
                                const data = JSON.parse(script.textContent || '');
                                if (data['@type']) {
                                    schemaTypes.push(Array.isArray(data['@type']) ? data['@type'][0] : data['@type']);
                                }
                                if (data['@graph']) {
                                    data['@graph'].forEach((item: any) => {
                                        if (item['@type']) schemaTypes.push(item['@type']);
                                    });
                                }
                            } catch (e) {}
                        });

                        const hasFAQ = schemaTypes.includes('FAQPage') ||
                            document.querySelector('[itemtype*="FAQPage"]') !== null ||
                            document.querySelectorAll('details, .faq, .accordion, [class*="faq"]').length > 0;

                        const hasAuthor = document.querySelector('[rel="author"], .author, [itemprop="author"], meta[name="author"]') !== null;
                        const hasDate = document.querySelector('time, [itemprop="datePublished"], meta[property="article:published_time"]') !== null;
                        const metaDesc = document.querySelector('meta[name="description"]');

                        const images = document.querySelectorAll('img');
                        const imagesWithAlt = [...images].filter(img => img.alt && img.alt.trim().length > 0).length;

                        return {
                            headings: {
                                h1: h1s.length,
                                h2: h2s.length,
                                h3: h3s.length,
                                questions: questionHeadings.length
                            },
                            wordCount,
                            hasSchema: schemaTypes.length > 0,
                            schemaTypes,
                            hasFAQ,
                            hasAuthor,
                            hasDate,
                            metaDescription: metaDesc !== null && (metaDesc.getAttribute('content')?.length || 0) > 0,
                            imagesWithAlt,
                            imagesTotal: images.length
                        };
                    }
                }, (results) => {
                    if (results?.[0]?.result) {
                        resolve(results[0].result);
                    } else {
                        resolve({
                            headings: { h1: 0, h2: 0, h3: 0, questions: 0 },
                            wordCount: 0,
                            hasSchema: false,
                            schemaTypes: [],
                            hasFAQ: false,
                            hasAuthor: false,
                            hasDate: false,
                            metaDescription: false,
                            imagesWithAlt: 0,
                            imagesTotal: 0
                        });
                    }
                });
            });
        });
    };

    const handleAnalyze = async () => {
        if (!context?.content) {
            setStatus('No page content available. Navigate to a page first.');
            return;
        }

        setStatus('Extracting page metrics...');
        const pageMetrics = await extractPageMetrics();
        setMetrics(pageMetrics);

        setStatus('Analyzing AEO factors with AI...');

        const prompt = `You are an expert in Answer Engine Optimization (AEO) - optimizing content to be cited by AI systems like ChatGPT, Perplexity, Google AI Overviews, and Claude.

Analyze this webpage for AEO quality. Return a JSON object with EXACTLY this structure:

{
  "score": {
    "total": <0-100 overall score>,
    "directAnswers": <0-25 score for direct answer implementation>,
    "questionStructure": <0-25 score for question-based headers>,
    "eeatSignals": <0-25 score for E-E-A-T signals>,
    "technicalQuality": <0-25 score for technical/semantic quality>
  },
  "contentType": "<Article|Product|Service|Documentation|Landing Page|Blog|Other>",
  "summary": "<2-3 sentence AEO assessment>",
  "issues": [
    {
      "type": "critical|warning|passed",
      "category": "Direct Answers|Question Structure|E-E-A-T|Technical|Schema",
      "title": "<short issue title>",
      "description": "<what's wrong or right>",
      "recommendation": "<how to fix, if applicable>"
    }
  ],
  "targetAudience": ["<persona 1>", "<persona 2>"],
  "schemaRecommendations": ["<schema type 1>", "<schema type 2>"],
  "quickWins": ["<quick improvement 1>", "<quick improvement 2>", "<quick improvement 3>"]
}

SCORING CRITERIA (evidence-based):

**Direct Answers (0-25 points)**:
- Look for 40-60 word opening paragraphs that directly answer questions
- Check if content provides concise, quotable answers
- 25 = multiple clear direct answers, 0 = no direct answers

**Question Structure (0-25 points)**:
- Calculate: (question-formatted headings / total headings) × 25
- Headers starting with What, How, Why, When, Who, etc.
- 25 = all headers are questions, 0 = no question headers

**E-E-A-T Signals (0-25 points)**:
- Experience: First-hand accounts, case studies, examples
- Expertise: Author credentials, technical depth
- Authority: Citations, references, brand recognition signals
- Trust: Dates, sources, transparent authorship
- 25 = strong all signals, 0 = no signals

**Technical Quality (0-25 points)**:
- Schema markup present and appropriate
- Meta description optimized
- Content freshness indicators
- Semantic HTML structure
- Image alt texts
- 25 = excellent technical, 0 = poor technical

PAGE METRICS (use these for scoring):
- H1 tags: ${pageMetrics.headings.h1}
- H2 tags: ${pageMetrics.headings.h2}
- H3 tags: ${pageMetrics.headings.h3}
- Question-format headings: ${pageMetrics.headings.questions}
- Word count: ${pageMetrics.wordCount}
- Has Schema: ${pageMetrics.hasSchema} (types: ${pageMetrics.schemaTypes.join(', ') || 'none'})
- Has FAQ: ${pageMetrics.hasFAQ}
- Has Author: ${pageMetrics.hasAuthor}
- Has Date: ${pageMetrics.hasDate}
- Has Meta Description: ${pageMetrics.metaDescription}
- Images with alt: ${pageMetrics.imagesWithAlt}/${pageMetrics.imagesTotal}

PAGE CONTENT:
Title: ${context.title}
URL: ${context.url}
Description: ${context.meta?.description || 'None'}

Content (first 6000 chars):
${context.content?.substring(0, 6000) || ''}

Provide 5-8 issues (mix of critical, warning, and passed). Be specific with evidence from the content.`;

        try {
            const data = await generateContent(
                prompt,
                "You are an AEO (Answer Engine Optimization) expert. Analyze pages for AI-citation readiness. Be evidence-based and specific. Always return valid JSON.",
                { jsonMode: true }
            );

            setAnalysis(data);
            setStatus('');
        } catch (err) {
            console.error('AEO Analysis error:', err);
            setStatus('Analysis failed. Please try again.');
        }
    };

    const generateSchemaMarkup = async () => {
        if (!context || !analysis) return;

        setStatus('Generating schema markup...');

        const schemaPrompt = `Generate production-ready JSON-LD schema markup for this page.

Page Info:
- URL: ${context.url}
- Title: ${context.title}
- Type: ${analysis.contentType}
- Recommended schemas: ${analysis.schemaRecommendations.join(', ')}

Content summary: ${context.content?.substring(0, 2000) || ''}

Generate a complete, valid JSON-LD script tag with appropriate schema types. Include:
1. WebSite or WebPage schema
2. ${analysis.contentType === 'Article' || analysis.contentType === 'Blog' ? 'Article/BlogPosting schema' : 'Organization schema'}
3. FAQPage if there are Q&A patterns
4. BreadcrumbList if navigation hierarchy is apparent

Return ONLY the JSON-LD code block, no markdown, no explanation. Must be valid JSON that can be directly embedded in HTML.`;

        try {
            const schema = await generateContent(
                schemaPrompt,
                "You are a schema markup expert. Generate valid, production-ready JSON-LD. Return only the JSON code.",
                { jsonMode: false }
            );

            // Clean up any markdown formatting
            let cleanSchema = schema
                .replace(/^```json?\n?/gm, '')
                .replace(/```$/gm, '')
                .trim();

            setGeneratedSchema(cleanSchema);
            setStatus('');
            setExpandedSections(new Set([...expandedSections, 'schema']));
        } catch (err) {
            console.error('Schema generation error:', err);
            setStatus('Schema generation failed.');
        }
    };

    const copySchema = () => {
        navigator.clipboard.writeText(generatedSchema);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        if (score >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    const getScoreBg = (score: number) => {
        if (score >= 80) return 'from-green-500 to-emerald-500';
        if (score >= 60) return 'from-yellow-500 to-amber-500';
        if (score >= 40) return 'from-orange-500 to-red-500';
        return 'from-red-500 to-rose-500';
    };

    const IssueIcon = ({ type }: { type: string }) => {
        switch (type) {
            case 'critical': return <XCircle size={14} className="text-red-400" />;
            case 'warning': return <AlertTriangle size={14} className="text-yellow-400" />;
            case 'passed': return <CheckCircle2 size={14} className="text-green-400" />;
            default: return null;
        }
    };

    const SectionHeader = ({ id, icon: Icon, title, badge }: { id: string; icon: any; title: string; badge?: string }) => (
        <button
            onClick={() => toggleSection(id)}
            className="w-full flex items-center justify-between py-2 text-left"
        >
            <div className="flex items-center gap-2">
                <Icon size={14} className="text-slate-400" />
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">{title}</span>
                {badge && <span className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] text-slate-300">{badge}</span>}
            </div>
            {expandedSections.has(id) ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </button>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/20">
                    <Search size={28} className="text-white" />
                </div>
                <h2 className="text-lg font-bold">AEO Analyzer</h2>
                <p className="text-xs text-slate-400 mt-1">Answer Engine Optimization for AI citations</p>
            </div>

            {/* Current Page Info */}
            {context?.url && (
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <p className="text-xs text-slate-400 truncate">{context.url}</p>
                    <p className="text-sm text-slate-200 font-medium truncate mt-1">{context.title}</p>
                </div>
            )}

            {/* Analyze Button */}
            {!analysis && (
                <button
                    onClick={handleAnalyze}
                    disabled={loading || !context?.content}
                    className="btn-primary w-full flex items-center justify-center gap-2 !bg-gradient-to-r !from-cyan-600 !to-blue-600"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Sparkles size={18} />
                            Analyze for AEO
                        </>
                    )}
                </button>
            )}

            {/* Status */}
            {status && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-xl flex items-center gap-2">
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    {status}
                </div>
            )}

            {/* Results */}
            {analysis && (
                <div className="space-y-4 animate-in">
                    {/* Score Card */}
                    <div className={`p-6 rounded-2xl bg-gradient-to-br ${getScoreBg(analysis.score.total)} relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white/70 text-xs uppercase tracking-wider">AEO Score</p>
                                    <p className="text-5xl font-bold text-white mt-1">{analysis.score.total}</p>
                                    <p className="text-white/70 text-xs mt-1">out of 100</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <div className="flex items-center gap-2 text-xs text-white/80">
                                        <MessageSquareQuote size={12} />
                                        Direct Answers: {analysis.score.directAnswers}/25
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-white/80">
                                        <HelpCircle size={12} />
                                        Questions: {analysis.score.questionStructure}/25
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-white/80">
                                        <Shield size={12} />
                                        E-E-A-T: {analysis.score.eeatSignals}/25
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-white/80">
                                        <FileCode size={12} />
                                        Technical: {analysis.score.technicalQuality}/25
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <p className="text-sm text-slate-300">{analysis.summary}</p>
                        <div className="flex gap-2 mt-3">
                            <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-lg border border-cyan-500/30">{analysis.contentType}</span>
                            {analysis.targetAudience.slice(0, 2).map((audience, i) => (
                                <span key={i} className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-lg flex items-center gap-1 border border-slate-600/50">
                                    <Users size={10} /> {audience}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Quick Wins */}
                    {analysis.quickWins?.length > 0 && (
                        <div className="space-y-2">
                            <SectionHeader id="quickwins" icon={Zap} title="Quick Wins" />
                            {expandedSections.has('quickwins') && (
                                <div className="space-y-2">
                                    {analysis.quickWins.map((win, i) => (
                                        <div key={i} className="flex gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-slate-300">
                                            <Zap size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
                                            {win}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Issues */}
                    <div className="space-y-2">
                        <SectionHeader
                            id="issues"
                            icon={BarChart3}
                            title="Analysis Details"
                            badge={`${analysis.issues.filter(i => i.type === 'critical').length} critical`}
                        />
                        {expandedSections.has('issues') && (
                            <div className="space-y-2">
                                {/* Critical first, then warnings, then passed */}
                                {['critical', 'warning', 'passed'].map(type =>
                                    analysis.issues
                                        .filter(issue => issue.type === type)
                                        .map((issue, i) => (
                                            <div
                                                key={`${type}-${i}`}
                                                className={`p-3 rounded-xl border ${
                                                    type === 'critical' ? 'bg-red-500/10 border-red-500/20' :
                                                    type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' :
                                                    'bg-green-500/10 border-green-500/20'
                                                }`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <IssueIcon type={type} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-medium text-slate-200">{issue.title}</span>
                                                            <span className="text-[10px] text-slate-500">{issue.category}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-400 mt-1">{issue.description}</p>
                                                        {issue.recommendation && (
                                                            <p className="text-xs text-cyan-400 mt-2">
                                                                <strong>Fix:</strong> {issue.recommendation}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Page Metrics */}
                    {metrics && (
                        <div className="space-y-2">
                            <SectionHeader id="metrics" icon={BarChart3} title="Page Metrics" />
                            {expandedSections.has('metrics') && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                        <p className="text-xs text-slate-500">Word Count</p>
                                        <p className="text-lg font-bold text-slate-200">{metrics.wordCount.toLocaleString()}</p>
                                    </div>
                                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                        <p className="text-xs text-slate-500">Question Headers</p>
                                        <p className="text-lg font-bold text-slate-200">{metrics.headings.questions}/{metrics.headings.h1 + metrics.headings.h2 + metrics.headings.h3}</p>
                                    </div>
                                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                        <p className="text-xs text-slate-500">Schema Types</p>
                                        <p className="text-sm font-bold text-slate-200">{metrics.schemaTypes.length > 0 ? metrics.schemaTypes.join(', ') : 'None'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                        <p className="text-xs text-slate-500">Images with Alt</p>
                                        <p className="text-lg font-bold text-slate-200">{metrics.imagesWithAlt}/{metrics.imagesTotal}</p>
                                    </div>
                                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-center gap-2">
                                        {metrics.hasAuthor ? <CheckCircle2 size={16} className="text-green-400" /> : <XCircle size={16} className="text-red-400" />}
                                        <span className="text-xs text-slate-300">Author Info</span>
                                    </div>
                                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-center gap-2">
                                        {metrics.hasDate ? <CheckCircle2 size={16} className="text-green-400" /> : <XCircle size={16} className="text-red-400" />}
                                        <span className="text-xs text-slate-300">Publish Date</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Generate Schema */}
                    <div className="space-y-2">
                        <SectionHeader id="schema" icon={FileCode} title="Schema Markup" />
                        {expandedSections.has('schema') && (
                            <div className="space-y-3">
                                {!generatedSchema ? (
                                    <button
                                        onClick={generateSchemaMarkup}
                                        disabled={loading}
                                        className="w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                                        style={{
                                            backgroundColor: 'hsl(222 47% 11%)',
                                            border: '1px solid hsl(222 47% 18% / 0.5)',
                                            color: 'hsl(210 40% 98%)',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            opacity: loading ? 0.5 : 1
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!loading) {
                                                e.currentTarget.style.backgroundColor = 'hsl(222 47% 15%)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'hsl(222 47% 11%)';
                                        }}
                                    >
                                        {loading ? <Loader2 size={16} className="animate-spin" /> : <FileCode size={16} />}
                                        Generate Schema Markup
                                    </button>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <pre className="p-4 bg-slate-900 rounded-xl overflow-x-auto text-xs text-slate-300 max-h-64">
                                                <code>{generatedSchema}</code>
                                            </pre>
                                            <button
                                                onClick={copySchema}
                                                className="absolute top-2 right-2 p-2 rounded-lg transition-colors"
                                                style={{
                                                    backgroundColor: 'hsl(222 47% 11%)',
                                                    border: '1px solid hsl(222 47% 18% / 0.5)',
                                                    color: 'hsl(210 40% 98%)'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'hsl(222 47% 15%)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'hsl(222 47% 11%)';
                                                }}
                                            >
                                                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Add this to your page's &lt;head&gt; section to improve AI-citation potential.
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Re-analyze Button */}
                    <button
                        onClick={() => {
                            setAnalysis(null);
                            setMetrics(null);
                            setGeneratedSchema('');
                        }}
                        className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        Analyze Again
                    </button>
                </div>
            )}

            {error && (
                <div className="p-3 bg-red-900/20 border border-red-500/20 text-red-500 text-xs rounded-lg">
                    {error}
                </div>
            )}
        </div>
    );
};

export default AEOAnalyzer;
