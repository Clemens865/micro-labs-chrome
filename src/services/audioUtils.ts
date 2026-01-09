/**
 * Audio utility functions for converting audio data to PCM format
 * compatible with Google's Gemini Live API
 */

export interface AudioBlob {
    data: string;
    mimeType: string;
}

/**
 * Convert Float32Array audio data to PCM Blob for Gemini Live API
 */
export function createPcmBlob(data: Float32Array): AudioBlob {
    const l = data.length;
    const int16 = new Int16Array(l);

    for (let i = 0; i < l; i++) {
        // Clamp values to [-1, 1] to prevent wrapping artifacts
        const s = Math.max(-1, Math.min(1, data[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    return {
        data: base64EncodeUint8Array(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

/**
 * Encode Uint8Array to base64 string
 */
export function base64EncodeUint8Array(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Decode base64 string to Uint8Array
 */
export function decodeAudioData(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Convert PCM data to AudioBuffer for playback
 */
export async function convertPcmToAudioBuffer(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number = 24000,
    numChannels: number = 1
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}
