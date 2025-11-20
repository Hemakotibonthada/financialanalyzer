const { app, BrowserWindow, Menu, Tray, shell, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const fs = require('fs');

let mainWindow;
let setupWindow;
let landingWindow;
let tray = null;

// Get user data path for storing settings
const userDataPath = app.getPath('userData');
const settingsPath = path.join(userDataPath, 'settings.json');

// Load settings from file
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return null;
}

// Save settings to file
function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
}

// Create setup window for first-time configuration
function createSetupWindow() {
  setupWindow = new BrowserWindow({
    width: 650,
    height: 700,
    resizable: false,
    center: true,
    frame: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#667eea',
    title: 'Financial Analyzer - Setup',
    show: false  // Don't show until ready
  });

  setupWindow.loadFile(path.join(__dirname, 'setup.html'))
    .then(() => {
      console.log('Setup HTML loaded successfully');
      setupWindow.show();
    })
    .catch((error) => {
      console.error('Failed to load setup.html:', error);
      setupWindow.show();
    });

  // Open DevTools in development mode
  if (isDev) {
    setupWindow.webContents.openDevTools();
  }

  setupWindow.on('closed', () => {
    setupWindow = null;
    // If setup was cancelled, quit the app
    const settings = loadSettings();
    if (!settings || !settings.setupCompleted) {
      app.quit();
    } else {
      // Setup completed, create main window
      createWindow();
      createTray();
      createMenu();
    }
  });
}

// IPC handlers for setup
ipcMain.handle('save-storage-settings', async (event, settings) => {
  try {
    const fullSettings = {
      ...settings,
      setupCompleted: true,
      setupDate: new Date().toISOString()
    };
    return saveSettings(fullSettings);
  } catch (error) {
    console.error('Error saving storage settings:', error);
    return false;
  }
});

ipcMain.handle('get-storage-settings', async () => {
  try {
    return loadSettings();
  } catch (error) {
    console.error('Error loading storage settings:', error);
    return null;
  }
});

// IPC handlers for landing page
ipcMain.on('launch-main-app', () => {
  if (landingWindow) {
    landingWindow.close();
    landingWindow = null;
  }
  createWindow();
  createTray();
  createMenu();
});

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});

// Create landing window (shown on first launch)
function createLandingWindow() {
  landingWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    resizable: false,
    center: true,
    frame: false,
    transparent: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#667eea',
    title: 'Welcome to Financial Analyzer'
  });

  landingWindow.loadFile(path.join(__dirname, 'landing.html'));

  landingWindow.on('closed', () => {
    landingWindow = null;
  });
}

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#F9FAFB',
    show: false, // Don't show until ready
    title: 'Financial Analyzer'
  });

  // Load the frontend
  const startURL = isDev
    ? 'http://localhost:3000' // Development: React dev server
    : `file://${path.join(__dirname, '../frontend/dist/index.html')}`; // Production: Built files

  mainWindow.loadURL(startURL);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle window close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

// Create system tray icon
function createTray() {
  const trayIcon = path.join(__dirname, 'assets/tray-icon.png');
  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Financial Analyzer',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    { type: 'separator' },
    {
      label: 'Dashboard',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: 'Company Expenses',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('navigate', '/company-expenses');
      }
    },
    {
      label: 'EMI Tracker',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('navigate', '/emi-tracker');
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('navigate', '/settings');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Financial Analyzer');
  tray.setContextMenu(contextMenu);

  // Show window on tray icon click
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+D',
          click: () => mainWindow.webContents.send('navigate', '/dashboard')
        },
        { type: 'separator' },
        {
          label: 'Minimize to Tray',
          accelerator: 'CmdOrCtrl+M',
          click: () => mainWindow.hide()
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => {
            app.isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Features',
      submenu: [
        {
          label: 'Company Expenses',
          click: () => mainWindow.webContents.send('navigate', '/company-expenses')
        },
        {
          label: 'EMI Tracker',
          click: () => mainWindow.webContents.send('navigate', '/emi-tracker')
        },
        {
          label: 'Lender Dashboard',
          click: () => mainWindow.webContents.send('navigate', '/lender')
        },
        {
          label: 'Bill Reminders',
          click: () => mainWindow.webContents.send('navigate', '/bill-reminders')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://github.com/yourusername/financial-analyzer')
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            const aboutMessage = `Financial Analyzer v${app.getVersion()}\n\nA comprehensive financial management application.\n\n© 2025 All rights reserved.`;
            require('electron').dialog.showMessageBox(mainWindow, {
              title: 'About Financial Analyzer',
              message: aboutMessage,
              type: 'info',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  if (isDev) {
    template.push({
      label: 'Developer',
      submenu: [
        { role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: 'Clear Cache',
          click: () => {
            mainWindow.webContents.session.clearCache();
            mainWindow.reload();
          }
        }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App ready event
app.whenReady().then(() => {
  // Check if first-time setup is needed
  const settings = loadSettings();
  
  if (!settings || !settings.setupCompleted) {
    // First launch - show setup window
    createSetupWindow();
  } else if (settings.showLanding !== false) {
    // Show landing window on startup (can be disabled by user)
    createLandingWindow();
  } else {
    // Direct to main app
    createWindow();
    createTray();
    createMenu();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const currentSettings = loadSettings();
      if (currentSettings && currentSettings.setupCompleted) {
        if (currentSettings.showLanding !== false) {
          createLandingWindow();
        } else {
          createWindow();
          createTray();
          createMenu();
        }
      } else {
        createSetupWindow();
      }
    } else {
      if (mainWindow) {
        mainWindow.show();
      }
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Handle app errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});
