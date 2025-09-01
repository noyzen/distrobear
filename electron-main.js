const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');
const sudo = require('sudo-prompt');
const fs = require('fs').promises;

let mainWindow; // Reference to the main window

// Define a common options object for exec calls that need the modified PATH
const execOptions = {
  env: {
    ...process.env,
    PATH: `${process.env.PATH || ''}:${path.join(os.homedir(), '.local', 'bin')}`
  }
};

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

/**
 * Checks if a systemd user service is enabled.
 * This is more robust than using `runCommand` because it correctly handles
 * the non-zero exit code that `systemctl is-enabled` returns for a disabled service.
 * @param {string} serviceName The name of the service to check (e.g., 'container-my-app.service').
 * @returns {Promise<boolean>} A promise that resolves to true if the service is enabled, false otherwise.
 */
const isSystemdServiceEnabled = (serviceName) => {
  return new Promise((resolve) => {
    // We don't need a login shell here, systemctl should be in the standard PATH.
    const child = spawn('systemctl', ['--user', 'is-enabled', '--quiet', serviceName]);
    child.on('close', (code) => {
      // According to systemctl man pages:
      // code 0 = enabled
      // code 1 = disabled, not found, or other non-error failure
      // We only care about code 0.
      resolve(code === 0);
    });
    child.on('error', (err) => {
      // This would happen if 'systemctl' command itself is not found.
      console.error(`[ERROR] Failed to spawn systemctl to check service "${serviceName}": ${err.message}`);
      resolve(false);
    });
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
    const usePodman = await commandExists('podman');
    const useDocker = await commandExists('docker');

    let command, args;

    if (usePodman) {
      command = 'podman';
    } else if (useDocker) {
      command = 'docker';
    } else {
      throw new Error('No container runtime (Podman or Docker) found.');
    }

    // Use a structured format to avoid parsing issues. This is far more reliable.
    // The tab separator is unlikely to appear in names, images, or statuses.
    args = ['ps', '-a', '--filter', 'label=manager=distrobox', '--format', '{{.Names}}\t{{.Image}}\t{{.Status}}'];

    const output = await runCommand(command, args);
    if (!output) return [];

    const lines = output.trim().split('\n').filter(line => line.trim());
    
    return Promise.all(lines.map(async line => {
      const [name, image, status] = line.split('\t');
      const serviceName = `container-${name}.service`;
      // Use the robust helper to check autostart status without logging errors for disabled services.
      const isAutostartEnabled = await isSystemdServiceEnabled(serviceName);
      return { name, image, status, isAutostartEnabled };
    }));

  } catch (err) {
    console.error(`Failed to list containers: ${err.message}`);
    if (err.message && err.message.includes("command not found")) {
      throw new Error('Container runtime (podman/docker) not found. Is it installed and in your PATH?');
    }
    if (err.message && err.message.includes("Cannot connect to the Docker daemon")) {
        throw new Error('Could not connect to the Docker daemon. Please ensure the Docker service is running.');
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

ipcMain.handle('container-autostart-enable', async (event, name) => {
  const sanitizedName = String(name).replace(/[^a-zA-Z0-9-_\.]/g, '');
  if (!sanitizedName) {
    throw new Error('Invalid container name provided.');
  }
  if (!await commandExists('podman')) {
    throw new Error('Autostart requires Podman to generate systemd service files.');
  }
  
  const systemdUserPath = path.join(os.homedir(), '.config', 'systemd', 'user');
  await fs.mkdir(systemdUserPath, { recursive: true });

  const serviceFileName = `container-${sanitizedName}.service`;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'distrobear-'));

  try {
    // Podman generates the file in the current working directory, so we need to
    // execute it from inside our temporary directory.
    const spawnOpts = { cwd: tempDir };
    // We can't use runCommand here because it doesn't support changing cwd.
    // Instead, we build a similar promise-based wrapper for spawn.
    await new Promise((resolve, reject) => {
        const podmanCmd = spawn(
          '/bin/bash', 
          ['-l', '-c', `podman generate systemd --new --files --name '${sanitizedName}'`], 
          spawnOpts
        );
        let stderr = '';
        podmanCmd.stderr.on('data', (data) => { stderr += data.toString(); });
        podmanCmd.on('close', (code) => {
            if (code !== 0) reject(new Error(stderr || `Podman command failed with code ${code}`));
            else resolve();
        });
        podmanCmd.on('error', reject);
    });

    const tempServicePath = path.join(tempDir, serviceFileName);
    const finalServicePath = path.join(systemdUserPath, serviceFileName);

    // Use fs.copyFile instead of fs.rename to avoid "cross-device link" errors
    // when /tmp and /home are on different filesystems.
    await fs.copyFile(tempServicePath, finalServicePath);
    await runCommand('systemctl', ['--user', 'daemon-reload']);
    await runCommand('systemctl', ['--user', 'enable', serviceFileName]);
  } finally {
    // Clean up the temporary directory regardless of success or failure.
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

ipcMain.handle('container-autostart-disable', async (event, name) => {
  const sanitizedName = String(name).replace(/[^a-zA-Z0-9-_\.]/g, '');
  if (!sanitizedName) {
    throw new Error('Invalid container name provided.');
  }
  
  const systemdUserPath = path.join(os.homedir(), '.config', 'systemd', 'user');
  const serviceFileName = `container-${sanitizedName}.service`;
  const serviceFilePath = path.join(systemdUserPath, serviceFileName);
  
  try {
    await runCommand('systemctl', ['--user', 'disable', serviceFileName]);
  } catch (err) {
    console.warn(`Could not disable systemd service (might not exist): ${err.message}`);
  }
  
  try {
    await fs.unlink(serviceFilePath);
  } catch (err) {
    if (err.code !== 'ENOENT') { // Ignore "file not found" errors
      console.warn(`Could not delete systemd service file: ${err.message}`);
    }
  }
  
  await runCommand('systemctl', ['--user', 'daemon-reload']);
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