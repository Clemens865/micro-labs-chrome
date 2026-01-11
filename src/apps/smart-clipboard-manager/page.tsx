'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clipboard, Copy, Check, Trash2, Search, Pin, Star, Clock, Tag, Sparkles, ChevronDown, ChevronUp, Filter, FolderOpen, Loader2, Code, FileText, Link, Image, Hash, RefreshCw, Download } from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';

interface ClipboardItem {
    id: string;
    content: string;
    type: 'text' | 'code' | 'url' | 'email' | 'json' | 'html' | 'other';
    timestamp: string;
    source?: string;
    pinned: boolean;
    starred: boolean;
    tags: string[];
    category?: string;
    preview?: string;
}

interface ClipboardStats {
    totalItems: number;
    byType: Record<string, number>;
    recentSources: string[];
}

const STORAGE_KEY = 'microlabs_smart_clipboard_manager';
const MAX_ITEMS = 100;

export default function SmartClipboardManager() {
    const [items, setItems] = useState<ClipboardItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [showPinnedOnly, setShowPinnedOnly] = useState(false);
    const [showStarredOnly, setShowStarredOnly] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isCategorizingAll, setIsCategorizingAll] = useState(false);
    const [newTagInput, setNewTagInput] = useState<{ id: string; value: string } | null>(null);

    const { generateContent } = useGemini();
    const { context } = usePageContext();
    const { success, error: showError, info } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await chrome.storage.local.get(STORAGE_KEY) as { [key: string]: { items?: ClipboardItem[] } | undefined };
            const stored = data[STORAGE_KEY];
            if (stored?.items) setItems(stored.items);
        } catch (err) {
            console.error('Failed to load data:', err);
        }
    };

    const saveData = useCallback(async (newItems: ClipboardItem[]) => {
        try {
            await chrome.storage.local.set({
                [STORAGE_KEY]: { items: newItems.slice(0, MAX_ITEMS) }
            });
        } catch (err) {
            console.error('Failed to save data:', err);
        }
    }, []);

    const detectType = (content: string): ClipboardItem['type'] => {
        // URL detection
        if (/^https?:\/\/[^\s]+$/i.test(content.trim())) return 'url';

        // Email detection
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.trim())) return 'email';

        // JSON detection
        try {
            const trimmed = content.trim();
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                JSON.parse(trimmed);
                return 'json';
            }
        } catch {}

        // HTML detection
        if (/<[^>]+>/.test(content) && /<\/[^>]+>/.test(content)) return 'html';

        // Code detection (heuristics)
        const codePatterns = [
            /^(const|let|var|function|class|import|export|async|await)\s/m,
            /^\s*(def|class|import|from|if|else|elif|for|while)\s/m,
            /[{}();].*[{}();]/,
            /=>\s*[{(]/,
            /\.(ts|tsx|js|jsx|py|rb|go|rs|java|cpp|c|h)$/
        ];
        if (codePatterns.some(p => p.test(content))) return 'code';

        return 'text';
    };

    const generatePreview = (content: string, type: string): string => {
        const maxLength = 100;
        if (type === 'json') {
            try {
                const parsed = JSON.parse(content);
                const keys = Object.keys(parsed);
                return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`;
            } catch {
                return content.slice(0, maxLength);
            }
        }
        return content.slice(0, maxLength).replace(/\n/g, ' ');
    };

    const captureFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text.trim()) {
                info('Clipboard is empty');
                return;
            }

            // Check for duplicates
            if (items.some(item => item.content === text)) {
                info('This content is already saved');
                return;
            }

            const type = detectType(text);
            const newItem: ClipboardItem = {
                id: Date.now().toString(),
                content: text,
                type,
                timestamp: new Date().toISOString(),
                source: context?.url,
                pinned: false,
                starred: false,
                tags: [],
                preview: generatePreview(text, type)
            };

            const updated = [newItem, ...items].slice(0, MAX_ITEMS);
            setItems(updated);
            saveData(updated);
            success('Captured from clipboard');
        } catch (err) {
            showError('Failed to read clipboard. Please allow clipboard access.');
        }
    };

    const copyToClipboard = async (item: ClipboardItem) => {
        try {
            await navigator.clipboard.writeText(item.content);
            setCopiedId(item.id);
            setTimeout(() => setCopiedId(null), 2000);
            success('Copied');
        } catch (err) {
            showError('Failed to copy');
        }
    };

    const deleteItem = (id: string) => {
        const updated = items.filter(item => item.id !== id);
        setItems(updated);
        saveData(updated);
    };

    const togglePin = (id: string) => {
        const updated = items.map(item =>
            item.id === id ? { ...item, pinned: !item.pinned } : item
        );
        setItems(updated);
        saveData(updated);
    };

    const toggleStar = (id: string) => {
        const updated = items.map(item =>
            item.id === id ? { ...item, starred: !item.starred } : item
        );
        setItems(updated);
        saveData(updated);
    };

    const addTag = (id: string, tag: string) => {
        if (!tag.trim()) return;
        const updated = items.map(item =>
            item.id === id && !item.tags.includes(tag.trim())
                ? { ...item, tags: [...item.tags, tag.trim()] }
                : item
        );
        setItems(updated);
        saveData(updated);
        setNewTagInput(null);
    };

    const removeTag = (id: string, tag: string) => {
        const updated = items.map(item =>
            item.id === id
                ? { ...item, tags: item.tags.filter(t => t !== tag) }
                : item
        );
        setItems(updated);
        saveData(updated);
    };

    const categorizeWithAI = async (item: ClipboardItem) => {
        try {
            const prompt = `Analyze this clipboard content and suggest:
1. A short category (1-2 words)
2. Up to 3 relevant tags

Content (${item.type}):
${item.content.slice(0, 500)}

Return JSON: {"category": "string", "tags": ["tag1", "tag2"]}`;

            const response = await generateContent(prompt, undefined, { jsonMode: true });
            const parsed = JSON.parse(response);

            const updated = items.map(i =>
                i.id === item.id
                    ? {
                        ...i,
                        category: parsed.category,
                        tags: [...new Set([...i.tags, ...(parsed.tags || [])])]
                    }
                    : i
            );
            setItems(updated);
            saveData(updated);
            success('Categorized with AI');
        } catch (err) {
            showError('Failed to categorize');
        }
    };

    const categorizeAll = async () => {
        const uncategorized = items.filter(i => !i.category && i.tags.length === 0).slice(0, 10);
        if (uncategorized.length === 0) {
            info('All items are already categorized');
            return;
        }

        setIsCategorizingAll(true);

        try {
            for (const item of uncategorized) {
                await categorizeWithAI(item);
            }
            success(`Categorized ${uncategorized.length} items`);
        } catch (err) {
            showError('Failed to categorize some items');
        } finally {
            setIsCategorizingAll(false);
        }
    };

    const clearHistory = () => {
        const pinned = items.filter(i => i.pinned);
        setItems(pinned);
        saveData(pinned);
        success('History cleared (pinned items kept)');
    };

    const exportItems = () => {
        const toExport = filteredItems.map(({ id, content, type, timestamp, tags, category }) => ({
            content, type, timestamp, tags, category
        }));

        const blob = new Blob([JSON.stringify(toExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clipboard-history-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        success('Exported clipboard history');
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'url': return <Link size={12} />;
            case 'code': return <Code size={12} />;
            case 'json': return <FileText size={12} />;
            case 'email': return <FileText size={12} />;
            case 'html': return <Code size={12} />;
            default: return <FileText size={12} />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'url': return 'bg-blue-500/10 text-blue-400';
            case 'code': return 'bg-purple-500/10 text-purple-400';
            case 'json': return 'bg-green-500/10 text-green-400';
            case 'email': return 'bg-orange-500/10 text-orange-400';
            case 'html': return 'bg-pink-500/10 text-pink-400';
            default: return 'bg-slate-500/10 text-slate-400';
        }
    };

    // Filtered items
    const filteredItems = items.filter(item => {
        if (showPinnedOnly && !item.pinned) return false;
        if (showStarredOnly && !item.starred) return false;
        if (filterType !== 'all' && item.type !== filterType) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return item.content.toLowerCase().includes(query) ||
                   item.tags.some(t => t.toLowerCase().includes(query)) ||
                   item.category?.toLowerCase().includes(query);
        }
        return true;
    });

    // Sort: pinned first, then by timestamp
    const sortedItems = [...filteredItems].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Stats
    const stats: ClipboardStats = {
        totalItems: items.length,
        byType: items.reduce((acc, item) => {
            acc[item.type] = (acc[item.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        recentSources: [...new Set(items.filter(i => i.source).map(i => new URL(i.source!).hostname))].slice(0, 5)
    };

    return (
        <div className="space-y-6">
            {/* Capture Button */}
            <button
                onClick={captureFromClipboard}
                className="btn-primary w-full flex items-center justify-center gap-2"
            >
                <Clipboard size={16} />
                Capture from Clipboard
            </button>

            {/* Search & Filters */}
            <div className="space-y-3">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search clipboard history..."
                        className="w-full pl-9 text-sm"
                    />
                </div>

                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"
                >
                    <Filter size={12} />
                    Filters
                    {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {showFilters && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                            className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1 ${
                                showPinnedOnly ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'
                            }`}
                        >
                            <Pin size={10} /> Pinned
                        </button>
                        <button
                            onClick={() => setShowStarredOnly(!showStarredOnly)}
                            className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1 ${
                                showStarredOnly ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-800 text-slate-400'
                            }`}
                        >
                            <Star size={10} /> Starred
                        </button>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="text-xs bg-slate-800 border border-slate-700 rounded-full px-3 py-1.5"
                        >
                            <option value="all">All Types</option>
                            <option value="text">Text</option>
                            <option value="code">Code</option>
                            <option value="url">URLs</option>
                            <option value="json">JSON</option>
                            <option value="email">Emails</option>
                            <option value="html">HTML</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Stats */}
            {items.length > 0 && (
                <div className="card p-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                        {sortedItems.length} of {stats.totalItems} items
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={categorizeAll}
                            disabled={isCategorizingAll}
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                            {isCategorizingAll ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                            Auto-tag
                        </button>
                        <button onClick={exportItems} className="text-slate-400 hover:text-white flex items-center gap-1">
                            <Download size={10} />
                            Export
                        </button>
                        <button onClick={clearHistory} className="text-red-400 hover:text-red-300 flex items-center gap-1">
                            <Trash2 size={10} />
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* Items List */}
            {sortedItems.length > 0 ? (
                <div className="space-y-2">
                    {sortedItems.map(item => (
                        <div key={item.id} className="card p-3 space-y-2">
                            {/* Header */}
                            <div className="flex items-start gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded ${getTypeColor(item.type)} flex items-center gap-1`}>
                                    {getTypeIcon(item.type)}
                                    {item.type}
                                </span>
                                {item.pinned && <Pin size={12} className="text-blue-400" />}
                                {item.starred && <Star size={12} className="text-yellow-400 fill-current" />}
                                <div className="flex-1" />
                                <span className="text-[10px] text-slate-500">
                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            {/* Content */}
                            <div
                                className="text-xs text-slate-300 bg-slate-800/50 p-2 rounded cursor-pointer"
                                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                            >
                                {expandedId === item.id ? (
                                    <pre className="whitespace-pre-wrap break-all max-h-48 overflow-y-auto font-mono text-[11px]">
                                        {item.content}
                                    </pre>
                                ) : (
                                    <p className="truncate">{item.preview || item.content.slice(0, 100)}</p>
                                )}
                            </div>

                            {/* Tags */}
                            {(item.tags.length > 0 || item.category) && (
                                <div className="flex flex-wrap gap-1">
                                    {item.category && (
                                        <span className="text-[10px] px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded">
                                            {item.category}
                                        </span>
                                    )}
                                    {item.tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="text-[10px] px-2 py-0.5 bg-slate-700 text-slate-300 rounded flex items-center gap-1 group"
                                        >
                                            <Hash size={8} />
                                            {tag}
                                            <button
                                                onClick={() => removeTag(item.id, tag)}
                                                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => copyToClipboard(item)}
                                        className="p-1.5 text-slate-500 hover:text-white rounded hover:bg-slate-800"
                                    >
                                        {copiedId === item.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                    </button>
                                    <button
                                        onClick={() => togglePin(item.id)}
                                        className={`p-1.5 rounded hover:bg-slate-800 ${item.pinned ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        <Pin size={14} />
                                    </button>
                                    <button
                                        onClick={() => toggleStar(item.id)}
                                        className={`p-1.5 rounded hover:bg-slate-800 ${item.starred ? 'text-yellow-400' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        <Star size={14} className={item.starred ? 'fill-current' : ''} />
                                    </button>
                                    <button
                                        onClick={() => categorizeWithAI(item)}
                                        className="p-1.5 text-slate-500 hover:text-purple-400 rounded hover:bg-slate-800"
                                        title="Categorize with AI"
                                    >
                                        <Sparkles size={14} />
                                    </button>
                                    {newTagInput?.id === item.id ? (
                                        <input
                                            type="text"
                                            value={newTagInput.value}
                                            onChange={(e) => setNewTagInput({ ...newTagInput, value: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') addTag(item.id, newTagInput.value);
                                                if (e.key === 'Escape') setNewTagInput(null);
                                            }}
                                            onBlur={() => addTag(item.id, newTagInput.value)}
                                            placeholder="Add tag..."
                                            className="text-[10px] px-2 py-1 bg-slate-800 border border-slate-700 rounded w-20"
                                            autoFocus
                                        />
                                    ) : (
                                        <button
                                            onClick={() => setNewTagInput({ id: item.id, value: '' })}
                                            className="p-1.5 text-slate-500 hover:text-white rounded hover:bg-slate-800"
                                            title="Add tag"
                                        >
                                            <Tag size={14} />
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={() => deleteItem(item.id)}
                                    className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-red-500/10"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {/* Source */}
                            {item.source && (
                                <div className="text-[10px] text-slate-600 truncate">
                                    from: {new URL(item.source).hostname}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-slate-500">
                    <Clipboard size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">
                        {items.length === 0
                            ? 'Click "Capture" to save clipboard content'
                            : 'No items match your filters'}
                    </p>
                </div>
            )}
        </div>
    );
}
