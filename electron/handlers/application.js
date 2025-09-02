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
        
        const exportedAppsByContainer = new Map();
        await Promise.all(runningContainers.map(async ({ name: containerName }) => {
            try {
                const listAppsOutput = await runCommand(
                    'distrobox', 
                    ['enter', containerName, '--', 'distrobox-export', '--list-apps'],
                    { supressErrorLoggingForExitCodes: [1] } 
                ).catch(() => '');
                
                const exportedAppIdentifiers = new Set(listAppsOutput.split('\n').filter(Boolean));
                exportedAppsByContainer.set(containerName, exportedAppIdentifiers);
            } catch (e) {
                console.warn(`[WARN] Could not list exported apps for ${containerName}: ${e.message}`);
                exportedAppsByContainer.set(containerName, new Set());
            }
        }));

        const allAppsPromises = runningContainers.map(async ({ name: containerName }) => {
            try {
                const findCommand = `find /usr/share/applications /usr/local/share/applications ~/.local/share/applications -path '*/.local/share/applications' -prune -o -name "*.desktop" -type f -print 2>/dev/null`;
                const findOutput = await runCommand('distrobox', ['enter', containerName, '--', 'sh', '-c', findCommand]).catch(() => '');
                if (!findOutput) return [];
                const desktopFiles = findOutput.split('\n').filter(Boolean);

                const exportedAppSet = exportedAppsByContainer.get(containerName) || new Set();

                const appDetailsPromises = desktopFiles.map(async (desktopFile) => {
                    try {
                        const appName = path.basename(desktopFile);
                        const appIdentifier = appName.replace(/\.desktop$/, '');
                        const isExported = exportedAppSet.has(appIdentifier);
                        
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
    });

    ipcMain.handle('application-unexport', async (event, { containerName, appName }) => {
        const sanitizedContainer = String(containerName).replace(/[^a-zA-Z0-9-_\.]/g, '');
        const sanitizedApp = String(appName).replace(/[^a-zA-Z0-9-_\.\s]/g, '');
        if (!sanitizedContainer || !sanitizedApp) throw new Error('Invalid arguments');

        const appIdentifier = sanitizedApp.replace(/\.desktop$/, '');
        const args = ['enter', sanitizedContainer, '--', 'distrobox-export', '--app', appIdentifier, '--delete'];
        await runCommand('distrobox', args);
    });
}

module.exports = { registerApplicationHandlers };
