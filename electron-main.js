const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');
const sudo = require('sudo-prompt');

let mainWindow; // Reference to the main window

// Define a common options object for exec calls that need the modified PATH
const execOptions = {
  env: {
    ...process.env,
    PATH: `${process.env.PATH || ''}:${path.join(os.homedir(), '.local', 'bin')}`
  }
};

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
    return { name: parts[nameIndex], status: parts[statusIndex], image: parts[imageIndex] };
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
  });

  mainWindow.on('maximize', () => mainWindow.webContents.send('window-state-change', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window-state-change', false));

  const viteDevServerURL = 'http://localhost:5173';
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    mainWindow.loadURL(viteDevServerURL);
    mainWindow.webContents.openDevTools();
  }
}

// Helper function to check if a command exists
const commandExists = (command) => {
  return new Promise((resolve) => {
    exec(`command -v ${command}`, execOptions, (error) => resolve(!error));
  });
};

// IPC handler for dependency checking
ipcMain.handle('check-dependencies', async () => {
  const deps = ['distrobox', 'podman', 'docker'];
  const statuses = await Promise.all(deps.map(async (dep) => ({
    name: dep,
    isInstalled: await commandExists(dep),
  })));

  const distroboxOk = statuses.find(d => d.name === 'distrobox')?.isInstalled;
  const containerRuntimeOk = statuses.find(d => d.name === 'podman')?.isInstalled || statuses.find(d => d.name === 'docker')?.isInstalled;
  
  return {
    dependencies: statuses,
    needsSetup: !distroboxOk || !containerRuntimeOk,
  };
});

// IPC handler for installing dependencies
ipcMain.handle('install-dependencies', async () => {
  const packageManagers = {
    apt: { cmd: 'apt-get', args: ['install', '-y', 'podman'] },
    dnf: { cmd: 'dnf', args: ['install', '-y', 'podman'] },
    pacman: { cmd: 'pacman', args: ['-S', '--noconfirm', 'podman'] },
    zypper: { cmd: 'zypper', args: ['install', '-y', 'podman'] },
  };

  let installCommand = '';

  for (const pm in packageManagers) {
    if (await commandExists(pm)) {
      installCommand = `${packageManagers[pm].cmd} ${packageManagers[pm].args.join(' ')}`;
      break;
    }
  }

  if (!installCommand) {
    mainWindow.webContents.send('installation-log', 'Error: Could not detect a supported package manager (apt, dnf, pacman, zypper).\n');
    throw new Error('Unsupported package manager.');
  }

  const fullCommand = `
    echo "--- Installing Podman (Container Runtime) ---" && \
    ${installCommand} && \
    echo "--- Installing Distrobox ---" && \
    curl -s https://raw.githubusercontent.com/89luca89/distrobox/main/install | sh -s -- --prefix ~/.local && \
    echo "--- Installation Complete ---"
  `;
  
  const options = { name: 'DistroBear Setup' };

  return new Promise((resolve, reject) => {
    const child = sudo.exec(fullCommand, options, (error, stdout, stderr) => {
      if (error) {
        mainWindow.webContents.send('installation-log', `Sudo Error: ${error.message}\n`);
        reject(error);
      }
    });

    child.stdout.on('data', (data) => {
      mainWindow.webContents.send('installation-log', data.toString());
    });
    child.stderr.on('data', (data) => {
      mainWindow.webContents.send('installation-log', data.toString());
    });
    child.on('close', (code) => {
      if (code === 0) {
        mainWindow.webContents.send('installation-log', '\nSetup finished successfully!\n');
        resolve();
      } else {
        mainWindow.webContents.send('installation-log', `\nSetup process exited with code ${code}.\n`);
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
});


/**
 * A robust helper for running shell commands.
 * Uses `spawn` for better handling of I/O and avoids buffer issues.
 * Executes commands within a login shell (`bash -l -c`) to ensure the
 * full user environment (PATH, DBUS, etc.) is available.
 * @param {string} command The command to execute (e.g., 'distrobox').
 * @param {string[]} [args=[]] An array of arguments for the command.
 * @returns {Promise<string>} A promise that resolves with the command's stdout.
 */
function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    // Basic shell-quoting for args to prevent injection vulnerabilities.
    const quotedArgs = args.map(arg => `'${String(arg).replace(/'/g, "'\\''")}'`);
    const fullCommandString = `${command} ${quotedArgs.join(' ')}`;
    
    const shell = '/bin/bash';
    const shellArgs = ['-l', '-c', fullCommandString];
    
    console.log(`[DEBUG] Spawning: ${shell} ${shellArgs.join(' ')}`);

    const child = spawn(shell, shellArgs, { env: execOptions.env, shell: false });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const log = data.toString();
      console.log(`[DEBUG] stdout chunk: ${log.trim()}`);
      stdout += log;
    });

    child.stderr.on('data', (data) => {
      const log = data.toString();
      // Log stderr as error for better visibility in logs
      console.error(`[DEBUG] stderr chunk: ${log.trim()}`);
      stderr += log;
    });

    child.on('close', (code) => {
      console.log(`[DEBUG] Command "${fullCommandString}" finished with code ${code}`);
      if (code !== 0) {
        console.error(`[ERROR] Command "${fullCommandString}" failed. Stderr:\n${stderr}`);
        reject(new Error(stderr.trim() || `Process exited with code ${code}`));
      } else {
        resolve(stdout.trim());
      }
    });

    child.on('error', (err) => {
      console.error(`[ERROR] Failed to start subprocess for "${fullCommandString}": ${err.message}`);
      reject(err);
    });
  });
}

ipcMain.handle('list-containers', async () => {
  try {
    const output = await runCommand('distrobox', ['list', '--no-color', '--verbose']);
    return parseDistroboxList(output);
  } catch (err) {
    if (err.message && err.message.includes("command not found")) {
      throw new Error('Distrobox command not found. Is distrobox installed and in your PATH?');
    }
    throw new Error(`Failed to list containers: ${err.message}`);
  }
});

ipcMain.handle('container-start', async (event, name) => {
  const sanitizedName = String(name).replace(/[^a-zA-Z0-9-_\.]/g, '');
  if (!sanitizedName) {
      throw new Error('Invalid container name provided.');
  }
  try {
    return await runCommand('distrobox', ['start', sanitizedName]);
  } catch (err) {
    throw new Error(`Failed to start container "${sanitizedName}": ${err.message}`);
  }
});

ipcMain.handle('container-stop', async (event, name) => {
  const sanitizedName = String(name).replace(/[^a-zA-Z0-9-_\.]/g, '');
  if (!sanitizedName) {
    throw new Error('Invalid container name provided.');
  }
  try {
    return await runCommand('distrobox', ['stop', sanitizedName]);
  } catch(err) {
    throw new Error(`Failed to stop container "${sanitizedName}": ${err.message}`);
  }
});


ipcMain.on('window-minimize', () => BrowserWindow.getFocusedWindow()?.minimize());
ipcMain.on('window-maximize', () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) window.isMaximized() ? window.unmaximize() : window.maximize();
});
ipcMain.on('window-close', () => BrowserWindow.getFocusedWindow()?.close());

ipcMain.handle('get-os-info', () => ({
  arch: os.arch(),
  hostname: os.hostname(),
  platform: os.platform(),
  release: os.release(),
  totalmem: os.totalmem(),
  freemem: os.freemem(),
}));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});