const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

// Function to parse the output of `distrobox list --verbose`
function parseDistroboxList(output) {
  const lines = output.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split('|').map(h => h.trim().toLowerCase());
  const nameIndex = headers.indexOf('name');
  const statusIndex = headers.indexOf('status');
  const imageIndex = headers.indexOf('image');

  if (nameIndex === -1 || statusIndex === -1 || imageIndex === -1) {
    console.error("Could not find required headers in distrobox list output");
    return [];
  }
  
  return lines.slice(1).map(line => {
    const parts = line.split('|').map(p => p.trim());
    return {
      name: parts[nameIndex],
      status: parts[statusIndex],
      image: parts[imageIndex],
    };
  });
}


function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: false, // Remove native frame
    transparent: true, // Allow for rounded corners
    backgroundColor: '#00000000', // Ensure transparency
  });

  // Forward window maximize/unmaximize events to the renderer
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-change', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-change', false);
  });

  const viteDevServerURL = 'http://localhost:5173';

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    mainWindow.loadURL(viteDevServerURL);
    mainWindow.webContents.openDevTools();
  }
}

// IPC handler to list distrobox containers
ipcMain.handle('list-containers', async () => {
  return new Promise((resolve, reject) => {
    // Use --no-color to get clean text, and --verbose to get more details
    exec('distrobox list --no-color --verbose', (error, stdout, stderr) => {
      if (error) {
        // If the command fails, it might be because distrobox is not installed.
        if (stderr.includes("command not found")) {
           return reject(new Error('Distrobox command not found. Is distrobox installed and in your PATH?'));
        }
        return reject(new Error(`Error executing distrobox: ${stderr}`));
      }
      resolve(parseDistroboxList(stdout));
    });
  });
});

// IPC handler for window controls
ipcMain.on('window-minimize', () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) window.minimize();
});
ipcMain.on('window-maximize', () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  }
});
ipcMain.on('window-close', () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) window.close();
});


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