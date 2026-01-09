import React, { useState, useRef, useEffect } from 'react';
import { useGemini } from '../../hooks/useGemini';
import {
    Mic,
    MicOff,
    Loader2,
    FileText,
    ListChecks,
    MessageSquare,
    Copy,
    Trash2,
    Play,
    Square,
    Sparkles
} from 'lucide-react';

interface ProcessedNote {
    transcript: string;
    summary?: string;
    actionItems?: string[];
    keyPoints?: string[];
    sentiment?: string;
}

const VoiceNotes: React.FC = () => {
    const { generateContent, loading: aiLoading, error: aiError } = useGemini();
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [processedNote, setProcessedNote] = useState<ProcessedNote | null>(null);
    const [status, setStatus] = useState<string>('');
    const [processingMode, setProcessingMode] = useState<'summary' | 'actions' | 'meeting' | 'raw'>('summary');

    const recognitionRef = useRef<any>(null);
    const finalTranscriptRef = useRef<string>('');

    const isSpeechSupported = typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    useEffect(() => {
        if (!isSpeechSupported) return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = finalTranscriptRef.current;

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                    finalTranscriptRef.current = finalTranscript;
                } else {
                    interimTranscript += transcript;
                }
            }

            setTranscript(finalTranscript + interimTranscript);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setStatus(`Error: ${event.error}`);
            setIsRecording(false);
        };

        recognition.onend = () => {
            if (isRecording) {
                recognition.start();
            }
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [isSpeechSupported]);

    const startRecording = () => {
        if (!recognitionRef.current) return;

        finalTranscriptRef.current = '';
        setTranscript('');
        setProcessedNote(null);
        setStatus('Listening...');
        setIsRecording(true);

        try {
            recognitionRef.current.start();
        } catch (e) {
            console.error('Failed to start recognition:', e);
        }
    };

    const stopRecording = () => {
        if (!recognitionRef.current) return;

        setIsRecording(false);
        setStatus('');
        recognitionRef.current.stop();
    };

    const processWithAI = async () => {
        if (!transcript.trim()) return;

        setStatus('Processing with AI...');

        const prompts: Record<string, string> = {
            summary: `Analyze this voice note transcript and return a JSON object:
{
  "transcript": "cleaned up version of the transcript with proper punctuation",
  "summary": "2-3 sentence summary of the main points",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "sentiment": "overall tone (positive/neutral/negative/mixed)"
}

Transcript: ${transcript}`,

            actions: `Extract action items from this voice note. Return JSON:
{
  "transcript": "cleaned transcript",
  "actionItems": ["action item 1", "action item 2", "action item 3"],
  "summary": "brief context for these actions"
}

Transcript: ${transcript}`,

            meeting: `Process this as meeting notes. Return JSON:
{
  "transcript": "cleaned and formatted transcript",
  "summary": "meeting summary",
  "actionItems": ["action 1", "action 2"],
  "keyPoints": ["decision 1", "discussion point 1", "key outcome"],
  "sentiment": "meeting tone"
}

Transcript: ${transcript}`,

            raw: `Clean up this voice transcript with proper punctuation and formatting. Return JSON:
{
  "transcript": "the cleaned transcript"
}

Raw transcript: ${transcript}`
        };

        try {
            const data = await generateContent(
                prompts[processingMode],
                "You are an expert transcription editor and note-taker. Clean up speech-to-text output and extract insights. Always respond with valid JSON.",
                { jsonMode: true }
            );

            setProcessedNote({
                transcript: data.transcript || transcript,
                summary: data.summary,
                actionItems: data.actionItems,
                keyPoints: data.keyPoints,
                sentiment: data.sentiment
            });
            setStatus('');
        } catch (err) {
            console.error('AI processing error:', err);
            setStatus('Processing failed');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const clearAll = () => {
        setTranscript('');
        setProcessedNote(null);
        finalTranscriptRef.current = '';
    };

    const modes = [
        { id: 'summary', label: 'Summary', icon: FileText },
        { id: 'actions', label: 'Actions', icon: ListChecks },
        { id: 'meeting', label: 'Meeting', icon: MessageSquare },
        { id: 'raw', label: 'Clean', icon: Sparkles }
    ];

    if (!isSpeechSupported) {
        return (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <MicOff size={48} style={{ margin: '0 auto 16px', color: 'hsl(215 15% 40%)' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'hsl(210 40% 98%)' }}>Speech Not Supported</h3>
                <p style={{ fontSize: '14px', color: 'hsl(215 20% 65%)' }}>
                    Your browser doesn't support speech recognition. Try Chrome or Edge.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
                <div
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px',
                        transition: 'all 0.3s',
                        ...(isRecording
                            ? { backgroundColor: 'hsl(0 84% 60%)', boxShadow: '0 8px 24px hsl(0 84% 60% / 0.4)' }
                            : { background: 'linear-gradient(135deg, hsl(160 84% 39%) 0%, hsl(174 84% 39%) 100%)', boxShadow: '0 8px 24px hsl(160 84% 39% / 0.3)' }
                        )
                    }}
                >
                    <Mic size={28} style={{ color: 'white' }} />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'hsl(210 40% 98%)' }}>Voice Notes</h2>
                <p style={{ fontSize: '12px', color: 'hsl(215 20% 65%)', marginTop: '4px' }}>Speak and let AI process your thoughts</p>
            </div>

            {/* Processing Mode Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {modes.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setProcessingMode(id as any)}
                        style={{
                            padding: '12px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease',
                            ...(processingMode === id
                                ? {
                                    background: 'linear-gradient(135deg, hsl(160 84% 39%) 0%, hsl(174 84% 39%) 100%)',
                                    color: 'white',
                                    boxShadow: '0 4px 16px hsl(160 84% 39% / 0.4)'
                                }
                                : {
                                    backgroundColor: 'hsl(222 47% 13%)',
                                    color: 'hsl(215 20% 70%)'
                                }
                            )
                        }}
                        onMouseEnter={(e) => {
                            if (processingMode !== id) {
                                e.currentTarget.style.backgroundColor = 'hsl(222 47% 18%)';
                                e.currentTarget.style.color = 'hsl(210 40% 98%)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (processingMode !== id) {
                                e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)';
                                e.currentTarget.style.color = 'hsl(215 20% 70%)';
                            }
                        }}
                    >
                        <Icon size={16} />
                        {label}
                    </button>
                ))}
            </div>

            {/* Recording Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                {!isRecording ? (
                    <button
                        onClick={startRecording}
                        style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            border: 'none',
                            background: 'linear-gradient(135deg, hsl(160 84% 39%) 0%, hsl(174 84% 39%) 100%)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 32px hsl(160 84% 39% / 0.4)',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        <Play size={36} style={{ marginLeft: '4px' }} />
                    </button>
                ) : (
                    <button
                        onClick={stopRecording}
                        style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            border: 'none',
                            backgroundColor: 'hsl(0 84% 60%)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 32px hsl(0 84% 60% / 0.4)',
                            animation: 'pulse 2s infinite'
                        }}
                    >
                        <Square size={32} />
                    </button>
                )}
            </div>

            {/* Status */}
            {status && (
                <div style={{ textAlign: 'center', fontSize: '14px', color: 'hsl(215 20% 65%)' }}>
                    {status}
                </div>
            )}

            {/* Live Transcript */}
            {(transcript || isRecording) && (
                <div className="space-y-3">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 15% 50%)' }}>
                            {isRecording ? 'Live Transcript' : 'Transcript'}
                        </h3>
                        {transcript && (
                            <button
                                onClick={clearAll}
                                style={{
                                    padding: '6px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(222 47% 15%)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <Trash2 size={14} style={{ color: 'hsl(215 20% 60%)' }} />
                            </button>
                        )}
                    </div>
                    <div
                        style={{
                            padding: '16px',
                            backgroundColor: 'hsl(222 47% 11%)',
                            border: '1px solid hsl(222 47% 18%)',
                            borderRadius: '14px',
                            fontSize: '14px',
                            color: 'hsl(210 40% 98%)',
                            lineHeight: 1.6
                        }}
                    >
                        {transcript || (
                            <span style={{ color: 'hsl(215 15% 45%)', fontStyle: 'italic' }}>Start speaking...</span>
                        )}
                        {isRecording && <span style={{ marginLeft: '4px', animation: 'pulse 1s infinite' }}>|</span>}
                    </div>

                    {!isRecording && transcript && (
                        <button
                            onClick={processWithAI}
                            disabled={aiLoading}
                            style={{
                                width: '100%',
                                padding: '16px 24px',
                                background: aiLoading
                                    ? 'hsl(222 47% 20%)'
                                    : 'linear-gradient(135deg, hsl(160 84% 39%) 0%, hsl(174 84% 39%) 100%)',
                                border: 'none',
                                borderRadius: '14px',
                                color: aiLoading ? 'hsl(215 20% 50%)' : 'white',
                                fontSize: '15px',
                                fontWeight: 700,
                                cursor: aiLoading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                transition: 'all 0.2s ease',
                                boxShadow: aiLoading ? 'none' : '0 8px 24px hsl(160 84% 39% / 0.35)',
                                opacity: aiLoading ? 0.6 : 1
                            }}
                        >
                            {aiLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    Process with AI
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}

            {/* Processed Results */}
            {processedNote && (
                <div className="space-y-4 animate-in">
                    {/* Cleaned Transcript */}
                    <section className="space-y-2">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 15% 50%)' }}>
                                Cleaned Transcript
                            </h3>
                            <button
                                onClick={() => copyToClipboard(processedNote.transcript)}
                                style={{ padding: '6px', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                <Copy size={14} style={{ color: 'hsl(215 20% 60%)' }} />
                            </button>
                        </div>
                        <p style={{
                            padding: '16px',
                            backgroundColor: 'hsl(222 47% 11%)',
                            borderRadius: '14px',
                            fontSize: '14px',
                            color: 'hsl(210 40% 98%)',
                            lineHeight: 1.6
                        }}>
                            {processedNote.transcript}
                        </p>
                    </section>

                    {/* Summary */}
                    {processedNote.summary && (
                        <section className="space-y-2">
                            <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 15% 50%)' }}>
                                Summary
                            </h3>
                            <p style={{
                                padding: '16px',
                                backgroundColor: 'hsl(222 47% 11%)',
                                border: '1px solid hsl(222 47% 18%)',
                                borderRadius: '14px',
                                fontSize: '14px',
                                color: 'hsl(210 40% 98%)',
                                lineHeight: 1.6
                            }}>
                                {processedNote.summary}
                            </p>
                        </section>
                    )}

                    {/* Key Points */}
                    {processedNote.keyPoints && processedNote.keyPoints.length > 0 && (
                        <section className="space-y-2">
                            <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 15% 50%)' }}>
                                Key Points
                            </h3>
                            <ul style={{ display: 'grid', gap: '8px' }}>
                                {processedNote.keyPoints.map((point, i) => (
                                    <li key={i} style={{ display: 'flex', gap: '12px', fontSize: '14px', color: 'hsl(215 20% 75%)' }}>
                                        <span style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            backgroundColor: 'hsl(160 84% 39% / 0.15)',
                                            color: 'hsl(160 84% 50%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            flexShrink: 0
                                        }}>
                                            {i + 1}
                                        </span>
                                        {point}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* Action Items */}
                    {processedNote.actionItems && processedNote.actionItems.length > 0 && (
                        <section className="space-y-2">
                            <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 15% 50%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ListChecks size={12} /> Action Items
                            </h3>
                            <ul style={{ display: 'grid', gap: '8px' }}>
                                {processedNote.actionItems.map((item, i) => (
                                    <li
                                        key={i}
                                        style={{
                                            display: 'flex',
                                            gap: '12px',
                                            fontSize: '14px',
                                            backgroundColor: 'hsl(222 47% 11%)',
                                            border: '1px solid hsl(222 47% 18%)',
                                            padding: '14px 16px',
                                            borderRadius: '12px',
                                            color: 'hsl(210 40% 98%)'
                                        }}
                                    >
                                        <input type="checkbox" style={{ accentColor: 'hsl(24 95% 50%)', marginTop: '2px' }} />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* Sentiment */}
                    {processedNote.sentiment && (
                        <div style={{ fontSize: '12px', color: 'hsl(215 15% 50%)' }}>
                            Tone: <span style={{ color: 'hsl(215 20% 65%)' }}>{processedNote.sentiment}</span>
                        </div>
                    )}
                </div>
            )}

            {aiError && (
                <div style={{
                    padding: '14px 16px',
                    backgroundColor: 'hsl(0 84% 60% / 0.1)',
                    border: '1px solid hsl(0 84% 60% / 0.2)',
                    borderRadius: '12px',
                    color: 'hsl(0 84% 65%)',
                    fontSize: '13px'
                }}>
                    {aiError}
                </div>
            )}
        </div>
    );
};

export default VoiceNotes;
