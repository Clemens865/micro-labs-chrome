import { useState, useEffect, useCallback } from 'react';

export interface PageMeta {
    title?: string;
    description?: string;
    author?: string;
    publishedDate?: string;
    modifiedDate?: string;
    keywords?: string;
    language?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogType?: string;
    ogSiteName?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    canonicalUrl?: string;
}

export interface PageStats {
    wordCount?: number;
    readingTimeMinutes?: number;
    hasImages?: boolean;
    imageCount?: number;
    hasVideo?: boolean;
    linkCount?: number;
}

export type SiteType =
    | 'video'
    | 'social'
    | 'forum'
    | 'ecommerce'
    | 'documentation'
    | 'code'
    | 'qa'
    | 'article'
    | 'email'
    | 'search'
    | 'pdf'
    | 'webpage'
    | 'restricted'
    | 'unknown';

export interface PageContext {
    id?: number;
    url?: string;
    title?: string;
    domain?: string;
    isYouTube?: boolean;
    selection?: string;
    content?: string;
    html?: string;
    isRestricted?: boolean;
    siteType?: SiteType;
    meta?: PageMeta;
    stats?: PageStats;
    structuredData?: any;
}

// App suggestions based on site type
export interface AppSuggestion {
    id: string;
    reason: string;
    priority: number; // 1 = highest
}

const getSuggestedApps = (context: PageContext | null): AppSuggestion[] => {
    if (!context) return [];

    const suggestions: AppSuggestion[] = [];
    const siteType = context.siteType || 'webpage';

    // Universal suggestions for pages with content
    if (context.content && context.content.length > 100) {
        suggestions.push({ id: 'tldr-summary', reason: 'Summarize this page', priority: 2 });
        suggestions.push({ id: 'bullet-pointer', reason: 'Extract key points', priority: 3 });
    }

    // Site-type specific suggestions
    switch (siteType) {
        case 'video':
            suggestions.unshift({ id: 'youtube', reason: 'Summarize this video', priority: 1 });
            break;

        case 'article':
            suggestions.unshift({ id: 'digest', reason: 'Deep analysis of article', priority: 1 });
            suggestions.push({ id: 'fact-check-pro', reason: 'Verify claims', priority: 3 });
            suggestions.push({ id: 'glossary-generator', reason: 'Extract key terms', priority: 4 });
            if (context.meta?.author) {
                suggestions.push({ id: 'chat', reason: `Ask questions about this article`, priority: 2 });
            }
            break;

        case 'ecommerce':
            suggestions.unshift({ id: 'sentiment-pulse', reason: 'Analyze product reviews', priority: 1 });
            suggestions.push({ id: 'schema-markup', reason: 'Generate Product schema', priority: 3 });
            break;

        case 'documentation':
        case 'code':
            suggestions.unshift({ id: 'chat', reason: 'Ask about this documentation', priority: 1 });
            suggestions.push({ id: 'eli5-explainer', reason: 'Simplify technical content', priority: 2 });
            suggestions.push({ id: 'glossary-generator', reason: 'Define technical terms', priority: 3 });
            suggestions.push({ id: 'code-morph', reason: 'Convert code examples', priority: 4 });
            break;

        case 'qa':
            suggestions.unshift({ id: 'chat', reason: 'Explore this Q&A', priority: 1 });
            suggestions.push({ id: 'tldr-summary', reason: 'Summarize the answer', priority: 2 });
            break;

        case 'social':
        case 'forum':
            suggestions.unshift({ id: 'sentiment-pulse', reason: 'Analyze sentiment', priority: 1 });
            suggestions.push({ id: 'social-viral', reason: 'Create engaging response', priority: 2 });
            suggestions.push({ id: 'reply-suggester', reason: 'Generate reply options', priority: 3 });
            break;

        case 'email':
            suggestions.unshift({ id: 'reply-suggester', reason: 'Draft email replies', priority: 1 });
            suggestions.push({ id: 'email', reason: 'Compose new email', priority: 2 });
            suggestions.push({ id: 'tone-rewriter', reason: 'Adjust email tone', priority: 3 });
            break;

        case 'search':
            suggestions.unshift({ id: 'seo-architect', reason: 'Analyze search results', priority: 1 });
            break;

        case 'pdf':
            suggestions.unshift({ id: 'digest', reason: 'Analyze this PDF', priority: 1 });
            suggestions.push({ id: 'chat', reason: 'Ask questions about the PDF', priority: 2 });
            break;

        default:
            // Generic webpage
            suggestions.unshift({ id: 'digest', reason: 'Analyze this page', priority: 1 });
            suggestions.push({ id: 'chat', reason: 'Ask questions', priority: 2 });
    }

    // SEO suggestions for any webpage
    if (siteType !== 'restricted' && siteType !== 'email') {
        suggestions.push({ id: 'schema-markup', reason: 'Generate SEO schema', priority: 5 });
        suggestions.push({ id: 'headline-generator', reason: 'Create headlines', priority: 5 });
    }

    // Content-based suggestions
    if (context.stats?.readingTimeMinutes && context.stats.readingTimeMinutes > 5) {
        suggestions.push({ id: 'reading-time', reason: `${context.stats.readingTimeMinutes} min read - analyze readability`, priority: 4 });
    }

    // Sort by priority and remove duplicates
    const seen = new Set<string>();
    return suggestions
        .filter(s => {
            if (seen.has(s.id)) return false;
            seen.add(s.id);
            return true;
        })
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 5); // Top 5 suggestions
};

export const usePageContext = () => {
    const [context, setContext] = useState<PageContext | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [suggestedApps, setSuggestedApps] = useState<AppSuggestion[]>([]);

    const refreshContext = useCallback(() => {
        setIsLoading(true);
        chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB_CONTENT' }, (response) => {
            if (response) {
                let domain = '';
                try {
                    domain = response.url ? new URL(response.url).hostname : '';
                } catch (e) {
                    console.warn('Invalid URL in context:', response.url);
                }

                const newContext: PageContext = {
                    ...response,
                    domain,
                    isYouTube: response.url?.includes('youtube.com') || response.url?.includes('youtu.be')
                };

                setContext(newContext);
                setSuggestedApps(getSuggestedApps(newContext));
            }
            setIsLoading(false);
        });
    }, []);

    useEffect(() => {
        refreshContext();

        const handleMessage = (message: any) => {
            if (message.type === 'SELECTION_CHANGED') {
                setContext(prev => prev ? { ...prev, selection: message.selection } : { selection: message.selection });
            }
            if (message.type === 'CONTEXT_MENU_ACTION') {
                refreshContext();
            }
            // Auto-refresh when tab changes or updates
            if (message.type === 'TAB_CHANGED' || message.type === 'TAB_UPDATED') {
                refreshContext();
            }
        };

        chrome.runtime.onMessage.addListener(handleMessage);
        return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }, [refreshContext]);

    return {
        context,
        refreshContext,
        isLoading,
        suggestedApps,
        siteType: context?.siteType || 'unknown'
    };
};
