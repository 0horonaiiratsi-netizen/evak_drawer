const { app, BrowserWindow, Menu, ipcMain, dialog, Notification } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

let mainWindow;
let currentLanguage = 'uk';
let windowBounds = { width: 1280, height: 800 };

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// --- Single Instance Lock ---
// This ensures that only one instance of the application can run at a time.
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance. We should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

function loadSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
            currentLanguage = settings.language || 'uk';
            windowBounds = settings.windowBounds || { width: 1280, height: 800 };
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
        currentLanguage = 'uk';
    }
}

function saveSettings() {
    try {
        const settings = {
            language: currentLanguage,
            windowBounds: mainWindow ? mainWindow.getBounds() : windowBounds
        };
        fs.writeFileSync(settingsPath, JSON.stringify(settings), 'utf-8');
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

const translations = {
    en: {
        newProject: 'New Project', export: 'Export',
        exportPng: 'Export to PNG...', exportPdf: 'Export to PDF...', exit: 'Exit', undo: 'Undo', redo: 'Redo',
        cut: 'Cut', copy: 'Copy', paste: 'Paste', delete: 'Delete', group: 'Group', ungroup: 'Ungroup',
        layersPanel: 'Layers Panel', propertiesPanel: 'Properties Panel', reload: 'Reload', forceReload: 'Force Reload',
        toggleDevTools: 'Toggle Developer Tools', resetZoom: 'Reset Zoom', zoomIn: 'Zoom In', zoomOut: 'Zoom Out',
        toggleFullscreen: 'Toggle Fullscreen', file: 'File', edit: 'Edit', view: 'View', language: 'Language',
        lang_uk: 'Ukrainian', lang_en: 'English',
        modals: { buttons: { ok: 'OK', cancel: 'Cancel' } }
    },
    uk: {
        newProject: 'Новий проєкт', export: 'Експорт',
        exportPng: 'Експорт у PNG...', exportPdf: 'Експорт у PDF...', exit: 'Вихід', undo: 'Скасувати', redo: 'Повторити',
        cut: 'Вирізати', copy: 'Копіювати', paste: 'Вставити', delete: 'Видалити', group: 'Групувати', ungroup: 'Розгрупувати',
        layersPanel: 'Панель шарів', propertiesPanel: 'Панель властивостей', reload: 'Перезавантажити', forceReload: 'Примусове перезавантаження',
        toggleDevTools: 'Інструменти розробника', resetZoom: 'Скинути масштаб', zoomIn: 'Наблизити', zoomOut: 'Віддалити',
        toggleFullscreen: 'Повноекранний режим', file: 'Файл', edit: 'Редагування', view: 'Вигляд', language: 'Мова',
        lang_uk: 'Українська', lang_en: 'English',
        modals: { buttons: { ok: 'Зрозуміло', cancel: 'Скасувати' } }
    }
};

const buildMenu = () => {
    const t = translations[currentLanguage];
    const menuTemplate = [
        {
            label: t.file,
            submenu: [
                { label: t.newProject, accelerator: 'CmdOrCtrl+N', click: () => { mainWindow.webContents.send('menu-action', 'new-project'); }},
                { type: 'separator' },
                { label: t.export, submenu: [
                    { label: t.exportPng, click: () => { mainWindow.webContents.send('menu-action', 'export-png'); } },
                    { label: t.exportPdf, click: () => { mainWindow.webContents.send('menu-action', 'export-pdf'); } }
                ]},
                { type: 'separator' },
                process.platform === 'darwin' ? { role: 'close' } : { role: 'quit', label: t.exit }
            ]
        },
        {
            label: t.edit,
            submenu: [
                { label: t.undo, accelerator: 'CmdOrCtrl+Z', click: () => { mainWindow.webContents.send('menu-action', 'undo'); }},
                { label: t.redo, accelerator: 'CmdOrCtrl+Y', click: () => { mainWindow.webContents.send('menu-action', 'redo'); }},
                { type: 'separator' },
                { label: t.cut, role: 'cut' },
                { label: t.copy, accelerator: 'CmdOrCtrl+C', click: () => { mainWindow.webContents.send('menu-action', 'copy'); }},
                { label: t.paste, accelerator: 'CmdOrCtrl+V', click: () => { mainWindow.webContents.send('menu-action', 'paste'); }},
                { label: t.delete, role: 'delete', click: () => { mainWindow.webContents.send('menu-action', 'delete'); }},
                { type: 'separator' },
                { label: t.group, accelerator: 'CmdOrCtrl+G', click: () => { mainWindow.webContents.send('menu-action', 'group'); }},
                { label: t.ungroup, accelerator: 'CmdOrCtrl+Shift+G', click: () => { mainWindow.webContents.send('menu-action', 'ungroup'); }},
            ]
        },
        {
            label: t.view,
            submenu: [
                { id: 'toggle-layers', label: t.layersPanel, type: 'checkbox', checked: false, click: () => { mainWindow.webContents.send('menu-action', 'toggle-layers'); }},
                { id: 'toggle-properties', label: t.propertiesPanel, type: 'checkbox', checked: false, click: () => { mainWindow.webContents.send('menu-action', 'toggle-properties'); }},
                { type: 'separator' },
                { role: 'reload', label: t.reload },
                { role: 'forceReload', label: t.forceReload },
                { role: 'toggleDevTools', label: t.toggleDevTools },
                { type: 'separator' },
                { role: 'resetZoom', label: t.resetZoom },
                { role: 'zoomIn', label: t.zoomIn },
                { role: 'zoomOut', label: t.zoomOut },
                { type: 'separator' },
                { role: 'togglefullscreen', label: t.toggleFullscreen }
            ]
        },
        {
            label: t.language,
            submenu: [
                { label: t.lang_uk, type: 'radio', checked: currentLanguage === 'uk', click: () => { setLanguage('uk'); }},
                { label: t.lang_en, type: 'radio', checked: currentLanguage === 'en', click: () => { setLanguage('en'); }},
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
};

const setLanguage = (lang) => {
    currentLanguage = lang;
    saveSettings();
    buildMenu();
    if (mainWindow) {
        mainWindow.webContents.send('on-set-language', lang);
    }
};

function createWindow () {
  mainWindow = new BrowserWindow({
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    title: 'Новий проєкт - Малювальник',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  // Save window state on resize and move events
  let saveTimeout;
  const saveWindowState = () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveSettings, 500); // Debounce to reduce writes
  };

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  loadSettings();
  buildMenu();
  
  ipcMain.handle('show-alert', async (event, options) => {
    if (!mainWindow) return;
    return await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: options.title,
        message: options.message,
        buttons: ['OK']
    });
  });

  ipcMain.handle('show-prompt', (event, options) => {
    return new Promise(resolve => {
        const promptWindow = new BrowserWindow({
            width: 400,
            height: 250,
            show: false,
            resizable: false,
            movable: true,
            parent: mainWindow,
            modal: true,
            title: options.title || 'Введення',
            backgroundColor: '#252526',
            webPreferences: {
                preload: path.join(__dirname, 'prompt-preload.js'),
                contextIsolation: true,
                nodeIntegration: false,
            }
        });

        promptWindow.loadFile('prompt.html');

        promptWindow.once('ready-to-show', () => {
            promptWindow.show();
            const t = translations[currentLanguage];
            promptWindow.webContents.send('prompt-data', {
                ...options,
                okLabel: t.modals?.buttons?.ok || 'OK',
                cancelLabel: t.modals?.buttons?.cancel || 'Cancel'
            });
        });
        
        const onResponse = (_event, value) => {
            // Unregister the listener to prevent memory leaks
            ipcMain.removeListener('prompt-response', onResponse);
            if (!promptWindow.isDestroyed()) {
              promptWindow.close();
            }
            resolve({ canceled: value === null, value });
        };

        ipcMain.on('prompt-response', onResponse);

        promptWindow.on('closed', () => {
             // If the window is closed without a response, resolve as cancelled
            ipcMain.removeListener('prompt-response', onResponse);
            resolve({ canceled: true, value: null });
        });
    });
});

  ipcMain.on('update-menu-state', (event, { key, value }) => {
    const menu = Menu.getApplicationMenu();
    if (!menu) return;

    const item = menu.getMenuItemById(key);
    if (item) {
        item.checked = value;
    }
  });

  ipcMain.on('request-initial-language', (event) => {
      event.reply('on-set-language', currentLanguage);
  });
  
  ipcMain.on('language-changed', (event, lang) => {
    if (currentLanguage !== lang) {
        currentLanguage = lang;
        saveSettings();
        buildMenu();
    }
  });

  ipcMain.on('set-progress-bar', (event, progress) => {
    if (mainWindow) {
        // Progress value should be between 0 and 1.
        // A value of -1 removes the progress bar.
        mainWindow.setProgressBar(progress);
    }
  });

  ipcMain.on('show-notification', (event, { title, body }) => {
    if (Notification.isSupported()) {
        new Notification({ title, body }).show();
    }
  });

  createWindow();

  // Trigger auto-update check after the window is created.
  // This provides a seamless update experience.
  autoUpdater.checkForUpdatesAndNotify();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Handle file opening on macOS when app is launched or Dock icon is used
app.on('open-file', (event, filePath) => {
    event.preventDefault();
    // File opening is disabled
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Save settings one last time before quitting
app.on('before-quit', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        saveSettings();
    }
});