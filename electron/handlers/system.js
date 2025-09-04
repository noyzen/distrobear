const { ipcMain } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const sudo = require('sudo-prompt');
const { commandExists, runCommand, runCommandStreamed, detectTerminalEmulator, logInfo, logWarn, logError } = require('../utils');

function registerSystemHandlers(mainWindow) {
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

    ipcMain.handle('install-dependencies', async () => {
        const logToFrontend = (data) => mainWindow.webContents.send('installation-log', data.toString());

        logInfo('SETUP: Starting dependency installation process.');
        logToFrontend('--- Starting dependency installation process... ---\n');

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
                const msg = 'Error: Podman is not installed, and could not detect a supported package manager (apt, dnf, pacman, zypper) to install it.';
                logError('SETUP: ' + msg);
                logToFrontend(msg + '\n');
                throw new Error('Unsupported package manager.');
            }

            logInfo(`SETUP: Podman not found. Using sudo to run: ${installCommand}`);
            logToFrontend('--- Podman not found. Sudo privileges are required for installation. ---\n');
            try {
                await new Promise((resolve, reject) => {
                    const options = { name: 'DistroBear Podman Setup' };
                    const child = sudo.exec(installCommand, options);
                    child.stdout.on('data', logToFrontend);
                    child.stderr.on('data', logToFrontend);
                    child.on('close', (code) => {
                        if (code === 0) resolve();
                        else reject(new Error(`Podman installation failed with exit code ${code}. Check logs for details.`));
                    });
                });
                logInfo('SETUP: Podman installation command completed successfully.');
                logToFrontend('--- Podman installed successfully. ---\n');
            } catch (err) {
                logError('SETUP: Podman installation failed.', err.message);
                logToFrontend(`--- Podman installation failed: ${err.message} ---\n`);
                throw err;
            }
        } else {
            logInfo('SETUP: Podman is already installed. Skipping.');
            logToFrontend('--- Podman is already installed. Skipping. ---\n');
        }

        logInfo('SETUP: Checking for curl/wget for Distrobox installation...');
        logToFrontend('--- Checking for curl/wget for Distrobox installation... ---\n');
        const curlExists = await commandExists('curl');
        const wgetExists = await commandExists('wget');

        if (!curlExists && !wgetExists) {
            const msg = 'Error: curl or wget is required to download Distrobox.\nPlease install either curl or wget and try again.';
            logError('SETUP: ' + msg);
            logToFrontend(msg + '\n');
            throw new Error('curl or wget not found.');
        }
        logInfo(`SETUP: Found required download tool (${curlExists ? 'curl' : 'wget'}).`);
        logToFrontend('--- Found required download tool. ---\n');

        const distroboxInstallScript = curlExists
            ? 'curl -s https://raw.githubusercontent.com/89luca89/distrobox/main/install'
            : 'wget -qO- https://raw.githubusercontent.com/89luca89/distrobox/main/install';

        const fullDistroboxCommand = `${distroboxInstallScript} | sh -s -- --prefix ~/.local`;

        logInfo('SETUP: Installing/Updating Distrobox...');
        logToFrontend('--- Installing/Updating Distrobox... ---\n');
        try {
            await runCommandStreamed('sh', ['-c', `set -eo pipefail; ${fullDistroboxCommand}`], logToFrontend);
            logInfo('SETUP: Distrobox installation script completed.');
        } catch (err) {
            logError('SETUP: Distrobox installation failed.', err.message);
            logToFrontend(`--- Distrobox installation failed: ${err.message} ---\n`);
            throw err;
        }
        
        // Final verification step
        logInfo('SETUP: Verifying installations...');
        logToFrontend('\n--- Verifying installations... ---\n');
        const podmanFinalCheck = await commandExists('podman');
        
        const distroboxBinaryPath = path.join(os.homedir(), '.local', 'bin', 'distrobox');
        let distroboxFinalCheck = false;
        try {
            // Check if the file exists and is executable
            await fs.access(distroboxBinaryPath, fs.constants.X_OK);
            distroboxFinalCheck = true;
            logInfo(`SETUP: Verification successful. Found distrobox executable at: ${distroboxBinaryPath}`);
            logToFrontend(`--- Distrobox executable found at ${distroboxBinaryPath}. ---\n`);
        } catch (e) {
            logWarn(`SETUP: Could not find executable at ${distroboxBinaryPath}. Falling back to PATH check.`);
            logToFrontend(`--- Could not find distrobox at the standard install path. Checking your system PATH... ---\n`);
            distroboxFinalCheck = await commandExists('distrobox');
        }


        if (podmanFinalCheck && distroboxFinalCheck) {
            logInfo('SETUP: Verification successful. Both podman and distrobox are now available.');
            logToFrontend('--- Verification successful. Both podman and distrobox are found. ---\n');
            logToFrontend('--- Setup finished successfully! ---\n');
        } else {
            const errorMsg = `Verification failed after installation. Podman found: ${podmanFinalCheck}, Distrobox found: ${distroboxFinalCheck}. Your shell PATH may not include "~/.local/bin". A manual shell restart or logout/login may be required.`;
            logError('SETUP: ' + errorMsg);
            logToFrontend(`--- ERROR: ${errorMsg} ---\n`);
            throw new Error(errorMsg);
        }
    });
    
    ipcMain.handle('get-terminal', detectTerminalEmulator);

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
}

module.exports = { registerSystemHandlers };