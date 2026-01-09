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

export const appRegistry: AppMetadata[] = [
    {
        id: 'digest',
        title: 'Page Digest',
        description: 'Instant summaries and key points.',
        icon: 'Globe',
        category: 'Analysis'
    },
    {
        id: 'chat',
        title: 'Chat with Page',
        description: 'Ask anything about the content.',
        icon: 'MessageSquare',
        category: 'Analysis'
    },
    {
        id: 'youtube',
        title: 'YouTube Digest',
        description: 'AI Video Summaries.',
        icon: 'Youtube',
        category: 'Video'
    },
    {
        id: 'email',
        title: 'Email Composer',
        description: 'Smart replies & drafts.',
        icon: 'Mail',
        category: 'Productivity'
    },
    {
        id: 'neighborhood-intel',
        title: 'Neighborhood Intel AI',
        description: 'Real-time neighborhood research.',
        icon: 'Map',
        category: 'Research'
    },
    // Custom Apps - Vision & Audio
    {
        id: 'screenshot-analyzer',
        title: 'Screenshot Analyzer',
        description: 'AI-powered visual analysis of any page.',
        icon: 'Eye',
        category: 'Vision'
    },
    {
        id: 'vision2code',
        title: 'Vision2Code',
        description: 'Transform any UI into production-ready code.',
        icon: 'Code2',
        category: 'Vision'
    },
    {
        id: 'voice-notes',
        title: 'Voice Notes',
        description: 'Speech-to-text with AI processing.',
        icon: 'Mic',
        category: 'Audio'
    },
    {
        id: 'page-reader',
        title: 'Page Reader',
        description: 'Listen to any page with TTS.',
        icon: 'Volume2',
        category: 'Audio'
    },
    // Custom Apps - Advanced Analyzers
    {
        id: 'aeo-analyzer',
        title: 'AEO Analyzer',
        description: 'Answer Engine Optimization scoring & analysis.',
        icon: 'Search',
        category: 'SEO'
    },
    {
        id: 'tech-stack-detector',
        title: 'Tech Stack Detector',
        description: 'Identify frameworks, libraries & services.',
        icon: 'Cpu',
        category: 'Technical'
    },
    {
        id: 'accessibility-auditor',
        title: 'Accessibility Auditor',
        description: 'WCAG compliance & a11y best practices.',
        icon: 'Accessibility',
        category: 'Technical'
    },
    {
        id: 'lead-extractor',
        title: 'Lead Extractor',
        description: 'Extract contacts, emails & social profiles.',
        icon: 'Users',
        category: 'Business'
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
        id: 'terms-analyzer',
        title: 'Terms & Privacy Analyzer',
        description: 'Analyze any page for legal risks & privacy concerns.',
        icon: 'Scale',
        category: 'Legal'
    },
    {
        id: 'console-monitor',
        title: 'Console Monitor',
        description: 'Live console logs with AI error analysis for debugging.',
        icon: 'Terminal',
        category: 'Developer'
    },
    // New SDK Features - Gemini 2.0+
    {
        id: 'image-generator',
        title: 'AI Image Generator',
        description: 'Create images with Google Imagen 3.',
        icon: 'Image',
        category: 'Creative'
    },
    {
        id: 'fact-checker',
        title: 'Fact Checker',
        description: 'AI fact-checking with Google Search.',
        icon: 'ShieldCheck',
        category: 'Research'
    },
    {
        id: 'research-assistant',
        title: 'Research Assistant',
        description: 'AI research with live search grounding.',
        icon: 'BookOpen',
        category: 'Research'
    },
    // Meeting & Collaboration
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
    // Agentic Apps - Web Browsing & Analysis
    {
        id: 'web-research-agent',
        title: 'Web Research Agent',
        description: 'AI agent with multi-URL analysis & synthesis.',
        icon: 'Bot',
        category: 'Agentic'
    },
    {
        id: 'competitive-analysis',
        title: 'Competitive Analysis',
        description: 'AI-powered competitor research & insights.',
        icon: 'Target',
        category: 'Agentic'
    },
    {
        id: 'link-analyzer',
        title: 'Link Analyzer',
        description: 'Deep-dive analysis of linked pages.',
        icon: 'Link2',
        category: 'Agentic'
    },
    {
        id: 'deep-research',
        title: 'Deep Research',
        description: 'AI rabbit hole - explore topics infinitely deep.',
        icon: 'Rabbit',
        category: 'Agentic'
    },
    {
        id: 'topic-monitor',
        title: 'Topic Monitor',
        description: 'Track topics across resources & stay updated.',
        icon: 'Radar',
        category: 'Agentic'
    },
    // SVG Icon Generator
    {
        id: 'svg-icon-generator',
        title: 'SVG Icon Generator',
        description: 'AI-powered icon & logo creation with vector export.',
        icon: 'Pen',
        category: 'Creative'
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
};

export const getAppComponent = (id: string) => {
    return appComponents[id];
};

export const getGenericConfig = (id: string) => {
    return [...Batch2Configs, ...Batch3Configs, ...Batch4Configs, ...Batch5Configs].find(c => c.id === id);
};
