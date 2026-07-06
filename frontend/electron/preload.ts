import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  readDir: (path: string) => ipcRenderer.invoke('fs:readDir', path),
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
  startTerminal: () => ipcRenderer.send('terminal:start'),
  writeTerminal: (data: string) => ipcRenderer.send('terminal:write', data),
  onTerminalData: (callback: (data: string) => void) => ipcRenderer.on('terminal:data', (event: IpcRendererEvent, data: string) => callback(data)),
});
