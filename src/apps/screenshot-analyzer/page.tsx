import React, { useState } from 'react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import {
    Camera,
    Loader2,
    Eye,
    Palette,
    Layout,
    Code2,
    AlertCircle,
    Copy,
    RotateCcw,
    Sparkles,
    Check
} from 'lucide-react';

interface FullAnalysisResult {
    type: 'full';
    overview: string;
    layout: {
        structure: string;
        components: string[];
    };
    design: {
        colorPalette: string[];
        typography: string;
        style: string;
    };
    ux: {
        strengths: string[];
        improvements: string[];
    };
    accessibility: {
        score: string;
        issues: string[];
    };
}

interface DesignAnalysisResult {
    type: 'design';
    colorPalette: string[];
    typography: {
        fonts: string;
        hierarchy: string;
        readability: string;
    };
    spacing: {
        consistency: string;
        whitespace: string;
    };
    visualHierarchy: string;
    style: string;
    recommendations: string[];
}

interface UXAnalysisResult {
    type: 'ux';
    overview: string;
    navigation: {
        clarity: string;
        issues: string[];
    };
    callToActions: {
        effectiveness: string;
        suggestions: string[];
    };
    informationHierarchy: string;
    userFlow: string;
    strengths: string[];
    improvements: string[];
}

interface CodeAnalysisResult {
    type: 'code';
    componentStructure: {
        hierarchy: string;
        components: string[];
    };
    cssFramework: string;
    keyStyles: {
        layout: string;
        colors: string;
        typography: string;
        spacing: string;
    };
    responsiveNotes: string[];
    implementationTips: string[];
}

type AnalysisResult = FullAnalysisResult | DesignAnalysisResult | UXAnalysisResult | CodeAnalysisResult;

const ScreenshotAnalyzer: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading, error } = useGemini();
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [status, setStatus] = useState<string>('');
    const [analysisType, setAnalysisType] = useState<'full' | 'design' | 'ux' | 'code'>('full');
    const [copied, setCopied] = useState(false);

    const captureScreenshot = (): Promise<{ screenshot?: string; error?: string }> => {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
                resolve(response || { error: 'No response from background script' });
            });
        });
    };

    const handleCapture = async () => {
        setStatus('Capturing screenshot...');
        setResult(null);

        const response = await captureScreenshot();

        if (response.error) {
            setStatus('');
            alert('Failed to capture screenshot: ' + response.error);
            return;
        }

        if (response.screenshot) {
            setScreenshot(response.screenshot);
            setStatus('Screenshot captured! Click Analyze to process.');
        }
    };

    const handleAnalyze = async () => {
        if (!screenshot) return;

        setStatus('Analyzing screenshot with AI vision...');

        const prompts: Record<string, string> = {
            full: `Analyze this webpage screenshot comprehensively. Return a JSON object with EXACTLY this structure:
{
  "type": "full",
  "overview": "2-3 sentence description of what this page is about and its purpose",
  "layout": {
    "structure": "Description of the overall layout structure (grid, columns, sections)",
    "components": ["list", "of", "UI", "components", "identified"]
  },
  "design": {
    "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
    "typography": "Description of fonts and text styling used",
    "style": "Overall design style (modern, minimal, corporate, playful, etc.)"
  },
  "ux": {
    "strengths": ["UX strength 1", "UX strength 2", "UX strength 3"],
    "improvements": ["UX improvement suggestion 1", "UX improvement suggestion 2"]
  },
  "accessibility": {
    "score": "Good/Fair/Poor with brief explanation",
    "issues": ["potential accessibility issue 1", "issue 2"]
  }
}`,
            design: `Analyze the DESIGN aspects of this webpage screenshot. Focus on colors, typography, spacing, and visual hierarchy. Return a JSON object with EXACTLY this structure:
{
  "type": "design",
  "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "typography": {
    "fonts": "Font families identified or estimated",
    "hierarchy": "How text hierarchy is established (sizes, weights)",
    "readability": "Assessment of text readability"
  },
  "spacing": {
    "consistency": "How consistent is the spacing throughout",
    "whitespace": "Use of whitespace and breathing room"
  },
  "visualHierarchy": "How the design guides the eye and establishes importance",
  "style": "Overall design style and aesthetic",
  "recommendations": ["design improvement 1", "design improvement 2", "design improvement 3"]
}`,
            ux: `Analyze the USER EXPERIENCE of this webpage screenshot. Evaluate navigation, call-to-actions, information hierarchy, and user flow. Return a JSON object with EXACTLY this structure:
{
  "type": "ux",
  "overview": "Brief overview of the page's UX quality",
  "navigation": {
    "clarity": "How clear and intuitive is the navigation",
    "issues": ["navigation issue 1", "navigation issue 2"]
  },
  "callToActions": {
    "effectiveness": "How effective are the CTAs",
    "suggestions": ["CTA improvement 1", "CTA improvement 2"]
  },
  "informationHierarchy": "How well is information organized and prioritized",
  "userFlow": "Assessment of the implied user journey on this page",
  "strengths": ["UX strength 1", "UX strength 2", "UX strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"]
}`,
            code: `Analyze this UI screenshot and describe how to RECREATE it in code. Return a JSON object with EXACTLY this structure:
{
  "type": "code",
  "componentStructure": {
    "hierarchy": "Description of the component tree structure",
    "components": ["ComponentName1", "ComponentName2", "ComponentName3"]
  },
  "cssFramework": "Recommended CSS approach (Tailwind classes, CSS modules, etc.)",
  "keyStyles": {
    "layout": "Key layout CSS (flexbox, grid, positioning)",
    "colors": "Color values to use (bg, text, borders)",
    "typography": "Font sizes, weights, line heights",
    "spacing": "Padding, margins, gaps to replicate"
  },
  "responsiveNotes": ["responsive consideration 1", "responsive consideration 2"],
  "implementationTips": ["tip 1", "tip 2", "tip 3"]
}`
        };

        try {
            const base64Data = screenshot.split(',')[1];

            const data = await generateContent(
                prompts[analysisType] + `\n\nPage URL: ${context?.url || 'Unknown'}\nPage Title: ${context?.title || 'Unknown'}`,
                "You are an expert UI/UX designer and web developer. Analyze screenshots with precision and provide actionable insights. Always respond with valid JSON matching the exact structure requested.",
                {
                    jsonMode: true,
                    imageData: base64Data
                }
            );

            setResult(data);
            setStatus('');
        } catch (err) {
            console.error('Analysis error:', err);
            setStatus('Analysis failed. Please try again.');
        }
    };

    const copyResults = () => {
        if (result) {
            navigator.clipboard.writeText(JSON.stringify(result, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const reset = () => {
        setScreenshot(null);
        setResult(null);
        setStatus('');
    };

    const TypeButton: React.FC<{ id: string; label: string; icon: React.ComponentType<{ size: number }> }> = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setAnalysisType(id as any)}
            style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                ...(analysisType === id
                    ? {
                        background: 'linear-gradient(135deg, hsl(280 70% 50%) 0%, hsl(320 70% 55%) 100%)',
                        color: 'white',
                        boxShadow: '0 4px 16px hsl(280 70% 50% / 0.4)'
                    }
                    : {
                        backgroundColor: 'hsl(222 47% 13%)',
                        color: 'hsl(215 20% 65%)'
                    })
            }}
            onMouseEnter={(e) => {
                if (analysisType !== id) {
                    e.currentTarget.style.backgroundColor = 'hsl(222 47% 18%)';
                    e.currentTarget.style.color = 'hsl(210 40% 98%)';
                }
            }}
            onMouseLeave={(e) => {
                if (analysisType !== id) {
                    e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)';
                    e.currentTarget.style.color = 'hsl(215 20% 65%)';
                }
            }}
        >
            <Icon size={14} />
            {label}
        </button>
    );

    const renderFullAnalysis = (data: FullAnalysisResult) => (
        <>
            {data.overview && (
                <section className="space-y-2">
                    <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>Overview</h3>
                    <p style={{
                        fontSize: '14px',
                        color: 'hsl(215 20% 75%)',
                        backgroundColor: 'hsl(222 47% 9%)',
                        padding: '16px',
                        borderRadius: '14px',
                        border: '1px solid hsl(222 47% 15%)',
                        lineHeight: 1.6
                    }}>
                        {data.overview}
                    </p>
                </section>
            )}

            {data.layout && (
                <section className="space-y-3">
                    <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Layout size={12} style={{ color: 'hsl(280 70% 55%)' }} /> Layout Structure
                    </h3>
                    <p style={{ fontSize: '13px', color: 'hsl(215 20% 65%)' }}>{data.layout.structure}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {data.layout.components?.map((comp, i) => (
                            <span key={i} style={{
                                padding: '6px 12px',
                                backgroundColor: 'hsl(222 47% 11%)',
                                border: '1px solid hsl(222 47% 18%)',
                                fontSize: '11px',
                                borderRadius: '8px',
                                color: 'hsl(215 20% 75%)'
                            }}>
                                {comp}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            {data.design && (
                <section className="space-y-3">
                    <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Palette size={12} style={{ color: 'hsl(280 70% 55%)' }} /> Design Analysis
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {data.design.colorPalette?.map((color, i) => (
                            <div
                                key={i}
                                style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '10px',
                                    backgroundColor: color,
                                    border: '2px solid hsl(222 47% 20%)',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                                }}
                                title={color}
                            />
                        ))}
                    </div>
                    <p style={{ fontSize: '12px', color: 'hsl(215 20% 65%)' }}><strong style={{ color: 'hsl(215 20% 75%)' }}>Typography:</strong> {data.design.typography}</p>
                    <p style={{ fontSize: '12px', color: 'hsl(215 20% 65%)' }}><strong style={{ color: 'hsl(215 20% 75%)' }}>Style:</strong> {data.design.style}</p>
                </section>
            )}

            {data.ux && (
                <section className="space-y-3">
                    <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Eye size={12} style={{ color: 'hsl(280 70% 55%)' }} /> UX Analysis
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{
                            backgroundColor: 'hsl(142 71% 45% / 0.1)',
                            border: '1px solid hsl(142 71% 45% / 0.2)',
                            borderRadius: '14px',
                            padding: '14px'
                        }}>
                            <p style={{ fontSize: '11px', fontWeight: 700, color: 'hsl(142 71% 55%)', marginBottom: '10px' }}>Strengths</p>
                            <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                {data.ux.strengths?.map((s, i) => (
                                    <li key={i} style={{ fontSize: '11px', color: 'hsl(215 20% 75%)', marginBottom: '4px' }}>{s}</li>
                                ))}
                            </ul>
                        </div>
                        <div style={{
                            backgroundColor: 'hsl(24 95% 50% / 0.1)',
                            border: '1px solid hsl(24 95% 50% / 0.2)',
                            borderRadius: '14px',
                            padding: '14px'
                        }}>
                            <p style={{ fontSize: '11px', fontWeight: 700, color: 'hsl(24 95% 55%)', marginBottom: '10px' }}>Improvements</p>
                            <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                {data.ux.improvements?.map((s, i) => (
                                    <li key={i} style={{ fontSize: '11px', color: 'hsl(215 20% 75%)', marginBottom: '4px' }}>{s}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>
            )}

            {data.accessibility && (
                <section className="space-y-2">
                    <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>Accessibility</h3>
                    <p style={{ fontSize: '13px', color: 'hsl(215 20% 75%)' }}>{data.accessibility.score}</p>
                    {data.accessibility.issues?.length > 0 && (
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                            {data.accessibility.issues.map((issue, i) => (
                                <li key={i} style={{
                                    fontSize: '12px',
                                    color: 'hsl(24 95% 55%)',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '8px',
                                    marginBottom: '6px'
                                }}>
                                    <AlertCircle size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    {issue}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}
        </>
    );

    const renderDesignAnalysis = (data: DesignAnalysisResult) => (
        <>
            <section className="space-y-3">
                <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Palette size={12} style={{ color: 'hsl(280 70% 55%)' }} /> Color Palette
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {data.colorPalette?.map((color, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <div
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '10px',
                                    backgroundColor: color,
                                    border: '2px solid hsl(222 47% 20%)',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                                }}
                            />
                            <span style={{ fontSize: '9px', color: 'hsl(215 20% 50%)' }}>{color}</span>
                        </div>
                    ))}
                </div>
            </section>

            {data.typography && (
                <section className="space-y-2">
                    <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>Typography</h3>
                    <div style={{
                        backgroundColor: 'hsl(222 47% 9%)',
                        padding: '16px',
                        borderRadius: '14px',
                        border: '1px solid hsl(222 47% 15%)'
                    }} className="space-y-2">
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 75%)' }}><strong style={{ color: 'hsl(215 20% 55%)' }}>Fonts:</strong> {data.typography.fonts}</p>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 75%)' }}><strong style={{ color: 'hsl(215 20% 55%)' }}>Hierarchy:</strong> {data.typography.hierarchy}</p>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 75%)' }}><strong style={{ color: 'hsl(215 20% 55%)' }}>Readability:</strong> {data.typography.readability}</p>
                    </div>
                </section>
            )}

            {data.spacing && (
                <section className="space-y-2">
                    <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>Spacing</h3>
                    <div style={{
                        backgroundColor: 'hsl(222 47% 9%)',
                        padding: '16px',
                        borderRadius: '14px',
                        border: '1px solid hsl(222 47% 15%)'
                    }} className="space-y-2">
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 75%)' }}><strong style={{ color: 'hsl(215 20% 55%)' }}>Consistency:</strong> {data.spacing.consistency}</p>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 75%)' }}><strong style={{ color: 'hsl(215 20% 55%)' }}>Whitespace:</strong> {data.spacing.whitespace}</p>
                    </div>
                </section>
            )}

            <section className="space-y-2">
                <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>Visual Analysis</h3>
                <div style={{
                    backgroundColor: 'hsl(222 47% 9%)',
                    padding: '16px',
                    borderRadius: '14px',
                    border: '1px solid hsl(222 47% 15%)'
                }} className="space-y-2">
                    <p style={{ fontSize: '12px', color: 'hsl(215 20% 75%)' }}><strong style={{ color: 'hsl(215 20% 55%)' }}>Visual Hierarchy:</strong> {data.visualHierarchy}</p>
                    <p style={{ fontSize: '12px', color: 'hsl(215 20% 75%)' }}><strong style={{ color: 'hsl(215 20% 55%)' }}>Style:</strong> {data.style}</p>
                </div>
            </section>

            {data.recommendations && data.recommendations.length > 0 && (
                <section className="space-y-2">
                    <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>Recommendations</h3>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {data.recommendations.map((rec, i) => (
                            <li key={i} style={{
                                fontSize: '12px',
                                color: 'hsl(215 20% 75%)',
                                backgroundColor: 'hsl(280 70% 50% / 0.1)',
                                border: '1px solid hsl(280 70% 50% / 0.2)',
                                padding: '12px 14px',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px'
                            }}>
                                <span style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    backgroundColor: 'hsl(280 70% 50% / 0.2)',
                                    color: 'hsl(280 70% 60%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    flexShrink: 0
                                }}>{i + 1}</span>
                                {rec}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </>
    );

    const renderUXAnalysis = (data: UXAnalysisResult) => (
        <>
            {data.overview && (
                <section className="space-y-2">
                    <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>UX Overview</h3>
                    <p style={{
                        fontSize: '14px',
                        color: 'hsl(215 20% 75%)',
                        backgroundColor: 'hsl(222 47% 9%)',
                        padding: '16px',
                        borderRadius: '14px',
                        border: '1px solid hsl(222 47% 15%)',
                        lineHeight: 1.6
                    }}>
                        {data.overview}
                    </p>
                </section>
            )}

            {data.navigation && (
                <section className="space-y-2">
                    <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>Navigation</h3>
                    <div style={{
                        backgroundColor: 'hsl(222 47% 9%)',
                        padding: '16px',
                        borderRadius: '14px',
                        border: '1px solid hsl(222 47% 15%)'
                    }} className="space-y-2">
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 75%)' }}><strong style={{ color: 'hsl(215 20% 55%)' }}>Clarity:</strong> {data.navigation.clarity}</p>
                        {data.navigation.issues?.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                                <p style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', marginBottom: '6px' }}>Issues:</p>
                                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                    {data.navigation.issues.map((issue, i) => (
                                        <li key={i} style={{ fontSize: '11px', color: 'hsl(24 95% 55%)', marginBottom: '4px' }}>{issue}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {data.callToActions && (
                <section className="space-y-2">
                    <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>Call to Actions</h3>
                    <div style={{
                        backgroundColor: 'hsl(222 47% 9%)',
                        padding: '16px',
                        borderRadius: '14px',
                        border: '1px solid hsl(222 47% 15%)'
                    }} className="space-y-2">
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 75%)' }}><strong style={{ color: 'hsl(215 20% 55%)' }}>Effectiveness:</strong> {data.callToActions.effectiveness}</p>
                        {data.callToActions.suggestions?.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                                <p style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', marginBottom: '6px' }}>Suggestions:</p>
                                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                    {data.callToActions.suggestions.map((sug, i) => (
                                        <li key={i} style={{ fontSize: '11px', color: 'hsl(199 89% 55%)', marginBottom: '4px' }}>{sug}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </section>
            )}

            <section className="space-y-2">
                <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>Flow Analysis</h3>
                <div style={{
                    backgroundColor: 'hsl(222 47% 9%)',
                    padding: '16px',
                    borderRadius: '14px',
                    border: '1px solid hsl(222 47% 15%)'
                }} className="space-y-2">
                    <p style={{ fontSize: '12px', color: 'hsl(215 20% 75%)' }}><strong style={{ color: 'hsl(215 20% 55%)' }}>Information Hierarchy:</strong> {data.informationHierarchy}</p>
                    <p style={{ fontSize: '12px', color: 'hsl(215 20% 75%)' }}><strong style={{ color: 'hsl(215 20% 55%)' }}>User Flow:</strong> {data.userFlow}</p>
                </div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{
                    backgroundColor: 'hsl(142 71% 45% / 0.1)',
                    border: '1px solid hsl(142 71% 45% / 0.2)',
                    borderRadius: '14px',
                    padding: '14px'
                }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'hsl(142 71% 55%)', marginBottom: '10px' }}>Strengths</p>
                    <ul style={{ margin: 0, paddingLeft: '16px' }}>
                        {data.strengths?.map((s, i) => (
                            <li key={i} style={{ fontSize: '11px', color: 'hsl(215 20% 75%)', marginBottom: '4px' }}>{s}</li>
                        ))}
                    </ul>
                </div>
                <div style={{
                    backgroundColor: 'hsl(24 95% 50% / 0.1)',
                    border: '1px solid hsl(24 95% 50% / 0.2)',
                    borderRadius: '14px',
                    padding: '14px'
                }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'hsl(24 95% 55%)', marginBottom: '10px' }}>Improvements</p>
                    <ul style={{ margin: 0, paddingLeft: '16px' }}>
                        {data.improvements?.map((s, i) => (
                            <li key={i} style={{ fontSize: '11px', color: 'hsl(215 20% 75%)', marginBottom: '4px' }}>{s}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </>
    );

    const renderCodeAnalysis = (data: CodeAnalysisResult) => (
        <>
            {data.componentStructure && (
                <section className="space-y-3">
                    <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Code2 size={12} style={{ color: 'hsl(280 70% 55%)' }} /> Component Structure
                    </h3>
                    <p style={{ fontSize: '13px', color: 'hsl(215 20% 65%)' }}>{data.componentStructure.hierarchy}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {data.componentStructure.components?.map((comp, i) => (
                            <span key={i} style={{
                                padding: '6px 10px',
                                backgroundColor: 'hsl(250 90% 60% / 0.2)',
                                border: '1px solid hsl(250 90% 60% / 0.3)',
                                fontSize: '11px',
                                borderRadius: '8px',
                                color: 'hsl(250 90% 75%)',
                                fontFamily: 'monospace'
                            }}>
                                &lt;{comp} /&gt;
                            </span>
                        ))}
                    </div>
                </section>
            )}

            <section className="space-y-2">
                <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>CSS Approach</h3>
                <p style={{
                    fontSize: '14px',
                    color: 'hsl(215 20% 75%)',
                    backgroundColor: 'hsl(222 47% 9%)',
                    padding: '16px',
                    borderRadius: '14px',
                    border: '1px solid hsl(222 47% 15%)',
                    lineHeight: 1.6
                }}>
                    {data.cssFramework}
                </p>
            </section>

            {data.keyStyles && (
                <section className="space-y-2">
                    <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>Key Styles</h3>
                    <div style={{
                        backgroundColor: 'hsl(222 47% 7%)',
                        padding: '16px',
                        borderRadius: '14px',
                        border: '1px solid hsl(222 47% 15%)',
                        fontFamily: 'monospace'
                    }} className="space-y-4">
                        <div>
                            <span style={{ fontSize: '11px', color: 'hsl(280 70% 60%)' }}>/* Layout */</span>
                            <p style={{ fontSize: '12px', color: 'hsl(215 20% 75%)', marginTop: '4px' }}>{data.keyStyles.layout}</p>
                        </div>
                        <div>
                            <span style={{ fontSize: '11px', color: 'hsl(280 70% 60%)' }}>/* Colors */</span>
                            <p style={{ fontSize: '12px', color: 'hsl(215 20% 75%)', marginTop: '4px' }}>{data.keyStyles.colors}</p>
                        </div>
                        <div>
                            <span style={{ fontSize: '11px', color: 'hsl(280 70% 60%)' }}>/* Typography */</span>
                            <p style={{ fontSize: '12px', color: 'hsl(215 20% 75%)', marginTop: '4px' }}>{data.keyStyles.typography}</p>
                        </div>
                        <div>
                            <span style={{ fontSize: '11px', color: 'hsl(280 70% 60%)' }}>/* Spacing */</span>
                            <p style={{ fontSize: '12px', color: 'hsl(215 20% 75%)', marginTop: '4px' }}>{data.keyStyles.spacing}</p>
                        </div>
                    </div>
                </section>
            )}

            {data.responsiveNotes && data.responsiveNotes.length > 0 && (
                <section className="space-y-2">
                    <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>Responsive Considerations</h3>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {data.responsiveNotes.map((note, i) => (
                            <li key={i} style={{
                                fontSize: '12px',
                                color: 'hsl(215 20% 75%)',
                                backgroundColor: 'hsl(199 89% 48% / 0.1)',
                                border: '1px solid hsl(199 89% 48% / 0.2)',
                                padding: '12px 14px',
                                borderRadius: '12px'
                            }}>
                                {note}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {data.implementationTips && data.implementationTips.length > 0 && (
                <section className="space-y-2">
                    <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>Implementation Tips</h3>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {data.implementationTips.map((tip, i) => (
                            <li key={i} style={{
                                fontSize: '12px',
                                color: 'hsl(215 20% 75%)',
                                backgroundColor: 'hsl(142 71% 45% / 0.1)',
                                border: '1px solid hsl(142 71% 45% / 0.2)',
                                padding: '12px 14px',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px'
                            }}>
                                <Check size={14} style={{ color: 'hsl(142 71% 55%)', flexShrink: 0, marginTop: '1px' }} />
                                {tip}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </>
    );

    const renderResults = () => {
        if (!result) return null;

        const resultType = (result as any).type || 'full';

        switch (resultType) {
            case 'design':
                return renderDesignAnalysis(result as DesignAnalysisResult);
            case 'ux':
                return renderUXAnalysis(result as UXAnalysisResult);
            case 'code':
                return renderCodeAnalysis(result as CodeAnalysisResult);
            case 'full':
            default:
                return renderFullAnalysis(result as FullAnalysisResult);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: 'linear-gradient(135deg, hsl(280 70% 50%) 0%, hsl(320 70% 55%) 100%)',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    boxShadow: '0 8px 24px hsl(280 70% 50% / 0.35)'
                }}>
                    <Eye size={32} style={{ color: 'white' }} />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'hsl(210 40% 98%)' }}>Screenshot Analyzer</h2>
                <p style={{ fontSize: '12px', color: 'hsl(215 20% 55%)', marginTop: '6px' }}>AI-powered visual analysis of any webpage</p>
            </div>

            {/* Analysis Type Selector */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <TypeButton id="full" label="Full" icon={Sparkles} />
                <TypeButton id="design" label="Design" icon={Palette} />
                <TypeButton id="ux" label="UX" icon={Layout} />
                <TypeButton id="code" label="Code" icon={Code2} />
            </div>

            {/* Screenshot Preview or Capture Button */}
            {!screenshot ? (
                <button
                    onClick={handleCapture}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '40px 20px',
                        backgroundColor: 'hsl(222 47% 11%)',
                        border: '2px dashed hsl(222 47% 22%)',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '14px',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'hsl(280 70% 50%)';
                        e.currentTarget.style.backgroundColor = 'hsl(280 70% 50% / 0.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'hsl(222 47% 22%)';
                        e.currentTarget.style.backgroundColor = 'hsl(222 47% 11%)';
                    }}
                >
                    <div style={{
                        width: '72px',
                        height: '72px',
                        backgroundColor: 'hsl(222 47% 15%)',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Camera size={36} style={{ color: 'hsl(280 70% 60%)' }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontWeight: 700, color: 'hsl(210 40% 98%)', fontSize: '15px' }}>Capture Current Page</p>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 55%)', marginTop: '6px' }}>Takes a screenshot of the visible area</p>
                    </div>
                </button>
            ) : (
                <div className="space-y-4">
                    <div style={{
                        position: 'relative',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        border: '1px solid hsl(222 47% 20%)'
                    }}>
                        <img
                            src={screenshot}
                            alt="Captured screenshot"
                            style={{
                                width: '100%',
                                height: '180px',
                                objectFit: 'cover',
                                objectPosition: 'top'
                            }}
                        />
                        <button
                            onClick={reset}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                padding: '10px',
                                backgroundColor: 'hsl(222 47% 7% / 0.85)',
                                border: 'none',
                                borderRadius: '10px',
                                color: 'hsl(210 40% 98%)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'hsl(0 84% 60% / 0.8)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'hsl(222 47% 7% / 0.85)';
                            }}
                        >
                            <RotateCcw size={18} />
                        </button>
                    </div>

                    <button
                        onClick={handleAnalyze}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '16px 24px',
                            background: loading
                                ? 'hsl(222 47% 20%)'
                                : 'linear-gradient(135deg, hsl(280 70% 50%) 0%, hsl(320 70% 55%) 100%)',
                            border: 'none',
                            borderRadius: '14px',
                            color: loading ? 'hsl(215 20% 50%)' : 'white',
                            fontSize: '15px',
                            fontWeight: 700,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            transition: 'all 0.2s ease',
                            boxShadow: loading ? 'none' : '0 8px 24px hsl(280 70% 50% / 0.35)'
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 12px 32px hsl(280 70% 50% / 0.45)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = loading ? 'none' : '0 8px 24px hsl(280 70% 50% / 0.35)';
                        }}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} />
                                Analyze Screenshot
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Status Message */}
            {status && (
                <div style={{
                    padding: '14px 16px',
                    backgroundColor: 'hsl(199 89% 48% / 0.1)',
                    border: '1px solid hsl(199 89% 48% / 0.2)',
                    borderRadius: '12px',
                    color: 'hsl(199 89% 65%)',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    {status}
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-6 animate-in">
                    {renderResults()}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', paddingTop: '16px' }}>
                        <button
                            onClick={copyResults}
                            style={{
                                flex: 1,
                                padding: '14px 20px',
                                background: 'linear-gradient(135deg, hsl(280 70% 50%) 0%, hsl(320 70% 55%) 100%)',
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
                                boxShadow: '0 6px 20px hsl(280 70% 50% / 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 10px 28px hsl(280 70% 50% / 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 6px 20px hsl(280 70% 50% / 0.3)';
                            }}
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? 'Copied!' : 'Copy Results'}
                        </button>
                        <button
                            onClick={reset}
                            style={{
                                padding: '14px 18px',
                                backgroundColor: 'hsl(222 47% 13%)',
                                border: '1px solid hsl(222 47% 20%)',
                                borderRadius: '12px',
                                color: 'hsl(215 20% 70%)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
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
                            <RotateCcw size={18} />
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

export default ScreenshotAnalyzer;
