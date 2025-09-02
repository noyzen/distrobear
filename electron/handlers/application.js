const { ipcMain } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const { runCommand } = require('../utils');


/**
 * Scans the host's application directory to find all .desktop files that
 * have been exported by distrobox.
 * @returns {Promise<Map<string, Set<string>>>} A promise that resolves to a map where the key is the
 * container name and the value is a Set of .desktop filenames (e.g., 'firefox.desktop').
 */
async function getHostExportedApps() {
    const exportedApps = new Map();
    const hostAppDir = path.join(os.homedir(), '.local', 'share', 'applications');

    try {
        const files = await fs.readdir(hostAppDir);
        for (const file of files) {
            if (!file.endsWith('.desktop')) continue;

            const filePath = path.join(hostAppDir, file);
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                // Regex to find the line `X-Distrobox-Container=container-name`
                const match = content.match(/^X-Distrobox-Container=(.*)$/m);
                if (match && match[1]) {
                    const containerName = match[1].trim();
                    if (!exportedApps.has(containerName)) {
                        exportedApps.set(containerName, new Set());
                    }
                    exportedApps.get(containerName).add(file);
                }
            } catch (e) {
                // Silently ignore errors reading individual files (e.g., permission issues)
                console.warn(`[WARN] Could not read or parse host app file: ${filePath}`);
            }
        }
    } catch (e) {
        if (e.code !== 'ENOENT') {
            console.error(`[ERROR] Could not read host application directory: ${hostAppDir}`, e);
        }
        // If the directory doesn't exist, it's not an error, just return the empty map.
    }
    
    return exportedApps;
}

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
        
        // 2. Get a definitive list of exported apps by scanning the host filesystem. This is more reliable.
        const hostExportedApps = await getHostExportedApps();
        
        // 3. Map over ONLY running containers to find all available apps and check their status.
        const allAppsPromises = runningContainers.map(async ({ name: containerName }) => {
            try {
                // Find all potential .desktop files within the container.
                const findCommand = `find /usr/share/applications /usr/local/share/applications ~/.local/share/applications -path '*/.local/share/applications' -prune -o -name "*.desktop" -type f -print 2>/dev/null`;
                const findOutput = await runCommand('distrobox', ['enter', containerName, '--', 'sh', '-c', findCommand]).catch(() => '');
                if (!findOutput) return [];
                const desktopFiles = findOutput.split('\n').filter(Boolean);

                const containerExportedAppsSet = hostExportedApps.get(containerName) || new Set();

                // For each file, get its details and check against our map of exported apps.
                const appDetailsPromises = desktopFiles.map(async (desktopFile) => {
                    try {
                        const appName = path.basename(desktopFile); // e.g., 'firefox.desktop'

                        // Determine if exported by checking the reliable map we built from the host.
                        const isExported = containerExportedAppsSet.has(appName);
                        
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