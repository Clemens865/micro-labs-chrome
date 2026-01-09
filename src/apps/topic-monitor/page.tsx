import React, { useState, useEffect } from 'react';
import {
    Radar, Plus, Trash2, Play, RefreshCw, Settings,
    Globe, Search, ExternalLink, Loader2, Copy, Check,
    Bell, BellOff, ChevronDown, Clock, Sparkles,
    Rss, TrendingUp, AlertCircle, BookOpen, X, Tag
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';

interface Topic {
    id: string;
    name: string;
    keywords: string[];
    priority: 'high' | 'medium' | 'low';
    lastChecked: number | null;
    notificationsEnabled: boolean;
}

interface Resource {
    id: string;
    name: string;
    url: string;
    type: 'blog' | 'news' | 'docs' | 'forum' | 'social' | 'custom';
    enabled: boolean;
}

interface Update {
    id: string;
    topicId: string;
    topicName: string;
    resourceName: string;
    title: string;
    summary: string;
    relevanceScore: number;
    sourceUrl: string;
    discoveredAt: number;
    isNew: boolean;
}

const DEFAULT_RESOURCES: Resource[] = [
    { id: 'r1', name: 'Hacker News', url: 'https://news.ycombinator.com', type: 'news', enabled: true },
    { id: 'r2', name: 'TechCrunch', url: 'https://techcrunch.com', type: 'news', enabled: true },
    { id: 'r3', name: 'Anthropic Blog', url: 'https://www.anthropic.com/research', type: 'blog', enabled: true },
    { id: 'r4', name: 'OpenAI Blog', url: 'https://openai.com/blog', type: 'blog', enabled: true },
    { id: 'r5', name: 'Google AI Blog', url: 'https://ai.googleblog.com', type: 'blog', enabled: true },
    { id: 'r6', name: 'Hugging Face', url: 'https://huggingface.co/blog', type: 'blog', enabled: true },
    { id: 'r7', name: 'Reddit ML', url: 'https://www.reddit.com/r/MachineLearning', type: 'forum', enabled: true },
];

const STORAGE_KEY = 'microlabs_topic_monitor';

const TopicMonitorApp: React.FC = () => {
    const { generateWithSearch, loading } = useGemini();

    const [topics, setTopics] = useState<Topic[]>([]);
    const [resources, setResources] = useState<Resource[]>(DEFAULT_RESOURCES);
    const [updates, setUpdates] = useState<Update[]>([]);
    const [lastScan, setLastScan] = useState<number | null>(null);

    const [newTopicName, setNewTopicName] = useState('');
    const [newTopicKeywords, setNewTopicKeywords] = useState('');
    const [newResourceUrl, setNewResourceUrl] = useState('');
    const [newResourceName, setNewResourceName] = useState('');
    const [status, setStatus] = useState('');
    const [activeTab, setActiveTab] = useState<'updates' | 'topics' | 'resources'>('topics');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Load from storage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setTopics(parsed.topics || []);
                setResources(parsed.resources || DEFAULT_RESOURCES);
                setUpdates(parsed.updates || []);
                setLastScan(parsed.lastScan);
            }
        } catch (e) {
            console.error('Failed to load saved data:', e);
        }
    }, []);

    // Save to storage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ topics, resources, updates, lastScan }));
        } catch (e) {
            console.error('Failed to save data:', e);
        }
    }, [topics, resources, updates, lastScan]);

    const addTopic = () => {
        if (!newTopicName.trim()) return;
        const keywords = newTopicKeywords.split(',').map(k => k.trim()).filter(k => k);
        const topic: Topic = {
            id: Date.now().toString(),
            name: newTopicName.trim(),
            keywords,
            priority: 'medium',
            lastChecked: null,
            notificationsEnabled: true
        };
        setTopics([...topics, topic]);
        setNewTopicName('');
        setNewTopicKeywords('');
    };

    const removeTopic = (id: string) => {
        setTopics(topics.filter(t => t.id !== id));
        setUpdates(updates.filter(u => u.topicId !== id));
    };

    const addResource = () => {
        if (!newResourceUrl.trim()) return;
        const resource: Resource = {
            id: Date.now().toString(),
            name: newResourceName.trim() || new URL(newResourceUrl).hostname,
            url: newResourceUrl.trim(),
            type: 'custom',
            enabled: true
        };
        setResources([...resources, resource]);
        setNewResourceUrl('');
        setNewResourceName('');
    };

    const toggleResource = (id: string) => {
        setResources(resources.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    };

    const removeResource = (id: string) => {
        setResources(resources.filter(r => r.id !== id));
    };

    const runScan = async () => {
        if (topics.length === 0) {
            setStatus('Add topics to monitor first');
            return;
        }

        const enabledResources = resources.filter(r => r.enabled);
        if (enabledResources.length === 0) {
            setStatus('Enable at least one resource');
            return;
        }

        setStatus('Scanning for updates...');

        try {
            const allTopicKeywords = topics.flatMap(t => [t.name, ...t.keywords]).join(', ');
            const resourceList = enabledResources.map(r => r.name).join(', ');

            const result = await generateWithSearch(
                `Find the latest news, articles, and developments about these topics: ${allTopicKeywords}

Focus on: ${resourceList}

For each relevant finding, provide:
1. Title
2. Brief summary (2-3 sentences)
3. Which topic it relates to
4. Source name

Format as JSON array: [{"title": "...", "summary": "...", "topic": "...", "source": "..."}]

Return only recent and highly relevant content.`,
                `You are a tech news researcher. Find the most relevant and recent updates. Return valid JSON array only.`
            );

            // Parse results
            try {
                const jsonMatch = result.text.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    const newUpdates: Update[] = parsed.slice(0, 10).map((item: any, idx: number) => {
                        const matchedTopic = topics.find(t =>
                            t.name.toLowerCase().includes(item.topic?.toLowerCase()) ||
                            item.topic?.toLowerCase().includes(t.name.toLowerCase())
                        ) || topics[0];

                        return {
                            id: `${Date.now()}-${idx}`,
                            topicId: matchedTopic?.id || '',
                            topicName: matchedTopic?.name || item.topic,
                            resourceName: item.source || 'Web',
                            title: item.title,
                            summary: item.summary,
                            relevanceScore: 0.8,
                            sourceUrl: '',
                            discoveredAt: Date.now(),
                            isNew: true
                        };
                    });

                    setUpdates(prev => [...newUpdates, ...prev.map(u => ({ ...u, isNew: false }))].slice(0, 50));
                }
            } catch (e) {
                console.error('Failed to parse results:', e);
            }

            setLastScan(Date.now());
            setStatus('');
            setActiveTab('updates');
        } catch (err: any) {
            setStatus(`Scan failed: ${err.message}`);
        }
    };

    const handleCopy = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getResourceIcon = (type: string) => {
        switch (type) {
            case 'blog': return BookOpen;
            case 'news': return Rss;
            case 'forum': return Globe;
            default: return Globe;
        }
    };

    const tabs = [
        { id: 'updates', label: 'Updates', icon: TrendingUp, count: updates.filter(u => u.isNew).length },
        { id: 'topics', label: 'Topics', icon: Tag, count: topics.length },
        { id: 'resources', label: 'Resources', icon: Globe, count: resources.filter(r => r.enabled).length }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center py-4">
                <div className="w-14 h-14 bg-cyan-600/10 text-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <Radar size={28} />
                </div>
                <h3 className="text-lg font-bold mb-1">Topic Monitor</h3>
                <p className="text-xs text-dim">Track topics across the web</p>
            </div>

            {/* Scan Button */}
            <button
                onClick={runScan}
                disabled={loading || topics.length === 0}
                className="btn-primary w-full flex items-center justify-center gap-2 !bg-cyan-600 shadow-cyan-600/20"
            >
                {loading ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        Scanning...
                    </>
                ) : (
                    <>
                        <Search size={18} />
                        Scan for Updates
                    </>
                )}
            </button>

            {lastScan && (
                <p className="text-[10px] text-center text-dim flex items-center justify-center gap-1">
                    <Clock size={10} />
                    Last scan: {new Date(lastScan).toLocaleTimeString()}
                </p>
            )}

            {status && (
                <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
                    status.includes('failed') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                }`}>
                    {status.includes('failed') ? <AlertCircle size={14} /> : <Loader2 size={14} className="animate-spin" />}
                    {status}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 p-1 glass rounded-xl">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                                activeTab === tab.id
                                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                        >
                            <Icon size={14} />
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    activeTab === tab.id ? 'bg-white/20' : 'bg-slate-700'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Updates Tab */}
            {activeTab === 'updates' && (
                <div className="space-y-3">
                    {updates.length === 0 ? (
                        <div className="text-center py-8">
                            <TrendingUp size={32} className="mx-auto text-slate-600 mb-3" />
                            <p className="text-sm text-slate-400">No updates yet</p>
                            <p className="text-xs text-dim mt-1">Run a scan to find updates</p>
                        </div>
                    ) : (
                        updates.map(update => (
                            <div key={update.id} className={`card p-4 space-y-2 ${update.isNew ? 'border-cyan-500/30' : ''}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {update.isNew && (
                                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-400 rounded">NEW</span>
                                            )}
                                            <span className="px-1.5 py-0.5 text-[10px] bg-slate-700/50 text-slate-400 rounded">{update.topicName}</span>
                                        </div>
                                        <h4 className="text-sm font-medium text-slate-200 leading-snug">{update.title}</h4>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(`${update.title}\n\n${update.summary}`, update.id)}
                                        className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors flex-shrink-0"
                                    >
                                        {copiedId === update.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-slate-500" />}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">{update.summary}</p>
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-[10px] text-dim">{update.resourceName}</span>
                                    <span className="text-[10px] text-dim">{new Date(update.discoveredAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Topics Tab */}
            {activeTab === 'topics' && (
                <div className="space-y-4">
                    {/* Add Topic Form */}
                    <div className="card p-4 space-y-3">
                        <h4 className="text-xs uppercase tracking-wider text-dim font-bold">Add Topic</h4>
                        <input
                            type="text"
                            value={newTopicName}
                            onChange={(e) => setNewTopicName(e.target.value)}
                            placeholder="Topic name (e.g., AI Agents)"
                        />
                        <input
                            type="text"
                            value={newTopicKeywords}
                            onChange={(e) => setNewTopicKeywords(e.target.value)}
                            placeholder="Keywords (comma-separated)"
                        />
                        <button
                            onClick={addTopic}
                            disabled={!newTopicName.trim()}
                            className="btn-secondary w-full flex items-center justify-center gap-2"
                        >
                            <Plus size={16} />
                            Add Topic
                        </button>
                    </div>

                    {/* Topic List */}
                    {topics.length === 0 ? (
                        <div className="text-center py-6">
                            <Tag size={28} className="mx-auto text-slate-600 mb-2" />
                            <p className="text-sm text-slate-400">No topics added</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {topics.map(topic => (
                                <div key={topic.id} className="card p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-cyan-500" />
                                            <span className="text-sm font-medium text-slate-200">{topic.name}</span>
                                        </div>
                                        <button
                                            onClick={() => removeTopic(topic.id)}
                                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    {topic.keywords.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2 ml-4">
                                            {topic.keywords.map((kw, idx) => (
                                                <span key={idx} className="px-2 py-0.5 text-[10px] bg-slate-700/50 text-slate-400 rounded-lg">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Resources Tab */}
            {activeTab === 'resources' && (
                <div className="space-y-4">
                    {/* Add Resource Form */}
                    <div className="card p-4 space-y-3">
                        <h4 className="text-xs uppercase tracking-wider text-dim font-bold">Add Resource</h4>
                        <input
                            type="url"
                            value={newResourceUrl}
                            onChange={(e) => setNewResourceUrl(e.target.value)}
                            placeholder="https://example.com/blog"
                        />
                        <input
                            type="text"
                            value={newResourceName}
                            onChange={(e) => setNewResourceName(e.target.value)}
                            placeholder="Resource name (optional)"
                        />
                        <button
                            onClick={addResource}
                            disabled={!newResourceUrl.trim()}
                            className="btn-secondary w-full flex items-center justify-center gap-2"
                        >
                            <Plus size={16} />
                            Add Resource
                        </button>
                    </div>

                    {/* Resource List */}
                    <div className="space-y-2">
                        {resources.map(resource => {
                            const Icon = getResourceIcon(resource.type);
                            return (
                                <div key={resource.id} className={`card p-3 ${!resource.enabled ? 'opacity-50' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Icon size={14} className="text-slate-500" />
                                            <span className="text-sm text-slate-200">{resource.name}</span>
                                            <span className="px-1.5 py-0.5 text-[10px] bg-slate-700/50 text-slate-500 rounded">
                                                {resource.type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => toggleResource(resource.id)}
                                                className={`p-1.5 rounded-lg transition-colors ${
                                                    resource.enabled ? 'text-cyan-400 hover:bg-cyan-500/20' : 'text-slate-500 hover:bg-slate-700/50'
                                                }`}
                                            >
                                                {resource.enabled ? <Bell size={14} /> : <BellOff size={14} />}
                                            </button>
                                            {resource.type === 'custom' && (
                                                <button
                                                    onClick={() => removeResource(resource.id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TopicMonitorApp;
