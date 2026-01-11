'use client';

import React, { useState, useEffect } from 'react';
import { FileText, AlertTriangle, Shield, Copy, Check, Download, Sparkles, ChevronDown, ChevronUp, Scale, Clock, Loader2, Filter, Search, Star, Flag, Info } from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';
import { useIntegrations } from '../../hooks/useIntegrations';
import SendToIntegrations from '../../components/SendToIntegrations';

interface ContractClause {
    id: string;
    title: string;
    type: string;
    text: string;
    risk: 'low' | 'medium' | 'high' | 'critical';
    analysis: string;
    recommendations: string[];
    starred: boolean;
    flagged: boolean;
}

interface ContractAnalysis {
    id: string;
    timestamp: string;
    source: string;
    documentType: string;
    clauses: ContractClause[];
    summary: {
        totalClauses: number;
        riskBreakdown: { low: number; medium: number; high: number; critical: number };
        keyRisks: string[];
        missingClauses: string[];
    };
}

const STORAGE_KEY = 'microlabs_contract_clause_extractor';

const CLAUSE_TYPES = [
    'Liability', 'Indemnification', 'Termination', 'Payment', 'Confidentiality',
    'Intellectual Property', 'Non-Compete', 'Warranty', 'Force Majeure', 'Dispute Resolution',
    'Data Protection', 'Assignment', 'Governing Law', 'Notice', 'Insurance'
];

export default function ContractClauseExtractor() {
    const [analyses, setAnalyses] = useState<ContractAnalysis[]>([]);
    const [currentAnalysis, setCurrentAnalysis] = useState<ContractAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string>('all');
    const [filterRisk, setFilterRisk] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());

    const { generateContent } = useGemini();
    const { context } = usePageContext();
    const { success, error: showError } = useToast();
    const { integrations } = useIntegrations();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await chrome.storage.local.get(STORAGE_KEY) as { [key: string]: { analyses?: ContractAnalysis[] } | undefined };
            const stored = data[STORAGE_KEY];
            if (stored?.analyses) setAnalyses(stored.analyses);
        } catch (err) {
            console.error('Failed to load data:', err);
        }
    };

    const saveData = async (newAnalyses?: ContractAnalysis[]) => {
        try {
            await chrome.storage.local.set({
                [STORAGE_KEY]: { analyses: newAnalyses ?? analyses }
            });
        } catch (err) {
            console.error('Failed to save data:', err);
        }
    };

    const analyzeContract = async () => {
        if (!context?.content) {
            showError('No page content available');
            return;
        }

        setIsAnalyzing(true);

        try {
            const prompt = `You are a legal contract analyst. Analyze this contract/legal document and extract all important clauses.

**Document Content:**
${context.content.slice(0, 12000)}

For each clause found, provide:
1. Title/name of the clause
2. Type (from: ${CLAUSE_TYPES.join(', ')}, or Other)
3. The actual clause text (exact or paraphrased)
4. Risk level (low/medium/high/critical) from the perspective of the party reviewing the contract
5. Brief analysis of what the clause means
6. Recommendations for negotiation or protection

Also provide a summary including:
- Document type (e.g., NDA, Employment Agreement, SaaS Agreement, etc.)
- Key risks identified
- Important clauses that might be missing

Return as JSON:
{
  "documentType": "Type of agreement",
  "clauses": [
    {
      "id": "unique-id",
      "title": "Clause Title",
      "type": "Liability|Indemnification|...",
      "text": "Actual clause text...",
      "risk": "low|medium|high|critical",
      "analysis": "What this means...",
      "recommendations": ["Recommendation 1", "Recommendation 2"]
    }
  ],
  "summary": {
    "keyRisks": ["Risk 1", "Risk 2"],
    "missingClauses": ["Clause that should be added", ...]
  }
}`;

            const response = await generateContent(prompt, undefined, { jsonMode: true });
            const parsed = JSON.parse(response);

            const analysis: ContractAnalysis = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                source: context.url || 'Unknown',
                documentType: parsed.documentType || 'Unknown Document',
                clauses: (parsed.clauses || []).map((c: ContractClause, i: number) => ({
                    ...c,
                    id: c.id || `clause-${Date.now()}-${i}`,
                    starred: false,
                    flagged: false
                })),
                summary: {
                    totalClauses: parsed.clauses?.length || 0,
                    riskBreakdown: {
                        low: parsed.clauses?.filter((c: ContractClause) => c.risk === 'low').length || 0,
                        medium: parsed.clauses?.filter((c: ContractClause) => c.risk === 'medium').length || 0,
                        high: parsed.clauses?.filter((c: ContractClause) => c.risk === 'high').length || 0,
                        critical: parsed.clauses?.filter((c: ContractClause) => c.risk === 'critical').length || 0
                    },
                    keyRisks: parsed.summary?.keyRisks || [],
                    missingClauses: parsed.summary?.missingClauses || []
                }
            };

            setCurrentAnalysis(analysis);
            const updated = [analysis, ...analyses].slice(0, 20);
            setAnalyses(updated);
            saveData(updated);
            success('Contract analyzed successfully');

        } catch (err) {
            console.error('Analysis failed:', err);
            showError('Failed to analyze contract');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedClauses(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleStar = (clauseId: string) => {
        if (!currentAnalysis) return;
        const updated = {
            ...currentAnalysis,
            clauses: currentAnalysis.clauses.map(c =>
                c.id === clauseId ? { ...c, starred: !c.starred } : c
            )
        };
        setCurrentAnalysis(updated);
        const allUpdated = analyses.map(a => a.id === updated.id ? updated : a);
        setAnalyses(allUpdated);
        saveData(allUpdated);
    };

    const toggleFlag = (clauseId: string) => {
        if (!currentAnalysis) return;
        const updated = {
            ...currentAnalysis,
            clauses: currentAnalysis.clauses.map(c =>
                c.id === clauseId ? { ...c, flagged: !c.flagged } : c
            )
        };
        setCurrentAnalysis(updated);
        const allUpdated = analyses.map(a => a.id === updated.id ? updated : a);
        setAnalyses(allUpdated);
        saveData(allUpdated);
    };

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
            success('Copied');
        } catch (err) {
            showError('Failed to copy');
        }
    };

    const exportAnalysis = () => {
        if (!currentAnalysis) return;

        const markdown = `# Contract Analysis Report

**Document Type:** ${currentAnalysis.documentType}
**Source:** ${currentAnalysis.source}
**Analyzed:** ${new Date(currentAnalysis.timestamp).toLocaleString()}

---

## Summary

**Total Clauses:** ${currentAnalysis.summary.totalClauses}

### Risk Breakdown
- Critical: ${currentAnalysis.summary.riskBreakdown.critical}
- High: ${currentAnalysis.summary.riskBreakdown.high}
- Medium: ${currentAnalysis.summary.riskBreakdown.medium}
- Low: ${currentAnalysis.summary.riskBreakdown.low}

### Key Risks
${currentAnalysis.summary.keyRisks.map(r => `- ⚠️ ${r}`).join('\n')}

### Missing Clauses
${currentAnalysis.summary.missingClauses.map(c => `- ${c}`).join('\n')}

---

## Extracted Clauses

${currentAnalysis.clauses.map((c, i) => `
### ${i + 1}. ${c.title}

**Type:** ${c.type} | **Risk:** ${c.risk.toUpperCase()}
${c.starred ? '⭐ Starred' : ''} ${c.flagged ? '🚩 Flagged' : ''}

**Clause Text:**
> ${c.text}

**Analysis:**
${c.analysis}

**Recommendations:**
${c.recommendations.map(r => `- ${r}`).join('\n')}

---
`).join('\n')}

Generated by MicroLabs Contract Clause Extractor
`;

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract-analysis-${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        URL.revokeObjectURL(url);
        success('Analysis exported');
    };

    const getRiskColor = (risk: string) => {
        switch (risk) {
            case 'low': return 'text-green-400 bg-green-500/10';
            case 'medium': return 'text-yellow-400 bg-yellow-500/10';
            case 'high': return 'text-orange-400 bg-orange-500/10';
            case 'critical': return 'text-red-400 bg-red-500/10';
            default: return 'text-slate-400 bg-slate-500/10';
        }
    };

    const filteredClauses = currentAnalysis?.clauses.filter(clause => {
        if (filterType !== 'all' && clause.type !== filterType) return false;
        if (filterRisk !== 'all' && clause.risk !== filterRisk) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return clause.title.toLowerCase().includes(query) ||
                   clause.text.toLowerCase().includes(query) ||
                   clause.analysis.toLowerCase().includes(query);
        }
        return true;
    }) || [];

    return (
        <div className="space-y-6">
            {/* Analyze Button */}
            <button
                onClick={analyzeContract}
                disabled={isAnalyzing || !context?.content}
                className="btn-primary w-full flex items-center justify-center gap-2"
            >
                {isAnalyzing ? (
                    <>
                        <Loader2 size={16} className="animate-spin" />
                        Analyzing Contract...
                    </>
                ) : (
                    <>
                        <Scale size={16} />
                        Extract Contract Clauses
                    </>
                )}
            </button>

            {/* Current Analysis */}
            {currentAnalysis && (
                <div className="space-y-4">
                    {/* Summary Card */}
                    <div className="card p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold">{currentAnalysis.documentType}</h3>
                                <p className="text-xs text-slate-500">
                                    {currentAnalysis.summary.totalClauses} clauses found
                                </p>
                            </div>
                            <div className="text-xs text-slate-500">
                                {new Date(currentAnalysis.timestamp).toLocaleDateString()}
                            </div>
                        </div>

                        {/* Risk Breakdown */}
                        <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="p-2 bg-red-500/10 rounded-lg">
                                <div className="text-lg font-bold text-red-400">
                                    {currentAnalysis.summary.riskBreakdown.critical}
                                </div>
                                <div className="text-[10px] text-slate-500">Critical</div>
                            </div>
                            <div className="p-2 bg-orange-500/10 rounded-lg">
                                <div className="text-lg font-bold text-orange-400">
                                    {currentAnalysis.summary.riskBreakdown.high}
                                </div>
                                <div className="text-[10px] text-slate-500">High</div>
                            </div>
                            <div className="p-2 bg-yellow-500/10 rounded-lg">
                                <div className="text-lg font-bold text-yellow-400">
                                    {currentAnalysis.summary.riskBreakdown.medium}
                                </div>
                                <div className="text-[10px] text-slate-500">Medium</div>
                            </div>
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <div className="text-lg font-bold text-green-400">
                                    {currentAnalysis.summary.riskBreakdown.low}
                                </div>
                                <div className="text-[10px] text-slate-500">Low</div>
                            </div>
                        </div>

                        {/* Key Risks */}
                        {currentAnalysis.summary.keyRisks.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-red-400 uppercase">Key Risks</h4>
                                <ul className="space-y-1">
                                    {currentAnalysis.summary.keyRisks.map((risk, i) => (
                                        <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                                            <AlertTriangle size={10} className="text-red-400 mt-1 flex-shrink-0" />
                                            {risk}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Missing Clauses */}
                        {currentAnalysis.summary.missingClauses.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-yellow-400 uppercase">Missing Clauses</h4>
                                <ul className="space-y-1">
                                    {currentAnalysis.summary.missingClauses.map((clause, i) => (
                                        <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                                            <Info size={10} className="text-yellow-400 mt-1 flex-shrink-0" />
                                            {clause}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Filters */}
                    <div className="card p-3 space-y-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="w-full flex items-center justify-between text-xs"
                        >
                            <span className="flex items-center gap-2 text-slate-400">
                                <Filter size={12} />
                                Filter Clauses
                            </span>
                            {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>

                        {showFilters && (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search clauses..."
                                        className="w-full pl-9 text-xs"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        className="flex-1 text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1.5"
                                    >
                                        <option value="all">All Types</option>
                                        {CLAUSE_TYPES.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={filterRisk}
                                        onChange={(e) => setFilterRisk(e.target.value)}
                                        className="flex-1 text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1.5"
                                    >
                                        <option value="all">All Risks</option>
                                        <option value="critical">Critical</option>
                                        <option value="high">High</option>
                                        <option value="medium">Medium</option>
                                        <option value="low">Low</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Clauses List */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>{filteredClauses.length} clauses</span>
                            <span>
                                {currentAnalysis.clauses.filter(c => c.starred).length} starred •
                                {currentAnalysis.clauses.filter(c => c.flagged).length} flagged
                            </span>
                        </div>

                        {filteredClauses.map((clause, i) => (
                            <div key={clause.id} className="card p-4 space-y-3">
                                <div className="flex items-start gap-3">
                                    <span className="text-xs text-slate-600 font-bold mt-1">{i + 1}</span>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-sm font-bold">{clause.title}</h4>
                                            {clause.starred && <Star size={12} className="text-yellow-400 fill-current" />}
                                            {clause.flagged && <Flag size={12} className="text-red-400 fill-current" />}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] px-2 py-0.5 bg-slate-800 rounded">{clause.type}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${getRiskColor(clause.risk)}`}>
                                                {clause.risk.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => toggleStar(clause.id)}
                                            className={`p-1.5 rounded ${clause.starred ? 'text-yellow-400' : 'text-slate-600 hover:text-slate-400'}`}
                                        >
                                            <Star size={14} className={clause.starred ? 'fill-current' : ''} />
                                        </button>
                                        <button
                                            onClick={() => toggleFlag(clause.id)}
                                            className={`p-1.5 rounded ${clause.flagged ? 'text-red-400' : 'text-slate-600 hover:text-slate-400'}`}
                                        >
                                            <Flag size={14} className={clause.flagged ? 'fill-current' : ''} />
                                        </button>
                                        <button
                                            onClick={() => copyToClipboard(clause.text, clause.id)}
                                            className="p-1.5 text-slate-600 hover:text-slate-400 rounded"
                                        >
                                            {copiedId === clause.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                        </button>
                                        <button
                                            onClick={() => toggleExpand(clause.id)}
                                            className="p-1.5 text-slate-600 hover:text-slate-400 rounded"
                                        >
                                            {expandedClauses.has(clause.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="text-xs text-slate-400 bg-slate-800/50 p-2 rounded">
                                    {clause.text.slice(0, 150)}...
                                </div>

                                {expandedClauses.has(clause.id) && (
                                    <div className="pt-3 border-t border-slate-800 space-y-3">
                                        <div>
                                            <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-1">Full Text</h5>
                                            <p className="text-xs text-slate-300 leading-relaxed">{clause.text}</p>
                                        </div>
                                        <div>
                                            <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-1">Analysis</h5>
                                            <p className="text-xs text-slate-300 leading-relaxed">{clause.analysis}</p>
                                        </div>
                                        {clause.recommendations.length > 0 && (
                                            <div>
                                                <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-1">Recommendations</h5>
                                                <ul className="space-y-1">
                                                    {clause.recommendations.map((rec, j) => (
                                                        <li key={j} className="text-xs text-slate-300 flex items-start gap-2">
                                                            <Shield size={10} className="text-blue-400 mt-1 flex-shrink-0" />
                                                            {rec}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button onClick={exportAnalysis} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                            <Download size={14} />
                            Export Analysis
                        </button>
                        <SendToIntegrations
                            appId="contract-clause-extractor"
                            appName="Contract Clause Extractor"
                            data={{
                                documentType: currentAnalysis.documentType,
                                totalClauses: currentAnalysis.summary.totalClauses,
                                riskBreakdown: currentAnalysis.summary.riskBreakdown,
                                keyRisks: currentAnalysis.summary.keyRisks,
                                flaggedClauses: currentAnalysis.clauses.filter(c => c.flagged).map(c => c.title)
                            }}
                            source={{ url: context?.url }}
                        />
                    </div>
                </div>
            )}

            {/* History */}
            {analyses.length > 1 && (
                <div className="card p-4 space-y-3">
                    <h3 className="text-sm font-bold">Previous Analyses</h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                        {analyses.slice(1, 6).map(analysis => (
                            <div
                                key={analysis.id}
                                className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800"
                                onClick={() => setCurrentAnalysis(analysis)}
                            >
                                <div className="text-xs">
                                    <div className="font-medium">{analysis.documentType}</div>
                                    <div className="text-slate-500">{analysis.summary.totalClauses} clauses</div>
                                </div>
                                <div className="text-[10px] text-slate-500">
                                    {new Date(analysis.timestamp).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!currentAnalysis && !isAnalyzing && (
                <div className="text-center py-12 text-slate-500">
                    <Scale size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">Navigate to a contract or legal document and click extract to analyze</p>
                </div>
            )}
        </div>
    );
}
