const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAudioSources: () => ipcRenderer.invoke('get-audio-sources'),
  checkAPIKey: () => ipcRenderer.invoke('check-api-key'),
  getRealtimeAnswer: (sdp) => ipcRenderer.invoke('get-realtime-answer', sdp)
});
