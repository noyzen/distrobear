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

/**
 * A more robust parser for the 'distrobox list' command.
 * It dynamically detects column positions from the header row, making it
 * resilient to formatting changes, optional columns (like 'CREATED'), and
 * long field values that might shift column alignment.
 *
 * @param {string} output The raw string output from the command.
 * @returns {Array<{name: string, status: string, image: string}>}
 */
function parseDistroboxList(output) {
  const lines = output.trim().split('\n');
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  // Define all possible headers we might care about
  const knownHeaders = ['NAME', 'STATUS', 'CREATED', 'IMAGE'];
  
  // Find the position of each known header that exists in the output
  const headerPositions = knownHeaders
    .map(h => ({ name: h, pos: headerLine.indexOf(h) }))
    .filter(h => h.pos !== -1)
    .sort((a, b) => a.pos - b.pos);

  const nameHeader = headerPositions.find(h => h.name === 'NAME');
  const statusHeader = headerPositions.find(h => h.name === 'STATUS');
  const imageHeader = headerPositions.find(h => h.name === 'IMAGE');

  // Ensure the essential headers are present
  if (!nameHeader || !statusHeader || !imageHeader) {
    console.error("Could not parse 'distrobox list' headers. Required headers NAME, STATUS, IMAGE not found.");
    console.error("Received header:", headerLine);
    return [];
  }
  
  // Determine the end position for each column by looking at the start of the next one
  for (let i = 0; i < headerPositions.length; i++) {
    const nextHeader = headerPositions[i + 1];
    headerPositions[i].endPos = nextHeader ? nextHeader.pos : undefined;
  }

  const getColumnValue = (line, headerName) => {
    const header = headerPositions.find(h => h.name === headerName);
    if (!header) return '';
    // Substring from the column's start to its end. If it's the last column, endPos will be undefined, capturing the rest of the line.
    return line.substring(header.pos, header.endPos).trim();
  };

  return lines.slice(1).map(line => {
    // Skip separator lines like '---|---|---'
    if (line.trim().startsWith('-')) return null;

    const name = getColumnValue(line, 'NAME');
    const status = getColumnValue(line, 'STATUS');
    const image = getColumnValue(line, 'IMAGE');

    // Basic validation
    if (!name || !status || !image) return null;
    
    return { name, status, image };
  }).filter(Boolean); // Removes any null entries from failed parsing
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
    // mainWindow.webContents.openDevTools();
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
 * A robust helper for running distrobox commands.
 * This function is carefully designed to handle conflicts between the GUI app's
 * environment and the requirements of command-line tools.
 * It uses `/usr/bin/env -u npm_config_prefix` to surgically remove a problematic
 * environment variable that conflicts with shell startup scripts (like nvm).
 * It then executes the actual command within a login shell (`bash -l`), which
 * is essential for `distrobox` as it ensures the full user environment (correct
 * PATH, DBUS_SESSION_BUS_ADDRESS, etc.) is loaded.
 * This provides the command with the context it needs to run correctly,
 * resolving the "invalid command" errors.
 *
 * @param {string} command The command to execute (e.g., 'distrobox').
 * @param {string[]} [args=[]] An array of arguments for the command.
 * @returns {Promise<string>} A promise that resolves with the command's stdout.
 */
function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const commandString = [command, ...args.map(a => `'${a}'`)].join(' ');

    const child = spawn('/usr/bin/env', [
      '-u', 'npm_config_prefix', // Unset conflicting var before shell starts
      '/bin/bash', '-l', '-c',   // Run command in a full login shell
      commandString
    ]);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      const commandToRunForLogging = `${command} ${args.map(a => `'${a}'`).join(' ')}`;
      if (code !== 0) {
        console.error(`[ERROR] Command "${commandToRunForLogging}" failed with code ${code}. Stderr:\n${stderr}`);
        reject(new Error(stderr.trim() || `Process exited with code ${code}`));
      } else {
        console.log(`[INFO] Command "${commandToRunForLogging}" finished successfully.`);
        resolve(stdout.trim());
      }
    });

    child.on('error', (err) => {
      const commandToRunForLogging = `${command} ${args.map(a => `'${a}'`).join(' ')}`;
      console.error(`[ERROR] Failed to start subprocess for "${commandToRunForLogging}": ${err.message}`);
      reject(err);
    });
  });
}


ipcMain.handle('list-containers', async () => {
  try {
    const output = await runCommand('distrobox', ['list', '--no-color']);
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
    // Use 'distrobox enter' with a simple command to reliably start the container
    // and leave it running. This is more robust than 'distrobox start' which is
    // for services and might not work on all containers.
    return await runCommand('distrobox', ['enter', sanitizedName, '--', '/bin/true']);
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
    // Add '--yes' to bypass the interactive confirmation prompt
    return await runCommand('distrobox', ['stop', '--yes', sanitizedName]);
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