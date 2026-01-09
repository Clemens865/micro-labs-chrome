# MicroLabs Chrome Extension

AI-powered productivity suite with 25+ micro-apps for research, content analysis, and workflow automation using Google Gemini AI.

## Features

- **Page Digest** - Summarize any webpage in seconds
- **YouTube Digest** - Get video summaries with chapter breakdowns
- **Chat with Page** - Interactive Q&A with any webpage
- **Deep Research** - Multi-source research with citations
- **Meeting Minutes** - Transcribe and summarize meetings
- **Competitive Analysis** - Analyze competitors from their websites
- **Email Composer** - AI-powered email drafting
- **And 20+ more apps...**

## Installation

### Prerequisites

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Google AI API Key** - [Get one free](https://aistudio.google.com/apikey)

### Step 1: Clone the Repository

```bash
git clone https://github.com/Clemens865/micro-labs-chrome.git
cd micro-labs-chrome
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Build the Extension

```bash
npm run build
```

This creates a `dist/` folder with the compiled extension.

### Step 4: Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top right corner)
3. Click **"Load unpacked"**
4. Select the `dist/` folder inside your project directory

### Step 5: Configure API Key

1. Click the MicroLabs icon in Chrome toolbar (or right-click and select "Open side panel")
2. Go to **Settings** (gear icon)
3. Enter your Google AI API Key
4. Click Save

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

## Project Structure

```
micro-labs-chrome/
├── src/
│   ├── apps/              # Individual micro-apps
│   │   ├── page-digest/
│   │   ├── youtube-digest/
│   │   ├── chat-with-page/
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
- Make sure you have billing enabled (free tier available)

### Changes not appearing
- Refresh the extension at `chrome://extensions/`
- Close and reopen the side panel

## Permissions

| Permission | Purpose |
|------------|---------|
| `sidePanel` | Display the app UI |
| `storage` | Save API key and settings |
| `tabs` | Read page content for analysis |
| `activeTab` | Access current tab context |
| `scripting` | Inject content scripts |
| `debugger` | Console monitoring feature |

## Privacy

- All AI processing uses Google's Gemini API
- API key stored locally in Chrome's secure storage
- App history stored locally only
- No data sent to third parties

## License

MIT License

---

**Powered by Google Gemini AI**
