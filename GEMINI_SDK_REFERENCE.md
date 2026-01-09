# Google Gemini SDK & API Reference (v1.34.0+)

> **Single Source of Truth** for the Genie project.
> **Last Updated:** January 2025
> **SDK:** `@google/genai`

## 1. Core Models

Use these model IDs for all development. Models are organized by use case.

| Tier | Model ID | Best For | Tools | Google Search |
| :--- | :--- | :--- | :---: | :---: |
| **Fast** | `gemini-2.5-flash-lite` | Quick chat, simple Q&A | ✅ | ✅ |
| **Balanced** | `gemini-2.5-flash` | **Default.** Browser automation, general tasks | ✅ | ✅ |
| **Reasoning** | `gemini-2.5-pro` | Complex analysis, deep reasoning | ✅ | ✅ |

### Experimental Models (Limited Tool Support)

| Model ID | Notes |
| :--- | :--- |
| `gemini-3-pro-preview` | Latest multimodal. **Tools not fully supported yet.** |
| `gemini-3-flash-preview` | Fast preview. **Tools not fully supported yet.** |

> [!IMPORTANT]
> **Use `gemini-2.5-flash` as the default** until Gemini 3 models fully support function calling + Google Search together.

## 2. SDK Initialization

```typescript
import { GoogleGenAI } from "@google/genai";

// Initialize Client (stateless - model selected per call)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY // Or from chrome.storage
});
```

## 3. Text Generation

### Non-Streaming

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Explain quantum mechanics briefly.',
});

console.log(response.text); // Use getter, not response.text()
```

### Streaming

```typescript
const result = await ai.models.generateContentStream({
  model: 'gemini-2.5-flash',
  contents: 'Write a story about a robot.',
});

for await (const chunk of result) {
  const part = chunk.candidates?.[0]?.content?.parts?.[0];
  if (part?.text) {
    console.log(part.text);
  }
}
```

## 4. Tools & Function Calling

### Google Search (Grounding)

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'What happened in tech news today?',
  config: {
    tools: [{ googleSearch: {} }]
  }
});

// Access grounding metadata for citations
const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
```

### Custom Function Calling

```typescript
const tools = [{
  functionDeclarations: [{
    name: 'clickElement',
    description: 'Click a UI element',
    parameters: {
      type: 'OBJECT',
      properties: {
        selector: { type: 'STRING', description: 'CSS selector' }
      },
      required: ['selector']
    }
  }]
}];

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Click the submit button',
  config: { tools }
});

// Check for function calls
const call = response.functionCalls?.[0];
if (call) {
  console.log(`Execute: ${call.name}(${JSON.stringify(call.args)})`);
}
```

### Combining Google Search + Custom Functions

```typescript
// Both tools can be used together with gemini-2.5-flash
const tools = [
  { googleSearch: {} },
  {
    functionDeclarations: [
      // Your custom functions here
    ]
  }
];

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash', // Must use 2.5 models for this combo
  contents: prompt,
  config: { tools }
});
```

## 5. Multimodal Inputs

### Images

```typescript
const contents = [
  {
    role: 'user',
    parts: [
      { text: 'Describe this image' },
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64String // Raw base64, NO data:image/ prefix
        }
      }
    ]
  }
];

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents
});
```

## 6. Model Selection Strategy

### In Genie, we use different models based on task:

```typescript
import { AVAILABLE_MODELS, ModelTier } from './types';

// Get model ID by tier
const getModelId = (tier: ModelTier): string => {
  return AVAILABLE_MODELS[tier].id;
};

// Usage
const modelId = getModelId('balanced'); // 'gemini-2.5-flash'
const modelId = getModelId('fast');     // 'gemini-2.5-flash-lite'
const modelId = getModelId('reasoning'); // 'gemini-2.5-pro'
```

### When to use each tier:

| Task | Recommended Tier |
| :--- | :--- |
| Simple chat, quick answers | `fast` |
| Browser automation, tools | `balanced` |
| Complex analysis, coding | `reasoning` |

## 7. Best Practices

### API Keys
- Never commit keys to source control
- Use `chrome.storage.local` for extension storage
- Environment variables for development

### Property Access
- Use `response.text` (getter), NOT `response.text()`
- Access candidates via `response.candidates?.[0]`

### Error Handling

```typescript
try {
  const response = await ai.models.generateContent({...});
} catch (error) {
  if (error.message.includes('404')) {
    // Invalid model ID
  } else if (error.message.includes('Tool use')) {
    // Model doesn't support this tool configuration
  }
}
```

### Tool Configuration

```typescript
// Only include tools if model supports them
const config = {
  tools: modelConfig.supportsTools ? tools : undefined
};
```

## 8. Common Errors

| Error | Cause | Fix |
| :--- | :--- | :--- |
| `404 Not Found` | Invalid model ID | Use valid model from table above |
| `Tool use with function calling is unsupported` | Model doesn't support tools combo | Use `gemini-2.5-flash` |
| `API Key not found` | Missing or invalid key | Check storage/env |

## 9. Resources

- [Official SDK Docs](https://ai.google.dev/gemini-api/docs)
- [NPM Package](https://www.npmjs.com/package/@google/genai)
- [GitHub Repository](https://github.com/googleapis/js-genai)
- [Available Models](https://ai.google.dev/gemini-api/docs/models)
