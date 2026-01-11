import React, { useState } from 'react';
import {
    RefreshCw,
    Upload,
    Loader2,
    Copy,
    Check,
    Download,
    AlertCircle,
    Sparkles,
    Twitter,
    Linkedin,
    FileText,
    Mail,
    MessageSquare,
    Hash,
    Newspaper,
    Video,
    Podcast,
    ChevronDown,
    ChevronUp,
    Plus
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';
import { useIntegrations } from '../../hooks/useIntegrations';
import SendToIntegrations from '../../components/SendToIntegrations';

type ContentFormat = 'twitter-thread' | 'linkedin-post' | 'newsletter' | 'blog-post' | 'video-script' | 'podcast-outline' | 'instagram-carousel' | 'email-sequence';

interface RepurposedContent {
    format: ContentFormat;
    title: string;
    content: string;
    metadata?: {
        wordCount?: number;
        readTime?: string;
        hashtags?: string[];
        hooks?: string[];
    };
}

const formatConfig: Record<ContentFormat, { label: string; icon: React.ReactNode; description: string }> = {
    'twitter-thread': {
        label: 'Twitter Thread',
        icon: <Twitter size={14} />,
        description: 'Engaging thread with hooks and takeaways'
    },
    'linkedin-post': {
        label: 'LinkedIn Post',
        icon: <Linkedin size={14} />,
        description: 'Professional post with value and CTA'
    },
    'newsletter': {
        label: 'Newsletter',
        icon: <Mail size={14} />,
        description: 'Email newsletter with sections'
    },
    'blog-post': {
        label: 'Blog Post',
        icon: <Newspaper size={14} />,
        description: 'SEO-optimized article'
    },
    'video-script': {
        label: 'Video Script',
        icon: <Video size={14} />,
        description: 'YouTube/TikTok script with hooks'
    },
    'podcast-outline': {
        label: 'Podcast Outline',
        icon: <Podcast size={14} />,
        description: 'Episode outline with talking points'
    },
    'instagram-carousel': {
        label: 'Instagram Carousel',
        icon: <Hash size={14} />,
        description: 'Slide-by-slide carousel content'
    },
    'email-sequence': {
        label: 'Email Sequence',
        icon: <MessageSquare size={14} />,
        description: '3-5 email nurture sequence'
    }
};

const ContentRepurposerApp: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading: aiLoading } = useGemini();
    const { success, warning, info } = useToast();
    const { integrations } = useIntegrations();

    const [inputText, setInputText] = useState('');
    const [selectedFormats, setSelectedFormats] = useState<ContentFormat[]>(['twitter-thread', 'linkedin-post']);
    const [repurposedContent, setRepurposedContent] = useState<RepurposedContent[]>([]);
    const [processing, setProcessing] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [expandedContent, setExpandedContent] = useState<string | null>(null);
    const [tone, setTone] = useState<'professional' | 'casual' | 'educational' | 'inspirational'>('professional');

    const extractFromPage = () => {
        if (context?.content) {
            setInputText(context.content.substring(0, 10000));
            info('Page content loaded');
        } else {
            warning('No page content available');
        }
    };

    const toggleFormat = (format: ContentFormat) => {
        if (selectedFormats.includes(format)) {
            setSelectedFormats(selectedFormats.filter(f => f !== format));
        } else {
            setSelectedFormats([...selectedFormats, format]);
        }
    };

    const repurposeContent = async () => {
        if (!inputText.trim()) {
            warning('Please enter content to repurpose');
            return;
        }

        if (selectedFormats.length === 0) {
            warning('Please select at least one output format');
            return;
        }

        setProcessing(true);
        setRepurposedContent([]);

        try {
            const formatInstructions = selectedFormats.map(format => {
                switch (format) {
                    case 'twitter-thread':
                        return `Twitter Thread:
- Create a compelling hook for the first tweet
- Break into 5-10 tweets (max 280 chars each)
- Include engagement questions
- End with a CTA
- Suggest relevant hashtags`;

                    case 'linkedin-post':
                        return `LinkedIn Post:
- Start with a strong hook (first line is crucial)
- Use short paragraphs and line breaks
- Include personal insights or data
- End with a question or CTA
- Max 3000 characters`;

                    case 'newsletter':
                        return `Newsletter:
- Subject line that gets opens
- Preview text
- Intro hook
- 2-3 main sections with subheadings
- Key takeaways
- CTA button text`;

                    case 'blog-post':
                        return `Blog Post:
- SEO-optimized title
- Meta description
- Introduction with hook
- H2/H3 structure
- Key points and examples
- Conclusion with CTA
- Suggest keywords`;

                    case 'video-script':
                        return `Video Script:
- Hook (first 3 seconds)
- Intro (who you are, what they'll learn)
- Main content with timestamps
- B-roll suggestions
- CTA and outro`;

                    case 'podcast-outline':
                        return `Podcast Outline:
- Episode title
- Intro/hook
- Main talking points with sub-points
- Transition phrases
- Guest questions (if applicable)
- Outro and CTA`;

                    case 'instagram-carousel':
                        return `Instagram Carousel:
- Cover slide (hook)
- 8-10 content slides
- Each slide: title + 2-3 bullet points
- Final slide: CTA
- Caption with hashtags`;

                    case 'email-sequence':
                        return `Email Sequence (3-5 emails):
- Each email: subject, preview, body, CTA
- Day 1: Introduction/value
- Day 2: Deeper dive
- Day 3: Social proof
- Day 4: Objection handling
- Day 5: Final CTA`;

                    default:
                        return '';
                }
            }).join('\n\n');

            const result = await generateContent(
                `Repurpose this content into multiple formats:

ORIGINAL CONTENT:
${inputText}

OUTPUT FORMATS NEEDED:
${formatInstructions}

TONE: ${tone}

Return as JSON array:
[
  {
    "format": "twitter-thread",
    "title": "Thread title",
    "content": "Full formatted content...",
    "metadata": {
      "wordCount": 500,
      "readTime": "2 min",
      "hashtags": ["tag1", "tag2"],
      "hooks": ["Hook 1", "Hook 2"]
    }
  }
]

Important:
- Maintain the core message across all formats
- Adapt tone and structure for each platform
- Include platform-specific best practices
- Make content engaging and shareable`,
                `You are a content strategist and copywriter specializing in multi-platform content repurposing.
Create compelling, platform-optimized content that maintains the original message while adapting to each format's best practices.
Focus on hooks, engagement, and actionable takeaways.`,
                { jsonMode: true }
            );

            if (Array.isArray(result)) {
                setRepurposedContent(result);
                success(`Generated ${result.length} content pieces`);
                if (result.length > 0) {
                    setExpandedContent(result[0].format);
                }
            }
        } catch (err) {
            console.error('Repurposing error:', err);
            warning('Failed to repurpose content');
        } finally {
            setProcessing(false);
        }
    };

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(id);
            success('Copied to clipboard');
            setTimeout(() => setCopied(null), 2000);
        } catch (err) {
            warning('Failed to copy');
        }
    };

    const exportAll = () => {
        const allContent = repurposedContent.map(c => {
            return `=== ${formatConfig[c.format].label.toUpperCase()} ===\n\n${c.content}\n`;
        }).join('\n\n---\n\n');

        copyToClipboard(allContent, 'all');
        info('All content copied');
    };

    return (
        <div className="space-y-6">
            {/* Input Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-300">Original Content</h3>
                    <button
                        onClick={extractFromPage}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                        <Upload size={12} />
                        From Page
                    </button>
                </div>

                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste your blog post, article, notes, or any content to repurpose..."
                    className="input-field w-full min-h-[120px] text-sm"
                />

                {/* Tone Selection */}
                <div>
                    <label className="text-xs text-slate-400 block mb-2">Tone</label>
                    <div className="flex gap-2">
                        {(['professional', 'casual', 'educational', 'inspirational'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTone(t)}
                                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                    tone === t
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Format Selection */}
                <div>
                    <label className="text-xs text-slate-400 block mb-2">Output Formats</label>
                    <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(formatConfig) as ContentFormat[]).map(format => (
                            <button
                                key={format}
                                onClick={() => toggleFormat(format)}
                                className={`p-2 rounded-lg text-left transition-colors ${
                                    selectedFormats.includes(format)
                                        ? 'bg-blue-500/20 border border-blue-500/50 text-blue-300'
                                        : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:bg-slate-700/50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    {formatConfig[format].icon}
                                    <span className="text-xs font-medium">{formatConfig[format].label}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={repurposeContent}
                    disabled={processing || !inputText.trim() || selectedFormats.length === 0}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    {processing ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Repurposing...
                        </>
                    ) : (
                        <>
                            <RefreshCw size={16} />
                            Repurpose Content
                        </>
                    )}
                </button>
            </div>

            {/* Repurposed Content Output */}
            {repurposedContent.length > 0 && (
                <div className="space-y-4">
                    {/* Export All */}
                    <button
                        onClick={exportAll}
                        className="btn-secondary w-full flex items-center justify-center gap-2"
                    >
                        {copied === 'all' ? <Check size={14} /> : <Copy size={14} />}
                        Copy All Content
                    </button>

                    {/* Individual Content Pieces */}
                    {repurposedContent.map((content, idx) => (
                        <div
                            key={idx}
                            className="rounded-xl bg-slate-800/30 border border-slate-700/30 overflow-hidden"
                        >
                            <button
                                onClick={() => setExpandedContent(
                                    expandedContent === content.format ? null : content.format
                                )}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                            >
                                <span className="flex items-center gap-2 text-sm font-bold text-slate-200">
                                    {formatConfig[content.format].icon}
                                    {formatConfig[content.format].label}
                                </span>
                                <div className="flex items-center gap-2">
                                    {content.metadata?.wordCount && (
                                        <span className="text-xs text-slate-500">
                                            {content.metadata.wordCount} words
                                        </span>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copyToClipboard(content.content, content.format);
                                        }}
                                        className="p-1.5 rounded hover:bg-slate-600/50 text-slate-400 hover:text-white"
                                    >
                                        {copied === content.format ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                    {expandedContent === content.format ?
                                        <ChevronUp size={16} /> :
                                        <ChevronDown size={16} />
                                    }
                                </div>
                            </button>

                            {expandedContent === content.format && (
                                <div className="px-4 pb-4">
                                    {/* Metadata */}
                                    {content.metadata?.hashtags && content.metadata.hashtags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {content.metadata.hashtags.map((tag, i) => (
                                                <span key={i} className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px]">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="p-3 rounded-lg bg-slate-900/50 max-h-[300px] overflow-y-auto">
                                        <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans">
                                            {content.content}
                                        </pre>
                                    </div>

                                    {/* Hooks (if available) */}
                                    {content.metadata?.hooks && content.metadata.hooks.length > 0 && (
                                        <div className="mt-3">
                                            <span className="text-[10px] text-slate-500 uppercase">Alternative Hooks:</span>
                                            <div className="mt-1 space-y-1">
                                                {content.metadata.hooks.map((hook, i) => (
                                                    <p key={i} className="text-xs text-slate-400 italic">"{hook}"</p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Send to Integrations */}
                    {integrations.length > 0 && (
                        <SendToIntegrations
                            appId="content-repurposer"
                            appName="Content Repurposer"
                            data={{
                                type: 'repurposed_content',
                                original: inputText.substring(0, 500),
                                content: repurposedContent
                            }}
                            source={{ url: context?.url, title: context?.title }}
                        />
                    )}
                </div>
            )}

            {/* Empty State */}
            {repurposedContent.length === 0 && !processing && (
                <div className="text-center py-8 text-slate-500">
                    <RefreshCw size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No content repurposed yet</p>
                    <p className="text-xs text-slate-600 mt-1">
                        Paste content and select output formats
                    </p>
                </div>
            )}

            {/* Info Box */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                <AlertCircle size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300/80">
                    Transform any content into multiple platform-optimized formats: tweets, LinkedIn posts, newsletters, scripts, and more.
                </p>
            </div>
        </div>
    );
};

export default ContentRepurposerApp;
