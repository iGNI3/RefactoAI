import { contextBridge, ipcRenderer } from "electron";
//#region electron/preload.ts
contextBridge.exposeInMainWorld("electronAPI", {
	readDir: (path) => ipcRenderer.invoke("fs:readDir", path),
	readFile: (path) => ipcRenderer.invoke("fs:readFile", path),
	startTerminal: () => ipcRenderer.send("terminal:start"),
	writeTerminal: (data) => ipcRenderer.send("terminal:write", data),
	onTerminalData: (callback) => ipcRenderer.on("terminal:data", (event, data) => callback(data))
});
//#endregion
export {};
