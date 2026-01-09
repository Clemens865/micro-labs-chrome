/**
 * Gemini Live API Service for real-time audio transcription
 * Uses WebSocket streaming to Gemini's native audio model
 */

import { GoogleGenAI, Modality } from '@google/genai';
import { createPcmBlob, AudioBlob } from './audioUtils';

// Types
export interface LiveConnectionCallbacks {
    onOpen: () => void;
    onTranscription: (text: string, isFinal: boolean) => void;
    onClose: () => void;
    onError: (error: Error) => void;
}

export interface LiveSessionConfig {
    language?: string;
    systemInstruction?: string;
}

// State variables
let inputAudioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;
let scriptProcessor: ScriptProcessorNode | null = null;
let activeSession: any = null;
let silenceTimeout: ReturnType<typeof setInterval> | null = null;
let lastTranscriptionUpdate = 0;
let currentAccumulatedTranscription = '';
let isConnected = false;

/**
 * Get the API key via Chrome runtime message (same as useGemini hook)
 */
const getApiKey = async (): Promise<string | null> => {
    return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, (response) => {
                resolve(response?.apiKey || null);
            });
        } else {
            // Fallback for development
            resolve(null);
        }
    });
};

/**
 * Connect to Gemini Live API for real-time transcription
 */
export const connectLiveSession = async (
    callbacks: LiveConnectionCallbacks,
    config: LiveSessionConfig = {}
): Promise<void> => {
    try {
        // Get API key
        const apiKey = await getApiKey();
        if (!apiKey) {
            throw new Error('API key not configured. Please set your Gemini API key in settings.');
        }

        // Initialize AI client with v1alpha for Live API support
        const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1alpha' });

        // Reset state
        currentAccumulatedTranscription = '';
        activeSession = null;
        isConnected = false;
        if (silenceTimeout) clearInterval(silenceTimeout);

        // Create audio context with 16kHz sample rate for Gemini
        inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 16000,
        });

        // Get microphone access
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        // Build system instruction
        const systemInstruction = config.systemInstruction ||
            `You are a meeting transcription assistant. Listen and transcribe accurately. Language: ${config.language || 'English'}`;

        console.log('Attempting to connect to Gemini Live API...');
        console.log('Model: gemini-live-2.5-flash-preview');

        // Connect to Gemini Live API
        // Use the official Live API model name from SDK docs
        const session = await ai.live.connect({
            model: 'gemini-live-2.5-flash-preview',
            config: {
                responseModalities: [Modality.TEXT],
                systemInstruction: systemInstruction,
            },
            callbacks: {
                onopen: () => {
                    console.log('Live API connection opened successfully');
                    isConnected = true;
                    callbacks.onOpen();

                    if (!inputAudioContext || !mediaStream) return;

                    // Create audio processing pipeline
                    const source = inputAudioContext.createMediaStreamSource(mediaStream);
                    scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);

                    scriptProcessor.onaudioprocess = (e) => {
                        if (!activeSession || !isConnected) return;

                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcmBlob = createPcmBlob(inputData);

                        try {
                            activeSession.sendRealtimeInput({ media: pcmBlob });
                        } catch (err) {
                            console.error('Error sending audio:', err);
                        }
                    };

                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContext.destination);

                    // Watchdog to finalize text if silence is detected
                    silenceTimeout = setInterval(() => {
                        const now = Date.now();
                        if (currentAccumulatedTranscription.trim() && (now - lastTranscriptionUpdate > 2000)) {
                            // Force finalize if > 2 seconds of silence/inactivity
                            callbacks.onTranscription(currentAccumulatedTranscription, true);
                            currentAccumulatedTranscription = '';
                        }
                    }, 1000);
                },
                onmessage: (message: any) => {
                    console.log('Live API message:', JSON.stringify(message, null, 2));

                    // Handle text responses (for TEXT modality)
                    if (message.serverContent?.modelTurn?.parts) {
                        for (const part of message.serverContent.modelTurn.parts) {
                            if (part.text) {
                                currentAccumulatedTranscription += part.text;
                                lastTranscriptionUpdate = Date.now();
                                callbacks.onTranscription(currentAccumulatedTranscription, false);
                            }
                        }
                    }

                    // Handle transcription from inputTranscription (if available)
                    if (message.serverContent?.inputTranscription) {
                        const text = message.serverContent.inputTranscription.text;
                        if (text) {
                            currentAccumulatedTranscription += text;
                            lastTranscriptionUpdate = Date.now();
                            callbacks.onTranscription(currentAccumulatedTranscription, false);
                        }
                    }

                    // Handle turn complete signal
                    if (message.serverContent?.turnComplete) {
                        if (currentAccumulatedTranscription.trim()) {
                            callbacks.onTranscription(currentAccumulatedTranscription, true);
                            currentAccumulatedTranscription = '';
                        }
                    }
                },
                onclose: (e: any) => {
                    console.log('Live API connection closed:', e?.reason || 'unknown reason');
                    isConnected = false;
                    callbacks.onClose();
                    if (silenceTimeout) clearInterval(silenceTimeout);
                },
                onerror: (e: any) => {
                    isConnected = false;
                    const errorMsg = e?.message || e?.reason || (typeof e === 'string' ? e : 'Live session error');
                    callbacks.onError(new Error(errorMsg));
                    console.error('Live session error details:', e);
                }
            }
        });

        activeSession = session;

    } catch (error: any) {
        console.error('Live session connection error:', error);
        const errorMessage = error?.message || error?.reason || 'Failed to connect to Gemini Live API';
        callbacks.onError(new Error(errorMessage));
    }
};

/**
 * Disconnect from Gemini Live API
 */
export const disconnectLiveSession = async (): Promise<void> => {
    isConnected = false;

    if (silenceTimeout) {
        clearInterval(silenceTimeout);
        silenceTimeout = null;
    }

    if (scriptProcessor) {
        scriptProcessor.disconnect();
        scriptProcessor = null;
    }

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }

    if (inputAudioContext) {
        try {
            await inputAudioContext.close();
        } catch (e) {
            // Ignore close errors
        }
        inputAudioContext = null;
    }

    if (activeSession) {
        try {
            activeSession.close?.();
        } catch (e) {
            // Ignore close errors
        }
        activeSession = null;
    }
};

/**
 * Check if Live API is currently connected
 */
export const isLiveSessionConnected = (): boolean => {
    return isConnected && activeSession !== null;
};
