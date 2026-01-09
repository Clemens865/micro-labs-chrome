import React, { useState } from 'react';
import { usePageContext } from '../../hooks/usePageContext';
import {
    Accessibility,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Eye,
    Keyboard,
    Type,
    Image,
    Link,
    FileText,
    Contrast,
    Volume2
} from 'lucide-react';

interface A11yIssue {
    severity: 'error' | 'warning' | 'passed';
    category: string;
    title: string;
    description: string;
    count?: number;
    elements?: string[];
}

interface A11yReport {
    score: number;
    issues: A11yIssue[];
    summary: {
        errors: number;
        warnings: number;
        passed: number;
    };
    metrics: {
        imagesWithAlt: number;
        imagesTotal: number;
        linksWithText: number;
        linksTotal: number;
        formLabels: number;
        formInputs: number;
        headingStructure: boolean;
        languageDeclared: boolean;
        landmarkRegions: number;
        skipLink: boolean;
        focusVisible: boolean;
    };
}

const AccessibilityAuditor: React.FC = () => {
    const { context } = usePageContext();
    const [report, setReport] = useState<A11yReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const runAudit = async () => {
        setLoading(true);
        setStatus('Running accessibility audit...');

        try {
            const result = await new Promise<A11yReport>((resolve) => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const tab = tabs[0];
                    if (!tab?.id) {
                        resolve(emptyReport());
                        return;
                    }

                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            const issues: any[] = [];

                            // Images
                            const images = document.querySelectorAll('img');
                            const imagesWithAlt = [...images].filter(img => img.alt && img.alt.trim().length > 0);
                            const imagesWithoutAlt = [...images].filter(img => !img.alt || img.alt.trim().length === 0);

                            if (imagesWithoutAlt.length > 0) {
                                issues.push({
                                    severity: 'error',
                                    category: 'Images',
                                    title: 'Images missing alt text',
                                    description: `${imagesWithoutAlt.length} image(s) don't have alt text, making them inaccessible to screen readers.`,
                                    count: imagesWithoutAlt.length
                                });
                            } else if (images.length > 0) {
                                issues.push({
                                    severity: 'passed',
                                    category: 'Images',
                                    title: 'All images have alt text',
                                    description: `All ${images.length} image(s) have alt text.`,
                                    count: images.length
                                });
                            }

                            // Links
                            const links = document.querySelectorAll('a');
                            const emptyLinks = [...links].filter(a => {
                                const text = a.textContent?.trim() || '';
                                const ariaLabel = a.getAttribute('aria-label') || '';
                                const title = a.getAttribute('title') || '';
                                const img = a.querySelector('img[alt]');
                                return !text && !ariaLabel && !title && !img;
                            });

                            if (emptyLinks.length > 0) {
                                issues.push({
                                    severity: 'error',
                                    category: 'Links',
                                    title: 'Empty or unlabeled links',
                                    description: `${emptyLinks.length} link(s) have no accessible text.`,
                                    count: emptyLinks.length
                                });
                            } else if (links.length > 0) {
                                issues.push({
                                    severity: 'passed',
                                    category: 'Links',
                                    title: 'All links have accessible text',
                                    description: `All ${links.length} link(s) are properly labeled.`,
                                    count: links.length
                                });
                            }

                            // Form labels
                            const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea');
                            const inputsWithLabels = [...inputs].filter(input => {
                                const id = input.getAttribute('id');
                                const ariaLabel = input.getAttribute('aria-label');
                                const ariaLabelledBy = input.getAttribute('aria-labelledby');
                                const hasLabel = id ? document.querySelector(`label[for="${id}"]`) : null;
                                const parentLabel = input.closest('label');
                                return ariaLabel || ariaLabelledBy || hasLabel || parentLabel;
                            });

                            if (inputs.length > 0 && inputsWithLabels.length < inputs.length) {
                                issues.push({
                                    severity: 'error',
                                    category: 'Forms',
                                    title: 'Form inputs missing labels',
                                    description: `${inputs.length - inputsWithLabels.length} input(s) don't have associated labels.`,
                                    count: inputs.length - inputsWithLabels.length
                                });
                            } else if (inputs.length > 0) {
                                issues.push({
                                    severity: 'passed',
                                    category: 'Forms',
                                    title: 'All form inputs have labels',
                                    description: `All ${inputs.length} input(s) are properly labeled.`,
                                    count: inputs.length
                                });
                            }

                            // Heading structure
                            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                            const headingLevels = [...headings].map(h => parseInt(h.tagName.charAt(1)));
                            let hasSkippedLevel = false;
                            let prevLevel = 0;
                            for (const level of headingLevels) {
                                if (prevLevel > 0 && level > prevLevel + 1) {
                                    hasSkippedLevel = true;
                                    break;
                                }
                                prevLevel = level;
                            }

                            const h1Count = document.querySelectorAll('h1').length;
                            if (h1Count === 0) {
                                issues.push({
                                    severity: 'error',
                                    category: 'Headings',
                                    title: 'Missing H1 heading',
                                    description: 'Page has no H1 heading, which is important for screen readers and SEO.'
                                });
                            } else if (h1Count > 1) {
                                issues.push({
                                    severity: 'warning',
                                    category: 'Headings',
                                    title: 'Multiple H1 headings',
                                    description: `Page has ${h1Count} H1 headings. Consider using only one main H1.`,
                                    count: h1Count
                                });
                            }

                            if (hasSkippedLevel) {
                                issues.push({
                                    severity: 'warning',
                                    category: 'Headings',
                                    title: 'Heading levels skipped',
                                    description: 'Heading hierarchy skips levels (e.g., H1 to H3). This can confuse screen readers.'
                                });
                            } else if (headings.length > 0 && !hasSkippedLevel) {
                                issues.push({
                                    severity: 'passed',
                                    category: 'Headings',
                                    title: 'Proper heading structure',
                                    description: 'Heading levels are sequential and well-organized.'
                                });
                            }

                            // Language declaration
                            const htmlLang = document.documentElement.getAttribute('lang');
                            if (!htmlLang) {
                                issues.push({
                                    severity: 'error',
                                    category: 'Document',
                                    title: 'Missing language attribute',
                                    description: 'The <html> element has no lang attribute. Screen readers need this to pronounce content correctly.'
                                });
                            } else {
                                issues.push({
                                    severity: 'passed',
                                    category: 'Document',
                                    title: 'Language declared',
                                    description: `Page language is set to "${htmlLang}".`
                                });
                            }

                            // Landmark regions
                            const landmarks = document.querySelectorAll('header, nav, main, footer, aside, [role="banner"], [role="navigation"], [role="main"], [role="contentinfo"], [role="complementary"]');
                            if (landmarks.length === 0) {
                                issues.push({
                                    severity: 'warning',
                                    category: 'Navigation',
                                    title: 'No landmark regions',
                                    description: 'Page has no semantic landmark regions (header, nav, main, footer). These help screen reader users navigate.'
                                });
                            } else {
                                issues.push({
                                    severity: 'passed',
                                    category: 'Navigation',
                                    title: 'Landmark regions present',
                                    description: `Found ${landmarks.length} landmark region(s) for navigation.`,
                                    count: landmarks.length
                                });
                            }

                            // Skip link
                            const skipLink = document.querySelector('a[href^="#main"], a[href^="#content"], .skip-link, [class*="skip"]');
                            if (!skipLink) {
                                issues.push({
                                    severity: 'warning',
                                    category: 'Navigation',
                                    title: 'No skip link found',
                                    description: 'Consider adding a "Skip to main content" link for keyboard users.'
                                });
                            } else {
                                issues.push({
                                    severity: 'passed',
                                    category: 'Navigation',
                                    title: 'Skip link present',
                                    description: 'Page has a skip link for keyboard navigation.'
                                });
                            }

                            // Buttons without accessible name
                            const buttons = document.querySelectorAll('button, [role="button"]');
                            const emptyButtons = [...buttons].filter(btn => {
                                const text = btn.textContent?.trim() || '';
                                const ariaLabel = btn.getAttribute('aria-label') || '';
                                const title = btn.getAttribute('title') || '';
                                return !text && !ariaLabel && !title;
                            });

                            if (emptyButtons.length > 0) {
                                issues.push({
                                    severity: 'error',
                                    category: 'Buttons',
                                    title: 'Buttons without accessible names',
                                    description: `${emptyButtons.length} button(s) have no accessible text or aria-label.`,
                                    count: emptyButtons.length
                                });
                            }

                            // ARIA roles check
                            const invalidRoles = document.querySelectorAll('[role=""]');
                            if (invalidRoles.length > 0) {
                                issues.push({
                                    severity: 'warning',
                                    category: 'ARIA',
                                    title: 'Empty ARIA roles',
                                    description: `${invalidRoles.length} element(s) have empty role attributes.`,
                                    count: invalidRoles.length
                                });
                            }

                            // Tabindex issues
                            const positiveTabindex = document.querySelectorAll('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])');
                            if (positiveTabindex.length > 0) {
                                issues.push({
                                    severity: 'warning',
                                    category: 'Keyboard',
                                    title: 'Positive tabindex values',
                                    description: `${positiveTabindex.length} element(s) have positive tabindex, which can disrupt natural tab order.`,
                                    count: positiveTabindex.length
                                });
                            }

                            // Calculate score
                            const errors = issues.filter(i => i.severity === 'error').length;
                            const warnings = issues.filter(i => i.severity === 'warning').length;
                            const passed = issues.filter(i => i.severity === 'passed').length;
                            const total = errors + warnings + passed;
                            const score = total > 0 ? Math.round(((passed + warnings * 0.5) / total) * 100) : 100;

                            return {
                                score: Math.max(0, score - (errors * 10)),
                                issues,
                                summary: { errors, warnings, passed },
                                metrics: {
                                    imagesWithAlt: imagesWithAlt.length,
                                    imagesTotal: images.length,
                                    linksWithText: links.length - emptyLinks.length,
                                    linksTotal: links.length,
                                    formLabels: inputsWithLabels.length,
                                    formInputs: inputs.length,
                                    headingStructure: !hasSkippedLevel,
                                    languageDeclared: !!htmlLang,
                                    landmarkRegions: landmarks.length,
                                    skipLink: !!skipLink,
                                    focusVisible: true
                                }
                            };
                        }
                    }, (results) => {
                        if (results?.[0]?.result) {
                            resolve(results[0].result);
                        } else {
                            resolve(emptyReport());
                        }
                    });
                });
            });

            setReport(result);
            setStatus('');
        } catch (err) {
            console.error('Audit error:', err);
            setStatus('Audit failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const emptyReport = (): A11yReport => ({
        score: 0,
        issues: [],
        summary: { errors: 0, warnings: 0, passed: 0 },
        metrics: {
            imagesWithAlt: 0,
            imagesTotal: 0,
            linksWithText: 0,
            linksTotal: 0,
            formLabels: 0,
            formInputs: 0,
            headingStructure: false,
            languageDeclared: false,
            landmarkRegions: 0,
            skipLink: false,
            focusVisible: false
        }
    });

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'from-green-500 to-emerald-500';
        if (score >= 70) return 'from-yellow-500 to-amber-500';
        if (score >= 50) return 'from-orange-500 to-red-500';
        return 'from-red-500 to-rose-600';
    };

    const IssueIcon = ({ severity }: { severity: string }) => {
        switch (severity) {
            case 'error': return <XCircle size={14} className="text-red-400" />;
            case 'warning': return <AlertTriangle size={14} className="text-yellow-400" />;
            case 'passed': return <CheckCircle2 size={14} className="text-green-400" />;
            default: return null;
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'Images': return Image;
            case 'Links': return Link;
            case 'Forms': return FileText;
            case 'Headings': return Type;
            case 'Document': return FileText;
            case 'Navigation': return Keyboard;
            case 'Buttons': return Keyboard;
            case 'ARIA': return Accessibility;
            case 'Keyboard': return Keyboard;
            default: return Eye;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20">
                    <Accessibility size={28} className="text-white" />
                </div>
                <h2 className="text-lg font-bold">Accessibility Auditor</h2>
                <p className="text-xs text-slate-400 mt-1">WCAG compliance & a11y best practices</p>
            </div>

            {/* Current Page */}
            {context?.url && (
                <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                    <p className="text-xs text-slate-400 truncate">{context.url}</p>
                    <p className="text-sm text-slate-200 font-medium truncate mt-1">{context.title}</p>
                </div>
            )}

            {/* Audit Button */}
            {!report && (
                <button
                    onClick={runAudit}
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2 !bg-gradient-to-r !from-blue-600 !to-purple-600"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            Auditing...
                        </>
                    ) : (
                        <>
                            <Accessibility size={18} />
                            Run Accessibility Audit
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
                    <div className={`p-6 rounded-2xl bg-gradient-to-br ${getScoreColor(report.score)} relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="relative flex items-center justify-between">
                            <div>
                                <p className="text-white/70 text-xs uppercase tracking-wider">Accessibility Score</p>
                                <p className="text-5xl font-bold text-white mt-1">{report.score}</p>
                                <p className="text-white/70 text-xs mt-1">out of 100</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs">
                                    <XCircle size={14} className="text-white" />
                                    <span className="text-white">{report.summary.errors} errors</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <AlertTriangle size={14} className="text-white" />
                                    <span className="text-white">{report.summary.warnings} warnings</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <CheckCircle2 size={14} className="text-white" />
                                    <span className="text-white">{report.summary.passed} passed</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Metrics */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-slate-800/50 border border-white/5 rounded-xl flex items-center gap-3">
                            <Image size={18} className="text-blue-400" />
                            <div>
                                <p className="text-xs text-slate-400">Images with Alt</p>
                                <p className="text-sm font-bold text-slate-200">{report.metrics.imagesWithAlt}/{report.metrics.imagesTotal}</p>
                            </div>
                        </div>
                        <div className="p-3 bg-slate-800/50 border border-white/5 rounded-xl flex items-center gap-3">
                            <Link size={18} className="text-purple-400" />
                            <div>
                                <p className="text-xs text-slate-400">Labeled Links</p>
                                <p className="text-sm font-bold text-slate-200">{report.metrics.linksWithText}/{report.metrics.linksTotal}</p>
                            </div>
                        </div>
                        <div className="p-3 bg-slate-800/50 border border-white/5 rounded-xl flex items-center gap-3">
                            <FileText size={18} className="text-green-400" />
                            <div>
                                <p className="text-xs text-slate-400">Form Labels</p>
                                <p className="text-sm font-bold text-slate-200">{report.metrics.formLabels}/{report.metrics.formInputs}</p>
                            </div>
                        </div>
                        <div className="p-3 bg-slate-800/50 border border-white/5 rounded-xl flex items-center gap-3">
                            <Keyboard size={18} className="text-orange-400" />
                            <div>
                                <p className="text-xs text-slate-400">Landmarks</p>
                                <p className="text-sm font-bold text-slate-200">{report.metrics.landmarkRegions}</p>
                            </div>
                        </div>
                    </div>

                    {/* Issues List */}
                    <div className="space-y-2">
                        <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Audit Results</h3>

                        {/* Errors first */}
                        {report.issues.filter(i => i.severity === 'error').map((issue, idx) => {
                            const CategoryIcon = getCategoryIcon(issue.category);
                            return (
                                <div key={`error-${idx}`} className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <div className="flex items-start gap-2">
                                        <IssueIcon severity={issue.severity} />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-white">{issue.title}</span>
                                                {issue.count && (
                                                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px]">{issue.count}</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">{issue.description}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Warnings */}
                        {report.issues.filter(i => i.severity === 'warning').map((issue, idx) => (
                            <div key={`warning-${idx}`} className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                                <div className="flex items-start gap-2">
                                    <IssueIcon severity={issue.severity} />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-white">{issue.title}</span>
                                            {issue.count && (
                                                <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[10px]">{issue.count}</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">{issue.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Passed */}
                        {report.issues.filter(i => i.severity === 'passed').map((issue, idx) => (
                            <div key={`passed-${idx}`} className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                                <div className="flex items-start gap-2">
                                    <IssueIcon severity={issue.severity} />
                                    <div className="flex-1">
                                        <span className="text-xs font-medium text-white">{issue.title}</span>
                                        <p className="text-xs text-slate-400 mt-1">{issue.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Re-audit */}
                    <button
                        onClick={() => setReport(null)}
                        className="w-full py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        Run Audit Again
                    </button>
                </div>
            )}
        </div>
    );
};

export default AccessibilityAuditor;
