/**
 * MicroLabs - Google GenAI Wrapper for Chrome Extensions
 *
 * This is a lightweight wrapper that makes direct API calls to Google's
 * Generative Language API, designed to work in Chrome extension environments.
 *
 * Based on the patterns from @google/genai SDK v1.34.0
 */

// API Base URL
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Modality enum
export const Modality = {
  TEXT: 'TEXT',
  AUDIO: 'AUDIO',
  IMAGE: 'IMAGE'
};

/**
 * Main GoogleGenAI client class
 */
export class GoogleGenAI {
  constructor({ apiKey }) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
    this.models = new ModelsAPI(this);
    this.live = new LiveAPI(this);
  }
}

/**
 * Models API for standard generation calls
 */
class ModelsAPI {
  constructor(client) {
    this.client = client;
  }

  /**
   * Generate content using Gemini models
   */
  async generateContent(options) {
    const { model, contents, config = {} } = options;

    const url = `${API_BASE}/models/${model}:generateContent?key=${this.client.apiKey}`;

    // Build request body
    const body = {
      contents: Array.isArray(contents) ? contents : [{ role: 'user', parts: [{ text: contents }] }]
    };

    // Add generation config
    if (config.temperature !== undefined || config.maxOutputTokens !== undefined ||
        config.topP !== undefined || config.topK !== undefined) {
      body.generationConfig = {};
      if (config.temperature !== undefined) body.generationConfig.temperature = config.temperature;
      if (config.maxOutputTokens !== undefined) body.generationConfig.maxOutputTokens = config.maxOutputTokens;
      if (config.topP !== undefined) body.generationConfig.topP = config.topP;
      if (config.topK !== undefined) body.generationConfig.topK = config.topK;
      if (config.responseMimeType) body.generationConfig.responseMimeType = config.responseMimeType;
      if (config.responseSchema) body.generationConfig.responseSchema = config.responseSchema;
    }

    // Add system instruction
    if (config.systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: config.systemInstruction }]
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();

    return {
      text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      candidates: data.candidates,
      usageMetadata: data.usageMetadata
    };
  }

  /**
   * Stream content generation
   */
  async *generateContentStream(options) {
    const { model, contents, config = {} } = options;

    const url = `${API_BASE}/models/${model}:streamGenerateContent?alt=sse&key=${this.client.apiKey}`;

    const body = {
      contents: Array.isArray(contents) ? contents : [{ role: 'user', parts: [{ text: contents }] }]
    };

    if (config.systemInstruction) {
      body.systemInstruction = { parts: [{ text: config.systemInstruction }] };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error('Stream request failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            yield {
              text: data.candidates?.[0]?.content?.parts?.[0]?.text || ''
            };
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }
}

/**
 * Live API for real-time audio/video
 * Uses WebSocket connection to Gemini Live API
 */
class LiveAPI {
  constructor(client) {
    this.client = client;
  }

  /**
   * Connect to Gemini Live API
   *
   * @param {Object} options - Connection options
   * @param {string} options.model - Model to use
   * @param {Object} options.config - Configuration options
   * @param {Object} options.callbacks - Callback handlers
   */
  async connect(options) {
    const { model, config = {}, callbacks = {} } = options;

    return new LiveSession(this.client.apiKey, model, config, callbacks);
  }
}

/**
 * Live Session for real-time bidirectional communication
 */
class LiveSession {
  constructor(apiKey, model, config, callbacks) {
    this.apiKey = apiKey;
    this.model = model;
    this.config = config;
    this.callbacks = callbacks;
    this.ws = null;
    this.isOpen = false;

    this._connect();
  }

  _connect() {
    // WebSocket URL for Gemini Live API
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isOpen = true;

      // Send initial setup message
      const setupMessage = {
        setup: {
          model: `models/${this.model}`,
          generationConfig: {
            responseModalities: this.config.responseModalities || ['AUDIO'],
          }
        }
      };

      // Add speech config if present
      if (this.config.speechConfig) {
        setupMessage.setup.generationConfig.speechConfig = this.config.speechConfig;
      }

      // Add system instruction
      if (this.config.systemInstruction) {
        setupMessage.setup.systemInstruction = {
          parts: [{ text: this.config.systemInstruction }]
        };
      }

      // Enable transcription if requested
      if (this.config.inputAudioTranscription !== undefined) {
        setupMessage.setup.inputAudioTranscription = this.config.inputAudioTranscription;
      }
      if (this.config.outputAudioTranscription !== undefined) {
        setupMessage.setup.outputAudioTranscription = this.config.outputAudioTranscription;
      }

      this.ws.send(JSON.stringify(setupMessage));

      if (this.callbacks.onopen) {
        this.callbacks.onopen();
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (this.callbacks.onmessage) {
          this.callbacks.onmessage(message);
        }
      } catch (e) {
        console.error('Failed to parse Live API message:', e);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (this.callbacks.onerror) {
        this.callbacks.onerror(error);
      }
    };

    this.ws.onclose = () => {
      this.isOpen = false;
      if (this.callbacks.onclose) {
        this.callbacks.onclose();
      }
    };
  }

  /**
   * Send real-time audio input
   *
   * @param {Object} input - Input object with media property
   * @param {Object} input.media - Media blob with data and mimeType
   */
  sendRealtimeInput(input) {
    if (!this.isOpen || !this.ws) return;

    const message = {
      realtimeInput: {
        mediaChunks: [{
          data: input.media.data,
          mimeType: input.media.mimeType
        }]
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send a text message
   *
   * @param {string} text - Text to send
   */
  sendText(text) {
    if (!this.isOpen || !this.ws) return;

    const message = {
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{ text }]
        }],
        turnComplete: true
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Close the session
   */
  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isOpen = false;
  }
}

// Export Type helper for JSON schema
export const Type = {
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  INTEGER: 'INTEGER',
  BOOLEAN: 'BOOLEAN',
  ARRAY: 'ARRAY',
  OBJECT: 'OBJECT'
};

// Default export
export default GoogleGenAI;
