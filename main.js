require('dotenv').config();

const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');

let mainWindow;
let openaiClient = null;

const apiKey = process.env.OPENAI_API_KEY;
if (apiKey) {
  const cleanKey = apiKey.replace(/^["']|["']$/g, '');
  openaiClient = { apiKey: cleanKey };
  console.log('OpenAI API key loaded from .env');
} else {
  console.warn('OpenAI API key not found in .env file');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableBlinkFeatures: 'MediaDevices'
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('get-audio-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      fetchWindowIcons: false
    });
    return sources.map(source => ({
      id: source.id,
      name: source.name
    }));
  } catch (error) {
    console.error('Error getting audio sources:', error);
    return [];
  }
});

ipcMain.handle('check-api-key', async () => {
  return {
    hasKey: openaiClient !== null,
    fromEnv: !!process.env.OPENAI_API_KEY
  };
});

ipcMain.handle('get-realtime-answer', async (event, sdp) => {
  if (!openaiClient) {
    throw new Error('OpenAI API key not set');
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY.replace(/^["']|["']$/g, '');
    console.log('Connecting to OpenAI Realtime API with model: gpt-realtime-preview');
    
    const response = await fetch('https://api.openai.com/v1/realtime?model=gpt-realtime-preview', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/sdp'
      },
      body: sdp
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Realtime API error:', response.status, errorText);
      throw new Error(`Realtime API error: ${response.status} ${errorText}`);
    }

    const answerSdp = await response.text();
    console.log('Successfully connected to Realtime API');
    return answerSdp;
  } catch (error) {
    console.error('Realtime API error:', error);
    throw new Error(`Failed to connect to Realtime API: ${error.message}`);
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
