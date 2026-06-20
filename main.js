import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage, Menu } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;
let fileToOpen = null; // Store file path if opened before window is ready

const MAX_RECENT_FILES = 10;
let recentFiles = [];

function getRecentFilesPath() {
  return join(app.getPath('userData'), 'recent-files.json');
}

function loadRecentFiles() {
  try {
    const data = fs.readFileSync(getRecentFilesPath(), 'utf-8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      recentFiles = parsed.filter(p => typeof p === 'string');
    }
  } catch {
    recentFiles = [];
  }
}

function saveRecentFiles() {
  try {
    fs.writeFileSync(getRecentFilesPath(), JSON.stringify(recentFiles, null, 2));
  } catch (err) {
    console.error('Failed to save recent files:', err);
  }
}

function addRecentFile(filePath) {
  recentFiles = recentFiles.filter(p => p !== filePath);
  recentFiles.unshift(filePath);
  if (recentFiles.length > MAX_RECENT_FILES) {
    recentFiles = recentFiles.slice(0, MAX_RECENT_FILES);
  }
  saveRecentFiles();
  app.addRecentDocument(filePath); // OS-level recent documents
  buildMenu();
  notifyRecentFilesUpdated();
}

function removeRecentFile(filePath) {
  const next = recentFiles.filter(p => p !== filePath);
  if (next.length !== recentFiles.length) {
    recentFiles = next;
    saveRecentFiles();
    buildMenu();
    notifyRecentFilesUpdated();
  }
}

function clearRecentFiles() {
  recentFiles = [];
  saveRecentFiles();
  app.clearRecentDocuments();
  buildMenu();
  notifyRecentFilesUpdated();
}

function notifyRecentFilesUpdated() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('recent-files-updated', recentFiles);
  }
}

function basename(filePath) {
  return filePath.split(/[\\/]/).pop();
}

// Notify the user that a recent file could not be opened
function showStaleFileError(filePath) {
  const options = {
    type: 'warning',
    title: 'File Unavailable',
    message: `"${basename(filePath)}" could not be opened.`,
    detail: `It may have been moved, renamed, or deleted. It has been removed from your recent documents.\n\n${filePath}`,
    buttons: ['OK']
  };

  if (mainWindow && !mainWindow.isDestroyed()) {
    dialog.showMessageBox(mainWindow, options);
  } else {
    dialog.showMessageBox(options);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: join(__dirname, 'assets/MDReader-4.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('src/index.html');

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Clean up reference when window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Set app name
  app.setName('Markdown Reader');

  // Set dock icon for macOS
  if (process.platform === 'darwin') {
    const icon = nativeImage.createFromPath(join(__dirname, 'assets/MDReader-4.png'));
    app.dock.setIcon(icon);
  }

  loadRecentFiles();
  buildMenu();

  createWindow();

  // If a file was opened before the app was ready, open it now
  if (fileToOpen) {
    mainWindow.webContents.once('did-finish-load', () => {
      openFileByPath(fileToOpen);
      fileToOpen = null;
    });
  }

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

// Handle file opening
ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown Files', extensions: ['md', 'markdown'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    addRecentFile(filePath);
    return { content, filePath };
  }

  return null;
});

// Return the list of recent file paths
ipcMain.handle('get-recent-files', () => recentFiles);

// Open a specific recent file by path
ipcMain.handle('open-recent-file', (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    addRecentFile(filePath);
    return { content, filePath };
  } catch (err) {
    console.error('Failed to open recent file:', err);
    removeRecentFile(filePath); // drop stale/missing entries
    showStaleFileError(filePath);
    return null;
  }
});

// Clear all recent files
ipcMain.handle('clear-recent-files', () => {
  clearRecentFiles();
  return recentFiles;
});

// Handle theme preference
ipcMain.handle('get-theme', () => {
  return mainWindow.webContents.executeJavaScript('localStorage.getItem("theme")');
});

ipcMain.handle('set-theme', (event, theme) => {
  return mainWindow.webContents.executeJavaScript(`localStorage.setItem("theme", "${theme}")`);
});

// Handle file opening from Finder (macOS)
app.on('open-file', (event, filePath) => {
  event.preventDefault();

  if (mainWindow && !mainWindow.isDestroyed()) {
    openFileByPath(filePath);
  } else {
    // Store the file path to open later
    fileToOpen = filePath;

    // Only create window if app is already ready
    if (app.isReady() && !mainWindow) {
      createWindow();
      mainWindow.webContents.once('did-finish-load', () => {
        openFileByPath(fileToOpen);
        fileToOpen = null;
      });
    }
    // If app is not ready, the file will be opened in the whenReady handler
  }
});

// Read a file, push it to the renderer, and record it in recents
function openFileByPath(filePath) {
  if (!filePath.endsWith('.md') && !filePath.endsWith('.markdown')) {
    return;
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error('Failed to open file:', err);
    const wasRecent = recentFiles.includes(filePath);
    removeRecentFile(filePath); // drop stale/missing entries
    if (wasRecent) {
      showStaleFileError(filePath);
    }
    return;
  }

  addRecentFile(filePath);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('file-opened', { content, filePath });
  }
}

// Show the open dialog (used by the menu / keyboard shortcut)
async function openFileDialog() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown Files', extensions: ['md', 'markdown'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    openFileByPath(result.filePaths[0]);
  }
}

// Build the application menu, including the "Open Recent" submenu
function buildMenu() {
  const isMac = process.platform === 'darwin';

  const recentSubmenu = recentFiles.length > 0
    ? [
        ...recentFiles.map(filePath => ({
          label: basename(filePath),
          sublabel: filePath,
          click: () => {
            if (!mainWindow || mainWindow.isDestroyed()) {
              createWindow();
              mainWindow.webContents.once('did-finish-load', () => openFileByPath(filePath));
            } else {
              openFileByPath(filePath);
            }
          }
        })),
        { type: 'separator' },
        { label: 'Clear Recent', click: () => clearRecentFiles() }
      ]
    : [{ label: 'No Recent Files', enabled: false }];

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => openFileDialog() },
        { label: 'Open Recent', submenu: recentSubmenu },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'copy' },
        { role: 'selectAll' }
      ]
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
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }])
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
