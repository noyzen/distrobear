const { ipcMain } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const { runCommand } = require('../utils');


function registerApplicationHandlers(mainWindow) {
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

                        // Filter out hidden apps, apps without a name, or Wayland-specific entries.
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
                await fs.access(hostAppPath); // This will throw if file doesn't exist
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