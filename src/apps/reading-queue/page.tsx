import React, { useState, useEffect } from 'react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import {
    BookOpen, Plus, Trash2, ExternalLink, Clock, Check, Archive,
    Loader2, Sparkles, Star, Tag, Filter, Search, ChevronDown,
    ChevronUp, RefreshCw, BookMarked, Timer, Eye, MoreVertical
} from 'lucide-react';

interface ReadingItem {
    id: string;
    url: string;
    title: string;
    description?: string;
    favicon?: string;
    addedAt: number;
    readAt?: number;
    estimatedReadTime?: number;
    priority: 'high' | 'medium' | 'low';
    tags: string[];
    isRead: boolean;
    aiSummary?: string;
}

const ReadingQueue: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading: aiLoading } = useGemini();
    const [items, setItems] = useState<ReadingItem[]>([]);
    const [url, setUrl] = useState('');
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('unread');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'added' | 'priority' | 'time'>('added');
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [summarizingId, setSummarizingId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newItemTags, setNewItemTags] = useState('');
    const [newItemPriority, setNewItemPriority] = useState<'high' | 'medium' | 'low'>('medium');

    // Load items from storage
    useEffect(() => {
        chrome.storage.local.get('readingQueue', (result) => {
            if (result.readingQueue) {
                setItems(result.readingQueue as ReadingItem[]);
            }
        });
    }, []);

    // Save items to storage
    const saveItems = async (newItems: ReadingItem[]) => {
        setItems(newItems);
        await chrome.storage.local.set({ readingQueue: newItems });
    };

    // Add current page to queue
    const addCurrentPage = async () => {
        if (!context?.url || !context.title) return;

        const newItem: ReadingItem = {
            id: Date.now().toString(),
            url: context.url,
            title: context.title,
            description: context.content?.slice(0, 200),
            favicon: `https://www.google.com/s2/favicons?domain=${new URL(context.url).hostname}&sz=32`,
            addedAt: Date.now(),
            estimatedReadTime: estimateReadTime(context.content || ''),
            priority: 'medium',
            tags: [],
            isRead: false
        };

        await saveItems([newItem, ...items]);
    };

    // Add URL manually
    const addUrl = async () => {
        if (!url.trim()) return;

        try {
            // Create a tab to get page info
            const tab = await chrome.tabs.create({ url, active: false });

            // Wait for load
            await new Promise<void>((resolve) => {
                const listener = (tabId: number, info: { status?: string }) => {
                    if (tabId === tab.id && info.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        resolve();
                    }
                };
                chrome.tabs.onUpdated.addListener(listener);
                setTimeout(() => {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }, 10000);
            });

            // Get page info
            const updatedTab = await chrome.tabs.get(tab.id!);

            const newItem: ReadingItem = {
                id: Date.now().toString(),
                url: url,
                title: updatedTab.title || url,
                favicon: updatedTab.favIconUrl || `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
                addedAt: Date.now(),
                priority: newItemPriority,
                tags: newItemTags.split(',').map(t => t.trim()).filter(Boolean),
                isRead: false
            };

            // Close the tab
            await chrome.tabs.remove(tab.id!);

            await saveItems([newItem, ...items]);
            setUrl('');
            setNewItemTags('');
            setShowAddForm(false);
        } catch (err) {
            // Fallback: add without fetching
            const newItem: ReadingItem = {
                id: Date.now().toString(),
                url: url,
                title: url,
                favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
                addedAt: Date.now(),
                priority: newItemPriority,
                tags: newItemTags.split(',').map(t => t.trim()).filter(Boolean),
                isRead: false
            };
            await saveItems([newItem, ...items]);
            setUrl('');
            setNewItemTags('');
            setShowAddForm(false);
        }
    };

    // Estimate read time based on word count
    const estimateReadTime = (content: string): number => {
        const words = content.split(/\s+/).length;
        return Math.ceil(words / 200); // ~200 words per minute
    };

    // Mark as read
    const markAsRead = async (id: string) => {
        const updated = items.map(item =>
            item.id === id ? { ...item, isRead: true, readAt: Date.now() } : item
        );
        await saveItems(updated);
    };

    // Mark as unread
    const markAsUnread = async (id: string) => {
        const updated = items.map(item =>
            item.id === id ? { ...item, isRead: false, readAt: undefined } : item
        );
        await saveItems(updated);
    };

    // Delete item
    const deleteItem = async (id: string) => {
        const updated = items.filter(item => item.id !== id);
        await saveItems(updated);
    };

    // Update priority
    const updatePriority = async (id: string, priority: ReadingItem['priority']) => {
        const updated = items.map(item =>
            item.id === id ? { ...item, priority } : item
        );
        await saveItems(updated);
    };

    // Open and mark as read
    const openItem = async (item: ReadingItem) => {
        await chrome.tabs.create({ url: item.url });
        await markAsRead(item.id);
    };

    // AI summarize
    const summarizeItem = async (item: ReadingItem) => {
        setSummarizingId(item.id);
        try {
            const prompt = `Based on this article title and URL, provide a brief 2-3 sentence summary of what this article is likely about and why it might be worth reading:

Title: ${item.title}
URL: ${item.url}
${item.description ? `Preview: ${item.description}` : ''}

Also suggest 2-3 relevant tags.

Return JSON: { "summary": "...", "tags": ["tag1", "tag2"] }`;

            const result = await generateContent(prompt, 'Summarize articles helpfully.', { jsonMode: true });

            const updated = items.map(i =>
                i.id === item.id ? {
                    ...i,
                    aiSummary: result.summary,
                    tags: [...new Set([...i.tags, ...(result.tags || [])])]
                } : i
            );
            await saveItems(updated);
        } catch (err) {
            console.error('Summary failed:', err);
        }
        setSummarizingId(null);
    };

    // AI prioritize queue
    const aiPrioritize = async () => {
        const unreadItems = items.filter(i => !i.isRead);
        if (unreadItems.length === 0) return;

        const itemsData = unreadItems.map(i => ({
            id: i.id,
            title: i.title,
            url: i.url,
            tags: i.tags
        }));

        const prompt = `Analyze these reading list items and suggest priority rankings based on likely importance, timeliness, and educational value.

Items:
${JSON.stringify(itemsData, null, 2)}

Return JSON: { "priorities": [{ "id": "...", "priority": "high|medium|low", "reason": "..." }] }`;

        try {
            const result = await generateContent(prompt, 'You are a productivity assistant.', { jsonMode: true });

            const updated = items.map(item => {
                const suggestion = result.priorities?.find((p: any) => p.id === item.id);
                return suggestion ? { ...item, priority: suggestion.priority } : item;
            });
            await saveItems(updated);
        } catch (err) {
            console.error('Prioritization failed:', err);
        }
    };

    // Filter and sort items
    const getFilteredItems = (): ReadingItem[] => {
        let filtered = [...items];

        // Apply filter
        if (filter === 'unread') {
            filtered = filtered.filter(i => !i.isRead);
        } else if (filter === 'read') {
            filtered = filtered.filter(i => i.isRead);
        }

        // Apply search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(i =>
                i.title.toLowerCase().includes(query) ||
                i.url.toLowerCase().includes(query) ||
                i.tags.some(t => t.toLowerCase().includes(query))
            );
        }

        // Apply sort
        if (sortBy === 'priority') {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        } else if (sortBy === 'time') {
            filtered.sort((a, b) => (a.estimatedReadTime || 0) - (b.estimatedReadTime || 0));
        } else {
            filtered.sort((a, b) => b.addedAt - a.addedAt);
        }

        return filtered;
    };

    const filteredItems = getFilteredItems();
    const unreadCount = items.filter(i => !i.isRead).length;
    const totalReadTime = items.filter(i => !i.isRead).reduce((acc, i) => acc + (i.estimatedReadTime || 0), 0);

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'hsl(0 84% 60%)';
            case 'medium': return 'hsl(45 93% 47%)';
            case 'low': return 'hsl(142 71% 45%)';
            default: return 'hsl(215 20% 50%)';
        }
    };

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
                        background: 'linear-gradient(135deg, hsl(262 83% 58%) 0%, hsl(262 83% 48%) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <BookOpen size={22} style={{ color: 'white' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(210 40% 98%)' }}>
                            Reading Queue
                        </h3>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 55%)', marginTop: '2px' }}>
                            {unreadCount} unread • ~{totalReadTime} min total
                        </p>
                    </div>
                </div>

                {/* Quick Add */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    {context?.url && (
                        <button
                            onClick={addCurrentPage}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '8px',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                background: 'linear-gradient(135deg, hsl(262 83% 58%) 0%, hsl(262 83% 48%) 100%)',
                                color: 'white'
                            }}
                        >
                            <Plus size={14} />
                            Add Current Page
                        </button>
                    )}
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: 'hsl(222 47% 16%)',
                            color: 'hsl(215 20% 65%)'
                        }}
                    >
                        <Plus size={14} />
                    </button>
                </div>

                {/* Add URL Form */}
                {showAddForm && (
                    <div style={{
                        padding: '12px',
                        backgroundColor: 'hsl(222 47% 8%)',
                        borderRadius: '10px',
                        marginBottom: '12px'
                    }}>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/article"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                backgroundColor: 'hsl(222 47% 11%)',
                                border: '1px solid hsl(222 47% 20%)',
                                borderRadius: '8px',
                                color: 'hsl(210 40% 98%)',
                                fontSize: '12px',
                                outline: 'none',
                                marginBottom: '8px'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input
                                type="text"
                                value={newItemTags}
                                onChange={(e) => setNewItemTags(e.target.value)}
                                placeholder="Tags (comma separated)"
                                style={{
                                    flex: 1,
                                    padding: '8px 10px',
                                    backgroundColor: 'hsl(222 47% 11%)',
                                    border: '1px solid hsl(222 47% 20%)',
                                    borderRadius: '6px',
                                    color: 'hsl(210 40% 98%)',
                                    fontSize: '11px',
                                    outline: 'none'
                                }}
                            />
                            <select
                                value={newItemPriority}
                                onChange={(e) => setNewItemPriority(e.target.value as any)}
                                style={{
                                    padding: '8px 10px',
                                    backgroundColor: 'hsl(222 47% 11%)',
                                    border: '1px solid hsl(222 47% 20%)',
                                    borderRadius: '6px',
                                    color: 'hsl(210 40% 98%)',
                                    fontSize: '11px',
                                    outline: 'none'
                                }}
                            >
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                        <button
                            onClick={addUrl}
                            disabled={!url.trim()}
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '8px',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                backgroundColor: 'hsl(262 83% 58%)',
                                color: 'white',
                                opacity: !url.trim() ? 0.5 : 1
                            }}
                        >
                            Add to Queue
                        </button>
                    </div>
                )}

                {/* AI Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={aiPrioritize}
                        disabled={aiLoading || unreadCount === 0}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            backgroundColor: 'hsl(45 93% 47% / 0.2)',
                            color: 'hsl(45 93% 60%)',
                            opacity: unreadCount === 0 ? 0.5 : 1
                        }}
                    >
                        {aiLoading ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                        AI Prioritize
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['all', 'unread', 'read'] as const).map(f => (
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
                            backgroundColor: filter === f ? 'hsl(262 83% 58%)' : 'hsl(222 47% 13%)',
                            color: filter === f ? 'white' : 'hsl(215 20% 60%)'
                        }}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        {f === 'unread' && unreadCount > 0 && ` (${unreadCount})`}
                    </button>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                    {(['added', 'priority', 'time'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setSortBy(s)}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '10px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                backgroundColor: sortBy === s ? 'hsl(222 47% 20%)' : 'transparent',
                                color: sortBy === s ? 'hsl(210 40% 98%)' : 'hsl(215 20% 50%)'
                            }}
                        >
                            {s === 'added' ? 'Recent' : s === 'priority' ? 'Priority' : 'Time'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
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
                    placeholder="Search reading list..."
                    style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        backgroundColor: 'hsl(222 47% 11%)',
                        border: '1px solid hsl(222 47% 18%)',
                        borderRadius: '10px',
                        color: 'hsl(210 40% 98%)',
                        fontSize: '13px',
                        outline: 'none'
                    }}
                />
            </div>

            {/* Reading List */}
            <div style={{
                backgroundColor: 'hsl(222 47% 8%)',
                borderRadius: '12px',
                border: '1px solid hsl(222 47% 15%)',
                overflow: 'hidden'
            }}>
                {filteredItems.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                        <BookOpen size={32} style={{ color: 'hsl(215 20% 30%)', margin: '0 auto 12px' }} />
                        <p style={{ fontSize: '13px', color: 'hsl(215 20% 55%)' }}>
                            {items.length === 0 ? 'Your reading queue is empty' : 'No items match your filter'}
                        </p>
                        <p style={{ fontSize: '11px', color: 'hsl(215 20% 45%)', marginTop: '6px' }}>
                            {items.length === 0 ? 'Add pages to read later' : 'Try a different filter'}
                        </p>
                    </div>
                ) : (
                    <div>
                        {filteredItems.map((item, idx) => (
                            <div
                                key={item.id}
                                style={{
                                    padding: '14px 16px',
                                    borderBottom: idx < filteredItems.length - 1 ? '1px solid hsl(222 47% 15%)' : 'none',
                                    backgroundColor: item.isRead ? 'hsl(222 47% 6%)' : 'transparent',
                                    opacity: item.isRead ? 0.7 : 1
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    {/* Priority Indicator */}
                                    <div style={{
                                        width: '4px',
                                        height: '40px',
                                        borderRadius: '2px',
                                        backgroundColor: getPriorityColor(item.priority),
                                        flexShrink: 0
                                    }} />

                                    {/* Favicon */}
                                    {item.favicon && (
                                        <img
                                            src={item.favicon}
                                            style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 2 }}
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    )}

                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            onClick={() => openItem(item)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <p style={{
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                color: item.isRead ? 'hsl(215 20% 60%)' : 'hsl(210 40% 98%)',
                                                marginBottom: '4px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                textDecoration: item.isRead ? 'line-through' : 'none'
                                            }}>
                                                {item.title}
                                            </p>
                                            <p style={{
                                                fontSize: '10px',
                                                color: 'hsl(215 20% 50%)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {new URL(item.url).hostname}
                                            </p>
                                        </div>

                                        {/* Meta */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                            {item.estimatedReadTime && (
                                                <span style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '10px',
                                                    color: 'hsl(215 20% 50%)'
                                                }}>
                                                    <Timer size={10} />
                                                    {item.estimatedReadTime} min
                                                </span>
                                            )}
                                            {item.tags.map((tag, i) => (
                                                <span key={i} style={{
                                                    padding: '2px 6px',
                                                    backgroundColor: 'hsl(262 83% 58% / 0.2)',
                                                    borderRadius: '4px',
                                                    fontSize: '9px',
                                                    color: 'hsl(262 83% 70%)'
                                                }}>
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>

                                        {/* AI Summary */}
                                        {item.aiSummary && (
                                            <p style={{
                                                marginTop: '8px',
                                                padding: '8px',
                                                backgroundColor: 'hsl(262 83% 58% / 0.1)',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                color: 'hsl(262 83% 75%)',
                                                lineHeight: 1.4
                                            }}>
                                                {item.aiSummary}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <button
                                            onClick={() => item.isRead ? markAsUnread(item.id) : markAsRead(item.id)}
                                            style={{
                                                padding: '6px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                backgroundColor: item.isRead ? 'hsl(222 47% 16%)' : 'hsl(142 71% 45% / 0.2)',
                                                color: item.isRead ? 'hsl(215 20% 60%)' : 'hsl(142 71% 60%)',
                                                cursor: 'pointer'
                                            }}
                                            title={item.isRead ? 'Mark as unread' : 'Mark as read'}
                                        >
                                            <Check size={12} />
                                        </button>
                                        <button
                                            onClick={() => summarizeItem(item)}
                                            disabled={summarizingId === item.id}
                                            style={{
                                                padding: '6px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                backgroundColor: 'hsl(262 83% 58% / 0.2)',
                                                color: 'hsl(262 83% 65%)',
                                                cursor: 'pointer'
                                            }}
                                            title="AI summarize"
                                        >
                                            {summarizingId === item.id ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                                        </button>
                                        <button
                                            onClick={() => deleteItem(item.id)}
                                            style={{
                                                padding: '6px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                backgroundColor: 'hsl(0 84% 60% / 0.2)',
                                                color: 'hsl(0 84% 65%)',
                                                cursor: 'pointer'
                                            }}
                                            title="Remove"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px'
            }}>
                {[
                    { label: 'Total', value: items.length, color: 'hsl(262 83% 60%)' },
                    { label: 'Unread', value: unreadCount, color: 'hsl(45 93% 55%)' },
                    { label: 'Read', value: items.filter(i => i.isRead).length, color: 'hsl(142 71% 55%)' }
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

export default ReadingQueue;
