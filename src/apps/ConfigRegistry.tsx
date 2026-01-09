import React from 'react';
import { AppConfig } from './GenericApp';
import {
    Search,
    Send,
    Briefcase,
    GraduationCap,
    ShieldCheck,
    Zap,
    BarChart3,
    Target,
    Heart,
    Plane,
    Code2,
    Utensils,
    CheckCircle,
    Share2,
    ClipboardList,
    Terminal,
    Palette,
    Smile,
    Lightbulb,
    UserCheck,
    Baby,
    FileText,
    Mail,
    MessageSquareReply,
    Layers,
    ListChecks,
    Megaphone,
    PenTool,
    Bug,
    BookOpen,
    Languages,
    RefreshCw,
    Clock,
    // Batch 5 icons
    MessageCircle,
    Scale,
    Calendar,
    Thermometer,
    FileSignature,
    ClipboardCheck,
    Presentation,
    Handshake,
    Award
} from 'lucide-react';

export const Batch2Configs: AppConfig[] = [
    {
        id: 'seo-architect',
        title: 'SEO Architect',
        description: 'Analyze page SEO & Keywords',
        systemPrompt: 'You are an elite SEO Strategist and Technical Auditor. You specialize in identifying deep optimization opportunities and meta-data strategies that drive organic growth.',
        userPromptTemplate: 'Perform a ${depth} SEO analysis of this page focused on ${focus}. \nInclude Recommendations: ${includeRecs}\n\nURL: ${context.url}\nTitle: ${context.title}\nContent: ${context.content}',
        inputs: [
            {
                id: 'focus',
                type: 'select',
                label: 'Analysis Focus',
                options: [
                    { label: 'Keywords & Content', value: 'keywords' },
                    { label: 'Technical SEO', value: 'technical' },
                    { label: 'Backlink Potential', value: 'backlink' }
                ],
                defaultValue: 'keywords'
            },
            {
                id: 'depth',
                type: 'select',
                label: 'Audit Depth',
                options: [
                    { label: 'Quick Scan', value: 'quick' },
                    { label: 'Standard Audit', value: 'standard' },
                    { label: 'Deep Comprehensive', value: 'deep' }
                ],
                defaultValue: 'standard'
            },
            {
                id: 'includeRecs',
                type: 'checkbox',
                label: 'Include Actionable Recommendations',
                defaultValue: true
            }
        ],
        icon: <Search size={22} />,
        color: 'blue'
    },
    {
        id: 'cold-outreach',
        title: 'Cold Outreach',
        description: 'Generate hyper-personalized emails',
        systemPrompt: 'You are a High-Performance Sales Outreach and Persuasion Specialist. You specialize in hyper-personalized, high-conversion cold correspondence.',
        userPromptTemplate: 'Draft a ${tone} cold message for ${platform}. \nTarget Profile Context: ${input} \nCompany/Content Context: ${context.content}.',
        inputs: [
            {
                id: 'input',
                type: 'textarea',
                label: 'Recipient Bio / Context',
                placeholder: 'Paste LinkedIn bio or about section...',
            },
            {
                id: 'platform',
                type: 'select',
                label: 'Platform',
                options: [
                    { label: 'LinkedIn DM', value: 'LinkedIn' },
                    { label: 'Professional Email', value: 'Email' },
                    { label: 'Twitter/X DM', value: 'Twitter' }
                ],
                defaultValue: 'LinkedIn'
            },
            {
                id: 'tone',
                type: 'select',
                label: 'Message Tone',
                options: [
                    { label: 'Polished Professional', value: 'professional' },
                    { label: 'Casual & Friendly', value: 'casual' },
                    { label: 'Bold & Disruptive', value: 'bold' }
                ],
                defaultValue: 'professional'
            }
        ],
        icon: <Target size={22} />,
        color: 'purple'
    },
    {
        id: 'job-market-pulse',
        title: 'Job Market Pulse',
        description: 'Analyze job descriptions & skills',
        systemPrompt: 'You are a Senior Career Strategist and Talent Acquisition Expert. You specialize in decoding complex job requirements and optimizing professional positioning.',
        userPromptTemplate: 'Analyze this job posting from the perspective of a ${roleFocus} candidate. \nInclude Salary Estimate: ${showSalary} \n\nJob Content: ${context.content}',
        inputs: [
            {
                id: 'roleFocus',
                type: 'select',
                label: 'Candidate Focus',
                options: [
                    { label: 'Technical / Engineering', value: 'technical' },
                    { label: 'Management / Ops', value: 'management' },
                    { label: 'Creative / Design', value: 'creative' }
                ],
                defaultValue: 'technical'
            },
            {
                id: 'showSalary',
                type: 'checkbox',
                label: 'Include Estimated Salary Range',
                defaultValue: true
            }
        ],
        icon: <Briefcase size={22} />,
        color: 'orange'
    },
    {
        id: 'academic-insight',
        title: 'Academic Insight',
        description: 'Source check & citation help',
        systemPrompt: 'You are a Senior Research Fellow and Academic Verification Expert. You specialize in fact-checking, bias detection, and rigorous citation standards.',
        userPromptTemplate: 'Verify this claim: ${input} \nCitation Style: ${style} \nContext: ${context.content}',
        inputs: [
            {
                id: 'input',
                type: 'textarea',
                label: 'Claim / Text to Verify',
                placeholder: 'Paste a specific claim or statement...',
            },
            {
                id: 'style',
                type: 'select',
                label: 'Citation Style',
                options: [
                    { label: 'APA 7th Edition', value: 'APA' },
                    { label: 'MLA 9th Edition', value: 'MLA' },
                    { label: 'Chicago Style', value: 'Chicago' },
                    { label: 'Harvard', value: 'Harvard' }
                ],
                defaultValue: 'APA'
            }
        ],
        icon: <GraduationCap size={22} />,
        color: 'red'
    },
    {
        id: 'lex-guard',
        title: 'LexGuard',
        description: 'Simplify legal jargon & TOS',
        systemPrompt: 'You are a Senior Legal Consultant and Risk Mitigation Specialist. You specialize in distilling complex legalese into clear, actionable risks and obligations.',
        userPromptTemplate: 'Simplify this legal text focusing on ${riskFocus}. \nOutput Complexity: ${readability} \n\nLegal Content: ${context.content}',
        inputs: [
            {
                id: 'riskFocus',
                type: 'select',
                label: 'Primary Concern',
                options: [
                    { label: 'Data Privacy & Rights', value: 'privacy' },
                    { label: 'Financial Obligations', value: 'financial' },
                    { label: 'Termination & Liability', value: 'liability' },
                    { label: 'General TL;DR', value: 'general' }
                ],
                defaultValue: 'general'
            },
            {
                id: 'readability',
                type: 'select',
                label: 'Explanantion Style',
                options: [
                    { label: 'Explain like I am 5', value: 'ultra-simple' },
                    { label: 'Business Executive', value: 'business' },
                    { label: 'Developer Focus', value: 'technical' }
                ],
                defaultValue: 'business'
            }
        ],
        icon: <ShieldCheck size={22} />,
        color: 'green'
    },
    {
        id: 'performance-pro',
        title: 'Performance Pro',
        description: 'Code review & optimization',
        systemPrompt: 'You are a Principal Software Engineer and Cloud Systems Architect. You specialize in identifying performance bottlenecks, security vulnerabilities, and architectural best practices.',
        userPromptTemplate: 'Review this ${language} code with a focus on ${focus}. \nComplexity Level: ${complexity}/10 \n\nCode Segment: ${input}',
        inputs: [
            {
                id: 'input',
                type: 'textarea',
                label: 'Code / Function Snippet',
                placeholder: 'Paste your code here...',
            },
            {
                id: 'language',
                type: 'select',
                label: 'Programming Language',
                options: [
                    { label: 'TypeScript / JS', value: 'typescript' },
                    { label: 'Python', value: 'python' },
                    { label: 'Rust', value: 'rust' },
                    { label: 'Go', value: 'go' }
                ],
                defaultValue: 'typescript'
            },
            {
                id: 'focus',
                type: 'select',
                label: 'Optimization Focus',
                options: [
                    { label: 'Runtime Performance', value: 'runtime' },
                    { label: 'Memory Usage', value: 'memory' },
                    { label: 'Security & Safety', value: 'security' },
                    { label: 'Readability & Clean Code', value: 'clean' }
                ],
                defaultValue: 'runtime'
            },
            {
                id: 'complexity',
                type: 'slider',
                label: 'Analysis Depth (1-10)',
                min: 1,
                max: 10,
                defaultValue: 7
            }
        ],
        icon: <Zap size={22} />,
        color: 'blue'
    }
];

export const Batch3Configs: AppConfig[] = [
    {
        id: 'sentiment-pulse',
        title: 'Sentiment Pulse',
        description: 'Analyze emotional tone & vibe',
        systemPrompt: 'You are an Expert Sentiment Analyst and Emotional Intelligence AI. You specialize in detecting subtle emotional nuances, tone shifts, and underlying sentiment in text.',
        userPromptTemplate: 'Analyze the sentiment of this text. \nFocus: ${focus} \n\nText Context: ${context.content}',
        inputs: [
            {
                id: 'focus',
                type: 'select',
                label: 'Analysis Focus',
                options: [
                    { label: 'General Vibe', value: 'general' },
                    { label: 'Customer Satisfaction', value: 'customer' },
                    { label: 'Conflict / Hostility', value: 'conflict' }
                ],
                defaultValue: 'general'
            }
        ],
        icon: <Heart size={22} />,
        color: 'red'
    },
    {
        id: 'travel-scout',
        title: 'Travel Scout',
        description: 'Plan trips from page content',
        systemPrompt: 'You are a World-Class Travel Planner and Local Guide. You create perfectly tailored itineraries based on locations found in text.',
        userPromptTemplate: 'Create a travel plan based on locations mentioned here. \nTravel Style: ${style} \nDuration: ${duration} \n\nContext: ${context.content}',
        inputs: [
            {
                id: 'style',
                type: 'select',
                label: 'Travel Style',
                options: [
                    { label: 'Luxury & Relaxation', value: 'luxury' },
                    { label: 'Adventure & Backpacking', value: 'adventure' },
                    { label: 'Family Friendly', value: 'family' },
                    { label: 'Foodie Tour', value: 'foodie' }
                ],
                defaultValue: 'adventure'
            },
            {
                id: 'duration',
                type: 'select',
                label: 'Trip Duration',
                options: [
                    { label: 'Day Trip', value: '1 day' },
                    { label: 'Weekend Getaway', value: '3 days' },
                    { label: 'Full Week', value: '7 days' }
                ],
                defaultValue: '3 days'
            }
        ],
        icon: <Plane size={22} />,
        color: 'blue'
    },
    {
        id: 'code-morph',
        title: 'Code Morph',
        description: 'Translate code between languages',
        systemPrompt: 'You are a Polyglot Software Architect. You specialize in translating code paradigms perfectly between languages while maintaining idiomatic correctness.',
        userPromptTemplate: 'Translate the following code from ${sourceLang} to ${targetLang}. \nAnalysis: ${context.content} \n\nCode Snippet: ${code}',
        inputs: [
            {
                id: 'code',
                type: 'textarea',
                label: 'Code to Translate',
                placeholder: 'Paste code here...',
            },
            {
                id: 'sourceLang',
                type: 'select',
                label: 'Source Language',
                options: [
                    { label: 'Auto Detect', value: 'auto' },
                    { label: 'Python', value: 'python' },
                    { label: 'JavaScript/TS', value: 'javascript' },
                    { label: 'Java', value: 'java' }
                ],
                defaultValue: 'auto'
            },
            {
                id: 'targetLang',
                type: 'select',
                label: 'Target Language',
                options: [
                    { label: 'Python', value: 'python' },
                    { label: 'TypeScript', value: 'typescript' },
                    { label: 'Rust', value: 'rust' },
                    { label: 'Go', value: 'go' }
                ],
                defaultValue: 'typescript'
            }
        ],
        icon: <Code2 size={22} />,
        color: 'green'
    },
    {
        id: 'recipe-remix',
        title: 'Recipe Remix',
        description: 'Extract & modify recipes',
        systemPrompt: 'You are a Michelin Star Chef and Food Scientist. You excel at deconstructing recipes and reinventing them for dietary needs or flavor profiles.',
        userPromptTemplate: 'Extract the recipe from this page and modify it for: ${diet}. \nContext: ${context.content}',
        inputs: [
            {
                id: 'diet',
                type: 'select',
                label: 'Dietary Modification',
                options: [
                    { label: 'No Changes (Just Extract)', value: 'none' },
                    { label: 'Keto / Low Carb', value: 'keto' },
                    { label: 'Vegan', value: 'vegan' },
                    { label: 'Gluten Free', value: 'gluten-free' }
                ],
                defaultValue: 'none'
            }
        ],
        icon: <Utensils size={22} />,
        color: 'orange'
    },
    {
        id: 'fact-check-pro',
        title: 'Fact Check Pro',
        description: 'Spot fallacies & bias',
        systemPrompt: 'You are a Logic Professor and Investigative Journalist. You identify logical fallacies, cognitive biases, and unsupported claims with ruthless precision.',
        userPromptTemplate: 'Analyze this text for logical fallacies and bias. \nText: ${context.content}',
        inputs: [],
        icon: <CheckCircle size={22} />,
        color: 'red'
    },
    {
        id: 'social-viral',
        title: 'Social Viral',
        description: 'Create viral social posts',
        systemPrompt: 'You are a Viral Marketing Expert and Social Media Ghostwriter. You know exactly what hooks attention on Twitter, LinkedIn, and Instagram.',
        userPromptTemplate: 'Turn this content into a ${platform} thread/post. \nVibe: ${vibe} \n\nContent: ${context.content}',
        inputs: [
            {
                id: 'platform',
                type: 'select',
                label: 'Platform',
                options: [
                    { label: 'Twitter / X Thread', value: 'twitter' },
                    { label: 'LinkedIn Post', value: 'linkedin' },
                    { label: 'Instagram Caption', value: 'instagram' }
                ],
                defaultValue: 'twitter'
            },
            {
                id: 'vibe',
                type: 'select',
                label: 'Vibe',
                options: [
                    { label: 'Controversial / Hot Take', value: 'controversial' },
                    { label: 'Inspirational / Story', value: 'inspirational' },
                    { label: 'Educational / Value', value: 'educational' }
                ],
                defaultValue: 'educational'
            }
        ],
        icon: <Share2 size={22} />,
        color: 'purple'
    },
    {
        id: 'regex-wizard',
        title: 'Regex Wizard',
        description: 'Text to RegEx generator',
        systemPrompt: 'You are a Regular Expression Grandmaster. You translate plain English requirements into optimized, safe RegEx patterns.',
        userPromptTemplate: 'Create a Regex for: ${requirement}. \nTarget Flavor: ${flavor}',
        inputs: [
            {
                id: 'requirement',
                type: 'textarea',
                label: 'Describe what to match',
                placeholder: 'e.g. A valid email address that ends in .edu',
            },
            {
                id: 'flavor',
                type: 'select',
                label: 'Regex Flavor',
                options: [
                    { label: 'JavaScript / ES', value: 'javascript' },
                    { label: 'Python (re)', value: 'python' },
                    { label: 'PCRE (PHP/Perl)', value: 'pcre' }
                ],
                defaultValue: 'javascript'
            }
        ],
        icon: <Terminal size={22} />,
        color: 'yellow'
    },
    {
        id: 'color-extract',
        title: 'Color Extract',
        description: 'Generate palette from text',
        systemPrompt: 'You are an AI Colorist and Designer. You extract the visual mood of a text and generate a hex color palette that matches it perfectly.',
        userPromptTemplate: 'Generate a color palette based on this content. \nContext: ${context.content}',
        inputs: [],
        icon: <Palette size={22} />,
        color: 'purple'
    },
    {
        id: 'eli5-explainer',
        title: 'Explain Like I\'m 5',
        description: 'Simplify complex topics',
        systemPrompt: 'You are a Kindergarden Teacher with a PhD in Physics. You explain the most complex topics using simple analogies that a 5 year old could understand.',
        userPromptTemplate: 'Explain this concept: ${input} \nContext: ${context.content}',
        inputs: [
            {
                id: 'input',
                type: 'text',
                label: 'Topic to Explain',
                placeholder: 'e.g. Quantum Entanglement'
            }
        ],
        icon: <Baby size={22} />,
        color: 'red'
    },
    {
        id: 'idea-spark',
        title: 'Idea Spark',
        description: 'Brainstorm startup ideas',
        systemPrompt: 'You are a Silicon Valley Venture Capitalist and Ideation Guru. You generate billion-dollar startup ideas based on problems found in content.',
        userPromptTemplate: 'Generate 3 startup ideas based on the problems/topics in this text. \nContext: ${context.content}',
        inputs: [],
        icon: <Lightbulb size={22} />,
        color: 'yellow'
    },
    {
        id: 'ask-expert',
        title: 'Ask The Expert',
        description: 'Consult a specific persona',
        systemPrompt: 'You are an AI Chameleon. You absorb the persona of a specific expert and analyze content strictly from their perspective.',
        userPromptTemplate: 'Analyze this content as a ${expert}. \nContent: ${context.content}',
        inputs: [
            {
                id: 'expert',
                type: 'select',
                label: 'Choose Expert Persona',
                options: [
                    { label: 'Corporate Lawyer', value: 'lawyer' },
                    { label: 'Medical Doctor', value: 'doctor' },
                    { label: 'Security Engineer', value: 'hacker' },
                    { label: 'Financial Advisor', value: 'finance' }
                ],
                defaultValue: 'lawyer'
            }
        ],
        icon: <UserCheck size={22} />,
        color: 'blue'
    }
];

export const Batch4Configs: AppConfig[] = [
    {
        id: 'tldr-summary',
        title: 'TL;DR Summary',
        description: 'Instant concise summaries',
        systemPrompt: 'You are a World-Class Summarizer. You distill long content into clear, punchy summaries without losing key insights.',
        userPromptTemplate: 'Create a ${length} summary of this content.\n\nContent: ${context.content}',
        inputs: [
            {
                id: 'length',
                type: 'select',
                label: 'Summary Length',
                options: [
                    { label: 'One Sentence', value: 'single sentence' },
                    { label: 'Short Paragraph', value: 'short 2-3 sentence' },
                    { label: 'Detailed Summary', value: 'comprehensive multi-paragraph' }
                ],
                defaultValue: 'short 2-3 sentence'
            }
        ],
        icon: <FileText size={22} />,
        color: 'blue',
        outputFormat: 'text',
        requiresPageContext: true
    },
    {
        id: 'reply-suggester',
        title: 'Reply Suggester',
        description: 'Generate smart email replies',
        systemPrompt: 'You are an Expert Email Strategist. You craft perfectly calibrated responses at three depth levels: quick acknowledgment, thoughtful paragraph, and detailed response.',
        userPromptTemplate: 'Generate 3 reply options (quick, thoughtful, detailed) for this email in a ${tone} tone.\n\nEmail: ${email}',
        inputs: [
            {
                id: 'email',
                type: 'textarea',
                label: 'Email to Reply To',
                placeholder: 'Paste the email you received...',
                required: true
            },
            {
                id: 'tone',
                type: 'select',
                label: 'Desired Tone',
                options: [
                    { label: 'Professional', value: 'professional' },
                    { label: 'Friendly', value: 'friendly' },
                    { label: 'Casual', value: 'casual' },
                    { label: 'Firm', value: 'firm' },
                    { label: 'Urgent', value: 'urgent' }
                ],
                defaultValue: 'professional'
            }
        ],
        icon: <MessageSquareReply size={22} />,
        color: 'orange'
    },
    {
        id: 'schema-markup',
        title: 'Schema Markup',
        description: 'Generate SEO JSON-LD markup',
        systemPrompt: 'You are an SEO Schema Expert. You generate valid JSON-LD structured data markup for websites based on content analysis.',
        userPromptTemplate: 'Generate a complete ${schemaType} JSON-LD schema markup based on this content.\n\nContent: ${context.content}\n\nProvide the full JSON-LD code ready to paste into HTML.',
        inputs: [
            {
                id: 'schemaType',
                type: 'select',
                label: 'Schema Type',
                options: [
                    { label: 'FAQ Page', value: 'FAQPage' },
                    { label: 'Product', value: 'Product' },
                    { label: 'Article', value: 'Article' },
                    { label: 'Organization', value: 'Organization' },
                    { label: 'Local Business', value: 'LocalBusiness' },
                    { label: 'How-To', value: 'HowTo' }
                ],
                defaultValue: 'Article'
            }
        ],
        icon: <Layers size={22} />,
        color: 'purple',
        requiresPageContext: true
    },
    {
        id: 'bullet-pointer',
        title: 'Bullet Pointer',
        description: 'Convert text to bullet points',
        systemPrompt: 'You are a Clarity Expert. You transform dense text into clean, scannable bullet points that capture all key information.',
        userPromptTemplate: 'Convert this content into ${style} bullet points. Maximum ${maxPoints} points.\n\nContent: ${context.content}',
        inputs: [
            {
                id: 'style',
                type: 'select',
                label: 'Bullet Style',
                options: [
                    { label: 'Key Facts Only', value: 'factual key' },
                    { label: 'Action Items', value: 'actionable task-oriented' },
                    { label: 'Summary Points', value: 'summarized' },
                    { label: 'Pros & Cons', value: 'pros and cons' }
                ],
                defaultValue: 'summarized'
            },
            {
                id: 'maxPoints',
                type: 'select',
                label: 'Max Points',
                options: [
                    { label: '5 Points', value: '5' },
                    { label: '10 Points', value: '10' },
                    { label: '15 Points', value: '15' }
                ],
                defaultValue: '10'
            }
        ],
        icon: <ListChecks size={22} />,
        color: 'green',
        outputFormat: 'text',
        requiresPageContext: true
    },
    {
        id: 'headline-generator',
        title: 'Headline Generator',
        description: 'Create viral headlines & titles',
        systemPrompt: 'You are a Viral Marketing Expert and Copywriter. You craft attention-grabbing headlines that drive clicks while staying truthful.',
        userPromptTemplate: 'Generate 5 ${style} headlines for ${platform} based on this content.\n\nContent: ${context.content}',
        inputs: [
            {
                id: 'style',
                type: 'select',
                label: 'Headline Style',
                options: [
                    { label: 'Clickbait (Ethical)', value: 'curiosity-driven clickable' },
                    { label: 'Professional', value: 'professional straightforward' },
                    { label: 'SEO Optimized', value: 'SEO-optimized keyword-rich' },
                    { label: 'Emotional Hook', value: 'emotionally compelling' }
                ],
                defaultValue: 'curiosity-driven clickable'
            },
            {
                id: 'platform',
                type: 'select',
                label: 'Platform',
                options: [
                    { label: 'Blog / Article', value: 'blog articles' },
                    { label: 'YouTube', value: 'YouTube videos' },
                    { label: 'LinkedIn', value: 'LinkedIn posts' },
                    { label: 'Email Subject', value: 'email subject lines' }
                ],
                defaultValue: 'blog articles'
            }
        ],
        icon: <Megaphone size={22} />,
        color: 'red',
        requiresPageContext: true
    },
    {
        id: 'tone-rewriter',
        title: 'Tone Rewriter',
        description: 'Rewrite text in different tones',
        systemPrompt: 'You are a Master Copywriter. You rewrite content while preserving meaning but completely transforming the tone and style.',
        userPromptTemplate: 'Rewrite this text in a ${targetTone} tone for a ${audience} audience.\n\nOriginal Text: ${text}',
        inputs: [
            {
                id: 'text',
                type: 'textarea',
                label: 'Text to Rewrite',
                placeholder: 'Paste the text you want to rewrite...',
                required: true
            },
            {
                id: 'targetTone',
                type: 'select',
                label: 'Target Tone',
                options: [
                    { label: 'Professional', value: 'professional corporate' },
                    { label: 'Casual & Fun', value: 'casual fun conversational' },
                    { label: 'Academic', value: 'formal academic scholarly' },
                    { label: 'Persuasive', value: 'persuasive compelling sales' },
                    { label: 'Empathetic', value: 'warm empathetic supportive' }
                ],
                defaultValue: 'professional corporate'
            },
            {
                id: 'audience',
                type: 'select',
                label: 'Target Audience',
                options: [
                    { label: 'General Public', value: 'general public' },
                    { label: 'Executives', value: 'C-level executives' },
                    { label: 'Technical', value: 'technical developers' },
                    { label: 'Students', value: 'students' }
                ],
                defaultValue: 'general public'
            }
        ],
        icon: <PenTool size={22} />,
        color: 'purple',
        outputFormat: 'text'
    },
    {
        id: 'bug-report-writer',
        title: 'Bug Report Writer',
        description: 'Create detailed bug reports',
        systemPrompt: 'You are a Senior QA Engineer. You write clear, actionable bug reports that developers love because they have all necessary details.',
        userPromptTemplate: 'Create a professional bug report based on this description.\n\nSeverity: ${severity}\nBug Description: ${description}\n\nInclude: Summary, Steps to Reproduce, Expected vs Actual Behavior, Environment details, and Suggested Priority.',
        inputs: [
            {
                id: 'description',
                type: 'textarea',
                label: 'Describe the Bug',
                placeholder: 'What went wrong? What did you expect to happen?',
                required: true
            },
            {
                id: 'severity',
                type: 'select',
                label: 'Severity',
                options: [
                    { label: 'Critical - System Down', value: 'Critical' },
                    { label: 'High - Major Feature Broken', value: 'High' },
                    { label: 'Medium - Feature Impaired', value: 'Medium' },
                    { label: 'Low - Minor Issue', value: 'Low' }
                ],
                defaultValue: 'Medium'
            }
        ],
        icon: <Bug size={22} />,
        color: 'red'
    },
    {
        id: 'glossary-generator',
        title: 'Glossary Generator',
        description: 'Extract & define key terms',
        systemPrompt: 'You are a Technical Lexicographer. You identify and define important terms, jargon, and concepts from text in clear, accessible language.',
        userPromptTemplate: 'Extract and define the ${count} most important terms from this content. Include simple definitions.\n\nContent: ${context.content}',
        inputs: [
            {
                id: 'count',
                type: 'select',
                label: 'Number of Terms',
                options: [
                    { label: '5 Terms', value: '5' },
                    { label: '10 Terms', value: '10' },
                    { label: '15 Terms', value: '15' },
                    { label: '20 Terms', value: '20' }
                ],
                defaultValue: '10'
            }
        ],
        icon: <BookOpen size={22} />,
        color: 'blue',
        requiresPageContext: true
    },
    {
        id: 'translator-pro',
        title: 'Translator Pro',
        description: 'Smart contextual translation',
        systemPrompt: 'You are a Professional Translator with expertise in maintaining tone, idioms, and cultural context across languages.',
        userPromptTemplate: 'Translate this text to ${targetLang}. Maintain the ${style} style.\n\nText: ${text}',
        inputs: [
            {
                id: 'text',
                type: 'textarea',
                label: 'Text to Translate',
                placeholder: 'Enter text to translate...',
                required: true
            },
            {
                id: 'targetLang',
                type: 'select',
                label: 'Target Language',
                options: [
                    { label: 'Spanish', value: 'Spanish' },
                    { label: 'French', value: 'French' },
                    { label: 'German', value: 'German' },
                    { label: 'Chinese (Simplified)', value: 'Chinese Simplified' },
                    { label: 'Japanese', value: 'Japanese' },
                    { label: 'Portuguese', value: 'Portuguese' },
                    { label: 'Italian', value: 'Italian' },
                    { label: 'Korean', value: 'Korean' }
                ],
                defaultValue: 'Spanish'
            },
            {
                id: 'style',
                type: 'select',
                label: 'Translation Style',
                options: [
                    { label: 'Formal / Business', value: 'formal business' },
                    { label: 'Casual / Conversational', value: 'casual conversational' },
                    { label: 'Technical / Precise', value: 'technical precise' }
                ],
                defaultValue: 'formal business'
            }
        ],
        icon: <Languages size={22} />,
        color: 'green',
        outputFormat: 'text'
    },
    {
        id: 'content-refresher',
        title: 'Content Refresher',
        description: 'Update outdated content',
        systemPrompt: 'You are a Content Strategist. You identify outdated information and suggest modern updates while preserving the core message.',
        userPromptTemplate: 'Analyze this content and suggest updates to make it current for ${year}. Focus on ${focus}.\n\nContent: ${context.content}',
        inputs: [
            {
                id: 'year',
                type: 'select',
                label: 'Target Year',
                options: [
                    { label: '2025', value: '2025' },
                    { label: '2026', value: '2026' }
                ],
                defaultValue: '2025'
            },
            {
                id: 'focus',
                type: 'select',
                label: 'Update Focus',
                options: [
                    { label: 'Statistics & Data', value: 'statistics and data' },
                    { label: 'Technology References', value: 'technology and tools' },
                    { label: 'Industry Trends', value: 'industry trends and practices' },
                    { label: 'Complete Refresh', value: 'all aspects comprehensively' }
                ],
                defaultValue: 'all aspects comprehensively'
            }
        ],
        icon: <RefreshCw size={22} />,
        color: 'orange',
        requiresPageContext: true
    },
    {
        id: 'reading-time',
        title: 'Reading Time Analyzer',
        description: 'Analyze readability & time',
        systemPrompt: 'You are a Readability Expert. You analyze text complexity, reading time, and accessibility.',
        userPromptTemplate: 'Analyze this content and provide: reading time, grade level, complexity score (1-10), and 3 suggestions to improve readability.\n\nContent: ${context.content}',
        inputs: [],
        icon: <Clock size={22} />,
        color: 'blue',
        requiresPageContext: true
    },
    {
        id: 'cta-generator',
        title: 'CTA Generator',
        description: 'Create compelling call-to-actions',
        systemPrompt: 'You are a Conversion Copywriter. You craft irresistible calls-to-action that drive clicks and conversions.',
        userPromptTemplate: 'Generate 5 ${style} CTAs for a ${type} that encourages ${action}.',
        inputs: [
            {
                id: 'type',
                type: 'select',
                label: 'CTA Type',
                options: [
                    { label: 'Button Text', value: 'button' },
                    { label: 'Banner / Hero', value: 'banner headline' },
                    { label: 'Email CTA', value: 'email call-to-action' },
                    { label: 'Pop-up', value: 'popup modal' }
                ],
                defaultValue: 'button'
            },
            {
                id: 'action',
                type: 'select',
                label: 'Desired Action',
                options: [
                    { label: 'Sign Up / Subscribe', value: 'signing up or subscribing' },
                    { label: 'Purchase / Buy', value: 'making a purchase' },
                    { label: 'Download', value: 'downloading content' },
                    { label: 'Learn More', value: 'learning more or exploring' },
                    { label: 'Contact Us', value: 'contacting or reaching out' }
                ],
                defaultValue: 'signing up or subscribing'
            },
            {
                id: 'style',
                type: 'select',
                label: 'CTA Style',
                options: [
                    { label: 'Urgent / FOMO', value: 'urgent scarcity-driven' },
                    { label: 'Friendly / Inviting', value: 'friendly welcoming' },
                    { label: 'Professional', value: 'professional straightforward' },
                    { label: 'Playful / Fun', value: 'playful creative' }
                ],
                defaultValue: 'urgent scarcity-driven'
            }
        ],
        icon: <Target size={22} />,
        color: 'green'
    }
];

// Batch 5 - Business & Productivity Tools
export const Batch5Configs: AppConfig[] = [
    {
        id: 'jargon-decoder',
        title: 'Jargon Decoder',
        description: 'Translate corporate-speak to plain English',
        systemPrompt: 'You are a Business Language Translator. You convert complex corporate jargon, technical terms, and buzzwords into clear, plain English explanations with helpful context.',
        userPromptTemplate: 'Decode this ${direction}:\n\n"${text}"\n\nProvide:\n1. Plain English translation\n2. Why this phrase is commonly used\n3. When to use/avoid it\n4. A better alternative if applicable',
        inputs: [
            {
                id: 'text',
                type: 'textarea',
                label: 'Text to Decode',
                placeholder: 'e.g., "Let\'s leverage our synergies to move the needle..."',
                required: true
            },
            {
                id: 'direction',
                type: 'select',
                label: 'Translation Direction',
                options: [
                    { label: 'Jargon → Plain English', value: 'jargon to plain English' },
                    { label: 'Plain English → Corporate', value: 'plain English to professional corporate language' },
                    { label: 'Tech Speak → Simple', value: 'technical jargon to simple terms' }
                ],
                defaultValue: 'jargon to plain English'
            }
        ],
        icon: <MessageCircle size={22} />,
        color: 'purple',
        outputFormat: 'markdown'
    },
    {
        id: 'decision-matrix',
        title: 'Quick Decision Matrix',
        description: 'AI-powered weighted pros/cons analysis',
        systemPrompt: 'You are a Decision Science Expert. You help people make objective, well-reasoned decisions using weighted decision matrices and structured analysis.',
        userPromptTemplate: 'Create a weighted decision matrix for this choice:\n\nDecision: ${decision}\nOptions: ${options}\n\nAnalyze each option against key criteria, assign weights based on importance, score each option, and provide a clear recommendation with reasoning.',
        inputs: [
            {
                id: 'decision',
                type: 'textarea',
                label: 'Decision to Make',
                placeholder: 'e.g., "Which city should I relocate to for my new job?"',
                required: true
            },
            {
                id: 'options',
                type: 'textarea',
                label: 'Options (one per line)',
                placeholder: 'Option 1\nOption 2\nOption 3',
                required: true
            }
        ],
        icon: <Scale size={22} />,
        color: 'blue',
        outputFormat: 'markdown'
    },
    {
        id: 'excuse-generator',
        title: 'Graceful Excuse Generator',
        description: 'Professional, polite excuses for any situation',
        systemPrompt: 'You are a Professional Communication Expert. You help craft believable, polite, and professional excuses that maintain relationships while handling difficult situations gracefully.',
        userPromptTemplate: 'Generate a ${tone} excuse for this situation:\n\nSituation: ${situation}\nContext: ${context}\n\nProvide 3 options with varying levels of detail. Each should be believable, professional, and maintain the relationship.',
        inputs: [
            {
                id: 'situation',
                type: 'select',
                label: 'Situation Type',
                options: [
                    { label: 'Late to Meeting', value: 'being late to a meeting' },
                    { label: 'Missed Deadline', value: 'missing a deadline' },
                    { label: 'Declining Invitation', value: 'declining a social/work invitation' },
                    { label: 'Leaving Early', value: 'needing to leave an event early' },
                    { label: 'Rescheduling', value: 'needing to reschedule a commitment' },
                    { label: 'Custom', value: 'a specific situation described below' }
                ],
                defaultValue: 'being late to a meeting'
            },
            {
                id: 'context',
                type: 'textarea',
                label: 'Additional Context',
                placeholder: 'Any specific details about the situation...'
            },
            {
                id: 'tone',
                type: 'select',
                label: 'Tone',
                options: [
                    { label: 'Highly Professional', value: 'formal and highly professional' },
                    { label: 'Friendly Professional', value: 'warm but professional' },
                    { label: 'Casual', value: 'casual and friendly' }
                ],
                defaultValue: 'warm but professional'
            }
        ],
        icon: <Calendar size={22} />,
        color: 'orange',
        outputFormat: 'markdown'
    },
    {
        id: 'email-warmth',
        title: 'Cold Email Analyzer',
        description: 'Analyze emails for warmth & spam triggers',
        systemPrompt: 'You are an Email Deliverability Expert. You analyze cold emails for warmth, personalization, clarity, and spam triggers to maximize reply rates and inbox placement.',
        userPromptTemplate: 'Analyze this cold email:\n\n${email}\n\nProvide:\n1. Warmth Score (1-10)\n2. Personalization Score (1-10)\n3. Clarity Score (1-10)\n4. Spam Trigger Analysis (list any red flags)\n5. Specific improvements with rewritten examples\n6. Overall reply rate prediction',
        inputs: [
            {
                id: 'email',
                type: 'textarea',
                label: 'Email to Analyze',
                placeholder: 'Paste your cold email here...',
                required: true
            }
        ],
        icon: <Thermometer size={22} />,
        color: 'red',
        outputFormat: 'markdown'
    },
    {
        id: 'nda-creator',
        title: 'NDA Creator',
        description: 'Generate professional NDAs in seconds',
        systemPrompt: 'You are a Legal Document Specialist. You draft clear, professional Non-Disclosure Agreements tailored to specific needs. Always include a disclaimer that this is for informational purposes and should be reviewed by a qualified attorney.',
        userPromptTemplate: 'Draft a ${ndaType} NDA for:\n\nDisclosing Party: ${disclosingParty}\nReceiving Party: ${receivingParty}\nPurpose: ${purpose}\nJurisdiction: ${jurisdiction}\n\nInclude standard clauses for confidential information definition, obligations, term, and remedies.',
        inputs: [
            {
                id: 'ndaType',
                type: 'select',
                label: 'NDA Type',
                options: [
                    { label: 'Mutual (Two-way)', value: 'mutual (two-way)' },
                    { label: 'One-way (Standard)', value: 'one-way standard' },
                    { label: 'Employee NDA', value: 'employee confidentiality' }
                ],
                defaultValue: 'mutual (two-way)'
            },
            {
                id: 'disclosingParty',
                type: 'text',
                label: 'Disclosing Party Name',
                placeholder: 'Company or person name',
                required: true
            },
            {
                id: 'receivingParty',
                type: 'text',
                label: 'Receiving Party Name',
                placeholder: 'Company or person name',
                required: true
            },
            {
                id: 'purpose',
                type: 'textarea',
                label: 'Purpose of Disclosure',
                placeholder: 'e.g., Evaluating potential business partnership...',
                required: true
            },
            {
                id: 'jurisdiction',
                type: 'select',
                label: 'Jurisdiction',
                options: [
                    { label: 'United States (General)', value: 'United States' },
                    { label: 'California, USA', value: 'State of California, USA' },
                    { label: 'New York, USA', value: 'State of New York, USA' },
                    { label: 'United Kingdom', value: 'United Kingdom' },
                    { label: 'European Union', value: 'European Union' },
                    { label: 'Germany', value: 'Germany' }
                ],
                defaultValue: 'United States'
            }
        ],
        icon: <FileSignature size={22} />,
        color: 'slate',
        outputFormat: 'markdown'
    },
    {
        id: 'sop-genius',
        title: 'SOP Genius',
        description: 'Transform any process into a professional SOP',
        systemPrompt: 'You are a Process Documentation Expert. You transform informal process descriptions into clear, professional Standard Operating Procedures with numbered steps, visual aid suggestions, checklists, and quality control points.',
        userPromptTemplate: 'Create a ${format} SOP for this process:\n\n${processDescription}\n\nInclude:\n1. Purpose & Scope\n2. Required Materials/Tools\n3. Step-by-step Instructions\n4. Quality Checkpoints\n5. Troubleshooting Tips\n6. Visual Aid Suggestions',
        inputs: [
            {
                id: 'processDescription',
                type: 'textarea',
                label: 'Describe the Process',
                placeholder: 'Describe the process in your own words. Be as detailed as possible...',
                required: true
            },
            {
                id: 'format',
                type: 'select',
                label: 'SOP Format',
                options: [
                    { label: 'Standard (Detailed)', value: 'detailed standard' },
                    { label: 'Quick Reference', value: 'concise quick-reference' },
                    { label: 'Training Manual Style', value: 'training-focused' },
                    { label: 'Checklist Format', value: 'checklist-based' }
                ],
                defaultValue: 'detailed standard'
            }
        ],
        icon: <ClipboardCheck size={22} />,
        color: 'teal',
        outputFormat: 'markdown'
    },
    {
        id: 'pitch-deck-outline',
        title: 'Pitch Deck Pro',
        description: 'Generate VC-ready pitch deck outlines',
        systemPrompt: 'You are a Startup Pitch Consultant who has helped companies raise millions. You create compelling, investor-ready pitch deck outlines following the proven 10-12 slide VC structure.',
        userPromptTemplate: 'Create a pitch deck outline for:\n\nCompany: ${companyName}\nOne-liner: ${oneLiner}\nStage: ${stage}\nAsk: ${fundingAsk}\n\nGenerate content for each slide: Problem, Solution, Market Size, Business Model, Traction, Team, Competition, Go-to-Market, Financials, and Ask.',
        inputs: [
            {
                id: 'companyName',
                type: 'text',
                label: 'Company Name',
                placeholder: 'Your startup name',
                required: true
            },
            {
                id: 'oneLiner',
                type: 'textarea',
                label: 'One-liner Description',
                placeholder: 'We help [target] achieve [outcome] by [solution]...',
                required: true
            },
            {
                id: 'stage',
                type: 'select',
                label: 'Company Stage',
                options: [
                    { label: 'Pre-seed / Idea', value: 'pre-seed' },
                    { label: 'Seed', value: 'seed' },
                    { label: 'Series A', value: 'Series A' },
                    { label: 'Series B+', value: 'Series B or later' }
                ],
                defaultValue: 'seed'
            },
            {
                id: 'fundingAsk',
                type: 'text',
                label: 'Funding Ask',
                placeholder: 'e.g., $1.5M for 18 months runway'
            }
        ],
        icon: <Presentation size={22} />,
        color: 'indigo',
        outputFormat: 'markdown'
    },
    {
        id: 'deal-designer',
        title: 'Win-Win Deal Designer',
        description: 'Design creative partnership structures',
        systemPrompt: 'You are a Negotiation Architect specializing in creative deal structures. You help find win-win solutions by identifying non-monetary value-adds like equity, referrals, exposure, and strategic partnerships.',
        userPromptTemplate: 'Design a win-win deal structure for:\n\nYour Position: ${yourPosition}\nTheir Position: ${theirPosition}\nSticking Point: ${stickingPoint}\n\nSuggest 3 creative deal structures that go beyond simple price/terms negotiations. Include non-monetary value-adds and explain the mutual benefits.',
        inputs: [
            {
                id: 'yourPosition',
                type: 'textarea',
                label: 'Your Position & Goals',
                placeholder: 'What you want to achieve, your constraints...',
                required: true
            },
            {
                id: 'theirPosition',
                type: 'textarea',
                label: 'Their Position & Goals',
                placeholder: 'What you know about their needs/constraints...',
                required: true
            },
            {
                id: 'stickingPoint',
                type: 'textarea',
                label: 'Current Sticking Point',
                placeholder: 'What\'s blocking the deal from closing...',
                required: true
            }
        ],
        icon: <Handshake size={22} />,
        color: 'emerald',
        outputFormat: 'markdown'
    },
    {
        id: 'skill-card',
        title: 'Skill Card Builder',
        description: 'Create professional skill profile cards',
        systemPrompt: 'You are a Career Coach and Personal Branding Expert. You help professionals articulate their skills, competencies, and unique value proposition through structured skill cards.',
        userPromptTemplate: 'Create a professional skill card for:\n\nRole/Title: ${role}\nExperience: ${experience}\nKey Achievements: ${achievements}\n\nGenerate:\n1. Core Technical Skills (with proficiency levels)\n2. Soft Skills & Collaboration Style\n3. Unique Value Proposition\n4. Growth Areas\n5. Ideal Team/Project Fit',
        inputs: [
            {
                id: 'role',
                type: 'text',
                label: 'Current Role/Title',
                placeholder: 'e.g., Senior Product Manager',
                required: true
            },
            {
                id: 'experience',
                type: 'textarea',
                label: 'Experience Summary',
                placeholder: 'Brief overview of your background...',
                required: true
            },
            {
                id: 'achievements',
                type: 'textarea',
                label: 'Key Achievements',
                placeholder: 'List 3-5 notable achievements...'
            }
        ],
        icon: <Award size={22} />,
        color: 'amber',
        outputFormat: 'markdown'
    }
];
