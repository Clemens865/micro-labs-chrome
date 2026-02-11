# MicroLabs Chrome Extension

> **Alpha Release** - AI-powered productivity suite with 63 micro-apps for research, content analysis, development, and workflow automation using Google Gemini AI.

## Features

- 63 specialized AI micro-apps
- Powered by Google Gemini 2.0 Flash & Gemini 2.5 Flash Image
- Chrome Side Panel interface
- Works on any webpage
- Local storage for privacy

---

## App Catalogue

### Page Analysis

| App | Description |
|-----|-------------|
| **Page Digest** | Instant summaries and key points extraction |
| **Chat with Page** | Interactive Q&A with any webpage content |
| **Screenshot Analyzer** | AI-powered visual analysis of any page |
| **Terms & Privacy Analyzer** | Analyze pages for legal risks & privacy concerns |

### Research

| App | Description |
|-----|-------------|
| **Research Assistant** | AI research with live Google Search grounding |
| **Deep Research** | AI rabbit hole - explore topics infinitely deep |
| **Fact Checker** | AI fact-checking with source verification |
| **Citation Generator** | APA, MLA, Chicago & Harvard citations |
| **Source Credibility** | Evaluate trustworthiness & reliability |
| **Neighborhood Intel AI** | Real-time neighborhood research & analysis |
| **Privacy Policy Diff Tracker** | Track privacy policy changes with AI risk analysis |
| **Docs Crawler** | AI-powered documentation crawler that extracts & organizes content from entire doc sites |
| **Multi-Site Comparator** | Compare up to 20 URLs simultaneously for products, pricing, features & reviews |

### AI Agents

| App | Description |
|-----|-------------|
| **Advanced Chat** | Research chat with live web search, page context analysis & export |
| **Web Research Agent** | Multi-URL analysis & synthesis with agentic browsing |
| **Competitive Analysis** | AI-powered competitor research & insights |
| **Link Analyzer** | Deep-dive analysis of linked pages |
| **Topic Monitor** | Track topics across resources & stay updated |
| **Auto Browser Agent** | Automated web browsing with content extraction |

### Browser Tools

| App | Description |
|-----|-------------|
| **Tab Manager Pro** | AI-powered tab organization, grouping & session management |
| **Tab Automations** | Rule-based tab actions & triggers |
| **Reading Queue** | Save pages for later with AI prioritization |
| **Multi-Tab Scraper** | Extract structured data from multiple tabs |
| **Workflow Recorder** | Record actions & generate workflow docs or automation code |
| **Data Table Extractor Pro** | Extract tables with sorting, filtering & export |

### Media & Creative

| App | Description |
|-----|-------------|
| **YouTube Digest** | AI video summaries with chapter breakdowns |
| **Voice Notes** | Speech-to-text with AI processing |
| **Page Reader** | Listen to any page with text-to-speech |
| **AI Image Generator** | Create images with Google Imagen 3 |
| **SVG Icon Generator** | AI-powered icon & logo creation with 65 styles, batch mode & vector export |
| **Pixel Alchemy** | AI image editing with text prompts and reference mixing |
| **Brand Studio** | AI-powered design studio for branded marketing assets with layers, shapes & AI generation |

### Developer Tools

| App | Description |
|-----|-------------|
| **Console Monitor** | Live console logs with AI error analysis |
| **Tech Stack Detector** | Identify frameworks, libraries & services |
| **Accessibility Auditor** | WCAG compliance & a11y best practices |
| **Vision2Code** | Transform any UI into production-ready code |
| **AEO Analyzer** | Answer Engine Optimization scoring & analysis |
| **API Endpoint Mapper** | Extract & document API endpoints |
| **Event Tracking Validator** | Capture & validate analytics events (GTM, GA4) |
| **CodeClone Blueprint** | Technical blueprints for cloning any product |
| **Error Log Parser** | AI-powered error analysis with root cause & fixes |
| **Feature Flag Detector** | Detect hidden feature flags from localStorage, cookies |
| **Performance Budget Enforcer** | Track & enforce page performance budgets |

### Productivity

| App | Description |
|-----|-------------|
| **Email Composer** | Smart email drafts & replies |
| **Meeting Transcriber** | Live meeting transcription with AI summaries |
| **Meeting Minutes** | Generate minutes from transcripts or audio |
| **Content Repurposer** | Transform content into tweets, posts, newsletters |
| **Job Application Assistant** | Generate cover letters & interview prep |
| **Interview Question Generator** | Role-specific questions with sample answers |
| **Smart Clipboard Manager** | Intelligent clipboard history with AI categorization |

### Data & Analytics

| App | Description |
|-----|-------------|
| **PDF Analyzer** | Analyze PDFs with AI - summaries, key points, tables & document chat |
| **Data Visualizer** | Convert CSV, JSON, tables or screenshots into interactive charts with AI analysis |
| **Statistical Analyzer** | Statistical analysis on datasets with descriptive stats, correlations & regression |
| **Audio Transcriber** | Transcribe & analyze audio files with AI summaries, action items & key points |

### Business

| App | Description |
|-----|-------------|
| **Lead Extractor** | Extract contacts, emails & social profiles |
| **CRM Lead Pusher** | Extract leads & push to HubSpot, Salesforce, webhooks |
| **Meeting Notes to Jira** | Extract action items as Jira tickets |
| **Support Ticket Pre-Filler** | AI pre-fills support tickets from customer messages |
| **CompetitorLens PRD** | Generate PRDs from competitor product analysis |
| **Competitor Pricing Monitor** | Track & analyze competitor SaaS pricing changes |
| **Competitor Ad Spy** | Capture & analyze competitor ads |
| **Social Proof Harvester** | Extract testimonials, reviews & social proof |
| **Contract Clause Extractor** | Extract & analyze contract clauses with risk assessment |

---

## Installation

### Prerequisites

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Google Chrome** browser
- **Google AI API Key** - [Get one free](https://aistudio.google.com/apikey)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Clemens865/micro-labs-chrome.git
cd micro-labs-chrome

# 2. Install dependencies
npm install

# 3. Build the extension
npm run build
```

### Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top right corner)
3. Click **"Load unpacked"**
4. Select the `dist/` folder inside the project directory

### Configure API Key

1. Click the MicroLabs icon in Chrome toolbar (or right-click and select "Open side panel")
2. Go to **Settings** (gear icon)
3. Enter your **Google AI API Key** ([get one here](https://aistudio.google.com/apikey))
4. Click **Save**

You're all set! Open the side panel on any webpage to start using the apps.

---

## Development

### Run in Watch Mode

```bash
npm run watch
```

This rebuilds automatically when you make changes. After changes:
1. Go to `chrome://extensions/`
2. Click the refresh icon on the MicroLabs extension

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Production build |
| `npm run watch` | Development with auto-rebuild |
| `npm run dev` | Start Vite dev server |

---

## Project Structure

```
micro-labs-chrome/
├── src/
│   ├── apps/              # Individual micro-apps (63)
│   │   ├── page-digest/
│   │   ├── youtube-digest/
│   │   ├── advanced-chat/
│   │   ├── pdf-analyzer/
│   │   └── ...
│   ├── hooks/             # React hooks (useGemini, usePageContext, etc.)
│   ├── components/        # Shared components
│   ├── sidepanel/         # Main app entry point
│   └── background/        # Chrome background script
├── public/
│   ├── manifest.json      # Chrome extension manifest
│   └── icons/             # Extension icons
├── dist/                  # Built extension (created by npm run build)
└── package.json
```

---

## Tech Stack

- **React 19** - UI Framework
- **TypeScript** - Type Safety
- **Vite 7** - Build Tool
- **Google Gemini AI** - AI Backend
  - Gemini 2.0 Flash (text generation, analysis)
  - Gemini 2.5 Flash Image (image generation)
- **ImageTracer.js** - SVG vectorization
- **Chrome Extension APIs** - Side Panel, Storage, Tabs, Scripting

---

## Troubleshooting

### "Cannot find module" errors during build
```bash
rm -rf node_modules
npm install
npm run build
```

### Extension not loading
- Make sure you selected the `dist/` folder, not the project root
- Check that `dist/manifest.json` exists after building

### API Key errors
- Verify your API key at [Google AI Studio](https://aistudio.google.com/)
- Make sure the Gemini API is enabled for your key

### Changes not appearing
- Refresh the extension at `chrome://extensions/`
- Close and reopen the side panel

---

## Permissions

| Permission | Purpose |
|------------|---------|
| `sidePanel` | Display the app UI |
| `storage` | Save API key and settings |
| `tabs` | Read page content for analysis |
| `activeTab` | Access current tab context |
| `scripting` | Inject content scripts |
| `debugger` | Console monitoring feature |

---

## Privacy

- All AI processing uses Google's Gemini API
- API key stored locally in Chrome's secure storage
- App history stored locally only
- No data sent to third parties

---

## License

MIT License

---

**Powered by Google Gemini AI**
