import React, { useState } from 'react';
import { ShieldCheck, Search, AlertTriangle, CheckCircle, XCircle, ExternalLink, Loader2, Globe } from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';

interface FactCheckResult {
    claim: string;
    verdict: 'true' | 'mostly_true' | 'mixed' | 'mostly_false' | 'false' | 'unverifiable';
    confidence: number;
    explanation: string;
    evidence: string[];
    sources: Array<{ uri: string; title?: string }>;
}

interface FactCheckReport {
    pageTitle: string;
    url: string;
    overallAssessment: {
        accuracy: 'high' | 'moderate' | 'low' | 'unknown';
        score: number;
        summary: string;
    };
    claims: FactCheckResult[];
    methodology: string;
}

const FactCheckerApp: React.FC = () => {
    const { context } = usePageContext();
    const { generateWithSearch, loading } = useGemini();
    const [report, setReport] = useState<FactCheckReport | null>(null);
    const [status, setStatus] = useState('');
    const [customClaim, setCustomClaim] = useState('');

    const getVerdictIcon = (verdict: string) => {
        const iconProps = { size: 18 };
        switch (verdict) {
            case 'true':
                return <CheckCircle {...iconProps} style={{ color: 'hsl(142 71% 55%)' }} />;
            case 'mostly_true':
                return <CheckCircle {...iconProps} style={{ color: 'hsl(142 71% 70%)' }} />;
            case 'mixed':
                return <AlertTriangle {...iconProps} style={{ color: 'hsl(45 93% 55%)' }} />;
            case 'mostly_false':
                return <XCircle {...iconProps} style={{ color: 'hsl(24 95% 55%)' }} />;
            case 'false':
                return <XCircle {...iconProps} style={{ color: 'hsl(0 84% 60%)' }} />;
            default:
                return <AlertTriangle {...iconProps} style={{ color: 'hsl(215 20% 55%)' }} />;
        }
    };

    const getVerdictStyles = (verdict: string) => {
        switch (verdict) {
            case 'true': return { color: 'hsl(142 71% 55%)', bg: 'hsl(142 71% 45% / 0.15)' };
            case 'mostly_true': return { color: 'hsl(142 71% 70%)', bg: 'hsl(142 71% 45% / 0.1)' };
            case 'mixed': return { color: 'hsl(45 93% 55%)', bg: 'hsl(45 93% 55% / 0.15)' };
            case 'mostly_false': return { color: 'hsl(24 95% 55%)', bg: 'hsl(24 95% 55% / 0.15)' };
            case 'false': return { color: 'hsl(0 84% 60%)', bg: 'hsl(0 84% 60% / 0.15)' };
            default: return { color: 'hsl(215 20% 55%)', bg: 'hsl(215 20% 55% / 0.15)' };
        }
    };

    const handleFactCheck = async () => {
        if (!context) return;

        setStatus('Analyzing page content and fact-checking with Google Search...');

        try {
            const prompt = `You are a professional fact-checker. Analyze this webpage content and fact-check the key claims using current, verified information.

PAGE INFORMATION:
Title: ${context.title}
URL: ${context.url}

CONTENT TO FACT-CHECK:
${context.content?.substring(0, 8000) || ''}

YOUR TASK:
1. Identify 3-5 key factual claims made in the content
2. Verify each claim against reliable sources
3. Provide a verdict for each claim
4. Give an overall accuracy assessment

Return a JSON object with this structure:
{
    "pageTitle": "title of the page",
    "url": "url of the page",
    "overallAssessment": {
        "accuracy": "high|moderate|low|unknown",
        "score": 0-100,
        "summary": "Brief overall assessment"
    },
    "claims": [
        {
            "claim": "The specific claim being checked",
            "verdict": "true|mostly_true|mixed|mostly_false|false|unverifiable",
            "confidence": 0-100,
            "explanation": "Why this verdict was reached",
            "evidence": ["Supporting evidence point 1", "Evidence point 2"]
        }
    ],
    "methodology": "Brief explanation of fact-checking approach"
}

Be objective and evidence-based. If something cannot be verified, mark it as unverifiable.`;

            const result = await generateWithSearch(prompt,
                "You are an expert fact-checker. Always verify claims against multiple reliable sources. Be objective and evidence-based."
            );

            // Parse the JSON from the response text
            let jsonMatch = result.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                // Add sources from grounding
                parsed.claims = parsed.claims.map((claim: any) => ({
                    ...claim,
                    sources: result.sources
                }));
                setReport(parsed);
                setStatus('');
            } else {
                throw new Error('Could not parse fact-check results');
            }
        } catch (err: any) {
            console.error('Fact check error:', err);
            setStatus('Fact-checking failed. Please try again.');
        }
    };

    const handleCheckClaim = async () => {
        if (!customClaim.trim()) return;

        setStatus('Verifying claim with Google Search...');

        try {
            const result = await generateWithSearch(
                `Fact-check this claim: "${customClaim}"

Provide a verdict (true, mostly_true, mixed, mostly_false, false, or unverifiable) and explain your reasoning with evidence.

Return JSON:
{
    "claim": "the claim",
    "verdict": "verdict",
    "confidence": 0-100,
    "explanation": "detailed explanation",
    "evidence": ["evidence points"]
}`,
                "You are a professional fact-checker. Verify claims using reliable sources."
            );

            let jsonMatch = result.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const claim = JSON.parse(jsonMatch[0]);
                claim.sources = result.sources;

                // Add to existing report or create new one
                if (report) {
                    setReport({
                        ...report,
                        claims: [claim, ...report.claims]
                    });
                } else {
                    setReport({
                        pageTitle: 'Custom Claim Check',
                        url: '',
                        overallAssessment: {
                            accuracy: 'unknown',
                            score: 0,
                            summary: 'Individual claim verification'
                        },
                        claims: [claim],
                        methodology: 'Google Search grounding with AI verification'
                    });
                }
                setCustomClaim('');
                setStatus('');
            }
        } catch (err: any) {
            console.error('Claim check error:', err);
            setStatus('Verification failed. Please try again.');
        }
    };

    const getAccuracyStyles = (accuracy: string) => {
        switch (accuracy) {
            case 'high': return { bg: 'hsl(142 71% 45% / 0.1)', border: 'hsl(142 71% 45% / 0.25)', badge: 'hsl(142 71% 45% / 0.2)', badgeText: 'hsl(142 71% 55%)', bar: 'hsl(142 71% 45%)' };
            case 'moderate': return { bg: 'hsl(45 93% 55% / 0.1)', border: 'hsl(45 93% 55% / 0.25)', badge: 'hsl(45 93% 55% / 0.2)', badgeText: 'hsl(45 93% 55%)', bar: 'hsl(45 93% 55%)' };
            case 'low': return { bg: 'hsl(0 84% 60% / 0.1)', border: 'hsl(0 84% 60% / 0.25)', badge: 'hsl(0 84% 60% / 0.2)', badgeText: 'hsl(0 84% 60%)', bar: 'hsl(0 84% 60%)' };
            default: return { bg: 'hsl(222 47% 13%)', border: 'hsl(222 47% 20%)', badge: 'hsl(222 47% 18%)', badgeText: 'hsl(215 20% 55%)', bar: 'hsl(215 20% 55%)' };
        }
    };

    return (
        <div className="space-y-6">
            {/* Current Page Info */}
            {context && (
                <div style={{
                    padding: '14px 16px',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(222 47% 18%)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <Globe size={16} style={{ color: 'hsl(215 20% 55%)', marginTop: '2px', flexShrink: 0 }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: '13px', color: 'hsl(210 40% 98%)', fontWeight: 600 }} className="truncate">{context.title}</p>
                            <p style={{ fontSize: '11px', color: 'hsl(215 20% 50%)', marginTop: '4px' }} className="truncate">{context.url}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Claim Input */}
            <div className="space-y-3">
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>
                    Check Specific Claim
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        value={customClaim}
                        onChange={(e) => setCustomClaim(e.target.value)}
                        placeholder="Enter a claim to verify..."
                        style={{
                            flex: 1,
                            padding: '12px 14px',
                            backgroundColor: 'hsl(222 47% 11%)',
                            border: '1px solid hsl(222 47% 20%)',
                            borderRadius: '12px',
                            color: 'hsl(210 40% 98%)',
                            fontSize: '13px',
                            outline: 'none',
                            transition: 'border-color 0.2s, box-shadow 0.2s'
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = 'hsl(207 90% 54%)';
                            e.target.style.boxShadow = '0 0 0 3px hsl(207 90% 54% / 0.15)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = 'hsl(222 47% 20%)';
                            e.target.style.boxShadow = 'none';
                        }}
                    />
                    <button
                        onClick={handleCheckClaim}
                        disabled={loading || !customClaim.trim()}
                        style={{
                            padding: '12px 16px',
                            backgroundColor: loading || !customClaim.trim() ? 'hsl(222 47% 18%)' : 'hsl(222 47% 15%)',
                            border: '1px solid hsl(222 47% 22%)',
                            borderRadius: '12px',
                            color: loading || !customClaim.trim() ? 'hsl(215 20% 45%)' : 'hsl(210 40% 98%)',
                            cursor: loading || !customClaim.trim() ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                            if (!loading && customClaim.trim()) {
                                e.currentTarget.style.backgroundColor = 'hsl(222 47% 20%)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = loading || !customClaim.trim() ? 'hsl(222 47% 18%)' : 'hsl(222 47% 15%)';
                        }}
                    >
                        <Search size={18} />
                    </button>
                </div>
            </div>

            {/* Fact Check Page Button */}
            <button
                onClick={handleFactCheck}
                disabled={loading || !context}
                style={{
                    width: '100%',
                    padding: '16px 24px',
                    background: loading || !context
                        ? 'hsl(222 47% 20%)'
                        : 'linear-gradient(135deg, hsl(207 90% 54%) 0%, hsl(220 83% 58%) 100%)',
                    border: 'none',
                    borderRadius: '14px',
                    color: loading || !context ? 'hsl(215 20% 50%)' : 'white',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: loading || !context ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.2s ease',
                    boxShadow: loading || !context ? 'none' : '0 8px 24px hsl(207 90% 54% / 0.35)',
                    opacity: loading || !context ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                    if (!loading && context) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 12px 32px hsl(207 90% 54% / 0.45)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = loading || !context ? 'none' : '0 8px 24px hsl(207 90% 54% / 0.35)';
                }}
            >
                {loading ? (
                    <>
                        <Loader2 className="animate-spin" size={18} />
                        Fact-checking...
                    </>
                ) : (
                    <>
                        <ShieldCheck size={18} />
                        Fact-Check This Page
                    </>
                )}
            </button>

            {/* Status */}
            {status && (
                <div style={{
                    padding: '14px 16px',
                    backgroundColor: status.includes('failed') ? 'hsl(0 84% 60% / 0.1)' : 'hsl(207 90% 54% / 0.1)',
                    border: `1px solid ${status.includes('failed') ? 'hsl(0 84% 60% / 0.2)' : 'hsl(207 90% 54% / 0.2)'}`,
                    borderRadius: '12px',
                    color: status.includes('failed') ? 'hsl(0 84% 65%)' : 'hsl(207 90% 65%)',
                    fontSize: '13px'
                }}>
                    {status}
                </div>
            )}

            {/* Results */}
            {report && (
                <div className="space-y-5">
                    {/* Overall Assessment */}
                    {(() => {
                        const styles = getAccuracyStyles(report.overallAssessment.accuracy);
                        return (
                            <div style={{
                                padding: '16px',
                                backgroundColor: styles.bg,
                                borderRadius: '14px',
                                border: `1px solid ${styles.border}`
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(210 40% 98%)' }}>Overall Assessment</h3>
                                    <span style={{
                                        padding: '4px 10px',
                                        backgroundColor: styles.badge,
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        color: styles.badgeText
                                    }}>
                                        {report.overallAssessment.accuracy} accuracy
                                    </span>
                                </div>
                                <p style={{ fontSize: '13px', color: 'hsl(215 20% 70%)', marginBottom: '12px' }}>{report.overallAssessment.summary}</p>
                                <div style={{ height: '6px', backgroundColor: 'hsl(222 47% 18%)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${report.overallAssessment.score}%`, backgroundColor: styles.bar, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                                </div>
                            </div>
                        );
                    })()}

                    {/* Individual Claims */}
                    <div className="space-y-3">
                        <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>Claims Verified</h3>
                        {report.claims.map((claim, idx) => {
                            const verdictStyles = getVerdictStyles(claim.verdict);
                            return (
                                <div
                                    key={idx}
                                    style={{
                                        padding: '16px',
                                        backgroundColor: 'hsl(222 47% 9%)',
                                        borderRadius: '14px',
                                        border: '1px solid hsl(222 47% 15%)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                                        {getVerdictIcon(claim.verdict)}
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '13px', color: 'hsl(210 40% 98%)', fontWeight: 600, marginBottom: '8px' }}>{claim.claim}</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    backgroundColor: verdictStyles.bg,
                                                    borderRadius: '8px',
                                                    fontSize: '10px',
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                    color: verdictStyles.color
                                                }}>
                                                    {claim.verdict.replace('_', ' ')}
                                                </span>
                                                <span style={{ fontSize: '11px', color: 'hsl(215 20% 50%)' }}>
                                                    {claim.confidence}% confidence
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <p style={{ fontSize: '12px', color: 'hsl(215 20% 65%)', marginBottom: '12px', lineHeight: 1.6 }}>{claim.explanation}</p>

                                    {claim.evidence && claim.evidence.length > 0 && (
                                        <div style={{ marginBottom: '12px', paddingTop: '12px', borderTop: '1px solid hsl(222 47% 15%)' }}>
                                            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 50%)', marginBottom: '8px' }}>Evidence</p>
                                            <ul style={{ fontSize: '12px', color: 'hsl(215 20% 60%)' }} className="space-y-2">
                                                {claim.evidence.map((e, i) => (
                                                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                        <span style={{ color: 'hsl(215 20% 40%)', marginTop: '2px' }}>•</span>
                                                        {e}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {claim.sources && claim.sources.length > 0 && (
                                        <div style={{ paddingTop: '12px', borderTop: '1px solid hsl(222 47% 15%)' }}>
                                            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 50%)', marginBottom: '8px' }}>Sources</p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {claim.sources.slice(0, 3).map((source, i) => (
                                                    <a
                                                        key={i}
                                                        href={source.uri}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '6px 10px',
                                                            backgroundColor: 'hsl(222 47% 13%)',
                                                            borderRadius: '8px',
                                                            fontSize: '11px',
                                                            color: 'hsl(207 90% 60%)',
                                                            textDecoration: 'none',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'hsl(222 47% 18%)';
                                                            e.currentTarget.style.color = 'hsl(207 90% 70%)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)';
                                                            e.currentTarget.style.color = 'hsl(207 90% 60%)';
                                                        }}
                                                    >
                                                        <ExternalLink size={10} />
                                                        {source.title || new URL(source.uri).hostname}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Methodology */}
                    <div style={{
                        padding: '14px 16px',
                        backgroundColor: 'hsl(222 47% 11%)',
                        borderRadius: '12px',
                        border: '1px solid hsl(222 47% 18%)'
                    }}>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 60%)' }}>
                            <strong style={{ color: 'hsl(215 20% 75%)' }}>Methodology:</strong> {report.methodology}
                        </p>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!report && !loading && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <ShieldCheck size={40} style={{ margin: '0 auto 16px', color: 'hsl(215 20% 35%)', opacity: 0.5 }} />
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(215 20% 55%)', marginBottom: '8px' }}>Ready to fact-check</h3>
                    <p style={{ fontSize: '12px', color: 'hsl(215 20% 45%)' }}>
                        Verify claims on this page with AI
                    </p>
                </div>
            )}
        </div>
    );
};

export default FactCheckerApp;
