import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGemini } from '../../hooks/useGemini';
import { useAppHistory } from '../../hooks/useAppHistory';
import { connectLiveSession, disconnectLiveSession, isLiveSessionConnected } from '../../services/geminiLiveService';
import {
    Mic,
    MicOff,
    Loader2,
    Video,
    VideoOff,
    Clock,
    Download,
    Copy,
    Check,
    Trash2,
    Play,
    Square,
    Sparkles,
    FileText,
    ListChecks,
    AlertCircle,
    Settings,
    Wifi,
    WifiOff
} from 'lucide-react';

interface TranscriptSegment {
    id: string;
    timestamp: number;
    text: string;
    isFinal: boolean;
}

interface MeetingSummary {
    title: string;
    duration: string;
    keyTopics: string[];
    actionItems: string[];
    decisions: string[];
    nextSteps?: string[];
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

const MeetingTranscriber: React.FC = () => {
    const { generateContent, loading: aiLoading } = useGemini();
    const { saveHistoryEntry } = useAppHistory();

    // Recording state
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
    const [startTime, setStartTime] = useState<number | null>(null);
    const [duration, setDuration] = useState(0);
    const [platform, setPlatform] = useState<string | null>(null);

    // Transcript state
    const [segments, setSegments] = useState<TranscriptSegment[]>([]);
    const [currentPartial, setCurrentPartial] = useState('');
    const [summary, setSummary] = useState<MeetingSummary | null>(null);

    // UI state
    const [error, setError] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [autoSummarize, setAutoSummarize] = useState(true);
    const [language, setLanguage] = useState('English');

    // Refs
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const segmentIdRef = useRef(0);

    // Detect meeting platform from current tab
    const detectPlatform = useCallback(async (): Promise<string | null> => {
        try {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                const url = tabs[0]?.url || '';

                if (url.includes('meet.google.com')) return 'Google Meet';
                if (url.includes('zoom.us')) return 'Zoom';
                if (url.includes('teams.microsoft.com')) return 'Microsoft Teams';
                if (url.includes('webex.com')) return 'Webex';
                if (url.includes('slack.com/call')) return 'Slack Huddle';
                if (url.includes('discord.com')) return 'Discord';
            }
            return null;
        } catch {
            return null;
        }
    }, []);

    // Duration timer
    useEffect(() => {
        if (connectionStatus === 'connected' && startTime) {
            timerRef.current = setInterval(() => {
                setDuration(Date.now() - startTime);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [connectionStatus, startTime]);

    // Auto-scroll to bottom
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [segments, currentPartial]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isLiveSessionConnected()) {
                disconnectLiveSession();
            }
        };
    }, []);

    // Format duration
    const formatDuration = (ms: number): string => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        }
        return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    };

    // Format timestamp
    const formatTimestamp = (ms: number): string => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    };

    // Start recording with Gemini Live API
    const startRecording = async () => {
        setError('');
        setSegments([]);
        setCurrentPartial('');
        setSummary(null);
        setConnectionStatus('connecting');

        const detectedPlatform = await detectPlatform();
        setPlatform(detectedPlatform);

        const recordingStartTime = Date.now();
        setStartTime(recordingStartTime);

        try {
            await connectLiveSession(
                {
                    onOpen: () => {
                        setConnectionStatus('connected');
                    },
                    onTranscription: (text, isFinal) => {
                        if (isFinal) {
                            const newSegment: TranscriptSegment = {
                                id: `seg-${segmentIdRef.current++}`,
                                timestamp: Date.now() - recordingStartTime,
                                text: text.trim(),
                                isFinal: true
                            };
                            setSegments(prev => [...prev, newSegment]);
                            setCurrentPartial('');
                        } else {
                            setCurrentPartial(text);
                        }
                    },
                    onClose: () => {
                        if (connectionStatus !== 'idle') {
                            setConnectionStatus('idle');
                        }
                    },
                    onError: (err) => {
                        console.error('Live session error:', err);
                        setConnectionStatus('error');
                        setError(err.message || 'Connection error');
                    }
                },
                {
                    language,
                    systemInstruction: `
                        You are a passive meeting transcription system.
                        Your SOLE task is to listen to the audio stream and transcribe what is said accurately.
                        You DO NOT speak. You DO NOT reply to questions verbally. You DO NOT introduce yourself.
                        Stay completely silent and only output the transcription text.
                        ${platform ? `This is a ${platform} meeting.` : ''}
                        Language: ${language}
                    `
                }
            );
        } catch (err: any) {
            setConnectionStatus('error');
            setError(err.message || 'Failed to connect to Gemini Live API');
        }
    };

    // Stop recording
    const stopRecording = async () => {
        await disconnectLiveSession();
        setConnectionStatus('idle');
        setCurrentPartial('');

        // Auto-generate summary if enabled and there's content
        if (autoSummarize && segments.length > 0) {
            await generateSummary();
        }
    };

    // Generate AI summary
    const generateSummary = async () => {
        if (segments.length === 0) {
            setError('No transcript to summarize');
            return;
        }

        const fullTranscript = segments.map(s =>
            `[${formatTimestamp(s.timestamp)}] ${s.text}`
        ).join('\n');

        const prompt = `Analyze this meeting transcript and provide a comprehensive summary.

TRANSCRIPT:
${fullTranscript}

MEETING DURATION: ${formatDuration(duration)}
${platform ? `PLATFORM: ${platform}` : ''}

Return a JSON object with:
{
    "title": "A descriptive title for this meeting based on content discussed",
    "duration": "${formatDuration(duration)}",
    "keyTopics": ["topic 1", "topic 2", "topic 3"],
    "actionItems": ["action item with owner if mentioned", "another action"],
    "decisions": ["key decision made", "another decision"],
    "nextSteps": ["follow-up item 1", "follow-up item 2"]
}

Be thorough but concise. Extract all action items and decisions even if implicit.`;

        try {
            const data = await generateContent(
                prompt,
                "You are an expert meeting analyst. Extract key information, action items, and decisions from meeting transcripts. Be thorough and accurate.",
                { jsonMode: true }
            );

            setSummary(data);

            // Save to history
            saveHistoryEntry('meeting-transcriber', 'Meeting Transcriber', {
                duration: formatDuration(duration),
                platform: platform,
                segmentCount: segments.length
            }, {
                transcript: fullTranscript,
                summary: data
            });
        } catch (err) {
            console.error('Summary generation error:', err);
            setError('Failed to generate summary. Try again.');
        }
    };

    // Export transcript
    const exportTranscript = (format: 'txt' | 'srt' | 'json') => {
        const fullTranscript = segments.map(s =>
            `[${formatTimestamp(s.timestamp)}] ${s.text}`
        ).join('\n');

        let content: string;
        let filename: string;
        let mimeType: string;

        switch (format) {
            case 'srt':
                content = segments.map((s, i) => {
                    const startTime = formatSrtTime(s.timestamp);
                    const endTime = formatSrtTime(s.timestamp + 3000);
                    return `${i + 1}\n${startTime} --> ${endTime}\n${s.text}\n`;
                }).join('\n');
                filename = `meeting-transcript-${Date.now()}.srt`;
                mimeType = 'text/srt';
                break;

            case 'json':
                content = JSON.stringify({
                    meeting: {
                        date: new Date().toISOString(),
                        duration: formatDuration(duration),
                        platform: platform
                    },
                    transcript: segments,
                    summary: summary
                }, null, 2);
                filename = `meeting-transcript-${Date.now()}.json`;
                mimeType = 'application/json';
                break;

            default:
                content = `Meeting Transcript\n`;
                content += `Date: ${new Date().toLocaleDateString()}\n`;
                content += `Duration: ${formatDuration(duration)}\n`;
                if (platform) content += `Platform: ${platform}\n`;
                content += `\n---\n\n${fullTranscript}`;
                if (summary) {
                    content += `\n\n---\nSUMMARY\n---\n`;
                    content += `\nTitle: ${summary.title}\n`;
                    content += `\nKey Topics:\n${summary.keyTopics.map(t => `- ${t}`).join('\n')}`;
                    content += `\n\nAction Items:\n${summary.actionItems.map(a => `- ${a}`).join('\n')}`;
                    content += `\n\nDecisions:\n${summary.decisions.map(d => `- ${d}`).join('\n')}`;
                }
                filename = `meeting-transcript-${Date.now()}.txt`;
                mimeType = 'text/plain';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Format SRT timestamp
    const formatSrtTime = (ms: number): string => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = ms % 1000;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
    };

    // Copy transcript
    const copyTranscript = async () => {
        const text = segments.map(s => `[${formatTimestamp(s.timestamp)}] ${s.text}`).join('\n');
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Clear all
    const clearAll = () => {
        setSegments([]);
        setCurrentPartial('');
        setSummary(null);
        setError('');
        segmentIdRef.current = 0;
    };

    // Get status indicator
    const getStatusIndicator = () => {
        switch (connectionStatus) {
            case 'connecting':
                return (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/20 rounded-lg">
                        <Loader2 size={12} className="text-yellow-400 animate-spin" />
                        <span className="text-xs text-yellow-400">Connecting to Gemini...</span>
                    </div>
                );
            case 'connected':
                return (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded-lg">
                        <Wifi size={12} className="text-green-400" />
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <Clock size={12} className="text-green-400" />
                        <span className="text-xs font-mono text-green-400">
                            {formatDuration(duration)}
                        </span>
                    </div>
                );
            case 'error':
                return (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 rounded-lg">
                        <WifiOff size={12} className="text-red-400" />
                        <span className="text-xs text-red-400">Connection Error</span>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Status & Settings Row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {getStatusIndicator()}
                    {platform && (
                        <span
                            style={{ backgroundColor: 'hsl(222 47% 15%)', color: 'hsl(215 20% 65%)' }}
                            className="text-[10px] px-2 py-1 rounded-lg"
                        >
                            {platform}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    style={{
                        backgroundColor: 'hsl(222 47% 15%)',
                        border: '1px solid hsl(222 47% 20%)'
                    }}
                    className="p-2 hover:brightness-110 rounded-lg transition-all"
                >
                    <Settings size={16} className="text-slate-300" />
                </button>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div
                    style={{
                        backgroundColor: 'hsl(222 47% 11% / 0.5)',
                        borderColor: 'hsl(222 47% 18% / 0.5)'
                    }}
                    className="p-3 rounded-xl space-y-3 border"
                >
                    <div className="flex items-center justify-between">
                        <label className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>Auto-summarize on stop</label>
                        <button
                            onClick={() => setAutoSummarize(!autoSummarize)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${
                                autoSummarize ? 'bg-violet-600' : 'bg-slate-600'
                            }`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                                autoSummarize ? 'translate-x-5' : 'translate-x-0.5'
                            }`} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>Language</label>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            style={{
                                backgroundColor: 'hsl(222 47% 11%)',
                                color: 'hsl(210 40% 98%)',
                                borderColor: 'hsl(222 47% 18% / 0.5)'
                            }}
                            className="text-xs rounded-lg px-2 py-1 border outline-none focus:ring-2 focus:ring-violet-500/50"
                        >
                            <option value="English">English</option>
                            <option value="German">German</option>
                            <option value="French">French</option>
                            <option value="Spanish">Spanish</option>
                            <option value="Italian">Italian</option>
                            <option value="Portuguese">Portuguese</option>
                            <option value="Japanese">Japanese</option>
                            <option value="Chinese">Chinese</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="space-y-4">
                {/* Recording Controls */}
                <div className="flex justify-center gap-3">
                    {connectionStatus === 'idle' || connectionStatus === 'error' ? (
                        <button
                            onClick={startRecording}
                            style={{
                                background: 'linear-gradient(to right, hsl(263 70% 50%), hsl(280 70% 50%))',
                                color: 'white',
                                boxShadow: '0 4px 12px hsl(263 70% 50% / 0.3)'
                            }}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm hover:brightness-110 transition-all hover:scale-105"
                        >
                            <Play size={18} />
                            Start Recording
                        </button>
                    ) : connectionStatus === 'connecting' ? (
                        <button
                            disabled
                            style={{
                                backgroundColor: 'hsl(222 47% 15%)',
                                color: 'hsl(210 40% 98%)'
                            }}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm opacity-50 cursor-not-allowed"
                        >
                            <Loader2 size={18} className="animate-spin" />
                            Connecting...
                        </button>
                    ) : (
                        <button
                            onClick={stopRecording}
                            className="flex items-center gap-2 px-6 py-3 bg-red-600 rounded-xl font-medium text-sm hover:bg-red-500 transition-all"
                        >
                            <Square size={18} />
                            Stop Recording
                        </button>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                        <div>
                            <p>{error}</p>
                            {error.includes('API key') && (
                                <p className="text-xs mt-1 text-red-300">
                                    Go to Settings → Set your Gemini API key
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Transcript */}
                {(segments.length > 0 || currentPartial) && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2">
                                <FileText size={12} />
                                Live Transcript
                                {connectionStatus === 'connected' && (
                                    <span className="flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                )}
                            </h3>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={copyTranscript}
                                    className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                                    title="Copy transcript"
                                >
                                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-slate-400 hover:text-slate-200" />}
                                </button>
                                <button
                                    onClick={clearAll}
                                    className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                                    title="Clear all"
                                >
                                    <Trash2 size={14} className="text-slate-400 hover:text-slate-200" />
                                </button>
                            </div>
                        </div>

                        <div
                            style={{
                                backgroundColor: 'hsl(222 47% 11% / 0.3)',
                                borderColor: 'hsl(222 47% 18% / 0.5)'
                            }}
                            className="max-h-[300px] overflow-y-auto space-y-2 p-3 rounded-xl border"
                        >
                            {segments.map((segment) => (
                                <div key={segment.id} className="flex gap-3 text-sm">
                                    <span className="text-[10px] text-violet-400 font-mono flex-shrink-0 mt-0.5">
                                        {formatTimestamp(segment.timestamp)}
                                    </span>
                                    <span style={{ color: 'hsl(210 40% 98%)' }}>{segment.text}</span>
                                </div>
                            ))}
                            {currentPartial && (
                                <div className="flex gap-3 text-sm">
                                    <span className="text-[10px] font-mono flex-shrink-0 mt-0.5" style={{ color: 'hsl(215 15% 45%)' }}>
                                        ...
                                    </span>
                                    <span style={{ color: 'hsl(215 15% 45%)' }} className="italic">{currentPartial}</span>
                                </div>
                            )}
                            <div ref={transcriptEndRef} />
                        </div>

                        {/* Action Buttons */}
                        {connectionStatus === 'idle' && segments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={generateSummary}
                                    disabled={aiLoading}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                    {summary ? 'Regenerate Summary' : 'Generate Summary'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Summary */}
                {summary && (
                    <div className="space-y-4 animate-in">
                        <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2">
                            <Sparkles size={12} className="text-violet-400" />
                            AI Meeting Summary
                        </h3>

                        {/* Meeting Title */}
                        <div className="p-4 bg-gradient-to-br from-violet-600/10 to-purple-600/10 rounded-xl border border-violet-500/20">
                            <h4 className="font-bold text-white mb-1">{summary.title}</h4>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {summary.duration}
                                </span>
                                {platform && (
                                    <span className="flex items-center gap-1">
                                        <Video size={12} />
                                        {platform}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Key Topics */}
                        {summary.keyTopics && summary.keyTopics.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Key Topics</h4>
                                <div className="flex flex-wrap gap-2">
                                    {summary.keyTopics.map((topic, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-300 border border-white/5">
                                            {topic}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action Items */}
                        {summary.actionItems && summary.actionItems.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-[10px] uppercase tracking-wider text-orange-400 font-semibold flex items-center gap-1">
                                    <ListChecks size={12} />
                                    Action Items
                                </h4>
                                <ul className="space-y-2">
                                    {summary.actionItems.map((item, i) => (
                                        <li key={i} className="flex gap-3 text-sm text-slate-300 bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl">
                                            <input type="checkbox" className="mt-0.5 accent-orange-500" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Decisions */}
                        {summary.decisions && summary.decisions.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">Decisions Made</h4>
                                <ul className="space-y-1.5">
                                    {summary.decisions.map((decision, i) => (
                                        <li key={i} className="flex gap-2 text-sm text-slate-300">
                                            <span className="text-emerald-400">✓</span>
                                            {decision}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Next Steps */}
                        {summary.nextSteps && summary.nextSteps.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">Next Steps</h4>
                                <ul className="space-y-1.5">
                                    {summary.nextSteps.map((step, i) => (
                                        <li key={i} className="flex gap-2 text-sm text-slate-300">
                                            <span className="text-blue-400">→</span>
                                            {step}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {connectionStatus === 'idle' && segments.length === 0 && !summary && (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                            <Video size={32} className="text-violet-400" />
                        </div>
                        <h3 className="text-sm font-medium text-slate-400 mb-2">Gemini Live Transcription</h3>
                        <p className="text-xs text-slate-500 max-w-[260px] mx-auto mb-4">
                            Real-time meeting transcription powered by Google's Gemini Live API with native audio processing.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 text-[10px]">
                            <span
                                style={{ backgroundColor: 'hsl(222 47% 15%)', color: 'hsl(215 20% 65%)' }}
                                className="px-2 py-1 rounded"
                            >Google Meet</span>
                            <span
                                style={{ backgroundColor: 'hsl(222 47% 15%)', color: 'hsl(215 20% 65%)' }}
                                className="px-2 py-1 rounded"
                            >Zoom</span>
                            <span
                                style={{ backgroundColor: 'hsl(222 47% 15%)', color: 'hsl(215 20% 65%)' }}
                                className="px-2 py-1 rounded"
                            >Teams</span>
                            <span
                                style={{ backgroundColor: 'hsl(222 47% 15%)', color: 'hsl(215 20% 65%)' }}
                                className="px-2 py-1 rounded"
                            >Any Meeting</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Export Footer */}
            {segments.length > 0 && connectionStatus === 'idle' && (
                <div
                    style={{
                        backgroundColor: 'hsl(222 47% 7% / 0.5)',
                        borderColor: 'hsl(222 47% 18% / 0.5)'
                    }}
                    className="p-3 border-t"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'hsl(215 15% 45%)' }}>
                            {segments.length} segments • {formatDuration(duration)}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => exportTranscript('txt')}
                                style={{
                                    backgroundColor: 'hsl(222 47% 11%)',
                                    color: 'hsl(210 40% 98%)'
                                }}
                                className="px-3 py-1.5 text-xs hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <Download size={12} />
                                TXT
                            </button>
                            <button
                                onClick={() => exportTranscript('srt')}
                                style={{
                                    backgroundColor: 'hsl(222 47% 11%)',
                                    color: 'hsl(210 40% 98%)'
                                }}
                                className="px-3 py-1.5 text-xs hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <Download size={12} />
                                SRT
                            </button>
                            <button
                                onClick={() => exportTranscript('json')}
                                style={{
                                    backgroundColor: 'hsl(222 47% 11%)',
                                    color: 'hsl(210 40% 98%)'
                                }}
                                className="px-3 py-1.5 text-xs hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <Download size={12} />
                                JSON
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MeetingTranscriber;
