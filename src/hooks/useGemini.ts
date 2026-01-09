import { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';

// Types for the new SDK
interface Part {
    text?: string;
    inlineData?: {
        mimeType: string;
        data: string;
    };
}

interface GenerateOptions {
    jsonMode?: boolean;
    model?: string;
    imageData?: string;
    imageMimeType?: string;
    // New SDK features
    tools?: Array<{ googleSearch?: object; googleMaps?: object; urlContext?: object }>;
    thinkingBudget?: number;
}

interface SearchGroundingResult {
    text: string;
    sources: Array<{
        uri: string;
        title?: string;
    }>;
}

export const useGemini = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateContent = useCallback(async (
        prompt: string,
        systemInstruction?: string,
        options: GenerateOptions = {}
    ) => {
        setLoading(true);
        setError(null);

        try {
            const { apiKey } = await new Promise<{ apiKey: string }>((resolve) => {
                chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, resolve);
            });

            if (!apiKey) {
                throw new Error('API Key not found. Please set it in settings.');
            }

            // Initialize new SDK
            const ai = new GoogleGenAI({ apiKey });

            // Build the model name - use latest models
            const modelName = options.model || 'gemini-2.0-flash';

            // Build contents - can be string or array of parts
            let contents: string | Part[] = prompt;

            if (options.imageData) {
                contents = [
                    {
                        inlineData: {
                            mimeType: options.imageMimeType || 'image/png',
                            data: options.imageData
                        }
                    },
                    { text: prompt }
                ];
            }

            // Build config
            const config: any = {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 4096,
            };

            // JSON mode
            if (options.jsonMode) {
                config.responseMimeType = 'application/json';
            }

            // Thinking/reasoning budget (for complex tasks)
            if (options.thinkingBudget) {
                config.thinkingConfig = {
                    thinkingBudget: options.thinkingBudget
                };
            }

            // Tools (Google Search, Maps grounding)
            if (options.tools) {
                config.tools = options.tools;
            }

            // System instruction goes in config
            if (systemInstruction) {
                config.systemInstruction = systemInstruction;
            }

            // Make the API call using new SDK pattern
            const response = await ai.models.generateContent({
                model: modelName,
                contents,
                config
            });

            // Get text using the getter (not a function in new SDK)
            const text = response.text;

            if (!text) {
                throw new Error('No response text generated');
            }

            if (options.jsonMode) {
                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.error('Failed to parse JSON response', text);
                    throw new Error('AI returned invalid JSON');
                }
            }

            return text;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // New method: Generate with Google Search grounding
    const generateWithSearch = useCallback(async (
        prompt: string,
        systemInstruction?: string
    ): Promise<SearchGroundingResult> => {
        setLoading(true);
        setError(null);

        try {
            const { apiKey } = await new Promise<{ apiKey: string }>((resolve) => {
                chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, resolve);
            });

            if (!apiKey) {
                throw new Error('API Key not found. Please set it in settings.');
            }

            const ai = new GoogleGenAI({ apiKey });

            const config: any = {
                tools: [{ googleSearch: {} }]
            };

            if (systemInstruction) {
                config.systemInstruction = systemInstruction;
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
                config
            });

            const text = response.text || '';

            // Extract grounding sources from response
            const sources: Array<{ uri: string; title?: string }> = [];

            // Check for grounding metadata in candidates
            const candidate = response.candidates?.[0];
            if (candidate) {
                const groundingMetadata = (candidate as any).groundingMetadata;
                if (groundingMetadata?.groundingChunks) {
                    for (const chunk of groundingMetadata.groundingChunks) {
                        if (chunk.web?.uri) {
                            sources.push({
                                uri: chunk.web.uri,
                                title: chunk.web.title
                            });
                        }
                    }
                }
            }

            return { text, sources };
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // New method: Generate images (requires Gemini 2.0 Flash or Imagen)
    const generateImage = useCallback(async (
        prompt: string,
        options: {
            aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
            numberOfImages?: number;
        } = {}
    ): Promise<string[]> => {
        setLoading(true);
        setError(null);

        try {
            const { apiKey } = await new Promise<{ apiKey: string }>((resolve) => {
                chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, resolve);
            });

            if (!apiKey) {
                throw new Error('API Key not found. Please set it in settings.');
            }

            const ai = new GoogleGenAI({ apiKey });

            // Use Gemini 2.5 Flash Image model for image generation (same as original MicroLabs apps)
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [{ text: prompt }]
                },
                config: {
                    systemInstruction: 'You are an image generation AI. Generate high-quality images based on the prompt. OUTPUT: ONLY the image data. NO TEXT.'
                }
            });

            // Extract base64 images from response
            const images: string[] = [];
            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData?.data) {
                        images.push(part.inlineData.data);
                    }
                }
            }

            return images;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // New method: Analyze URLs with URL Context Tool (agentic browsing)
    const analyzeUrls = useCallback(async (
        urls: string[],
        prompt: string,
        options: {
            systemInstruction?: string;
            includeSearch?: boolean;
            jsonMode?: boolean;
        } = {}
    ): Promise<{ text: string; sources: Array<{ uri: string; title?: string }> }> => {
        setLoading(true);
        setError(null);

        try {
            const { apiKey } = await new Promise<{ apiKey: string }>((resolve) => {
                chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, resolve);
            });

            if (!apiKey) {
                throw new Error('API Key not found. Please set it in settings.');
            }

            const ai = new GoogleGenAI({ apiKey });

            // Build tools array - URL Context with optional Google Search
            const tools: any[] = [{ urlContext: {} }];
            if (options.includeSearch) {
                tools.push({ googleSearch: {} });
            }

            const config: any = {
                tools,
                maxOutputTokens: 8192,
            };

            if (options.systemInstruction) {
                config.systemInstruction = options.systemInstruction;
            }

            if (options.jsonMode) {
                config.responseMimeType = 'application/json';
            }

            // Build prompt with URLs
            const urlList = urls.map((url, i) => `${i + 1}. ${url}`).join('\n');
            const fullPrompt = `Analyze the following URLs:
${urlList}

${prompt}`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: fullPrompt,
                config
            });

            const text = response.text || '';

            // Extract sources from grounding metadata
            const sources: Array<{ uri: string; title?: string }> = [];
            const candidate = response.candidates?.[0];
            if (candidate) {
                const groundingMetadata = (candidate as any).groundingMetadata;
                if (groundingMetadata?.groundingChunks) {
                    for (const chunk of groundingMetadata.groundingChunks) {
                        if (chunk.web?.uri) {
                            sources.push({
                                uri: chunk.web.uri,
                                title: chunk.web.title
                            });
                        }
                    }
                }
            }

            // Also add the analyzed URLs as sources
            urls.forEach(url => {
                if (!sources.find(s => s.uri === url)) {
                    sources.push({ uri: url });
                }
            });

            return { text, sources };
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        generateContent,
        generateWithSearch,
        generateImage,
        analyzeUrls,
        loading,
        error
    };
};
