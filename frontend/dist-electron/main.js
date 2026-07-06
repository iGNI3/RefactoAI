import { BrowserWindow, Menu, app, dialog, ipcMain } from "electron";
import path, { dirname } from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import fs from "fs";
import os from "os";
//#region electron/main.ts
var __dirname = dirname(fileURLToPath(import.meta.url));
var mainWindow;
var pythonProcess = null;
function createWindow() {
	const preloadPath = path.join(__dirname, "preload_raw.cjs");
	fs.writeFileSync(preloadPath, `
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
  `);
	ipcMain.handle("dialog:openFolder", async () => {
		const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory"] });
		if (!canceled && filePaths.length > 0) {
			mainWindow?.webContents.send("workspace:changed", filePaths[0]);
			return filePaths[0];
		}
		return null;
	});
	mainWindow = new BrowserWindow({
		width: 1400,
		height: 900,
		webPreferences: {
			preload: preloadPath,
			nodeIntegration: false,
			contextIsolation: true
		},
		backgroundColor: "#121210",
		title: "Refactor.ai"
	});
	const isDev = process.env.VITE_DEV_SERVER_URL;
	if (isDev) {
		mainWindow.loadURL(isDev);
		mainWindow.webContents.openDevTools();
	} else mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
}
function startPythonSidecar() {
	const backendDir = path.join(__dirname, "../../backend");
	const pythonExecutable = path.join(backendDir, ".venv", "Scripts", "python.exe");
	console.log(`[Electron] Starting Python sidecar at ${backendDir}`);
	console.log(`[Electron] Using Python: ${pythonExecutable}`);
	try {
		pythonProcess = spawn(pythonExecutable, [
			"-m",
			"uvicorn",
			"app.main:app",
			"--host",
			"127.0.0.1",
			"--port",
			"8000"
		], {
			cwd: backendDir,
			stdio: "inherit"
		});
		pythonProcess.on("error", (err) => {
			console.error("[Electron] Failed to start Python sidecar:", err);
		});
		pythonProcess.on("exit", (code) => {
			console.log(`[Electron] Python sidecar exited with code ${code}`);
		});
	} catch (error) {
		console.error("[Electron] Error spawning Python sidecar:", error);
	}
}
var shellProcess = null;
app.whenReady().then(() => {
	ipcMain.on("terminal:start", (event) => {
		if (shellProcess) return;
		shellProcess = spawn(os.platform() === "win32" ? "powershell.exe" : "bash", [], {
			cwd: path.join(__dirname, "../../"),
			env: process.env
		});
		shellProcess.stdout?.on("data", (data) => {
			event.sender.send("terminal:data", data.toString());
		});
		shellProcess.stderr?.on("data", (data) => {
			event.sender.send("terminal:data", data.toString());
		});
		shellProcess.on("exit", () => {
			shellProcess = null;
		});
	});
	ipcMain.on("terminal:write", (event, data) => {
		if (shellProcess && shellProcess.stdin) shellProcess.stdin.write(data);
	});
	ipcMain.handle("fs:readDir", async (event, dirPath) => {
		try {
			const fullPath = path.resolve(dirPath);
			return (await fs.promises.readdir(fullPath, { withFileTypes: true })).map((f) => ({
				name: f.name,
				isDirectory: f.isDirectory(),
				path: path.join(fullPath, f.name)
			})).sort((a, b) => {
				if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
				return a.isDirectory ? -1 : 1;
			});
		} catch (err) {
			console.error(err);
			return [];
		}
	});
	ipcMain.handle("fs:readFile", async (event, filePath) => {
		try {
			return await fs.promises.readFile(filePath, "utf-8");
		} catch (err) {
			console.error(err);
			return "";
		}
	});
	const menu = Menu.buildFromTemplate([
		{
			label: "File",
			submenu: [
				{
					label: "New Window",
					accelerator: "CmdOrCtrl+Shift+N",
					click: () => createWindow()
				},
				{
					label: "Open Folder...",
					accelerator: "CmdOrCtrl+O",
					click: async () => {
						const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory"] });
						if (!canceled && filePaths.length > 0) mainWindow?.webContents.send("workspace:changed", filePaths[0]);
					}
				},
				{ type: "separator" },
				{
					label: "Save",
					accelerator: "CmdOrCtrl+S",
					click: () => mainWindow?.webContents.send("file:save")
				},
				{ type: "separator" },
				{ role: "quit" }
			]
		},
		{
			label: "Edit",
			submenu: [
				{ role: "undo" },
				{ role: "redo" },
				{ type: "separator" },
				{ role: "cut" },
				{ role: "copy" },
				{ role: "paste" },
				{ role: "selectAll" }
			]
		},
		{
			label: "View",
			submenu: [
				{ role: "reload" },
				{ role: "forceReload" },
				{ role: "toggleDevTools" },
				{ type: "separator" },
				{ role: "resetZoom" },
				{ role: "zoomIn" },
				{ role: "zoomOut" },
				{ type: "separator" },
				{ role: "togglefullscreen" }
			]
		},
		{
			label: "Terminal",
			submenu: [{
				label: "New Terminal",
				accelerator: "CmdOrCtrl+`",
				click: () => mainWindow?.webContents.send("terminal:focus")
			}]
		},
		{
			label: "Help",
			submenu: [{
				label: "About Refactor.ai",
				click: () => {
					dialog.showMessageBox(mainWindow, {
						type: "info",
						title: "Refactor.ai",
						message: "Refactor.ai — Autonomous Code Analysis & Refactoring Engine",
						detail: "Version 0.1.0\nPowered by AI Swarm Architecture"
					});
				}
			}]
		}
	]);
	Menu.setApplicationMenu(menu);
	startPythonSidecar();
	createWindow();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
app.on("will-quit", () => {
	if (pythonProcess) {
		console.log("[Electron] Shutting down Python sidecar...");
		pythonProcess.kill();
	}
});
//#endregion
export {};
