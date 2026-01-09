import React, { useState } from 'react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import {
    ShieldCheck,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    User,
    Calendar,
    Globe,
    FileText,
    Link,
    Award,
    Building,
    ExternalLink,
    Clock,
    BookOpen
} from 'lucide-react';

interface CredibilityScore {
    total: number;
    authorCredibility: number;
    contentQuality: number;
    sourceTransparency: number;
    citationStrength: number;
}

interface CredibilityReport {
    score: CredibilityScore;
    verdict: 'highly_credible' | 'credible' | 'mixed' | 'questionable' | 'unreliable';
    summary: string;
    signals: {
        positive: string[];
        negative: string[];
        neutral: string[];
    };
    authorInfo: {
        found: boolean;
        name?: string;
        credentials?: string;
        verifiable: boolean;
    };
    publicationInfo: {
        hasDate: boolean;
        date?: string;
        isRecent: boolean;
        hasUpdates: boolean;
    };
    sourceType: string;
    recommendations: string[];
}

interface PageSignals {
    hasAuthor: boolean;
    authorName: string | null;
    hasDate: boolean;
    publishDate: string | null;
    updateDate: string | null;
    hasCitations: boolean;
    citationCount: number;
    hasAboutPage: boolean;
    hasContactPage: boolean;
    isHttps: boolean;
    domain: string;
    domainAge: string | null;
    hasPrivacyPolicy: boolean;
    externalLinks: number;
    socialProof: string[];
}

const SourceCredibility: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading, error } = useGemini();
    const [report, setReport] = useState<CredibilityReport | null>(null);
    const [signals, setSignals] = useState<PageSignals | null>(null);
    const [status, setStatus] = useState('');

    const extractSignals = async (): Promise<PageSignals> => {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];
                if (!tab?.id) {
                    resolve(defaultSignals());
                    return;
                }

                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        const getMeta = (selectors: string[]): string | null => {
                            for (const sel of selectors) {
                                const el = document.querySelector(sel);
                                if (el) {
                                    const content = el.getAttribute('content') || el.textContent;
                                    if (content?.trim()) return content.trim();
                                }
                            }
                            return null;
                        };

                        // Author
                        const authorName = getMeta([
                            'meta[name="author"]',
                            '[rel="author"]',
                            '[itemprop="author"]',
                            '.author',
                            '.byline',
                            '[class*="author-name"]'
                        ]);

                        // Dates
                        const publishDate = getMeta([
                            'meta[property="article:published_time"]',
                            'meta[name="date"]',
                            'time[datetime]',
                            '[itemprop="datePublished"]'
                        ]);

                        const updateDate = getMeta([
                            'meta[property="article:modified_time"]',
                            '[itemprop="dateModified"]'
                        ]);

                        // Citations & References
                        const citationElements = document.querySelectorAll(
                            'a[href*="doi.org"], a[href*="ncbi"], a[href*="scholar.google"], ' +
                            '.citation, .reference, [class*="footnote"], sup a[href^="#"]'
                        );
                        const hasCitations = citationElements.length > 0;

                        // External links
                        const allLinks = document.querySelectorAll('a[href^="http"]');
                        const currentDomain = window.location.hostname;
                        const externalLinks = [...allLinks].filter(a => {
                            try {
                                const href = a.getAttribute('href') || '';
                                return !href.includes(currentDomain);
                            } catch {
                                return false;
                            }
                        }).length;

                        // Page structure signals
                        const hasAboutPage = !!document.querySelector('a[href*="about"], a[href*="team"], a[href*="who-we-are"]');
                        const hasContactPage = !!document.querySelector('a[href*="contact"], a[href*="get-in-touch"]');
                        const hasPrivacyPolicy = !!document.querySelector('a[href*="privacy"], a[href*="policy"]');

                        // Social proof
                        const socialProof: string[] = [];
                        if (document.querySelector('[class*="verified"], .verified')) {
                            socialProof.push('Verified badge found');
                        }
                        if (document.querySelector('[itemprop="publisher"]')) {
                            socialProof.push('Publisher information present');
                        }
                        const schemaOrg = document.querySelector('script[type="application/ld+json"]');
                        if (schemaOrg) {
                            try {
                                const data = JSON.parse(schemaOrg.textContent || '');
                                if (data.publisher || data.author) {
                                    socialProof.push('Structured data with attribution');
                                }
                            } catch {}
                        }

                        return {
                            hasAuthor: !!authorName,
                            authorName,
                            hasDate: !!publishDate,
                            publishDate,
                            updateDate,
                            hasCitations,
                            citationCount: citationElements.length,
                            hasAboutPage,
                            hasContactPage,
                            isHttps: window.location.protocol === 'https:',
                            domain: window.location.hostname,
                            domainAge: null, // Would need external API
                            hasPrivacyPolicy,
                            externalLinks,
                            socialProof
                        };
                    }
                }, (results) => {
                    if (results?.[0]?.result) {
                        resolve(results[0].result);
                    } else {
                        resolve(defaultSignals());
                    }
                });
            });
        });
    };

    const defaultSignals = (): PageSignals => ({
        hasAuthor: false,
        authorName: null,
        hasDate: false,
        publishDate: null,
        updateDate: null,
        hasCitations: false,
        citationCount: 0,
        hasAboutPage: false,
        hasContactPage: false,
        isHttps: true,
        domain: context?.url ? new URL(context.url).hostname : '',
        domainAge: null,
        hasPrivacyPolicy: false,
        externalLinks: 0,
        socialProof: []
    });

    const analyzeCredibility = async () => {
        if (!context?.content) {
            setStatus('No page content available');
            return;
        }

        setStatus('Extracting page signals...');
        const pageSignals = await extractSignals();
        setSignals(pageSignals);

        setStatus('Analyzing source credibility...');

        const prompt = `Analyze the credibility of this webpage as an information source. Return a JSON object with EXACTLY this structure:

{
  "score": {
    "total": <0-100 overall credibility score>,
    "authorCredibility": <0-25 based on author identification and credentials>,
    "contentQuality": <0-25 based on writing quality, accuracy indicators>,
    "sourceTransparency": <0-25 based on clear sourcing, about page, contact info>,
    "citationStrength": <0-25 based on references, external sources, evidence>
  },
  "verdict": "<highly_credible|credible|mixed|questionable|unreliable>",
  "summary": "<2-3 sentence assessment of this source's credibility>",
  "signals": {
    "positive": ["positive credibility signal 1", "positive signal 2"],
    "negative": ["negative/concerning signal 1", "signal 2"],
    "neutral": ["neutral observation 1"]
  },
  "authorInfo": {
    "found": <true|false>,
    "name": "<author name if found>",
    "credentials": "<any credentials mentioned>",
    "verifiable": <true|false - can the author be verified externally>
  },
  "publicationInfo": {
    "hasDate": <true|false>,
    "date": "<publication date if found>",
    "isRecent": <true|false - is content from last 2 years>,
    "hasUpdates": <true|false>
  },
  "sourceType": "<News|Blog|Academic|Corporate|Government|Personal|Wiki|Forum|Unknown>",
  "recommendations": ["recommendation 1 for readers", "recommendation 2"]
}

SCORING CRITERIA:

**Author Credibility (0-25)**:
- Named author with bio: +10
- Verifiable credentials: +10
- Contact or social links: +5
- Anonymous or pseudonymous: -10

**Content Quality (0-25)**:
- Clear, professional writing: +10
- Balanced perspective: +5
- Factual claims with evidence: +10
- Sensational language: -5
- Spelling/grammar errors: -5

**Source Transparency (0-25)**:
- About/team page exists: +5
- Contact information: +5
- Editorial standards mentioned: +5
- Organization identified: +5
- Privacy policy: +5

**Citation Strength (0-25)**:
- External references present: +10
- Links to primary sources: +10
- Academic citations: +5
- No sources: -10

PAGE SIGNALS DETECTED:
- Has Author: ${pageSignals.hasAuthor} ${pageSignals.authorName ? `(${pageSignals.authorName})` : ''}
- Has Publish Date: ${pageSignals.hasDate} ${pageSignals.publishDate ? `(${pageSignals.publishDate})` : ''}
- Has Update Date: ${!!pageSignals.updateDate}
- Citation Elements: ${pageSignals.citationCount}
- External Links: ${pageSignals.externalLinks}
- Has About Page: ${pageSignals.hasAboutPage}
- Has Contact Page: ${pageSignals.hasContactPage}
- Has Privacy Policy: ${pageSignals.hasPrivacyPolicy}
- HTTPS: ${pageSignals.isHttps}
- Domain: ${pageSignals.domain}
- Social Proof: ${pageSignals.socialProof.join(', ') || 'None detected'}

PAGE CONTENT:
Title: ${context.title}
URL: ${context.url}
Description: ${context.meta?.description || 'None'}

Content (first 5000 chars):
${context.content?.substring(0, 5000) || ''}

Be evidence-based. If you can't verify something, mark it as unverifiable. Consider the domain reputation if it's a well-known source.`;

        try {
            const data = await generateContent(
                prompt,
                "You are an expert media literacy analyst and fact-checker. Evaluate sources objectively based on evidence. Be fair but rigorous. Always return valid JSON.",
                { jsonMode: true }
            );

            setReport(data);
            setStatus('');
        } catch (err) {
            console.error('Analysis error:', err);
            setStatus('Analysis failed. Please try again.');
        }
    };

    const getVerdictColor = (verdict: string) => {
        switch (verdict) {
            case 'highly_credible': return 'from-green-500 to-emerald-500';
            case 'credible': return 'from-blue-500 to-cyan-500';
            case 'mixed': return 'from-yellow-500 to-amber-500';
            case 'questionable': return 'from-orange-500 to-red-500';
            case 'unreliable': return 'from-red-500 to-rose-600';
            default: return 'from-slate-500 to-slate-600';
        }
    };

    const getVerdictLabel = (verdict: string) => {
        switch (verdict) {
            case 'highly_credible': return 'Highly Credible';
            case 'credible': return 'Generally Credible';
            case 'mixed': return 'Mixed Credibility';
            case 'questionable': return 'Questionable';
            case 'unreliable': return 'Unreliable';
            default: return 'Unknown';
        }
    };

    const SignalIcon = ({ type }: { type: 'positive' | 'negative' | 'neutral' }) => {
        switch (type) {
            case 'positive': return <CheckCircle2 size={14} className="text-green-400" />;
            case 'negative': return <XCircle size={14} className="text-red-400" />;
            case 'neutral': return <AlertTriangle size={14} className="text-yellow-400" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/20">
                    <ShieldCheck size={28} className="text-white" />
                </div>
                <h2 className="text-lg font-bold">Source Credibility</h2>
                <p className="text-xs text-slate-400 mt-1">Evaluate trustworthiness & reliability</p>
            </div>

            {/* Current Page */}
            {context?.url && (
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <p className="text-xs text-slate-400 truncate">{context.url}</p>
                    <p className="text-sm text-slate-200 font-medium truncate mt-1">{context.title}</p>
                </div>
            )}

            {/* Analyze Button */}
            {!report && (
                <button
                    onClick={analyzeCredibility}
                    disabled={loading || !context?.content}
                    className="btn-primary w-full flex items-center justify-center gap-2 !bg-gradient-to-r !from-indigo-600 !to-purple-600"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <ShieldCheck size={18} />
                            Analyze Credibility
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
            {report && (
                <div className="space-y-6 animate-in">
                    {/* Score Card */}
                    <div className={`p-6 rounded-2xl bg-gradient-to-br ${getVerdictColor(report.verdict)} relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white/70 text-xs uppercase tracking-wider">Credibility Score</p>
                                    <p className="text-5xl font-bold text-white mt-1">{report.score.total}</p>
                                    <p className="text-white font-medium mt-1">{getVerdictLabel(report.verdict)}</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <div className="flex items-center gap-2 text-xs text-white/80">
                                        <User size={12} />
                                        Author: {report.score.authorCredibility}/25
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-white/80">
                                        <FileText size={12} />
                                        Content: {report.score.contentQuality}/25
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-white/80">
                                        <Building size={12} />
                                        Transparency: {report.score.sourceTransparency}/25
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-white/80">
                                        <BookOpen size={12} />
                                        Citations: {report.score.citationStrength}/25
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <p className="text-sm text-slate-300">{report.summary}</p>
                        <div className="flex gap-2 mt-3">
                            <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded-lg border border-indigo-500/30">{report.sourceType}</span>
                        </div>
                    </div>

                    {/* Author Info */}
                    <div className="space-y-2">
                        <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
                            <User size={12} /> Author Information
                        </h3>
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            {report.authorInfo.found ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={14} className="text-green-400" />
                                        <span className="text-sm text-slate-200">{report.authorInfo.name}</span>
                                    </div>
                                    {report.authorInfo.credentials && (
                                        <p className="text-xs text-slate-400 ml-6">{report.authorInfo.credentials}</p>
                                    )}
                                    <p className="text-xs text-slate-500 ml-6">
                                        {report.authorInfo.verifiable ? '✓ Verifiable identity' : '⚠ Not independently verifiable'}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <XCircle size={14} className="text-red-400" />
                                    <span className="text-sm text-slate-400">No author information found</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Publication Info */}
                    <div className="space-y-2">
                        <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
                            <Calendar size={12} /> Publication Info
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-center gap-2">
                                {report.publicationInfo.hasDate ? (
                                    <CheckCircle2 size={14} className="text-green-400" />
                                ) : (
                                    <XCircle size={14} className="text-red-400" />
                                )}
                                <div>
                                    <p className="text-xs text-slate-500">Date</p>
                                    <p className="text-sm text-slate-200">{report.publicationInfo.date || 'Not found'}</p>
                                </div>
                            </div>
                            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-center gap-2">
                                {report.publicationInfo.isRecent ? (
                                    <CheckCircle2 size={14} className="text-green-400" />
                                ) : (
                                    <AlertTriangle size={14} className="text-yellow-400" />
                                )}
                                <div>
                                    <p className="text-xs text-slate-500">Freshness</p>
                                    <p className="text-sm text-slate-200">{report.publicationInfo.isRecent ? 'Recent' : 'May be outdated'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Credibility Signals */}
                    <div className="space-y-2">
                        <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Credibility Signals</h3>

                        {/* Positive */}
                        {report.signals.positive.length > 0 && (
                            <div className="space-y-1">
                                {report.signals.positive.map((signal, i) => (
                                    <div key={i} className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                                        <SignalIcon type="positive" />
                                        <span className="text-xs text-slate-300">{signal}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Negative */}
                        {report.signals.negative.length > 0 && (
                            <div className="space-y-1">
                                {report.signals.negative.map((signal, i) => (
                                    <div key={i} className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        <SignalIcon type="negative" />
                                        <span className="text-xs text-slate-300">{signal}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Neutral */}
                        {report.signals.neutral.length > 0 && (
                            <div className="space-y-1">
                                {report.signals.neutral.map((signal, i) => (
                                    <div key={i} className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                        <SignalIcon type="neutral" />
                                        <span className="text-xs text-slate-300">{signal}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recommendations */}
                    {report.recommendations.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Reader Recommendations</h3>
                            <div className="space-y-2">
                                {report.recommendations.map((rec, i) => (
                                    <div key={i} className="flex items-start gap-2 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                        <Award size={14} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-xs text-slate-300">{rec}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reset */}
                    <button
                        onClick={() => {
                            setReport(null);
                            setSignals(null);
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

export default SourceCredibility;
