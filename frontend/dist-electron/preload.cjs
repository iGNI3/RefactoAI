import { createRequire } from "node:module";
//#endregion
//#region electron/preload.ts
var { contextBridge, ipcRenderer } = (/* @__PURE__ */ createRequire(import.meta.url))("electron");
contextBridge.exposeInMainWorld("electronAPI", {
	readDir: (path) => ipcRenderer.invoke("fs:readDir", path),
	readFile: (path) => ipcRenderer.invoke("fs:readFile", path),
	startTerminal: () => ipcRenderer.send("terminal:start"),
	writeTerminal: (data) => ipcRenderer.send("terminal:write", data),
	onTerminalData: (callback) => ipcRenderer.on("terminal:data", (event, data) => callback(data))
});
//#endregion
export {};
