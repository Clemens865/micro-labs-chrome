import React, { lazy, Suspense } from 'react';

import { Batch2Configs, Batch3Configs, Batch4Configs, Batch5Configs } from './ConfigRegistry';

export interface AppMetadata {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    isGeneric?: boolean;
}

// Consolidated category definitions with icons and colors
export const categoryConfig: Record<string, { label: string; icon: string; color: string; order: number }> = {
    'Page Analysis': { label: 'Page Analysis', icon: 'FileSearch', color: 'blue', order: 1 },
    'Research': { label: 'Research', icon: 'Search', color: 'emerald', order: 2 },
    'AI Agents': { label: 'AI Agents', icon: 'Bot', color: 'purple', order: 3 },
    'Browser Tools': { label: 'Browser Tools', icon: 'Globe', color: 'cyan', order: 4 },
    'Media': { label: 'Media', icon: 'Play', color: 'red', order: 5 },
    'Developer': { label: 'Developer', icon: 'Code', color: 'orange', order: 6 },
    'Productivity': { label: 'Productivity', icon: 'Zap', color: 'yellow', order: 7 },
    'Business': { label: 'Business', icon: 'Briefcase', color: 'pink', order: 8 },
};

export const appRegistry: AppMetadata[] = [
    // === PAGE ANALYSIS ===
    {
        id: 'digest',
        title: 'Page Digest',
        description: 'Instant summaries and key points.',
        icon: 'Globe',
        category: 'Page Analysis'
    },
    {
        id: 'chat',
        title: 'Chat with Page',
        description: 'Ask anything about the content.',
        icon: 'MessageSquare',
        category: 'Page Analysis'
    },
    {
        id: 'advanced-chat',
        title: 'Advanced Chat',
        description: 'Research chat with live web search.',
        icon: 'Sparkles',
        category: 'Page Analysis'
    },
    {
        id: 'screenshot-analyzer',
        title: 'Screenshot Analyzer',
        description: 'AI-powered visual analysis of any page.',
        icon: 'Eye',
        category: 'Page Analysis'
    },
    {
        id: 'terms-analyzer',
        title: 'Terms & Privacy Analyzer',
        description: 'Analyze any page for legal risks & privacy concerns.',
        icon: 'Scale',
        category: 'Page Analysis'
    },
    {
        id: 'pdf-analyzer',
        title: 'PDF Deep Analyzer',
        description: 'Analyze, extract & chat with PDF documents.',
        icon: 'FileText',
        category: 'Page Analysis'
    },
    // === RESEARCH ===
    {
        id: 'research-assistant',
        title: 'Research Assistant',
        description: 'AI research with live search grounding.',
        icon: 'BookOpen',
        category: 'Research'
    },
    {
        id: 'fact-checker',
        title: 'Fact Checker',
        description: 'AI fact-checking with Google Search.',
        icon: 'ShieldCheck',
        category: 'Research'
    },
    {
        id: 'citation-generator',
        title: 'Citation Generator',
        description: 'APA, MLA, Chicago & Harvard citations.',
        icon: 'BookOpen',
        category: 'Research'
    },
    {
        id: 'source-credibility',
        title: 'Source Credibility',
        description: 'Evaluate trustworthiness & reliability.',
        icon: 'ShieldCheck',
        category: 'Research'
    },
    {
        id: 'neighborhood-intel',
        title: 'Neighborhood Intel AI',
        description: 'Real-time neighborhood research.',
        icon: 'Map',
        category: 'Research'
    },
    // === AI AGENTS ===
    {
        id: 'web-research-agent',
        title: 'Web Research Agent',
        description: 'AI agent with multi-URL analysis & synthesis.',
        icon: 'Bot',
        category: 'AI Agents'
    },
    {
        id: 'deep-research',
        title: 'Deep Research',
        description: 'AI rabbit hole - explore topics infinitely deep.',
        icon: 'Rabbit',
        category: 'AI Agents'
    },
    {
        id: 'competitive-analysis',
        title: 'Competitive Analysis',
        description: 'AI-powered competitor research & insights.',
        icon: 'Target',
        category: 'AI Agents'
    },
    {
        id: 'link-analyzer',
        title: 'Link Analyzer',
        description: 'Deep-dive analysis of linked pages.',
        icon: 'Link2',
        category: 'AI Agents'
    },
    {
        id: 'topic-monitor',
        title: 'Topic Monitor',
        description: 'Track topics across resources & stay updated.',
        icon: 'Radar',
        category: 'AI Agents'
    },
    {
        id: 'auto-browser',
        title: 'Auto Browser Agent',
        description: 'Automated web browsing with content extraction.',
        icon: 'Globe',
        category: 'AI Agents'
    },
    {
        id: 'docs-crawler',
        title: 'Docs Crawler',
        description: 'Crawl entire documentation sites into one file.',
        icon: 'FolderTree',
        category: 'AI Agents'
    },
    {
        id: 'multi-site-comparator',
        title: 'Multi-Site Comparator',
        description: 'Compare up to 20 URLs simultaneously with AI.',
        icon: 'Scale',
        category: 'AI Agents'
    },
    // === BROWSER TOOLS ===
    {
        id: 'tab-manager',
        title: 'Tab Manager Pro',
        description: 'AI-powered tab organization, grouping & session management.',
        icon: 'LayoutGrid',
        category: 'Browser Tools'
    },
    {
        id: 'tab-automations',
        title: 'Tab Automations',
        description: 'Rule-based tab actions & triggers.',
        icon: 'Zap',
        category: 'Browser Tools'
    },
    {
        id: 'reading-queue',
        title: 'Reading Queue',
        description: 'Save pages for later with AI prioritization.',
        icon: 'BookmarkPlus',
        category: 'Browser Tools'
    },
    {
        id: 'multi-tab-scraper',
        title: 'Multi-Tab Scraper',
        description: 'Extract structured data from multiple tabs.',
        icon: 'Table',
        category: 'Browser Tools'
    },
    // === MEDIA ===
    {
        id: 'youtube',
        title: 'YouTube Digest',
        description: 'AI Video Summaries.',
        icon: 'Youtube',
        category: 'Media'
    },
    {
        id: 'voice-notes',
        title: 'Voice Notes',
        description: 'Speech-to-text with AI processing.',
        icon: 'Mic',
        category: 'Media'
    },
    {
        id: 'page-reader',
        title: 'Page Reader',
        description: 'Listen to any page with TTS.',
        icon: 'Volume2',
        category: 'Media'
    },
    {
        id: 'image-generator',
        title: 'AI Image Generator',
        description: 'Create images with Google Imagen 3.',
        icon: 'Image',
        category: 'Media'
    },
    {
        id: 'svg-icon-generator',
        title: 'SVG Icon Generator',
        description: 'AI-powered icon & logo creation with vector export.',
        icon: 'Pen',
        category: 'Media'
    },
    // === DEVELOPER ===
    {
        id: 'console-monitor',
        title: 'Console Monitor',
        description: 'Live console logs with AI error analysis for debugging.',
        icon: 'Terminal',
        category: 'Developer'
    },
    {
        id: 'tech-stack-detector',
        title: 'Tech Stack Detector',
        description: 'Identify frameworks, libraries & services.',
        icon: 'Cpu',
        category: 'Developer'
    },
    {
        id: 'accessibility-auditor',
        title: 'Accessibility Auditor',
        description: 'WCAG compliance & a11y best practices.',
        icon: 'Accessibility',
        category: 'Developer'
    },
    {
        id: 'vision2code',
        title: 'Vision2Code',
        description: 'Transform any UI into production-ready code.',
        icon: 'Code2',
        category: 'Developer'
    },
    {
        id: 'aeo-analyzer',
        title: 'AEO Analyzer',
        description: 'Answer Engine Optimization scoring & analysis.',
        icon: 'Search',
        category: 'Developer'
    },
    // === PRODUCTIVITY ===
    {
        id: 'email',
        title: 'Email Composer',
        description: 'Smart replies & drafts.',
        icon: 'Mail',
        category: 'Productivity'
    },
    {
        id: 'meeting-transcriber',
        title: 'Meeting Transcriber',
        description: 'Live meeting transcription with AI summaries.',
        icon: 'Video',
        category: 'Productivity'
    },
    {
        id: 'meeting-minutes',
        title: 'Meeting Minutes',
        description: 'Generate minutes from transcripts or audio.',
        icon: 'ClipboardList',
        category: 'Productivity'
    },
    // === BUSINESS ===
    {
        id: 'lead-extractor',
        title: 'Lead Extractor',
        description: 'Extract contacts, emails & social profiles.',
        icon: 'Users',
        category: 'Business'
    },
    {
        id: 'crm-lead-pusher',
        title: 'CRM Lead Pusher',
        description: 'Extract leads & push to HubSpot, Salesforce, or webhooks.',
        icon: 'Send',
        category: 'Business'
    },
    {
        id: 'workflow-recorder',
        title: 'Workflow Recorder',
        description: 'Record actions & generate workflow docs or automation code.',
        icon: 'MousePointerClick',
        category: 'Browser Tools'
    },
    {
        id: 'meeting-notes-jira',
        title: 'Meeting Notes to Jira',
        description: 'Extract action items from meeting notes as Jira tickets.',
        icon: 'ClipboardList',
        category: 'Business'
    },
    {
        id: 'support-ticket-prefiller',
        title: 'Support Ticket Pre-Filler',
        description: 'AI pre-fills support tickets from customer messages.',
        icon: 'HeadphonesIcon',
        category: 'Business'
    },
    {
        id: 'api-endpoint-mapper',
        title: 'API Endpoint Mapper',
        description: 'Extract & document API endpoints from any source.',
        icon: 'Globe',
        category: 'Developer'
    },
    {
        id: 'event-tracking-validator',
        title: 'Event Tracking Validator',
        description: 'Capture & validate analytics events (GTM, GA4, etc.).',
        icon: 'Activity',
        category: 'Developer'
    },
    {
        id: 'competitor-prd',
        title: 'CompetitorLens PRD',
        description: 'Generate PRDs from competitor product analysis.',
        icon: 'Target',
        category: 'Business'
    },
    {
        id: 'code-clone-blueprint',
        title: 'CodeClone Blueprint',
        description: 'Technical blueprints for cloning any product.',
        icon: 'Code',
        category: 'Developer'
    },
    {
        id: 'content-repurposer',
        title: 'Content Repurposer',
        description: 'Transform content into tweets, posts, newsletters & more.',
        icon: 'RefreshCw',
        category: 'Productivity'
    },
    {
        id: 'error-log-parser',
        title: 'Error Log Parser',
        description: 'AI-powered error analysis with root cause & fixes.',
        icon: 'Bug',
        category: 'Developer'
    },
    {
        id: 'competitor-pricing-monitor',
        title: 'Competitor Pricing Monitor',
        description: 'Track & analyze competitor SaaS pricing changes.',
        icon: 'DollarSign',
        category: 'Business'
    },
    {
        id: 'competitor-ad-spy',
        title: 'Competitor Ad Spy',
        description: 'Capture & analyze competitor ads from any page.',
        icon: 'Eye',
        category: 'Business'
    },
    {
        id: 'social-proof-harvester',
        title: 'Social Proof Harvester',
        description: 'Extract testimonials, reviews & social proof for marketing.',
        icon: 'MessageSquareQuote',
        category: 'Business'
    },
    {
        id: 'feature-flag-detector',
        title: 'Feature Flag Detector',
        description: 'Detect hidden feature flags from localStorage, cookies & more.',
        icon: 'Flag',
        category: 'Developer'
    },
    {
        id: 'performance-budget-enforcer',
        title: 'Performance Budget Enforcer',
        description: 'Track & enforce page performance budgets with AI insights.',
        icon: 'Gauge',
        category: 'Developer'
    },
    {
        id: 'data-visualizer',
        title: 'Data Visualizer',
        description: 'Turn any data into charts & insights with AI.',
        icon: 'BarChart3',
        category: 'Developer'
    },
    {
        id: 'statistical-analyzer',
        title: 'Statistical Analyzer',
        description: 'AI-powered statistical analysis with Python code.',
        icon: 'Calculator',
        category: 'Developer'
    },
    {
        id: 'job-application-assistant',
        title: 'Job Application Assistant',
        description: 'Generate personalized cover letters & interview prep from job postings.',
        icon: 'Briefcase',
        category: 'Productivity'
    },
    {
        id: 'interview-question-generator',
        title: 'Interview Question Generator',
        description: 'Generate role-specific interview questions with sample answers.',
        icon: 'MessageSquare',
        category: 'Productivity'
    },
    {
        id: 'privacy-policy-diff-tracker',
        title: 'Privacy Policy Diff Tracker',
        description: 'Track privacy policy changes with AI-powered risk analysis.',
        icon: 'Scale',
        category: 'Research'
    },
    {
        id: 'contract-clause-extractor',
        title: 'Contract Clause Extractor',
        description: 'Extract & analyze contract clauses with AI risk assessment.',
        icon: 'FileText',
        category: 'Business'
    },
    {
        id: 'data-table-extractor',
        title: 'Data Table Extractor Pro',
        description: 'Extract tables from any page with sorting, filtering & export.',
        icon: 'Table',
        category: 'Browser Tools'
    },
    {
        id: 'smart-clipboard-manager',
        title: 'Smart Clipboard Manager',
        description: 'Intelligent clipboard history with AI categorization & tags.',
        icon: 'Clipboard',
        category: 'Productivity'
    },
    {
        id: 'audio-transcriber',
        title: 'Audio Transcriber',
        description: 'Transcribe & analyze audio with AI summaries.',
        icon: 'Mic',
        category: 'Media'
    },
    {
        id: 'pixel-alchemy',
        title: 'Pixel Alchemy',
        description: 'AI-powered image editing with text prompts and reference mixing.',
        icon: 'Wand2',
        category: 'Media'
    },
    // Batch 2 - Config Driven
    ...Batch2Configs.map(config => ({
        id: config.id,
        title: config.title,
        description: config.description,
        icon: 'Zap', // Fallback or mapping
        category: 'AI Tools',
        isGeneric: true
    })),
    // Batch 3 - Ecosystem Expansion
    ...Batch3Configs.map(config => ({
        id: config.id,
        title: config.title,
        description: config.description,
        icon: 'Zap',
        category: 'Ecosystem',
        isGeneric: true
    })),
    // Batch 4 - Productivity & Content
    ...Batch4Configs.map(config => ({
        id: config.id,
        title: config.title,
        description: config.description,
        icon: 'Zap',
        category: 'Productivity',
        isGeneric: true
    })),
    // Batch 5 - Business & Productivity Tools
    ...Batch5Configs.map(config => ({
        id: config.id,
        title: config.title,
        description: config.description,
        icon: 'Zap',
        category: 'Business',
        isGeneric: true
    }))
];

const appComponents: Record<string, React.LazyExoticComponent<any>> = {
    'digest': lazy(() => import('./page-digest/page')),
    'chat': lazy(() => import('./chat-with-page/page')),
    'advanced-chat': lazy(() => import('./advanced-chat/page')),
    'youtube': lazy(() => import('./youtube-digest/page')),
    'email': lazy(() => import('./email-composer/page')),
    'neighborhood-intel': lazy(() => import('./neighborhood-intel/page')),
    'screenshot-analyzer': lazy(() => import('./screenshot-analyzer/page')),
    'vision2code': lazy(() => import('./vision2code/page')),
    'voice-notes': lazy(() => import('./voice-notes/page')),
    'page-reader': lazy(() => import('./page-reader/page')),
    'aeo-analyzer': lazy(() => import('./aeo-analyzer/page')),
    'tech-stack-detector': lazy(() => import('./tech-stack-detector/page')),
    'accessibility-auditor': lazy(() => import('./accessibility-auditor/page')),
    'lead-extractor': lazy(() => import('./lead-extractor/page')),
    'crm-lead-pusher': lazy(() => import('./crm-lead-pusher/page')),
    'citation-generator': lazy(() => import('./citation-generator/page')),
    'source-credibility': lazy(() => import('./source-credibility/page')),
    'image-generator': lazy(() => import('./image-generator/page')),
    'fact-checker': lazy(() => import('./fact-checker/page')),
    'research-assistant': lazy(() => import('./research-assistant/page')),
    'meeting-transcriber': lazy(() => import('./meeting-transcriber/page')),
    'meeting-minutes': lazy(() => import('./meeting-minutes/page')),
    'web-research-agent': lazy(() => import('./web-research-agent/page')),
    'competitive-analysis': lazy(() => import('./competitive-analysis/page')),
    'link-analyzer': lazy(() => import('./link-analyzer/page')),
    'deep-research': lazy(() => import('./deep-research/page')),
    'topic-monitor': lazy(() => import('./topic-monitor/page')),
    'svg-icon-generator': lazy(() => import('./svg-icon-generator/page')),
    'terms-analyzer': lazy(() => import('./terms-analyzer/page')),
    'console-monitor': lazy(() => import('./console-monitor/page')),
    // Browser Automation & Tab Management
    'tab-manager': lazy(() => import('./tab-manager/page')),
    'auto-browser': lazy(() => import('./auto-browser/page')),
    'docs-crawler': lazy(() => import('./docs-crawler/page')),
    'multi-site-comparator': lazy(() => import('./multi-site-comparator/page')),
    'tab-automations': lazy(() => import('./tab-automations/page')),
    'reading-queue': lazy(() => import('./reading-queue/page')),
    'multi-tab-scraper': lazy(() => import('./multi-tab-scraper/page')),
    'workflow-recorder': lazy(() => import('./workflow-recorder/page')),
    'meeting-notes-jira': lazy(() => import('./meeting-notes-jira/page')),
    'support-ticket-prefiller': lazy(() => import('./support-ticket-prefiller/page')),
    'api-endpoint-mapper': lazy(() => import('./api-endpoint-mapper/page')),
    'event-tracking-validator': lazy(() => import('./event-tracking-validator/page')),
    'competitor-prd': lazy(() => import('./competitor-prd/page')),
    'code-clone-blueprint': lazy(() => import('./code-clone-blueprint/page')),
    'content-repurposer': lazy(() => import('./content-repurposer/page')),
    'error-log-parser': lazy(() => import('./error-log-parser/page')),
    'competitor-pricing-monitor': lazy(() => import('./competitor-pricing-monitor/page')),
    'competitor-ad-spy': lazy(() => import('./competitor-ad-spy/page')),
    'social-proof-harvester': lazy(() => import('./social-proof-harvester/page')),
    'feature-flag-detector': lazy(() => import('./feature-flag-detector/page')),
    'performance-budget-enforcer': lazy(() => import('./performance-budget-enforcer/page')),
    'job-application-assistant': lazy(() => import('./job-application-assistant/page')),
    'interview-question-generator': lazy(() => import('./interview-question-generator/page')),
    'privacy-policy-diff-tracker': lazy(() => import('./privacy-policy-diff-tracker/page')),
    'contract-clause-extractor': lazy(() => import('./contract-clause-extractor/page')),
    'data-table-extractor': lazy(() => import('./data-table-extractor/page')),
    'smart-clipboard-manager': lazy(() => import('./smart-clipboard-manager/page')),
    'audio-transcriber': lazy(() => import('./audio-transcriber/page')),
    'data-visualizer': lazy(() => import('./data-visualizer/page')),
    'pdf-analyzer': lazy(() => import('./pdf-analyzer/page')),
    'statistical-analyzer': lazy(() => import('./statistical-analyzer/page')),
    'pixel-alchemy': lazy(() => import('./pixel-alchemy/page')),
};

export const getAppComponent = (id: string) => {
    return appComponents[id];
};

export const getGenericConfig = (id: string) => {
    return [...Batch2Configs, ...Batch3Configs, ...Batch4Configs, ...Batch5Configs].find(c => c.id === id);
};
