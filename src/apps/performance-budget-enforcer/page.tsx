'use client';

import React, { useState, useEffect } from 'react';
import { Gauge, AlertTriangle, CheckCircle, Play, Download, RotateCcw, Timer, FileCode, Image, Zap, Database, Globe, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Settings } from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';
import { useIntegrations } from '../../hooks/useIntegrations';
import SendToIntegrations from '../../components/SendToIntegrations';

interface BudgetRule {
    id: string;
    name: string;
    metric: string;
    maxValue: number;
    unit: string;
    icon: React.ReactNode;
    category: 'size' | 'timing' | 'count';
}

interface MetricResult {
    ruleId: string;
    name: string;
    currentValue: number;
    maxValue: number;
    unit: string;
    status: 'pass' | 'warning' | 'fail';
    percentUsed: number;
    trend?: 'up' | 'down' | 'stable';
    details?: string;
}

interface PerformanceReport {
    timestamp: string;
    url: string;
    overallScore: number;
    metrics: MetricResult[];
    recommendations: string[];
    aiInsights: string;
}

const STORAGE_KEY = 'microlabs_performance_budget_enforcer';

const DEFAULT_BUDGETS: BudgetRule[] = [
    { id: 'total-size', name: 'Total Page Size', metric: 'totalSize', maxValue: 3000, unit: 'KB', icon: <Database size={16} />, category: 'size' },
    { id: 'js-size', name: 'JavaScript Size', metric: 'jsSize', maxValue: 500, unit: 'KB', icon: <FileCode size={16} />, category: 'size' },
    { id: 'css-size', name: 'CSS Size', metric: 'cssSize', maxValue: 150, unit: 'KB', icon: <FileCode size={16} />, category: 'size' },
    { id: 'image-size', name: 'Image Size', metric: 'imageSize', maxValue: 1500, unit: 'KB', icon: <Image size={16} />, category: 'size' },
    { id: 'font-size', name: 'Font Size', metric: 'fontSize', maxValue: 200, unit: 'KB', icon: <FileCode size={16} />, category: 'size' },
    { id: 'dom-nodes', name: 'DOM Nodes', metric: 'domNodes', maxValue: 1500, unit: 'nodes', icon: <Globe size={16} />, category: 'count' },
    { id: 'requests', name: 'HTTP Requests', metric: 'requests', maxValue: 50, unit: 'requests', icon: <Globe size={16} />, category: 'count' },
    { id: 'fcp', name: 'First Contentful Paint', metric: 'fcp', maxValue: 2000, unit: 'ms', icon: <Timer size={16} />, category: 'timing' },
    { id: 'lcp', name: 'Largest Contentful Paint', metric: 'lcp', maxValue: 2500, unit: 'ms', icon: <Timer size={16} />, category: 'timing' },
    { id: 'tti', name: 'Time to Interactive', metric: 'tti', maxValue: 3500, unit: 'ms', icon: <Zap size={16} />, category: 'timing' },
];

export default function PerformanceBudgetEnforcer() {
    const [budgets, setBudgets] = useState<BudgetRule[]>(DEFAULT_BUDGETS);
    const [reports, setReports] = useState<PerformanceReport[]>([]);
    const [currentReport, setCurrentReport] = useState<PerformanceReport | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['size', 'timing', 'count']));

    const { generateContent } = useGemini();
    const { context } = usePageContext();
    const { success, error: showError } = useToast();
    const { integrations } = useIntegrations();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await chrome.storage.local.get(STORAGE_KEY) as { [key: string]: { budgets?: BudgetRule[]; reports?: PerformanceReport[] } | undefined };
            const stored = data[STORAGE_KEY];
            if (stored?.budgets) setBudgets(stored.budgets);
            if (stored?.reports) setReports(stored.reports);
        } catch (err) {
            console.error('Failed to load data:', err);
        }
    };

    const saveData = async (newBudgets?: BudgetRule[], newReports?: PerformanceReport[]) => {
        try {
            await chrome.storage.local.set({
                [STORAGE_KEY]: {
                    budgets: newBudgets || budgets,
                    reports: newReports || reports
                }
            });
        } catch (err) {
            console.error('Failed to save data:', err);
        }
    };

    const updateBudget = (id: string, maxValue: number) => {
        const updated = budgets.map(b => b.id === id ? { ...b, maxValue } : b);
        setBudgets(updated);
        saveData(updated);
    };

    const analyzePerformance = async () => {
        if (!context?.url) {
            showError('No page context available');
            return;
        }

        setIsAnalyzing(true);

        try {
            // Get performance metrics from the page
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) throw new Error('No active tab');

            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
                    const paintEntries = performance.getEntriesByType('paint');

                    let jsSize = 0, cssSize = 0, imageSize = 0, fontSize = 0, totalSize = 0;
                    let requests = entries.length;

                    entries.forEach(entry => {
                        const size = entry.transferSize || 0;
                        totalSize += size;

                        if (entry.initiatorType === 'script' || entry.name.includes('.js')) {
                            jsSize += size;
                        } else if (entry.initiatorType === 'css' || entry.name.includes('.css')) {
                            cssSize += size;
                        } else if (entry.initiatorType === 'img' || /\.(jpg|jpeg|png|gif|webp|svg|ico)/.test(entry.name)) {
                            imageSize += size;
                        } else if (/\.(woff|woff2|ttf|otf|eot)/.test(entry.name)) {
                            fontSize += size;
                        }
                    });

                    const domNodes = document.getElementsByTagName('*').length;

                    const fcp = paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || 0;
                    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
                    const lcp = navEntry?.loadEventEnd || 0;
                    const tti = navEntry?.domInteractive || 0;

                    return {
                        totalSize: Math.round(totalSize / 1024),
                        jsSize: Math.round(jsSize / 1024),
                        cssSize: Math.round(cssSize / 1024),
                        imageSize: Math.round(imageSize / 1024),
                        fontSize: Math.round(fontSize / 1024),
                        domNodes,
                        requests,
                        fcp: Math.round(fcp),
                        lcp: Math.round(lcp),
                        tti: Math.round(tti)
                    };
                }
            });

            const metrics = results[0]?.result;
            if (!metrics) throw new Error('Failed to collect metrics');

            // Calculate results against budgets
            const metricResults: MetricResult[] = budgets.map(budget => {
                const currentValue = (metrics as Record<string, number>)[budget.metric] || 0;
                const percentUsed = (currentValue / budget.maxValue) * 100;

                let status: 'pass' | 'warning' | 'fail' = 'pass';
                if (percentUsed > 100) status = 'fail';
                else if (percentUsed > 80) status = 'warning';

                // Check trend against previous report
                const prevReport = reports[0];
                const prevMetric = prevReport?.metrics.find(m => m.ruleId === budget.id);
                let trend: 'up' | 'down' | 'stable' = 'stable';
                if (prevMetric) {
                    const diff = currentValue - prevMetric.currentValue;
                    if (diff > 5) trend = 'up';
                    else if (diff < -5) trend = 'down';
                }

                return {
                    ruleId: budget.id,
                    name: budget.name,
                    currentValue,
                    maxValue: budget.maxValue,
                    unit: budget.unit,
                    status,
                    percentUsed: Math.min(percentUsed, 150),
                    trend
                };
            });

            // Calculate overall score
            const failCount = metricResults.filter(m => m.status === 'fail').length;
            const warningCount = metricResults.filter(m => m.status === 'warning').length;
            const overallScore = Math.max(0, 100 - (failCount * 15) - (warningCount * 5));

            // Generate AI insights
            const failedMetrics = metricResults.filter(m => m.status === 'fail');
            const warningMetrics = metricResults.filter(m => m.status === 'warning');

            let aiInsights = '';
            let recommendations: string[] = [];

            if (failedMetrics.length > 0 || warningMetrics.length > 0) {
                const prompt = `Analyze these web performance budget violations and provide insights:

**Failed Metrics (Over Budget):**
${failedMetrics.map(m => `- ${m.name}: ${m.currentValue}${m.unit} (budget: ${m.maxValue}${m.unit}, ${m.percentUsed.toFixed(0)}% used)`).join('\n') || 'None'}

**Warning Metrics (>80% of Budget):**
${warningMetrics.map(m => `- ${m.name}: ${m.currentValue}${m.unit} (budget: ${m.maxValue}${m.unit}, ${m.percentUsed.toFixed(0)}% used)`).join('\n') || 'None'}

URL: ${context.url}

Provide:
1. A brief analysis (2-3 sentences) of the performance issues
2. 3-5 specific, actionable recommendations to fix the violations

Format as JSON:
{
  "analysis": "string",
  "recommendations": ["string", "string", ...]
}`;

                const response = await generateContent(prompt, undefined, { jsonMode: true });
                try {
                    const parsed = JSON.parse(response);
                    aiInsights = parsed.analysis || '';
                    recommendations = parsed.recommendations || [];
                } catch {
                    aiInsights = 'Performance analysis complete. Review failed metrics for optimization opportunities.';
                    recommendations = ['Optimize large assets', 'Reduce HTTP requests', 'Implement lazy loading'];
                }
            } else {
                aiInsights = 'Excellent! All performance metrics are within budget. The page meets all defined performance criteria.';
                recommendations = ['Continue monitoring for regressions', 'Consider tightening budgets for further optimization'];
            }

            const report: PerformanceReport = {
                timestamp: new Date().toISOString(),
                url: context.url,
                overallScore,
                metrics: metricResults,
                recommendations,
                aiInsights
            };

            setCurrentReport(report);
            const updatedReports = [report, ...reports].slice(0, 20);
            setReports(updatedReports);
            saveData(undefined, updatedReports);
            success('Performance analysis complete');

        } catch (err) {
            console.error('Analysis failed:', err);
            showError('Failed to analyze performance');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const exportReport = () => {
        if (!currentReport) return;

        const markdown = `# Performance Budget Report

**URL:** ${currentReport.url}
**Date:** ${new Date(currentReport.timestamp).toLocaleString()}
**Overall Score:** ${currentReport.overallScore}/100

## Metrics Summary

| Metric | Current | Budget | Status |
|--------|---------|--------|--------|
${currentReport.metrics.map(m =>
    `| ${m.name} | ${m.currentValue}${m.unit} | ${m.maxValue}${m.unit} | ${m.status.toUpperCase()} |`
).join('\n')}

## AI Analysis

${currentReport.aiInsights}

## Recommendations

${currentReport.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

---
Generated by MicroLabs Performance Budget Enforcer
`;

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-report-${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        URL.revokeObjectURL(url);
        success('Report exported');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pass': return 'text-green-400 bg-green-500/10';
            case 'warning': return 'text-yellow-400 bg-yellow-500/10';
            case 'fail': return 'text-red-400 bg-red-500/10';
            default: return 'text-slate-400 bg-slate-500/10';
        }
    };

    const getProgressColor = (status: string) => {
        switch (status) {
            case 'pass': return 'bg-green-500';
            case 'warning': return 'bg-yellow-500';
            case 'fail': return 'bg-red-500';
            default: return 'bg-slate-500';
        }
    };

    const getTrendIcon = (trend?: string) => {
        switch (trend) {
            case 'up': return <TrendingUp size={12} className="text-red-400" />;
            case 'down': return <TrendingDown size={12} className="text-green-400" />;
            default: return <Minus size={12} className="text-slate-500" />;
        }
    };

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

    const groupedBudgets = {
        size: budgets.filter(b => b.category === 'size'),
        timing: budgets.filter(b => b.category === 'timing'),
        count: budgets.filter(b => b.category === 'count')
    };

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex gap-2">
                <button
                    onClick={analyzePerformance}
                    disabled={isAnalyzing}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                    {isAnalyzing ? (
                        <>
                            <Gauge size={16} className="animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Play size={16} />
                            Analyze Performance
                        </>
                    )}
                </button>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`btn-secondary p-3 ${showSettings ? 'bg-blue-600 text-white' : ''}`}
                >
                    <Settings size={16} />
                </button>
            </div>

            {/* Budget Settings */}
            {showSettings && (
                <div className="card p-4 space-y-4">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                        <Settings size={14} className="text-blue-400" />
                        Performance Budgets
                    </h3>

                    {Object.entries(groupedBudgets).map(([category, categoryBudgets]) => (
                        <div key={category}>
                            <button
                                onClick={() => toggleCategory(category)}
                                className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-400 uppercase"
                            >
                                <span>{category === 'size' ? 'Asset Sizes' : category === 'timing' ? 'Timing Metrics' : 'Counts'}</span>
                                {expandedCategories.has(category) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>

                            {expandedCategories.has(category) && (
                                <div className="space-y-2">
                                    {categoryBudgets.map(budget => (
                                        <div key={budget.id} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg">
                                            <div className="text-slate-400">{budget.icon}</div>
                                            <span className="flex-1 text-xs">{budget.name}</span>
                                            <input
                                                type="number"
                                                value={budget.maxValue}
                                                onChange={(e) => updateBudget(budget.id, parseInt(e.target.value) || 0)}
                                                className="w-20 text-xs text-right bg-slate-900 border border-slate-700 rounded px-2 py-1"
                                            />
                                            <span className="text-[10px] text-slate-500 w-12">{budget.unit}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Current Report */}
            {currentReport && (
                <div className="space-y-4">
                    {/* Score Card */}
                    <div className="card p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold">Performance Score</h3>
                                <p className="text-xs text-slate-500">{new Date(currentReport.timestamp).toLocaleString()}</p>
                            </div>
                            <div className={`text-4xl font-black ${
                                currentReport.overallScore >= 90 ? 'text-green-400' :
                                currentReport.overallScore >= 70 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                                {currentReport.overallScore}
                            </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <div className="text-lg font-bold text-green-400">
                                    {currentReport.metrics.filter(m => m.status === 'pass').length}
                                </div>
                                <div className="text-[10px] text-slate-500">Passing</div>
                            </div>
                            <div className="p-2 bg-yellow-500/10 rounded-lg">
                                <div className="text-lg font-bold text-yellow-400">
                                    {currentReport.metrics.filter(m => m.status === 'warning').length}
                                </div>
                                <div className="text-[10px] text-slate-500">Warning</div>
                            </div>
                            <div className="p-2 bg-red-500/10 rounded-lg">
                                <div className="text-lg font-bold text-red-400">
                                    {currentReport.metrics.filter(m => m.status === 'fail').length}
                                </div>
                                <div className="text-[10px] text-slate-500">Failed</div>
                            </div>
                        </div>
                    </div>

                    {/* Metrics Details */}
                    <div className="card p-4 space-y-3">
                        <h3 className="text-sm font-bold">Metrics Breakdown</h3>

                        {currentReport.metrics.map(metric => (
                            <div key={metric.ruleId} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{metric.name}</span>
                                        {getTrendIcon(metric.trend)}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={getStatusColor(metric.status) + ' px-2 py-0.5 rounded text-[10px] font-bold'}>
                                            {metric.currentValue}{metric.unit} / {metric.maxValue}{metric.unit}
                                        </span>
                                    </div>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${getProgressColor(metric.status)} transition-all`}
                                        style={{ width: `${Math.min(metric.percentUsed, 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* AI Insights */}
                    <div className="card p-4 space-y-3">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <Zap size={14} className="text-blue-400" />
                            AI Analysis
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">{currentReport.aiInsights}</p>

                        {currentReport.recommendations.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-400">Recommendations</h4>
                                <ul className="space-y-1">
                                    {currentReport.recommendations.map((rec, i) => (
                                        <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                                            <CheckCircle size={12} className="text-green-400 mt-0.5 flex-shrink-0" />
                                            {rec}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button onClick={exportReport} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                            <Download size={14} />
                            Export Report
                        </button>
                        <SendToIntegrations
                            appId="performance-budget-enforcer"
                            appName="Performance Budget Enforcer"
                            data={{
                                url: currentReport.url,
                                score: currentReport.overallScore,
                                metrics: currentReport.metrics,
                                recommendations: currentReport.recommendations,
                                analysis: currentReport.aiInsights
                            }}
                            source={{ url: context?.url }}
                        />
                    </div>
                </div>
            )}

            {/* History */}
            {reports.length > 1 && (
                <div className="card p-4 space-y-3">
                    <h3 className="text-sm font-bold">Recent Reports</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {reports.slice(1, 6).map((report, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800"
                                onClick={() => setCurrentReport(report)}
                            >
                                <div className="text-xs">
                                    <div className="font-medium truncate max-w-[180px]">{new URL(report.url).hostname}</div>
                                    <div className="text-slate-500">{new Date(report.timestamp).toLocaleDateString()}</div>
                                </div>
                                <div className={`text-lg font-bold ${
                                    report.overallScore >= 90 ? 'text-green-400' :
                                    report.overallScore >= 70 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                    {report.overallScore}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!currentReport && !isAnalyzing && (
                <div className="text-center py-12 text-slate-500">
                    <Gauge size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">Click "Analyze Performance" to check your page against defined budgets</p>
                </div>
            )}
        </div>
    );
}
