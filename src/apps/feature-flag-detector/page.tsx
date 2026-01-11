import React, { useState, useEffect } from 'react';
import {
    Flag,
    Loader2,
    Copy,
    Check,
    AlertCircle,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Eye,
    EyeOff,
    Database,
    Cookie,
    Code,
    Zap,
    AlertTriangle,
    CheckCircle,
    Search,
    Download
} from 'lucide-react';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';
import { useIntegrations } from '../../hooks/useIntegrations';
import SendToIntegrations from '../../components/SendToIntegrations';

interface DetectedFlag {
    id: string;
    name: string;
    value: any;
    source: 'localStorage' | 'sessionStorage' | 'cookie' | 'window' | 'meta' | 'script';
    type: 'feature-flag' | 'ab-test' | 'experiment' | 'config' | 'debug';
    confidence: 'high' | 'medium' | 'low';
    rawValue?: string;
}

interface DetectionResult {
    url: string;
    timestamp: number;
    flags: DetectedFlag[];
    abTests: DetectedFlag[];
    configs: DetectedFlag[];
}

const KNOWN_FLAG_PATTERNS = [
    // Feature flag services
    /feature[_-]?flag/i, /ff[_-]/i, /toggle[_-]/i, /flipper/i,
    // A/B testing
    /ab[_-]?test/i, /experiment/i, /variant/i, /bucket/i, /cohort/i,
    // Common providers
    /launchdarkly/i, /optimizely/i, /amplitude/i, /split/i, /growthbook/i,
    /unleash/i, /flagsmith/i, /configcat/i, /statsig/i,
    // Generic patterns
    /enabled/i, /disabled/i, /is[A-Z][a-z]+Enabled/i, /show[A-Z]/i, /hide[A-Z]/i,
    /beta/i, /alpha/i, /canary/i, /preview/i, /debug/i
];

const FeatureFlagDetectorApp: React.FC = () => {
    const { context } = usePageContext();
    const { success, warning, info } = useToast();
    const { integrations } = useIntegrations();

    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<DetectionResult | null>(null);
    const [expandedFlag, setExpandedFlag] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string>('all');
    const [copied, setCopied] = useState(false);

    const scanForFlags = async () => {
        setScanning(true);

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) {
                warning('No active tab');
                return;
            }

            // Inject script to detect flags
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const flags: any[] = [];
                    const patterns = [
                        /feature[_-]?flag/i, /ff[_-]/i, /toggle/i,
                        /ab[_-]?test/i, /experiment/i, /variant/i, /bucket/i,
                        /launchdarkly/i, /optimizely/i, /amplitude/i, /split/i,
                        /enabled/i, /is[A-Z][a-z]+Enabled/i, /show[A-Z]/i,
                        /beta/i, /canary/i, /preview/i, /debug/i
                    ];

                    const matchesPattern = (key: string) => patterns.some(p => p.test(key));
                    const inferType = (key: string, value: any) => {
                        if (/ab[_-]?test|experiment|variant|bucket/i.test(key)) return 'ab-test';
                        if (/feature|flag|toggle|enabled/i.test(key)) return 'feature-flag';
                        if (/config|setting/i.test(key)) return 'config';
                        if (/debug/i.test(key)) return 'debug';
                        return 'experiment';
                    };

                    // Check localStorage
                    try {
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key && matchesPattern(key)) {
                                const value = localStorage.getItem(key);
                                flags.push({
                                    id: `ls-${key}`,
                                    name: key,
                                    value: value,
                                    source: 'localStorage',
                                    type: inferType(key, value),
                                    confidence: 'high',
                                    rawValue: value
                                });
                            }
                        }
                    } catch (e) {}

                    // Check sessionStorage
                    try {
                        for (let i = 0; i < sessionStorage.length; i++) {
                            const key = sessionStorage.key(i);
                            if (key && matchesPattern(key)) {
                                const value = sessionStorage.getItem(key);
                                flags.push({
                                    id: `ss-${key}`,
                                    name: key,
                                    value: value,
                                    source: 'sessionStorage',
                                    type: inferType(key, value),
                                    confidence: 'high',
                                    rawValue: value
                                });
                            }
                        }
                    } catch (e) {}

                    // Check cookies
                    try {
                        document.cookie.split(';').forEach(cookie => {
                            const [name, value] = cookie.trim().split('=');
                            if (matchesPattern(name)) {
                                flags.push({
                                    id: `ck-${name}`,
                                    name: name,
                                    value: decodeURIComponent(value || ''),
                                    source: 'cookie',
                                    type: inferType(name, value),
                                    confidence: 'medium',
                                    rawValue: value
                                });
                            }
                        });
                    } catch (e) {}

                    // Check window object for common flag providers
                    try {
                        const windowKeys = [
                            'featureFlags', 'features', 'flags', 'experiments',
                            'abTests', '__FEATURE_FLAGS__', '__AB_TESTS__',
                            'optimizely', 'amplitude', 'launchDarkly',
                            '__CONFIG__', 'appConfig', 'runtimeConfig'
                        ];

                        windowKeys.forEach(key => {
                            if ((window as any)[key]) {
                                const value = (window as any)[key];
                                flags.push({
                                    id: `win-${key}`,
                                    name: key,
                                    value: typeof value === 'object' ? JSON.stringify(value).substring(0, 500) : value,
                                    source: 'window',
                                    type: 'config',
                                    confidence: 'high',
                                    rawValue: JSON.stringify(value)
                                });
                            }
                        });
                    } catch (e) {}

                    // Check meta tags
                    try {
                        document.querySelectorAll('meta').forEach(meta => {
                            const name = meta.getAttribute('name') || meta.getAttribute('property') || '';
                            if (matchesPattern(name)) {
                                flags.push({
                                    id: `meta-${name}`,
                                    name: name,
                                    value: meta.getAttribute('content'),
                                    source: 'meta',
                                    type: inferType(name, ''),
                                    confidence: 'medium'
                                });
                            }
                        });
                    } catch (e) {}

                    return flags;
                }
            });

            const detectedFlags = results[0]?.result || [];

            // Categorize flags
            const categorized: DetectionResult = {
                url: context?.url || '',
                timestamp: Date.now(),
                flags: detectedFlags.filter((f: DetectedFlag) => f.type === 'feature-flag'),
                abTests: detectedFlags.filter((f: DetectedFlag) => f.type === 'ab-test' || f.type === 'experiment'),
                configs: detectedFlags.filter((f: DetectedFlag) => f.type === 'config' || f.type === 'debug')
            };

            setResult(categorized);

            const total = detectedFlags.length;
            if (total > 0) {
                success(`Found ${total} flags/experiments`);
            } else {
                info('No feature flags detected');
            }

        } catch (err) {
            console.error('Scan error:', err);
            warning('Failed to scan page');
        } finally {
            setScanning(false);
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
        if (!result) return;

        let report = `# Feature Flag Detection Report\n\n`;
        report += `URL: ${result.url}\n`;
        report += `Scanned: ${new Date(result.timestamp).toLocaleString()}\n\n`;

        if (result.flags.length > 0) {
            report += `## Feature Flags (${result.flags.length})\n\n`;
            result.flags.forEach(f => {
                report += `- **${f.name}** (${f.source}): \`${f.value}\`\n`;
            });
            report += '\n';
        }

        if (result.abTests.length > 0) {
            report += `## A/B Tests & Experiments (${result.abTests.length})\n\n`;
            result.abTests.forEach(f => {
                report += `- **${f.name}** (${f.source}): \`${f.value}\`\n`;
            });
            report += '\n';
        }

        if (result.configs.length > 0) {
            report += `## Configs & Debug (${result.configs.length})\n\n`;
            result.configs.forEach(f => {
                report += `- **${f.name}** (${f.source}): \`${f.value}\`\n`;
            });
        }

        copyToClipboard(report);
        info('Report exported');
    };

    const getSourceIcon = (source: string) => {
        switch (source) {
            case 'localStorage': return <Database size={12} />;
            case 'sessionStorage': return <Database size={12} />;
            case 'cookie': return <Cookie size={12} />;
            case 'window': return <Code size={12} />;
            case 'meta': return <Code size={12} />;
            default: return <Flag size={12} />;
        }
    };

    const getSourceColor = (source: string) => {
        switch (source) {
            case 'localStorage': return 'bg-blue-500/20 text-blue-400';
            case 'sessionStorage': return 'bg-purple-500/20 text-purple-400';
            case 'cookie': return 'bg-yellow-500/20 text-yellow-400';
            case 'window': return 'bg-green-500/20 text-green-400';
            default: return 'bg-slate-500/20 text-slate-400';
        }
    };

    const getConfidenceColor = (confidence: string) => {
        switch (confidence) {
            case 'high': return 'text-green-400';
            case 'medium': return 'text-yellow-400';
            case 'low': return 'text-slate-400';
            default: return 'text-slate-400';
        }
    };

    const allFlags = result ? [...result.flags, ...result.abTests, ...result.configs] : [];
    const filteredFlags = filterType === 'all'
        ? allFlags
        : allFlags.filter(f => f.type === filterType || f.source === filterType);

    return (
        <div className="space-y-6">
            {/* Scan Button */}
            <button
                onClick={scanForFlags}
                disabled={scanning}
                className="btn-primary w-full flex items-center justify-center gap-2"
            >
                {scanning ? (
                    <>
                        <Loader2 size={16} className="animate-spin" />
                        Scanning...
                    </>
                ) : (
                    <>
                        <Search size={16} />
                        Detect Feature Flags
                    </>
                )}
            </button>

            {/* Results Summary */}
            {result && (
                <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Flag size={14} className="text-blue-400" />
                        </div>
                        <p className="text-xl font-bold text-blue-400">{result.flags.length}</p>
                        <p className="text-[10px] text-blue-300/60">Feature Flags</p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Zap size={14} className="text-purple-400" />
                        </div>
                        <p className="text-xl font-bold text-purple-400">{result.abTests.length}</p>
                        <p className="text-[10px] text-purple-300/60">A/B Tests</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Code size={14} className="text-green-400" />
                        </div>
                        <p className="text-xl font-bold text-green-400">{result.configs.length}</p>
                        <p className="text-[10px] text-green-300/60">Configs</p>
                    </div>
                </div>
            )}

            {/* Filter & Export */}
            {allFlags.length > 0 && (
                <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                        {['all', 'feature-flag', 'ab-test', 'config'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-2 py-1 rounded text-[10px] transition-colors ${
                                    filterType === type
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-slate-700/50 text-slate-400'
                                }`}
                            >
                                {type === 'all' ? 'All' : type.replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={exportReport}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                        {copied ? <Check size={12} /> : <Download size={12} />}
                        Export
                    </button>
                </div>
            )}

            {/* Flags List */}
            {filteredFlags.length > 0 && (
                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                    {filteredFlags.map((flag) => (
                        <div
                            key={flag.id}
                            className="rounded-xl bg-slate-800/30 border border-slate-700/30 overflow-hidden"
                        >
                            <button
                                onClick={() => setExpandedFlag(
                                    expandedFlag === flag.id ? null : flag.id
                                )}
                                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-700/30 transition-colors"
                            >
                                <span className={`p-1.5 rounded ${getSourceColor(flag.source)}`}>
                                    {getSourceIcon(flag.source)}
                                </span>
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-sm font-mono text-slate-200 truncate">
                                        {flag.name}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                        {String(flag.value).substring(0, 50)}
                                    </p>
                                </div>
                                <span className={`text-[10px] ${getConfidenceColor(flag.confidence)}`}>
                                    {flag.confidence === 'high' ? <CheckCircle size={12} /> :
                                     flag.confidence === 'medium' ? <AlertCircle size={12} /> :
                                     <AlertTriangle size={12} />}
                                </span>
                                {expandedFlag === flag.id ?
                                    <ChevronUp size={14} /> :
                                    <ChevronDown size={14} />
                                }
                            </button>

                            {expandedFlag === flag.id && (
                                <div className="px-3 pb-3 space-y-2">
                                    <div className="flex flex-wrap gap-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${getSourceColor(flag.source)}`}>
                                            {flag.source}
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-slate-700/50 text-slate-400 text-[10px]">
                                            {flag.type}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded bg-slate-700/50 text-[10px] ${getConfidenceColor(flag.confidence)}`}>
                                            {flag.confidence} confidence
                                        </span>
                                    </div>

                                    <div className="p-2 rounded bg-slate-900/50">
                                        <span className="text-[10px] text-slate-500 uppercase">Value</span>
                                        <pre className="text-xs text-slate-300 font-mono overflow-x-auto mt-1">
                                            {flag.rawValue || String(flag.value)}
                                        </pre>
                                    </div>

                                    <button
                                        onClick={() => copyToClipboard(`${flag.name}: ${flag.value}`)}
                                        className="text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1"
                                    >
                                        <Copy size={10} />
                                        Copy
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Send to Integrations */}
            {integrations.length > 0 && result && allFlags.length > 0 && (
                <SendToIntegrations
                    appId="feature-flag-detector"
                    appName="Feature Flag Detector"
                    data={{
                        type: 'feature_flag_report',
                        url: result.url,
                        flags: result.flags,
                        abTests: result.abTests,
                        configs: result.configs
                    }}
                    source={{ url: context?.url, title: context?.title }}
                />
            )}

            {/* Empty State */}
            {!result && !scanning && (
                <div className="text-center py-8 text-slate-500">
                    <Flag size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No scan performed yet</p>
                    <p className="text-xs text-slate-600 mt-1">
                        Click "Detect Feature Flags" to scan the page
                    </p>
                </div>
            )}

            {/* No Results */}
            {result && allFlags.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                    <CheckCircle size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No feature flags detected</p>
                    <p className="text-xs text-slate-600 mt-1">
                        This page doesn't appear to use detectable feature flags
                    </p>
                </div>
            )}

            {/* Info Box */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                <AlertCircle size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300/80">
                    Detects feature flags, A/B tests, and experiments from localStorage, cookies, and window objects.
                </p>
            </div>
        </div>
    );
};

export default FeatureFlagDetectorApp;
