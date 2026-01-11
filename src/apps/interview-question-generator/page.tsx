'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Sparkles, Copy, Check, Download, RotateCcw, ChevronDown, ChevronUp, Briefcase, Code, Users, Brain, Target, Loader2, Star, ThumbsUp, ThumbsDown, Filter } from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';
import { useIntegrations } from '../../hooks/useIntegrations';
import SendToIntegrations from '../../components/SendToIntegrations';

interface InterviewQuestion {
    id: string;
    question: string;
    category: 'behavioral' | 'technical' | 'situational' | 'cultural' | 'role-specific';
    difficulty: 'easy' | 'medium' | 'hard';
    sampleAnswer?: string;
    tips?: string[];
    starred?: boolean;
}

interface QuestionSet {
    id: string;
    timestamp: string;
    role: string;
    company?: string;
    questions: InterviewQuestion[];
}

const STORAGE_KEY = 'microlabs_interview_question_generator';

const CATEGORIES = [
    { id: 'behavioral', label: 'Behavioral', icon: <Users size={14} />, color: 'blue' },
    { id: 'technical', label: 'Technical', icon: <Code size={14} />, color: 'purple' },
    { id: 'situational', label: 'Situational', icon: <Brain size={14} />, color: 'green' },
    { id: 'cultural', label: 'Culture Fit', icon: <Target size={14} />, color: 'orange' },
    { id: 'role-specific', label: 'Role Specific', icon: <Briefcase size={14} />, color: 'pink' },
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];

export default function InterviewQuestionGenerator() {
    const [role, setRole] = useState('');
    const [company, setCompany] = useState('');
    const [additionalContext, setAdditionalContext] = useState('');
    const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
    const [savedSets, setSavedSets] = useState<QuestionSet[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.id)));
    const [showFilters, setShowFilters] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const { generateContent } = useGemini();
    const { context } = usePageContext();
    const { success, error: showError } = useToast();
    const { integrations } = useIntegrations();

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        // Auto-extract from job posting
        if (context?.content && !role) {
            extractFromPage();
        }
    }, [context]);

    const loadData = async () => {
        try {
            const data = await chrome.storage.local.get(STORAGE_KEY) as { [key: string]: { sets?: QuestionSet[] } | undefined };
            const stored = data[STORAGE_KEY];
            if (stored?.sets) setSavedSets(stored.sets);
        } catch (err) {
            console.error('Failed to load data:', err);
        }
    };

    const saveData = async (newSets?: QuestionSet[]) => {
        try {
            await chrome.storage.local.set({
                [STORAGE_KEY]: { sets: newSets ?? savedSets }
            });
        } catch (err) {
            console.error('Failed to save data:', err);
        }
    };

    const extractFromPage = async () => {
        if (!context?.content) return;

        try {
            const prompt = `Extract job information from this page if it's a job posting:

${context.content.slice(0, 3000)}

Return JSON:
{
  "role": "Job title if found",
  "company": "Company name if found",
  "isJobPosting": true/false
}`;

            const response = await generateContent(prompt, undefined, { jsonMode: true });
            const parsed = JSON.parse(response);

            if (parsed.isJobPosting) {
                if (parsed.role) setRole(parsed.role);
                if (parsed.company) setCompany(parsed.company);
            }
        } catch (err) {
            // Silent fail - this is optional
        }
    };

    const generateQuestions = async () => {
        if (!role.trim()) {
            showError('Please enter a role');
            return;
        }

        setIsGenerating(true);
        setQuestions([]);

        try {
            const categoriesStr = Array.from(selectedCategories).join(', ');

            const prompt = `Generate interview questions for the following role:

Role: ${role}
${company ? `Company: ${company}` : ''}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Generate 15-20 interview questions across these categories: ${categoriesStr}

For each question, provide:
- The question itself
- Category (behavioral, technical, situational, cultural, or role-specific)
- Difficulty (easy, medium, hard)
- A sample answer framework
- 2-3 tips for answering well

Mix difficulties appropriately. Include common and unique questions.

Return as JSON array:
[
  {
    "id": "unique-id",
    "question": "Question text?",
    "category": "behavioral|technical|situational|cultural|role-specific",
    "difficulty": "easy|medium|hard",
    "sampleAnswer": "A framework for answering...",
    "tips": ["Tip 1", "Tip 2"]
  }
]`;

            const response = await generateContent(prompt, undefined, { jsonMode: true });
            const parsed = JSON.parse(response);

            // Ensure IDs are unique
            const questionsWithIds: InterviewQuestion[] = parsed.map((q: InterviewQuestion, i: number) => ({
                ...q,
                id: q.id || `q-${Date.now()}-${i}`,
                starred: false
            }));

            setQuestions(questionsWithIds);

            // Save to history
            const newSet: QuestionSet = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                role,
                company: company || undefined,
                questions: questionsWithIds
            };
            const updated = [newSet, ...savedSets].slice(0, 20);
            setSavedSets(updated);
            saveData(updated);

            success('Questions generated');
        } catch (err) {
            console.error('Failed to generate questions:', err);
            showError('Failed to generate questions');
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedQuestions(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleStar = (id: string) => {
        setQuestions(prev => prev.map(q =>
            q.id === id ? { ...q, starred: !q.starred } : q
        ));
    };

    const toggleCategory = (catId: string) => {
        setSelectedCategories(prev => {
            const next = new Set(prev);
            if (next.has(catId)) {
                if (next.size > 1) next.delete(catId);
            } else {
                next.add(catId);
            }
            return next;
        });
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

    const exportQuestions = (starredOnly: boolean = false) => {
        const toExport = starredOnly ? questions.filter(q => q.starred) : questions;

        const markdown = `# Interview Questions for ${role}${company ? ` at ${company}` : ''}

Generated: ${new Date().toLocaleString()}

---

${toExport.map((q, i) => `
## ${i + 1}. ${q.question}

**Category:** ${q.category} | **Difficulty:** ${q.difficulty}

### Sample Answer Framework
${q.sampleAnswer}

### Tips
${q.tips?.map(t => `- ${t}`).join('\n') || 'No tips provided'}

---
`).join('\n')}

Generated by MicroLabs Interview Question Generator
`;

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `interview-questions-${role.replace(/\s+/g, '-')}.md`;
        a.click();
        URL.revokeObjectURL(url);
        success('Questions exported');
    };

    const loadSavedSet = (set: QuestionSet) => {
        setRole(set.role);
        setCompany(set.company || '');
        setQuestions(set.questions);
        setShowHistory(false);
    };

    const getCategoryColor = (cat: string) => {
        const config = CATEGORIES.find(c => c.id === cat);
        switch (config?.color) {
            case 'blue': return 'bg-blue-500/10 text-blue-400';
            case 'purple': return 'bg-purple-500/10 text-purple-400';
            case 'green': return 'bg-green-500/10 text-green-400';
            case 'orange': return 'bg-orange-500/10 text-orange-400';
            case 'pink': return 'bg-pink-500/10 text-pink-400';
            default: return 'bg-slate-500/10 text-slate-400';
        }
    };

    const getDifficultyColor = (diff: string) => {
        switch (diff) {
            case 'easy': return 'bg-green-500/10 text-green-400';
            case 'medium': return 'bg-yellow-500/10 text-yellow-400';
            case 'hard': return 'bg-red-500/10 text-red-400';
            default: return 'bg-slate-500/10 text-slate-400';
        }
    };

    const filteredQuestions = questions.filter(q => selectedCategories.has(q.category));
    const starredCount = questions.filter(q => q.starred).length;

    return (
        <div className="space-y-6">
            {/* Input Section */}
            <div className="card p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Role/Position</label>
                        <input
                            type="text"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            placeholder="e.g., Senior Product Manager"
                            className="w-full text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Company (Optional)</label>
                        <input
                            type="text"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            placeholder="e.g., Google"
                            className="w-full text-sm"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Additional Context (Optional)</label>
                    <textarea
                        value={additionalContext}
                        onChange={(e) => setAdditionalContext(e.target.value)}
                        placeholder="Any specific skills, technologies, or focus areas..."
                        className="w-full h-16 text-sm resize-none"
                    />
                </div>

                {/* Category Filters */}
                <div className="space-y-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"
                    >
                        <Filter size={12} />
                        Question Categories
                        {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {showFilters && (
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => toggleCategory(cat.id)}
                                    className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${
                                        selectedCategories.has(cat.id)
                                            ? getCategoryColor(cat.id)
                                            : 'bg-slate-800 text-slate-500'
                                    }`}
                                >
                                    {cat.icon}
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={generateQuestions}
                    disabled={isGenerating || !role.trim()}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Generating Questions...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Generate Interview Questions
                        </>
                    )}
                </button>
            </div>

            {/* Questions List */}
            {filteredQuestions.length > 0 && (
                <div className="space-y-4">
                    {/* Summary */}
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                            {filteredQuestions.length} questions
                            {starredCount > 0 && ` • ${starredCount} starred`}
                        </span>
                        <div className="flex gap-2">
                            {starredCount > 0 && (
                                <button
                                    onClick={() => exportQuestions(true)}
                                    className="text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                                >
                                    <Star size={12} className="fill-current" />
                                    Export Starred
                                </button>
                            )}
                            <button
                                onClick={() => exportQuestions(false)}
                                className="text-slate-400 hover:text-white flex items-center gap-1"
                            >
                                <Download size={12} />
                                Export All
                            </button>
                        </div>
                    </div>

                    {/* Questions */}
                    <div className="space-y-3">
                        {filteredQuestions.map((q, i) => (
                            <div key={q.id} className="card p-4 space-y-3">
                                <div className="flex items-start gap-3">
                                    <span className="text-xs text-slate-600 font-bold mt-1">{i + 1}</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{q.question}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded ${getCategoryColor(q.category)}`}>
                                                {q.category}
                                            </span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded ${getDifficultyColor(q.difficulty)}`}>
                                                {q.difficulty}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => toggleStar(q.id)}
                                            className={`p-1.5 rounded ${q.starred ? 'text-yellow-400' : 'text-slate-600 hover:text-slate-400'}`}
                                        >
                                            <Star size={14} className={q.starred ? 'fill-current' : ''} />
                                        </button>
                                        <button
                                            onClick={() => copyToClipboard(q.question, q.id)}
                                            className="p-1.5 text-slate-600 hover:text-slate-400 rounded"
                                        >
                                            {copiedId === q.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                        </button>
                                        <button
                                            onClick={() => toggleExpand(q.id)}
                                            className="p-1.5 text-slate-600 hover:text-slate-400 rounded"
                                        >
                                            {expandedQuestions.has(q.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                    </div>
                                </div>

                                {expandedQuestions.has(q.id) && (
                                    <div className="pt-3 border-t border-slate-800 space-y-3">
                                        <div>
                                            <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-1">Sample Answer</h4>
                                            <p className="text-xs text-slate-300 leading-relaxed">{q.sampleAnswer}</p>
                                        </div>
                                        {q.tips && q.tips.length > 0 && (
                                            <div>
                                                <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-1">Tips</h4>
                                                <ul className="space-y-1">
                                                    {q.tips.map((tip, j) => (
                                                        <li key={j} className="text-xs text-slate-300 flex items-start gap-2">
                                                            <ThumbsUp size={10} className="text-green-400 mt-1 flex-shrink-0" />
                                                            {tip}
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

                    {/* Send to Integrations */}
                    <SendToIntegrations
                        appId="interview-question-generator"
                        appName="Interview Question Generator"
                        data={{
                            role,
                            company,
                            questions: questions.map(q => ({
                                question: q.question,
                                category: q.category,
                                difficulty: q.difficulty
                            })),
                            starredQuestions: questions.filter(q => q.starred).map(q => q.question)
                        }}
                        source={{ url: context?.url }}
                    />
                </div>
            )}

            {/* Saved Sets */}
            {savedSets.length > 0 && (
                <div className="card p-4 space-y-3">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex items-center justify-between"
                    >
                        <h3 className="text-sm font-bold">Previous Sessions ({savedSets.length})</h3>
                        {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showHistory && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {savedSets.map(set => (
                                <div
                                    key={set.id}
                                    className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800"
                                    onClick={() => loadSavedSet(set)}
                                >
                                    <div className="text-xs">
                                        <div className="font-medium">{set.role}</div>
                                        <div className="text-slate-500">
                                            {set.company && `${set.company} • `}
                                            {set.questions.length} questions
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                        {new Date(set.timestamp).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {questions.length === 0 && !isGenerating && (
                <div className="text-center py-8 text-slate-500">
                    <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">Enter a role to generate tailored interview questions</p>
                </div>
            )}
        </div>
    );
}
