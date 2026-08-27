import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initializeStorageDirectories, getStoragePaths } from './storage-paths.js';
import { BackendManager } from './backend-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevelopment = process.env.NODE_ENV === 'development' || !app.isPackaged;
const BACKEND_PORT = parseInt(process.env.CRM_PORT || '4000', 10);
const BACKEND_HOST = '127.0.0.1';

let mainWindow: BrowserWindow | null = null;
let backendManager: BackendManager | null = null;
let storagePaths = getStoragePaths();

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

/**
 * Load or create saved window state
 */
function getWindowState(): { width: number; height: number; x?: number; y?: number; isMaximized?: boolean } {
  const stateFile = path.join(storagePaths.configDir, 'window-state.json');
  try {
    if (fs.existsSync(stateFile)) {
      const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      return data;
    }
  } catch {
    // Ignore error, fallback to defaults
  }
  return { width: 1280, height: 800 };
}

/**
 * Persist window state
 */
function saveWindowState() {
  if (!mainWindow) return;
  try {
    const isMaximized = mainWindow.isMaximized();
    const bounds = mainWindow.getBounds();
    const state = {
      ...bounds,
      isMaximized,
    };
    const stateFile = path.join(storagePaths.configDir, 'window-state.json');
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to save window state:', err);
  }
}

/**
 * Create main desktop application window
 */
function createMainWindow() {
  const windowState = getWindowState();

  mainWindow = new BrowserWindow({
    title: 'SR Enterprises CRM',
    width: windowState.width || 1280,
    height: windowState.height || 800,
    x: windowState.x,
    y: windowState.y,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#0f172a', // Matches Slate-900 theme
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDevelopment,
    },
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // Handle external navigation securely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const localPrefix = `http://${BACKEND_HOST}:${BACKEND_PORT}`;
    if (!url.startsWith(localPrefix)) {
      event.preventDefault();
      if (url.startsWith('https://') || url.startsWith('http://')) {
        shell.openExternal(url);
      }
    }
  });

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('close', saveWindowState);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load backend web application
  mainWindow.loadURL(`http://${BACKEND_HOST}:${BACKEND_PORT}/`);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });
}

/**
 * Application Lifecycle Initialization
 */
async function initializeApp() {
  // 1. Initialize %APPDATA% storage directories
  storagePaths = initializeStorageDirectories();
  console.log(`[Desktop Main] Storage initialized at: ${storagePaths.baseDir}`);

  // 2. Initialize Backend Manager
  backendManager = new BackendManager({
    host: BACKEND_HOST,
    port: BACKEND_PORT,
    storagePaths,
    isDevelopment,
    appRoot: __dirname,
  });

  // 3. Start local backend and wait for health check
  const started = await backendManager.start();

  if (!started) {
    const choice = dialog.showMessageBoxSync({
      type: 'error',
      title: 'Startup Error',
      message: 'SR Enterprises CRM could not start.',
      detail: 'The local CRM service failed to initialize. Please ensure no conflicting software is running and retry.',
      buttons: ['Retry', 'Close Application'],
      defaultId: 0,
      cancelId: 1,
    });

    if (choice === 0) {
      return initializeApp();
    } else {
      app.quit();
      return;
    }
  }

  // 4. Create and show window
  createMainWindow();
}

/**
 * Register Secure IPC Handlers
 */
function registerIpcHandlers() {
  ipcMain.handle('crm:get-app-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('crm:get-app-status', async () => {
    const health = await backendManager?.checkHealth();
    return {
      status: health?.healthy ? 'ONLINE' : 'SERVICE_UNAVAILABLE',
      backendUrl: `http://${BACKEND_HOST}:${BACKEND_PORT}`,
    };
  });

  ipcMain.handle('crm:open-external-url', async (_event, url: string) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  await initializeApp();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

/**
 * Graceful Process Exit
 */
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    if (backendManager) {
      await backendManager.stop();
    }
    app.quit();
  }
});

app.on('before-quit', async (event) => {
  if (backendManager) {
    event.preventDefault();
    await backendManager.stop();
    backendManager = null;
    app.exit(0);
  }
});
