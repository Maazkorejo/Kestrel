const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    isElectron: true,
    onWorkspaceOpened: (callback) => ipcRenderer.on('workspace:opened', (_event, path) => callback(path)),
    onFileOpened: (callback) => ipcRenderer.on('file:opened', (_event, path) => callback(path))
});
