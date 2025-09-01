const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');
const sudo = require('sudo-prompt');
const fs = require('fs').promises;
const Store = require('electron-store');

const store = new Store();
let mainWindow; // Reference to the main window
let activePullProcess = null; // Reference to the active image pull process for cancellation

// Define a common options object for exec calls that need the modified PATH
const execOptions = {
  env: {
    ...process.env,
    PATH: `${process.env.PATH || ''}:${path.join(os.homedir(), '.local', 'bin')}`
  }
};

function createWindow() {
  const windowBounds = store.get('windowBounds', { width: 1024, height: 768 });

  mainWindow = new BrowserWindow({
    ...windowBounds,
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

  mainWindow.on('close', () => {
    store.set('windowBounds', mainWindow.getBounds());
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
  const deps = ['distrobox', 'podman'];
  const statuses = await Promise.all(deps.map(async (dep) => ({
    name: dep,
    isInstalled: await commandExists(dep),
  })));

  const distroboxOk = statuses.find(d => d.name === 'distrobox')?.isInstalled;
  const containerRuntimeOk = statuses.find(d => d.name === 'podman')?.isInstalled;
  
  return {
    dependencies: statuses,
    needsSetup: !distroboxOk || !containerRuntimeOk,
  };
});

// IPC handler for installing dependencies
ipcMain.handle('install-dependencies', async () => {
  const logToFrontend = (data) => mainWindow.webContents.send('installation-log', data.toString());

  const packageManagers = {
      apt: { cmd: 'apt-get', args: ['install', '-y', 'podman'] },
      dnf: { cmd: 'dnf', args: ['install', '-y', 'podman'] },
      pacman: { cmd: 'pacman', args: ['-S', '--noconfirm', 'podman'] },
      zypper: { cmd: 'zypper', args: ['install', '-y', 'podman'] },
  };

  let installCommand = '';
  let pmDetected = false;

  for (const pm in packageManagers) {
      if (await commandExists(pm)) {
          installCommand = `${packageManagers[pm].cmd} ${packageManagers[pm].args.join(' ')}`;
          pmDetected = true;
          break;
      }
  }
  
  const isPodmanInstalled = await commandExists('podman');
  if (!isPodmanInstalled) {
      if (!pmDetected) {
          const msg = 'Error: Podman is not installed, and could not detect a supported package manager (apt, dnf, pacman, zypper) to install it.\n';
          logToFrontend(msg);
          throw new Error('Unsupported package manager.');
      }

      logToFrontend('--- Podman not found. Sudo privileges are required for installation. ---\n');
      try {
          await new Promise((resolve, reject) => {
              const options = { name: 'DistroBear Podman Setup' };
              const child = sudo.exec(installCommand, options); // No callback to get ChildProcess
              child.stdout.on('data', logToFrontend);
              child.stderr.on('data', logToFrontend);
              child.on('close', (code) => {
                  if (code === 0) {
                      resolve();
                  } else {
                      reject(new Error(`Podman installation failed with exit code ${code}.`));
                  }
              });
          });
          logToFrontend('--- Podman installed successfully. ---\n');
      } catch (err) {
          logToFrontend(`--- Podman installation failed: ${err.message} ---\n`);
          throw err;
      }
  } else {
      logToFrontend('--- Podman is already installed. Skipping. ---\n');
  }

  logToFrontend('--- Checking for curl/wget for Distrobox installation... ---\n');
  const curlExists = await commandExists('curl');
  const wgetExists = await commandExists('wget');

  if (!curlExists && !wgetExists) {
      const msg = 'Error: curl or wget is required to download Distrobox.\nPlease install either curl or wget and try again.\n';
      logToFrontend(msg);
      throw new Error('curl or wget not found.');
  }
  logToFrontend('--- Found required download tool. ---\n');

  const distroboxInstallScript = curlExists 
      ? 'curl -s https://raw.githubusercontent.com/89luca89/distrobox/main/install'
      : 'wget -qO- https://raw.githubusercontent.com/89luca89/distrobox/main/install';
  
  const fullDistroboxCommand = `${distroboxInstallScript} | sh -s -- --prefix ~/.local`;

  logToFrontend('--- Installing/Updating Distrobox... ---\n');
  try {
      // `set -eo pipefail` makes the script more robust
      await runCommandStreamed('sh', ['-c', `set -eo pipefail; ${fullDistroboxCommand}`], logToFrontend);
      logToFrontend('\n--- Distrobox installed/updated successfully. ---\n\nSetup finished successfully!\n');
  } catch (err) {
      logToFrontend(`--- Distrobox installation failed: ${err.message} ---\n`);
      throw err;
  }
});


/**
 * A version of runCommand that streams stdout/stderr.
 * Useful for long-running processes where real-time feedback is needed.
 *
 * @param {string} command The command to execute (e.g., 'sh').
 * @param {string[]} [args=[]] An array of arguments for the command.
 * @param {(data: string) => void} onData A callback function to handle chunks of output data.
 * @param {(process: import('child_process').ChildProcess) => void} [onProcess] An optional callback to get the spawned child process.
 * @returns {Promise<void>} A promise that resolves when the command completes successfully.
 */
function runCommandStreamed(command, args = [], onData, onProcess) {
  return new Promise((resolve, reject) => {
    const commandString = [command, ...args.map(a => `'${a}'`)].join(' ');

    const child = spawn('/usr/bin/env', [
      '-u', 'npm_config_prefix', // Unset conflicting var before shell starts
      '/bin/bash', '-l', '-c',   // Run command in a full login shell
      commandString
    ]);
    
    if (onProcess) {
        onProcess(child);
    }

    child.stdout.on('data', (data) => onData(data.toString()));
    child.stderr.on('data', (data) => onData(data.toString())); // Pipe stderr to the same handler

    child.on('close', (code, signal) => {
      const commandToRunForLogging = `${command} ${args.map(a => `'${a}'`).join(' ')}`;
      if (signal === 'SIGTERM') {
        console.log(`[INFO] Streamed command "${commandToRunForLogging}" was canceled.`);
        reject(new Error('Canceled'));
        return;
      }
      if (code !== 0) {
        console.error(`[ERROR] Streamed command "${commandToRunForLogging}" failed with code ${code}.`);
        reject(new Error(`Process exited with code ${code}`));
      } else {
        console.log(`[INFO] Streamed command "${commandToRunForLogging}" finished successfully.`);
        resolve();
      }
    });

    child.on('error', (err) => {
      const commandToRunForLogging = `${command} ${args.map(a => `'${a}'`).join(' ')}`;
      console.error(`[ERROR] Failed to start subprocess for streamed command "${commandToRunForLogging}": ${err.message}`);
      reject(err);
    });
  });
}


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
 * @param {object} [options={}] Additional options for execution.
 * @param {number[]} [options.supressErrorLoggingForExitCodes=[]] An array of exit codes to suppress error logging for.
 * @returns {Promise<string>} A promise that resolves with the command's stdout.
 */
function runCommand(command, args = [], options = {}) {
  const { supressErrorLoggingForExitCodes = [] } = options;
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
        if (!supressErrorLoggingForExitCodes.includes(code)) {
            console.error(`[ERROR] Command "${commandToRunForLogging}" failed with code ${code}. Stderr:\n${stderr}`);
        }
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

async function getContainerRuntime() {
  const usePodman = await commandExists('podman');
  if (usePodman) return 'podman';
  const useDocker = await commandExists('docker');
  if (useDocker) return 'docker';
  throw new Error('No container runtime (Podman or Docker) found.');
}


async function detectTerminalEmulator() {
    const checkOrder = [
        'ptyxis', 'gnome-terminal', 'konsole', 'xfce4-terminal', 
        'mate-terminal', 'io.elementary.terminal', 'lxterminal', 
        'qterminal', 'terminator', 'tilix', 'kitty', 'alacritty'
    ];

    try {
        // 1. GNOME gsettings (most reliable for GNOME)
        const gsettingsOutput = await exec('gsettings get org.gnome.desktop.default-applications.terminal exec');
        if (gsettingsOutput.stdout) {
            const terminal = gsettingsOutput.stdout.toString().replace(/'/g, '').trim();
            if (await commandExists(terminal)) return terminal;
        }
    } catch (e) { /* ignore and continue */ }

    try {
        // 2. Debian/Ubuntu alternatives
        const alternativesOutput = await exec('update-alternatives --query x-terminal-emulator');
        if (alternativesOutput.stdout) {
            const match = alternativesOutput.stdout.toString().match(/Value: (.+)/);
            if (match && match[1]) {
                const terminal = path.basename(match[1].trim());
                 if (await commandExists(terminal)) return terminal;
            }
        }
    } catch (e) { /* ignore */ }

    // 3. Check for common terminals by existence
    for (const terminal of checkOrder) {
        if (await commandExists(terminal)) {
            return terminal;
        }
    }

    // 4. Infer from Desktop Environment Variable
    const desktop = process.env.XDG_CURRENT_DESKTOP;
    if (desktop) {
        if (desktop.includes('GNOME') && await commandExists('gnome-terminal')) return 'gnome-terminal';
        if (desktop.includes('KDE') && await commandExists('konsole')) return 'konsole';
        if (desktop.includes('XFCE') && await commandExists('xfce4-terminal')) return 'xfce4-terminal';
    }

    return null; // No terminal found
}

ipcMain.handle('get-terminal', detectTerminalEmulator);

ipcMain.handle('container-enter', async (event, name) => {
  const sanitizedName = String(name).replace(/[^a-zA-Z0-9-_\.]/g, '');
  if (!sanitizedName) {
    throw new Error('Invalid container name provided.');
  }

  const terminal = await detectTerminalEmulator();
  if (!terminal) {
    throw new Error('Could not find a supported terminal emulator on your system.');
  }
  
  const commandToRun = `distrobox enter ${sanitizedName}`;

  let term, args;
  switch (terminal) {
    case 'ptyxis':
      term = 'ptyxis';
      args = ['--new-window', '--', 'bash', '-l', '-c', commandToRun];
      break;
    case 'gnome-terminal':
      term = 'gnome-terminal';
      args = ['--window', '--', 'bash', '-l', '-c', commandToRun];
      break;
    case 'konsole':
      term = 'konsole';
      args = ['--separate', '-e', 'bash', '-l', '-c', commandToRun];
      break;
    case 'xfce4-terminal':
    case 'mate-terminal':
      term = terminal;
      args = ['--window', '--command', `bash -l -c "${commandToRun}"`];
      break;
    case 'io.elementary.terminal':
    case 'lxterminal':
    case 'qterminal':
      term = terminal;
      args = ['-e', `bash -l -c "${commandToRun}"`];
      break;
    default:
      // A generic fallback for other terminals like terminator, alacritty etc.
      term = terminal;
      args = ['-e', `bash -l -c "${commandToRun}"`];
  }

  try {
    const child = spawn(term, args, {
      detached: true,
      stdio: 'ignore'
    });
    child.on('error', (err) => {
        console.error(`[ERROR] Failed to spawn terminal '${term}': ${err.message}`);
    });
    child.unref();
  } catch (err) {
    console.error(`[ERROR] Failed to execute spawn for terminal '${terminal}': ${err.message}`);
    throw new Error(`Failed to launch terminal '${terminal}': ${err.message}`);
  }
});


ipcMain.handle('list-containers', async () => {
  try {
    const command = await getContainerRuntime();
    const psArgs = ['ps', '-a', '--filter', 'label=manager=distrobox', '--format', '{{.Names}}\t{{.Image}}\t{{.Status}}'];
    const output = await runCommand(command, psArgs);
    if (!output) return [];

    const lines = output.trim().split('\n').filter(line => line.trim());
    const hostHome = os.homedir();

    return Promise.all(lines.map(async line => {
      const [name, image, status] = line.split('\t');
      const serviceName = `container-${name}.service`;
      const isAutostartEnabled = await isSystemdServiceEnabled(serviceName);

      let isIsolated = true; // Assume isolated unless proven otherwise.
      try {
        const inspectOutput = await runCommand(command, ['inspect', name]);
        const inspectData = JSON.parse(inspectOutput)[0];

        if (inspectData && Array.isArray(inspectData.Mounts)) {
          // A standard (non-isolated) distrobox will have a bind mount
          // where the source is the host's home directory.
          const hasHostHomeMount = inspectData.Mounts.some(
            mount => mount.Source === hostHome && mount.Type === 'bind'
          );
          isIsolated = !hasHostHomeMount;
        }
      } catch (inspectErr) {
        console.warn(`[WARN] Could not inspect container "${name}" to check for isolation. Assuming isolated. Error: ${inspectErr.message}`);
      }

      return { name, image, status, isAutostartEnabled, isIsolated };
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

ipcMain.handle('container-delete', async (event, name) => {
  const sanitizedName = String(name).replace(/[^a-zA-Z0-9-_\.]/g, '');
  if (!sanitizedName) {
    throw new Error('Invalid container name provided.');
  }
  try {
    // Use '--yes' to bypass the interactive confirmation prompt,
    // as confirmation is handled on the frontend.
    return await runCommand('distrobox', ['rm', '--yes', sanitizedName]);
  } catch(err) {
    throw new Error(`Failed to delete container "${sanitizedName}": ${err.message}`);
  }
});

ipcMain.handle('container-commit', async (event, name, imageName, imageTag) => {
  const sanitizedName = String(name).replace(/[^a-zA-Z0-9-_\.]/g, '');
  if (!sanitizedName) {
    throw new Error('Invalid container name provided.');
  }
  
  // Image name can have repo/namespace, so slashes are allowed.
  // Disallow chars that are problematic for shells.
  const sanitizedImageName = String(imageName).replace(/[`$();|&<>]/g, '');
  if (!sanitizedImageName) {
    throw new Error('Invalid image name provided.');
  }

  // Tag is usually simpler.
  const sanitizedImageTag = String(imageTag).replace(/[`$();|&<>]/g, '');
  if (!sanitizedImageTag) {
    throw new Error('Invalid image tag provided.');
  }
  
  const fullImageName = `${sanitizedImageName}:${sanitizedImageTag}`;

  try {
    // Use `podman commit` directly as `distrobox commit` can be unreliable
    // or unavailable in older versions. This is more robust and aligns with
    // the user's feedback. This requires podman to be the container runtime.
    if (!await commandExists('podman')) {
      throw new Error('This feature requires Podman to be installed.');
    }
    return await runCommand('podman', ['commit', sanitizedName, fullImageName]);
  } catch(err) {
    throw new Error(`Failed to save container "${sanitizedName}" as image: ${err.message}`);
  }
});

ipcMain.handle('container-info', async (event, name) => {
  const sanitizedName = String(name).replace(/[^a-zA-Z0-9-_\.]/g, '');
  if (!sanitizedName) {
    throw new Error('Invalid container name provided.');
  }
  try {
    const backendCmd = await getContainerRuntime();
    const backendName = backendCmd;

    // 1. Get detailed info from the container backend. This is the single source of truth.
    const inspectOutput = await runCommand(backendCmd, ['inspect', sanitizedName]);
    if (!inspectOutput) throw new Error(`Container "${sanitizedName}" not found by ${backendName}.`);
    const inspectData = JSON.parse(inspectOutput)[0];

    // 2. Get container size using its unique ID for accuracy
    const sizeOutput = await runCommand(backendCmd, ['ps', '-a', '--filter', `id=${inspectData.Id}`, '--format', '{{.Size}}']);

    // 3. Determine if container is isolated and format home directory string
    const hostHome = os.homedir();
    const isIsolated = inspectData.Mounts && Array.isArray(inspectData.Mounts)
        ? !inspectData.Mounts.some(mount => mount.Source === hostHome && mount.Type === 'bind')
        : true; // Assume isolated if mounts can't be read

    let home_dir_display = 'N/A';
    if (isIsolated) {
        const homeMount = inspectData.Mounts.find(m => m.Destination && m.Destination.startsWith('/home/'));
        if (homeMount && homeMount.Source) {
            home_dir_display = `${homeMount.Source} (Isolated)`;
        } else {
            home_dir_display = 'Isolated (Internal Volume)';
        }
    } else {
        home_dir_display = `${hostHome} (from Host)`;
    }

    // 4. Parse and combine all data from inspect and ps.
    
    // Format mounts from inspect data for better readability
    const formattedVolumes = (inspectData.Mounts || []).map(
        (mount) => `${mount.Source} -> ${mount.Destination} (${mount.Type}, ${mount.Mode || 'ro'})`
    );

    const combinedInfo = {
        id: inspectData.Id.substring(0, 12),
        name: inspectData.Name.replace(/^\//, ''), // remove leading slash
        image: inspectData.Config.Image,
        status: inspectData.State.Status,
        created: inspectData.Created,
        pid: inspectData.State.Pid,
        entrypoint: Array.isArray(inspectData.Config.Entrypoint) ? inspectData.Config.Entrypoint.join(' ') : (inspectData.Config.Entrypoint || 'N/A'),
        backend: backendName,
        size: sizeOutput.trim() || 'N/A',

        home_dir: home_dir_display, // Use the new formatted string
        user_name: inspectData.Config.User || 'N/A',
        hostname: inspectData.Config.Hostname || 'N/A',
        
        init: !!inspectData.HostConfig.Init,
        nvidia: !!(inspectData.HostConfig.Runtime === 'nvidia' || (inspectData.HostConfig.Devices && inspectData.HostConfig.Devices.some(d => d.PathOnHost.includes('nvidia')))),
        root: !inspectData.Config.User || inspectData.Config.User === 'root' || inspectData.Config.User === '0',
        
        volumes: formattedVolumes,
    };
    
    return combinedInfo;

  } catch (err) {
    throw new Error(`Failed to get info for container "${sanitizedName}". Error: ${err.message}`);
  }
});

// Container Creation & Image Management
ipcMain.handle('list-local-images', async () => {
  try {
    const command = await getContainerRuntime();
    // Format: REPOSITORY:TAG<TAB>SIZE<TAB>ID<TAB>CREATED
    const imagesArgs = ['images', '--format', '{{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.ID}}\t{{.Created}}'];
    const output = await runCommand(command, imagesArgs);
    if (!output) return [];

    return output.trim().split('\n')
      .filter(line => line.trim() && !line.startsWith('<none>')) // Filter empty lines and untagged images
      .map(line => {
        const [repoTag, size, id, created] = line.split('\t');
        const parts = repoTag.split(':');
        const tag = parts.pop();
        const repository = parts.join(':');
        return { repository, tag, size, id, created };
      })
      .sort((a, b) => a.repository.localeCompare(b.repository) || a.tag.localeCompare(b.tag)); // Sort for consistency
  } catch (err) {
    console.error(`Failed to list local images: ${err.message}`);
    throw err;
  }
});

ipcMain.handle('image-delete', async (event, imageIdentifier) => {
  // Sanitize to prevent command injection. Allows repo/name:tag format.
  const sanitizedIdentifier = String(imageIdentifier).replace(/[`$();|&<>]/g, '');
  if (!sanitizedIdentifier) {
    throw new Error('Invalid image identifier provided.');
  }
  try {
    const runtime = await getContainerRuntime();
    // Use --force to remove images even if they are used by stopped containers.
    // This is generally safe and expected behavior for a GUI management tool.
    await runCommand(runtime, ['rmi', '--force', sanitizedIdentifier]);
  } catch (err) {
    throw new Error(`Failed to delete image "${sanitizedIdentifier}": ${err.message}`);
  }
});

ipcMain.handle('image-export', async (event, imageIdentifier) => {
  const sanitizedIdentifier = String(imageIdentifier).replace(/[`$();|&<>]/g, '');
  if (!sanitizedIdentifier) {
    throw new Error('Invalid image identifier provided.');
  }
  
  const defaultFileName = `${sanitizedIdentifier.replace(/[:/]/g, '_')}.tar`;

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Image',
    defaultPath: defaultFileName,
    filters: [{ name: 'Tar Archive', extensions: ['tar'] }]
  });

  if (canceled || !filePath) {
    return { success: false, message: 'Export canceled by user.' };
  }

  try {
    const runtime = await getContainerRuntime();
    await runCommand(runtime, ['save', '-o', filePath, sanitizedIdentifier]);
    return { success: true, message: `Image successfully exported to ${filePath}` };
  } catch (err) {
    throw new Error(`Failed to export image "${sanitizedIdentifier}": ${err.message}`);
  }
});

ipcMain.handle('image-import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Image',
    properties: ['openFile'],
    filters: [{ name: 'Tar Archive', extensions: ['tar'] }]
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return { success: false, message: 'Import canceled by user.' };
  }

  const filePath = filePaths[0];

  try {
    const runtime = await getContainerRuntime();
    // Use runCommand to get the output, as it contains useful info
    const output = await runCommand(runtime, ['load', '-i', filePath]);
    return { success: true, message: `Import successful:\n${output}` };
  } catch (err) {
    throw new Error(`Failed to import image from "${filePath}": ${err.message}`);
  }
});

ipcMain.handle('image-pull', async (event, imageAddress) => {
  const logToFrontend = (data) => mainWindow.webContents.send('image-pull-log', data.toString());
  
  // Sanitize the address to prevent command injection. Allows complex repo paths.
  const sanitizedAddress = String(imageAddress).replace(/[`$();|&<>]/g, '');
  if (!sanitizedAddress) {
    throw new Error('Invalid image address provided.');
  }

  const runtime = await getContainerRuntime();
  const args = ['pull', sanitizedAddress];
  
  try {
    logToFrontend(`--- Starting pull for: ${sanitizedAddress} ---\n`);
    await runCommandStreamed(runtime, args, logToFrontend, (process) => {
        activePullProcess = process;
    });
    logToFrontend(`\n--- Successfully pulled ${sanitizedAddress}! ---\n`);
  } catch (err) {
    if (err.message !== 'Canceled') {
        logToFrontend(`\n--- ERROR: Failed to pull image: ${err.message} ---\n`);
        throw err; // Propagate error to the frontend caller
    }
  } finally {
      activePullProcess = null;
  }
});

ipcMain.handle('image-pull-cancel', async () => {
    if (activePullProcess) {
        mainWindow.webContents.send('image-pull-log', '\n--- Canceling download... ---\n');
        activePullProcess.kill('SIGTERM');
        return { success: true };
    }
    return { success: false, message: 'No active pull process found.' };
});


ipcMain.handle('container-create', async (event, options) => {
  const logToFrontend = (data) => mainWindow.webContents.send('creation-log', data.toString());

  // --- 1. Argument Sanitization & Validation ---
  const { name, image, init, nvidia, isolated, customHome, volumes } = options;
  const sanitizedName = String(name).replace(/[^a-zA-Z0-9-_\.]/g, '');
  if (!sanitizedName) throw new Error('Invalid container name provided.');
  if (!image || typeof image !== 'string') throw new Error('Invalid image provided.');

  // --- 2. Build the command arguments ---
  const args = ['create', '--name', sanitizedName, '--image', image];
  
  if (init) {
    args.push('--init');
  }
  if (nvidia) {
    args.push('--nvidia');
  }
  if (isolated) {
    let homePath = customHome.trim();
    if (homePath) {
        // User provided a path, sanitize it simply for shell safety
        homePath = homePath.replace(/[`$();|&<>]/g, '');
    } else {
        // Auto-generate a path in a standard location
        homePath = path.join(os.homedir(), '.local', 'share', 'distrobox', 'homes', sanitizedName);
    }
    args.push('--home', homePath);
  }

  // Add volumes, ensuring they are sanitized
  if (volumes && Array.isArray(volumes)) {
    for (const volume of volumes) {
        if (volume.hostPath && volume.containerPath) {
            const sanitizedHost = String(volume.hostPath).replace(/[`$();|&<>]/g, '');
            const sanitizedContainer = String(volume.containerPath).replace(/[`$();|&<>]/g, '');
            if (sanitizedHost && sanitizedContainer) {
                 args.push('--volume', `${sanitizedHost}:${sanitizedContainer}`);
            }
        }
    }
  }
  
  // --- 3. Execute the command ---
  try {
    logToFrontend(`--- Starting creation of container "${sanitizedName}" ---\n`);
    logToFrontend(`--- Using image: ${image} ---\n`);
    logToFrontend(`--- Command: distrobox ${args.join(' ')} ---\n\n`);

    await runCommandStreamed('distrobox', args, logToFrontend);

    logToFrontend(`\n--- Container "${sanitizedName}" created successfully! ---\n`);
  } catch (err) {
    logToFrontend(`\n--- ERROR: Failed to create container: ${err.message} ---\n`);
    throw err; // Propagate error to the frontend caller
  }
});


// Application Management IPC handlers
ipcMain.handle('list-applications', async () => {
    // 1. Get all containers to determine which are running and which are not.
    const psOutput = await runCommand('podman', ['ps', '-a', '--filter', 'label=manager=distrobox', '--format', '{{.Names}}\t{{.Status}}']).catch(() => '');
    const allContainers = psOutput.split('\n').filter(Boolean).map(line => {
        const [name, status] = line.split('\t');
        return { name, status };
    });

    const runningContainers = allContainers.filter(c => c.status.toLowerCase().startsWith('up'));
    const unscannedContainers = allContainers.filter(c => !c.status.toLowerCase().startsWith('up')).map(c => c.name);

    if (runningContainers.length === 0) {
        return { applications: [], unscannedContainers };
    }
    
    // 2. For each running container, get a list of its exported applications using the
    //    reliable `distrobox-export --list-apps` command. This is the correct way.
    const exportedAppsByContainer = new Map();
    await Promise.all(runningContainers.map(async ({ name: containerName }) => {
        try {
            const listAppsOutput = await runCommand(
                'distrobox', 
                ['enter', containerName, '--', 'distrobox-export', '--list-apps'],
                { supressErrorLoggingForExitCodes: [1] } 
            ).catch(() => ''); // Gracefully handle errors as "no apps exported"
            
            const exportedAppIdentifiers = new Set(listAppsOutput.split('\n').filter(Boolean));
            exportedAppsByContainer.set(containerName, exportedAppIdentifiers);
        } catch (e) {
            console.warn(`[WARN] Could not list exported apps for ${containerName}: ${e.message}`);
            exportedAppsByContainer.set(containerName, new Set()); // Ensure an entry exists
        }
    }));

    // 3. Map over ONLY running containers to find all available apps and check their status
    const allAppsPromises = runningContainers.map(async ({ name: containerName }) => {
        try {
            // Find all potential .desktop files within the container.
            const findCommand = `find /usr/share/applications /usr/local/share/applications ~/.local/share/applications -path '*/.local/share/applications' -prune -o -name "*.desktop" -type f -print 2>/dev/null`;
            const findOutput = await runCommand('distrobox', ['enter', containerName, '--', 'sh', '-c', findCommand]).catch(() => '');
            if (!findOutput) return [];
            const desktopFiles = findOutput.split('\n').filter(Boolean);

            const exportedAppSet = exportedAppsByContainer.get(containerName) || new Set();

            // For each file, get its details and check against our set of exported apps.
            const appDetailsPromises = desktopFiles.map(async (desktopFile) => {
                try {
                    const appName = path.basename(desktopFile); // e.g., 'firefox.desktop'
                    const appIdentifier = appName.replace(/\.desktop$/, '');

                    // Determine if exported by checking the reliable set we built.
                    const isExported = exportedAppSet.has(appIdentifier);
                    
                    // Get the display name from inside the container.
                    const escapedFile = `'${desktopFile.replace(/'/g, "'\\''")}'`;
                    const getNameCommand = `grep -m 1 '^Name' ${escapedFile} | cut -d'=' -f2-`;
                    const displayName = await runCommand('distrobox', ['enter', containerName, '--', 'sh', '-c', getNameCommand]);

                    // Check if the application is marked as hidden.
                    const getNoDisplayCommand = `grep -q '^NoDisplay=true' ${escapedFile}`;
                    const isHidden = await runCommand('distrobox', ['enter', containerName, '--', 'sh', '-c', getNoDisplayCommand], { supressErrorLoggingForExitCodes: [1] })
                        .then(() => true)
                        .catch(() => false);

                    // Filter out hidden apps, apps without a name, or Wayland-specific entries we don't want.
                    if (!displayName || isHidden || displayName.toLowerCase().includes('wayland')) {
                        return null;
                    }

                    return {
                        name: displayName.trim(),
                        appName: appName,
                        containerName: containerName,
                        isExported: isExported,
                    };
                } catch (e) {
                    console.error(`Error processing desktop file ${desktopFile} in ${containerName}: ${e.message}`);
                    return null;
                }
            });

            // Wait for all checks to complete and filter out any nulls from failed/skipped apps.
            return (await Promise.all(appDetailsPromises)).filter(Boolean);
        } catch (e) {
            console.error(`Error listing applications for container ${containerName}: ${e.message}`);
            return []; // Return empty array for this container if a major error occurs.
        }
    });

    const nestedApps = await Promise.all(allAppsPromises);
    const applications = nestedApps.flat().sort((a, b) => a.name.localeCompare(b.name));

    // 4. Return the final payload
    return { applications, unscannedContainers };
});

ipcMain.handle('application-export', async (event, { containerName, appName }) => {
  const sanitizedContainer = String(containerName).replace(/[^a-zA-Z0-9-_\.]/g, '');
  const sanitizedApp = String(appName).replace(/[^a-zA-Z0-9-_\.\s]/g, '');
  if (!sanitizedContainer || !sanitizedApp) throw new Error('Invalid arguments');

  // Distrobox expects the app name WITHOUT the .desktop suffix.
  const appIdentifier = sanitizedApp.replace(/\.desktop$/, '');
  const args = ['enter', sanitizedContainer, '--', 'distrobox-export', '--app', appIdentifier];
  
  await runCommand('distrobox', args);

  // Poll to ensure the filesystem is consistent before the UI refreshes.
  // This prevents a race condition where the UI reloads before the file is fully written.
  const hostAppPath = path.join(os.homedir(), '.local', 'share', 'applications', sanitizedApp);
  const expectedContent = `X-Distrobox-Container=${sanitizedContainer}`;
  
  for (let i = 0; i < 20; i++) { // Poll for up to 1 second
    try {
      const content = await fs.readFile(hostAppPath, 'utf-8');
      if (content.includes(expectedContent)) {
        console.log(`[INFO] Confirmed export for ${sanitizedApp}`);
        return; // Success, file is consistent
      }
    } catch (e) {
      // Ignore errors (e.g., file not found yet)
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.warn(`[WARN] Polling for ${sanitizedApp} consistency timed out after export.`);
});

ipcMain.handle('application-unexport', async (event, { containerName, appName }) => {
  const sanitizedContainer = String(containerName).replace(/[^a-zA-Z0-9-_\.]/g, '');
  const sanitizedApp = String(appName).replace(/[^a-zA-Z0-9-_\.\s]/g, '');
  if (!sanitizedContainer || !sanitizedApp) throw new Error('Invalid arguments');

  // Distrobox expects the app name WITHOUT the .desktop suffix.
  const appIdentifier = sanitizedApp.replace(/\.desktop$/, '');
  const args = ['enter', sanitizedContainer, '--', 'distrobox-export', '--app', appIdentifier, '--delete'];

  await runCommand('distrobox', args);

  // Poll to ensure the file has been deleted before the UI refreshes.
  const hostAppPath = path.join(os.homedir(), '.local', 'share', 'applications', sanitizedApp);
  
  for (let i = 0; i < 20; i++) { // Poll for up to 1 second
    try {
      await fs.access(hostAppPath); // This will throw if file doesn't exist
    } catch (e) {
      if (e.code === 'ENOENT') {
        console.log(`[INFO] Confirmed unexport for ${sanitizedApp}`);
        return; // Success, file is gone
      }
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.warn(`[WARN] Polling for ${sanitizedApp} deletion timed out after unexport.`);
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

ipcMain.handle('get-version-info', async () => {
  const getVersion = async (command, args, regex) => {
    try {
      // Using runCommand to ensure we get the correct PATH from the login shell
      const output = await runCommand(command, args);
      const match = output.match(regex);
      return match ? match[1] : (output.trim() || 'Not Found');
    } catch (e) {
      console.warn(`Could not get version for ${command}: ${e.message}`);
      return 'Not Found';
    }
  };

  const distroboxVersion = await getVersion('distrobox', ['--version'], /distrobox version: (\S+)/);
  const podmanVersion = await getVersion('podman', ['--version'], /version (\S+)/);

  return { distrobox: distroboxVersion, podman: podmanVersion };
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});