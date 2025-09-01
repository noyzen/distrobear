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
 * Parses the standard output of 'distrobox list'.
 * It uses header positions to determine column boundaries, making it robust
 * against spaces within fields like 'STATUS'. It now gracefully handles the
 * optional presence of the 'CREATED' column.
 * @param {string} output The raw string output from the command.
 * @returns {Array<{name: string, status: string, image: string}>}
 */
function parseDistroboxList(output) {
  const lines = output.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0];
  const namePos = header.indexOf('NAME');
  const statusPos = header.indexOf('STATUS');
  const createdPos = header.indexOf('CREATED'); // This might be -1
  const imagePos = header.indexOf('IMAGE');

  // Check for the essential headers
  if (namePos === -1 || statusPos === -1 || imagePos === -1) {
    console.error("Could not parse 'distrobox list' headers. Required headers NAME, STATUS, IMAGE not found.");
    console.error("Received header:", header);
    return [];
  }
  
  // Determine the end of the STATUS column. It's either the start of CREATED or the start of IMAGE.
  const statusEndPos = (createdPos !== -1 && createdPos > statusPos) ? createdPos : imagePos;

  return lines.slice(1).map(line => {
    // Skip separator lines like '---|---|---' which some versions might output
    if (line.trim().startsWith('-')) return null;

    const name = line.substring(namePos, statusPos).trim();
    const status = line.substring(statusPos, statusEndPos).trim();
    const image = line.substring(imagePos).trim();

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
 * A robust helper for running shell commands.
 * It executes the given command inside a login shell to ensure the user's full
 * environment (PATH, XDG_RUNTIME_DIR, etc.) is loaded, which is critical for
 * tools like distrobox and podman.
 * It also prepares a clean environment before spawning the shell to avoid
 * conflicts with user startup scripts (e.g., nvm).
 * @param {string} command The command to execute (e.g., 'distrobox').
 * @param {string[]} [args=[]] An array of arguments for the command.
 * @returns {Promise<string>} A promise that resolves with the command's stdout.
 */
function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    // Escape arguments to prevent shell injection and join into a single string.
    const commandString = [command, ...args.map(a => `'${a}'`)].join(' ');
    
    // Create a sanitized environment for the login shell.
    // 1. Start with the current process's environment.
    // 2. Add the user's local bin directory to the PATH for distrobox.
    // 3. Critically, delete the conflicting variable *before* spawning the shell.
    const spawnEnv = {
      ...process.env,
      PATH: `${process.env.PATH || ''}:${path.join(os.homedir(), '.local', 'bin')}`
    };
    delete spawnEnv.npm_config_prefix;
    
    console.log(`[INFO] Spawning via login shell: ${commandString}`);

    // Execute the command within a login shell (`bash -l -c ...`).
    // The shell will inherit our sanitized `spawnEnv`. When it sources the
    // user's profile scripts, the conflicting variable will not be present,
    // preventing nvm (or other tools) from failing during shell initialization.
    const child = spawn('/bin/bash', ['-l', '-c', commandString], { env: spawnEnv });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const commandToRunForLogging = `${command} ${args.map(a => `'${a}'`).join(' ')}`;
      console.log(`[INFO] Command "${commandToRunForLogging}" finished with code ${code}`);
      if (code !== 0) {
        console.error(`[ERROR] Command "${commandToRunForLogging}" failed. Stderr:\n${stderr}`);
        reject(new Error(stderr.trim() || `Process exited with code ${code}`));
      } else {
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
    // Use 'start' for non-interactive startup
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