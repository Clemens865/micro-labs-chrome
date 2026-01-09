import React, { useState } from 'react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { FileText, Loader2, Copy, Zap, RotateCcw, Check, UserCircle, Building2, ChevronDown, ChevronUp } from 'lucide-react';

interface DigestResult {
    summary: string;
    keyPoints: string[];
    sections: string[];
}

import { useAppHistory } from '../../hooks/useAppHistory';

const PageDigest: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading, error } = useGemini();
    const { saveHistoryEntry } = useAppHistory();
    const { profile, hasProfile, getProfileContext } = useUserProfile();
    const [result, setResult] = useState<DigestResult | null>(null);
    const [copied, setCopied] = useState(false);
    const [includeProfile, setIncludeProfile] = useState(false);

    // Build profile context for AI
    const buildProfileContext = () => {
        if (!includeProfile || !hasProfile) return '';
        const ctx = getProfileContext();
        return ctx ? `\n\nReader Context: ${ctx}\nPrioritize insights most relevant to this professional background.` : '';
    };

    const handleDigest = async () => {
        if (!context?.url) return;

        const profileContext = buildProfileContext();
        const prompt = `Analyze this webpage and return a JSON object with EXACTLY this structure:
{
  "summary": "2-3 sentence executive overview",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "sections": ["topic 1", "topic 2", "topic 3"]
}

Page Title: ${context.title}
URL: ${context.url}
Content: ${context.content?.substring(0, 15000) || 'No content available'}
${profileContext}
Requirements:
- summary: A compelling 2-3 sentence overview capturing the main value of this page
- keyPoints: Array of 5-7 specific, actionable insights (not generic statements)${includeProfile && hasProfile ? ' Prioritize insights relevant to the reader\'s professional context.' : ''}
- sections: Array of main topics/themes covered on the page`;

        try {
            const data = await generateContent(prompt, "You are an expert content analyst. Always respond with valid JSON matching the exact schema requested. Be specific and insightful.", { jsonMode: true });

            // Ensure we have the expected structure
            const result: DigestResult = {
                summary: data?.summary || 'No summary available',
                keyPoints: Array.isArray(data?.keyPoints) ? data.keyPoints : [],
                sections: Array.isArray(data?.sections) ? data.sections : []
            };

            setResult(result);
            saveHistoryEntry('digest', 'Page Digest', { url: context.url, title: context.title }, result);
        } catch (err) {
            console.error('Digest error:', err);
        }
    };

    const copyToClipboard = () => {
        if (!result) return;
        const keyPointsText = result.keyPoints?.map((p, i) => `${i + 1}. ${p}`).join('\n') || '';
        const text = `SUMMARY:\n${result.summary}\n\nKEY POINTS:\n${keyPointsText}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            {!result ? (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'linear-gradient(135deg, hsl(217 91% 60% / 0.15) 0%, hsl(217 91% 60% / 0.05) 100%)',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px'
                    }}>
                        <FileText size={32} style={{ color: 'hsl(217 91% 60%)' }} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'hsl(210 40% 98%)', marginBottom: '10px' }}>Digest this page</h3>
                    <p style={{ fontSize: '13px', color: 'hsl(215 20% 55%)', marginBottom: '24px', maxWidth: '280px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                        Get a high-level summary and key takeaways of the current page in seconds.
                    </p>

                    {/* Profile Toggle */}
                    {hasProfile && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            backgroundColor: 'hsl(222 47% 11%)',
                            border: '1px solid hsl(222 47% 18%)',
                            borderRadius: '12px',
                            marginBottom: '16px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <UserCircle size={14} style={{ color: 'hsl(217 91% 60%)' }} />
                                <span style={{ fontSize: '13px', color: 'hsl(215 20% 65%)' }}>Personalize for My Role</span>
                            </div>
                            <button
                                onClick={() => setIncludeProfile(!includeProfile)}
                                style={{
                                    position: 'relative',
                                    width: '40px',
                                    height: '20px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    backgroundColor: includeProfile ? 'hsl(217 91% 60%)' : 'hsl(222 47% 20%)',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    top: '2px',
                                    left: includeProfile ? '22px' : '2px',
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '8px',
                                    backgroundColor: 'white',
                                    transition: 'left 0.2s'
                                }} />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleDigest}
                        disabled={loading || !context?.url}
                        style={{
                            width: '100%',
                            padding: '16px 24px',
                            background: loading || !context?.url
                                ? 'hsl(222 47% 20%)'
                                : 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(221 83% 53%) 100%)',
                            border: 'none',
                            borderRadius: '14px',
                            color: loading || !context?.url ? 'hsl(215 20% 50%)' : 'white',
                            fontSize: '15px',
                            fontWeight: 700,
                            cursor: loading || !context?.url ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            transition: 'all 0.2s ease',
                            boxShadow: loading || !context?.url ? 'none' : '0 8px 24px hsl(217 91% 60% / 0.35)',
                            opacity: loading || !context?.url ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                            if (!loading && context?.url) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 12px 32px hsl(217 91% 60% / 0.45)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = loading || !context?.url ? 'none' : '0 8px 24px hsl(217 91% 60% / 0.35)';
                        }}
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                        {loading ? 'Analyzing Content...' : 'Generate Digest'}
                    </button>
                </div>
            ) : (
                <div className="space-y-6 animate-in">
                    <section className="space-y-3">
                        <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>Summary</h3>
                        <div style={{
                            padding: '20px',
                            backgroundColor: 'hsl(222 47% 9%)',
                            borderRadius: '16px',
                            border: '1px solid hsl(222 47% 15%)',
                            fontSize: '14px',
                            lineHeight: 1.7,
                            color: 'hsl(215 20% 75%)'
                        }}>
                            {result.summary}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>Key Takeaways</h3>
                        <div className="space-y-3">
                            {result.keyPoints?.map((point, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: 'flex',
                                        gap: '16px',
                                        padding: '16px',
                                        backgroundColor: 'hsl(222 47% 11%)',
                                        borderRadius: '14px',
                                        border: '1px solid hsl(222 47% 18%)'
                                    }}
                                >
                                    <div style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, hsl(217 91% 60% / 0.2) 0%, hsl(217 91% 60% / 0.1) 100%)',
                                        color: 'hsl(217 91% 65%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        fontSize: '12px',
                                        fontWeight: 800
                                    }}>
                                        {i + 1}
                                    </div>
                                    <p style={{ fontSize: '13px', color: 'hsl(215 20% 75%)', lineHeight: 1.6 }}>{point}</p>
                                </div>
                            ))}
                            {(!result.keyPoints || result.keyPoints.length === 0) && (
                                <p style={{ fontSize: '12px', color: 'hsl(215 20% 45%)', fontStyle: 'italic', padding: '0 4px' }}>No key takeaways generated.</p>
                            )}
                        </div>
                    </section>

                    <div style={{ display: 'flex', gap: '12px', paddingTop: '16px' }}>
                        <button
                            onClick={copyToClipboard}
                            style={{
                                flex: 1,
                                padding: '14px 20px',
                                background: 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(221 83% 53%) 100%)',
                                border: 'none',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 6px 20px hsl(217 91% 60% / 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 10px 28px hsl(217 91% 60% / 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 6px 20px hsl(217 91% 60% / 0.3)';
                            }}
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? 'Copied!' : 'Copy Digest'}
                        </button>
                        <button
                            onClick={() => setResult(null)}
                            style={{
                                padding: '14px 20px',
                                backgroundColor: 'hsl(222 47% 13%)',
                                border: '1px solid hsl(222 47% 20%)',
                                borderRadius: '12px',
                                color: 'hsl(215 20% 70%)',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'hsl(222 47% 18%)';
                                e.currentTarget.style.color = 'hsl(210 40% 98%)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)';
                                e.currentTarget.style.color = 'hsl(215 20% 70%)';
                            }}
                        >
                            <RotateCcw size={16} />
                            Reset
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div style={{
                    padding: '14px 16px',
                    backgroundColor: 'hsl(0 84% 60% / 0.1)',
                    border: '1px solid hsl(0 84% 60% / 0.2)',
                    borderRadius: '12px',
                    color: 'hsl(0 84% 65%)',
                    fontSize: '12px'
                }}>
                    {error}
                </div>
            )}
        </div>
    );
};

export default PageDigest;
