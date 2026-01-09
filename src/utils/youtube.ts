/**
 * YouTube Transcript Extraction Utility
 * Extracts captions/transcripts from YouTube videos
 */

export interface TranscriptSegment {
    text: string;
    start: number;
    duration: number;
}

export interface YouTubeTranscript {
    segments: TranscriptSegment[];
    fullText: string;
    language: string;
}

/**
 * Extract video ID from YouTube URL
 */
export const extractVideoId = (url: string): string | null => {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
};

/**
 * Fetch YouTube transcript using the internal YouTube API
 * This is injected into the YouTube page context
 */
export const fetchYouTubeTranscriptScript = (): string => {
    return `
    (async function() {
        try {
            // Find the ytInitialPlayerResponse which contains caption tracks
            const playerResponse = window.ytInitialPlayerResponse ||
                JSON.parse(document.querySelector('script:not([src])').textContent.match(/ytInitialPlayerResponse\\s*=\\s*({.+?});/)?.[1] || '{}');

            const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

            if (!captions || captions.length === 0) {
                return { error: 'No captions available for this video', segments: [], fullText: '' };
            }

            // Prefer manual captions over auto-generated, and English if available
            let selectedTrack = captions.find(t => t.languageCode === 'en' && !t.kind) ||
                               captions.find(t => t.languageCode === 'en') ||
                               captions.find(t => !t.kind) ||
                               captions[0];

            const captionUrl = selectedTrack.baseUrl;

            // Fetch the transcript XML
            const response = await fetch(captionUrl);
            const xml = await response.text();

            // Parse the XML transcript
            const parser = new DOMParser();
            const doc = parser.parseFromString(xml, 'text/xml');
            const textElements = doc.querySelectorAll('text');

            const segments = [];
            let fullText = '';

            textElements.forEach(el => {
                const text = el.textContent
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/\\n/g, ' ')
                    .trim();

                if (text) {
                    segments.push({
                        text: text,
                        start: parseFloat(el.getAttribute('start') || '0'),
                        duration: parseFloat(el.getAttribute('dur') || '0')
                    });
                    fullText += text + ' ';
                }
            });

            return {
                segments: segments,
                fullText: fullText.trim(),
                language: selectedTrack.languageCode,
                trackName: selectedTrack.name?.simpleText || 'Auto-generated'
            };
        } catch (e) {
            return { error: e.message, segments: [], fullText: '' };
        }
    })();
    `;
};

/**
 * Format timestamp from seconds to MM:SS or HH:MM:SS
 */
export const formatTimestamp = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Group transcript into logical chapters based on time intervals
 */
export const groupTranscriptByTime = (
    segments: TranscriptSegment[],
    intervalSeconds: number = 120
): { timestamp: string; text: string }[] => {
    const groups: { timestamp: string; text: string }[] = [];
    let currentGroup = { start: 0, text: '' };

    segments.forEach((segment) => {
        if (segment.start - currentGroup.start >= intervalSeconds && currentGroup.text) {
            groups.push({
                timestamp: formatTimestamp(currentGroup.start),
                text: currentGroup.text.trim()
            });
            currentGroup = { start: segment.start, text: '' };
        }
        currentGroup.text += segment.text + ' ';
    });

    // Add the last group
    if (currentGroup.text) {
        groups.push({
            timestamp: formatTimestamp(currentGroup.start),
            text: currentGroup.text.trim()
        });
    }

    return groups;
};
