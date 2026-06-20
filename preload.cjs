const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('open-file'),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  onFileOpened: (callback) => ipcRenderer.on('file-opened', (event, data) => callback(data)),
  getRecentFiles: () => ipcRenderer.invoke('get-recent-files'),
  openRecentFile: (filePath) => ipcRenderer.invoke('open-recent-file', filePath),
  clearRecentFiles: () => ipcRenderer.invoke('clear-recent-files'),
  onRecentFilesUpdated: (callback) => ipcRenderer.on('recent-files-updated', (event, files) => callback(files))
});
