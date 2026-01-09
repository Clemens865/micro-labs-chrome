/**
 * MicroLabs - Chrome Extension Background Service Worker
 * Enhanced with tab change detection and rich metadata extraction
 */

interface State {
    apiKey: string | null;
    currentTabId: number | null;
}

const state: State = {
    apiKey: null,
    currentTabId: null,
};

// Initialize
chrome.runtime.onInstalled.addListener(() => {
    console.log('MicroLabs Extension Installed');

    // Enable opening side panel on icon click
    chrome.sidePanel
        .setPanelBehavior({ openPanelOnActionClick: true })
        .catch((error) => console.error(error));

    // Create context menu for quick analysis
    chrome.contextMenus.create({
        id: 'microlabs-summarize',
        title: 'Summarize Selection',
        contexts: ['selection']
    });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'microlabs-summarize' && tab?.id) {
        chrome.sidePanel.open({ tabId: tab.id });
        setTimeout(() => {
            chrome.runtime.sendMessage({
                type: 'CONTEXT_MENU_ACTION',
                action: 'summarize',
                selection: info.selectionText
            });
        }, 500);
    }
});

// Tab change detection - notify sidepanel when active tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
    state.currentTabId = activeInfo.tabId;
    chrome.runtime.sendMessage({ type: 'TAB_CHANGED', tabId: activeInfo.tabId }).catch(() => {
        // Sidepanel might not be open, ignore error
    });
});

// Tab update detection - notify when page content changes (navigation, reload)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tabId === state.currentTabId) {
        chrome.runtime.sendMessage({ type: 'TAB_UPDATED', tabId, url: tab.url }).catch(() => {
            // Sidepanel might not be open, ignore error
        });
    }
});

// Utility: Check if URL is scriptable
const isScriptableUrl = (url?: string): boolean => {
    if (!url) return false;
    return !url.startsWith('chrome://') &&
        !url.startsWith('chrome-extension://') &&
        !url.startsWith('edge://') &&
        !url.startsWith('about:') &&
        !url.startsWith('data:') &&
        !url.startsWith('view-source:') &&
        !url.includes('chrome.google.com/webstore');
};

// Rich metadata extraction script to inject into pages
const extractPageMetadata = () => {
    const getMeta = (name: string): string => {
        const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
        return el?.getAttribute('content') || '';
    };

    const getMetaMultiple = (names: string[]): string => {
        for (const name of names) {
            const value = getMeta(name);
            if (value) return value;
        }
        return '';
    };

    // Detect site type based on various signals
    const detectSiteType = (): string => {
        const url = window.location.href.toLowerCase();
        const hostname = window.location.hostname.toLowerCase();
        const ogType = getMeta('og:type');

        // YouTube
        if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'video';

        // Social Media
        if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'social';
        if (hostname.includes('linkedin.com')) return 'social';
        if (hostname.includes('facebook.com')) return 'social';
        if (hostname.includes('instagram.com')) return 'social';
        if (hostname.includes('reddit.com')) return 'forum';

        // E-commerce
        if (hostname.includes('amazon.') || hostname.includes('ebay.') || hostname.includes('shopify.')) return 'ecommerce';
        if (document.querySelector('[itemtype*="Product"]') || document.querySelector('.product-price, .add-to-cart, [data-product]')) return 'ecommerce';

        // Documentation
        if (hostname.includes('docs.') || hostname.includes('developer.') || hostname.includes('devdocs.')) return 'documentation';
        if (url.includes('/docs/') || url.includes('/documentation/') || url.includes('/api/')) return 'documentation';
        if (hostname.includes('github.com') || hostname.includes('gitlab.com')) return 'code';
        if (hostname.includes('stackoverflow.com') || hostname.includes('stackexchange.com')) return 'qa';

        // News / Articles
        if (ogType === 'article') return 'article';
        if (document.querySelector('article, [itemtype*="Article"], [itemtype*="NewsArticle"]')) return 'article';
        if (hostname.includes('medium.com') || hostname.includes('substack.com')) return 'article';
        if (hostname.includes('news.') || url.includes('/news/') || url.includes('/blog/')) return 'article';

        // Email
        if (hostname.includes('mail.google.com') || hostname.includes('outlook.')) return 'email';

        // Search
        if (hostname.includes('google.com/search') || hostname.includes('bing.com/search')) return 'search';

        // PDF viewer
        if (url.endsWith('.pdf') || document.contentType === 'application/pdf') return 'pdf';

        return 'webpage';
    };

    // Extract structured data if present
    const getStructuredData = (): any => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        const data: any[] = [];
        scripts.forEach(script => {
            try {
                data.push(JSON.parse(script.textContent || ''));
            } catch (e) {}
        });
        return data.length > 0 ? data : null;
    };

    // Get main content (attempt to find article body)
    const getMainContent = (): string => {
        // Try common article selectors first
        const selectors = [
            'article',
            '[role="main"]',
            'main',
            '.post-content',
            '.article-content',
            '.entry-content',
            '.content-body',
            '#content',
            '.markdown-body', // GitHub
            '.Post', // Reddit
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector) as HTMLElement | null;
            if (el && el.innerText && el.innerText.length > 200) {
                return el.innerText.substring(0, 50000);
            }
        }

        // Fallback to body
        return document.body.innerText.substring(0, 50000);
    };

    // Extract reading time estimate
    const estimateReadingTime = (text: string): number => {
        const wordsPerMinute = 200;
        const words = text.trim().split(/\s+/).length;
        return Math.ceil(words / wordsPerMinute);
    };

    const content = getMainContent();

    return {
        // Basic info
        text: content,
        html: document.body.innerHTML.substring(0, 50000),

        // Meta information
        meta: {
            title: document.title,
            description: getMetaMultiple(['description', 'og:description', 'twitter:description']),
            author: getMetaMultiple(['author', 'article:author', 'og:article:author', 'twitter:creator']),
            publishedDate: getMetaMultiple(['article:published_time', 'datePublished', 'pubdate', 'date']),
            modifiedDate: getMetaMultiple(['article:modified_time', 'dateModified']),
            keywords: getMeta('keywords'),
            language: document.documentElement.lang || getMeta('language') || 'en',

            // Open Graph
            ogTitle: getMeta('og:title'),
            ogDescription: getMeta('og:description'),
            ogImage: getMeta('og:image'),
            ogType: getMeta('og:type'),
            ogSiteName: getMeta('og:site_name'),

            // Twitter Card
            twitterTitle: getMeta('twitter:title'),
            twitterDescription: getMeta('twitter:description'),
            twitterImage: getMeta('twitter:image'),

            // Canonical URL
            canonicalUrl: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
        },

        // Site classification
        siteType: detectSiteType(),

        // Content stats
        stats: {
            wordCount: content.trim().split(/\s+/).length,
            readingTimeMinutes: estimateReadingTime(content),
            hasImages: document.images.length > 0,
            imageCount: document.images.length,
            hasVideo: document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length > 0,
            linkCount: document.links.length,
        },

        // Structured data
        structuredData: getStructuredData(),
    };
};

// Message handling
chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (message.type === 'GET_API_KEY') {
        chrome.storage.sync.get(['apiKey'], (result) => {
            sendResponse({ apiKey: result.apiKey || null });
        });
        return true;
    }

    if (message.type === 'SET_API_KEY') {
        chrome.storage.sync.set({ apiKey: message.apiKey }, () => {
            sendResponse({ success: true });
        });
        return true;
    }

    if (message.type === 'GET_ACTIVE_TAB_CONTENT') {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            const tab = tabs[0];
            if (!tab?.id) {
                sendResponse(null);
                return;
            }

            state.currentTabId = tab.id;

            if (!isScriptableUrl(tab.url)) {
                sendResponse({
                    id: tab.id,
                    url: tab.url,
                    title: tab.title,
                    content: '',
                    html: '',
                    isRestricted: true,
                    siteType: 'restricted',
                    meta: {},
                    stats: {}
                });
                return;
            }

            try {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: extractPageMetadata
                });

                const result = results[0]?.result;

                sendResponse({
                    id: tab.id,
                    url: tab.url,
                    title: tab.title,
                    content: result?.text || '',
                    html: result?.html || '',
                    meta: result?.meta || {},
                    siteType: result?.siteType || 'webpage',
                    stats: result?.stats || {},
                    structuredData: result?.structuredData || null
                });
            } catch (err) {
                console.error('Extraction error:', err);
                sendResponse({
                    id: tab.id,
                    url: tab.url,
                    title: tab.title,
                    content: '',
                    error: 'Extraction failed',
                    siteType: 'unknown',
                    meta: {},
                    stats: {}
                });
            }
        });
        return true;
    }

    // YouTube Transcript Extraction
    if (message.type === 'GET_YOUTUBE_TRANSCRIPT') {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            const tab = tabs[0];
            if (!tab?.id || !tab.url?.includes('youtube.com/watch')) {
                sendResponse({ error: 'Not a YouTube video page', segments: [], fullText: '' });
                return;
            }

            try {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: extractYouTubeTranscript,
                    world: 'MAIN' // Run in page context to access YouTube's JS objects
                });

                const result = results[0]?.result;
                sendResponse(result || { error: 'Failed to extract transcript', segments: [], fullText: '' });
            } catch (err: any) {
                console.error('Transcript extraction error:', err);
                sendResponse({ error: err.message || 'Transcript extraction failed', segments: [], fullText: '' });
            }
        });
        return true;
    }

    // Capture Screenshot of visible tab
    if (message.type === 'CAPTURE_SCREENSHOT') {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            const tab = tabs[0];
            if (!tab?.id || !tab.windowId) {
                sendResponse({ error: 'No active tab found' });
                return;
            }

            try {
                const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
                    format: 'png',
                    quality: 100
                });
                sendResponse({
                    screenshot: dataUrl,
                    url: tab.url,
                    title: tab.title
                });
            } catch (err: any) {
                console.error('Screenshot capture error:', err);
                sendResponse({ error: err.message || 'Failed to capture screenshot' });
            }
        });
        return true;
    }
});

// YouTube transcript extraction function (runs in page context)
const extractYouTubeTranscript = async () => {
    try {
        // Access YouTube's player response from the page
        const playerResponse = (window as any).ytInitialPlayerResponse;

        if (!playerResponse) {
            // Try to find it in script tags
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
                const match = script.textContent?.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
                if (match) {
                    try {
                        const parsed = JSON.parse(match[1]);
                        if (parsed?.captions) {
                            return await fetchTranscriptFromPlayer(parsed);
                        }
                    } catch (e) {}
                }
            }
            return { error: 'Could not find video data', segments: [], fullText: '' };
        }

        return await fetchTranscriptFromPlayer(playerResponse);
    } catch (e: any) {
        return { error: e.message, segments: [], fullText: '' };
    }
};

async function fetchTranscriptFromPlayer(playerResponse: any) {
    const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captions || captions.length === 0) {
        return { error: 'No captions available for this video', segments: [], fullText: '' };
    }

    // Prefer manual captions over auto-generated, and English if available
    let selectedTrack = captions.find((t: any) => t.languageCode === 'en' && !t.kind) ||
                       captions.find((t: any) => t.languageCode === 'en') ||
                       captions.find((t: any) => !t.kind) ||
                       captions[0];

    const captionUrl = selectedTrack.baseUrl;

    // Fetch the transcript XML
    const response = await fetch(captionUrl);
    const xml = await response.text();

    // Parse the XML transcript
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const textElements = doc.querySelectorAll('text');

    const segments: any[] = [];
    let fullText = '';

    textElements.forEach((el: Element) => {
        const text = (el.textContent || '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\n/g, ' ')
            .trim();

        if (text) {
            segments.push({
                text: text,
                start: parseFloat(el.getAttribute('start') || '0'),
                duration: parseFloat(el.getAttribute('dur') || '0')
            });
            fullText += text + ' ';
        }
    });

    return {
        segments: segments,
        fullText: fullText.trim(),
        language: selectedTrack.languageCode,
        trackName: selectedTrack.name?.simpleText || (selectedTrack.kind === 'asr' ? 'Auto-generated' : 'Manual')
    };
}
