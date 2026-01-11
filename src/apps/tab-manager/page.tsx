import React, { useState, useEffect } from 'react';
import { useGemini } from '../../hooks/useGemini';
import {
    Layers, Search, Trash2, Pin, PinOff, Copy, ExternalLink,
    Loader2, Sparkles, FolderOpen, X, RefreshCw, Archive,
    Clock, Globe, ChevronDown, ChevronUp, Check, Filter,
    Save, Upload, Group, Ungroup, Volume2, VolumeX
} from 'lucide-react';

interface TabInfo {
    id: number;
    title: string;
    url: string;
    favIconUrl?: string;
    pinned: boolean;
    audible?: boolean;
    mutedInfo?: { muted: boolean };
    windowId: number;
    index: number;
    active: boolean;
    groupId?: number;
    summary?: string;
}

interface TabGroup {
    name: string;
    tabs: TabInfo[];
    color: string;
}

interface SavedSession {
    id: string;
    name: string;
    tabs: { title: string; url: string }[];
    timestamp: number;
}

const TabManagerPro: React.FC = () => {
    const { generateContent, loading: aiLoading } = useGemini();
    const [tabs, setTabs] = useState<TabInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTabs, setSelectedTabs] = useState<Set<number>>(new Set());
    const [groupedTabs, setGroupedTabs] = useState<TabGroup[]>([]);
    const [showGroups, setShowGroups] = useState(false);
    const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
    const [showSessions, setShowSessions] = useState(false);
    const [summarizing, setSummarizing] = useState<number | null>(null);
    const [filter, setFilter] = useState<'all' | 'pinned' | 'audible' | 'duplicates'>('all');
    const [sortBy, setSortBy] = useState<'index' | 'title' | 'domain'>('index');
    const [expandedSummaries, setExpandedSummaries] = useState<Set<number>>(new Set());

    // Load tabs
    const loadTabs = async () => {
        setLoading(true);
        try {
            const allTabs = await chrome.tabs.query({});
            setTabs(allTabs.map(tab => ({
                id: tab.id!,
                title: tab.title || 'Untitled',
                url: tab.url || '',
                favIconUrl: tab.favIconUrl,
                pinned: tab.pinned || false,
                audible: tab.audible,
                mutedInfo: tab.mutedInfo,
                windowId: tab.windowId,
                index: tab.index,
                active: tab.active || false,
                groupId: tab.groupId
            })));
        } catch (err) {
            console.error('Failed to load tabs:', err);
        }
        setLoading(false);
    };

    // Load saved sessions from storage
    const loadSessions = async () => {
        try {
            const result = await chrome.storage.local.get('tabSessions');
            if (result.tabSessions) {
                setSavedSessions(result.tabSessions as SavedSession[]);
            }
        } catch (err) {
            console.error('Failed to load sessions:', err);
        }
    };

    useEffect(() => {
        loadTabs();
        loadSessions();

        // Listen for tab changes
        const handleTabUpdate = () => loadTabs();
        chrome.tabs.onCreated.addListener(handleTabUpdate);
        chrome.tabs.onRemoved.addListener(handleTabUpdate);
        chrome.tabs.onUpdated.addListener(handleTabUpdate);

        return () => {
            chrome.tabs.onCreated.removeListener(handleTabUpdate);
            chrome.tabs.onRemoved.removeListener(handleTabUpdate);
            chrome.tabs.onUpdated.removeListener(handleTabUpdate);
        };
    }, []);

    // Get domain from URL
    const getDomain = (url: string): string => {
        try {
            return new URL(url).hostname;
        } catch {
            return url;
        }
    };

    // Find duplicate tabs
    const getDuplicates = (): Map<string, TabInfo[]> => {
        const urlMap = new Map<string, TabInfo[]>();
        tabs.forEach(tab => {
            const existing = urlMap.get(tab.url) || [];
            urlMap.set(tab.url, [...existing, tab]);
        });
        return new Map([...urlMap].filter(([_, tabs]) => tabs.length > 1));
    };

    // Filter and sort tabs
    const getFilteredTabs = (): TabInfo[] => {
        let filtered = [...tabs];

        // Apply filter
        if (filter === 'pinned') {
            filtered = filtered.filter(t => t.pinned);
        } else if (filter === 'audible') {
            filtered = filtered.filter(t => t.audible);
        } else if (filter === 'duplicates') {
            const duplicates = getDuplicates();
            const dupUrls = new Set(duplicates.keys());
            filtered = filtered.filter(t => dupUrls.has(t.url));
        }

        // Apply search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.title.toLowerCase().includes(query) ||
                t.url.toLowerCase().includes(query)
            );
        }

        // Apply sort
        if (sortBy === 'title') {
            filtered.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortBy === 'domain') {
            filtered.sort((a, b) => getDomain(a.url).localeCompare(getDomain(b.url)));
        }

        return filtered;
    };

    // Tab actions
    const goToTab = async (tabId: number) => {
        const tab = tabs.find(t => t.id === tabId);
        if (tab) {
            await chrome.windows.update(tab.windowId, { focused: true });
            await chrome.tabs.update(tabId, { active: true });
        }
    };

    const closeTab = async (tabId: number) => {
        await chrome.tabs.remove(tabId);
        setSelectedTabs(prev => {
            const next = new Set(prev);
            next.delete(tabId);
            return next;
        });
    };

    const closeTabs = async (tabIds: number[]) => {
        await chrome.tabs.remove(tabIds);
        setSelectedTabs(new Set());
    };

    const pinTab = async (tabId: number, pinned: boolean) => {
        await chrome.tabs.update(tabId, { pinned });
    };

    const muteTab = async (tabId: number, muted: boolean) => {
        await chrome.tabs.update(tabId, { muted });
    };

    const duplicateTab = async (tabId: number) => {
        await chrome.tabs.duplicate(tabId);
    };

    // Close duplicate tabs (keep first of each)
    const closeDuplicates = async () => {
        const duplicates = getDuplicates();
        const toClose: number[] = [];
        duplicates.forEach(tabs => {
            // Keep the first one, close the rest
            tabs.slice(1).forEach(t => toClose.push(t.id));
        });
        if (toClose.length > 0) {
            await chrome.tabs.remove(toClose);
        }
    };

    // AI-powered grouping
    const groupTabsByTopic = async () => {
        if (tabs.length === 0) return;

        const tabsData = tabs.map(t => ({
            id: t.id,
            title: t.title,
            domain: getDomain(t.url)
        }));

        const prompt = `Analyze these browser tabs and group them by topic/project. Return JSON:
{
    "groups": [
        {
            "name": "Group Name",
            "tabIds": [1, 2, 3],
            "color": "blue" // blue, red, green, yellow, purple, cyan, orange, pink
        }
    ]
}

Tabs:
${JSON.stringify(tabsData, null, 2)}

Create logical groups based on content, domains, and likely user intent. Max 8 groups.`;

        try {
            const result = await generateContent(prompt, 'You are a tab organization assistant. Group tabs logically.', { jsonMode: true });

            const colors = ['hsl(217 91% 60%)', 'hsl(0 84% 60%)', 'hsl(142 71% 45%)', 'hsl(45 93% 47%)',
                          'hsl(262 83% 58%)', 'hsl(187 92% 45%)', 'hsl(24 95% 50%)', 'hsl(330 81% 60%)'];

            const groups: TabGroup[] = result.groups.map((g: any, i: number) => ({
                name: g.name,
                tabs: g.tabIds.map((id: number) => tabs.find(t => t.id === id)).filter(Boolean),
                color: colors[i % colors.length]
            }));

            setGroupedTabs(groups);
            setShowGroups(true);
        } catch (err) {
            console.error('Grouping failed:', err);
        }
    };

    // Summarize tab content
    const summarizeTab = async (tab: TabInfo) => {
        setSummarizing(tab.id);
        try {
            const prompt = `Based on this page title and URL, provide a one-sentence summary of what this page is likely about:
Title: ${tab.title}
URL: ${tab.url}

Keep it under 100 characters.`;

            const result = await generateContent(prompt, 'Summarize web pages concisely.', { jsonMode: false });

            setTabs(prev => prev.map(t =>
                t.id === tab.id ? { ...t, summary: typeof result === 'string' ? result : result.summary } : t
            ));
            setExpandedSummaries(prev => new Set([...prev, tab.id]));
        } catch (err) {
            console.error('Summary failed:', err);
        }
        setSummarizing(null);
    };

    // Save current session
    const saveSession = async () => {
        const name = prompt('Session name:', `Session ${new Date().toLocaleDateString()}`);
        if (!name) return;

        const session: SavedSession = {
            id: Date.now().toString(),
            name,
            tabs: tabs.map(t => ({ title: t.title, url: t.url })),
            timestamp: Date.now()
        };

        const updated = [session, ...savedSessions].slice(0, 20);
        setSavedSessions(updated);
        await chrome.storage.local.set({ tabSessions: updated });
    };

    // Restore session
    const restoreSession = async (session: SavedSession) => {
        for (const tab of session.tabs) {
            await chrome.tabs.create({ url: tab.url, active: false });
        }
    };

    // Delete session
    const deleteSession = async (sessionId: string) => {
        const updated = savedSessions.filter(s => s.id !== sessionId);
        setSavedSessions(updated);
        await chrome.storage.local.set({ tabSessions: updated });
    };

    const toggleTabSelection = (tabId: number) => {
        setSelectedTabs(prev => {
            const next = new Set(prev);
            if (next.has(tabId)) {
                next.delete(tabId);
            } else {
                next.add(tabId);
            }
            return next;
        });
    };

    const selectAll = () => {
        setSelectedTabs(new Set(getFilteredTabs().map(t => t.id)));
    };

    const filteredTabs = getFilteredTabs();
    const duplicateCount = [...getDuplicates().values()].reduce((acc, tabs) => acc + tabs.length - 1, 0);

    return (
        <div className="space-y-4">
            {/* Header */}
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
                        background: 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(217 91% 50%) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Layers size={22} style={{ color: 'white' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(210 40% 98%)' }}>
                            Tab Manager Pro
                        </h3>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 55%)', marginTop: '2px' }}>
                            {tabs.length} tabs • {duplicateCount > 0 && `${duplicateCount} duplicates`}
                        </p>
                    </div>
                    <button
                        onClick={loadTabs}
                        style={{
                            padding: '8px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'hsl(222 47% 16%)',
                            color: 'hsl(215 20% 65%)',
                            cursor: 'pointer'
                        }}
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <Search size={14} style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'hsl(215 20% 45%)'
                    }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tabs..."
                        style={{
                            width: '100%',
                            padding: '10px 12px 10px 36px',
                            backgroundColor: 'hsl(222 47% 8%)',
                            border: '1px solid hsl(222 47% 18%)',
                            borderRadius: '10px',
                            color: 'hsl(210 40% 98%)',
                            fontSize: '13px',
                            outline: 'none'
                        }}
                    />
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        onClick={groupTabsByTopic}
                        disabled={aiLoading}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'linear-gradient(135deg, hsl(262 83% 58%) 0%, hsl(262 83% 48%) 100%)',
                            color: 'white'
                        }}
                    >
                        {aiLoading ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                        AI Group
                    </button>

                    {duplicateCount > 0 && (
                        <button
                            onClick={closeDuplicates}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: 'hsl(0 84% 60% / 0.2)',
                                color: 'hsl(0 84% 65%)'
                            }}
                        >
                            <Trash2 size={12} />
                            Close {duplicateCount} Duplicates
                        </button>
                    )}

                    <button
                        onClick={saveSession}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: 'hsl(142 71% 45% / 0.2)',
                            color: 'hsl(142 71% 65%)'
                        }}
                    >
                        <Save size={12} />
                        Save Session
                    </button>

                    {savedSessions.length > 0 && (
                        <button
                            onClick={() => setShowSessions(!showSessions)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: 'hsl(222 47% 16%)',
                                color: 'hsl(215 20% 65%)'
                            }}
                        >
                            <Archive size={12} />
                            Sessions ({savedSessions.length})
                        </button>
                    )}
                </div>
            </div>

            {/* Saved Sessions */}
            {showSessions && savedSessions.length > 0 && (
                <div style={{
                    padding: '12px',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '12px',
                    border: '1px solid hsl(222 47% 18%)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(215 20% 65%)' }}>Saved Sessions</span>
                        <button onClick={() => setShowSessions(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(215 20% 50%)' }}>
                            <X size={14} />
                        </button>
                    </div>
                    <div className="space-y-2">
                        {savedSessions.map(session => (
                            <div key={session.id} style={{
                                padding: '10px 12px',
                                backgroundColor: 'hsl(222 47% 8%)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div>
                                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(210 40% 98%)' }}>{session.name}</p>
                                    <p style={{ fontSize: '10px', color: 'hsl(215 20% 50%)' }}>
                                        {session.tabs.length} tabs • {new Date(session.timestamp).toLocaleDateString()}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        onClick={() => restoreSession(session)}
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            backgroundColor: 'hsl(217 91% 60% / 0.2)',
                                            color: 'hsl(217 91% 65%)'
                                        }}
                                    >
                                        <Upload size={10} /> Restore
                                    </button>
                                    <button
                                        onClick={() => deleteSession(session.id)}
                                        style={{
                                            padding: '6px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            backgroundColor: 'hsl(0 84% 60% / 0.2)',
                                            color: 'hsl(0 84% 65%)'
                                        }}
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Groups */}
            {showGroups && groupedTabs.length > 0 && (
                <div style={{
                    padding: '12px',
                    backgroundColor: 'hsl(262 83% 58% / 0.1)',
                    borderRadius: '12px',
                    border: '1px solid hsl(262 83% 58% / 0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sparkles size={14} style={{ color: 'hsl(262 83% 65%)' }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(262 83% 70%)' }}>AI-Grouped Tabs</span>
                        </div>
                        <button onClick={() => setShowGroups(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(215 20% 50%)' }}>
                            <X size={14} />
                        </button>
                    </div>
                    <div className="space-y-3">
                        {groupedTabs.map((group, idx) => (
                            <div key={idx} style={{
                                padding: '10px',
                                backgroundColor: 'hsl(222 47% 11%)',
                                borderRadius: '8px',
                                borderLeft: `3px solid ${group.color}`
                            }}>
                                <p style={{ fontSize: '11px', fontWeight: 700, color: group.color, marginBottom: '6px' }}>
                                    {group.name} ({group.tabs.length})
                                </p>
                                <div className="space-y-1">
                                    {group.tabs.slice(0, 5).map(tab => (
                                        <div key={tab.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 6px',
                                            backgroundColor: 'hsl(222 47% 8%)',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }} onClick={() => goToTab(tab.id)}>
                                            {tab.favIconUrl && <img src={tab.favIconUrl} style={{ width: 12, height: 12 }} />}
                                            <span style={{ fontSize: '10px', color: 'hsl(215 20% 70%)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {tab.title}
                                            </span>
                                        </div>
                                    ))}
                                    {group.tabs.length > 5 && (
                                        <p style={{ fontSize: '9px', color: 'hsl(215 20% 50%)', paddingLeft: '6px' }}>
                                            +{group.tabs.length - 5} more
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['all', 'pinned', 'audible', 'duplicates'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: filter === f ? 'hsl(217 91% 60%)' : 'hsl(222 47% 13%)',
                            color: filter === f ? 'white' : 'hsl(215 20% 60%)'
                        }}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Bulk Actions */}
            {selectedTabs.size > 0 && (
                <div style={{
                    padding: '10px 12px',
                    backgroundColor: 'hsl(217 91% 60% / 0.1)',
                    borderRadius: '10px',
                    border: '1px solid hsl(217 91% 60% / 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span style={{ fontSize: '12px', color: 'hsl(217 91% 70%)' }}>
                        {selectedTabs.size} selected
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => closeTabs([...selectedTabs])}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '10px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                backgroundColor: 'hsl(0 84% 60%)',
                                color: 'white'
                            }}
                        >
                            Close Selected
                        </button>
                        <button
                            onClick={() => setSelectedTabs(new Set())}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '10px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                backgroundColor: 'hsl(222 47% 16%)',
                                color: 'hsl(215 20% 65%)'
                            }}
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* Tab List */}
            <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                backgroundColor: 'hsl(222 47% 8%)',
                borderRadius: '12px',
                border: '1px solid hsl(222 47% 15%)'
            }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <Loader2 className="animate-spin" size={24} style={{ color: 'hsl(215 20% 50%)', margin: '0 auto 10px' }} />
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 50%)' }}>Loading tabs...</p>
                    </div>
                ) : filteredTabs.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <Layers size={32} style={{ color: 'hsl(215 20% 30%)', margin: '0 auto 10px' }} />
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 50%)' }}>No tabs match your filter</p>
                    </div>
                ) : (
                    <div className="space-y-1" style={{ padding: '8px' }}>
                        {filteredTabs.map(tab => (
                            <div
                                key={tab.id}
                                style={{
                                    padding: '10px 12px',
                                    backgroundColor: selectedTabs.has(tab.id) ? 'hsl(217 91% 60% / 0.15)' : tab.active ? 'hsl(142 71% 45% / 0.1)' : 'hsl(222 47% 11%)',
                                    borderRadius: '8px',
                                    borderLeft: `3px solid ${tab.active ? 'hsl(142 71% 45%)' : tab.pinned ? 'hsl(45 93% 47%)' : 'transparent'}`
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedTabs.has(tab.id)}
                                        onChange={() => toggleTabSelection(tab.id)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    {tab.favIconUrl ? (
                                        <img src={tab.favIconUrl} style={{ width: 16, height: 16, borderRadius: 2 }} />
                                    ) : (
                                        <Globe size={16} style={{ color: 'hsl(215 20% 50%)' }} />
                                    )}
                                    <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => goToTab(tab.id)}>
                                        <p style={{
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            color: 'hsl(210 40% 98%)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {tab.title}
                                        </p>
                                        <p style={{
                                            fontSize: '10px',
                                            color: 'hsl(215 20% 50%)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {getDomain(tab.url)}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {tab.audible && (
                                            <button
                                                onClick={() => muteTab(tab.id, !tab.mutedInfo?.muted)}
                                                style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: tab.mutedInfo?.muted ? 'hsl(0 84% 60%)' : 'hsl(142 71% 55%)' }}
                                            >
                                                {tab.mutedInfo?.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => pinTab(tab.id, !tab.pinned)}
                                            style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: tab.pinned ? 'hsl(45 93% 55%)' : 'hsl(215 20% 45%)' }}
                                        >
                                            {tab.pinned ? <Pin size={12} /> : <PinOff size={12} />}
                                        </button>
                                        <button
                                            onClick={() => summarizeTab(tab)}
                                            disabled={summarizing === tab.id}
                                            style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(262 83% 60%)' }}
                                        >
                                            {summarizing === tab.id ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                                        </button>
                                        <button
                                            onClick={() => closeTab(tab.id)}
                                            style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(0 84% 60%)' }}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>
                                {tab.summary && expandedSummaries.has(tab.id) && (
                                    <p style={{
                                        marginTop: '8px',
                                        paddingTop: '8px',
                                        borderTop: '1px solid hsl(222 47% 18%)',
                                        fontSize: '11px',
                                        color: 'hsl(262 83% 70%)',
                                        fontStyle: 'italic'
                                    }}>
                                        {tab.summary}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px'
            }}>
                {[
                    { label: 'Total', value: tabs.length, color: 'hsl(217 91% 60%)' },
                    { label: 'Pinned', value: tabs.filter(t => t.pinned).length, color: 'hsl(45 93% 55%)' },
                    { label: 'Audible', value: tabs.filter(t => t.audible).length, color: 'hsl(142 71% 55%)' },
                    { label: 'Duplicates', value: duplicateCount, color: 'hsl(0 84% 60%)' }
                ].map(stat => (
                    <div key={stat.label} style={{
                        padding: '10px',
                        backgroundColor: 'hsl(222 47% 11%)',
                        borderRadius: '8px',
                        textAlign: 'center'
                    }}>
                        <p style={{ fontSize: '18px', fontWeight: 700, color: stat.color }}>{stat.value}</p>
                        <p style={{ fontSize: '9px', color: 'hsl(215 20% 50%)', textTransform: 'uppercase' }}>{stat.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TabManagerPro;
