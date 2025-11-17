const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (_event, action, payload) => callback(action, payload)),
  updateMenuState: (key, value) => ipcRenderer.send('update-menu-state', { key, value }),

  // --- Localization API ---
  onSetLanguage: (callback) => ipcRenderer.on('on-set-language', (_event, lang) => callback(lang)),
  requestInitialLanguage: () => ipcRenderer.send('request-initial-language'),
  languageChanged: (lang) => ipcRenderer.send('language-changed', lang),

  // --- Native Dialogs API ---
  showAlert: (options) => ipcRenderer.invoke('show-alert', options),
  showPrompt: (options) => ipcRenderer.invoke('show-prompt', options),
  
  // --- Taskbar Progress API ---
  setProgressBar: (progress) => ipcRenderer.send('set-progress-bar', progress),

  // --- Native Notifications API ---
  showNotification: (options) => ipcRenderer.send('show-notification', options),
});