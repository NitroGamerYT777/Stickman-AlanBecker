// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openApp: (name) => ipcRenderer.invoke('open-app', name),
  getActiveWindow: () => ipcRenderer.invoke('get-active-window'),
  // future: sendKeys: (keys) => ipcRenderer.invoke('send-keys', keys),
  sendMessage: (channel, data) => ipcRenderer.send(channel, data),
  onMessage: (channel, cb) => ipcRenderer.on(channel, (e, d) => cb(d))
});
