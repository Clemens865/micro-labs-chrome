import React, { useState, useRef, useCallback } from 'react';
import { useGemini } from '../../hooks/useGemini';
import {
    Globe, Play, Square, Download, Loader2, CheckCircle, XCircle,
    FileText, ChevronDown, ChevronUp, Copy, Check, Trash2,
    Settings, AlertTriangle, FolderTree, Clock, Sparkles, Brain,
    ListTree, FileCode, Zap
} from 'lucide-react';

interface CrawledPage {
    url: string;
    title: string;
    rawContent: string;
    smartContent?: string;
    links: string[];
    depth: number;
    status: 'pending' | 'crawling' | 'processing' | 'done' | 'failed';
    error?: string;
    timestamp?: number;
}

interface CrawlStats {
    discovered: number;
    crawled: number;
    processed: number;
    failed: number;
    totalChars: number;
}

type ExtractionMode = 'smart' | 'structured' | 'summary' | 'raw';

const DocsCrawler: React.FC = () => {
    const { generateContent, loading: aiLoading } = useGemini();
    const [baseUrl, setBaseUrl] = useState('');
    const [pathFilter, setPathFilter] = useState('');
    const [maxPages, setMaxPages] = useState(50);
    const [maxDepth, setMaxDepth] = useState(3);
    const [extractionMode, setExtractionMode] = useState<ExtractionMode>('smart');
    const [crawledPages, setCrawledPages] = useState<Map<string, CrawledPage>>(new Map());
    const [queue, setQueue] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
    const [copied, setCopied] = useState<string | null>(null);
    const [stats, setStats] = useState<CrawlStats>({ discovered: 0, crawled: 0, processed: 0, failed: 0, totalChars: 0 });
    const [currentAction, setCurrentAction] = useState<string>('');

    const abortRef = useRef(false);
    const pauseRef = useRef(false);

    // Extraction mode descriptions
    const extractionModes: Record<ExtractionMode, { label: string; description: string; icon: React.ReactNode }> = {
        smart: {
            label: 'Smart Extract',
            description: 'AI extracts key concepts, code examples, and important details',
            icon: <Brain size={14} />
        },
        structured: {
            label: 'Structured',
            description: 'Organized into sections: Overview, Key Points, Code, API Reference',
            icon: <ListTree size={14} />
        },
        summary: {
            label: 'Summary Only',
            description: 'Concise summary of each page (fastest, smallest output)',
            icon: <Zap size={14} />
        },
        raw: {
            label: 'Raw Text',
            description: 'Full text extraction without AI processing',
            icon: <FileCode size={14} />
        }
    };

    // Normalize URL
    const normalizeUrl = (url: string, base: string): string | null => {
        try {
            const parsed = new URL(url, base);
            parsed.hash = '';
            parsed.searchParams.delete('utm_source');
            parsed.searchParams.delete('utm_medium');
            parsed.searchParams.delete('utm_campaign');
            parsed.searchParams.delete('hl');
            let clean = parsed.href;
            if (clean.endsWith('/') && clean !== parsed.origin + '/') {
                clean = clean.slice(0, -1);
            }
            return clean;
        } catch {
            return null;
        }
    };

    // Check if URL should be crawled
    const shouldCrawl = (url: string, baseUrl: string, pathFilter: string): boolean => {
        try {
            const parsed = new URL(url);
            const baseParsed = new URL(baseUrl);

            if (parsed.origin !== baseParsed.origin) return false;

            const basePath = baseParsed.pathname;
            if (!parsed.pathname.startsWith(basePath)) return false;

            if (pathFilter && !parsed.pathname.includes(pathFilter)) return false;

            const skipPatterns = [
                '/api/', '/auth/', '/login', '/logout', '/signup',
                '/search', '/404', '/500', '.pdf', '.zip', '.tar',
                '/cdn-cgi/', '/_next/', '/static/', '/assets/',
                '/samples/', '/quickstarts/', '/codelabs/'
            ];
            if (skipPatterns.some(p => parsed.pathname.toLowerCase().includes(p))) return false;

            const ext = parsed.pathname.split('.').pop()?.toLowerCase();
            if (ext && !['html', 'htm', ''].includes(ext) && ext.length <= 5) return false;

            return true;
        } catch {
            return false;
        }
    };

    // AI-powered smart extraction
    const extractWithAI = async (rawContent: string, pageTitle: string, pageUrl: string, mode: ExtractionMode): Promise<string> => {
        if (mode === 'raw') return rawContent;

        const prompts: Record<Exclude<ExtractionMode, 'raw'>, string> = {
            smart: `Extract the essential documentation content from this page. Focus on:
- Main concepts and explanations
- Code examples (preserve formatting)
- API methods, parameters, and return values
- Important notes, warnings, or tips
- Step-by-step instructions if present

Remove: navigation, footers, breadcrumbs, "Was this helpful?", related links, and repetitive boilerplate.

Page Title: ${pageTitle}
URL: ${pageUrl}

Raw Content:
${rawContent.slice(0, 25000)}

Return clean, well-formatted markdown documentation. Preserve code blocks with proper syntax highlighting hints.`,

            structured: `Parse this documentation page into a structured format:

## Overview
[1-2 sentence summary of what this page covers]

## Key Concepts
[Bullet points of main concepts explained]

## Code Examples
[Any code snippets, properly formatted in code blocks]

## API Reference
[If applicable: methods, parameters, types]

## Important Notes
[Warnings, tips, gotchas]

Page Title: ${pageTitle}
URL: ${pageUrl}

Raw Content:
${rawContent.slice(0, 25000)}

Only include sections that have relevant content. Use proper markdown formatting.`,

            summary: `Summarize this documentation page in 3-5 bullet points. Focus on:
- What this page teaches/explains
- Key takeaways a developer needs to know
- Any important code patterns or methods mentioned

Page Title: ${pageTitle}
URL: ${pageUrl}

Raw Content:
${rawContent.slice(0, 15000)}

Return only the bullet points, be concise.`
        };

        try {
            const result = await generateContent(
                prompts[mode],
                'You are a technical documentation specialist. Extract and format documentation content clearly and accurately. Preserve code examples exactly. Never add information not present in the source.',
                { model: 'gemini-2.0-flash' }
            );
            return typeof result === 'string' ? result : JSON.stringify(result);
        } catch (err) {
            console.error('AI extraction failed:', err);
            return rawContent.slice(0, 10000); // Fallback to truncated raw
        }
    };

    // Extract content and links from a tab
    const extractPageData = async (tabId: number): Promise<{ title: string; content: string; links: string[] }> => {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId },
                func: () => {
                    const title = document.title || '';

                    // Find main content area
                    const contentSelectors = [
                        'article', 'main', '[role="main"]',
                        '.devsite-article-body', '.documentation-content',
                        '.markdown-body', '.content', '#content',
                        '.docs-content', '.page-content', '.post-content'
                    ];

                    let contentEl: HTMLElement | null = null;
                    for (const sel of contentSelectors) {
                        contentEl = document.querySelector(sel);
                        if (contentEl && contentEl.innerText.length > 200) break;
                    }

                    if (!contentEl || contentEl.innerText.length < 200) {
                        contentEl = document.body;
                    }

                    // Clone and clean
                    const clone = contentEl.cloneNode(true) as HTMLElement;

                    // Remove unwanted elements
                    const removeSelectors = [
                        'nav', 'footer', 'header', 'aside',
                        '.sidebar', '.navigation', '.toc', '.table-of-contents',
                        '.breadcrumb', '.breadcrumbs', '.feedback', '.rating',
                        '.share-buttons', '.social-share', '.related-content',
                        '.cookie-banner', '.popup', '.modal', '.ads',
                        'script', 'style', 'noscript', 'iframe',
                        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
                        '.devsite-banner', '.devsite-book-nav', '.devsite-page-rating'
                    ];
                    removeSelectors.forEach(sel => {
                        clone.querySelectorAll(sel).forEach(el => el.remove());
                    });

                    // Get text while preserving some structure
                    const getStructuredText = (el: HTMLElement): string => {
                        let text = '';
                        const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);

                        let node: Node | null;
                        while (node = walker.nextNode()) {
                            if (node.nodeType === Node.TEXT_NODE) {
                                const content = node.textContent?.trim();
                                if (content) text += content + ' ';
                            } else if (node.nodeType === Node.ELEMENT_NODE) {
                                const tag = (node as HTMLElement).tagName.toLowerCase();
                                if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
                                    text += '\n\n## ';
                                } else if (tag === 'p' || tag === 'div') {
                                    text += '\n';
                                } else if (tag === 'li') {
                                    text += '\n- ';
                                } else if (tag === 'pre' || tag === 'code') {
                                    text += '\n```\n';
                                } else if (tag === 'br') {
                                    text += '\n';
                                }
                            }
                        }
                        return text;
                    };

                    let content = clone.innerText
                        .replace(/\s+/g, ' ')
                        .replace(/\n{3,}/g, '\n\n')
                        .trim();

                    // Extract links
                    const links: string[] = [];
                    document.querySelectorAll('a[href]').forEach(a => {
                        const href = (a as HTMLAnchorElement).href;
                        if (href && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('#')) {
                            links.push(href);
                        }
                    });

                    return { title, content, links: [...new Set(links)] };
                }
            });

            return results[0]?.result || { title: '', content: '', links: [] };
        } catch (err) {
            console.error('Extract failed:', err);
            return { title: '', content: '', links: [] };
        }
    };

    // Crawl a single URL
    const crawlUrl = async (url: string, depth: number): Promise<CrawledPage> => {
        const page: CrawledPage = {
            url,
            title: '',
            rawContent: '',
            links: [],
            depth,
            status: 'crawling'
        };

        let tabId: number | null = null;

        try {
            setCurrentAction(`Opening: ${new URL(url).pathname}`);

            const tab = await chrome.tabs.create({ url, active: false });
            tabId = tab.id || null;

            if (!tabId) throw new Error('Failed to create tab');

            // Wait for load
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), 20000);

                const listener = (id: number, info: { status?: string }) => {
                    if (id === tabId && info.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        clearTimeout(timeout);
                        setTimeout(resolve, 1500);
                    }
                };

                chrome.tabs.onUpdated.addListener(listener);
            });

            // Extract
            setCurrentAction(`Extracting: ${new URL(url).pathname}`);
            const data = await extractPageData(tabId);

            page.title = data.title || url;
            page.rawContent = data.content;
            page.links = data.links;
            page.status = 'processing';
            page.timestamp = Date.now();

        } catch (err: any) {
            page.status = 'failed';
            page.error = err.message;
        } finally {
            if (tabId) {
                try { await chrome.tabs.remove(tabId); } catch {}
            }
        }

        return page;
    };

    // Main crawl loop
    const startCrawl = async () => {
        if (!baseUrl.trim()) return;

        abortRef.current = false;
        pauseRef.current = false;
        setIsRunning(true);
        setIsPaused(false);

        const normalizedBase = normalizeUrl(baseUrl, baseUrl);
        if (!normalizedBase) {
            setIsRunning(false);
            return;
        }

        const pages = new Map<string, CrawledPage>();
        const urlQueue: Array<{ url: string; depth: number }> = [{ url: normalizedBase, depth: 0 }];
        const seen = new Set<string>([normalizedBase]);

        setStats({ discovered: 1, crawled: 0, processed: 0, failed: 0, totalChars: 0 });
        setCrawledPages(new Map());
        setQueue([normalizedBase]);

        while (urlQueue.length > 0 && !abortRef.current) {
            while (pauseRef.current && !abortRef.current) {
                await new Promise(r => setTimeout(r, 500));
            }

            if (abortRef.current) break;
            if (pages.size >= maxPages) break;

            const item = urlQueue.shift();
            if (!item) break;

            const { url, depth } = item;
            if (pages.has(url)) continue;

            setQueue(urlQueue.map(q => q.url));

            // Crawl page
            const crawlingPage: CrawledPage = {
                url, title: '', rawContent: '', links: [], depth, status: 'crawling'
            };
            pages.set(url, crawlingPage);
            setCrawledPages(new Map(pages));

            const result = await crawlUrl(url, depth);

            // AI Processing if not failed and not raw mode
            if (result.status === 'processing' && extractionMode !== 'raw') {
                setCurrentAction(`AI processing: ${result.title || new URL(url).pathname}`);
                result.smartContent = await extractWithAI(
                    result.rawContent,
                    result.title,
                    result.url,
                    extractionMode
                );
                result.status = 'done';
            } else if (result.status === 'processing') {
                result.smartContent = result.rawContent;
                result.status = 'done';
            }

            pages.set(url, result);
            setCrawledPages(new Map(pages));

            // Update stats
            const donePages = Array.from(pages.values()).filter(p => p.status === 'done');
            setStats({
                discovered: seen.size,
                crawled: donePages.length + Array.from(pages.values()).filter(p => p.status === 'failed').length,
                processed: donePages.length,
                failed: Array.from(pages.values()).filter(p => p.status === 'failed').length,
                totalChars: donePages.reduce((sum, p) => sum + (p.smartContent?.length || p.rawContent?.length || 0), 0)
            });

            // Discover new links
            if (result.status === 'done' && depth < maxDepth) {
                for (const link of result.links) {
                    const normalized = normalizeUrl(link, url);
                    if (!normalized) continue;
                    if (seen.has(normalized)) continue;
                    if (!shouldCrawl(normalized, normalizedBase, pathFilter)) continue;

                    seen.add(normalized);
                    urlQueue.push({ url: normalized, depth: depth + 1 });
                    setStats(s => ({ ...s, discovered: seen.size }));
                }
            }

            await new Promise(r => setTimeout(r, 300));
        }

        setIsRunning(false);
        setQueue([]);
        setCurrentAction('');
    };

    const stopCrawl = () => {
        abortRef.current = true;
        setIsRunning(false);
        setIsPaused(false);
    };

    const togglePause = () => {
        pauseRef.current = !pauseRef.current;
        setIsPaused(!isPaused);
    };

    const toggleExpanded = (url: string) => {
        setExpandedPages(prev => {
            const next = new Set(prev);
            if (next.has(url)) next.delete(url);
            else next.add(url);
            return next;
        });
    };

    const copyContent = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    // Export to Markdown
    const exportToMarkdown = () => {
        const pages = Array.from(crawledPages.values())
            .filter(p => p.status === 'done')
            .sort((a, b) => a.depth - b.depth || a.url.localeCompare(b.url));

        if (pages.length === 0) return;

        const domain = new URL(baseUrl).hostname;
        let markdown = `# ${domain} Documentation\n\n`;
        markdown += `**Source:** ${baseUrl}\n`;
        markdown += `**Exported:** ${new Date().toLocaleString()}\n`;
        markdown += `**Pages:** ${pages.length}\n`;
        markdown += `**Extraction Mode:** ${extractionModes[extractionMode].label}\n\n`;

        markdown += `---\n\n## Table of Contents\n\n`;
        pages.forEach((page, idx) => {
            const indent = '  '.repeat(page.depth);
            markdown += `${indent}- [${page.title || 'Untitled'}](#page-${idx})\n`;
        });

        markdown += '\n---\n\n';

        pages.forEach((page, idx) => {
            markdown += `<a id="page-${idx}"></a>\n\n`;
            markdown += `# ${page.title || 'Untitled'}\n\n`;
            markdown += `> **Source:** [${page.url}](${page.url})\n\n`;
            markdown += `${page.smartContent || page.rawContent}\n\n`;
            markdown += `---\n\n`;
        });

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${domain.replace(/\./g, '-')}-docs-${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Export to JSON
    const exportToJson = () => {
        const pages = Array.from(crawledPages.values()).filter(p => p.status === 'done');

        const data = {
            source: baseUrl,
            exported: new Date().toISOString(),
            extractionMode,
            pageCount: pages.length,
            pages: pages.map(p => ({
                url: p.url,
                title: p.title,
                content: p.smartContent || p.rawContent,
                depth: p.depth
            }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const domain = new URL(baseUrl).hostname.replace(/\./g, '-');
        a.download = `${domain}-docs-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const clearResults = () => {
        setCrawledPages(new Map());
        setQueue([]);
        setStats({ discovered: 0, crawled: 0, processed: 0, failed: 0, totalChars: 0 });
    };

    const pagesArray = Array.from(crawledPages.values());
    const completedPages = pagesArray.filter(p => p.status === 'done');

    return (
        <div className="space-y-4">
            {/* Header */}
            <div style={{
                padding: '16px',
                backgroundColor: 'hsl(222 47% 11%)',
                borderRadius: '14px',
                border: '1px solid hsl(222 47% 18%)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, hsl(262 83% 58%) 0%, hsl(280 83% 45%) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <FolderTree size={22} style={{ color: 'white' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(210 40% 98%)' }}>
                            Smart Docs Crawler
                        </h3>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 55%)', marginTop: '2px' }}>
                            AI-powered documentation extraction
                        </p>
                    </div>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        style={{
                            padding: '8px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: showSettings ? 'hsl(262 83% 58%)' : 'hsl(222 47% 16%)',
                            color: showSettings ? 'white' : 'hsl(215 20% 65%)',
                            cursor: 'pointer'
                        }}
                    >
                        <Settings size={16} />
                    </button>
                </div>

                {/* URL Input */}
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', marginBottom: '4px', display: 'block' }}>
                        Documentation URL
                    </label>
                    <div style={{ position: 'relative' }}>
                        <Globe size={14} style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'hsl(262 83% 58%)'
                        }} />
                        <input
                            type="url"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder="https://ai.google.dev/gemini-api/docs"
                            disabled={isRunning}
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 36px',
                                backgroundColor: 'hsl(222 47% 8%)',
                                border: '1px solid hsl(222 47% 18%)',
                                borderRadius: '8px',
                                color: 'hsl(210 40% 98%)',
                                fontSize: '13px',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>

                {/* Extraction Mode Selector */}
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', marginBottom: '6px', display: 'block' }}>
                        Extraction Mode
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        {(Object.entries(extractionModes) as [ExtractionMode, typeof extractionModes[ExtractionMode]][]).map(([mode, config]) => (
                            <button
                                key={mode}
                                onClick={() => setExtractionMode(mode)}
                                disabled={isRunning}
                                style={{
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: extractionMode === mode
                                        ? '2px solid hsl(262 83% 58%)'
                                        : '1px solid hsl(222 47% 18%)',
                                    backgroundColor: extractionMode === mode
                                        ? 'hsl(262 83% 58% / 0.15)'
                                        : 'hsl(222 47% 8%)',
                                    cursor: isRunning ? 'not-allowed' : 'pointer',
                                    textAlign: 'left',
                                    opacity: isRunning ? 0.5 : 1
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <span style={{ color: extractionMode === mode ? 'hsl(262 83% 65%)' : 'hsl(215 20% 55%)' }}>
                                        {config.icon}
                                    </span>
                                    <span style={{
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: extractionMode === mode ? 'hsl(262 83% 75%)' : 'hsl(210 40% 98%)'
                                    }}>
                                        {config.label}
                                    </span>
                                </div>
                                <p style={{ fontSize: '10px', color: 'hsl(215 20% 50%)', lineHeight: 1.4 }}>
                                    {config.description}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div style={{
                        padding: '12px',
                        backgroundColor: 'hsl(222 47% 8%)',
                        borderRadius: '8px',
                        marginBottom: '12px'
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', marginBottom: '4px', display: 'block' }}>
                                    Max Pages
                                </label>
                                <select
                                    value={maxPages}
                                    onChange={(e) => setMaxPages(Number(e.target.value))}
                                    disabled={isRunning}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        backgroundColor: 'hsl(222 47% 11%)',
                                        border: '1px solid hsl(222 47% 18%)',
                                        borderRadius: '6px',
                                        color: 'hsl(210 40% 98%)',
                                        fontSize: '12px'
                                    }}
                                >
                                    <option value={10}>10 pages</option>
                                    <option value={25}>25 pages</option>
                                    <option value={50}>50 pages</option>
                                    <option value={100}>100 pages</option>
                                    <option value={200}>200 pages</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', marginBottom: '4px', display: 'block' }}>
                                    Max Depth
                                </label>
                                <select
                                    value={maxDepth}
                                    onChange={(e) => setMaxDepth(Number(e.target.value))}
                                    disabled={isRunning}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        backgroundColor: 'hsl(222 47% 11%)',
                                        border: '1px solid hsl(222 47% 18%)',
                                        borderRadius: '6px',
                                        color: 'hsl(210 40% 98%)',
                                        fontSize: '12px'
                                    }}
                                >
                                    <option value={1}>1 level</option>
                                    <option value={2}>2 levels</option>
                                    <option value={3}>3 levels</option>
                                    <option value={5}>5 levels</option>
                                    <option value={10}>10 levels</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ marginTop: '12px' }}>
                            <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', marginBottom: '4px', display: 'block' }}>
                                Path Filter (optional)
                            </label>
                            <input
                                type="text"
                                value={pathFilter}
                                onChange={(e) => setPathFilter(e.target.value)}
                                placeholder="e.g., /docs/ or /api/"
                                disabled={isRunning}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    backgroundColor: 'hsl(222 47% 11%)',
                                    border: '1px solid hsl(222 47% 18%)',
                                    borderRadius: '6px',
                                    color: 'hsl(210 40% 98%)',
                                    fontSize: '12px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    {!isRunning ? (
                        <button
                            onClick={startCrawl}
                            disabled={!baseUrl.trim()}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '10px',
                                border: 'none',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                background: 'linear-gradient(135deg, hsl(262 83% 58%) 0%, hsl(280 83% 45%) 100%)',
                                color: 'white',
                                opacity: !baseUrl.trim() ? 0.5 : 1
                            }}
                        >
                            <Sparkles size={16} />
                            Start Smart Crawl
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={togglePause}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    backgroundColor: isPaused ? 'hsl(142 71% 45%)' : 'hsl(45 93% 47%)',
                                    color: 'black'
                                }}
                            >
                                {isPaused ? <Play size={16} /> : <Clock size={16} />}
                                {isPaused ? 'Resume' : 'Pause'}
                            </button>
                            <button
                                onClick={stopCrawl}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: 'hsl(0 84% 60%)',
                                    color: 'white'
                                }}
                            >
                                <Square size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Stats */}
            {(isRunning || pagesArray.length > 0) && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px'
                }}>
                    {[
                        { label: 'Found', value: stats.discovered, color: 'hsl(217 91% 60%)' },
                        { label: 'Processed', value: stats.processed, color: 'hsl(142 71% 45%)' },
                        { label: 'Failed', value: stats.failed, color: 'hsl(0 84% 60%)' },
                        { label: 'Output', value: `${Math.round(stats.totalChars / 1000)}k`, color: 'hsl(262 83% 58%)' }
                    ].map(stat => (
                        <div key={stat.label} style={{
                            padding: '12px',
                            backgroundColor: 'hsl(222 47% 11%)',
                            borderRadius: '10px',
                            textAlign: 'center',
                            border: '1px solid hsl(222 47% 18%)'
                        }}>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: stat.color }}>
                                {stat.value}
                            </div>
                            <div style={{ fontSize: '10px', color: 'hsl(215 20% 55%)', marginTop: '2px' }}>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Progress */}
            {isRunning && (
                <div style={{
                    padding: '12px',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '12px',
                    border: '1px solid hsl(222 47% 18%)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Loader2 className="animate-spin" size={14} style={{ color: 'hsl(262 83% 58%)' }} />
                        <span style={{ fontSize: '12px', color: 'hsl(210 40% 98%)', flex: 1 }}>
                            {currentAction || (isPaused ? 'Paused' : 'Crawling...')}
                        </span>
                        <span style={{ fontSize: '11px', color: 'hsl(215 20% 50%)' }}>
                            {queue.length} queued
                        </span>
                    </div>
                    <div style={{
                        height: '6px',
                        backgroundColor: 'hsl(222 47% 18%)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${Math.min((stats.processed / maxPages) * 100, 100)}%`,
                            background: 'linear-gradient(90deg, hsl(262 83% 58%), hsl(142 71% 45%))',
                            transition: 'width 0.3s'
                        }} />
                    </div>
                </div>
            )}

            {/* Export Buttons */}
            {completedPages.length > 0 && !isRunning && (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={exportToMarkdown}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '10px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            backgroundColor: 'hsl(142 71% 45%)',
                            color: 'white'
                        }}
                    >
                        <Download size={14} />
                        Export Markdown
                    </button>
                    <button
                        onClick={exportToJson}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '10px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            backgroundColor: 'hsl(222 47% 16%)',
                            color: 'hsl(215 20% 80%)'
                        }}
                    >
                        <FileText size={14} />
                        Export JSON
                    </button>
                    <button
                        onClick={clearResults}
                        style={{
                            padding: '12px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: 'hsl(0 84% 60% / 0.2)',
                            color: 'hsl(0 84% 65%)'
                        }}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}

            {/* Pages List */}
            {pagesArray.length > 0 && (
                <div style={{
                    padding: '12px',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '12px',
                    border: '1px solid hsl(222 47% 18%)',
                    maxHeight: '400px',
                    overflowY: 'auto'
                }}>
                    <div style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'hsl(215 20% 55%)',
                        marginBottom: '10px',
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <Brain size={12} />
                        Processed Pages ({completedPages.length})
                    </div>

                    <div className="space-y-2">
                        {pagesArray.map(page => (
                            <div key={page.url} style={{
                                padding: '10px 12px',
                                backgroundColor: 'hsl(222 47% 8%)',
                                borderRadius: '8px',
                                borderLeft: `3px solid ${
                                    page.status === 'done' ? 'hsl(142 71% 45%)' :
                                    page.status === 'failed' ? 'hsl(0 84% 60%)' :
                                    page.status === 'processing' ? 'hsl(262 83% 58%)' :
                                    page.status === 'crawling' ? 'hsl(217 91% 60%)' :
                                    'hsl(215 20% 30%)'
                                }`
                            }}>
                                <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: page.status === 'done' ? 'pointer' : 'default' }}
                                    onClick={() => page.status === 'done' && toggleExpanded(page.url)}
                                >
                                    {page.status === 'crawling' ? (
                                        <Loader2 className="animate-spin" size={14} style={{ color: 'hsl(217 91% 60%)' }} />
                                    ) : page.status === 'processing' ? (
                                        <Brain className="animate-pulse" size={14} style={{ color: 'hsl(262 83% 58%)' }} />
                                    ) : page.status === 'done' ? (
                                        <CheckCircle size={14} style={{ color: 'hsl(142 71% 45%)' }} />
                                    ) : page.status === 'failed' ? (
                                        <XCircle size={14} style={{ color: 'hsl(0 84% 60%)' }} />
                                    ) : (
                                        <Clock size={14} style={{ color: 'hsl(215 20% 50%)' }} />
                                    )}

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            fontSize: '11px',
                                            color: 'hsl(210 40% 98%)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {page.title || page.url}
                                        </p>
                                        {page.status === 'processing' && (
                                            <p style={{ fontSize: '10px', color: 'hsl(262 83% 65%)' }}>
                                                AI extracting key content...
                                            </p>
                                        )}
                                    </div>

                                    <span style={{
                                        fontSize: '10px',
                                        color: 'hsl(215 20% 45%)',
                                        padding: '2px 6px',
                                        backgroundColor: 'hsl(222 47% 16%)',
                                        borderRadius: '4px'
                                    }}>
                                        D{page.depth}
                                    </span>

                                    {page.status === 'done' && (
                                        expandedPages.has(page.url) ?
                                            <ChevronUp size={14} style={{ color: 'hsl(215 20% 55%)' }} /> :
                                            <ChevronDown size={14} style={{ color: 'hsl(215 20% 55%)' }} />
                                    )}
                                </div>

                                {page.error && (
                                    <p style={{ fontSize: '10px', color: 'hsl(0 84% 60%)', marginTop: '4px' }}>
                                        {page.error}
                                    </p>
                                )}

                                {expandedPages.has(page.url) && page.smartContent && (
                                    <div style={{
                                        marginTop: '10px',
                                        paddingTop: '10px',
                                        borderTop: '1px solid hsl(222 47% 18%)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '10px', color: 'hsl(215 20% 50%)' }}>
                                                {page.smartContent.length.toLocaleString()} chars (from {page.rawContent.length.toLocaleString()})
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    copyContent(page.smartContent!, page.url);
                                                }}
                                                style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    border: 'none',
                                                    fontSize: '10px',
                                                    cursor: 'pointer',
                                                    backgroundColor: 'hsl(222 47% 16%)',
                                                    color: 'hsl(215 20% 65%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                {copied === page.url ? <Check size={10} /> : <Copy size={10} />}
                                                {copied === page.url ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>
                                        <pre style={{
                                            fontSize: '10px',
                                            color: 'hsl(215 20% 70%)',
                                            backgroundColor: 'hsl(222 47% 6%)',
                                            padding: '8px',
                                            borderRadius: '6px',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word'
                                        }}>
                                            {page.smartContent.slice(0, 3000)}{page.smartContent.length > 3000 ? '...' : ''}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {pagesArray.length === 0 && !isRunning && (
                <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(222 47% 18%)'
                }}>
                    <Brain size={40} style={{ color: 'hsl(215 20% 30%)', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '13px', color: 'hsl(215 20% 55%)', marginBottom: '6px' }}>
                        Smart Documentation Crawler
                    </p>
                    <p style={{ fontSize: '11px', color: 'hsl(215 20% 45%)', maxWidth: '280px', margin: '0 auto' }}>
                        AI extracts key concepts, code examples, and important details - not raw HTML dumps
                    </p>
                </div>
            )}

            {/* Info */}
            <div style={{
                padding: '12px',
                backgroundColor: 'hsl(262 83% 58% / 0.1)',
                borderRadius: '10px',
                border: '1px solid hsl(262 83% 58% / 0.3)'
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <Sparkles size={14} style={{ color: 'hsl(262 83% 65%)', marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ fontSize: '11px', color: 'hsl(262 83% 80%)', lineHeight: 1.5 }}>
                        <strong>Smart Extraction:</strong> Each page is processed by AI to extract relevant documentation content,
                        code examples, and key concepts - filtering out navigation, ads, and boilerplate.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocsCrawler;
