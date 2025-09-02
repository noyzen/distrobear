const { ipcMain } = require('electron');
const os = require('os');
const sudo = require('sudo-prompt');
const { commandExists, runCommand, runCommandStreamed, detectTerminalEmulator } = require('../utils');

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
                    const child = sudo.exec(installCommand, options);
                    child.stdout.on('data', logToFrontend);
                    child.stderr.on('data', logToFrontend);
                    child.on('close', (code) => {
                        if (code === 0) resolve();
                        else reject(new Error(`Podman installation failed with exit code ${code}.`));
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
            await runCommandStreamed('sh', ['-c', `set -eo pipefail; ${fullDistroboxCommand}`], logToFrontend);
            logToFrontend('\n--- Distrobox installed/updated successfully. ---\n\nSetup finished successfully!\n');
        } catch (err) {
            logToFrontend(`--- Distrobox installation failed: ${err.message} ---\n`);
            throw err;
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
