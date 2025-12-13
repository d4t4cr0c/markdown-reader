import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;
let fileToOpen = null; // Store file path if opened before window is ready

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: join(__dirname, 'assets/icon.png'),
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
}

app.whenReady().then(() => {
  // Set app name
  app.setName('Markdown Reader');

  // Set dock icon for macOS
  if (process.platform === 'darwin') {
    const icon = nativeImage.createFromPath(join(__dirname, 'assets/icon.png'));
    app.dock.setIcon(icon);
  }

  createWindow();

  // If a file was opened before the app was ready, open it now
  if (fileToOpen) {
    mainWindow.webContents.once('did-finish-load', () => {
      openFileInRenderer(fileToOpen);
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
    return { content, filePath };
  }

  return null;
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

  if (mainWindow && mainWindow.webContents) {
    openFileInRenderer(filePath);
  } else {
    // Store the file path to open it once the window is ready
    fileToOpen = filePath;
  }
});

// Helper function to send file content to renderer
function openFileInRenderer(filePath) {
  if (filePath.endsWith('.md') || filePath.endsWith('.markdown')) {
    const content = fs.readFileSync(filePath, 'utf-8');
    mainWindow.webContents.send('file-opened', { content, filePath });
  }
}
