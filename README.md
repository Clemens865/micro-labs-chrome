# MicroLabs Meeting Assistant - Chrome Extension

AI-powered meeting assistant with real-time transcription, translation, and intelligent summaries using Google Gemini's Live API.

## Features

- **Live Transcription**: Real-time speech-to-text during meetings
- **AI Assistant**: Ask questions and get insights during your meeting
- **Audio Responses**: AI responds with natural voice (TTS)
- **File Transcription**: Upload audio files for offline transcription
- **Meeting Summaries**: Generate AI-powered summaries with action items
- **History**: Access past meeting transcriptions
- **Multiple Languages**: Support for 9+ languages
- **5 AI Voices**: Choose from Puck, Charon, Kore, Fenrir, or Zephyr

## Installation

### Development Setup

1. **Clone or download this repository**

2. **Convert SVG icons to PNG** (required for Chrome):
   ```bash
   # Using ImageMagick (install with: brew install imagemagick)
   cd icons
   for size in 16 32 48 128; do
     convert -background none icon${size}.svg icon${size}.png
   done
   ```

   Or use any SVG to PNG converter online.

3. **Load the extension in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `MicroLabs-Chrome` folder

4. **Get your Google AI API Key**:
   - Visit [Google AI Studio](https://aistudio.google.com/apikey)
   - Create a new API key
   - Copy the key

5. **Configure the extension**:
   - Click the MicroLabs icon in Chrome toolbar
   - The side panel will open
   - Enter your API key when prompted

## Usage

### Live Session (Real-time Transcription)

1. Click the microphone button to start a live session
2. Speak naturally - your speech will be transcribed in real-time
3. The AI can respond to questions with voice
4. Click the stop button to end the session
5. Use the summary button to generate meeting notes
6. Export your transcript as a text file

### File Transcription

1. Switch to the "Transcribe" tab
2. Drag & drop an audio file or click to browse
3. Supported formats: MP3, WAV, M4A, OGG, FLAC
4. Wait for processing (progress shown)
5. View, copy, or download the transcript
6. Generate an AI summary

### Settings

- **AI Voice**: Choose from 5 different voice options
- **Language**: Set your preferred language
- **Timestamps**: Toggle timestamp display
- **Auto-transcribe**: Enable automatic transcription on session start

## Technical Details

### Architecture

```
MicroLabs-Chrome/
├── manifest.json          # Chrome extension manifest (v3)
├── background.js          # Service worker for API key storage
├── sidepanel.html         # Main UI
├── sidepanel.js           # Application logic + Live API integration
├── styles.css             # Styling
├── lib/
│   └── genai.esm.js       # Google GenAI wrapper for extensions
└── icons/                 # Extension icons
```

### APIs Used

| Feature | API/Model |
|---------|-----------|
| Live Audio | `gemini-2.5-flash-native-audio-preview-09-2025` (Live API) |
| File Transcription | `gemini-2.5-flash` |
| Summaries | `gemini-2.5-flash` |
| Text-to-Speech | Native in Live API |

### Audio Specifications

| Direction | Format | Sample Rate |
|-----------|--------|-------------|
| Input (mic) | PCM Int16 | 16 kHz |
| Output (AI) | PCM Int16 | 24 kHz |

### Based On

This extension is based on patterns from Google AI Studio apps:
- **lingocontext-pro**: Live translation with bidirectional audio
- **objection-master-ai**: Real-time voice practice
- **echoscribe**: Audio file transcription

## Permissions

| Permission | Purpose |
|------------|---------|
| `sidePanel` | Display the meeting assistant UI |
| `storage` | Save API key and settings locally |
| `tabs` | Open side panel for current tab |
| `activeTab` | Detect when to show side panel |

The extension also requires access to `generativelanguage.googleapis.com` for Gemini API calls.

## Troubleshooting

### "Microphone access denied"
- Click the lock icon in Chrome's address bar
- Enable microphone permission for the extension
- Refresh and try again

### "Connection error"
- Check your internet connection
- Verify your API key is correct
- Ensure you haven't exceeded rate limits

### No audio output from AI
- Check your system volume
- Ensure no other app is using audio output
- Try restarting the session

### WebSocket connection fails
- The Live API requires a stable internet connection
- Some corporate firewalls may block WebSocket connections
- Try on a different network

## Rate Limits

Google AI API has rate limits based on your tier:

| Tier | Requests/min | Tokens/min |
|------|-------------|------------|
| Free | 15 | 1M |
| Tier 1 | 60 | 4M |
| Tier 2 | 100 | 10M |

## Privacy

- All processing happens via Google's Gemini API
- Audio is streamed in real-time (not stored by the extension)
- API key is stored locally in Chrome's secure storage
- Meeting history is stored locally only
- No data is sent to third parties

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details.

## Credits

- Built with Google Gemini AI
- UI inspired by modern meeting tools
- Based on patterns from MicroLabs platform

---

**Powered by Google Gemini AI** | Made with MicroLabs
