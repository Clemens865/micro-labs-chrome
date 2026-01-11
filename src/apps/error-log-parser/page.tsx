import React, { useState } from 'react';
import {
    AlertTriangle,
    Upload,
    Loader2,
    Copy,
    Check,
    Download,
    AlertCircle,
    Sparkles,
    Bug,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    FileText,
    Terminal,
    Search,
    Filter,
    ExternalLink,
    Lightbulb,
    XCircle,
    Info
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';
import { useIntegrations } from '../../hooks/useIntegrations';
import SendToIntegrations from '../../components/SendToIntegrations';

interface ParsedError {
    id: string;
    type: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
    message: string;
    source?: string;
    line?: number;
    column?: number;
    stackTrace?: string[];
    timestamp?: string;
    count: number;
    rootCause?: string;
    suggestedFix?: string;
    documentation?: string[];
    relatedErrors?: string[];
}

interface ErrorAnalysis {
    summary: {
        total: number;
        critical: number;
        errors: number;
        warnings: number;
        info: number;
    };
    errors: ParsedError[];
    patterns: {
        pattern: string;
        count: number;
        recommendation: string;
    }[];
    overallRecommendations: string[];
}

const ErrorLogParserApp: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading: aiLoading } = useGemini();
    const { success, warning, info } = useToast();
    const { integrations } = useIntegrations();

    const [inputText, setInputText] = useState('');
    const [analysis, setAnalysis] = useState<ErrorAnalysis | null>(null);
    const [processing, setProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [expandedError, setExpandedError] = useState<string | null>(null);
    const [filterSeverity, setFilterSeverity] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [logFormat, setLogFormat] = useState<'auto' | 'json' | 'apache' | 'nginx' | 'nodejs' | 'python'>('auto');

    const extractFromPage = () => {
        if (context?.content) {
            setInputText(context.content.substring(0, 20000));
            info('Page content loaded');
        } else {
            warning('No page content available');
        }
    };

    const parseErrors = async () => {
        if (!inputText.trim()) {
            warning('Please enter error logs');
            return;
        }

        setProcessing(true);

        try {
            const result = await generateContent(
                `Parse and analyze these error logs:

${inputText}

Log format hint: ${logFormat === 'auto' ? 'Auto-detect' : logFormat}

Extract and analyze:
1. Each unique error with:
   - Error type (e.g., TypeError, NetworkError, SyntaxError, etc.)
   - Severity (critical, error, warning, info)
   - Error message
   - Source file and line/column if available
   - Stack trace (array of frames)
   - Timestamp if available
   - Occurrence count
   - Root cause analysis
   - Suggested fix
   - Documentation links
   - Related errors

2. Summary statistics (total, by severity)

3. Patterns found across errors

4. Overall recommendations

Return as JSON:
{
  "summary": {
    "total": 10,
    "critical": 1,
    "errors": 5,
    "warnings": 3,
    "info": 1
  },
  "errors": [
    {
      "id": "err-1",
      "type": "TypeError",
      "severity": "error",
      "message": "Cannot read property 'x' of undefined",
      "source": "app.js",
      "line": 42,
      "column": 15,
      "stackTrace": ["at App.render (app.js:42:15)", "..."],
      "timestamp": "2024-01-15T10:30:00Z",
      "count": 5,
      "rootCause": "Variable 'obj' is undefined when accessed",
      "suggestedFix": "Add null check before accessing property",
      "documentation": ["https://developer.mozilla.org/..."],
      "relatedErrors": ["err-2"]
    }
  ],
  "patterns": [
    {
      "pattern": "Null reference errors",
      "count": 5,
      "recommendation": "Implement defensive programming"
    }
  ],
  "overallRecommendations": [
    "Add error boundaries in React components",
    "Implement input validation"
  ]
}`,
                `You are a senior developer specializing in debugging and error analysis.
Parse error logs accurately, identify root causes, and provide actionable fixes.
Group similar errors and identify patterns.
Prioritize by severity and frequency.`,
                { jsonMode: true }
            );

            if (result) {
                setAnalysis(result);
                success(`Parsed ${result.errors?.length || 0} unique errors`);
                if (result.errors?.length > 0) {
                    setExpandedError(result.errors[0].id);
                }
            }
        } catch (err) {
            console.error('Parse error:', err);
            warning('Failed to parse logs');
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

    const exportReport = () => {
        if (!analysis) return;

        let report = `# Error Log Analysis Report\n\n`;
        report += `## Summary\n`;
        report += `- Total Errors: ${analysis.summary.total}\n`;
        report += `- Critical: ${analysis.summary.critical}\n`;
        report += `- Errors: ${analysis.summary.errors}\n`;
        report += `- Warnings: ${analysis.summary.warnings}\n`;
        report += `- Info: ${analysis.summary.info}\n\n`;

        report += `## Errors\n\n`;
        analysis.errors.forEach((err, idx) => {
            report += `### ${idx + 1}. ${err.type}: ${err.message}\n`;
            report += `- **Severity:** ${err.severity}\n`;
            report += `- **Source:** ${err.source || 'Unknown'}:${err.line || '?'}\n`;
            report += `- **Occurrences:** ${err.count}\n`;
            report += `- **Root Cause:** ${err.rootCause || 'Unknown'}\n`;
            report += `- **Fix:** ${err.suggestedFix || 'N/A'}\n\n`;
        });

        report += `## Patterns\n\n`;
        analysis.patterns?.forEach(p => {
            report += `- **${p.pattern}** (${p.count}x): ${p.recommendation}\n`;
        });

        report += `\n## Recommendations\n\n`;
        analysis.overallRecommendations?.forEach(r => {
            report += `- ${r}\n`;
        });

        copyToClipboard(report);
        info('Report copied');
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'error': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'info': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return <XCircle size={14} className="text-red-400" />;
            case 'error': return <AlertTriangle size={14} className="text-orange-400" />;
            case 'warning': return <AlertCircle size={14} className="text-yellow-400" />;
            case 'info': return <Info size={14} className="text-blue-400" />;
            default: return <Bug size={14} className="text-slate-400" />;
        }
    };

    const filteredErrors = analysis?.errors.filter(err => {
        const matchesSeverity = filterSeverity === 'all' || err.severity === filterSeverity;
        const matchesSearch = !searchQuery ||
            err.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            err.type.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSeverity && matchesSearch;
    }) || [];

    return (
        <div className="space-y-6">
            {/* Input Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-300">Error Logs</h3>
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
                    placeholder="Paste error logs, stack traces, or console output..."
                    className="input-field w-full min-h-[150px] text-sm font-mono"
                />

                <div>
                    <label className="text-xs text-slate-400 block mb-1">Log Format</label>
                    <select
                        value={logFormat}
                        onChange={(e) => setLogFormat(e.target.value as any)}
                        className="input-field w-full text-sm"
                    >
                        <option value="auto">Auto-detect</option>
                        <option value="json">JSON</option>
                        <option value="nodejs">Node.js</option>
                        <option value="python">Python</option>
                        <option value="apache">Apache</option>
                        <option value="nginx">Nginx</option>
                    </select>
                </div>

                <button
                    onClick={parseErrors}
                    disabled={processing || !inputText.trim()}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    {processing ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Parsing Errors...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Analyze Errors
                        </>
                    )}
                </button>
            </div>

            {/* Analysis Output */}
            {analysis && (
                <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-5 gap-2">
                        <div className="p-2 rounded-lg bg-slate-800/50 text-center">
                            <p className="text-lg font-bold text-white">{analysis.summary.total}</p>
                            <p className="text-[10px] text-slate-500 uppercase">Total</p>
                        </div>
                        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                            <p className="text-lg font-bold text-red-400">{analysis.summary.critical}</p>
                            <p className="text-[10px] text-red-400/60 uppercase">Critical</p>
                        </div>
                        <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
                            <p className="text-lg font-bold text-orange-400">{analysis.summary.errors}</p>
                            <p className="text-[10px] text-orange-400/60 uppercase">Errors</p>
                        </div>
                        <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                            <p className="text-lg font-bold text-yellow-400">{analysis.summary.warnings}</p>
                            <p className="text-[10px] text-yellow-400/60 uppercase">Warnings</p>
                        </div>
                        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                            <p className="text-lg font-bold text-blue-400">{analysis.summary.info}</p>
                            <p className="text-[10px] text-blue-400/60 uppercase">Info</p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search errors..."
                                className="input-field w-full pl-9 text-xs"
                            />
                        </div>
                        <select
                            value={filterSeverity}
                            onChange={(e) => setFilterSeverity(e.target.value)}
                            className="input-field text-xs w-28"
                        >
                            <option value="all">All</option>
                            <option value="critical">Critical</option>
                            <option value="error">Error</option>
                            <option value="warning">Warning</option>
                            <option value="info">Info</option>
                        </select>
                    </div>

                    {/* Errors List */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {filteredErrors.map((err) => (
                            <div
                                key={err.id}
                                className="rounded-xl bg-slate-800/30 border border-slate-700/30 overflow-hidden"
                            >
                                <button
                                    onClick={() => setExpandedError(
                                        expandedError === err.id ? null : err.id
                                    )}
                                    className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-700/30 transition-colors"
                                >
                                    {getSeverityIcon(err.severity)}
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-slate-200">{err.type}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase border ${getSeverityColor(err.severity)}`}>
                                                {err.severity}
                                            </span>
                                            {err.count > 1 && (
                                                <span className="text-xs text-slate-500">×{err.count}</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 truncate mt-0.5">{err.message}</p>
                                    </div>
                                    {expandedError === err.id ?
                                        <ChevronUp size={14} /> :
                                        <ChevronDown size={14} />
                                    }
                                </button>

                                {expandedError === err.id && (
                                    <div className="px-3 pb-3 space-y-3 border-t border-slate-700/30 mt-1 pt-3">
                                        {/* Source */}
                                        {err.source && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <Terminal size={12} className="text-slate-500" />
                                                <span className="font-mono text-slate-400">
                                                    {err.source}:{err.line}:{err.column}
                                                </span>
                                            </div>
                                        )}

                                        {/* Stack Trace */}
                                        {err.stackTrace && err.stackTrace.length > 0 && (
                                            <div>
                                                <span className="text-[10px] text-slate-500 uppercase">Stack Trace</span>
                                                <pre className="mt-1 p-2 rounded bg-slate-900/50 text-[10px] text-slate-400 font-mono overflow-x-auto max-h-[100px]">
                                                    {err.stackTrace.join('\n')}
                                                </pre>
                                            </div>
                                        )}

                                        {/* Root Cause */}
                                        {err.rootCause && (
                                            <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                                                <span className="text-[10px] text-red-400 uppercase font-bold">Root Cause</span>
                                                <p className="text-xs text-slate-300 mt-1">{err.rootCause}</p>
                                            </div>
                                        )}

                                        {/* Suggested Fix */}
                                        {err.suggestedFix && (
                                            <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                                                <span className="text-[10px] text-green-400 uppercase font-bold flex items-center gap-1">
                                                    <Lightbulb size={10} />
                                                    Suggested Fix
                                                </span>
                                                <p className="text-xs text-slate-300 mt-1">{err.suggestedFix}</p>
                                            </div>
                                        )}

                                        {/* Documentation Links */}
                                        {err.documentation && err.documentation.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {err.documentation.map((doc, i) => (
                                                    <a
                                                        key={i}
                                                        href={doc}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                                    >
                                                        <ExternalLink size={10} />
                                                        Docs
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Patterns */}
                    {analysis.patterns && analysis.patterns.length > 0 && (
                        <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
                            <h3 className="text-xs font-bold text-slate-400 mb-2">Patterns Detected</h3>
                            <div className="space-y-2">
                                {analysis.patterns.map((p, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs">
                                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">
                                            {p.count}×
                                        </span>
                                        <div>
                                            <span className="text-slate-300">{p.pattern}</span>
                                            <p className="text-slate-500">{p.recommendation}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Overall Recommendations */}
                    {analysis.overallRecommendations && analysis.overallRecommendations.length > 0 && (
                        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                            <h3 className="text-xs font-bold text-green-400 flex items-center gap-1 mb-2">
                                <Lightbulb size={12} />
                                Recommendations
                            </h3>
                            <ul className="space-y-1">
                                {analysis.overallRecommendations.map((rec, idx) => (
                                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                                        <span className="text-green-400">→</span>
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Export */}
                    <div className="flex gap-2">
                        <button
                            onClick={exportReport}
                            className="btn-secondary flex items-center gap-2 flex-1"
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            Export Report
                        </button>
                        <button
                            onClick={() => copyToClipboard(JSON.stringify(analysis, null, 2))}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <FileText size={14} />
                            JSON
                        </button>
                    </div>

                    {/* Send to Integrations */}
                    {integrations.length > 0 && (
                        <SendToIntegrations
                            appId="error-log-parser"
                            appName="Error Log Parser"
                            data={{
                                type: 'error_analysis',
                                analysis
                            }}
                            source={{ url: context?.url, title: context?.title }}
                        />
                    )}
                </div>
            )}

            {/* Empty State */}
            {!analysis && !processing && (
                <div className="text-center py-8 text-slate-500">
                    <Bug size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No errors analyzed yet</p>
                    <p className="text-xs text-slate-600 mt-1">
                        Paste error logs to parse and analyze
                    </p>
                </div>
            )}

            {/* Info Box */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                <AlertCircle size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300/80">
                    Parses error logs from any source, identifies patterns, finds root causes, and suggests fixes. Works with Node.js, Python, browser errors, and more.
                </p>
            </div>
        </div>
    );
};

export default ErrorLogParserApp;
