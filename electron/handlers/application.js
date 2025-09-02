const { ipcMain } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const { runCommand } = require('../utils');

function registerApplicationHandlers(mainWindow) {
    ipcMain.handle('list-applications', async () => {
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
        
        const allAppsPromises = runningContainers.map(async ({ name: containerName }) => {
            try {
                const findCommand = `find /usr/share/applications /usr/local/share/applications ~/.local/share/applications -path '*/.local/share/applications' -prune -o -name "*.desktop" -type f -print 2>/dev/null`;
                const findOutput = await runCommand('distrobox', ['enter', containerName, '--', 'sh', '-c', findCommand]).catch(() => '');
                if (!findOutput) return [];
                const desktopFiles = findOutput.split('\n').filter(Boolean);

                const appDetailsPromises = desktopFiles.map(async (desktopFile) => {
                    try {
                        const appName = path.basename(desktopFile);
                        
                        // New, more reliable check: read the host file system directly
                        let isExported = false;
                        const hostAppPath = path.join(os.homedir(), '.local', 'share', 'applications', appName);
                        try {
                            const content = await fs.readFile(hostAppPath, 'utf-8');
                            if (content.includes(`X-Distrobox-Container=${containerName}`)) {
                                isExported = true;
                            }
                        } catch (e) {
                            // File not found or unreadable, so it's not exported. Ignore error.
                        }
                        
                        const escapedFile = `'${desktopFile.replace(/'/g, "'\\''")}'`;
                        const getNameCommand = `grep -m 1 '^Name' ${escapedFile} | cut -d'=' -f2-`;
                        const displayName = await runCommand('distrobox', ['enter', containerName, '--', 'sh', '-c', getNameCommand]);

                        const getNoDisplayCommand = `grep -q '^NoDisplay=true' ${escapedFile}`;
                        const isHidden = await runCommand('distrobox', ['enter', containerName, '--', 'sh', '-c', getNoDisplayCommand], { supressErrorLoggingForExitCodes: [1] })
                            .then(() => true)
                            .catch(() => false);

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
                return (await Promise.all(appDetailsPromises)).filter(Boolean);
            } catch (e) {
                console.error(`Error listing applications for container ${containerName}: ${e.message}`);
                return [];
            }
        });

        const nestedApps = await Promise.all(allAppsPromises);
        const applications = nestedApps.flat().sort((a, b) => a.name.localeCompare(b.name));

        return { applications, unscannedContainers };
    });

    ipcMain.handle('application-export', async (event, { containerName, appName }) => {
        const sanitizedContainer = String(containerName).replace(/[^a-zA-Z0-9-_\.]/g, '');
        const sanitizedApp = String(appName).replace(/[^a-zA-Z0-9-_\.\s]/g, '');
        if (!sanitizedContainer || !sanitizedApp) throw new Error('Invalid arguments');

        const appIdentifier = sanitizedApp.replace(/\.desktop$/, '');
        const args = ['enter', sanitizedContainer, '--', 'distrobox-export', '--app', appIdentifier];
        await runCommand('distrobox', args);
        
        // Poll to ensure filesystem is consistent before UI refreshes
        const hostAppPath = path.join(os.homedir(), '.local', 'share', 'applications', sanitizedApp);
        const expectedContent = `X-Distrobox-Container=${sanitizedContainer}`;
        for (let i = 0; i < 20; i++) { // Poll for up to 1 second
            try {
                const content = await fs.readFile(hostAppPath, 'utf-8');
                if (content.includes(expectedContent)) {
                    return; // Success, file is consistent
                }
            } catch (e) { /* Ignore */ }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        console.warn(`[WARN] Polling for ${sanitizedApp} consistency timed out after export.`);
    });

    ipcMain.handle('application-unexport', async (event, { containerName, appName }) => {
        const sanitizedContainer = String(containerName).replace(/[^a-zA-Z0-9-_\.]/g, '');
        const sanitizedApp = String(appName).replace(/[^a-zA-Z0-9-_\.\s]/g, '');
        if (!sanitizedContainer || !sanitizedApp) throw new Error('Invalid arguments');

        const appIdentifier = sanitizedApp.replace(/\.desktop$/, '');
        const args = ['enter', sanitizedContainer, '--', 'distrobox-export', '--app', appIdentifier, '--delete'];
        await runCommand('distrobox', args);

        // Poll to ensure file is deleted before UI refreshes
        const hostAppPath = path.join(os.homedir(), '.local', 'share', 'applications', sanitizedApp);
        for (let i = 0; i < 20; i++) {
            try {
                await fs.access(hostAppPath); // Throws if file exists
            } catch (e) {
                if (e.code === 'ENOENT') {
                    return; // Success, file is gone
                }
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        console.warn(`[WARN] Polling for ${sanitizedApp} deletion timed out after unexport.`);
    });
}

module.exports = { registerApplicationHandlers };