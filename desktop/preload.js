const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Navigation
  onNavigate: (callback) => ipcRenderer.on('navigate', (event, route) => callback(route)),
  
  // App info
  getVersion: () => process.versions.electron,
  getPlatform: () => process.platform,
  
  // Storage settings
  saveStorageSettings: (settings) => ipcRenderer.invoke('save-storage-settings', settings),
  getStorageSettings: () => ipcRenderer.invoke('get-storage-settings'),
  
  // Landing page
  launchMainApp: () => ipcRenderer.send('launch-main-app'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  
  // Notifications (for future implementation)
  showNotification: (title, body) => {
    ipcRenderer.send('show-notification', { title, body });
  }
});

// Expose Node.js info (read-only)
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron
});
