import React, { useState } from 'react';
import { useGemini } from '../../hooks/useGemini';
import {
    Globe, Plus, Trash2, Loader2, Sparkles, ExternalLink,
    Scale, ShoppingCart, Star, FileText, Copy, Check,
    ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';

type ComparisonType = 'products' | 'pricing' | 'features' | 'reviews' | 'general';

interface ComparisonResult {
    summary: string;
    comparison: string;
    winner?: string;
    sources: Array<{ uri: string; title?: string }>;
    timestamp: number;
}

const MultiSiteComparator: React.FC = () => {
    const { analyzeUrls, loading } = useGemini();
    const [urls, setUrls] = useState<string[]>(['', '']);
    const [comparisonType, setComparisonType] = useState<ComparisonType>('general');
    const [customPrompt, setCustomPrompt] = useState('');
    const [result, setResult] = useState<ComparisonResult | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const comparisonTypes: Record<ComparisonType, { label: string; icon: React.ReactNode; prompt: string }> = {
        products: {
            label: 'Product Comparison',
            icon: <ShoppingCart size={14} />,
            prompt: `Compare these products across all URLs. Create a detailed comparison including:
- Key specifications and features
- Pros and cons of each
- Price differences (if available)
- User ratings summary
- Best use cases for each
- Clear recommendation with reasoning

Format as a structured comparison table where possible.`
        },
        pricing: {
            label: 'Price Matching',
            icon: <Scale size={14} />,
            prompt: `Extract and compare pricing information from all URLs:
- List all prices found (including any discounts, shipping costs)
- Identify the cheapest option
- Note any price conditions (membership required, limited time, etc.)
- Calculate potential savings
- Recommend the best value option`
        },
        features: {
            label: 'Feature Analysis',
            icon: <FileText size={14} />,
            prompt: `Analyze and compare features across all URLs:
- Create a feature comparison matrix
- Identify unique features each has
- Note missing features in each
- Highlight the most important differentiators
- Recommend based on feature set`
        },
        reviews: {
            label: 'Review Aggregation',
            icon: <Star size={14} />,
            prompt: `Aggregate and analyze reviews from all URLs:
- Extract overall ratings and review counts
- Summarize positive themes across reviews
- Summarize negative themes/complaints
- Identify common issues mentioned
- Provide a balanced recommendation based on user feedback`
        },
        general: {
            label: 'General Comparison',
            icon: <Globe size={14} />,
            prompt: `Provide a comprehensive comparison of the content across all URLs:
- Summarize the key information from each
- Identify similarities and differences
- Note any contradictions or discrepancies
- Synthesize into actionable insights
- Provide a clear conclusion`
        }
    };

    const addUrl = () => {
        if (urls.length < 20) {
            setUrls([...urls, '']);
        }
    };

    const removeUrl = (index: number) => {
        if (urls.length > 2) {
            setUrls(urls.filter((_, i) => i !== index));
        }
    };

    const updateUrl = (index: number, value: string) => {
        const newUrls = [...urls];
        newUrls[index] = value;
        setUrls(newUrls);
    };

    const runComparison = async () => {
        const validUrls = urls.filter(u => u.trim());
        if (validUrls.length < 2) {
            setError('Please enter at least 2 URLs to compare');
            return;
        }

        setError(null);
        setResult(null);

        try {
            const prompt = customPrompt.trim() || comparisonTypes[comparisonType].prompt;

            const response = await analyzeUrls(validUrls, prompt, {
                systemInstruction: `You are an expert analyst specializing in comparing information across multiple sources.
Provide clear, structured comparisons with actionable insights.
Always cite which URL each piece of information comes from.
Be objective and highlight both strengths and weaknesses.`,
                includeSearch: false
            });

            setResult({
                summary: response.text.split('\n')[0] || 'Comparison complete',
                comparison: response.text,
                sources: response.sources,
                timestamp: Date.now()
            });
        } catch (err: any) {
            setError(err.message || 'Failed to analyze URLs');
        }
    };

    const copyResult = async () => {
        if (result) {
            await navigator.clipboard.writeText(result.comparison);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const validUrlCount = urls.filter(u => u.trim()).length;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div style={{
                padding: '16px',
                backgroundColor: 'hsl(222 47% 11%)',
                borderRadius: '14px',
                border: '1px solid hsl(222 47% 18%)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, hsl(199 89% 48%) 0%, hsl(217 91% 60%) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Scale size={22} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(210 40% 98%)' }}>
                            Multi-Site Comparator
                        </h3>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 55%)', marginTop: '2px' }}>
                            Compare up to 20 URLs with AI analysis
                        </p>
                    </div>
                </div>

                {/* Comparison Type */}
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', marginBottom: '6px', display: 'block' }}>
                        Comparison Type
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(Object.entries(comparisonTypes) as [ComparisonType, typeof comparisonTypes[ComparisonType]][]).map(([type, config]) => (
                            <button
                                key={type}
                                onClick={() => setComparisonType(type)}
                                disabled={loading}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: comparisonType === type
                                        ? '2px solid hsl(199 89% 48%)'
                                        : '1px solid hsl(222 47% 18%)',
                                    backgroundColor: comparisonType === type
                                        ? 'hsl(199 89% 48% / 0.15)'
                                        : 'hsl(222 47% 8%)',
                                    color: comparisonType === type
                                        ? 'hsl(199 89% 65%)'
                                        : 'hsl(215 20% 65%)',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {config.icon}
                                {config.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* URL Inputs */}
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)' }}>
                            URLs to Compare ({validUrlCount}/20)
                        </label>
                        {urls.length < 20 && (
                            <button
                                onClick={addUrl}
                                disabled={loading}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: 'hsl(199 89% 48% / 0.2)',
                                    color: 'hsl(199 89% 65%)',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <Plus size={12} /> Add URL
                            </button>
                        )}
                    </div>
                    <div className="space-y-2">
                        {urls.map((url, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => updateUrl(idx, e.target.value)}
                                    placeholder={`URL ${idx + 1}`}
                                    disabled={loading}
                                    style={{
                                        flex: 1,
                                        padding: '10px 12px',
                                        backgroundColor: 'hsl(222 47% 8%)',
                                        border: '1px solid hsl(222 47% 18%)',
                                        borderRadius: '8px',
                                        color: 'hsl(210 40% 98%)',
                                        fontSize: '12px',
                                        outline: 'none'
                                    }}
                                />
                                {urls.length > 2 && (
                                    <button
                                        onClick={() => removeUrl(idx)}
                                        disabled={loading}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            backgroundColor: 'hsl(0 84% 60% / 0.2)',
                                            color: 'hsl(0 84% 65%)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Advanced Options */}
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'hsl(215 20% 55%)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        marginBottom: '12px'
                    }}
                >
                    {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    Custom Analysis Prompt
                </button>

                {showAdvanced && (
                    <div style={{ marginBottom: '12px' }}>
                        <textarea
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            placeholder="Enter a custom analysis prompt (leave empty to use default)"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                backgroundColor: 'hsl(222 47% 8%)',
                                border: '1px solid hsl(222 47% 18%)',
                                borderRadius: '8px',
                                color: 'hsl(210 40% 98%)',
                                fontSize: '12px',
                                outline: 'none',
                                minHeight: '80px',
                                resize: 'vertical'
                            }}
                        />
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div style={{
                        padding: '10px 12px',
                        backgroundColor: 'hsl(0 84% 60% / 0.1)',
                        borderRadius: '8px',
                        border: '1px solid hsl(0 84% 60% / 0.3)',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <AlertCircle size={14} style={{ color: 'hsl(0 84% 60%)' }} />
                        <span style={{ fontSize: '12px', color: 'hsl(0 84% 70%)' }}>{error}</span>
                    </div>
                )}

                {/* Compare Button */}
                <button
                    onClick={runComparison}
                    disabled={loading || validUrlCount < 2}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: 'linear-gradient(135deg, hsl(199 89% 48%) 0%, hsl(217 91% 60%) 100%)',
                        color: 'white',
                        opacity: (loading || validUrlCount < 2) ? 0.5 : 1
                    }}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={16} />
                            Analyzing {validUrlCount} URLs...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Compare {validUrlCount} Sites
                        </>
                    )}
                </button>
            </div>

            {/* Results */}
            {result && (
                <div style={{
                    padding: '16px',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(142 71% 45% / 0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sparkles size={16} style={{ color: 'hsl(142 71% 55%)' }} />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(142 71% 65%)' }}>
                                Comparison Result
                            </span>
                        </div>
                        <button
                            onClick={copyResult}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: 'hsl(222 47% 16%)',
                                color: 'hsl(215 20% 65%)',
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>

                    {/* Sources */}
                    {result.sources.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                            <p style={{ fontSize: '10px', color: 'hsl(215 20% 50%)', marginBottom: '6px' }}>
                                Sources analyzed:
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {result.sources.map((source, idx) => (
                                    <a
                                        key={idx}
                                        href={source.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            padding: '4px 8px',
                                            backgroundColor: 'hsl(222 47% 16%)',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            color: 'hsl(199 89% 65%)',
                                            textDecoration: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <ExternalLink size={10} />
                                        {new URL(source.uri).hostname}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div style={{
                        padding: '12px',
                        backgroundColor: 'hsl(222 47% 8%)',
                        borderRadius: '10px',
                        maxHeight: '400px',
                        overflowY: 'auto'
                    }}>
                        <pre style={{
                            fontSize: '12px',
                            color: 'hsl(215 20% 80%)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            lineHeight: 1.6,
                            margin: 0
                        }}>
                            {result.comparison}
                        </pre>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!result && !loading && (
                <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(222 47% 18%)'
                }}>
                    <Scale size={40} style={{ color: 'hsl(215 20% 30%)', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '13px', color: 'hsl(215 20% 55%)', marginBottom: '6px' }}>
                        Compare multiple websites at once
                    </p>
                    <p style={{ fontSize: '11px', color: 'hsl(215 20% 45%)', maxWidth: '280px', margin: '0 auto' }}>
                        Product comparisons, price matching, feature analysis, review aggregation - all powered by AI
                    </p>
                </div>
            )}

            {/* Info */}
            <div style={{
                padding: '12px',
                backgroundColor: 'hsl(199 89% 48% / 0.1)',
                borderRadius: '10px',
                border: '1px solid hsl(199 89% 48% / 0.3)'
            }}>
                <div style={{ fontSize: '11px', color: 'hsl(199 89% 70%)', lineHeight: 1.5 }}>
                    <strong>Powered by Gemini URL Context:</strong> AI reads and analyzes up to 20 web pages simultaneously,
                    extracting and comparing information in real-time.
                </div>
            </div>
        </div>
    );
};

export default MultiSiteComparator;
