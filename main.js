// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const open = require('open'); // oddiy "open app/file" uchun
const { exec } = require('child_process');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Click-through default: true, lekin o'zaro interaction qilish uchun toggle qiling
  // win.setIgnoreMouseEvents(true, { forward: true });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // For debug
  // win.webContents.openDevTools({ mode: "detach" });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

/* IPC: renderer -> main uchun misollar */

// Ochish: notepad yoki brauzer ochish
ipcMain.handle('open-app', async (ev, appName) => {
  try {
    if (process.platform === 'win32') {
      // oddiy misol: notepad
      if (appName === 'notepad') {
        exec('start "" notepad.exe');
      } else if (appName === 'calculator') {
        exec('start "" calc.exe');
      } else {
        // Umumiy open (file/URL)
        await open(appName);
      }
    } else {
      await open(appName);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// Aktiv oynani aniqlash (node-window-manager)
ipcMain.handle('get-active-window', async () => {
  try {
    const { windowManager } = require('node-window-manager');
    const active = windowManager.getActiveWindow();
    if (!active) return null;
    return { title: active.getTitle(), bounds: active.getBounds() };
  } catch (e) {
    return null;
  }
});

// (Optional) System typing / sending input: implement only after you accept security risk
// ipcMain.handle('send-keys', ... )  // we'll not implement by default
