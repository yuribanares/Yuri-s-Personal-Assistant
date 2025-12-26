const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      contextIsolation: true,
    },
  });

  // During development you can set ELECTRON_START_URL to your dev server.
  const startUrl = process.env.ELECTRON_START_URL || path.join(__dirname, 'dist', 'index.html');
  if (startUrl.startsWith('http')) {
    win.loadURL(startUrl);
  } else {
    win.loadFile(startUrl);
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
