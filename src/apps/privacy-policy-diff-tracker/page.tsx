'use client';

import React, { useState, useEffect } from 'react';
import { FileText, AlertTriangle, Clock, Download, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, Eye, Scale, Bell, Loader2, Check, X, GitCompare, History } from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';
import { useIntegrations } from '../../hooks/useIntegrations';
import SendToIntegrations from '../../components/SendToIntegrations';

interface PolicyVersion {
    id: string;
    url: string;
    domain: string;
    timestamp: string;
    content: string;
    contentHash: string;
    wordCount: number;
}

interface PolicyDiff {
    id: string;
    domain: string;
    oldVersion: PolicyVersion;
    newVersion: PolicyVersion;
    timestamp: string;
    changes: {
        type: 'added' | 'removed' | 'modified';
        section: string;
        oldText?: string;
        newText?: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        summary: string;
    }[];
    aiAnalysis: {
        overallSeverity: 'low' | 'medium' | 'high' | 'critical';
        summary: string;
        keyChanges: string[];
        recommendations: string[];
        dataCollectionChanges: boolean;
        thirdPartyChanges: boolean;
        retentionChanges: boolean;
    };
}

interface TrackedPolicy {
    domain: string;
    url: string;
    lastChecked: string;
    versions: PolicyVersion[];
    diffs: PolicyDiff[];
}

const STORAGE_KEY = 'microlabs_privacy_policy_diff_tracker';

export default function PrivacyPolicyDiffTracker() {
    const [trackedPolicies, setTrackedPolicies] = useState<TrackedPolicy[]>([]);
    const [currentPolicy, setCurrentPolicy] = useState<PolicyVersion | null>(null);
    const [currentDiff, setCurrentDiff] = useState<PolicyDiff | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isComparing, setIsComparing] = useState(false);
    const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set());
    const [showDiffDetail, setShowDiffDetail] = useState(false);

    const { generateContent } = useGemini();
    const { context } = usePageContext();
    const { success, error: showError, info } = useToast();
    const { integrations } = useIntegrations();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await chrome.storage.local.get(STORAGE_KEY) as { [key: string]: { policies?: TrackedPolicy[] } | undefined };
            const stored = data[STORAGE_KEY];
            if (stored?.policies) setTrackedPolicies(stored.policies);
        } catch (err) {
            console.error('Failed to load data:', err);
        }
    };

    const saveData = async (policies: TrackedPolicy[]) => {
        try {
            await chrome.storage.local.set({
                [STORAGE_KEY]: { policies }
            });
        } catch (err) {
            console.error('Failed to save data:', err);
        }
    };

    const hashContent = async (content: string): Promise<string> => {
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    };

    const capturePolicy = async () => {
        if (!context?.content || !context?.url) {
            showError('No page content available');
            return;
        }

        setIsCapturing(true);

        try {
            const domain = new URL(context.url).hostname;
            const content = context.content;
            const contentHash = await hashContent(content);

            const version: PolicyVersion = {
                id: Date.now().toString(),
                url: context.url,
                domain,
                timestamp: new Date().toISOString(),
                content,
                contentHash,
                wordCount: content.split(/\s+/).length
            };

            setCurrentPolicy(version);

            // Check if already tracking this domain
            const existingPolicy = trackedPolicies.find(p => p.domain === domain);

            if (existingPolicy) {
                // Check if content changed
                const latestVersion = existingPolicy.versions[0];
                if (latestVersion && latestVersion.contentHash === contentHash) {
                    info('Policy unchanged since last capture');
                    setIsCapturing(false);
                    return;
                }

                // Add new version and trigger comparison
                const updatedPolicy: TrackedPolicy = {
                    ...existingPolicy,
                    url: context.url,
                    lastChecked: new Date().toISOString(),
                    versions: [version, ...existingPolicy.versions].slice(0, 10)
                };

                const updated = trackedPolicies.map(p =>
                    p.domain === domain ? updatedPolicy : p
                );
                setTrackedPolicies(updated);
                saveData(updated);

                if (latestVersion) {
                    await compareVersions(latestVersion, version, updatedPolicy, updated);
                }

                success('Policy captured - changes detected!');
            } else {
                // New policy to track
                const newPolicy: TrackedPolicy = {
                    domain,
                    url: context.url,
                    lastChecked: new Date().toISOString(),
                    versions: [version],
                    diffs: []
                };

                const updated = [newPolicy, ...trackedPolicies];
                setTrackedPolicies(updated);
                saveData(updated);
                success('Now tracking this policy');
            }

        } catch (err) {
            console.error('Failed to capture policy:', err);
            showError('Failed to capture policy');
        } finally {
            setIsCapturing(false);
        }
    };

    const compareVersions = async (
        oldVersion: PolicyVersion,
        newVersion: PolicyVersion,
        policy: TrackedPolicy,
        allPolicies: TrackedPolicy[]
    ) => {
        setIsComparing(true);

        try {
            const prompt = `Compare these two versions of a privacy policy and identify significant changes.

**OLD VERSION (${new Date(oldVersion.timestamp).toLocaleDateString()}):**
${oldVersion.content.slice(0, 6000)}

**NEW VERSION (${new Date(newVersion.timestamp).toLocaleDateString()}):**
${newVersion.content.slice(0, 6000)}

Analyze the changes and provide:
1. List of specific changes with severity ratings
2. Overall analysis of privacy implications
3. Key changes affecting user rights
4. Recommendations for users

Return as JSON:
{
  "changes": [
    {
      "type": "added|removed|modified",
      "section": "Section name or topic",
      "oldText": "Original text (if applicable)",
      "newText": "New text (if applicable)",
      "severity": "low|medium|high|critical",
      "summary": "Brief description of change"
    }
  ],
  "aiAnalysis": {
    "overallSeverity": "low|medium|high|critical",
    "summary": "Overall summary of changes (2-3 sentences)",
    "keyChanges": ["Key change 1", "Key change 2"],
    "recommendations": ["What users should do"],
    "dataCollectionChanges": true/false,
    "thirdPartyChanges": true/false,
    "retentionChanges": true/false
  }
}`;

            const response = await generateContent(prompt, undefined, { jsonMode: true });
            const parsed = JSON.parse(response);

            const diff: PolicyDiff = {
                id: Date.now().toString(),
                domain: policy.domain,
                oldVersion,
                newVersion,
                timestamp: new Date().toISOString(),
                changes: parsed.changes || [],
                aiAnalysis: parsed.aiAnalysis
            };

            setCurrentDiff(diff);

            // Update policy with new diff
            const updatedPolicy = {
                ...policy,
                diffs: [diff, ...policy.diffs].slice(0, 10)
            };

            const updated = allPolicies.map(p =>
                p.domain === policy.domain ? updatedPolicy : p
            );
            setTrackedPolicies(updated);
            saveData(updated);

        } catch (err) {
            console.error('Failed to compare versions:', err);
            showError('Failed to analyze changes');
        } finally {
            setIsComparing(false);
        }
    };

    const removePolicy = (domain: string) => {
        const updated = trackedPolicies.filter(p => p.domain !== domain);
        setTrackedPolicies(updated);
        saveData(updated);
        success('Policy removed from tracking');
    };

    const toggleExpanded = (domain: string) => {
        setExpandedPolicies(prev => {
            const next = new Set(prev);
            if (next.has(domain)) next.delete(domain);
            else next.add(domain);
            return next;
        });
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'low': return 'text-green-400 bg-green-500/10';
            case 'medium': return 'text-yellow-400 bg-yellow-500/10';
            case 'high': return 'text-orange-400 bg-orange-500/10';
            case 'critical': return 'text-red-400 bg-red-500/10';
            default: return 'text-slate-400 bg-slate-500/10';
        }
    };

    const getChangeIcon = (type: string) => {
        switch (type) {
            case 'added': return <Plus size={12} className="text-green-400" />;
            case 'removed': return <X size={12} className="text-red-400" />;
            case 'modified': return <RefreshCw size={12} className="text-yellow-400" />;
            default: return <Eye size={12} />;
        }
    };

    const exportDiff = (diff: PolicyDiff) => {
        const markdown = `# Privacy Policy Change Report

**Domain:** ${diff.domain}
**Compared:** ${new Date(diff.oldVersion.timestamp).toLocaleDateString()} → ${new Date(diff.newVersion.timestamp).toLocaleDateString()}
**Generated:** ${new Date(diff.timestamp).toLocaleString()}

## Overall Assessment

**Severity:** ${diff.aiAnalysis.overallSeverity.toUpperCase()}

${diff.aiAnalysis.summary}

### Key Changes
${diff.aiAnalysis.keyChanges.map(c => `- ${c}`).join('\n')}

### Impact Areas
- Data Collection Changes: ${diff.aiAnalysis.dataCollectionChanges ? '⚠️ Yes' : '✅ No'}
- Third-Party Sharing Changes: ${diff.aiAnalysis.thirdPartyChanges ? '⚠️ Yes' : '✅ No'}
- Retention Policy Changes: ${diff.aiAnalysis.retentionChanges ? '⚠️ Yes' : '✅ No'}

## Detailed Changes

${diff.changes.map((c, i) => `
### ${i + 1}. ${c.section}
**Type:** ${c.type.toUpperCase()} | **Severity:** ${c.severity.toUpperCase()}

${c.summary}

${c.oldText ? `**Previous:** ${c.oldText.slice(0, 200)}...` : ''}
${c.newText ? `**Current:** ${c.newText.slice(0, 200)}...` : ''}
`).join('\n---\n')}

## Recommendations

${diff.aiAnalysis.recommendations.map(r => `- ${r}`).join('\n')}

---
Generated by MicroLabs Privacy Policy Diff Tracker
`;

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `privacy-changes-${diff.domain}-${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        URL.revokeObjectURL(url);
        success('Report exported');
    };

    const viewDiff = (diff: PolicyDiff) => {
        setCurrentDiff(diff);
        setShowDiffDetail(true);
    };

    return (
        <div className="space-y-6">
            {/* Capture Button */}
            <button
                onClick={capturePolicy}
                disabled={isCapturing || !context?.content}
                className="btn-primary w-full flex items-center justify-center gap-2"
            >
                {isCapturing ? (
                    <>
                        <Loader2 size={16} className="animate-spin" />
                        Capturing Policy...
                    </>
                ) : (
                    <>
                        <FileText size={16} />
                        Capture This Privacy Policy
                    </>
                )}
            </button>

            {/* Current Diff Analysis */}
            {(currentDiff && showDiffDetail) && (
                <div className="card p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <GitCompare size={14} className="text-blue-400" />
                            Change Analysis
                        </h3>
                        <button onClick={() => setShowDiffDetail(false)} className="text-slate-500 hover:text-white">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Severity Badge */}
                    <div className={`p-3 rounded-lg ${getSeverityColor(currentDiff.aiAnalysis.overallSeverity)}`}>
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={16} />
                            <span className="font-bold uppercase text-sm">{currentDiff.aiAnalysis.overallSeverity} Risk</span>
                        </div>
                        <p className="text-xs mt-2 opacity-90">{currentDiff.aiAnalysis.summary}</p>
                    </div>

                    {/* Impact Indicators */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className={`p-2 rounded-lg ${currentDiff.aiAnalysis.dataCollectionChanges ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                            <div className={`text-xs font-bold ${currentDiff.aiAnalysis.dataCollectionChanges ? 'text-red-400' : 'text-green-400'}`}>
                                {currentDiff.aiAnalysis.dataCollectionChanges ? '⚠️' : '✓'} Data Collection
                            </div>
                        </div>
                        <div className={`p-2 rounded-lg ${currentDiff.aiAnalysis.thirdPartyChanges ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                            <div className={`text-xs font-bold ${currentDiff.aiAnalysis.thirdPartyChanges ? 'text-red-400' : 'text-green-400'}`}>
                                {currentDiff.aiAnalysis.thirdPartyChanges ? '⚠️' : '✓'} Third Parties
                            </div>
                        </div>
                        <div className={`p-2 rounded-lg ${currentDiff.aiAnalysis.retentionChanges ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                            <div className={`text-xs font-bold ${currentDiff.aiAnalysis.retentionChanges ? 'text-red-400' : 'text-green-400'}`}>
                                {currentDiff.aiAnalysis.retentionChanges ? '⚠️' : '✓'} Retention
                            </div>
                        </div>
                    </div>

                    {/* Key Changes */}
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase">Key Changes</h4>
                        <ul className="space-y-1">
                            {currentDiff.aiAnalysis.keyChanges.map((change, i) => (
                                <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                                    <AlertTriangle size={10} className="text-yellow-400 mt-1 flex-shrink-0" />
                                    {change}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Detailed Changes */}
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase">All Changes ({currentDiff.changes.length})</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {currentDiff.changes.map((change, i) => (
                                <div key={i} className="p-2 bg-slate-800/50 rounded-lg space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {getChangeIcon(change.type)}
                                            <span className="text-xs font-medium">{change.section}</span>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded ${getSeverityColor(change.severity)}`}>
                                            {change.severity}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400">{change.summary}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase">Recommendations</h4>
                        <ul className="space-y-1">
                            {currentDiff.aiAnalysis.recommendations.map((rec, i) => (
                                <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                                    <Check size={10} className="text-green-400 mt-1 flex-shrink-0" />
                                    {rec}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => exportDiff(currentDiff)}
                            className="btn-secondary flex-1 flex items-center justify-center gap-2"
                        >
                            <Download size={14} />
                            Export Report
                        </button>
                        <SendToIntegrations
                            appId="privacy-policy-diff-tracker"
                            appName="Privacy Policy Diff Tracker"
                            data={{
                                domain: currentDiff.domain,
                                severity: currentDiff.aiAnalysis.overallSeverity,
                                summary: currentDiff.aiAnalysis.summary,
                                keyChanges: currentDiff.aiAnalysis.keyChanges,
                                changesCount: currentDiff.changes.length
                            }}
                            source={{ url: context?.url }}
                        />
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isComparing && (
                <div className="card p-8 text-center">
                    <Loader2 size={32} className="animate-spin mx-auto mb-4 text-blue-400" />
                    <p className="text-sm text-slate-400">Analyzing policy changes...</p>
                </div>
            )}

            {/* Tracked Policies */}
            {trackedPolicies.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                        <History size={14} className="text-purple-400" />
                        Tracked Policies ({trackedPolicies.length})
                    </h3>

                    {trackedPolicies.map(policy => (
                        <div key={policy.domain} className="card p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => toggleExpanded(policy.domain)}
                                    className="flex items-center gap-2 text-left flex-1"
                                >
                                    <Scale size={16} className="text-blue-400" />
                                    <div>
                                        <div className="text-sm font-medium">{policy.domain}</div>
                                        <div className="text-[10px] text-slate-500">
                                            {policy.versions.length} versions • Last checked: {new Date(policy.lastChecked).toLocaleDateString()}
                                        </div>
                                    </div>
                                </button>
                                <div className="flex items-center gap-2">
                                    {policy.diffs.length > 0 && (
                                        <span className="text-[10px] px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded">
                                            {policy.diffs.length} changes
                                        </span>
                                    )}
                                    <button
                                        onClick={() => removePolicy(policy.domain)}
                                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    {expandedPolicies.has(policy.domain) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>
                            </div>

                            {expandedPolicies.has(policy.domain) && (
                                <div className="pt-3 border-t border-slate-800 space-y-3">
                                    {/* Version History */}
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-bold text-slate-500 uppercase">Versions</h4>
                                        <div className="space-y-1">
                                            {policy.versions.slice(0, 5).map((v, i) => (
                                                <div key={v.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={12} className="text-slate-500" />
                                                        {new Date(v.timestamp).toLocaleString()}
                                                    </div>
                                                    <span className="text-slate-500">{v.wordCount.toLocaleString()} words</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Change History */}
                                    {policy.diffs.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-[10px] font-bold text-slate-500 uppercase">Recent Changes</h4>
                                            <div className="space-y-1">
                                                {policy.diffs.slice(0, 3).map(diff => (
                                                    <button
                                                        key={diff.id}
                                                        onClick={() => viewDiff(diff)}
                                                        className="w-full flex items-center justify-between p-2 bg-slate-800/50 rounded text-xs hover:bg-slate-800 text-left"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full ${
                                                                diff.aiAnalysis.overallSeverity === 'critical' ? 'bg-red-400' :
                                                                diff.aiAnalysis.overallSeverity === 'high' ? 'bg-orange-400' :
                                                                diff.aiAnalysis.overallSeverity === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                                                            }`} />
                                                            {new Date(diff.timestamp).toLocaleDateString()}
                                                        </div>
                                                        <span className="text-slate-500">{diff.changes.length} changes</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {trackedPolicies.length === 0 && !isCapturing && (
                <div className="text-center py-12 text-slate-500">
                    <Scale size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm mb-2">No policies tracked yet</p>
                    <p className="text-xs">Navigate to a privacy policy page and click capture to start tracking changes</p>
                </div>
            )}
        </div>
    );
}
