const { ipcMain } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const { runCommand, logInfo, logWarn, logError } = require('../utils');


function registerApplicationHandlers(mainWindow) {
    ipcMain.handle('list-applications', async () => {
        logInfo('Starting application scan...');
        // 1. Get all containers to determine which are running and which are not.
        const psOutput = await runCommand('podman', ['ps', '-a', '--filter', 'label=manager=distrobox', '--format', '{{.Names}}\t{{.Status}}']).catch((err) => {
            logError('Failed to list containers via podman.', err.message);
            return '';
        });
        const allContainers = psOutput.split('\n').filter(Boolean).map(line => {
            const [name, status] = line.split('\t');
            return { name, status };
        });

        const runningContainers = allContainers.filter(c => c.status.toLowerCase().startsWith('up'));
        const unscannedContainers = allContainers.filter(c => !c.status.toLowerCase().startsWith('up')).map(c => c.name);
        logInfo(`Found ${runningContainers.length} running containers and ${unscannedContainers.length} stopped containers.`);

        if (runningContainers.length === 0) {
            logWarn('No running containers found to scan for applications.');
            return { applications: [], unscannedContainers };
        }
        
        // 2. For each running container, get a list of its exported applications.
        const exportedAppsByContainer = new Map();
        await Promise.all(runningContainers.map(async ({ name: containerName }) => {
            try {
                const listAppsOutput = await runCommand(
                    'distrobox', 
                    ['enter', containerName, '--', 'distrobox-export', '--list-apps'],
                    { supressErrorLoggingForExitCodes: [1] } // Code 1 can mean "no apps", not a fatal error
                ).catch(() => ''); 
                
                const exportedAppIdentifiers = new Set(listAppsOutput.split('\n').filter(Boolean));
                logInfo(`[${containerName}] Parsed exported apps:`, JSON.stringify([...exportedAppIdentifiers]));
                exportedAppsByContainer.set(containerName, exportedAppIdentifiers);
            } catch (e) {
                logWarn(`Could not list exported apps for ${containerName}.`, e.message);
                exportedAppsByContainer.set(containerName, new Set());
            }
        }));

        // 3. Map over ONLY running containers to find all available apps and check their status
        const allAppsPromises = runningContainers.map(async ({ name: containerName }) => {
            try {
                const findCommand = `find /usr/share/applications /usr/local/share/applications ~/.local/share/applications -path '*/.local/share/applications' -prune -o -name "*.desktop" -type f -print 2>/dev/null`;
                const findOutput = await runCommand('distrobox', ['enter', containerName, '--', 'sh', '-c', findCommand]).catch(() => '');
                if (!findOutput) return [];
                const desktopFiles = findOutput.split('\n').filter(Boolean);

                const exportedAppSet = exportedAppsByContainer.get(containerName) || new Set();

                // For each file, get its details and check against our set of exported apps.
                const appDetailsPromises = desktopFiles.map(async (desktopFile) => {
                    try {
                        const appName = path.basename(desktopFile);
                        const appIdentifier = appName.replace(/\.desktop$/, '');

                        const isExported = exportedAppSet.has(appIdentifier);
                        if (isExported) {
                            logInfo(`[${containerName}] Match found: "${appName}" (${appIdentifier}) is exported.`);
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
                        logError(`Error processing desktop file ${desktopFile} in ${containerName}: ${e.message}`);
                        return null;
                    }
                });

                return (await Promise.all(appDetailsPromises)).filter(Boolean);
            } catch (e) {
                logError(`Error listing applications for container ${containerName}: ${e.message}`);
                return [];
            }
        });

        const nestedApps = await Promise.all(allAppsPromises);
        const applications = nestedApps.flat().sort((a, b) => a.name.localeCompare(b.name));
        logInfo(`Application scan finished. Found ${applications.length} total applications.`);
        return { applications, unscannedContainers };
    });

    ipcMain.handle('application-export', async (event, { containerName, appName }) => {
        const sanitizedContainer = String(containerName).replace(/[^a-zA-Z0-9-_\.]/g, '');
        const sanitizedApp = String(appName).replace(/[^a-zA-Z0-9-_\.\s]/g, '');
        if (!sanitizedContainer || !sanitizedApp) throw new Error('Invalid arguments');

        const appIdentifier = sanitizedApp.replace(/\.desktop$/, '');
        const args = ['enter', sanitizedContainer, '--', 'distrobox-export', '--app', appIdentifier];
        await runCommand('distrobox', args);
        
        const hostAppPath = path.join(os.homedir(), '.local', 'share', 'applications', sanitizedApp);
        const expectedContent = `X-Distrobox-Container=${sanitizedContainer}`;
        for (let i = 0; i < 20; i++) {
            try {
                const content = await fs.readFile(hostAppPath, 'utf-8');
                if (content.includes(expectedContent)) {
                    logInfo(`Confirmed export for ${sanitizedApp}`);
                    return;
                }
            } catch (e) { /* Ignore */ }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        logWarn(`Polling for ${sanitizedApp} consistency timed out after export.`);
    });

    ipcMain.handle('application-unexport', async (event, { containerName, appName }) => {
        const sanitizedContainer = String(containerName).replace(/[^a-zA-Z0-9-_\.]/g, '');
        const sanitizedApp = String(appName).replace(/[^a-zA-Z0-9-_\.\s]/g, '');
        if (!sanitizedContainer || !sanitizedApp) throw new Error('Invalid arguments');

        const appIdentifier = sanitizedApp.replace(/\.desktop$/, '');
        const args = ['enter', sanitizedContainer, '--', 'distrobox-export', '--app', appIdentifier, '--delete'];
        await runCommand('distrobox', args);

        const hostAppPath = path.join(os.homedir(), '.local', 'share', 'applications', sanitizedApp);
        for (let i = 0; i < 20; i++) {
            try {
                await fs.access(hostAppPath);
            } catch (e) {
                if (e.code === 'ENOENT') {
                    logInfo(`Confirmed unexport for ${sanitizedApp}`);
                    return;
                }
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        logWarn(`Polling for ${sanitizedApp} deletion timed out after unexport.`);
    });
}

module.exports = { registerApplicationHandlers };