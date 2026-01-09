import React, { useState, useEffect } from 'react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useAppHistory } from '../../hooks/useAppHistory';
import {
    Shield,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Loader2,
    FileText,
    Lock,
    Eye,
    Database,
    Globe,
    Scale,
    Copy,
    Check,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    Info,
    Sparkles,
    RefreshCw
} from 'lucide-react';

interface RiskItem {
    title: string;
    description: string;
    clause?: string;
    recommendation: string;
}

interface GDPRCheck {
    name: string;
    status: 'compliant' | 'partial' | 'missing' | 'concern';
    details: string;
}

interface AnalysisResult {
    overallRiskScore: number; // 1-10
    overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    summary: string;

    // Critical findings
    criticalFindings: RiskItem[];
    warningFindings: RiskItem[];

    // GDPR specific
    gdprCompliance: {
        score: number; // percentage
        checks: GDPRCheck[];
    };

    // Data practices
    dataCollection: {
        types: string[];
        purposes: string[];
        retention: string;
        sharing: string[];
    };

    // User rights
    userRights: {
        present: string[];
        missing: string[];
    };

    // Red flags
    redFlags: string[];

    // Positive aspects
    positiveAspects: string[];

    // Plain English summary
    plainEnglishSummary: string;
}

const TermsAnalyzer: React.FC = () => {
    const { generateContent, loading, error } = useGemini();
    const { context } = usePageContext();
    const { saveHistoryEntry } = useAppHistory();

    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        critical: true,
        warnings: true,
        gdpr: true,
        data: false,
        rights: false,
        redflags: false
    });
    const [analysisType, setAnalysisType] = useState<'full' | 'quick' | 'gdpr-only'>('full');

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const copyToClipboard = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleAnalyze = async () => {
        if (!context?.content) return;

        const prompt = `Analyze this page content for legal risks, privacy concerns, GDPR compliance, and any hidden or concerning clauses.

This could be a Terms of Service, Privacy Policy, contract, website content, or any other text. Analyze it thoroughly for anything users should be aware of.

PAGE CONTENT:
${context.content.substring(0, 30000)}

URL: ${context.url}
TITLE: ${context.title}

ANALYSIS TYPE: ${analysisType}

Provide a comprehensive analysis in this exact JSON structure:
{
    "overallRiskScore": <number 1-10, where 10 is highest risk>,
    "overallRiskLevel": "<low|medium|high|critical>",
    "summary": "<2-3 sentence executive summary>",

    "criticalFindings": [
        {
            "title": "<short title>",
            "description": "<what this means for the user>",
            "clause": "<quote the relevant clause if found>",
            "recommendation": "<what user should do>"
        }
    ],

    "warningFindings": [
        {
            "title": "<short title>",
            "description": "<explanation>",
            "clause": "<relevant quote>",
            "recommendation": "<suggestion>"
        }
    ],

    "gdprCompliance": {
        "score": <percentage 0-100>,
        "checks": [
            {
                "name": "Right to Access",
                "status": "<compliant|partial|missing|concern>",
                "details": "<explanation>"
            },
            {
                "name": "Right to Erasure",
                "status": "<compliant|partial|missing|concern>",
                "details": "<explanation>"
            },
            {
                "name": "Data Portability",
                "status": "<compliant|partial|missing|concern>",
                "details": "<explanation>"
            },
            {
                "name": "Consent Mechanism",
                "status": "<compliant|partial|missing|concern>",
                "details": "<explanation>"
            },
            {
                "name": "Data Processing Basis",
                "status": "<compliant|partial|missing|concern>",
                "details": "<explanation>"
            },
            {
                "name": "Third-Party Transfers",
                "status": "<compliant|partial|missing|concern>",
                "details": "<explanation>"
            },
            {
                "name": "Data Protection Officer",
                "status": "<compliant|partial|missing|concern>",
                "details": "<explanation>"
            },
            {
                "name": "Breach Notification",
                "status": "<compliant|partial|missing|concern>",
                "details": "<explanation>"
            }
        ]
    },

    "dataCollection": {
        "types": ["<list of data types collected>"],
        "purposes": ["<stated purposes for data use>"],
        "retention": "<how long data is kept>",
        "sharing": ["<who data is shared with>"]
    },

    "userRights": {
        "present": ["<rights explicitly mentioned>"],
        "missing": ["<important rights not mentioned>"]
    },

    "redFlags": [
        "<specific concerning clauses or practices>"
    ],

    "positiveAspects": [
        "<good privacy/user-friendly practices>"
    ],

    "plainEnglishSummary": "<A simple, jargon-free explanation of what agreeing to these terms actually means for an average user. Be direct about any concerns.>"
}

IMPORTANT:
- Be thorough but accurate - only flag real issues found in the text
- Quote specific clauses when possible
- Focus on EU GDPR requirements but also flag general privacy concerns
- Highlight anything that could affect users' rights or data
- This can be ANY type of page - analyze whatever content is present for any concerning language, hidden terms, privacy implications, or user rights issues
- For non-legal pages, still analyze for privacy trackers, data collection mentioned, cookie policies embedded in content, etc.
- If the page has no legal or privacy-relevant content, indicate a low risk score and note what type of content it is`;

        try {
            const data = await generateContent(
                prompt,
                'You are an expert Privacy Lawyer and GDPR Compliance Specialist. You analyze terms of service and privacy policies to identify risks, compliance issues, and concerning clauses. Be thorough, accurate, and explain findings in plain English.',
                { jsonMode: true }
            );

            setResult(data);
            saveHistoryEntry('terms-analyzer', 'Terms & GDPR Analyzer',
                { url: context.url, analysisType },
                data
            );
        } catch (err) {
            console.error('Analysis error:', err);
        }
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'low': return { bg: 'hsl(142 71% 45%)', text: 'hsl(142 71% 65%)' };
            case 'medium': return { bg: 'hsl(45 93% 47%)', text: 'hsl(45 93% 60%)' };
            case 'high': return { bg: 'hsl(25 95% 53%)', text: 'hsl(25 95% 65%)' };
            case 'critical': return { bg: 'hsl(0 84% 60%)', text: 'hsl(0 84% 70%)' };
            default: return { bg: 'hsl(215 20% 50%)', text: 'hsl(215 20% 65%)' };
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'compliant': return <CheckCircle size={14} style={{ color: 'hsl(142 71% 55%)' }} />;
            case 'partial': return <AlertCircle size={14} style={{ color: 'hsl(45 93% 55%)' }} />;
            case 'missing': return <XCircle size={14} style={{ color: 'hsl(0 84% 60%)' }} />;
            case 'concern': return <AlertTriangle size={14} style={{ color: 'hsl(25 95% 55%)' }} />;
            default: return <Info size={14} style={{ color: 'hsl(215 20% 55%)' }} />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'compliant': return 'hsl(142 71% 55%)';
            case 'partial': return 'hsl(45 93% 55%)';
            case 'missing': return 'hsl(0 84% 60%)';
            case 'concern': return 'hsl(25 95% 55%)';
            default: return 'hsl(215 20% 55%)';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div style={{
                padding: '16px',
                backgroundColor: 'hsl(222 47% 11%)',
                borderRadius: '14px',
                border: '1px solid hsl(222 47% 18%)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, hsl(280 65% 55%) 0%, hsl(280 65% 45%) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Shield size={22} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(210 40% 98%)' }}>
                            Terms & Privacy Analyzer
                        </h3>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 55%)', marginTop: '2px' }}>
                            Analyze any page for legal risks & privacy concerns
                        </p>
                    </div>
                </div>

                {context?.url && (
                    <div style={{
                        padding: '10px 12px',
                        backgroundColor: 'hsl(222 47% 14%)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'hsl(215 20% 65%)'
                    }}>
                        <Globe size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                        {context.url.length > 60 ? context.url.substring(0, 60) + '...' : context.url}
                    </div>
                )}
            </div>

            {/* Analysis Type Selection */}
            <div className="space-y-3">
                <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>
                    Analysis Type
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                        { id: 'full', label: 'Full Analysis', icon: FileText },
                        { id: 'quick', label: 'Quick Scan', icon: Sparkles },
                        { id: 'gdpr-only', label: 'GDPR Focus', icon: Lock }
                    ].map(type => (
                        <button
                            key={type.id}
                            onClick={() => setAnalysisType(type.id as any)}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '10px',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                ...(analysisType === type.id
                                    ? {
                                        background: 'linear-gradient(135deg, hsl(280 65% 55%) 0%, hsl(280 65% 45%) 100%)',
                                        color: 'white'
                                    }
                                    : {
                                        backgroundColor: 'hsl(222 47% 13%)',
                                        color: 'hsl(215 20% 65%)'
                                    })
                            }}
                        >
                            <type.icon size={14} />
                            {type.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Analyze Button */}
            <button
                onClick={handleAnalyze}
                disabled={loading || !context?.content}
                style={{
                    width: '100%',
                    padding: '16px 24px',
                    background: loading || !context?.content
                        ? 'hsl(222 47% 20%)'
                        : 'linear-gradient(135deg, hsl(280 65% 55%) 0%, hsl(280 65% 45%) 100%)',
                    border: 'none',
                    borderRadius: '14px',
                    color: loading || !context?.content ? 'hsl(215 20% 50%)' : 'white',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: loading || !context?.content ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.2s ease',
                    boxShadow: loading || !context?.content ? 'none' : '0 8px 24px hsl(280 65% 50% / 0.35)'
                }}
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Shield size={20} />}
                {loading ? 'Analyzing...' : 'Analyze This Page'}
            </button>

            {!context?.content && (
                <div style={{
                    padding: '12px 16px',
                    backgroundColor: 'hsl(45 93% 47% / 0.1)',
                    borderRadius: '10px',
                    border: '1px solid hsl(45 93% 47% / 0.2)',
                    fontSize: '13px',
                    color: 'hsl(45 93% 60%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <AlertTriangle size={16} />
                    Navigate to any page to analyze for legal risks & privacy concerns
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-5 animate-in">
                    {/* Risk Score Header */}
                    <div style={{
                        padding: '20px',
                        background: `linear-gradient(135deg, ${getRiskColor(result.overallRiskLevel).bg}15 0%, ${getRiskColor(result.overallRiskLevel).bg}05 100%)`,
                        borderRadius: '16px',
                        border: `1px solid ${getRiskColor(result.overallRiskLevel).bg}30`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: `conic-gradient(${getRiskColor(result.overallRiskLevel).bg} ${result.overallRiskScore * 10}%, hsl(222 47% 20%) 0%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative'
                            }}>
                                <div style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '50%',
                                    backgroundColor: 'hsl(222 47% 11%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'column'
                                }}>
                                    <span style={{ fontSize: '18px', fontWeight: 800, color: getRiskColor(result.overallRiskLevel).text }}>
                                        {result.overallRiskScore}
                                    </span>
                                    <span style={{ fontSize: '9px', color: 'hsl(215 20% 55%)' }}>/10</span>
                                </div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        backgroundColor: `${getRiskColor(result.overallRiskLevel).bg}25`,
                                        color: getRiskColor(result.overallRiskLevel).text,
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        textTransform: 'uppercase'
                                    }}>
                                        {result.overallRiskLevel} Risk
                                    </span>
                                </div>
                                <p style={{ fontSize: '13px', color: 'hsl(215 20% 70%)', lineHeight: 1.5 }}>
                                    {result.summary}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Plain English Summary */}
                    <div style={{
                        padding: '16px',
                        backgroundColor: 'hsl(207 90% 54% / 0.1)',
                        borderRadius: '12px',
                        border: '1px solid hsl(207 90% 54% / 0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <Info size={16} style={{ color: 'hsl(207 90% 65%)' }} />
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'hsl(207 90% 65%)', textTransform: 'uppercase' }}>
                                In Plain English
                            </span>
                        </div>
                        <p style={{ fontSize: '14px', color: 'hsl(210 40% 98%)', lineHeight: 1.6 }}>
                            {result.plainEnglishSummary}
                        </p>
                    </div>

                    {/* Critical Findings */}
                    {result.criticalFindings?.length > 0 && (
                        <div style={{
                            borderRadius: '14px',
                            border: '1px solid hsl(0 84% 60% / 0.3)',
                            overflow: 'hidden'
                        }}>
                            <button
                                onClick={() => toggleSection('critical')}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    backgroundColor: 'hsl(0 84% 60% / 0.1)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <XCircle size={18} style={{ color: 'hsl(0 84% 65%)' }} />
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(0 84% 70%)' }}>
                                        Critical Findings ({result.criticalFindings.length})
                                    </span>
                                </div>
                                {expandedSections.critical ? <ChevronUp size={16} style={{ color: 'hsl(0 84% 65%)' }} /> : <ChevronDown size={16} style={{ color: 'hsl(0 84% 65%)' }} />}
                            </button>
                            {expandedSections.critical && (
                                <div style={{ padding: '12px' }} className="space-y-3">
                                    {result.criticalFindings.map((finding, i) => (
                                        <div key={i} style={{
                                            padding: '14px',
                                            backgroundColor: 'hsl(222 47% 11%)',
                                            borderRadius: '10px',
                                            borderLeft: '3px solid hsl(0 84% 60%)'
                                        }}>
                                            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'hsl(0 84% 70%)', marginBottom: '6px' }}>
                                                {finding.title}
                                            </h4>
                                            <p style={{ fontSize: '13px', color: 'hsl(215 20% 70%)', marginBottom: '8px', lineHeight: 1.5 }}>
                                                {finding.description}
                                            </p>
                                            {finding.clause && (
                                                <div style={{
                                                    padding: '10px 12px',
                                                    backgroundColor: 'hsl(222 47% 14%)',
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    color: 'hsl(215 20% 60%)',
                                                    fontStyle: 'italic',
                                                    marginBottom: '8px'
                                                }}>
                                                    "{finding.clause}"
                                                </div>
                                            )}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '6px',
                                                fontSize: '12px',
                                                color: 'hsl(142 71% 60%)'
                                            }}>
                                                <CheckCircle size={12} style={{ marginTop: '2px', flexShrink: 0 }} />
                                                <span>{finding.recommendation}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Warning Findings */}
                    {result.warningFindings?.length > 0 && (
                        <div style={{
                            borderRadius: '14px',
                            border: '1px solid hsl(45 93% 47% / 0.3)',
                            overflow: 'hidden'
                        }}>
                            <button
                                onClick={() => toggleSection('warnings')}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    backgroundColor: 'hsl(45 93% 47% / 0.1)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <AlertTriangle size={18} style={{ color: 'hsl(45 93% 55%)' }} />
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(45 93% 60%)' }}>
                                        Warnings ({result.warningFindings.length})
                                    </span>
                                </div>
                                {expandedSections.warnings ? <ChevronUp size={16} style={{ color: 'hsl(45 93% 55%)' }} /> : <ChevronDown size={16} style={{ color: 'hsl(45 93% 55%)' }} />}
                            </button>
                            {expandedSections.warnings && (
                                <div style={{ padding: '12px' }} className="space-y-3">
                                    {result.warningFindings.map((finding, i) => (
                                        <div key={i} style={{
                                            padding: '14px',
                                            backgroundColor: 'hsl(222 47% 11%)',
                                            borderRadius: '10px',
                                            borderLeft: '3px solid hsl(45 93% 50%)'
                                        }}>
                                            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'hsl(45 93% 60%)', marginBottom: '6px' }}>
                                                {finding.title}
                                            </h4>
                                            <p style={{ fontSize: '13px', color: 'hsl(215 20% 70%)', marginBottom: '8px', lineHeight: 1.5 }}>
                                                {finding.description}
                                            </p>
                                            {finding.clause && (
                                                <div style={{
                                                    padding: '10px 12px',
                                                    backgroundColor: 'hsl(222 47% 14%)',
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    color: 'hsl(215 20% 60%)',
                                                    fontStyle: 'italic',
                                                    marginBottom: '8px'
                                                }}>
                                                    "{finding.clause}"
                                                </div>
                                            )}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '6px',
                                                fontSize: '12px',
                                                color: 'hsl(142 71% 60%)'
                                            }}>
                                                <CheckCircle size={12} style={{ marginTop: '2px', flexShrink: 0 }} />
                                                <span>{finding.recommendation}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* GDPR Compliance */}
                    <div style={{
                        borderRadius: '14px',
                        border: '1px solid hsl(280 65% 55% / 0.3)',
                        overflow: 'hidden'
                    }}>
                        <button
                            onClick={() => toggleSection('gdpr')}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                backgroundColor: 'hsl(280 65% 55% / 0.1)',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Lock size={18} style={{ color: 'hsl(280 65% 65%)' }} />
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(280 65% 70%)' }}>
                                    GDPR Compliance ({result.gdprCompliance?.score || 0}%)
                                </span>
                            </div>
                            {expandedSections.gdpr ? <ChevronUp size={16} style={{ color: 'hsl(280 65% 65%)' }} /> : <ChevronDown size={16} style={{ color: 'hsl(280 65% 65%)' }} />}
                        </button>
                        {expandedSections.gdpr && result.gdprCompliance?.checks && (
                            <div style={{ padding: '12px' }} className="space-y-2">
                                {result.gdprCompliance.checks.map((check, i) => (
                                    <div key={i} style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px',
                                        padding: '12px',
                                        backgroundColor: 'hsl(222 47% 11%)',
                                        borderRadius: '10px'
                                    }}>
                                        {getStatusIcon(check.status)}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(210 40% 98%)' }}>
                                                    {check.name}
                                                </span>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '10px',
                                                    backgroundColor: `${getStatusColor(check.status)}20`,
                                                    color: getStatusColor(check.status),
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {check.status}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '12px', color: 'hsl(215 20% 65%)', lineHeight: 1.4 }}>
                                                {check.details}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Data Collection */}
                    <div style={{
                        borderRadius: '14px',
                        border: '1px solid hsl(222 47% 22%)',
                        overflow: 'hidden'
                    }}>
                        <button
                            onClick={() => toggleSection('data')}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                backgroundColor: 'hsl(222 47% 13%)',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Database size={18} style={{ color: 'hsl(207 90% 65%)' }} />
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(207 90% 70%)' }}>
                                    Data Collection Practices
                                </span>
                            </div>
                            {expandedSections.data ? <ChevronUp size={16} style={{ color: 'hsl(215 20% 55%)' }} /> : <ChevronDown size={16} style={{ color: 'hsl(215 20% 55%)' }} />}
                        </button>
                        {expandedSections.data && result.dataCollection && (
                            <div style={{ padding: '12px' }} className="space-y-3">
                                <div style={{ padding: '12px', backgroundColor: 'hsl(222 47% 11%)', borderRadius: '10px' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(215 20% 55%)', marginBottom: '6px', textTransform: 'uppercase' }}>Data Types Collected</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {result.dataCollection.types?.map((type, i) => (
                                            <span key={i} style={{
                                                padding: '4px 10px',
                                                backgroundColor: 'hsl(222 47% 16%)',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                color: 'hsl(215 20% 75%)'
                                            }}>
                                                {type}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ padding: '12px', backgroundColor: 'hsl(222 47% 11%)', borderRadius: '10px' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(215 20% 55%)', marginBottom: '6px', textTransform: 'uppercase' }}>Purposes</p>
                                    <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                        {result.dataCollection.purposes?.map((purpose, i) => (
                                            <li key={i} style={{ fontSize: '12px', color: 'hsl(215 20% 70%)', marginBottom: '4px' }}>
                                                {purpose}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {result.dataCollection.retention && (
                                    <div style={{ padding: '12px', backgroundColor: 'hsl(222 47% 11%)', borderRadius: '10px' }}>
                                        <p style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(215 20% 55%)', marginBottom: '4px', textTransform: 'uppercase' }}>Data Retention</p>
                                        <p style={{ fontSize: '13px', color: 'hsl(210 40% 98%)' }}>{result.dataCollection.retention}</p>
                                    </div>
                                )}
                                {result.dataCollection.sharing?.length > 0 && (
                                    <div style={{ padding: '12px', backgroundColor: 'hsl(222 47% 11%)', borderRadius: '10px' }}>
                                        <p style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(215 20% 55%)', marginBottom: '6px', textTransform: 'uppercase' }}>Data Shared With</p>
                                        <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                            {result.dataCollection.sharing.map((entity, i) => (
                                                <li key={i} style={{ fontSize: '12px', color: 'hsl(215 20% 70%)', marginBottom: '4px' }}>
                                                    {entity}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Red Flags */}
                    {result.redFlags?.length > 0 && (
                        <div style={{
                            borderRadius: '14px',
                            border: '1px solid hsl(0 84% 60% / 0.2)',
                            overflow: 'hidden'
                        }}>
                            <button
                                onClick={() => toggleSection('redflags')}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    backgroundColor: 'hsl(0 84% 60% / 0.05)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <AlertTriangle size={18} style={{ color: 'hsl(0 84% 60%)' }} />
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(0 84% 65%)' }}>
                                        Red Flags ({result.redFlags.length})
                                    </span>
                                </div>
                                {expandedSections.redflags ? <ChevronUp size={16} style={{ color: 'hsl(0 84% 60%)' }} /> : <ChevronDown size={16} style={{ color: 'hsl(0 84% 60%)' }} />}
                            </button>
                            {expandedSections.redflags && (
                                <div style={{ padding: '12px' }} className="space-y-2">
                                    {result.redFlags.map((flag, i) => (
                                        <div key={i} style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '10px',
                                            padding: '12px',
                                            backgroundColor: 'hsl(222 47% 11%)',
                                            borderRadius: '10px'
                                        }}>
                                            <XCircle size={14} style={{ color: 'hsl(0 84% 60%)', flexShrink: 0, marginTop: '2px' }} />
                                            <p style={{ fontSize: '13px', color: 'hsl(215 20% 75%)', lineHeight: 1.5 }}>
                                                {flag}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Positive Aspects */}
                    {result.positiveAspects?.length > 0 && (
                        <div style={{
                            padding: '14px',
                            backgroundColor: 'hsl(142 71% 45% / 0.1)',
                            borderRadius: '12px',
                            border: '1px solid hsl(142 71% 45% / 0.2)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                <CheckCircle size={16} style={{ color: 'hsl(142 71% 55%)' }} />
                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'hsl(142 71% 60%)', textTransform: 'uppercase' }}>
                                    Positive Aspects
                                </span>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                {result.positiveAspects.map((aspect, i) => (
                                    <li key={i} style={{ fontSize: '13px', color: 'hsl(142 71% 70%)', marginBottom: '6px', lineHeight: 1.4 }}>
                                        {aspect}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Copy Report Button */}
                    <button
                        onClick={() => {
                            const report = `# Terms & GDPR Analysis Report
URL: ${context?.url}
Date: ${new Date().toLocaleDateString()}

## Risk Assessment
- Overall Risk Score: ${result.overallRiskScore}/10 (${result.overallRiskLevel})
- GDPR Compliance: ${result.gdprCompliance?.score}%

## Summary
${result.summary}

## Plain English Summary
${result.plainEnglishSummary}

## Critical Findings
${result.criticalFindings?.map(f => `- ${f.title}: ${f.description}`).join('\n') || 'None'}

## Warnings
${result.warningFindings?.map(f => `- ${f.title}: ${f.description}`).join('\n') || 'None'}

## Red Flags
${result.redFlags?.map(f => `- ${f}`).join('\n') || 'None'}

## Positive Aspects
${result.positiveAspects?.map(f => `- ${f}`).join('\n') || 'None'}
`;
                            copyToClipboard(report, 'report');
                        }}
                        style={{
                            width: '100%',
                            padding: '14px 20px',
                            backgroundColor: 'hsl(222 47% 13%)',
                            border: '1px solid hsl(280 65% 55% / 0.2)',
                            borderRadius: '12px',
                            color: 'hsl(280 65% 65%)',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {copied === 'report' ? <Check size={16} /> : <Copy size={16} />}
                        {copied === 'report' ? 'Report Copied!' : 'Copy Full Report'}
                    </button>
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

export default TermsAnalyzer;
