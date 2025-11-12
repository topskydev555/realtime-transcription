# Audio Transcription App

A real-time system audio transcription application built with Electron.js and OpenAI's Realtime API. This app captures system audio and transcribes it to text in real-time, displaying only English transcriptions in a Google Live Caption-like interface.

## Features

- 🎙️ **System Audio Capture** - Captures audio from your system (desktop audio, browser audio, etc.)
- 🔴 **Real-time Transcription** - Live transcription using OpenAI's Realtime API with WebRTC
- 🌐 **English-Only Filter** - Automatically filters out non-English text
- 🎨 **Clean UI** - Google Live Caption-style interface with continuous scrolling text
- ⚡ **Low Latency** - WebRTC streaming for minimal delay
- 🔒 **Secure** - API keys stored in `.env` file, never exposed to renderer process

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key with access to Realtime API
- Windows, macOS, or Linux

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd electron-transcription
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your-api-key-here
```

**Important:** Do not include quotes around the API key value in the `.env` file.

## Usage

1. Start the application:
```bash
npm start
```

2. Click **"Start Recording"** button

3. Allow screen/audio sharing permissions when prompted

4. Play any audio on your system (browser, media player, etc.)

5. Watch the live transcription appear in real-time

6. Click **"Stop Recording"** when done

## Project Structure

```
electron-transcription/
├── main.js           # Electron main process (IPC handlers, window creation)
├── preload.js        # Preload script (exposes safe IPC methods)
├── renderer.js       # Renderer process (UI logic, WebRTC, transcription)
├── utils.js          # Utility functions (text processing, language detection)
├── index.html        # UI markup
├── package.json      # Dependencies and scripts
├── .env             # Environment variables (API key)
└── README.md        # This file
```

## How It Works

1. **Audio Capture**: Uses Electron's `desktopCapturer` API and `getDisplayMedia` to capture system audio
2. **WebRTC Connection**: Establishes a WebRTC peer connection with OpenAI's Realtime API
3. **Real-time Streaming**: Audio is streamed directly to OpenAI via WebRTC data channels
4. **Transcription**: OpenAI processes the audio and sends transcription events back
5. **Text Processing**: 
   - Filters non-English text
   - Merges overlapping transcriptions
   - Normalizes text formatting
6. **Display**: Shows continuous, scrolling transcription in the UI

## Configuration

### API Key

The app uses the OpenAI Realtime API (`gpt-realtime-preview` model). Make sure your API key has access to this API.

### Language Filtering

The app automatically filters out non-English text. To modify this behavior, edit the `isEnglishText()` function in `utils.js`.

## Technologies Used

- **Electron.js** - Desktop application framework
- **OpenAI Realtime API** - Real-time audio transcription
- **WebRTC** - Low-latency audio streaming
- **Node.js** - Backend runtime
- **HTML/CSS/JavaScript** - Frontend

## Troubleshooting

### "OpenAI API key not found"
- Make sure you have a `.env` file in the root directory
- Check that `OPENAI_API_KEY` is set correctly (no quotes)
- Restart the app after creating/editing `.env`

### "Permission denied" error
- Make sure to allow screen/audio sharing when prompted
- Check your system's privacy settings for screen recording permissions

### "No audio track available"
- Ensure system audio capture is enabled in your OS settings
- Try restarting the app
- On macOS, you may need to grant screen recording permissions

### No transcription appearing
- Check that audio is actually playing on your system
- Open DevTools (F12) and check the console for errors
- Verify your API key has access to Realtime API
- Check your internet connection

## Development

### Running in Development Mode
```bash
npm start
```

### Building for Production
(Add build scripts to package.json if needed)

## License

ISC

## Author

Jordan Chinn

