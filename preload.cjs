const { contextBridge, ipcRenderer, webUtils } = require('electron');
contextBridge.exposeInMainWorld('reader', {
  draft: source => ipcRenderer.send('draft', source),
  save: () => ipcRenderer.invoke('save'),
  onSaved: callback => ipcRenderer.on('saved', (_event, source) => callback(source)),
  onToggleEdit: callback => ipcRenderer.on('toggle-edit', () => callback()),
  open: () => ipcRenderer.invoke('open'),
  drop: file => ipcRenderer.invoke('drop', webUtils.getPathForFile(file)),
  link: href => ipcRenderer.invoke('link', href),
  find: text => ipcRenderer.send('find-text', text),
  onDocument: callback => ipcRenderer.on('document', (_event, data) => callback(data)),
  onError: callback => ipcRenderer.on('reader-error', (_event, message) => callback(message)),
  onFind: callback => ipcRenderer.on('find', () => callback())
});
