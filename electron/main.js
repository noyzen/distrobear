const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

const { registerSystemHandlers } = require('./handlers/system');
const { registerContainerHandlers } = require('./handlers/container');
const { registerImageHandlers } = require('./handlers/image');
const { registerApplicationHandlers } = require('./handlers/application');
const { registerLogHandlers, setMainWindowForLogger } = require('./utils');

const store = new Store();
let mainWindow;

function createWindow() {
  const windowBounds = store.get('windowBounds', { width: 1024, height: 768 });

  mainWindow = new BrowserWindow({
    ...windowBounds,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../electron-preload.js'), // Adjusted path
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
  });

  setMainWindowForLogger(mainWindow); // Pass window to the logger utility

  mainWindow.on('close', () => {
    store.set('windowBounds', mainWindow.getBounds());
  });

  mainWindow.on('maximize', () => mainWindow.webContents.send('window-state-change', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window-state-change', false));

  const viteDevServerURL = 'http://localhost:5173';
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html')); // Adjusted path
  } else {
    mainWindow.loadURL(viteDevServerURL);
    // mainWindow.webContents.openDevTools();
  }
}

// Register all IPC handlers
function registerIpcHandlers() {
    registerLogHandlers(); // Must be first
    registerSystemHandlers(mainWindow);
    registerContainerHandlers(mainWindow);
    registerImageHandlers(mainWindow);
    registerApplicationHandlers(mainWindow);

    // Window controls
    ipcMain.on('window-minimize', () => BrowserWindow.getFocusedWindow()?.minimize());
    ipcMain.on('window-maximize', () => {
        const window = BrowserWindow.getFocusedWindow();
        if (window) window.isMaximized() ? window.unmaximize() : window.maximize();
    });
    ipcMain.on('window-close', () => BrowserWindow.getFocusedWindow()?.close());
}


app.whenReady().then(() => {
  createWindow();
  registerIpcHandlers();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});