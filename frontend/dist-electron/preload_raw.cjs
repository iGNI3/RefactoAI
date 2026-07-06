
    const { contextBridge, ipcRenderer } = require('electron');
    contextBridge.exposeInMainWorld('electronAPI', {
      readDir: (path) => ipcRenderer.invoke('fs:readDir', path),
      readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
      startTerminal: () => ipcRenderer.send('terminal:start'),
      writeTerminal: (data) => ipcRenderer.send('terminal:write', data),
      onTerminalData: (callback) => ipcRenderer.on('terminal:data', (event, data) => callback(data)),
      onWorkspaceChanged: (callback) => ipcRenderer.on('workspace:changed', (event, path) => callback(path)),
      openFolder: () => ipcRenderer.invoke('dialog:openFolder')
    });
  