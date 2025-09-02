const { ipcMain, dialog } = require('electron');
const { runCommand, runCommandStreamed, getContainerRuntime } = require('../utils');

let activePullProcess = null;

function registerImageHandlers(mainWindow) {
    ipcMain.handle('list-local-images', async () => {
        try {
            const command = await getContainerRuntime();
            const imagesArgs = ['images', '--format', '{{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.ID}}\t{{.Created}}'];
            const output = await runCommand(command, imagesArgs);
            if (!output) return [];

            return output.trim().split('\n')
                .filter(line => line.trim() && !line.startsWith('<none>'))
                .map(line => {
                    const [repoTag, size, id, created] = line.split('\t');
                    const parts = repoTag.split(':');
                    const tag = parts.pop();
                    const repository = parts.join(':');
                    return { repository, tag, size, id, created };
                })
                .sort((a, b) => a.repository.localeCompare(b.repository) || a.tag.localeCompare(b.tag));
        } catch (err) {
            console.error(`Failed to list local images: ${err.message}`);
            throw err;
        }
    });

    ipcMain.handle('image-delete', async (event, imageIdentifier) => {
        const sanitizedIdentifier = String(imageIdentifier).replace(/[`$();|&<>]/g, '');
        if (!sanitizedIdentifier) throw new Error('Invalid image identifier provided.');
        
        try {
            const runtime = await getContainerRuntime();
            let targetImageId;
            try {
                const inspectOutput = await runCommand(runtime, ['inspect', sanitizedIdentifier]);
                targetImageId = JSON.parse(inspectOutput)[0].Id;
            } catch (e) {
                console.warn(`[WARN] Could not inspect image "${sanitizedIdentifier}", proceeding with deletion. Error: ${e.message}`);
                await runCommand(runtime, ['rmi', '--force', sanitizedIdentifier]);
                return;
            }

            const psOutput = await runCommand(runtime, ['ps', '-a', '--format', '{{.Names}}\t{{.ImageID}}']);
            const containersInUse = psOutput.split('\n')
                .filter(line => line.trim())
                .map(line => {
                    const [name, imageId] = line.split('\t');
                    return { name, imageId };
                })
                .filter(container => targetImageId.startsWith(container.imageId));

            if (containersInUse.length > 0) {
                const containerNames = containersInUse.map(c => `"${c.name}"`).join(', ');
                throw new Error(`Cannot delete image. It is being used by container(s): ${containerNames}.\nPlease delete the container(s) first.`);
            }

            await runCommand(runtime, ['rmi', '--force', sanitizedIdentifier]);
        } catch (err) {
            throw new Error(`Failed to delete image "${sanitizedIdentifier}": ${err.message}`);
        }
    });

    ipcMain.handle('image-export', async (event, imageIdentifier) => {
        const sanitizedIdentifier = String(imageIdentifier).replace(/[`$();|&<>]/g, '');
        if (!sanitizedIdentifier) throw new Error('Invalid image identifier provided.');
        
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
            const output = await runCommand(runtime, ['load', '-i', filePath]);
            return { success: true, message: `Import successful:\n${output}` };
        } catch (err) {
            throw new Error(`Failed to import image from "${filePath}": ${err.message}`);
        }
    });

    ipcMain.handle('image-pull', async (event, imageAddress) => {
        const logToFrontend = (data) => mainWindow.webContents.send('image-pull-log', data.toString());
        const sanitizedAddress = String(imageAddress).replace(/[`$();|&<>]/g, '');
        if (!sanitizedAddress) throw new Error('Invalid image address provided.');

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
                throw err;
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
}

module.exports = { registerImageHandlers };
