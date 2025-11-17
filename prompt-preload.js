const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('promptAPI', {
  onData: (callback) => ipcRenderer.on('prompt-data', (_event, options) => callback(options)),
  sendResponse: (value) => ipcRenderer.send('prompt-response', value)
});