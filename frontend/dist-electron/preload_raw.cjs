
    const { contextBridge, ipcRenderer } = require('electron');
    contextBridge.exposeInMainWorld('electronAPI', {
      readDir: (path) => ipcRenderer.invoke('fs:readDir', path),
      readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
      startTerminal: () => ipcRenderer.send('terminal:start'),
      writeTerminal: (data) => ipcRenderer.send('terminal:write', data),
        onTerminalData: (callback) => {
          const handler = (event, data) => callback(data);
          ipcRenderer.on('terminal:data', handler);
          return () => ipcRenderer.removeListener('terminal:data', handler);
        },
        onWorkspaceChanged: (callback) => {
          const handler = (event, path) => callback(path);
          ipcRenderer.on('workspace:changed', handler);
          return () => ipcRenderer.removeListener('workspace:changed', handler);
        },
        openFolder: () => ipcRenderer.invoke('dialog:openFolder')
    });
  