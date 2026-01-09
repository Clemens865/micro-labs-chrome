import React, { useState, useCallback } from 'react';
import {
    Rabbit, Play, Pause, RotateCcw, GitBranch, Sparkles,
    Loader2, ChevronRight, ChevronDown, ExternalLink, Copy, Check,
    TreeDeciduous, Compass, HelpCircle, Search, Brain, Layers, ArrowRight,
    Zap, Target, Plus, UserCircle, Building2, ChevronUp
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useUserProfile } from '../../hooks/useUserProfile';

type StageType = 'discover' | 'question' | 'search' | 'analyze' | 'synthesize' | 'branch';

interface ExplorationStage {
    id: string;
    type: StageType;
    content: string;
    questions: string[];
    discoveries: string[];
    sources: Array<{ uri: string; title?: string }>;
    timestamp: number;
}

interface ResearchBranch {
    id: string;
    topic: string;
    parentBranchId: string | null;
    stages: ExplorationStage[];
    status: 'active' | 'paused' | 'complete';
    depth: number;
    discoveredTopics: string[];
}

const STAGE_CONFIG: Record<StageType, { icon: typeof Compass; label: string; color: string; bgColor: string }> = {
    discover: { icon: Compass, label: 'Discovering', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    question: { icon: HelpCircle, label: 'Questioning', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    search: { icon: Search, label: 'Searching', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
    analyze: { icon: Brain, label: 'Analyzing', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
    synthesize: { icon: Layers, label: 'Synthesizing', color: 'text-green-400', bgColor: 'bg-green-500/10' },
    branch: { icon: GitBranch, label: 'Branching', color: 'text-pink-400', bgColor: 'bg-pink-500/10' }
};

const STAGE_ORDER: StageType[] = ['discover', 'question', 'search', 'analyze', 'synthesize', 'branch'];

const DeepResearchApp: React.FC = () => {
    const { context } = usePageContext();
    const { generateWithSearch, loading } = useGemini();
    const { profile, hasProfile, getProfileContext } = useUserProfile();

    const [initialTopic, setInitialTopic] = useState('');
    const [branches, setBranches] = useState<ResearchBranch[]>([]);
    const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
    const [isAutoMode, setIsAutoMode] = useState(false);
    const [maxDepth, setMaxDepth] = useState(3);
    const [stagesPerCycle, setStagesPerCycle] = useState(6);
    const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [includeProfile, setIncludeProfile] = useState(false);

    // Build profile context for AI
    const buildProfileContext = () => {
        if (!includeProfile || !hasProfile) return '';
        const ctx = getProfileContext();
        return ctx ? `\nResearcher Profile: ${ctx}` : '';
    };

    const activeBranch = branches.find(b => b.id === activeBranchId);

    const createBranch = (topic: string, parentId: string | null = null, depth: number = 0): ResearchBranch => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        topic,
        parentBranchId: parentId,
        stages: [],
        status: 'active',
        depth,
        discoveredTopics: []
    });

    const getNextStageType = (currentStages: ExplorationStage[]): StageType => {
        if (currentStages.length === 0) return 'discover';
        const lastStage = currentStages[currentStages.length - 1];
        const currentIndex = STAGE_ORDER.indexOf(lastStage.type);
        const nextIndex = (currentIndex + 1) % Math.min(stagesPerCycle, STAGE_ORDER.length);
        return STAGE_ORDER[nextIndex];
    };

    const executeStage = useCallback(async (branch: ResearchBranch, stageType: StageType): Promise<ExplorationStage> => {
        const previousContent = branch.stages.map(s => s.content).join('\n\n');

        const stagePrompts: Record<StageType, string> = {
            discover: `You are exploring the topic: "${branch.topic}"
${previousContent ? `Previous exploration:\n${previousContent}\n\n` : ''}
DISCOVER phase: Uncover the key concepts, definitions, and foundational elements.
- What are the core components?
- What terminology is essential?
- What are the main categories or types?

Provide a comprehensive discovery of 3-5 key aspects.`,

            question: `Topic: "${branch.topic}"
${previousContent ? `What we know:\n${previousContent}\n\n` : ''}
QUESTION phase: Generate thought-provoking questions that push understanding deeper.
- What are the unanswered questions?
- What assumptions need challenging?
- What connections need exploring?

Generate 5-7 compelling research questions.`,

            search: `Topic: "${branch.topic}"
${previousContent ? `Context:\n${previousContent}\n\n` : ''}
SEARCH phase: Find and synthesize information from multiple sources.
- What do experts say?
- What are the latest developments?
- What evidence exists?

Search and compile findings from authoritative sources.`,

            analyze: `Topic: "${branch.topic}"
${previousContent ? `Research so far:\n${previousContent}\n\n` : ''}
ANALYZE phase: Deep analysis of patterns, relationships, and implications.
- What patterns emerge?
- What are the cause-effect relationships?
- What are the strengths and weaknesses of current understanding?

Provide rigorous analytical insights.`,

            synthesize: `Topic: "${branch.topic}"
${previousContent ? `All findings:\n${previousContent}\n\n` : ''}
SYNTHESIZE phase: Integrate all discoveries into a coherent understanding.
- What is the big picture?
- How do all pieces fit together?
- What are the key takeaways?

Create a unified synthesis of all research.`,

            branch: `Topic: "${branch.topic}"
${previousContent ? `Complete research:\n${previousContent}\n\n` : ''}
BRANCH phase: Identify new directions for deeper exploration.
- What sub-topics deserve their own deep dive?
- What tangential areas are worth exploring?
- What new questions have emerged?

List 3-5 specific new topics that warrant separate research branches.
Format each as: "BRANCH: [topic name] - [brief description]"`
        };

        const profileContext = buildProfileContext();
        const result = await generateWithSearch(
            stagePrompts[stageType] + profileContext,
            `You are a brilliant research assistant conducting deep, iterative research.
Be thorough, insightful, and intellectually rigorous. Push beyond surface-level understanding.
Current depth: ${branch.depth + 1}/${maxDepth}${includeProfile && hasProfile ? '\nTailor exploration depth and focus to the researcher\'s professional expertise.' : ''}`
        );

        const discoveredTopics: string[] = [];
        if (stageType === 'branch') {
            const branchMatches = result.text.matchAll(/BRANCH:\s*([^-\n]+)/gi);
            for (const match of branchMatches) {
                discoveredTopics.push(match[1].trim());
            }
        }

        const questions: string[] = [];
        if (stageType === 'question') {
            const lines = result.text.split('\n');
            lines.forEach(line => {
                if (line.includes('?') && line.trim().length > 20) {
                    questions.push(line.replace(/^[\d\-\*\.\)]+\s*/, '').trim());
                }
            });
        }

        return {
            id: Date.now().toString(),
            type: stageType,
            content: result.text,
            questions: questions.slice(0, 7),
            discoveries: discoveredTopics,
            sources: result.sources,
            timestamp: Date.now()
        };
    }, [generateWithSearch, maxDepth, stagesPerCycle]);

    const runNextStage = useCallback(async () => {
        if (!activeBranch || activeBranch.status !== 'active') return;

        const nextStageType = getNextStageType(activeBranch.stages);
        const newStage = await executeStage(activeBranch, nextStageType);

        setBranches(prev => prev.map(b => {
            if (b.id !== activeBranch.id) return b;
            return {
                ...b,
                stages: [...b.stages, newStage],
                discoveredTopics: [...b.discoveredTopics, ...newStage.discoveries],
                status: newStage.type === 'branch' ? 'complete' : 'active'
            };
        }));

        if (newStage.type === 'branch' && newStage.discoveries.length > 0 && activeBranch.depth < maxDepth - 1) {
            const newBranches = newStage.discoveries.slice(0, 3).map(topic =>
                createBranch(topic, activeBranch.id, activeBranch.depth + 1)
            );
            setBranches(prev => [...prev, ...newBranches]);
        }
    }, [activeBranch, executeStage, maxDepth]);

    const startResearch = async () => {
        const topic = initialTopic.trim() || context?.title || 'Current page topic';
        const newBranch = createBranch(topic);
        setBranches([newBranch]);
        setActiveBranchId(newBranch.id);
        setExpandedBranches(new Set([newBranch.id]));
    };

    const handleReset = () => {
        setBranches([]);
        setActiveBranchId(null);
        setIsAutoMode(false);
        setInitialTopic('');
        setExpandedBranches(new Set());
    };

    const toggleBranch = (branchId: string) => {
        setExpandedBranches(prev => {
            const newSet = new Set(prev);
            if (newSet.has(branchId)) {
                newSet.delete(branchId);
            } else {
                newSet.add(branchId);
            }
            return newSet;
        });
    };

    const handleCopy = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const renderBranch = (branch: ResearchBranch, level: number = 0) => {
        const isExpanded = expandedBranches.has(branch.id);
        const childBranches = branches.filter(b => b.parentBranchId === branch.id);
        const StageIcon = branch.stages.length > 0
            ? STAGE_CONFIG[branch.stages[branch.stages.length - 1].type].icon
            : TreeDeciduous;

        return (
            <div key={branch.id} style={{ marginLeft: level * 16 }} className="animate-in">
                <button
                    onClick={() => {
                        toggleBranch(branch.id);
                        setActiveBranchId(branch.id);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        activeBranchId === branch.id
                            ? 'glass border-purple-500/30'
                            : 'card hover:border-slate-600/50'
                    }`}
                >
                    <div className={`p-2 rounded-lg ${
                        branch.status === 'active' ? 'bg-purple-500/20' :
                        branch.status === 'complete' ? 'bg-green-500/20' : 'bg-slate-700/50'
                    }`}>
                        {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                    </div>
                    <StageIcon size={16} className={`${
                        branch.status === 'active' ? 'text-purple-400' :
                        branch.status === 'complete' ? 'text-green-400' : 'text-slate-500'
                    }`} />
                    <span className="flex-1 text-sm text-left text-slate-200 font-medium truncate">{branch.topic}</span>
                    <span className="text-xs text-slate-500">{branch.stages.length} stages</span>
                    {branch.depth > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-700/50 text-slate-400 rounded-full">
                            D{branch.depth}
                        </span>
                    )}
                </button>

                {isExpanded && (
                    <div className="mt-2 ml-4 space-y-2">
                        {branch.stages.map((stage) => {
                            const config = STAGE_CONFIG[stage.type];
                            const Icon = config.icon;
                            return (
                                <div key={stage.id} className="card p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
                                                <Icon size={14} className={config.color} />
                                            </div>
                                            <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
                                                {config.label}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(stage.content, stage.id)}
                                            className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                                        >
                                            {copiedId === stage.id ? (
                                                <Check size={14} className="text-green-400" />
                                            ) : (
                                                <Copy size={14} className="text-slate-500" />
                                            )}
                                        </button>
                                    </div>

                                    <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">
                                        {stage.content.substring(0, 300)}...
                                    </p>

                                    {stage.questions.length > 0 && stage.type === 'question' && (
                                        <div className="pt-2 border-t border-slate-700/50">
                                            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Questions Generated</p>
                                            <ul className="space-y-1">
                                                {stage.questions.slice(0, 3).map((q, idx) => (
                                                    <li key={idx} className="text-xs text-slate-400 flex items-start gap-2">
                                                        <HelpCircle size={10} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                                        {q}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {stage.discoveries.length > 0 && (
                                        <div className="pt-2 border-t border-slate-700/50">
                                            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">New Branches</p>
                                            <div className="flex flex-wrap gap-1">
                                                {stage.discoveries.map((topic, idx) => (
                                                    <span key={idx} className="px-2 py-1 text-xs bg-pink-500/10 text-pink-400 rounded-lg">
                                                        {topic}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {stage.sources.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-2">
                                            {stage.sources.slice(0, 3).map((source, idx) => (
                                                <a
                                                    key={idx}
                                                    href={source.uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 rounded-lg text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                                                >
                                                    <ExternalLink size={10} />
                                                    {source.title || new URL(source.uri).hostname}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {childBranches.map(child => renderBranch(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    // Empty state
    if (branches.length === 0) {
        return (
            <div className="space-y-6">
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-purple-600/10 text-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Rabbit size={32} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Deep Research</h3>
                    <p className="text-sm text-dim max-w-[240px] mx-auto mb-6">
                        Go down the rabbit hole. Explore any topic infinitely deep with AI-powered iterative research.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={initialTopic}
                            onChange={(e) => setInitialTopic(e.target.value)}
                            placeholder={context?.title ? `Research: ${context.title.substring(0, 30)}...` : 'Enter a topic to explore...'}
                            className="pr-12"
                        />
                        <Sparkles size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-500" />
                    </div>

                    {context && !initialTopic && (
                        <button
                            onClick={() => setInitialTopic(context.title || '')}
                            className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                        >
                            <Target size={16} />
                            Use Current Page Topic
                        </button>
                    )}

                    {/* Profile Toggle */}
                    {hasProfile && (
                        <div className="flex items-center justify-between p-3 glass rounded-xl">
                            <div className="flex items-center gap-2">
                                <UserCircle size={14} className="text-purple-400" />
                                <span className="text-sm text-slate-300">Personalize Research</span>
                            </div>
                            <button
                                onClick={() => setIncludeProfile(!includeProfile)}
                                className={`relative w-10 h-5 rounded-full transition-colors ${includeProfile ? 'bg-purple-600' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${includeProfile ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="w-full flex items-center justify-between p-3 glass rounded-xl"
                    >
                        <span className="text-sm text-slate-300">Research Settings</span>
                        <ChevronDown size={16} className={`text-slate-500 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                    </button>

                    {showSettings && (
                        <div className="grid grid-cols-2 gap-3 animate-in">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-wider text-dim">Max Depth</label>
                                <select
                                    value={maxDepth}
                                    onChange={(e) => setMaxDepth(Number(e.target.value))}
                                    style={{
                                        background: 'hsl(222 47% 11%)',
                                        border: '1px solid hsl(222 47% 18% / 0.5)',
                                        color: 'hsl(210 40% 98%)'
                                    }}
                                    className="w-full p-2.5 rounded-xl text-sm"
                                >
                                    <option value={1}>1 - Quick</option>
                                    <option value={2}>2 - Standard</option>
                                    <option value={3}>3 - Deep</option>
                                    <option value={4}>4 - Thorough</option>
                                    <option value={5}>5 - Comprehensive</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-wider text-dim">Stages/Cycle</label>
                                <select
                                    value={stagesPerCycle}
                                    onChange={(e) => setStagesPerCycle(Number(e.target.value))}
                                    style={{
                                        background: 'hsl(222 47% 11%)',
                                        border: '1px solid hsl(222 47% 18% / 0.5)',
                                        color: 'hsl(210 40% 98%)'
                                    }}
                                    className="w-full p-2.5 rounded-xl text-sm"
                                >
                                    <option value={3}>3 - Fast</option>
                                    <option value={4}>4 - Balanced</option>
                                    <option value={6}>6 - Full Cycle</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={startResearch}
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 !bg-purple-600 shadow-purple-600/20"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Rabbit size={18} />}
                        {loading ? 'Initializing...' : 'Start Deep Research'}
                    </button>
                </div>
            </div>
        );
    }

    // Research in progress
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-500/10 rounded-xl">
                        <Rabbit size={18} className="text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-200">Deep Research</h3>
                        <p className="text-[10px] text-slate-500">{branches.length} branch{branches.length > 1 ? 'es' : ''}</p>
                    </div>
                </div>
                <button
                    onClick={handleReset}
                    className="p-2 rounded-xl hover:bg-slate-800/50 transition-colors text-slate-500 hover:text-slate-300"
                >
                    <RotateCcw size={16} />
                </button>
            </div>

            <div className="flex gap-2">
                {activeBranch?.status === 'active' && (
                    <button
                        onClick={runNextStage}
                        disabled={loading}
                        className="flex-1 btn-primary flex items-center justify-center gap-2 !py-2.5 !bg-purple-600"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span className="text-sm">Exploring...</span>
                            </>
                        ) : (
                            <>
                                <Zap size={16} />
                                <span className="text-sm">Next Stage</span>
                            </>
                        )}
                    </button>
                )}

                {activeBranch?.status === 'complete' && activeBranch.discoveredTopics.length > 0 && (
                    <button
                        onClick={() => {
                            const nextBranch = branches.find(b => b.status === 'active' && b.stages.length === 0);
                            if (nextBranch) setActiveBranchId(nextBranch.id);
                        }}
                        className="flex-1 btn-primary flex items-center justify-center gap-2 !py-2.5 !bg-green-600"
                    >
                        <GitBranch size={16} />
                        <span className="text-sm">Explore Branch</span>
                    </button>
                )}
            </div>

            <div className="flex items-center justify-between p-3 glass rounded-xl">
                <div className="flex items-center gap-2">
                    <GitBranch size={14} className="text-slate-500" />
                    <span className="text-sm text-slate-300">Auto-explore branches</span>
                </div>
                <button
                    onClick={() => setIsAutoMode(!isAutoMode)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                        isAutoMode ? 'bg-purple-600' : 'bg-slate-700'
                    }`}
                >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        isAutoMode ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                </button>
            </div>

            {loading && activeBranch && (
                <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                    <Loader2 size={16} className="animate-spin text-purple-400" />
                    <div>
                        <p className="text-sm text-purple-300 font-medium">
                            {STAGE_CONFIG[getNextStageType(activeBranch.stages)].label}...
                        </p>
                        <p className="text-[10px] text-purple-400/70">
                            Stage {activeBranch.stages.length + 1} of {stagesPerCycle}
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {branches.filter(b => !b.parentBranchId).map(branch => renderBranch(branch))}
            </div>
        </div>
    );
};

export default DeepResearchApp;
