import React, { useState, useEffect, useRef } from 'react';
import { usePageContext } from '../../hooks/usePageContext';
import { useGemini } from '../../hooks/useGemini';
import {
    Volume2,
    Play,
    Pause,
    Square,
    SkipBack,
    SkipForward,
    Settings,
    Loader2,
    FileText,
    Sparkles,
    Mic
} from 'lucide-react';

// Gemini TTS voices - high quality neural voices (support 24 languages including German)
const GEMINI_VOICES = [
    // Popular voices
    { id: 'Kore', name: 'Kore', gender: 'Female', style: 'Warm, friendly' },
    { id: 'Puck', name: 'Puck', gender: 'Male', style: 'Upbeat, energetic' },
    { id: 'Charon', name: 'Charon', gender: 'Male', style: 'Deep, authoritative' },
    { id: 'Fenrir', name: 'Fenrir', gender: 'Male', style: 'Calm, measured' },
    { id: 'Aoede', name: 'Aoede', gender: 'Female', style: 'Clear, professional' },
    { id: 'Leda', name: 'Leda', gender: 'Female', style: 'Soft, gentle' },
    { id: 'Orus', name: 'Orus', gender: 'Male', style: 'Confident, bold' },
    { id: 'Zephyr', name: 'Zephyr', gender: 'Female', style: 'Light, airy' },
    // Additional voices
    { id: 'Achernar', name: 'Achernar', gender: 'Male', style: 'Warm, resonant' },
    { id: 'Algenib', name: 'Algenib', gender: 'Female', style: 'Bright, clear' },
    { id: 'Schedar', name: 'Schedar', gender: 'Female', style: 'Smooth, elegant' },
    { id: 'Gacrux', name: 'Gacrux', gender: 'Male', style: 'Deep, steady' },
    { id: 'Pulcherrima', name: 'Pulcherrima', gender: 'Female', style: 'Rich, expressive' },
    { id: 'Vindemiatrix', name: 'Vindemiatrix', gender: 'Female', style: 'Soft, melodic' },
];

const PageReader: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading: aiLoading } = useGemini();

    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
    const [rate, setRate] = useState<'slow' | 'normal' | 'fast'>('normal');
    const [textToRead, setTextToRead] = useState<string>('');
    const [progress, setProgress] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [mode, setMode] = useState<'page' | 'summary' | 'custom'>('page');
    const [customText, setCustomText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const currentChunkRef = useRef(0);
    const totalChunksRef = useRef(0);

    useEffect(() => {
        audioRef.current = new Audio();
        audioRef.current.onended = handleAudioEnded;
        audioRef.current.ontimeupdate = handleTimeUpdate;
        audioRef.current.onerror = () => {
            setError('Audio playback failed');
            setIsPlaying(false);
        };

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
        };
    }, []);

    useEffect(() => {
        if (mode === 'page' && context?.content) {
            setTextToRead(context.content.substring(0, 10000));
        } else if (mode === 'custom') {
            setTextToRead(customText);
        }
    }, [mode, context?.content, customText]);

    const generateSummaryToRead = async () => {
        if (!context?.content) return;

        const prompt = `Create a spoken summary of this webpage content. Write it in a natural, conversational style. Keep it to 2-3 paragraphs.

Page Title: ${context.title}
Content: ${context.content.substring(0, 8000)}`;

        try {
            const summary = await generateContent(prompt,
                "You are a professional narrator. Write content that sounds natural when read aloud.",
                { jsonMode: false }
            );
            setTextToRead(summary);
        } catch (err) {
            console.error('Summary generation failed:', err);
            setError('Failed to generate summary');
        }
    };

    const splitTextIntoChunks = (text: string): string[] => {
        // Gemini TTS works best with smaller chunks
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        const chunks: string[] = [];
        let currentChunk = '';

        sentences.forEach(sentence => {
            if ((currentChunk + sentence).length < 800) {
                currentChunk += sentence;
            } else {
                if (currentChunk) chunks.push(currentChunk.trim());
                currentChunk = sentence;
            }
        });

        if (currentChunk) chunks.push(currentChunk.trim());
        return chunks;
    };

    // Create WAV header for raw PCM data (Gemini returns 24kHz, 16-bit, mono PCM)
    const createWavFromPcm = (pcmData: Uint8Array): Blob => {
        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const dataSize = pcmData.length;
        const headerSize = 44;
        const totalSize = headerSize + dataSize;

        const buffer = new ArrayBuffer(totalSize);
        const view = new DataView(buffer);

        // RIFF header
        const writeString = (offset: number, str: string) => {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, totalSize - 8, true); // File size - 8
        writeString(8, 'WAVE');

        // fmt subchunk
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
        view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);

        // data subchunk
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);

        // Copy PCM data
        const wavBytes = new Uint8Array(buffer);
        wavBytes.set(pcmData, headerSize);

        return new Blob([wavBytes], { type: 'audio/wav' });
    };

    const generateAudioWithGemini = async (text: string): Promise<Blob> => {
        // Get API key from storage
        const result = await chrome.storage.sync.get(['apiKey']);
        const apiKey = result.apiKey;

        if (!apiKey) {
            throw new Error('API key not configured. Please set your Gemini API key in settings.');
        }

        const rateInstruction = rate === 'slow' ? 'Speak slowly and clearly.' :
                               rate === 'fast' ? 'Speak at a brisk pace.' : '';

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `${rateInstruction} Read this naturally: ${text}`
                        }]
                    }],
                    generationConfig: {
                        responseModalities: ['AUDIO'],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: selectedVoice
                                }
                            }
                        }
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();

        // Extract audio data from response
        const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        const mimeType = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType;

        if (!audioData) {
            throw new Error('No audio data in response');
        }

        // Convert base64 to bytes
        const binaryString = atob(audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // If it's already a proper audio format, use it directly
        if (mimeType && (mimeType.includes('mp3') || mimeType.includes('wav') || mimeType.includes('ogg'))) {
            return new Blob([bytes], { type: mimeType });
        }

        // Gemini returns raw PCM at 24kHz - add WAV header
        return createWavFromPcm(bytes);
    };

    const handlePlay = async () => {
        if (!textToRead) return;
        setError(null);

        if (isPaused && audioRef.current) {
            audioRef.current.play();
            setIsPaused(false);
            setIsPlaying(true);
            return;
        }

        setIsGenerating(true);
        setProgress(0);

        try {
            const chunks = splitTextIntoChunks(textToRead);
            totalChunksRef.current = chunks.length;
            audioChunksRef.current = [];
            currentChunkRef.current = 0;

            // Generate first chunk
            const firstChunkAudio = await generateAudioWithGemini(chunks[0]);
            audioChunksRef.current[0] = firstChunkAudio;

            // Start playing
            if (audioRef.current) {
                audioRef.current.src = URL.createObjectURL(firstChunkAudio);
                await audioRef.current.play();
                setIsPlaying(true);
                setIsGenerating(false);
            }

            // Generate remaining chunks in background
            for (let i = 1; i < chunks.length; i++) {
                try {
                    const chunkAudio = await generateAudioWithGemini(chunks[i]);
                    audioChunksRef.current[i] = chunkAudio;
                } catch (err) {
                    console.error(`Failed to generate chunk ${i}:`, err);
                }
            }
        } catch (err: any) {
            console.error('TTS generation failed:', err);
            setError(err.message || 'Failed to generate speech');
            setIsGenerating(false);
            setIsPlaying(false);
        }
    };

    const handleAudioEnded = () => {
        currentChunkRef.current++;
        const nextChunk = currentChunkRef.current;

        if (nextChunk < audioChunksRef.current.length && audioChunksRef.current[nextChunk]) {
            if (audioRef.current) {
                audioRef.current.src = URL.createObjectURL(audioChunksRef.current[nextChunk]);
                audioRef.current.play();
            }
            setProgress((nextChunk / totalChunksRef.current) * 100);
        } else if (nextChunk >= totalChunksRef.current) {
            setIsPlaying(false);
            setProgress(100);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current && audioRef.current.duration) {
            const chunkProgress = audioRef.current.currentTime / audioRef.current.duration;
            const overallProgress = ((currentChunkRef.current + chunkProgress) / totalChunksRef.current) * 100;
            setProgress(Math.min(overallProgress, 100));
        }
    };

    const handlePause = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPaused(true);
            setIsPlaying(false);
        }
    };

    const handleStop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
        }
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(0);
        currentChunkRef.current = 0;
        audioChunksRef.current = [];
    };

    const handleSkipBack = () => {
        if (currentChunkRef.current > 0) {
            currentChunkRef.current = Math.max(0, currentChunkRef.current - 1);
            if (audioRef.current && audioChunksRef.current[currentChunkRef.current]) {
                audioRef.current.src = URL.createObjectURL(audioChunksRef.current[currentChunkRef.current]);
                if (isPlaying) audioRef.current.play();
            }
            setProgress((currentChunkRef.current / totalChunksRef.current) * 100);
        }
    };

    const handleSkipForward = () => {
        if (currentChunkRef.current < audioChunksRef.current.length - 1) {
            currentChunkRef.current = Math.min(audioChunksRef.current.length - 1, currentChunkRef.current + 1);
            if (audioRef.current && audioChunksRef.current[currentChunkRef.current]) {
                audioRef.current.src = URL.createObjectURL(audioChunksRef.current[currentChunkRef.current]);
                if (isPlaying) audioRef.current.play();
            }
            setProgress((currentChunkRef.current / totalChunksRef.current) * 100);
        }
    };

    const ModeButton: React.FC<{ active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({ active, onClick, disabled, children }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                ...(active
                    ? {
                        background: 'linear-gradient(135deg, hsl(199 89% 48%) 0%, hsl(217 91% 60%) 100%)',
                        color: 'white',
                        boxShadow: '0 4px 16px hsl(199 89% 48% / 0.4)'
                    }
                    : {
                        backgroundColor: 'hsl(222 47% 13%)',
                        color: 'hsl(215 20% 65%)'
                    })
            }}
            onMouseEnter={(e) => {
                if (!active && !disabled) {
                    e.currentTarget.style.backgroundColor = 'hsl(222 47% 18%)';
                    e.currentTarget.style.color = 'hsl(210 40% 98%)';
                }
            }}
            onMouseLeave={(e) => {
                if (!active && !disabled) {
                    e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)';
                    e.currentTarget.style.color = 'hsl(215 20% 65%)';
                }
            }}
        >
            {children}
        </button>
    );

    const ControlButton: React.FC<{ onClick: () => void; disabled?: boolean; primary?: boolean; children: React.ReactNode }> = ({ onClick, disabled, primary, children }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: primary ? '0' : '14px',
                width: primary ? '68px' : 'auto',
                height: primary ? '68px' : 'auto',
                borderRadius: primary ? '50%' : '14px',
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: disabled ? 0.5 : 1,
                ...(primary
                    ? {
                        background: 'linear-gradient(135deg, hsl(199 89% 48%) 0%, hsl(217 91% 60%) 100%)',
                        color: 'white',
                        boxShadow: '0 8px 24px hsl(199 89% 48% / 0.35)'
                    }
                    : {
                        backgroundColor: 'hsl(222 47% 11%)',
                        color: 'hsl(210 40% 98%)'
                    })
            }}
            onMouseEnter={(e) => {
                if (!disabled) {
                    if (primary) {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 12px 32px hsl(199 89% 48% / 0.45)';
                    } else {
                        e.currentTarget.style.backgroundColor = 'hsl(222 47% 18%)';
                    }
                }
            }}
            onMouseLeave={(e) => {
                if (!disabled) {
                    if (primary) {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 8px 24px hsl(199 89% 48% / 0.35)';
                    } else {
                        e.currentTarget.style.backgroundColor = 'hsl(222 47% 11%)';
                    }
                }
            }}
        >
            {children}
        </button>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: 'linear-gradient(135deg, hsl(199 89% 48%) 0%, hsl(217 91% 60%) 100%)',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    boxShadow: '0 8px 24px hsl(199 89% 48% / 0.35)'
                }}>
                    <Volume2 size={32} style={{ color: 'white' }} />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'hsl(210 40% 98%)' }}>Page Reader</h2>
                <p style={{ fontSize: '12px', color: 'hsl(215 20% 55%)', marginTop: '6px' }}>
                    <Mic size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    Powered by Gemini TTS
                </p>
            </div>

            {/* Mode Selector */}
            <div style={{ display: 'flex', gap: '10px' }}>
                <ModeButton active={mode === 'page'} onClick={() => setMode('page')}>
                    <FileText size={14} />
                    Full Page
                </ModeButton>
                <ModeButton
                    active={mode === 'summary'}
                    disabled={aiLoading}
                    onClick={() => {
                        setMode('summary');
                        generateSummaryToRead();
                    }}
                >
                    {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    AI Summary
                </ModeButton>
                <ModeButton active={mode === 'custom'} onClick={() => setMode('custom')}>
                    Custom
                </ModeButton>
            </div>

            {/* Custom Text Input */}
            {mode === 'custom' && (
                <textarea
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Enter or paste text to read aloud..."
                    rows={5}
                    style={{
                        width: '100%',
                        padding: '14px 16px',
                        backgroundColor: 'hsl(222 47% 11%)',
                        border: '1px solid hsl(222 47% 20%)',
                        borderRadius: '14px',
                        color: 'hsl(210 40% 98%)',
                        fontSize: '14px',
                        resize: 'none',
                        outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = 'hsl(199 89% 48%)';
                        e.target.style.boxShadow = '0 0 0 3px hsl(199 89% 48% / 0.15)';
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = 'hsl(222 47% 20%)';
                        e.target.style.boxShadow = 'none';
                    }}
                />
            )}

            {/* Text Preview */}
            {textToRead && mode !== 'custom' && (
                <div style={{
                    padding: '16px',
                    backgroundColor: 'hsl(222 47% 9%)',
                    border: '1px solid hsl(222 47% 15%)',
                    borderRadius: '14px',
                    maxHeight: '120px',
                    overflowY: 'auto'
                }}>
                    <p style={{
                        fontSize: '12px',
                        color: 'hsl(215 20% 60%)',
                        lineHeight: 1.6,
                        display: '-webkit-box',
                        WebkitLineClamp: 5,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}>
                        {textToRead.substring(0, 500)}...
                    </p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div style={{
                    padding: '12px 16px',
                    backgroundColor: 'hsl(0 84% 60% / 0.1)',
                    border: '1px solid hsl(0 84% 60% / 0.3)',
                    borderRadius: '12px',
                    color: 'hsl(0 84% 65%)',
                    fontSize: '13px',
                    fontWeight: 500
                }}>
                    {error}
                </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-2">
                <div style={{
                    height: '6px',
                    backgroundColor: 'hsl(222 47% 15%)',
                    borderRadius: '100px',
                    overflow: 'hidden'
                }}>
                    <div
                        style={{
                            height: '100%',
                            background: isGenerating
                                ? 'linear-gradient(90deg, hsl(45 93% 47%) 0%, hsl(32 95% 44%) 100%)'
                                : 'linear-gradient(90deg, hsl(199 89% 48%) 0%, hsl(217 91% 60%) 100%)',
                            width: `${progress}%`,
                            transition: 'width 0.3s ease',
                            borderRadius: '100px'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'hsl(215 20% 50%)' }}>
                    <span>{isGenerating ? 'Generating...' : `${Math.round(progress)}%`}</span>
                    <span>{totalChunksRef.current > 0 ? `${currentChunkRef.current + 1}/${totalChunksRef.current}` : '-'}</span>
                </div>
            </div>

            {/* Playback Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <ControlButton onClick={handleSkipBack} disabled={!isPlaying && !isPaused}>
                    <SkipBack size={20} />
                </ControlButton>

                {isPlaying ? (
                    <ControlButton onClick={handlePause} primary>
                        <Pause size={28} />
                    </ControlButton>
                ) : (
                    <ControlButton onClick={handlePlay} disabled={!textToRead || isGenerating} primary>
                        {isGenerating ? (
                            <Loader2 size={28} className="animate-spin" />
                        ) : (
                            <Play size={28} style={{ marginLeft: '2px' }} />
                        )}
                    </ControlButton>
                )}

                <ControlButton onClick={handleSkipForward} disabled={!isPlaying && !isPaused}>
                    <SkipForward size={20} />
                </ControlButton>

                <ControlButton onClick={handleStop} disabled={!isPlaying && !isPaused}>
                    <Square size={20} />
                </ControlButton>
            </div>

            {/* Settings Toggle */}
            <button
                onClick={() => setShowSettings(!showSettings)}
                style={{
                    width: '100%',
                    padding: '14px 20px',
                    backgroundColor: 'hsl(222 47% 11%)',
                    border: '1px solid hsl(222 47% 18%)',
                    borderRadius: '14px',
                    color: 'hsl(210 40% 98%)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'hsl(222 47% 16%)';
                    e.currentTarget.style.borderColor = 'hsl(222 47% 25%)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'hsl(222 47% 11%)';
                    e.currentTarget.style.borderColor = 'hsl(222 47% 18%)';
                }}
            >
                <Settings size={18} />
                Voice Settings
            </button>

            {/* Settings Panel */}
            {showSettings && (
                <div style={{
                    padding: '20px',
                    backgroundColor: 'hsl(222 47% 9%)',
                    border: '1px solid hsl(222 47% 15%)',
                    borderRadius: '16px'
                }} className="space-y-5 animate-in">
                    {/* Voice Selection */}
                    <div className="space-y-2">
                        <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 65%)' }}>
                            Voice
                        </label>
                        <select
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                backgroundColor: 'hsl(222 47% 7%)',
                                border: '1px solid hsl(222 47% 18%)',
                                borderRadius: '12px',
                                color: 'hsl(210 40% 98%)',
                                fontSize: '14px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {GEMINI_VOICES.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.name} ({v.gender}) - {v.style}
                                </option>
                            ))}
                        </select>
                        <p style={{ fontSize: '10px', color: 'hsl(215 20% 50%)', marginTop: '4px' }}>
                            Supports 24 languages including German, French, Spanish
                        </p>
                    </div>

                    {/* Speed */}
                    <div className="space-y-2">
                        <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 65%)' }}>
                            Speed
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {(['slow', 'normal', 'fast'] as const).map((speed) => (
                                <button
                                    key={speed}
                                    onClick={() => setRate(speed)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        ...(rate === speed
                                            ? {
                                                background: 'linear-gradient(135deg, hsl(199 89% 48%) 0%, hsl(217 91% 60%) 100%)',
                                                color: 'white'
                                            }
                                            : {
                                                backgroundColor: 'hsl(222 47% 13%)',
                                                color: 'hsl(215 20% 65%)'
                                            })
                                    }}
                                >
                                    {speed.charAt(0).toUpperCase() + speed.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Info */}
            {!textToRead && mode === 'page' && (
                <div style={{
                    textAlign: 'center',
                    padding: '24px 16px',
                    color: 'hsl(215 20% 50%)',
                    fontSize: '13px'
                }}>
                    Navigate to a page with content to start reading
                </div>
            )}
        </div>
    );
};

export default PageReader;
