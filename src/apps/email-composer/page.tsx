import React, { useState } from 'react';
import { useGemini } from '../../hooks/useGemini';
import { Mail, Send, Loader2, Copy, Sparkles, MessageSquare, Reply, Forward, UserCircle } from 'lucide-react';

import { useAppHistory } from '../../hooks/useAppHistory';
import { useUserProfile } from '../../hooks/useUserProfile';

const EmailComposer: React.FC = () => {
    const { generateContent, loading, error } = useGemini();
    const { saveHistoryEntry } = useAppHistory();
    const { profile, hasProfile, getOutreachContext } = useUserProfile();
    const [context, setContext] = useState('');
    const [scenario, setScenario] = useState('reply');
    const [tone, setTone] = useState('professional');
    const [result, setResult] = useState<{ subject: string; body: string; tips: string[] } | null>(null);

    const handleGenerate = async () => {
        if (!context.trim()) return;

        // Build sender context from user profile
        const outreachCtx = getOutreachContext();
        const senderInfo = hasProfile && outreachCtx ? `
      Sender Information (sign the email as this person):
      - Name: ${outreachCtx.senderName || 'Not provided'}
      - Role: ${outreachCtx.senderRole || 'Not provided'}
      - Company: ${outreachCtx.companyName || 'Not provided'}
      - Email: ${outreachCtx.senderEmail || 'Not provided'}
      ${outreachCtx.productService ? `- Product/Service: ${outreachCtx.productService}` : ''}
      ` : '';

        const prompt = `
      Draft a premium ${tone} ${scenario} email.
${senderInfo}
      Situation details:
      ${context}

      Requirements:
      1. Subject: A high-impact, professional subject line.
      2. Body: Polished, concise, and perfectly calibrated to the requested tone.${hasProfile ? ' Sign with the sender\'s name, role, and company.' : ''}
      3. Tips: 3 strategic communication tips on how to handle this specific interaction for the best outcome.
    `;

        try {
            const data = await generateContent(prompt, "You are an elite Executive Communications Director and Persuasion Expert. You specialize in high-stakes professional correspondence and strategic influence.", { jsonMode: true });
            setResult(data);
            saveHistoryEntry('email', 'Email Composer', { scenario, tone, context: context.substring(0, 500) }, data);
        } catch (err) {
            console.error(err);
        }
    };

    const scenarios = ['reply', 'followup', 'request', 'difficult'];
    const tones = ['professional', 'casual', 'friendly', 'formal'];

    return (
        <div className="space-y-6">
            {/* Profile Status Indicator */}
            {hasProfile && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    backgroundColor: 'hsl(24 50% 12%)',
                    borderRadius: '12px',
                    border: '1px solid hsl(24 50% 22%)'
                }}>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        backgroundColor: 'hsl(24 50% 20%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <UserCircle size={16} style={{ color: 'hsl(24 95% 55%)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '12px', color: 'hsl(24 95% 65%)', fontWeight: 600 }}>
                            Signing as {profile.name || 'you'}
                        </span>
                        {profile.companyName && (
                            <span style={{ fontSize: '11px', color: 'hsl(24 50% 50%)', display: 'block', marginTop: '2px' }}>
                                {profile.role ? `${profile.role} at ` : ''}{profile.companyName}
                            </span>
                        )}
                    </div>
                    <Sparkles size={14} style={{ color: 'hsl(24 95% 55%)' }} />
                </div>
            )}

            <div className="space-y-5">
                {/* Context Input */}
                <div className="space-y-2">
                    <label style={{ color: 'hsl(215 20% 65%)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Situation / Email Context
                    </label>
                    <textarea
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        placeholder="Paste the email or describe the situation..."
                        rows={5}
                        style={{
                            width: '100%',
                            padding: '14px 16px',
                            backgroundColor: 'hsl(222 47% 11%)',
                            border: '1px solid hsl(222 47% 20%)',
                            borderRadius: '14px',
                            color: 'hsl(210 40% 98%)',
                            fontSize: '14px',
                            resize: 'none',
                            outline: 'none',
                            transition: 'border-color 0.2s, box-shadow 0.2s'
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = 'hsl(24 95% 50%)';
                            e.target.style.boxShadow = '0 0 0 3px hsl(24 95% 50% / 0.15)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = 'hsl(222 47% 20%)';
                            e.target.style.boxShadow = 'none';
                        }}
                    />
                </div>

                {/* Scenario Selection */}
                <div className="space-y-3">
                    <label style={{ color: 'hsl(215 20% 65%)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Choose Scenario
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {scenarios.map(s => (
                            <button
                                key={s}
                                onClick={() => setScenario(s)}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    ...(scenario === s
                                        ? {
                                            background: 'linear-gradient(135deg, hsl(24 95% 50%) 0%, hsl(15 95% 55%) 100%)',
                                            color: 'white',
                                            boxShadow: '0 4px 16px hsl(24 95% 50% / 0.4)'
                                        }
                                        : {
                                            backgroundColor: 'hsl(222 47% 13%)',
                                            color: 'hsl(215 20% 70%)'
                                        }
                                    )
                                }}
                                onMouseEnter={(e) => {
                                    if (scenario !== s) {
                                        e.currentTarget.style.backgroundColor = 'hsl(222 47% 18%)';
                                        e.currentTarget.style.color = 'hsl(210 40% 98%)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (scenario !== s) {
                                        e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)';
                                        e.currentTarget.style.color = 'hsl(215 20% 70%)';
                                    }
                                }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tone Selection */}
                <div className="space-y-3">
                    <label style={{ color: 'hsl(215 20% 65%)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Set Tone
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {tones.map(t => (
                            <button
                                key={t}
                                onClick={() => setTone(t)}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    ...(tone === t
                                        ? {
                                            backgroundColor: 'hsl(222 47% 18%)',
                                            color: 'hsl(24 95% 60%)',
                                            boxShadow: 'inset 0 0 0 1px hsl(24 95% 50% / 0.3)'
                                        }
                                        : {
                                            backgroundColor: 'hsl(222 47% 13%)',
                                            color: 'hsl(215 20% 70%)'
                                        }
                                    )
                                }}
                                onMouseEnter={(e) => {
                                    if (tone !== t) {
                                        e.currentTarget.style.backgroundColor = 'hsl(222 47% 18%)';
                                        e.currentTarget.style.color = 'hsl(210 40% 98%)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (tone !== t) {
                                        e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)';
                                        e.currentTarget.style.color = 'hsl(215 20% 70%)';
                                    }
                                }}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={loading || !context.trim()}
                    style={{
                        width: '100%',
                        padding: '16px 24px',
                        background: loading || !context.trim()
                            ? 'hsl(222 47% 20%)'
                            : 'linear-gradient(135deg, hsl(24 95% 50%) 0%, hsl(15 95% 55%) 100%)',
                        border: 'none',
                        borderRadius: '14px',
                        color: loading || !context.trim() ? 'hsl(215 20% 50%)' : 'white',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor: loading || !context.trim() ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        transition: 'all 0.2s ease',
                        boxShadow: loading || !context.trim() ? 'none' : '0 8px 24px hsl(24 95% 50% / 0.35)',
                        opacity: loading || !context.trim() ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!loading && context.trim()) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 12px 32px hsl(24 95% 50% / 0.45)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = loading || !context.trim() ? 'none' : '0 8px 24px hsl(24 95% 50% / 0.35)';
                    }}
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                    {loading ? 'Composing...' : 'Generate Premium Email'}
                </button>
            </div>

            {/* Results */}
            {result && (
                <div className="space-y-6 animate-in" style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid hsl(222 47% 15%)' }}>
                    {/* Email Card */}
                    <div style={{ backgroundColor: 'hsl(222 47% 9%)', borderRadius: '16px', overflow: 'hidden', border: '1px solid hsl(222 47% 15%)' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(222 47% 15%)', backgroundColor: 'hsl(222 47% 11%)' }}>
                            <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 15% 50%)' }}>Subject Line</span>
                            <p style={{ fontSize: '14px', fontWeight: 800, color: 'hsl(210 40% 98%)', marginTop: '6px' }}>{result.subject}</p>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <p style={{ fontSize: '14px', color: 'hsl(215 20% 75%)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{result.body}</p>
                        </div>
                    </div>

                    {/* Copy Button */}
                    <button
                        onClick={() => navigator.clipboard.writeText(`Subject: ${result.subject}\n\n${result.body}`)}
                        style={{
                            width: '100%',
                            padding: '14px 20px',
                            backgroundColor: 'hsl(222 47% 13%)',
                            border: '1px solid hsl(24 95% 50% / 0.2)',
                            borderRadius: '12px',
                            color: 'hsl(24 95% 60%)',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'hsl(222 47% 16%)';
                            e.currentTarget.style.borderColor = 'hsl(24 95% 50% / 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)';
                            e.currentTarget.style.borderColor = 'hsl(24 95% 50% / 0.2)';
                        }}
                    >
                        <Copy size={16} />
                        Copy to Clipboard
                    </button>

                    {/* Communication Tips */}
                    <section className="space-y-4">
                        <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(24 95% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Reply size={14} /> Communication Strategy
                        </h3>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {result.tips.map((tip, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: 'flex',
                                        gap: '12px',
                                        fontSize: '13px',
                                        color: 'hsl(215 20% 65%)',
                                        backgroundColor: 'hsl(222 47% 11%)',
                                        padding: '14px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid hsl(222 47% 15%)'
                                    }}
                                >
                                    <div style={{ color: 'hsl(24 95% 55%)', fontWeight: 800 }}>•</div>
                                    <p>{tip}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )}

            {error && (
                <div style={{
                    padding: '14px 16px',
                    backgroundColor: 'hsl(0 84% 60% / 0.1)',
                    border: '1px solid hsl(0 84% 60% / 0.2)',
                    borderRadius: '12px',
                    color: 'hsl(0 84% 65%)',
                    fontSize: '13px'
                }}>
                    {error}
                </div>
            )}
        </div>
    );
};

export default EmailComposer;
