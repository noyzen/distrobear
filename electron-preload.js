const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getOSInfo: () => ipcRenderer.invoke('get-os-info'),
  listContainers: () => ipcRenderer.invoke('list-containers'),
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  onWindowStateChange: (callback) => ipcRenderer.on('window-state-change', (_event, value) => callback(value)),
  // Setup Wizard
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  installDependencies: () => ipcRenderer.invoke('install-dependencies'),
  onInstallationLog: (callback) => ipcRenderer.on('installation-log', (_event, log) => callback(log)),
  // Container Actions
  containerStart: (name) => ipcRenderer.invoke('container-start', name),
  containerStop: (name) => ipcRenderer.invoke('container-stop', name),
  containerAutostartEnable: (name) => ipcRenderer.invoke('container-autostart-enable', name),
  containerAutostartDisable: (name) => ipcRenderer.invoke('container-autostart-disable', name),
  containerDelete: (name) => ipcRenderer.invoke('container-delete', name),
  containerCommit: (name, imageName, imageTag) => ipcRenderer.invoke('container-commit', name, imageName, imageTag),
  containerInfo: (name) => ipcRenderer.invoke('container-info', name),
  containerEnter: (name) => ipcRenderer.invoke('container-enter', name),
  // System Info
  getTerminal: () => ipcRenderer.invoke('get-terminal'),
  // Application Management
  listApplications: () => ipcRenderer.invoke('list-applications'),
  applicationExport: (args) => ipcRenderer.invoke('application-export', args),
  applicationUnexport: (args) => ipcRenderer.invoke('application-unexport', args),
  // Image Management
  listLocalImages: () => ipcRenderer.invoke('list-local-images'),
  imageDelete: (imageIdentifier) => ipcRenderer.invoke('image-delete', imageIdentifier),
  imageExport: (imageIdentifier) => ipcRenderer.invoke('image-export', imageIdentifier),
  imageImport: () => ipcRenderer.invoke('image-import'),
  imagePull: (imageAddress) => ipcRenderer.invoke('image-pull', imageAddress),
  onImagePullLog: (callback) => ipcRenderer.on('image-pull-log', (_event, log) => callback(log)),
  containerCreate: (options) => ipcRenderer.invoke('container-create', options),
  onCreationLog: (callback) => ipcRenderer.on('creation-log', (_event, log) => callback(log)),
});