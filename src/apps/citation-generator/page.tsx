import React, { useState } from 'react';
import { usePageContext } from '../../hooks/usePageContext';
import {
    BookOpen,
    Loader2,
    Copy,
    Check,
    RefreshCw,
    Calendar,
    User,
    Globe,
    FileText,
    ChevronDown
} from 'lucide-react';

type CitationStyle = 'apa7' | 'mla9' | 'chicago' | 'harvard' | 'ieee';

interface PageMetadata {
    title: string;
    author: string | null;
    publishDate: string | null;
    accessDate: string;
    url: string;
    siteName: string | null;
    publisher: string | null;
    doi: string | null;
    pageType: 'article' | 'webpage' | 'blog' | 'news' | 'academic';
}

const CitationGenerator: React.FC = () => {
    const { context } = usePageContext();
    const [metadata, setMetadata] = useState<PageMetadata | null>(null);
    const [citations, setCitations] = useState<Record<CitationStyle, string>>({} as any);
    const [selectedStyle, setSelectedStyle] = useState<CitationStyle>('apa7');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [showStyleDropdown, setShowStyleDropdown] = useState(false);

    const styles: { id: CitationStyle; name: string; org: string }[] = [
        { id: 'apa7', name: 'APA 7th Edition', org: 'American Psychological Association' },
        { id: 'mla9', name: 'MLA 9th Edition', org: 'Modern Language Association' },
        { id: 'chicago', name: 'Chicago 17th', org: 'Chicago Manual of Style' },
        { id: 'harvard', name: 'Harvard', org: 'Author-Date System' },
        { id: 'ieee', name: 'IEEE', org: 'Institute of Electrical and Electronics Engineers' }
    ];

    const extractMetadata = async (): Promise<PageMetadata> => {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];
                if (!tab?.id) {
                    resolve(defaultMetadata());
                    return;
                }

                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        const getMeta = (selectors: string[]): string | null => {
                            for (const sel of selectors) {
                                const el = document.querySelector(sel);
                                if (el) {
                                    const content = el.getAttribute('content') || el.textContent;
                                    if (content?.trim()) return content.trim();
                                }
                            }
                            return null;
                        };

                        // Title
                        const title = getMeta([
                            'meta[property="og:title"]',
                            'meta[name="twitter:title"]',
                            'h1',
                            'title'
                        ]) || document.title;

                        // Author
                        const author = getMeta([
                            'meta[name="author"]',
                            'meta[property="article:author"]',
                            '[rel="author"]',
                            '[itemprop="author"]',
                            '.author',
                            '.byline',
                            '[class*="author"]'
                        ]);

                        // Publish date
                        const publishDate = getMeta([
                            'meta[property="article:published_time"]',
                            'meta[name="date"]',
                            'meta[name="pubdate"]',
                            'time[datetime]',
                            '[itemprop="datePublished"]',
                            '.date',
                            '.published'
                        ]);

                        // Site name
                        const siteName = getMeta([
                            'meta[property="og:site_name"]',
                            'meta[name="application-name"]'
                        ]) || new URL(window.location.href).hostname.replace('www.', '');

                        // Publisher
                        const publisher = getMeta([
                            '[itemprop="publisher"]',
                            'meta[property="article:publisher"]'
                        ]);

                        // DOI
                        const doi = getMeta([
                            'meta[name="citation_doi"]',
                            'meta[name="dc.identifier"]',
                            '[class*="doi"]'
                        ]);

                        // Determine page type
                        let pageType: string = 'webpage';
                        const url = window.location.href;
                        if (url.includes('/blog/') || document.querySelector('[class*="blog"]')) {
                            pageType = 'blog';
                        } else if (url.includes('/news/') || document.querySelector('[class*="news"], article.news')) {
                            pageType = 'news';
                        } else if (doi || url.includes('doi.org') || url.includes('/article/') || url.includes('journal')) {
                            pageType = 'academic';
                        } else if (document.querySelector('article') || getMeta(['meta[property="og:type"]']) === 'article') {
                            pageType = 'article';
                        }

                        return {
                            title: title.replace(/\s*[-|–]\s*.*$/, '').trim(), // Remove site name from title
                            author: author?.replace(/^by\s+/i, '').trim() || null,
                            publishDate,
                            accessDate: new Date().toISOString().split('T')[0],
                            url: window.location.href,
                            siteName,
                            publisher,
                            doi,
                            pageType: pageType as 'article' | 'webpage' | 'blog' | 'news' | 'academic'
                        };
                    }
                }, (results) => {
                    if (results?.[0]?.result) {
                        resolve(results[0].result);
                    } else {
                        resolve(defaultMetadata());
                    }
                });
            });
        });
    };

    const defaultMetadata = (): PageMetadata => ({
        title: context?.title || 'Untitled',
        author: null,
        publishDate: null,
        accessDate: new Date().toISOString().split('T')[0],
        url: context?.url || '',
        siteName: context?.url ? new URL(context.url).hostname.replace('www.', '') : null,
        publisher: null,
        doi: null,
        pageType: 'webpage'
    });

    const formatDate = (dateStr: string | null, style: CitationStyle): string => {
        if (!dateStr) return 'n.d.';

        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;

            const months = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            const monthsShort = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June',
                'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];

            switch (style) {
                case 'apa7':
                    return `${date.getFullYear()}, ${months[date.getMonth()]} ${date.getDate()}`;
                case 'mla9':
                    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
                case 'chicago':
                    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
                case 'harvard':
                    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
                case 'ieee':
                    return `${monthsShort[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
                default:
                    return dateStr;
            }
        } catch {
            return dateStr || 'n.d.';
        }
    };

    const formatAuthor = (author: string | null, style: CitationStyle): string => {
        if (!author) {
            return style === 'ieee' ? '' : '';
        }

        // Try to parse "First Last" or "Last, First" format
        const parts = author.includes(',')
            ? author.split(',').map(s => s.trim()).reverse()
            : author.split(' ');

        if (parts.length < 2) {
            return author; // Return as-is if can't parse
        }

        const firstName = parts.slice(0, -1).join(' ');
        const lastName = parts[parts.length - 1];

        switch (style) {
            case 'apa7':
                return `${lastName}, ${firstName.charAt(0)}.`;
            case 'mla9':
                return `${lastName}, ${firstName}`;
            case 'chicago':
                return `${lastName}, ${firstName}`;
            case 'harvard':
                return `${lastName}, ${firstName.charAt(0)}.`;
            case 'ieee':
                return `${firstName.charAt(0)}. ${lastName}`;
            default:
                return author;
        }
    };

    const generateCitations = (meta: PageMetadata): Record<CitationStyle, string> => {
        const author = meta.author;
        const hasAuthor = !!author;
        const pubDate = meta.publishDate;
        const accessDate = meta.accessDate;

        // APA 7th Edition
        const apa7 = hasAuthor
            ? `${formatAuthor(author, 'apa7')} (${pubDate ? new Date(pubDate).getFullYear() : 'n.d.'}). ${meta.title}. ${meta.siteName}. Retrieved ${formatDate(accessDate, 'apa7')}, from ${meta.url}`
            : `${meta.title}. (${pubDate ? new Date(pubDate).getFullYear() : 'n.d.'}). ${meta.siteName}. Retrieved ${formatDate(accessDate, 'apa7')}, from ${meta.url}`;

        // MLA 9th Edition
        const mla9 = hasAuthor
            ? `${formatAuthor(author, 'mla9')}. "${meta.title}." *${meta.siteName}*, ${pubDate ? formatDate(pubDate, 'mla9') : 'n.d.'}, ${meta.url}. Accessed ${formatDate(accessDate, 'mla9')}.`
            : `"${meta.title}." *${meta.siteName}*, ${pubDate ? formatDate(pubDate, 'mla9') : 'n.d.'}, ${meta.url}. Accessed ${formatDate(accessDate, 'mla9')}.`;

        // Chicago 17th
        const chicago = hasAuthor
            ? `${formatAuthor(author, 'chicago')}. "${meta.title}." ${meta.siteName}. ${pubDate ? formatDate(pubDate, 'chicago') : 'n.d.'}. ${meta.url}.`
            : `"${meta.title}." ${meta.siteName}. ${pubDate ? formatDate(pubDate, 'chicago') : 'n.d.'}. ${meta.url}.`;

        // Harvard
        const harvard = hasAuthor
            ? `${formatAuthor(author, 'harvard')} (${pubDate ? new Date(pubDate).getFullYear() : 'n.d.'}) '${meta.title}', *${meta.siteName}*. Available at: ${meta.url} (Accessed: ${formatDate(accessDate, 'harvard')}).`
            : `${meta.siteName} (${pubDate ? new Date(pubDate).getFullYear() : 'n.d.'}) '${meta.title}'. Available at: ${meta.url} (Accessed: ${formatDate(accessDate, 'harvard')}).`;

        // IEEE
        const ieee = hasAuthor
            ? `${formatAuthor(author, 'ieee')}, "${meta.title}," *${meta.siteName}*, ${pubDate ? formatDate(pubDate, 'ieee') : 'n.d.'}. [Online]. Available: ${meta.url}. [Accessed: ${formatDate(accessDate, 'ieee')}].`
            : `"${meta.title}," *${meta.siteName}*, ${pubDate ? formatDate(pubDate, 'ieee') : 'n.d.'}. [Online]. Available: ${meta.url}. [Accessed: ${formatDate(accessDate, 'ieee')}].`;

        return { apa7, mla9, chicago, harvard, ieee };
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const meta = await extractMetadata();
            setMetadata(meta);
            const cites = generateCitations(meta);
            setCitations(cites);
        } catch (err) {
            console.error('Citation generation error:', err);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string, style: string) => {
        // Convert markdown-style italics to plain text for clipboard
        const plainText = text.replace(/\*/g, '');
        navigator.clipboard.writeText(plainText);
        setCopied(style);
        setTimeout(() => setCopied(null), 2000);
    };

    const renderCitation = (text: string) => {
        // Convert *text* to italic spans
        const parts = text.split(/(\*[^*]+\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={i}>{part.slice(1, -1)}</em>;
            }
            return part;
        });
    };

    const reset = () => {
        setMetadata(null);
        setCitations({} as any);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/20">
                    <BookOpen size={28} className="text-white" />
                </div>
                <h2 className="text-lg font-bold">Citation Generator</h2>
                <p className="text-xs text-slate-400 mt-1">APA, MLA, Chicago, Harvard & IEEE</p>
            </div>

            {/* Current Page */}
            {context?.url && (
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <p className="text-xs text-slate-400 truncate">{context.url}</p>
                    <p className="text-sm text-slate-200 font-medium truncate mt-1">{context.title}</p>
                </div>
            )}

            {/* Generate Button */}
            {!metadata && (
                <button
                    onClick={handleGenerate}
                    disabled={loading || !context?.url}
                    className="btn-primary w-full flex items-center justify-center gap-2 !bg-gradient-to-r !from-amber-600 !to-orange-600"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            Generating...
                        </>
                    ) : (
                        <>
                            <BookOpen size={18} />
                            Generate Citations
                        </>
                    )}
                </button>
            )}

            {/* Results */}
            {metadata && Object.keys(citations).length > 0 && (
                <div className="space-y-6 animate-in">
                    {/* Detected Metadata */}
                    <div className="space-y-2">
                        <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Detected Information</h3>
                        <div className="p-4 bg-slate-800/50 rounded-xl space-y-3 border border-slate-700/50">
                            <div className="flex items-start gap-3">
                                <FileText size={14} className="text-slate-500 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-500">Title</p>
                                    <p className="text-sm text-slate-200">{metadata.title}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <User size={14} className="text-slate-500 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-500">Author</p>
                                    <p className="text-sm text-slate-200">{metadata.author || 'Not found'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar size={14} className="text-slate-500 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-500">Published</p>
                                    <p className="text-sm text-slate-200">{metadata.publishDate ? formatDate(metadata.publishDate, 'chicago') : 'Not found'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Globe size={14} className="text-slate-500 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-500">Site</p>
                                    <p className="text-sm text-slate-200">{metadata.siteName}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Style Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                            className="w-full p-3 rounded-xl flex items-center justify-between border border-slate-700/50"
                            style={{
                                backgroundColor: 'hsl(222 47% 11%)',
                                color: 'hsl(210 40% 98%)'
                            }}
                        >
                            <div>
                                <p className="text-sm font-medium text-slate-200">{styles.find(s => s.id === selectedStyle)?.name}</p>
                                <p className="text-xs text-slate-500">{styles.find(s => s.id === selectedStyle)?.org}</p>
                            </div>
                            <ChevronDown size={18} className={`text-slate-400 transition-transform ${showStyleDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showStyleDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-slate-700 overflow-hidden z-10"
                                style={{ backgroundColor: 'hsl(222 47% 11%)' }}
                            >
                                {styles.map(style => (
                                    <button
                                        key={style.id}
                                        onClick={() => {
                                            setSelectedStyle(style.id);
                                            setShowStyleDropdown(false);
                                        }}
                                        className={`w-full p-3 text-left transition-colors ${selectedStyle === style.id ? 'bg-slate-700/50' : ''}`}
                                        style={{
                                            backgroundColor: selectedStyle === style.id ? 'hsl(222 47% 15%)' : 'transparent',
                                            color: 'hsl(210 40% 98%)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (selectedStyle !== style.id) {
                                                e.currentTarget.style.backgroundColor = 'hsl(222 47% 15%)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedStyle !== style.id) {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        <p className="text-sm font-medium text-slate-200">{style.name}</p>
                                        <p className="text-xs text-slate-500">{style.org}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Citation Output */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Citation</h3>
                            <button
                                onClick={() => copyToClipboard(citations[selectedStyle], selectedStyle)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                                style={{
                                    backgroundColor: 'hsl(222 47% 11%)',
                                    border: '1px solid hsl(222 47% 18% / 0.5)',
                                    color: 'hsl(210 40% 98%)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'hsl(222 47% 15%)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'hsl(222 47% 11%)';
                                }}
                            >
                                {copied === selectedStyle ? (
                                    <>
                                        <Check size={12} className="text-green-400" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={12} />
                                        Copy
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                            <p className="text-sm text-slate-200 leading-relaxed">
                                {renderCitation(citations[selectedStyle])}
                            </p>
                        </div>
                    </div>

                    {/* All Styles Quick Copy */}
                    <div className="space-y-2">
                        <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Quick Copy All Styles</h3>
                        <div className="grid gap-2">
                            {styles.map(style => (
                                <button
                                    key={style.id}
                                    onClick={() => copyToClipboard(citations[style.id], style.id)}
                                    className="flex items-center justify-between p-3 rounded-xl transition-colors border border-slate-700/50"
                                    style={{
                                        backgroundColor: 'hsl(222 47% 11%)',
                                        color: 'hsl(210 40% 98%)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'hsl(222 47% 15%)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'hsl(222 47% 11%)';
                                    }}
                                >
                                    <span className="text-sm text-slate-200">{style.name}</span>
                                    {copied === style.id ? (
                                        <Check size={14} className="text-green-400" />
                                    ) : (
                                        <Copy size={14} className="text-slate-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reset */}
                    <button
                        onClick={reset}
                        className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={14} />
                        Generate Again
                    </button>
                </div>
            )}
        </div>
    );
};

export default CitationGenerator;
