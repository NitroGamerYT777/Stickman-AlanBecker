// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openApp: (name) => ipcRenderer.invoke('open-app', name),
  getActiveWindow: () => ipcRenderer.invoke('get-active-window'),
  saveStickmen: (stickmen) => ipcRenderer.send('save-stickmen', stickmen),
  loadStickmen: () => ipcRenderer.invoke('load-stickmen'),
  typeString: (str) => ipcRenderer.send('type-string', str),
  // future: sendKeys: (keys) => ipcRenderer.invoke('send-keys', keys),
  sendMessage: (channel, data) => ipcRenderer.send(channel, data),
  onMessage: (channel, cb) => ipcRenderer.on(channel, (e, d) => cb(d))
});
