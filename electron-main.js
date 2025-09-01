const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Vite dev server URL
  const viteDevServerURL = 'http://localhost:5173';

  // Load the Vite dev server URL in development, or the built HTML file in production.
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    mainWindow.loadURL(viteDevServerURL);
    // Open DevTools for debugging, only in development
    mainWindow.webContents.openDevTools();
  }
}

// IPC handler to get OS info
ipcMain.handle('get-os-info', () => {
  return {
    arch: os.arch(),
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    totalmem: os.totalmem(),
    freemem: os.freemem(),
  };
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
