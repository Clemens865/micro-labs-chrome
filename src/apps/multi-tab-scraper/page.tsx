'use client';

import React, { useState, useCallback } from 'react';
import { Download, Play, Trash2, Plus, Table, FileJson, FileText, Loader2, CheckCircle, XCircle, AlertCircle, Settings, Columns } from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';

interface ScrapingField {
    id: string;
    name: string;
    selector: string;
    attribute: string; // 'text', 'href', 'src', or specific attribute
    multiple: boolean;
}

interface ScrapeTemplate {
    id: string;
    name: string;
    fields: ScrapingField[];
}

interface ScrapeResult {
    url: string;
    tabId: number;
    status: 'pending' | 'success' | 'error';
    data: Record<string, any>;
    error?: string;
}

const defaultTemplates: ScrapeTemplate[] = [
    {
        id: 'article',
        name: 'Article Content',
        fields: [
            { id: '1', name: 'Title', selector: 'h1, .title, [class*="title"]', attribute: 'text', multiple: false },
            { id: '2', name: 'Author', selector: '[rel="author"], .author, [class*="author"]', attribute: 'text', multiple: false },
            { id: '3', name: 'Date', selector: 'time, .date, [class*="date"], [datetime]', attribute: 'text', multiple: false },
            { id: '4', name: 'Content', selector: 'article, .content, main p', attribute: 'text', multiple: true },
        ]
    },
    {
        id: 'product',
        name: 'Product Info',
        fields: [
            { id: '1', name: 'Name', selector: 'h1, .product-title, [class*="product-name"]', attribute: 'text', multiple: false },
            { id: '2', name: 'Price', selector: '.price, [class*="price"], [data-price]', attribute: 'text', multiple: false },
            { id: '3', name: 'Description', selector: '.description, [class*="description"], #description', attribute: 'text', multiple: false },
            { id: '4', name: 'Images', selector: 'img[src*="product"], .product-image img', attribute: 'src', multiple: true },
        ]
    },
    {
        id: 'links',
        name: 'All Links',
        fields: [
            { id: '1', name: 'Link Text', selector: 'a', attribute: 'text', multiple: true },
            { id: '2', name: 'URL', selector: 'a', attribute: 'href', multiple: true },
        ]
    },
    {
        id: 'images',
        name: 'All Images',
        fields: [
            { id: '1', name: 'Alt Text', selector: 'img', attribute: 'alt', multiple: true },
            { id: '2', name: 'Source URL', selector: 'img', attribute: 'src', multiple: true },
        ]
    },
    {
        id: 'meta',
        name: 'SEO & Meta',
        fields: [
            { id: '1', name: 'Title', selector: 'title', attribute: 'text', multiple: false },
            { id: '2', name: 'Description', selector: 'meta[name="description"]', attribute: 'content', multiple: false },
            { id: '3', name: 'Keywords', selector: 'meta[name="keywords"]', attribute: 'content', multiple: false },
            { id: '4', name: 'OG Title', selector: 'meta[property="og:title"]', attribute: 'content', multiple: false },
            { id: '5', name: 'OG Image', selector: 'meta[property="og:image"]', attribute: 'content', multiple: false },
        ]
    }
];

export default function MultiTabScraperPage() {
    const { generateContent } = useGemini();

    const [selectedTabs, setSelectedTabs] = useState<chrome.tabs.Tab[]>([]);
    const [availableTabs, setAvailableTabs] = useState<chrome.tabs.Tab[]>([]);
    const [results, setResults] = useState<ScrapeResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTemplate, setActiveTemplate] = useState<ScrapeTemplate>(defaultTemplates[0]);
    const [customFields, setCustomFields] = useState<ScrapingField[]>([]);
    const [showFieldEditor, setShowFieldEditor] = useState(false);
    const [useAiExtraction, setUseAiExtraction] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('Extract the main content, key facts, and any structured data from this page.');

    // Load available tabs
    const loadTabs = useCallback(async () => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            const tabs = await chrome.tabs.query({ currentWindow: true });
            setAvailableTabs(tabs.filter(t => t.url && !t.url.startsWith('chrome://')));
        }
    }, []);

    React.useEffect(() => {
        loadTabs();
    }, [loadTabs]);

    const toggleTabSelection = (tab: chrome.tabs.Tab) => {
        setSelectedTabs(prev => {
            const exists = prev.find(t => t.id === tab.id);
            if (exists) {
                return prev.filter(t => t.id !== tab.id);
            }
            return [...prev, tab];
        });
    };

    const selectAllTabs = () => {
        setSelectedTabs([...availableTabs]);
    };

    const clearSelection = () => {
        setSelectedTabs([]);
    };

    // Execute content script to scrape a single tab
    const scrapeTab = async (tab: chrome.tabs.Tab, fields: ScrapingField[]): Promise<ScrapeResult> => {
        if (!tab.id || !tab.url) {
            return {
                url: tab.url || 'Unknown',
                tabId: tab.id || 0,
                status: 'error',
                data: {},
                error: 'Invalid tab'
            };
        }

        try {
            // Inject and execute scraping script
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (fieldsJson: string) => {
                    const fields = JSON.parse(fieldsJson) as ScrapingField[];
                    const data: Record<string, any> = {};

                    for (const field of fields) {
                        try {
                            const elements = document.querySelectorAll(field.selector);

                            if (elements.length === 0) {
                                data[field.name] = field.multiple ? [] : null;
                                continue;
                            }

                            const extractValue = (el: Element): string => {
                                if (field.attribute === 'text') {
                                    return el.textContent?.trim() || '';
                                } else if (field.attribute === 'html') {
                                    return el.innerHTML;
                                } else {
                                    return el.getAttribute(field.attribute) || '';
                                }
                            };

                            if (field.multiple) {
                                data[field.name] = Array.from(elements).map(extractValue).filter(v => v);
                            } else {
                                data[field.name] = extractValue(elements[0]);
                            }
                        } catch (e) {
                            data[field.name] = field.multiple ? [] : null;
                        }
                    }

                    // Also get full page text for AI extraction
                    data['_fullText'] = document.body.innerText?.slice(0, 10000) || '';
                    data['_url'] = window.location.href;
                    data['_title'] = document.title;

                    return data;
                },
                args: [JSON.stringify(fields)]
            });

            return {
                url: tab.url,
                tabId: tab.id,
                status: 'success',
                data: results[0]?.result || {}
            };
        } catch (error: any) {
            return {
                url: tab.url,
                tabId: tab.id,
                status: 'error',
                data: {},
                error: error.message || 'Failed to scrape'
            };
        }
    };

    // AI-enhanced extraction
    const aiExtract = async (pageData: Record<string, any>): Promise<Record<string, any>> => {
        const text = pageData._fullText || '';
        const url = pageData._url || '';
        const title = pageData._title || '';

        const prompt = `Analyze this web page content and extract structured data.

URL: ${url}
Title: ${title}

Page Content:
${text.slice(0, 8000)}

User Request: ${aiPrompt}

Return a JSON object with the extracted data. Include fields like:
- title: string
- summary: string (2-3 sentences)
- keyPoints: string[] (main takeaways)
- entities: { people: string[], organizations: string[], locations: string[] }
- dates: string[] (any important dates mentioned)
- links: { text: string, relevance: string }[] (important links)
- customData: any (additional data based on user request)

Respond ONLY with valid JSON, no markdown.`;

        try {
            const result = await generateContent(prompt);
            const cleaned = result.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            return { error: 'AI extraction failed', rawText: text.slice(0, 500) };
        }
    };

    // Run scraping on all selected tabs
    const runScraping = async () => {
        if (selectedTabs.length === 0) return;

        setIsLoading(true);
        setResults([]);

        const fields = customFields.length > 0 ? customFields : activeTemplate.fields;
        const newResults: ScrapeResult[] = [];

        for (const tab of selectedTabs) {
            // Update status to pending
            setResults(prev => [...prev, {
                url: tab.url || '',
                tabId: tab.id || 0,
                status: 'pending',
                data: {}
            }]);

            const result = await scrapeTab(tab, fields);

            // If AI extraction is enabled, enhance the data
            if (useAiExtraction && result.status === 'success') {
                const aiData = await aiExtract(result.data);
                result.data = { ...result.data, aiExtracted: aiData };
            }

            // Remove internal fields from display
            delete result.data._fullText;

            newResults.push(result);
            setResults([...newResults]);
        }

        setIsLoading(false);
    };

    // Add custom field
    const addField = () => {
        const newField: ScrapingField = {
            id: Date.now().toString(),
            name: 'New Field',
            selector: '',
            attribute: 'text',
            multiple: false
        };
        setCustomFields([...customFields, newField]);
    };

    const updateField = (id: string, updates: Partial<ScrapingField>) => {
        setCustomFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const removeField = (id: string) => {
        setCustomFields(prev => prev.filter(f => f.id !== id));
    };

    // Export functions
    const exportAsJson = () => {
        const exportData = results.filter(r => r.status === 'success').map(r => ({
            url: r.url,
            ...r.data
        }));
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scrape-results-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportAsCsv = () => {
        const successResults = results.filter(r => r.status === 'success');
        if (successResults.length === 0) return;

        // Get all unique keys
        const allKeys = new Set<string>();
        allKeys.add('url');
        successResults.forEach(r => {
            Object.keys(r.data).forEach(k => {
                if (!k.startsWith('_') && k !== 'aiExtracted') allKeys.add(k);
            });
        });

        const headers = Array.from(allKeys);
        const rows = successResults.map(r => {
            return headers.map(h => {
                if (h === 'url') return r.url;
                const value = r.data[h];
                if (Array.isArray(value)) return value.join('; ');
                if (typeof value === 'object') return JSON.stringify(value);
                return String(value || '');
            });
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scrape-results-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
        switch (status) {
            case 'pending':
                return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
            case 'success':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'error':
                return <XCircle className="w-4 h-4 text-red-500" />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Table className="w-5 h-5 text-violet-600" />
                        <h1 className="font-semibold text-gray-800">Multi-Tab Scraper</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowFieldEditor(!showFieldEditor)}
                            className={`p-2 rounded-lg transition-colors ${showFieldEditor ? 'bg-violet-100 text-violet-600' : 'hover:bg-gray-100'}`}
                            title="Field Editor"
                        >
                            <Columns className="w-4 h-4" />
                        </button>
                        <button
                            onClick={loadTabs}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                            title="Refresh Tabs"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Tab Selection */}
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-700">Select Tabs to Scrape</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={selectAllTabs}
                                className="text-xs px-2 py-1 bg-violet-50 text-violet-600 rounded hover:bg-violet-100"
                            >
                                Select All
                            </button>
                            <button
                                onClick={clearSelection}
                                className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1">
                        {availableTabs.map(tab => (
                            <label
                                key={tab.id}
                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                    selectedTabs.find(t => t.id === tab.id)
                                        ? 'bg-violet-50 border border-violet-200'
                                        : 'hover:bg-gray-50 border border-transparent'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={!!selectedTabs.find(t => t.id === tab.id)}
                                    onChange={() => toggleTabSelection(tab)}
                                    className="rounded text-violet-600"
                                />
                                <img
                                    src={tab.favIconUrl || '/icon-16.png'}
                                    alt=""
                                    className="w-4 h-4"
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                                <span className="text-sm text-gray-700 truncate flex-1">
                                    {tab.title}
                                </span>
                            </label>
                        ))}
                        {availableTabs.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">
                                No tabs available
                            </p>
                        )}
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                        {selectedTabs.length} tab{selectedTabs.length !== 1 ? 's' : ''} selected
                    </p>
                </div>

                {/* Template Selection */}
                <div className="bg-white rounded-xl border p-4">
                    <h3 className="font-medium text-gray-700 mb-3">Scraping Template</h3>
                    <div className="flex flex-wrap gap-2">
                        {defaultTemplates.map(template => (
                            <button
                                key={template.id}
                                onClick={() => {
                                    setActiveTemplate(template);
                                    setCustomFields([]);
                                }}
                                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                    activeTemplate.id === template.id && customFields.length === 0
                                        ? 'bg-violet-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {template.name}
                            </button>
                        ))}
                        <button
                            onClick={() => {
                                setCustomFields(activeTemplate.fields);
                                setShowFieldEditor(true);
                            }}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                customFields.length > 0
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Custom
                        </button>
                    </div>
                </div>

                {/* Field Editor */}
                {showFieldEditor && (
                    <div className="bg-white rounded-xl border p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium text-gray-700">Custom Fields</h3>
                            <button
                                onClick={addField}
                                className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700"
                            >
                                <Plus className="w-4 h-4" />
                                Add Field
                            </button>
                        </div>

                        <div className="space-y-3">
                            {(customFields.length > 0 ? customFields : activeTemplate.fields).map((field, idx) => (
                                <div key={field.id} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={field.name}
                                            onChange={(e) => updateField(field.id, { name: e.target.value })}
                                            placeholder="Field name"
                                            className="px-2 py-1 text-sm border rounded"
                                            disabled={customFields.length === 0}
                                        />
                                        <input
                                            type="text"
                                            value={field.selector}
                                            onChange={(e) => updateField(field.id, { selector: e.target.value })}
                                            placeholder="CSS Selector"
                                            className="px-2 py-1 text-sm border rounded font-mono"
                                            disabled={customFields.length === 0}
                                        />
                                        <select
                                            value={field.attribute}
                                            onChange={(e) => updateField(field.id, { attribute: e.target.value })}
                                            className="px-2 py-1 text-sm border rounded"
                                            disabled={customFields.length === 0}
                                        >
                                            <option value="text">Text Content</option>
                                            <option value="html">Inner HTML</option>
                                            <option value="href">href</option>
                                            <option value="src">src</option>
                                            <option value="alt">alt</option>
                                            <option value="content">content</option>
                                            <option value="value">value</option>
                                        </select>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={field.multiple}
                                                onChange={(e) => updateField(field.id, { multiple: e.target.checked })}
                                                disabled={customFields.length === 0}
                                            />
                                            Multiple
                                        </label>
                                    </div>
                                    {customFields.length > 0 && (
                                        <button
                                            onClick={() => removeField(field.id)}
                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* AI Enhancement */}
                <div className="bg-white rounded-xl border p-4">
                    <label className="flex items-center gap-2 mb-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={useAiExtraction}
                            onChange={(e) => setUseAiExtraction(e.target.checked)}
                            className="rounded text-violet-600"
                        />
                        <span className="font-medium text-gray-700">AI-Enhanced Extraction</span>
                        <span className="text-xs text-gray-500">(Uses Gemini)</span>
                    </label>

                    {useAiExtraction && (
                        <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="What should the AI extract?"
                            className="w-full p-2 text-sm border rounded-lg resize-none"
                            rows={2}
                        />
                    )}
                </div>

                {/* Run Button */}
                <button
                    onClick={runScraping}
                    disabled={isLoading || selectedTabs.length === 0}
                    className="w-full py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Scraping {results.length}/{selectedTabs.length}...
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5" />
                            Scrape {selectedTabs.length} Tab{selectedTabs.length !== 1 ? 's' : ''}
                        </>
                    )}
                </button>

                {/* Results */}
                {results.length > 0 && (
                    <div className="bg-white rounded-xl border p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium text-gray-700">Results</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={exportAsJson}
                                    className="flex items-center gap-1 text-sm px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                                >
                                    <FileJson className="w-4 h-4" />
                                    JSON
                                </button>
                                <button
                                    onClick={exportAsCsv}
                                    className="flex items-center gap-1 text-sm px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                                >
                                    <FileText className="w-4 h-4" />
                                    CSV
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {results.map((result, idx) => (
                                <div key={idx} className="border rounded-lg overflow-hidden">
                                    <div className="flex items-center gap-2 p-3 bg-gray-50 border-b">
                                        {getStatusIcon(result.status)}
                                        <span className="text-sm font-medium text-gray-700 truncate flex-1">
                                            {result.url}
                                        </span>
                                    </div>

                                    {result.status === 'success' && (
                                        <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                                            {Object.entries(result.data)
                                                .filter(([k]) => !k.startsWith('_'))
                                                .map(([key, value]) => (
                                                    <div key={key} className="text-sm">
                                                        <span className="font-medium text-gray-600">{key}:</span>
                                                        <span className="ml-2 text-gray-800">
                                                            {typeof value === 'object'
                                                                ? JSON.stringify(value, null, 2)
                                                                : String(value || '-')}
                                                        </span>
                                                    </div>
                                                ))}
                                        </div>
                                    )}

                                    {result.status === 'error' && (
                                        <div className="p-3 flex items-center gap-2 text-red-600">
                                            <AlertCircle className="w-4 h-4" />
                                            <span className="text-sm">{result.error}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
