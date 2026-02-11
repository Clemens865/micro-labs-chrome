import React, { useState, useRef } from 'react';
import { useGemini } from '../../hooks/useGemini';
import {
    Mic, Upload, Loader2, Sparkles, FileAudio, Play, Pause,
    Copy, Check, Download, Clock, MessageSquare, ListTree,
    Trash2, Volume2
} from 'lucide-react';

type AnalysisMode = 'transcribe' | 'summarize' | 'actions' | 'full';

interface TranscriptionResult {
    transcription: string;
    summary?: string;
    actionItems?: string[];
    keyPoints?: string[];
    duration?: string;
    timestamp: number;
}

const AudioTranscriber: React.FC = () => {
    const { generateContent, loading } = useGemini();
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('full');
    const [result, setResult] = useState<TranscriptionResult | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const analysisModes: Record<AnalysisMode, { label: string; icon: React.ReactNode; description: string }> = {
        transcribe: {
            label: 'Transcribe Only',
            icon: <MessageSquare size={14} />,
            description: 'Full text transcription'
        },
        summarize: {
            label: 'Summary',
            icon: <FileAudio size={14} />,
            description: 'Concise summary of content'
        },
        actions: {
            label: 'Action Items',
            icon: <ListTree size={14} />,
            description: 'Extract tasks & action items'
        },
        full: {
            label: 'Full Analysis',
            icon: <Sparkles size={14} />,
            description: 'Transcription + summary + actions'
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a', 'audio/mp4'];
        if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
            alert('Please upload an audio file (MP3, WAV, OGG, M4A, WebM)');
            return;
        }

        setAudioFile(file);
        setAudioUrl(URL.createObjectURL(file));
        setResult(null);
    };

    const togglePlayback = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const clearAudio = () => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioFile(null);
        setAudioUrl(null);
        setResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const transcribeAudio = async () => {
        if (!audioFile) return;

        // Convert audio to base64
        const reader = new FileReader();
        const audioBase64 = await new Promise<string>((resolve) => {
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.readAsDataURL(audioFile);
        });

        const prompts: Record<AnalysisMode, string> = {
            transcribe: `Transcribe this audio file completely and accurately.
Include speaker labels if multiple speakers are detected.
Format the transcription with proper punctuation and paragraph breaks.`,

            summarize: `Listen to this audio and provide:
1. A concise summary (2-3 paragraphs)
2. The main topic/subject
3. Key points discussed (bullet points)`,

            actions: `Listen to this audio and extract:
1. All action items mentioned
2. Deadlines or dates referenced
3. People assigned to tasks
4. Follow-up items needed

Format as a clear, actionable list.`,

            full: `Analyze this audio file comprehensively:

1. **Full Transcription**: Provide accurate word-for-word transcription with speaker labels if applicable.

2. **Summary**: A concise 2-3 paragraph summary of the content.

3. **Key Points**: Bullet list of main topics/points discussed.

4. **Action Items**: Any tasks, to-dos, or follow-ups mentioned.

5. **Notable Quotes**: Any particularly important or quotable statements.

Format each section clearly with headers.`
        };

        try {
            // Note: This uses Gemini's native audio understanding
            // The audio is sent as inline data
            const response = await generateContent(
                prompts[analysisMode],
                'You are an expert transcriptionist and meeting analyst. Provide accurate transcriptions and insightful analysis.',
                {
                    model: 'gemini-2.0-flash',
                    imageData: audioBase64, // Gemini accepts audio as inline data too
                    imageMimeType: audioFile.type
                }
            );

            const text = typeof response === 'string' ? response : JSON.stringify(response);

            // Parse the response
            const summaryMatch = text.match(/(?:summary|overview):?\s*([\s\S]*?)(?=\n\n(?:key points|action items|transcription)|$)/i);
            const actionMatch = text.match(/(?:action items?|tasks?|to-?dos?):?\s*([\s\S]*?)(?=\n\n|$)/i);
            const keyPointsMatch = text.match(/(?:key points?|main points?):?\s*([\s\S]*?)(?=\n\n|$)/i);

            const actionItems = actionMatch
                ? actionMatch[1].split('\n').filter(l => l.trim().match(/^[-•*\d]/)).map(l => l.replace(/^[-•*\d.)\s]+/, '').trim())
                : [];

            const keyPoints = keyPointsMatch
                ? keyPointsMatch[1].split('\n').filter(l => l.trim().match(/^[-•*]/)).map(l => l.replace(/^[-•*]\s*/, '').trim())
                : [];

            setResult({
                transcription: text,
                summary: summaryMatch ? summaryMatch[1].trim() : undefined,
                actionItems: actionItems.length > 0 ? actionItems : undefined,
                keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
                duration: audioRef.current ? formatDuration(audioRef.current.duration) : undefined,
                timestamp: Date.now()
            });
        } catch (err: any) {
            console.error('Transcription failed:', err);
            // Fallback message for unsupported audio
            if (err.message?.includes('audio') || err.message?.includes('media')) {
                alert('Audio transcription requires Gemini 1.5 or later with audio support. Please check your API access.');
            }
        }
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const copyToClipboard = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const downloadTranscription = () => {
        if (!result) return;
        const blob = new Blob([result.transcription], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcription-${audioFile?.name || 'audio'}-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div style={{
                padding: '16px',
                backgroundColor: 'hsl(222 47% 11%)',
                borderRadius: '14px',
                border: '1px solid hsl(222 47% 18%)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, hsl(280 83% 55%) 0%, hsl(262 83% 58%) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Mic size={22} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(210 40% 98%)' }}>
                            Audio Transcriber
                        </h3>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 55%)', marginTop: '2px' }}>
                            Transcribe & analyze audio with AI
                        </p>
                    </div>
                </div>

                {/* Upload Area */}
                {!audioFile ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            padding: '32px 20px',
                            backgroundColor: 'hsl(222 47% 8%)',
                            borderRadius: '12px',
                            border: '2px dashed hsl(222 47% 25%)',
                            textAlign: 'center',
                            cursor: 'pointer',
                            marginBottom: '12px'
                        }}
                    >
                        <Upload size={32} style={{ color: 'hsl(280 83% 55%)', margin: '0 auto 12px' }} />
                        <p style={{ fontSize: '13px', color: 'hsl(210 40% 98%)', marginBottom: '4px' }}>
                            Upload audio file
                        </p>
                        <p style={{ fontSize: '11px', color: 'hsl(215 20% 50%)' }}>
                            MP3, WAV, OGG, M4A, WebM supported
                        </p>
                    </div>
                ) : (
                    <div style={{
                        padding: '12px',
                        backgroundColor: 'hsl(222 47% 8%)',
                        borderRadius: '10px',
                        marginBottom: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                            <button
                                onClick={togglePlayback}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    backgroundColor: 'hsl(280 83% 55%)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                            </button>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '12px', color: 'hsl(210 40% 98%)', marginBottom: '2px' }}>
                                    {audioFile.name}
                                </p>
                                <p style={{ fontSize: '10px', color: 'hsl(215 20% 50%)' }}>
                                    {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                            <button
                                onClick={clearAudio}
                                style={{
                                    padding: '8px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: 'hsl(0 84% 60% / 0.2)',
                                    color: 'hsl(0 84% 65%)',
                                    cursor: 'pointer'
                                }}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                        <audio
                            ref={audioRef}
                            src={audioUrl || undefined}
                            onEnded={() => setIsPlaying(false)}
                            style={{ width: '100%', height: '32px' }}
                            controls
                        />
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                />

                {/* Analysis Mode */}
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', marginBottom: '6px', display: 'block' }}>
                        Analysis Mode
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        {(Object.entries(analysisModes) as [AnalysisMode, typeof analysisModes[AnalysisMode]][]).map(([mode, config]) => (
                            <button
                                key={mode}
                                onClick={() => setAnalysisMode(mode)}
                                disabled={loading}
                                style={{
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: analysisMode === mode
                                        ? '2px solid hsl(280 83% 55%)'
                                        : '1px solid hsl(222 47% 18%)',
                                    backgroundColor: analysisMode === mode
                                        ? 'hsl(280 83% 55% / 0.15)'
                                        : 'hsl(222 47% 8%)',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                    <span style={{ color: analysisMode === mode ? 'hsl(280 83% 65%)' : 'hsl(215 20% 55%)' }}>
                                        {config.icon}
                                    </span>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: analysisMode === mode ? 'hsl(280 83% 75%)' : 'hsl(210 40% 98%)'
                                    }}>
                                        {config.label}
                                    </span>
                                </div>
                                <p style={{ fontSize: '10px', color: 'hsl(215 20% 50%)' }}>
                                    {config.description}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Transcribe Button */}
                <button
                    onClick={transcribeAudio}
                    disabled={loading || !audioFile}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: 'linear-gradient(135deg, hsl(280 83% 55%) 0%, hsl(262 83% 58%) 100%)',
                        color: 'white',
                        opacity: (loading || !audioFile) ? 0.5 : 1
                    }}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={16} />
                            Processing Audio...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Transcribe & Analyze
                        </>
                    )}
                </button>
            </div>

            {/* Results */}
            {result && (
                <div style={{
                    padding: '16px',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(280 83% 55% / 0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Volume2 size={16} style={{ color: 'hsl(280 83% 55%)' }} />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(280 83% 65%)' }}>
                                Transcription Result
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => copyToClipboard(result.transcription, 'all')}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: 'hsl(222 47% 16%)',
                                    color: 'hsl(215 20% 65%)',
                                    fontSize: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                {copied === 'all' ? <Check size={10} /> : <Copy size={10} />}
                                Copy
                            </button>
                            <button
                                onClick={downloadTranscription}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: 'hsl(222 47% 16%)',
                                    color: 'hsl(215 20% 65%)',
                                    fontSize: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <Download size={10} />
                                Download
                            </button>
                        </div>
                    </div>

                    {/* Action Items */}
                    {result.actionItems && result.actionItems.length > 0 && (
                        <div style={{
                            padding: '12px',
                            backgroundColor: 'hsl(45 93% 47% / 0.1)',
                            borderRadius: '8px',
                            marginBottom: '12px',
                            border: '1px solid hsl(45 93% 47% / 0.3)'
                        }}>
                            <p style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(45 93% 60%)', marginBottom: '8px' }}>
                                Action Items
                            </p>
                            <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                {result.actionItems.map((item, idx) => (
                                    <li key={idx} style={{ fontSize: '12px', color: 'hsl(215 20% 80%)', marginBottom: '4px' }}>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Key Points */}
                    {result.keyPoints && result.keyPoints.length > 0 && (
                        <div style={{
                            padding: '12px',
                            backgroundColor: 'hsl(280 83% 55% / 0.1)',
                            borderRadius: '8px',
                            marginBottom: '12px'
                        }}>
                            <p style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(280 83% 65%)', marginBottom: '8px' }}>
                                Key Points
                            </p>
                            <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                {result.keyPoints.map((point, idx) => (
                                    <li key={idx} style={{ fontSize: '12px', color: 'hsl(215 20% 80%)', marginBottom: '4px' }}>
                                        {point}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Full Transcription */}
                    <div style={{
                        padding: '12px',
                        backgroundColor: 'hsl(222 47% 8%)',
                        borderRadius: '8px',
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}>
                        <pre style={{
                            fontSize: '12px',
                            color: 'hsl(215 20% 80%)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            lineHeight: 1.6,
                            margin: 0
                        }}>
                            {result.transcription}
                        </pre>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!audioFile && !loading && (
                <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(222 47% 18%)'
                }}>
                    <Mic size={40} style={{ color: 'hsl(215 20% 30%)', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '13px', color: 'hsl(215 20% 55%)', marginBottom: '6px' }}>
                        AI-Powered Audio Analysis
                    </p>
                    <p style={{ fontSize: '11px', color: 'hsl(215 20% 45%)', maxWidth: '280px', margin: '0 auto' }}>
                        Upload podcasts, meetings, or voice memos for transcription, summaries, and action item extraction
                    </p>
                </div>
            )}

            {/* Info */}
            <div style={{
                padding: '12px',
                backgroundColor: 'hsl(280 83% 55% / 0.1)',
                borderRadius: '10px',
                border: '1px solid hsl(280 83% 55% / 0.3)'
            }}>
                <div style={{ fontSize: '11px', color: 'hsl(280 83% 80%)', lineHeight: 1.5 }}>
                    <strong>Native Gemini Audio:</strong> Uses Gemini's multimodal capabilities to understand
                    and transcribe audio directly, including speaker detection and context understanding.
                </div>
            </div>
        </div>
    );
};

export default AudioTranscriber;
