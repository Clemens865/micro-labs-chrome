# Google AI (Gemini) API Documentation

> Comprehensive reference for using the Google Gemini API in MicroLabs applications.
> Last updated: January 1, 2025 (Verified via official docs)

---

## Table of Contents

### Part I: Getting Started
1. [SDK Installation](#1-sdk-installation)
2. [Authentication](#2-authentication)
3. [Models Reference](#3-models-reference)

### Part II: Core Generation
4. [Text Generation](#4-text-generation)
5. [Structured Output (JSON Mode)](#5-structured-output-json-mode)
6. [System Instructions](#6-system-instructions)
7. [Multi-Turn Conversations](#7-multi-turn-conversations)
8. [Streaming Responses](#8-streaming-responses)
9. [Long Context](#9-long-context)

### Part III: Advanced AI Features
10. [Thinking / Reasoning](#10-thinking--reasoning)
11. [Function Calling (Tools)](#11-function-calling-tools)
12. [Code Execution](#12-code-execution)
13. [Google Search Grounding](#13-google-search-grounding)
14. [Google Maps Grounding](#14-google-maps-grounding)
15. [URL Context](#15-url-context)
16. [File Search (RAG)](#16-file-search-rag)
17. [Context Caching](#17-context-caching)

### Part IV: Multimodal Capabilities
18. [Audio Processing](#18-audio-processing)
19. [Video Understanding](#19-video-understanding)
20. [Video Generation (Veo 3.1)](#20-video-generation-veo-31)
21. [Document Processing (PDF)](#21-document-processing-pdf)
22. [Image Generation (Imagen 4)](#22-image-generation-imagen-4)
23. [Gemini Native Image Generation](#23-gemini-native-image-generation)
24. [Embeddings](#24-embeddings)

### Part V: Agents & Specialized Models
25. [Deep Research Agent](#25-deep-research-agent)
26. [Computer Use Agent](#26-computer-use-agent)
27. [Live API (Real-Time)](#27-live-api-real-time)
28. [Robotics (Gemini Robotics-ER)](#28-robotics-gemini-robotics-er)
29. [Music Generation (Lyria RealTime)](#29-music-generation-lyria-realtime)

### Part VI: Production & Optimization
30. [Batch API](#30-batch-api)
31. [Token Usage & Counting](#31-token-usage--counting)
32. [Rate Limits](#32-rate-limits)
33. [Pricing Reference](#33-pricing-reference)
34. [MicroLabs Implementation Patterns](#34-microlabs-implementation-patterns)
35. [Error Handling & Retry Logic](#35-error-handling--retry-logic)
36. [Quick Reference](#36-quick-reference)

---

## 1. SDK Installation

### Official Google GenAI SDK (Recommended)

The `@google/genai` package is the official, production-ready SDK. Legacy packages like `@google/generativeai` are deprecated.

```bash
# JavaScript/TypeScript
npm install @google/genai

# Python
pip install google-genai

# Go
go get google.golang.org/genai
```

### Basic Setup

```typescript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });
```

---

## 2. Authentication

### API Key Setup

1. Get your API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Store in environment variables (never commit to code)

```bash
# .env
GOOGLE_AI_API_KEY=your-api-key-here
```

### Server-Side Only

**CRITICAL**: Never expose API keys client-side. Always call Gemini from API routes.

```typescript
// ✅ CORRECT: Server-side API route
// src/app/api/apps/my-app/route.ts
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });

// ❌ WRONG: Client-side component
// This exposes your API key!
```

---

## 3. Models Reference

### Gemini 3 (Frontier Models) - January 2025 Knowledge

| Model ID | Type | Best For | Context | Price (per 1M tokens) |
|----------|------|----------|---------|----------------------|
| `gemini-3-pro-preview` | Multimodal | World-class reasoning, agentic use cases | 1M in / 64k out | $2 / $12 |
| `gemini-3-flash-preview` | Multimodal | Speed + intelligence balance | 1M in / 64k out | $0.50 / $3 |
| `gemini-3-pro-image-preview` | Image Gen | State-of-the-art image generation | - | $2 text + $0.134/image |

### Gemini 2.5 (Performance Leaders)

| Model ID | Type | Best For | Context | Price (per 1M tokens) |
|----------|------|----------|---------|----------------------|
| `gemini-2.5-pro` | Multimodal | Complex reasoning, code, math, STEM | 1M in / 64k out | $1.25-2.50 / $10-15 |
| `gemini-2.5-flash` | Multimodal | Best price-performance, agentic tasks | 1M in / 64k out | $0.30 / $2.50 |
| `gemini-2.5-flash-lite` | Multimodal | Cost-efficiency, high throughput | 1M in / 64k out | $0.10 / $0.40 |
| `gemini-2.5-flash-image` | Image | Text-to-image, image-to-image | - | $0.039/image |
| `gemini-2.5-computer-use-preview` | Agent | Browser automation | 1M in / 64k out | Special |

### Gemini 2.0 & Legacy

| Model ID | Type | Best For | Context | Price (per 1M tokens) |
|----------|------|----------|---------|----------------------|
| `gemini-2.0-flash` | Multimodal | Stable workhorse | 1M in / 8k out | $0.10 / $0.40 |
| `gemini-2.0-flash-lite` | Multimodal | Budget option | 1M in / 8k out | $0.075 / $0.30 |
| `gemini-1.5-pro` | Multimodal | High stability fallback | 2M in / 8k out | $1.25 / $5.00 |
| `gemini-1.5-flash` | Multimodal | Budget fallback | 1M in / 8k out | $0.075 / $0.30 |

### Specialized Models

| Model ID | Type | Use Case |
|----------|------|----------|
| `gemini-embedding-001` | Embeddings | Semantic search, RAG (768-3072 dims) |
| `gemini-robotics-er-1.5-preview` | Robotics | Vision-language for robotics |
| `deep-research-pro-preview-12-2025` | Agent | Autonomous research |
| `imagen-4.0-generate-001` | Image Gen | High-quality image generation |
| `imagen-4.0-ultra-generate-001` | Image Gen | Ultra quality images |
| `imagen-4.0-fast-generate-001` | Image Gen | Fast image generation |

### Model Selection for MicroLabs

| App Type | Recommended Model | Reason |
|----------|-------------------|--------|
| App Studio (generation) | `gemini-3-pro-preview` | Complex config generation |
| User App Execution | `gemini-2.5-flash` | Best cost-performance |
| Deep Analysis | `gemini-2.5-pro` | Extended thinking |
| Image Apps | `gemini-2.5-flash-image` | Fast, high-quality |
| Research/Grounding | `gemini-2.5-flash` | Search integration |
| Autonomous Research | `deep-research-pro-preview` | Multi-step analysis |
| Embeddings/RAG | `gemini-embedding-001` | Semantic search |
| Image Generation | `imagen-4.0-generate-001` | High-quality images |

---

## 4. Text Generation

### Basic Request

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{ role: 'user', parts: [{ text: 'Your prompt here' }] }],
});

const text = response.text;
```

### With Configuration

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  config: {
    temperature: 0.7,           // 0-2, default 1.0 for Gemini 3
    maxOutputTokens: 2048,      // Limit response length
    topP: 0.95,                 // Nucleus sampling
    topK: 40,                   // Top-k sampling
    stopSequences: ['END'],     // Stop generation at these
  },
});
```

> **Note**: For Gemini 3 models, Google recommends keeping `temperature` at default 1.0.

---

## 5. Structured Output (JSON Mode)

### Enable JSON Output

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  config: {
    responseMimeType: 'application/json',
    responseJsonSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The app name' },
        description: { type: 'string' },
        inputs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['text', 'textarea', 'select'] },
              label: { type: 'string' },
            },
            required: ['id', 'type', 'label'],
          },
        },
      },
      required: ['name', 'description', 'inputs'],
    },
  },
});

const result = JSON.parse(response.text);
```

### With Zod Schema (Recommended)

```typescript
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const AppConfigSchema = z.object({
  name: z.string().describe('The app display name'),
  description: z.string().describe('Short app description'),
  inputs: z.array(z.object({
    id: z.string(),
    type: z.enum(['text', 'textarea', 'select', 'number']),
    label: z.string(),
    required: z.boolean().optional(),
  })),
  prompt: z.object({
    template: z.string().describe('Prompt with {{variable}} placeholders'),
    model: z.enum(['gemini-2.5-flash', 'gemini-2.5-pro']),
  }),
});

const response = await ai.models.generateContent({
  model: 'gemini-3-pro-preview',
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  config: {
    responseMimeType: 'application/json',
    responseJsonSchema: zodToJsonSchema(AppConfigSchema),
  },
});
```

### Best Practices

- Use `description` fields to guide the model
- Keep schemas simple (avoid deep nesting)
- Always validate parsed JSON before using
- Structured output guarantees syntax, not semantic correctness

---

## 6. System Instructions

System instructions guide model behavior without modifying prompts.

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
  config: {
    systemInstruction: `You are MicroLabs App Studio AI.
Your job is to generate app configurations based on user descriptions.
Always include input validation and helpful placeholder text.
Output valid JSON matching the provided schema.`,
  },
});
```

---

## 7. Multi-Turn Conversations

### Using Chat Sessions

```typescript
const chat = ai.chats.create({
  model: 'gemini-2.5-flash',
  config: {
    systemInstruction: 'You are a helpful assistant.',
  },
});

// First message
const response1 = await chat.sendMessage('What is machine learning?');
console.log(response1.text);

// Follow-up (history is managed automatically)
const response2 = await chat.sendMessage('Give me an example.');
console.log(response2.text);
```

### Manual History Management

```typescript
const history = [
  { role: 'user', parts: [{ text: 'Hello' }] },
  { role: 'model', parts: [{ text: 'Hi! How can I help?' }] },
];

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [
    ...history,
    { role: 'user', parts: [{ text: 'Tell me a joke' }] },
  ],
});
```

---

## 8. Streaming Responses

For real-time output in chat interfaces:

```typescript
const stream = await ai.models.generateContentStream({
  model: 'gemini-2.5-flash',
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text);
}
```

### In Next.js API Routes

```typescript
export async function POST(request: NextRequest) {
  const { prompt } = await request.json();

  const stream = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        controller.enqueue(encoder.encode(chunk.text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

---

## 9. Long Context

Gemini models support up to **1 million tokens** (or 2M for 1.5-pro), enabling:
- 50,000 lines of code
- 8 average-length novels
- 200+ podcast episode transcripts
- 5 years of text messages

### Best Practices

```typescript
// Put query at END for best performance on long contexts
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{
    role: 'user',
    parts: [
      { text: veryLongDocument },  // Large context first
      { text: 'What is the main conclusion?' }  // Query at end
    ],
  }],
});
```

### Long Context Optimization

- **Query placement**: Always put questions at the END of long contexts
- **Context caching**: Use caching for repeated queries on same documents (4x cost reduction)
- **Many-shot learning**: Hundreds of examples in context can match fine-tuned performance
- **Multimodal**: Combine text, video, audio, and images in single requests

### Token Efficiency

| Content Type | Tokens |
|-------------|--------|
| 1 second video | ~263 tokens |
| 1 second audio | ~32 tokens |
| Image (≤384px) | 258 tokens |
| Image (large) | 258 per 768x768 tile |
| PDF page | ~258 tokens |

---

## 10. Thinking / Reasoning

Gemini 2.5+ models have an internal reasoning process for complex tasks.

### Enable Thinking

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-pro',
  contents: [{ role: 'user', parts: [{ text: complexPrompt }] }],
  config: {
    thinkingConfig: {
      includeThoughts: true,  // Get thought summaries
      thinkingBudget: 8192,   // Tokens for reasoning (128-32768)
    },
  },
});

// Access thoughts
for (const part of response.candidates[0].content.parts) {
  if (part.thought) {
    console.log('Thinking:', part.text);
  } else {
    console.log('Answer:', part.text);
  }
}
```

### Thinking Levels (Gemini 3)

| Level | Use Case | Available On |
|-------|----------|--------------|
| `minimal` | Ultra-fast responses | Flash only |
| `low` | Minimize latency | All |
| `medium` | Balanced | Flash only |
| `high` (default) | Maximum reasoning | All |

### When to Use Thinking

| Complexity | Examples | Thinking |
|------------|----------|----------|
| Simple | Fact lookup, classification | Disable |
| Medium | Comparisons, summaries | Default |
| Complex | Math, code, multi-step planning | Maximize |

### Thought Signatures (Gemini 3)

Preserve reasoning context across API calls for function calling and multi-step workflows:

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-3-pro-preview',
  config: {
    thinkingConfig: {
      includeThoughts: true,
      includeThoughtSignatures: true, // Preserve reasoning across calls
    },
  },
});
```

### Cost Implications

- Thinking tokens are billed (check `usageMetadata.thoughtsTokenCount`)
- For long outputs, limit thinking budget to preserve output tokens

---

## 11. Function Calling (Tools)

Function calling enables models to invoke external functions and APIs.

### Define Function Declarations

```typescript
import { types } from '@google/genai';

const weatherFunction = {
  name: 'get_weather',
  description: 'Get current weather for a location',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'City name, e.g., "San Francisco, CA"'
      },
      unit: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        description: 'Temperature unit'
      },
    },
    required: ['location'],
  },
};

const tools = types.Tool({ functionDeclarations: [weatherFunction] });

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{ role: 'user', parts: [{ text: 'What is the weather in Tokyo?' }] }],
  config: { tools: [tools] },
});
```

### Handle Function Calls

```typescript
// Check if model wants to call a function
const functionCall = response.candidates[0]?.content?.parts?.find(
  p => p.functionCall
)?.functionCall;

if (functionCall) {
  // Execute the function
  const result = await executeFunction(functionCall.name, functionCall.args);

  // Send result back to model
  const finalResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: 'What is the weather in Tokyo?' }] },
      { role: 'model', parts: [{ functionCall }] },
      { role: 'user', parts: [{ functionResponse: { name: functionCall.name, response: result } }] },
    ],
  });
}
```

### Function Calling Modes

| Mode | Behavior |
|------|----------|
| `AUTO` (default) | Model decides when to call functions |
| `ANY` | Model must call a function |
| `NONE` | Disable function calling |
| `VALIDATED` | Schema adherence with natural responses |

### Parallel & Compositional Calling

```typescript
// Parallel: Multiple independent functions at once
// Model returns: [{ functionCall: 'get_weather', args: {...} }, { functionCall: 'get_news', args: {...} }]

// Compositional: Chained functions where output feeds next
// Step 1: get_location() -> "Tokyo"
// Step 2: get_weather("Tokyo") -> weather data
```

### Best Practices

- Use clear, specific descriptions for functions and parameters
- Use strong typing with enums for limited value sets
- Maintain 10-20 active tools maximum
- Set temperature=0 for deterministic function calls
- Validate consequential function calls before execution

---

## 12. Code Execution

Enable models to generate and run Python code to solve problems.

### Enable Code Execution

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{ role: 'user', parts: [{ text: 'What is the sum of the first 50 prime numbers?' }] }],
  config: {
    tools: [{ codeExecution: {} }],
  },
});

// Response includes generated code and execution result
```

### Supported Features

- **Language**: Python only
- **Runtime**: 30 seconds max execution
- **Retries**: Up to 5 automatic regeneration attempts on errors
- **Libraries**: 60+ pre-installed (numpy, pandas, matplotlib, scikit-learn, TensorFlow, etc.)
- **File I/O**: CSV, TXT, PNG, JPEG only

### Limitations

- No real-time I/O or network access
- No custom library installation
- Only Matplotlib supports graph rendering
- May affect performance on non-code tasks

---

## 13. Google Search Grounding

Ground responses in real-time web data.

### Enable Grounding

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{ role: 'user', parts: [{ text: 'What are the latest AI news?' }] }],
  config: {
    tools: [{ googleSearch: {} }],
  },
});
```

### Access Citations

```typescript
const metadata = response.candidates[0]?.groundingMetadata;

if (metadata) {
  console.log('Search queries:', metadata.webSearchQueries);

  // Sources with URLs
  for (const chunk of metadata.groundingChunks || []) {
    console.log('Source:', chunk.web?.title, chunk.web?.uri);
  }

  // Which parts of response are grounded
  for (const support of metadata.groundingSupports || []) {
    console.log('Grounded text:', support.segment?.text);
    console.log('Sources:', support.groundingChunkIndices);
  }
}
```

### Best Use Cases

- Current events, news, prices
- Factual verification
- Research with citations
- Real-time data (weather, stocks, sports)

### Pricing

| Tier | Cost |
|------|------|
| Free Tier | 1,500 requests per day |
| Paid Tier | $35 per 1,000 queries |

---

## 14. Google Maps Grounding

Ground responses in location data from 250M+ places.

### Enable Maps Grounding

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{ role: 'user', parts: [{ text: 'Best Italian restaurants nearby?' }] }],
  config: {
    tools: [{ googleMaps: {} }],
    toolConfig: {
      retrievalConfig: {
        latLng: { latitude: 34.050481, longitude: -118.248526 },
      },
    },
  },
});
```

### Access Location Data

```typescript
const metadata = response.candidates[0]?.groundingMetadata;

// Place information with IDs
for (const chunk of metadata.groundingChunks || []) {
  console.log('Place:', chunk.web?.title);
  console.log('Place ID:', chunk.web?.placeId);
  console.log('URI:', chunk.web?.uri);
}

// Token for rendering map widgets
const mapToken = metadata.googleMapsWidgetContextToken;
```

### Supported Models

- Gemini 2.5 Pro, Flash, Flash-Lite
- Gemini 2.0 Flash
- **NOT supported**: Gemini 3 models

### Pricing

| Tier | Cost |
|------|------|
| Free Tier | 500 requests per day |
| Paid Tier | $25 per 1,000 prompts |

---

## 15. URL Context

Access and analyze content from URLs you provide.

### Enable URL Context

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{
    role: 'user',
    parts: [{ text: 'Summarize this article: https://example.com/article' }],
  }],
  config: {
    tools: [{ urlContext: {} }],
  },
});
```

### Supported Content

| Supported | Not Supported |
|-----------|---------------|
| HTML, JSON, plain text | Paywalled content |
| XML, CSS, JavaScript | YouTube videos |
| Images (PNG, JPEG, WebP) | Google Workspace files |
| PDF documents | Video/audio files |

### Limitations

- Maximum **20 URLs** per request
- **34MB** content size limit per URL
- Retrieved content counts toward input tokens

---

## 16. File Search (RAG)

Built-in Retrieval Augmented Generation with automatic chunking and indexing.

### Create File Search Store

```typescript
// Create store
const store = await ai.fileSearchStores.create({
  config: { displayName: 'my-documents' },
});

// Upload and index file
const operation = await ai.fileSearchStores.uploadToFileSearchStore({
  file: 'document.pdf',
  fileSearchStoreName: store.name,
});

// Wait for indexing
await operation.wait();
```

### Use in Generation

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{ role: 'user', parts: [{ text: 'What does the document say about X?' }] }],
  config: {
    tools: [{ fileSearch: { fileSearchStoreNames: [store.name] } }],
  },
});
```

### Supported Formats

100+ formats including: PDF, Word, Excel, PowerPoint, JSON, SQL, Jupyter notebooks, Markdown, HTML, Python, Java, JavaScript, and more.

### Limits by Tier

| Tier | Storage Limit |
|------|---------------|
| Free | 1 GB |
| Tier 1 | 10 GB |
| Tier 2 | 100 GB |
| Tier 3 | 1 TB |

Keep individual stores under 20 GB for optimal retrieval speed.

### Pricing

- Embeddings: $0.15 per 1M tokens at indexing
- Storage: Free
- Query embeddings: Free
- Retrieved tokens: Standard context rates

---

## 17. Context Caching

Cache large contexts for cost reduction on repeated use.

### Types of Caching

1. **Implicit Caching**: Automatic (May 8, 2025+), no setup required
2. **Explicit Caching**: Manual setup for guaranteed savings

### Minimum Token Requirements

| Model | Minimum Tokens |
|-------|---------------|
| `gemini-3-flash-preview` | 1,024 |
| `gemini-2.5-flash` | 1,024 |
| `gemini-3-pro-preview` | 4,096 |
| `gemini-2.5-pro` | 4,096 |

### Create Explicit Cache

```typescript
// Create cache
const cache = await ai.caches.create({
  model: 'gemini-2.5-flash',
  config: {
    contents: [{ role: 'user', parts: [{ text: largeSystemContext }] }],
    ttl: '3600s', // 1 hour
  },
});

// Use cache in requests
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  cachedContent: cache.name,
  contents: [{ role: 'user', parts: [{ text: 'Question about the context' }] }],
});
```

### Cost Benefits

- Cached tokens billed at **~4x reduced rates**
- Storage charged based on TTL duration ($1/hour)
- Ideal for: chatbots with extensive system instructions, repeated document analysis

---

## 18. Audio Processing

### Supported Formats

WAV, MP3, AIFF, AAC, OGG Vorbis, FLAC

### Upload and Process Audio

```typescript
// Upload audio file
const audioFile = await ai.files.upload({
  file: audioBuffer,
  config: { mimeType: 'audio/mp3' },
});

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [
    { role: 'user', parts: [
      { fileData: { fileUri: audioFile.uri, mimeType: 'audio/mp3' } },
      { text: 'Transcribe this audio and identify speakers' },
    ]},
  ],
});
```

### Capabilities

- Transcription and translation
- Speaker identification and labeling
- Emotion detection in speech and music
- Timestamp analysis for specific segments

### Technical Details

| Property | Value |
|----------|-------|
| Token Rate | 32 tokens per second |
| Max Length | 9.5 hours per prompt |
| Sample Rate | Downsampled to 16 Kbps |
| Channels | Multi-channel combined to mono |

### Limitations

- No real-time transcription (use Live API for that)
- File size limit: 20MB inline, larger via Files API

---

## 19. Video Understanding

Analyze and understand video content with timestamps.

### Upload and Analyze Video

```typescript
// Upload video
const videoFile = await ai.files.upload({
  file: videoBuffer,
  config: { mimeType: 'video/mp4' },
});

// Wait for processing
await videoFile.waitForProcessing();

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{
    role: 'user',
    parts: [
      { fileData: { fileUri: videoFile.uri, mimeType: 'video/mp4' } },
      { text: 'Describe what happens at 00:30' },
    ],
  }],
});
```

### YouTube Videos (Preview)

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{
    role: 'user',
    parts: [
      { text: 'https://www.youtube.com/watch?v=VIDEO_ID' },
      { text: 'Summarize this video' },
    ],
  }],
});
```

### Supported Formats

MP4, MPEG, MOV, AVI, FLV, MPG, WebM, WMV, 3GPP

### Technical Details

| Property | Value |
|----------|-------|
| Token Rate (default) | ~300 tokens/second |
| Token Rate (low res) | ~100 tokens/second |
| Frame Rate | 1 FPS default sampling |
| Max Duration (1M context) | 1 hour (default) / 3 hours (low res) |

### Video Clipping

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{
    role: 'user',
    parts: [{
      fileData: { fileUri: videoFile.uri, mimeType: 'video/mp4' },
      videoMetadata: {
        startOffset: '10s',
        endOffset: '60s',
      },
    }],
  }],
});
```

---

## 20. Video Generation (Veo 3.1)

### Capabilities

- **Text-to-Video**: Generate from descriptive prompts
- **Image-to-Video**: Use existing images as starting frames
- **Video Extension**: Extend videos by up to 7 seconds
- **Frame Interpolation**: Specify first and last frames
- **Reference Images**: Up to 3 images to guide content

### Generate Video

```typescript
const response = await ai.models.generateContent({
  model: 'veo-3.1',
  contents: [{ role: 'user', parts: [{ text: 'A serene sunset over the ocean with gentle waves' }] }],
  config: {
    video: {
      duration: 8,        // 4, 6, or 8 seconds
      resolution: '1080p', // 720p or 1080p
      aspectRatio: '16:9', // 16:9 or 9:16
    },
  },
});
```

### Audio in Video

Veo 3.1 natively generates synchronized audio:
- **Dialogue**: Use quotation marks in prompts
- **Sound Effects**: Describe explicitly
- **Ambient Noise**: Describe environmental sounds

### Technical Specs

| Property | Value |
|----------|-------|
| Resolution | 720p (default), 1080p |
| Frame Rate | 24fps |
| Duration | 4, 6, or 8 seconds |
| Latency | 11 seconds to 6 minutes |
| Retention | 2 days on server |

### Pricing

| Duration | Cost |
|----------|------|
| 4 seconds | $0.60 |
| 6 seconds | $0.90 |
| 8 seconds | $1.20 - $3.20 |

---

## 21. Document Processing (PDF)

Native document understanding with visual interpretation.

### Process PDF

```typescript
// Upload PDF
const pdfFile = await ai.files.upload({
  file: pdfBuffer,
  config: { mimeType: 'application/pdf' },
});

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{
    role: 'user',
    parts: [
      { fileData: { fileUri: pdfFile.uri, mimeType: 'application/pdf' } },
      { text: 'Extract all tables from this document as JSON' },
    ],
  }],
});
```

### Capabilities

- Analyze text, images, diagrams, charts, and tables
- Extract information into structured output
- Summarize content and answer questions
- Transcribe and preserve layout (e.g., to HTML)
- Process multiple PDFs (up to 1000 pages combined)

### Technical Limits

| Property | Limit |
|----------|-------|
| File size | 50 MB |
| Max pages | 1,000 |
| Tokens per page | ~258 tokens |
| Image resolution | Max 3072×3072px |

### Important Note

Document vision **only meaningfully understands PDFs**. Other formats (TXT, Markdown, HTML) are extracted as pure text without visual interpretation.

---

## 22. Image Generation (Imagen 4)

### Models

| Model ID | Quality | Speed |
|----------|---------|-------|
| `imagen-4.0-generate-001` | Standard | Balanced |
| `imagen-4.0-ultra-generate-001` | Ultra | Slower |
| `imagen-4.0-fast-generate-001` | Good | Fastest |

### Generate Images

```typescript
const response = await ai.models.generateImages({
  model: 'imagen-4.0-generate-001',
  prompt: 'A professional photo of a modern laptop on a minimalist desk',
  config: {
    numberOfImages: 4,      // 1-4 images
    aspectRatio: '16:9',    // 1:1, 3:4, 4:3, 9:16, 16:9
    imageSize: '2K',        // 1K or 2K (Standard/Ultra only)
    personGeneration: 'dont_allow', // dont_allow, allow_adult, allow_all
  },
});

// Access generated images
for (const image of response.generatedImages) {
  const base64Data = image.image.imageBytes;
  // Save or display image
}
```

### Limitations

- Max prompt length: 480 tokens
- English prompts only
- Text in images: Best under 25 characters
- All images include SynthID watermark

### Pricing

| Model | Cost per Image |
|-------|---------------|
| Imagen 4 Standard | $0.02 - $0.04 |
| Imagen 4 Ultra | $0.04 - $0.06 |
| Imagen 4 Fast | $0.02 |

---

## 23. Gemini Native Image Generation

Gemini models can also generate images natively.

### Using Gemini 3 for Images

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-3-pro-image-preview',
  contents: [{ role: 'user', parts: [{ text: 'Create a logo for a tech startup' }] }],
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
  },
});

// Access image from response
const imagePart = response.candidates[0].content.parts.find(p => p.inlineData);
if (imagePart) {
  const base64Image = imagePart.inlineData.data;
  const mimeType = imagePart.inlineData.mimeType;
}
```

### Using Gemini 2.5 Flash Image

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash-image',
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
    imageConfig: {
      aspectRatio: '16:9',  // 1:1, 4:3, 16:9, 9:16
      imageSize: '2K',      // 1K, 2K
    },
  },
});
```

### Gemini 3 Image Features

- 4K text rendering in images
- Grounded generation via search integration
- Multi-turn conversational image editing
- Preserves visual context across edits

---

## 24. Embeddings

Generate vector embeddings for semantic search and RAG.

### Model

| Model | Dimensions | Description |
|-------|------------|-------------|
| `gemini-embedding-001` | 128-3072 | Recommended: 768, 1536, or 3072 |

### Generate Embeddings

```typescript
const result = await ai.models.embedContent({
  model: 'gemini-embedding-001',
  contents: [{ role: 'user', parts: [{ text: 'What is the meaning of life?' }] }],
  config: {
    taskType: 'RETRIEVAL_DOCUMENT', // Optimize for use case
    outputDimensionality: 768,      // 128-3072
  },
});

const embedding = result.embedding.values; // Float array
```

### Task Types

| Task Type | Use Case |
|-----------|----------|
| `SEMANTIC_SIMILARITY` | Text similarity assessment |
| `CLASSIFICATION` | Content categorization |
| `CLUSTERING` | Similarity-based grouping |
| `RETRIEVAL_DOCUMENT` | Document indexing for search |
| `RETRIEVAL_QUERY` | Query embedding for search |
| `CODE_RETRIEVAL_QUERY` | Code block retrieval |
| `QUESTION_ANSWERING` | Question-document matching |
| `FACT_VERIFICATION` | Evidence retrieval |

### Batch Embeddings

```typescript
const results = await ai.models.batchEmbedContents({
  model: 'gemini-embedding-001',
  requests: [
    { contents: [{ role: 'user', parts: [{ text: 'Document 1' }] }] },
    { contents: [{ role: 'user', parts: [{ text: 'Document 2' }] }] },
  ],
});
```

### Use Cases

- **RAG Systems**: Retrieve relevant context for generation
- **Semantic Search**: Find similar documents
- **Clustering**: Group related content
- **Anomaly Detection**: Identify outliers

### Recommended Vector Databases

- BigQuery, AlloyDB (Google)
- ChromaDB, Pinecone, Weaviate, Qdrant (Third-party)

---

## 25. Deep Research Agent

Autonomous multi-step research agent powered by Gemini 3 Pro.

### Overview

Deep Research autonomously plans, executes, and synthesizes research by navigating complex information using web search and your own data to produce detailed, cited reports.

### Basic Usage

```python
# Must run asynchronously
interaction = client.interactions.create(
    input="Research the history of Google TPUs and their impact on AI development.",
    agent='deep-research-pro-preview-12-2025',
    background=True,
    store=True,  # Required when using background=True
)

# Poll for results
while True:
    status = client.interactions.get(interaction.id)
    if status.status == 'completed':
        print(status.output)
        break
    elif status.status == 'failed':
        print('Research failed:', status.error)
        break
    await asyncio.sleep(30)
```

### Configuration Options

- **File Search Integration**: Add proprietary data via `file_search_store_names`
- **Streaming**: Enable real-time progress with `stream=True`
- **Follow-ups**: Use `previous_interaction_id` for clarifying questions

### Limitations

- Maximum **60-minute** research window (most finish within 20 minutes)
- No custom Function Calling or MCP servers
- Audio inputs unsupported
- Beta status—schemas may change

### Best Use Cases

Analyst-level work:
- Market analysis and competitive landscaping
- Due diligence research
- Technical deep dives
- Literature reviews

---

## 26. Computer Use Agent

Browser automation agent for web interactions.

### Overview

Computer Use enables building browser control agents that analyze screenshots and generate UI actions like clicks, typing, and navigation.

### Model

`gemini-2.5-computer-use-preview-10-2025`

### Supported Actions

| Category | Actions |
|----------|---------|
| Navigation | `open_web_browser`, `navigate`, `go_back`, `go_forward`, `search` |
| Interaction | `click_at`, `hover_at`, `type_text_at`, `drag_and_drop` |
| Input | `key_combination`, `scroll_document`, `scroll_at` |
| Timing | `wait_5_seconds` |

### Agent Loop

```python
from playwright.async_api import async_playwright

async def computer_use_loop(goal: str):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        contents = [{'role': 'user', 'parts': [{'text': goal}]}]

        while True:
            # Capture screenshot
            screenshot = await page.screenshot()
            contents.append({
                'role': 'user',
                'parts': [{'inlineData': {'mimeType': 'image/png', 'data': base64.b64encode(screenshot).decode()}}]
            })

            # Get next action
            response = await client.models.generate_content(
                model='gemini-2.5-computer-use-preview-10-2025',
                contents=contents,
                config=config,
            )

            # Execute action or finish
            action = parse_function_call(response)
            if not action:
                break
            await execute_action(page, action)
```

### Coordinates

Uses normalized 0-999 grid, scaled to actual screen dimensions.

### Safety Features

- Built-in safety system for sensitive actions (purchases, terms acceptance)
- Implement human-in-the-loop confirmation
- Use allowlists/blocklists for websites
- Run in sandboxed environments

### Limitations

- Preview model prone to errors
- Should not handle critical decisions without supervision
- May misinterpret goals or webpage content
- Requires secure execution environment

---

## 27. Live API (Real-Time)

Low-latency, real-time voice and video interactions.

### Overview

The Live API enables continuous streaming of audio, video, or text for immediate, human-like spoken responses via WebSocket connections.

### Key Features

- Voice Activity Detection for natural interruptions
- Tool use and function calling integration
- Session management for extended conversations
- Ephemeral tokens for secure client-side auth

### Audio Specifications

| Direction | Format |
|-----------|--------|
| Input | 16-bit PCM, 16kHz, mono |
| Output | 24kHz |

### Basic Usage (Python)

```python
import asyncio
from google import genai

async def live_session():
    client = genai.Client()

    async with client.aio.live.connect(model='gemini-2.5-flash') as session:
        # Send audio
        await session.send(audio_chunk)

        # Receive responses
        async for response in session.receive():
            if response.data:
                # Audio response
                play_audio(response.data)
            if response.text:
                # Text response
                print(response.text)
```

### Partner Integrations

- **Pipecat**: Build conversational AI chatbots
- **LiveKit**: Real-time audio/video applications
- **Fishjam**: Live streaming solutions

### Supported Models

- `gemini-2.5-flash` (with Live API variants)
- `gemini-2.0-flash`

---

## 28. Robotics (Gemini Robotics-ER)

### Model

`gemini-robotics-er-1.5-preview` - Vision-language model for robotic applications.

### Capabilities

- **Object Detection**: Returns normalized 2D coordinates [y, x] (0-1000 scale)
- **Bounding Boxes**: [ymin, xmin, ymax, xmax] format
- **Trajectory Generation**: Waypoint sequences for movement
- **Task Orchestration**: JSON function call sequences
- **Scene Analysis**: Multi-frame video tracking

### Basic Usage

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-robotics-er-1.5-preview',
  contents: [
    { role: 'user', parts: [
      { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
      { text: 'Point to the red object on the table' },
    ]},
  ],
  config: { temperature: 0.5 },
});

// Response includes coordinates: [y, x] normalized to 0-1000
```

### Function Call Output

```json
[
  {"function": "move", "args": [163, 427, true]},
  {"function": "setGripperState", "args": [true]}
]
```

### Use Cases

- Pick-and-place operations
- Scene analysis and item identification
- Video object tracking
- Complex task planning (e.g., packing instructions)

### Limitations

- Preview status: Not production-ready
- May hallucinate on ambiguous inputs
- High thinking budgets increase latency
- Requires consent for personal data collection

---

## 29. Music Generation (Lyria RealTime)

### Overview

Generate interactive music via WebSocket streaming.

### Audio Specifications

| Property | Value |
|----------|-------|
| Format | Raw 16-bit PCM |
| Sample Rate | 48kHz |
| Channels | Stereo |

### Basic Usage (Python)

```python
async with client.aio.live.music.connect() as session:
    await session.set_weighted_prompts([
        types.WeightedPrompt(text="upbeat electronic dance music", weight=1.0)
    ])

    config = types.MusicGenerationConfig(
        bpm=120,
        guidance=4.0,
        density=0.5,
        brightness=0.7,
    )
    await session.set_music_generation_config(config)

    await session.play()

    async for message in session.receive():
        audio_data = message.data  # PCM audio bytes
```

### Configuration Options

| Parameter | Range | Description |
|-----------|-------|-------------|
| `guidance` | 0.0-6.0 | Prompt adherence (default 4.0) |
| `bpm` | 60-200 | Tempo |
| `density` | 0.0-1.0 | Musical note density |
| `brightness` | 0.0-1.0 | Tonal quality |
| `scale` | Various | Musical key and mode |
| `muteBass` | boolean | Mute bass track |
| `muteDrums` | boolean | Mute drum track |

### Limitations

- Instrumental only (no vocals)
- All output watermarked
- Safety filters may modify output

---

## 30. Batch API

Process large volumes at 50% reduced cost.

### How It Works

Submit multiple requests as a batch job and retrieve results within 24 hours.

### Submit Batch Job

```typescript
// Using inline requests (< 20MB)
const batch = await ai.batches.create({
  model: 'gemini-2.5-flash',
  requests: [
    { contents: [{ role: 'user', parts: [{ text: 'Prompt 1' }] }] },
    { contents: [{ role: 'user', parts: [{ text: 'Prompt 2' }] }] },
    // ... up to thousands of requests
  ],
});

// Using JSONL file (up to 2GB)
const file = await ai.files.upload({
  file: 'requests.jsonl',
  config: { mimeType: 'application/jsonl' },
});

const batch = await ai.batches.create({
  model: 'gemini-2.5-flash',
  inputFile: file.name,
});
```

### Check Status

```typescript
const status = await ai.batches.get(batch.name);

if (status.state === 'SUCCEEDED') {
  const results = await ai.batches.getResults(batch.name);
  for (const result of results) {
    console.log(result.response?.text);
  }
}
```

### Pricing Benefits

**50% off standard pricing** for all models.

### Limits

| Property | Limit |
|----------|-------|
| Input file size | 2 GB |
| Inline requests | 20 MB total |
| Turnaround time | 24 hours (usually faster) |
| Expiration | 48 hours max |
| Concurrent jobs | 100 |

### Supported Capabilities

All modalities: text, images, video, audio, embeddings, structured output.

---

## 31. Token Usage & Counting

### Token Basics

- ~4 characters per token
- ~100 tokens = 60-80 English words

### Count Tokens Before Request

```typescript
const count = await ai.models.countTokens({
  model: 'gemini-2.5-flash',
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
});

console.log('Token count:', count.totalTokens);
```

### Get Usage After Request

```typescript
const response = await ai.models.generateContent({...});

const usage = response.usageMetadata;
console.log('Input tokens:', usage.promptTokenCount);
console.log('Output tokens:', usage.candidatesTokenCount);
console.log('Thinking tokens:', usage.thoughtsTokenCount || 0);
console.log('Total tokens:', usage.totalTokenCount);
```

### Token Costs by Content Type

| Content Type | Tokens |
|-------------|--------|
| Text (100 tokens) | ~60-80 words |
| Image (≤384px both dims) | 258 tokens |
| Image (large) | 258 per 768x768 tile |
| Video | 263 tokens/second |
| Audio | 32 tokens/second |
| PDF page | ~258 tokens |

### Context Windows

| Model | Input | Output |
|-------|-------|--------|
| Gemini 3 Pro/Flash | 1,000,000 | 65,536 |
| Gemini 2.5 Pro/Flash | 1,000,000 | 65,536 |
| Gemini 2.0 Flash | 1,000,000 | 8,192 |
| Gemini 1.5 Pro | 2,000,000 | 8,192 |

---

## 32. Rate Limits

### Rate Limit Dimensions

- **RPM**: Requests per Minute
- **TPM**: Tokens per Minute
- **RPD**: Requests per Day

Limits apply per project (not per API key). RPD resets at midnight Pacific.

### Usage Tiers

| Tier | Qualification |
|------|---------------|
| Free | Eligible countries only |
| Tier 1 | Active paid billing account |
| Tier 2 | >$250 cumulative spend + 30 days |
| Tier 3 | >$1,000 cumulative spend + 30 days |

### Batch API Limits

- 100 concurrent batch requests maximum
- 2 GB input file size limit
- 20 GB storage limit
- Model-specific token queue limits (5M to 5B tokens)

### Handling Rate Limits

```typescript
async function withRateLimitRetry<T>(fn: () => Promise<T>): Promise<T> {
  const maxRetries = 5;
  let delay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.status === 429 && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Monitor Usage

Check your limits at [AI Studio Rate Limit Dashboard](https://aistudio.google.com/usage).

---

## 33. Pricing Reference

### Complete Pricing Table (per 1M tokens)

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| `gemini-3-pro-preview` | $2.00 | $12.00 | $4/$18 for >200k tokens |
| `gemini-3-flash-preview` | $0.50 | $3.00 | Audio: $1.00/$3.00 |
| `gemini-2.5-pro` | $1.25-2.50 | $10.00-15.00 | Price varies by context |
| `gemini-2.5-flash` | $0.30 | $2.50 | Free tier available |
| `gemini-2.5-flash-lite` | $0.10 | $0.40 | Most economical |
| `gemini-2.0-flash` | $0.10 | $0.40 | Free tier available |
| `gemini-2.0-flash-lite` | $0.075 | $0.30 | Budget option |
| `gemini-embedding-001` | $0.15 | - | Embeddings only |

### Special Feature Pricing

| Feature | Cost |
|---------|------|
| Context Caching | $0.01-0.40/1M tokens + $1/hour storage |
| Google Search | 1,500 free/day, then $35/1,000 queries |
| Google Maps | 500 free/day, then $25/1,000 prompts |
| File Search (indexing) | $0.15/1M tokens |
| Imagen 4 Images | $0.02-0.06/image |
| Veo 3.1 Video | $0.15-0.40/second |
| Batch API | 50% discount on all models |

### Cost Calculation

```typescript
function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gemini-3-pro-preview': { input: 2.00, output: 12.00 },
    'gemini-3-flash-preview': { input: 0.50, output: 3.00 },
    'gemini-2.5-pro': { input: 1.25, output: 10.00 },
    'gemini-2.5-flash': { input: 0.30, output: 2.50 },
    'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
    'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  };

  const price = pricing[model] || pricing['gemini-2.5-flash'];
  const inputCost = (inputTokens / 1_000_000) * price.input;
  const outputCost = (outputTokens / 1_000_000) * price.output;

  return inputCost + outputCost;
}
```

---

## 34. MicroLabs Implementation Patterns

### Pattern 1: App Studio Generation

```typescript
// Generate app config from description
const SYSTEM_INSTRUCTION = `You are MicroLabs App Studio AI.
Generate complete UserAppConfig JSON for the described app.
Include appropriate inputs, a well-crafted prompt template with {{variable}} syntax,
and suitable output format.`;

const response = await ai.models.generateContent({
  model: 'gemini-3-pro-preview',
  contents: [{ role: 'user', parts: [{ text: `Create an app that: ${description}` }] }],
  config: {
    systemInstruction: SYSTEM_INSTRUCTION,
    responseMimeType: 'application/json',
    responseJsonSchema: UserAppConfigSchema,
    thinkingConfig: { thinkingBudget: 4096 },
  },
});
```

### Pattern 2: User App Execution

```typescript
// Execute user-created app
export async function executeUserApp(config: UserAppConfig, inputs: Record<string, unknown>) {
  const interpolatedPrompt = interpolateTemplate(config.prompt.template, inputs);

  const response = await ai.models.generateContent({
    model: config.prompt.model || 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: interpolatedPrompt }] }],
    config: {
      systemInstruction: config.prompt.systemInstruction,
      temperature: config.prompt.temperature || 0.7,
      maxOutputTokens: config.prompt.maxTokens || 2048,
      ...(config.prompt.outputFormat === 'json' && {
        responseMimeType: 'application/json',
        responseJsonSchema: config.prompt.jsonSchema,
      }),
    },
  });

  return {
    result: config.prompt.outputFormat === 'json'
      ? JSON.parse(response.text)
      : response.text,
    tokensUsed: response.usageMetadata?.totalTokenCount || 0,
  };
}
```

### Pattern 3: Research with Grounding

```typescript
// Research app with verified sources
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{ role: 'user', parts: [{ text: researchQuery }] }],
  config: {
    tools: [{ googleSearch: {} }],
    systemInstruction: 'Provide comprehensive research with citations.',
  },
});

const result = {
  content: response.text,
  sources: response.candidates[0]?.groundingMetadata?.groundingChunks?.map(c => ({
    title: c.web?.title,
    url: c.web?.uri,
  })) || [],
};
```

### Pattern 4: Image Generation App

```typescript
// Generate images with Imagen 4
export async function generateImage(prompt: string, options: ImageOptions) {
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt,
    config: {
      numberOfImages: options.count || 1,
      aspectRatio: options.aspectRatio || '1:1',
      personGeneration: 'dont_allow',
    },
  });

  return response.generatedImages.map(img => ({
    base64: img.image.imageBytes,
    mimeType: 'image/png',
  }));
}
```

### Pattern 5: RAG with Embeddings

```typescript
// Semantic search for relevant context
export async function findRelevantContext(query: string, documents: Document[]) {
  // Embed query
  const queryEmbedding = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: [{ role: 'user', parts: [{ text: query }] }],
    config: { taskType: 'RETRIEVAL_QUERY', outputDimensionality: 768 },
  });

  // Find similar documents (using vector similarity)
  const similarities = documents.map(doc => ({
    doc,
    score: cosineSimilarity(queryEmbedding.embedding.values, doc.embedding),
  }));

  return similarities
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.doc);
}
```

### Pattern 6: Document Analysis App

```typescript
// Process PDF and extract structured data
export async function analyzeDocument(pdfBuffer: Buffer) {
  const pdfFile = await ai.files.upload({
    file: pdfBuffer,
    config: { mimeType: 'application/pdf' },
  });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{
      role: 'user',
      parts: [
        { fileData: { fileUri: pdfFile.uri, mimeType: 'application/pdf' } },
        { text: 'Extract all key information as structured JSON.' },
      ],
    }],
    config: {
      responseMimeType: 'application/json',
    },
  });

  return JSON.parse(response.text);
}
```

---

## 35. Error Handling & Retry Logic

### Common Errors

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Invalid request | Check prompt/config |
| 401 | Invalid API key | Verify credentials |
| 429 | Rate limited | Retry with backoff |
| 500 | Server error | Retry with backoff |
| 503 | Service unavailable | Retry with backoff |

### Retry with Exponential Backoff

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Only retry on transient errors
      const retryable = [429, 500, 503].includes(error.status);
      if (!retryable || attempt === maxRetries) {
        throw error;
      }

      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError!;
}

// Usage
const response = await withRetry(() =>
  ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })
);
```

### Safety Filters

Gemini may block content due to safety filters. Handle gracefully:

```typescript
const response = await ai.models.generateContent({...});

if (!response.candidates?.[0]?.content) {
  const blockReason = response.candidates?.[0]?.finishReason;
  if (blockReason === 'SAFETY') {
    throw new Error('Content blocked by safety filters');
  }
}
```

---

## 36. Quick Reference

### Minimal Text Generation

```typescript
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{ role: 'user', parts: [{ text: 'Hello!' }] }],
});
console.log(response.text);
```

### With All Options

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-pro',
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  config: {
    systemInstruction: 'You are a helpful assistant.',
    temperature: 0.7,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
    responseJsonSchema: mySchema,
    tools: [{ googleSearch: {} }],
    thinkingConfig: { includeThoughts: true, thinkingBudget: 8192 },
  },
});
```

### Model Quick Reference

```typescript
// Best for most apps
const model = 'gemini-2.5-flash';

// Complex reasoning
const model = 'gemini-2.5-pro';

// Frontier intelligence
const model = 'gemini-3-pro-preview';

// Fast frontier
const model = 'gemini-3-flash-preview';

// Budget option
const model = 'gemini-2.5-flash-lite';

// Image generation
const model = 'imagen-4.0-generate-001';

// Embeddings
const model = 'gemini-embedding-001';

// Autonomous research
const model = 'deep-research-pro-preview-12-2025';

// Browser automation
const model = 'gemini-2.5-computer-use-preview-10-2025';
```

### Tools Quick Reference

```typescript
// Google Search
config: { tools: [{ googleSearch: {} }] }

// Google Maps (with location)
config: {
  tools: [{ googleMaps: {} }],
  toolConfig: { retrievalConfig: { latLng: { latitude, longitude } } }
}

// Code Execution
config: { tools: [{ codeExecution: {} }] }

// URL Context
config: { tools: [{ urlContext: {} }] }

// File Search
config: { tools: [{ fileSearch: { fileSearchStoreNames: ['store-id'] } }] }

// Function Calling
config: { tools: [{ functionDeclarations: [...] }] }
```

### Feature Availability Matrix

| Feature | 3 Pro | 3 Flash | 2.5 Pro | 2.5 Flash | 2.0 Flash |
|---------|-------|---------|---------|-----------|-----------|
| Thinking | ✓ | ✓ | ✓ | ✓ | ✓ (exp) |
| Function Calling | ✓ | ✓ | ✓ | ✓ | ✓ |
| Code Execution | ✓ | ✓ | ✓ | ✓ | ✓ |
| Google Search | ✓ | ✓ | ✓ | ✓ | ✓ |
| Google Maps | ✗ | ✗ | ✓ | ✓ | ✓ |
| URL Context | ✓ | ✓ | ✓ | ✓ | ✓ |
| File Search | ✓ | ✓ | ✓ | ✓ | ✗ |
| Caching | ✓ | ✓ | ✓ | ✓ | ✗ |
| Batch API | ✓ | ✓ | ✓ | ✓ | ✓ |
| Live API | ✗ | ✗ | ✗ | ✓ | ✓ |
| Image Gen | ✓ | ✗ | ✗ | ✓ | ✗ |

---

**End of Google AI API Documentation**

*Total coverage: 36 sections including SDK, Authentication, Models, Text/JSON Generation, Long Context, Conversations, Streaming, Thinking, Function Calling, Code Execution, Search/Maps Grounding, URL Context, File Search, Caching, Audio, Video Understanding/Generation, Documents, Image Generation (Imagen & Gemini), Embeddings, Deep Research Agent, Computer Use Agent, Live API, Robotics, Music Generation, Batch API, Token Counting, Rate Limits, Pricing, MicroLabs Patterns, and Error Handling.*
