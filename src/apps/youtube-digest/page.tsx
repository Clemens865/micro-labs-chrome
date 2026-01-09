import React, { useState, useEffect } from 'react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { Youtube, Search, Loader2, Play, Clock, Tag, AlertCircle, FileText, UserCircle, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppHistory } from '../../hooks/useAppHistory';

interface YoutubeResult {
    title?: string;
    summary: string;
    chapters?: { timestamp: string; title: string; summary: string }[];
    mainTopics?: string[];
    hasTranscript?: boolean;
}

interface TranscriptData {
    segments: { text: string; start: number; duration: number }[];
    fullText: string;
    language?: string;
    trackName?: string;
    error?: string;
}

const YoutubeDigest: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading, error } = useGemini();
    const { saveHistoryEntry } = useAppHistory();
    const { profile, hasProfile, getProfileContext } = useUserProfile();
    const [url, setUrl] = useState(context?.isYouTube ? context.url : '');
    const [result, setResult] = useState<YoutubeResult | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');
    const [includeProfile, setIncludeProfile] = useState(false);

    // Build profile context for AI
    const buildProfileContext = () => {
        if (!includeProfile || !hasProfile) return '';
        const ctx = getProfileContext();
        return ctx ? `\n\nViewer Context: ${ctx}\nTailor the summary to highlight aspects most relevant to this professional background.` : '';
    };

    useEffect(() => {
        if (context?.isYouTube && context.url) {
            setUrl(context.url);
            setWarning(null);
        }
    }, [context]);

    const fetchTranscript = (): Promise<TranscriptData> => {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'GET_YOUTUBE_TRANSCRIPT' }, (response) => {
                resolve(response || { error: 'No response', segments: [], fullText: '' });
            });
        });
    };

    const formatTimestamp = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSummarize = async () => {
        if (!url) return;
        setWarning(null);
        setStatus('');

        // Verify if we are on the correct page to get context
        const isSameUrl = context?.url && (url.includes(context.url) || context.url.includes(url));

        if (!isSameUrl) {
            setWarning("Navigate to this YouTube video first, then click summarize. I can only read the content of the active tab.");
            return;
        }

        // Step 1: Try to fetch the transcript
        setStatus('Extracting video transcript...');
        const transcript = await fetchTranscript();

        let contentToAnalyze = '';
        let hasTranscript = false;

        if (transcript.fullText && transcript.fullText.length > 100) {
            hasTranscript = true;
            // Limit transcript to ~12000 chars to leave room for prompt
            contentToAnalyze = `VIDEO TRANSCRIPT (${transcript.trackName || 'Auto-generated'}, ${transcript.language || 'unknown'}):\n${transcript.fullText.substring(0, 12000)}`;
            setStatus('Analyzing transcript with AI...');
        } else {
            // Fallback to page content (description, comments)
            contentToAnalyze = `VIDEO DESCRIPTION AND PAGE CONTENT:\n${context?.content?.substring(0, 12000) || 'No content available'}`;
            setStatus('No transcript available. Analyzing page content...');
            if (transcript.error) {
                console.log('Transcript error:', transcript.error);
            }
        }

        const profileContext = buildProfileContext();
        const prompt = `Analyze this YouTube video and return a JSON object with EXACTLY this structure:
{
  "title": "The video title",
  "summary": "A comprehensive summary of the video content (4-6 sentences)",
  "chapters": [
    {"timestamp": "0:00", "title": "Chapter/Section name", "summary": "What is discussed in this part"}
  ],
  "mainTopics": ["topic1", "topic2", "topic3", "topic4", "topic5"]
}

Video URL: ${url}
Page Title: ${context?.title || 'Unknown'}

${contentToAnalyze}
${profileContext}
Requirements:
- title: The actual video title
- summary: A thorough summary covering the main points, arguments, and conclusions of the video${includeProfile && hasProfile ? '. Emphasize aspects most relevant to the viewer\'s professional context.' : ''}
- chapters: Break down the video into 4-8 logical sections with timestamps (estimate based on content flow). Each chapter should have a descriptive title and 1-2 sentence summary
- mainTopics: 4-6 specific topics/themes covered in the video

Be specific and detailed in your analysis. ${hasTranscript ? 'You have the full transcript, so provide an accurate and comprehensive summary.' : 'Note: Only page metadata is available, so base your analysis on the title and description.'}`;

        try {
            const data = await generateContent(prompt, "You are an expert video content analyst. Provide detailed, accurate summaries based on the provided transcript or content. Always respond with valid JSON.", { jsonMode: true });

            // Ensure we have the expected structure with defensive parsing
            const parsedResult: YoutubeResult = {
                title: data?.title || context?.title || 'Untitled Video',
                summary: data?.summary || 'No summary could be generated.',
                chapters: Array.isArray(data?.chapters) ? data.chapters : [],
                mainTopics: Array.isArray(data?.mainTopics) ? data.mainTopics : [],
                hasTranscript
            };

            setResult(parsedResult);
            setStatus('');
            saveHistoryEntry('youtube', 'YouTube Digest', { url, hasTranscript }, parsedResult);
        } catch (err) {
            console.error('YouTube Digest error:', err);
            setStatus('');
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste YouTube URL..."
                        style={{
                            width: '100%',
                            padding: '14px 48px 14px 16px',
                            backgroundColor: 'hsl(222 47% 11%)',
                            border: '1px solid hsl(222 47% 20%)',
                            borderRadius: '14px',
                            color: 'hsl(210 40% 98%)',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'border-color 0.2s, box-shadow 0.2s'
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = 'hsl(0 72% 51%)';
                            e.target.style.boxShadow = '0 0 0 3px hsl(0 72% 51% / 0.15)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = 'hsl(222 47% 20%)';
                            e.target.style.boxShadow = 'none';
                        }}
                    />
                    <Youtube size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(0 72% 51%)' }} />
                </div>
                <button
                    onClick={handleSummarize}
                    disabled={loading || !url}
                    style={{
                        width: '100%',
                        padding: '16px 24px',
                        background: loading || !url
                            ? 'hsl(222 47% 20%)'
                            : 'linear-gradient(135deg, hsl(0 72% 51%) 0%, hsl(0 84% 60%) 100%)',
                        border: 'none',
                        borderRadius: '14px',
                        color: loading || !url ? 'hsl(215 20% 50%)' : 'white',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor: loading || !url ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        transition: 'all 0.2s ease',
                        boxShadow: loading || !url ? 'none' : '0 8px 24px hsl(0 72% 51% / 0.35)',
                        opacity: loading || !url ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!loading && url) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 12px 32px hsl(0 72% 51% / 0.45)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = loading || !url ? 'none' : '0 8px 24px hsl(0 72% 51% / 0.35)';
                    }}
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                    {loading ? 'Analyzing Video...' : 'Summarize Video'}
                </button>

                {warning && (
                    <div style={{
                        padding: '14px 16px',
                        backgroundColor: 'hsl(24 95% 50% / 0.1)',
                        border: '1px solid hsl(24 95% 50% / 0.2)',
                        borderRadius: '12px',
                        color: 'hsl(24 95% 55%)',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px'
                    }}>
                        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <p>{warning}</p>
                    </div>
                )}

                {status && (
                    <div style={{
                        padding: '14px 16px',
                        backgroundColor: 'hsl(207 90% 54% / 0.1)',
                        border: '1px solid hsl(207 90% 54% / 0.2)',
                        borderRadius: '12px',
                        color: 'hsl(207 90% 65%)',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <Loader2 size={14} className="animate-spin" style={{ flexShrink: 0 }} />
                        <p>{status}</p>
                    </div>
                )}

                {/* Profile Toggle */}
                {hasProfile && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        backgroundColor: 'hsl(222 47% 11%)',
                        border: '1px solid hsl(222 47% 18%)',
                        borderRadius: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <UserCircle size={14} style={{ color: 'hsl(0 72% 51%)' }} />
                            <span style={{ fontSize: '13px', color: 'hsl(215 20% 65%)' }}>Personalize for My Role</span>
                        </div>
                        <button
                            onClick={() => setIncludeProfile(!includeProfile)}
                            style={{
                                position: 'relative',
                                width: '40px',
                                height: '20px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: includeProfile ? 'hsl(0 72% 51%)' : 'hsl(222 47% 20%)',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: '2px',
                                left: includeProfile ? '22px' : '2px',
                                width: '16px',
                                height: '16px',
                                borderRadius: '8px',
                                backgroundColor: 'white',
                                transition: 'left 0.2s'
                            }} />
                        </button>
                    </div>
                )}
            </div>

            {result && (
                <div className="space-y-6 animate-in" style={{ marginTop: '32px' }}>
                    {result.title && (
                        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'hsl(210 40% 98%)', lineHeight: 1.3 }}>
                            {result.title}
                        </h2>
                    )}

                    {/* Transcript indicator */}
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: result.hasTranscript ? 'hsl(142 71% 45% / 0.1)' : 'hsl(45 93% 55% / 0.1)',
                        color: result.hasTranscript ? 'hsl(142 71% 55%)' : 'hsl(45 93% 55%)'
                    }}>
                        <FileText size={12} />
                        {result.hasTranscript ? 'Based on full transcript' : 'Based on description only'}
                    </div>

                    <section className="space-y-3">
                        <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Play size={12} style={{ color: 'hsl(0 72% 51%)', fill: 'hsl(0 72% 51%)' }} /> Executive Summary
                        </h3>
                        <div style={{
                            padding: '20px',
                            backgroundColor: 'hsl(222 47% 9%)',
                            borderRadius: '16px',
                            border: '1px solid hsl(222 47% 15%)',
                            fontSize: '14px',
                            lineHeight: 1.7,
                            color: 'hsl(215 20% 75%)'
                        }}>
                            {result.summary}
                        </div>
                    </section>

                    {result.chapters && result.chapters.length > 0 && (
                        <section className="space-y-4">
                            <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={12} style={{ color: 'hsl(0 72% 51%)' }} /> Key Chapters
                            </h3>
                            <div className="space-y-3">
                                {result.chapters.map((ch, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            display: 'flex',
                                            gap: '16px',
                                            padding: '16px',
                                            backgroundColor: 'hsl(222 47% 11%)',
                                            borderRadius: '14px',
                                            border: '1px solid hsl(222 47% 18%)'
                                        }}
                                    >
                                        <div style={{
                                            padding: '6px 10px',
                                            height: 'fit-content',
                                            borderRadius: '8px',
                                            background: 'hsl(0 72% 51% / 0.15)',
                                            color: 'hsl(0 72% 60%)',
                                            fontSize: '11px',
                                            fontWeight: 800,
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {ch.timestamp}
                                        </div>
                                        <div>
                                            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'hsl(210 40% 98%)', marginBottom: '6px' }}>{ch.title}</h4>
                                            <p style={{ fontSize: '12px', color: 'hsl(215 20% 60%)', lineHeight: 1.5 }}>{ch.summary}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {result.mainTopics && result.mainTopics.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '8px' }}>
                            {result.mainTopics.map((topic, i) => (
                                <span
                                    key={i}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'hsl(222 47% 11%)',
                                        border: '1px solid hsl(222 47% 18%)',
                                        borderRadius: '10px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.03em',
                                        color: 'hsl(215 20% 60%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Tag size={10} style={{ color: 'hsl(0 72% 51%)' }} /> {topic}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div style={{
                    padding: '14px 16px',
                    backgroundColor: 'hsl(0 84% 60% / 0.1)',
                    border: '1px solid hsl(0 84% 60% / 0.2)',
                    borderRadius: '12px',
                    color: 'hsl(0 84% 65%)',
                    fontSize: '12px'
                }}>
                    {error}
                </div>
            )}
        </div>
    );
};

export default YoutubeDigest;
