const { exec, spawn } = require('child_process');
const { ipcMain } = require('electron');
const os = require('os');
const path = require('path');

// --- LOGGER ---
let logStore = [];
const MAX_LOGS = 200;
let logWindow = null;

function setMainWindowForLogger(win) {
    logWindow = win;
}

function addLog(level, message, details) {
    if (!logWindow) return;
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        details: details ? String(details) : undefined,
    };
    logStore.push(entry);
    if (logStore.length > MAX_LOGS) {
        logStore.shift();
    }
    logWindow.webContents.send('on-log-entry', entry);
}

const logInfo = (message, details) => addLog('INFO', message, details);
const logWarn = (message, details) => addLog('WARN', message, details);
const logError = (message, details) => addLog('ERROR', message, details);

function registerLogHandlers() {
    ipcMain.handle('get-initial-logs', () => logStore);
    ipcMain.handle('clear-logs', () => {
        logStore = [];
        logInfo('Logs cleared by user.');
        return logStore;
    });
}
// --- END LOGGER ---

// Helper function to check if a command exists
const commandExists = (command) => {
  return new Promise((resolve) => {
    exec(`command -v ${command}`, (error) => resolve(!error));
  });
};

/**
 * Checks if a systemd user service is enabled.
 * @param {string} serviceName The name of the service to check.
 * @returns {Promise<boolean>} True if the service is enabled, false otherwise.
 */
const isSystemdServiceEnabled = (serviceName) => {
  return new Promise((resolve) => {
    const child = spawn('systemctl', ['--user', 'is-enabled', '--quiet', serviceName]);
    child.on('close', (code) => resolve(code === 0));
    child.on('error', (err) => {
      console.error(`[ERROR] Failed to spawn systemctl to check service "${serviceName}": ${err.message}`);
      resolve(false);
    });
  });
};


/**
 * A version of runCommand that streams stdout/stderr.
 * @param {string} command The command to execute.
 * @param {string[]} [args=[]] An array of arguments.
 * @param {(data: string) => void} onData A callback function to handle output.
 * @param {(process: import('child_process').ChildProcess) => void} [onProcess] An optional callback to get the spawned process.
 * @returns {Promise<void>} A promise that resolves on success.
 */
function runCommandStreamed(command, args = [], onData, onProcess) {
  return new Promise((resolve, reject) => {
    const commandString = [command, ...args.map(a => `'${a}'`)].join(' ');

    const child = spawn('/usr/bin/env', ['-u', 'npm_config_prefix', '/bin/bash', '-l', '-c', commandString]);
    
    if (onProcess) {
        onProcess(child);
    }

    let stderr = '';
    child.stdout.on('data', (data) => onData(data.toString()));
    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      onData(chunk);
    });

    child.on('close', (code, signal) => {
      if (signal === 'SIGTERM') {
        reject(new Error('Canceled'));
        return;
      }
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Process exited with code ${code}`));
      } else {
        resolve();
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * A robust helper for running distrobox commands in a login shell.
 * @param {string} command The command to execute.
 * @param {string[]} [args=[]] An array of arguments.
 * @param {object} [options={}] Additional options.
 * @returns {Promise<string>} A promise that resolves with stdout.
 */
function runCommand(command, args = [], options = {}) {
  const { supressErrorLoggingForExitCodes = [] } = options;
  return new Promise((resolve, reject) => {
    const commandString = [command, ...args.map(a => `'${a}'`)].join(' ');
    logInfo(`Executing command:`, `${command} ${args.join(' ')}`);

    const child = spawn('/usr/bin/env', ['-u', 'npm_config_prefix', '/bin/bash', '-l', '-c', commandString]);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      const commandToRunForLogging = `${command} ${args.map(a => `'${a}'`).join(' ')}`;
      if (code !== 0) {
        const fullStderr = stderr.trim() || `Process exited with code ${code}`;
        if (!supressErrorLoggingForExitCodes.includes(code)) {
            logError(`Command failed with code ${code}: "${commandToRunForLogging}"`, `Stderr:\n${fullStderr}`);
        }
        reject(new Error(fullStderr));
      } else {
        logInfo(`Command finished successfully: "${commandToRunForLogging}"`, `Stdout:\n${stdout.trim()}`);
        resolve(stdout.trim());
      }
    });

    child.on('error', (err) => {
      logError(`Failed to start subprocess for "${commandString}"`, err.message);
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
        const gsettingsOutput = await exec('gsettings get org.gnome.desktop.default-applications.terminal exec');
        if (gsettingsOutput.stdout) {
            const terminal = gsettingsOutput.stdout.toString().replace(/'/g, '').trim();
            if (await commandExists(terminal)) return terminal;
        }
    } catch (e) { /* ignore and continue */ }

    try {
        const alternativesOutput = await exec('update-alternatives --query x-terminal-emulator');
        if (alternativesOutput.stdout) {
            const match = alternativesOutput.stdout.toString().match(/Value: (.+)/);
            if (match && match[1]) {
                const terminal = path.basename(match[1].trim());
                 if (await commandExists(terminal)) return terminal;
            }
        }
    } catch (e) { /* ignore */ }

    for (const terminal of checkOrder) {
        if (await commandExists(terminal)) return terminal;
    }

    const desktop = process.env.XDG_CURRENT_DESKTOP;
    if (desktop) {
        if (desktop.includes('GNOME') && await commandExists('gnome-terminal')) return 'gnome-terminal';
        if (desktop.includes('KDE') && await commandExists('konsole')) return 'konsole';
        if (desktop.includes('XFCE') && await commandExists('xfce4-terminal')) return 'xfce4-terminal';
    }

    return null;
}


module.exports = {
    commandExists,
    isSystemdServiceEnabled,
    runCommandStreamed,
    runCommand,
    getContainerRuntime,
    detectTerminalEmulator,
    // Logger exports
    setMainWindowForLogger,
    logInfo,
    logWarn,
    logError,
    registerLogHandlers,
};