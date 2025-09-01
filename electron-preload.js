const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getOSInfo: () => ipcRenderer.invoke('get-os-info'),
  listContainers: () => ipcRenderer.invoke('list-containers'),
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  onWindowStateChange: (callback) => ipcRenderer.on('window-state-change', (_event, value) => callback(value)),
});