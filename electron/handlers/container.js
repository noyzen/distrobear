const { ipcMain } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const { runCommand, runCommandStreamed, getContainerRuntime, isSystemdServiceEnabled, detectTerminalEmulator, logInfo, logWarn, logError } = require('../utils');

function registerContainerHandlers(mainWindow) {
    ipcMain.handle('list-containers', async () => {
        try {
            logInfo('Listing containers...');
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

                let isIsolated = true;
                try {
                    const inspectOutput = await runCommand(command, ['inspect', name], { logStdout: false });
                    const inspectData = JSON.parse(inspectOutput)[0];

                    if (inspectData && Array.isArray(inspectData.Mounts)) {
                        const hasHostHomeMount = inspectData.Mounts.some(mount => mount.Source === hostHome && mount.Type === 'bind');
                        isIsolated = !hasHostHomeMount;
                    }
                } catch (inspectErr) {
                    logWarn(`Could not inspect container "${name}" to check for isolation. Assuming isolated.`, inspectErr.message);
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
        if (!sanitizedName) throw new Error('Invalid container name provided.');
        try {
            return await runCommand('distrobox', ['enter', sanitizedName, '--', '/bin/true']);
        } catch (err) {
            throw new Error(`Failed to start container "${sanitizedName}": ${err.message}`);
        }
    });

    ipcMain.handle('container-stop', async (event, name) => {
        const sanitizedName = String(name).replace(/[^a-zA-Z0-9-_\.]/g, '');
        if (!sanitizedName) throw new Error('Invalid container name provided.');
        try {
            return await runCommand('distrobox', ['stop', '--yes', sanitizedName]);
        } catch (err) {
            throw new Error(`Failed to stop container "${sanitizedName}": ${err.message}`);
        }
    });

    ipcMain.handle('container-autostart-enable', async (event, name) => {
        const sanitizedName = String(name).replace(/[^a-zA-Z0-9-_\.]/g, '');
        if (!sanitizedName) throw new Error('Invalid container name provided.');
        
        const systemdUserPath = path.join(os.homedir(), '.config', 'systemd', 'user');
        logInfo(`Ensuring systemd user path exists: ${systemdUserPath}`);
        await fs.mkdir(systemdUserPath, { recursive: true });

        const serviceFileName = `container-${sanitizedName}.service`;
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'distrobear-'));
        logInfo(`Created temporary directory for systemd generation: ${tempDir}`);

        try {
            const spawnOpts = { cwd: tempDir };
            await new Promise((resolve, reject) => {
                const podmanCmd = spawn('/bin/bash', ['-l', '-c', `podman generate systemd --new --files --name '${sanitizedName}'`], spawnOpts);
                let stderr = '';
                podmanCmd.stderr.on('data', (data) => { stderr += data.toString(); });
                podmanCmd.on('close', (code) => {
                    if (code !== 0) reject(new Error(stderr || `Podman command failed with code ${code}`));
                    else resolve();
                });
                podmanCmd.on('error', reject);
            });
            logInfo(`Generated systemd file for "${sanitizedName}" in temporary directory.`);

            const tempServicePath = path.join(tempDir, serviceFileName);
            const finalServicePath = path.join(systemdUserPath, serviceFileName);
            await fs.copyFile(tempServicePath, finalServicePath);
            logInfo(`Copied service file from ${tempServicePath} to ${finalServicePath}`);
            
            await runCommand('systemctl', ['--user', 'daemon-reload']);
            await runCommand('systemctl', ['--user', 'enable', serviceFileName]);
        } finally {
            await fs.rm(tempDir, { recursive: true, force: true });
            logInfo(`Cleaned up temporary directory: ${tempDir}`);
        }
    });

    ipcMain.handle('container-autostart-disable', async (event, name) => {
        const sanitizedName = String(name).replace(/[^a-zA-Z0-9-_\.]/g, '');
        if (!sanitizedName) throw new Error('Invalid container name provided.');
        
        logWarn(`DESTRUCTIVE ACTION: User initiated disabling autostart for container "${sanitizedName}". This may delete the systemd service file.`);
    
        const systemdUserPath = path.join(os.homedir(), '.config', 'systemd', 'user');
        const serviceFileName = `container-${sanitizedName}.service`;
        const serviceFilePath = path.join(systemdUserPath, serviceFileName);
        
        try {
            await runCommand('systemctl', ['--user', 'disable', serviceFileName]);
        } catch (err) {
            logWarn(`Could not disable systemd service (might not exist): ${err.message}`);
        }
        
        try {
            await fs.unlink(serviceFilePath);
            logWarn(`Deleted systemd service file: ${serviceFilePath}`);
        } catch (err) {
            if (err.code !== 'ENOENT') { // Ignore "file not found" errors
                logWarn(`Could not delete systemd service file: ${err.message}`);
            }
        }
        
        await runCommand('systemctl', ['--user', 'daemon-reload']);
    });

    ipcMain.handle('container-delete', async (event, name) => {
        const sanitizedName = String(name).replace(/[^a-zA-Z0-9-_\.]/g, '');
        if (!sanitizedName) throw new Error('Invalid container name provided.');
        try {
            logWarn(`DESTRUCTIVE ACTION: User initiated deletion of container "${sanitizedName}".`);
            return await runCommand('distrobox', ['rm', '--yes', sanitizedName]);
        } catch(err) {
            throw new Error(`Failed to delete container "${sanitizedName}": ${err.message}`);
        }
    });

    ipcMain.handle('container-commit', async (event, name, imageName, imageTag) => {
        const sanitizedName = String(name).replace(/[^a-zA-Z0-9-_\.]/g, '');
        if (!sanitizedName) throw new Error('Invalid container name provided.');
        
        const sanitizedImageName = String(imageName).replace(/[`$();|&<>]/g, '');
        if (!sanitizedImageName) throw new Error('Invalid image name provided.');

        const sanitizedImageTag = String(imageTag).replace(/[`$();|&<>]/g, '');
        if (!sanitizedImageTag) throw new Error('Invalid image tag provided.');
        
        const fullImageName = `${sanitizedImageName}:${sanitizedImageTag}`;

        try {
            return await runCommand('podman', ['commit', sanitizedName, fullImageName]);
        } catch(err) {
            throw new Error(`Failed to save container "${sanitizedName}" as image: ${err.message}`);
        }
    });

    ipcMain.handle('container-info', async (event, name) => {
        const sanitizedName = String(name).replace(/[^a-zA-Z0-9-_\.]/g, '');
        if (!sanitizedName) throw new Error('Invalid container name provided.');
        try {
            const backendCmd = await getContainerRuntime();
            const inspectOutput = await runCommand(backendCmd, ['inspect', sanitizedName], { logStdout: false });
            if (!inspectOutput) throw new Error(`Container "${sanitizedName}" not found by ${backendCmd}.`);
            const inspectData = JSON.parse(inspectOutput)[0];

            const sizeOutput = await runCommand(backendCmd, ['ps', '-a', '--filter', `id=${inspectData.Id}`, '--format', '{{.Size}}']);

            const hostHome = os.homedir();
            const isIsolated = inspectData.Mounts && Array.isArray(inspectData.Mounts)
                ? !inspectData.Mounts.some(mount => mount.Source === hostHome && mount.Type === 'bind')
                : true;

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

            const formattedVolumes = (inspectData.Mounts || []).map(
                (mount) => `${mount.Source} -> ${mount.Destination} (${mount.Type}, ${mount.Mode || 'ro'})`
            );

            return {
                id: inspectData.Id.substring(0, 12),
                name: inspectData.Name.replace(/^\//, ''),
                image: inspectData.Config.Image,
                status: inspectData.State.Status,
                created: inspectData.Created,
                pid: inspectData.State.Pid,
                entrypoint: Array.isArray(inspectData.Config.Entrypoint) ? inspectData.Config.Entrypoint.join(' ') : (inspectData.Config.Entrypoint || 'N/A'),
                backend: backendCmd,
                size: sizeOutput.trim() || 'N/A',
                home_dir: home_dir_display,
                user_name: inspectData.Config.User || 'N/A',
                hostname: inspectData.Config.Hostname || 'N/A',
                init: !!inspectData.HostConfig.Init,
                nvidia: !!(inspectData.HostConfig.Runtime === 'nvidia' || (inspectData.HostConfig.Devices && inspectData.HostConfig.Devices.some(d => d.PathOnHost.includes('nvidia')))),
                root: !inspectData.Config.User || inspectData.Config.User === 'root' || inspectData.Config.User === '0',
                volumes: formattedVolumes,
            };

        } catch (err) {
            throw new Error(`Failed to get info for container "${name}". Error: ${err.message}`);
        }
    });

    ipcMain.handle('container-enter', async (event, name) => {
        const sanitizedName = String(name).replace(/[^a-zA-Z0-9-_\.]/g, '');
        if (!sanitizedName) throw new Error('Invalid container name provided.');

        const terminal = await detectTerminalEmulator();
        if (!terminal) throw new Error('Could not find a supported terminal emulator on your system.');
        
        const commandToRun = `distrobox enter ${sanitizedName}`;

        let term, args;
        switch (terminal) {
            case 'ptyxis':
                args = ['--new-window', '--', 'bash', '-l', '-c', commandToRun];
                break;
            case 'gnome-terminal':
                args = ['--window', '--', 'bash', '-l', '-c', commandToRun];
                break;
            case 'konsole':
                args = ['--separate', '-e', 'bash', '-l', '-c', commandToRun];
                break;
            default:
                args = ['-e', `bash -l -c "${commandToRun}"`];
        }

        const child = spawn(terminal, args, { detached: true, stdio: 'ignore' });
        child.on('error', (err) => console.error(`[ERROR] Failed to spawn terminal '${terminal}': ${err.message}`));
        child.unref();
    });
    
    ipcMain.handle('container-create', async (event, options) => {
        const logToFrontend = (data) => mainWindow.webContents.send('creation-log', data.toString());
        const { name, image, init, nvidia, isolated, customHome, volumes } = options;
        const sanitizedName = String(name).replace(/[^a-zA-Z0-9-_\.]/g, '');
        if (!sanitizedName) throw new Error('Invalid container name provided.');
        if (!image || typeof image !== 'string') throw new Error('Invalid image provided.');

        const args = ['create', '--name', sanitizedName, '--image', image];
        if (init) args.push('--init');
        if (nvidia) args.push('--nvidia');
        if (isolated) {
            let homePath = customHome.trim().replace(/[`$();|&<>]/g, '');
            if (!homePath) {
                homePath = path.join(os.homedir(), '.local', 'share', 'distrobox', 'homes', sanitizedName);
            }
            args.push('--home', homePath);
        }

        if (volumes && Array.isArray(volumes)) {
            for (const { hostPath, containerPath } of volumes) {
                const sanitizedHost = String(hostPath).replace(/[`$();|&<>]/g, '');
                const sanitizedContainer = String(containerPath).replace(/[`$();|&<>]/g, '');
                if (sanitizedHost && sanitizedContainer) {
                    args.push('--volume', `${sanitizedHost}:${sanitizedContainer}`);
                }
            }
        }
      
        try {
            logToFrontend(`--- Starting creation of container "${sanitizedName}" ---\n`);
            await runCommandStreamed('distrobox', args, logToFrontend);
            logToFrontend(`\n--- Container "${sanitizedName}" created successfully! ---\n`);
        } catch (err) {
            logToFrontend(`\n--- ERROR: Failed to create container: ${err.message} ---\n`);
            logError(`Container creation failed for "${sanitizedName}"`, err.message);
            throw err;
        }
    });
}

module.exports = { registerContainerHandlers };