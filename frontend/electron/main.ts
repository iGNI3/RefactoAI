import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import path, { dirname } from 'path';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// When compiled with Vite, __dirname is the output directory (e.g. dist-electron)
let mainWindow: BrowserWindow | null;
let pythonProcess: ChildProcess | null = null;

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload_raw.cjs');
  const preloadCode = `
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
  `;
  fs.writeFileSync(preloadPath, preloadCode);



  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#121210',
    title: 'Refactor.ai',
  });

  const isDev = process.env.VITE_DEV_SERVER_URL;
  if (isDev) {
    mainWindow.loadURL(isDev);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function startPythonSidecar() {
  // In dev: dist-electron is inside frontend. Backend is at frontend/../backend
  // In prod: process.resourcesPath or similar would be needed. This handles dev MVP.
  const backendDir = path.join(__dirname, '../../backend');
  const pythonExecutable = path.join(backendDir, '.venv', 'Scripts', 'python.exe');

  console.log(`[Electron] Starting Python sidecar at ${backendDir}`);
  console.log(`[Electron] Using Python: ${pythonExecutable}`);

  try {
    pythonProcess = spawn(pythonExecutable, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'], {
      cwd: backendDir,
      stdio: 'inherit',
    });

    pythonProcess.on('error', (err) => {
      console.error('[Electron] Failed to start Python sidecar:', err);
    });

    pythonProcess.on('exit', (code) => {
      console.log(`[Electron] Python sidecar exited with code ${code}`);
    });
  } catch (error) {
    console.error('[Electron] Error spawning Python sidecar:', error);
  }
}

let shellProcess: ChildProcess | null = null;

app.whenReady().then(() => {
  ipcMain.on('terminal:start', (event) => {
    if (shellProcess) return;
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    shellProcess = spawn(shell, [], {
      cwd: path.join(__dirname, '../../'),
      env: process.env,
    });

    shellProcess.stdout?.on('data', (data) => {
      event.sender.send('terminal:data', data.toString());
    });

    shellProcess.stderr?.on('data', (data) => {
      event.sender.send('terminal:data', data.toString());
    });

    shellProcess.on('exit', () => {
      shellProcess = null;
    });
  });

  ipcMain.on('terminal:write', (event, data) => {
    if (shellProcess && shellProcess.stdin) {
      shellProcess.stdin.write(data);
    }
  });
  ipcMain.handle('fs:readDir', async (event, dirPath) => {
    try {
      const fullPath = path.resolve(dirPath);
      const files = await fs.promises.readdir(fullPath, { withFileTypes: true });
      return files.map(f => ({
        name: f.name,
        isDirectory: f.isDirectory(),
        path: path.join(fullPath, f.name)
      })).sort((a, b) => {
        if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
        return a.isDirectory ? -1 : 1;
      });
    } catch (err: any) {
      console.error(err);
      return [];
    }
  });

  ipcMain.handle('fs:readFile', async (event, filePath) => {
    try {
      return await fs.promises.readFile(filePath, 'utf-8');
    } catch (err: any) {
      console.error(err);
      return '';
    }
  });

  ipcMain.handle('dialog:openFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    });
    if (!canceled && filePaths.length > 0) {
      mainWindow?.webContents.send('workspace:changed', filePaths[0]);
      return filePaths[0];
    }
    return null;
  });

  // Build Native Application Menu
  const menuTemplate: any[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => createWindow(),
        },
        {
          label: 'Open Folder...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow!, {
              properties: ['openDirectory'],
            });
            if (!canceled && filePaths.length > 0) {
              mainWindow?.webContents.send('workspace:changed', filePaths[0]);
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('file:save'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Terminal',
      submenu: [
        {
          label: 'New Terminal',
          accelerator: 'CmdOrCtrl+`',
          click: () => mainWindow?.webContents.send('terminal:focus'),
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Refactor.ai',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'Refactor.ai',
              message: 'Refactor.ai — Autonomous Code Analysis & Refactoring Engine',
              detail: 'Version 0.1.0\nPowered by AI Swarm Architecture',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  startPythonSidecar();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (pythonProcess) {
    console.log('[Electron] Shutting down Python sidecar...');
    pythonProcess.kill();
  }
});
