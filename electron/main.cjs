const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

async function startBackend() {
  try {
    const backendPath = path.join(__dirname, '../backend/src/index.js');
    await import('file://' + backendPath.replace(/\\/g, '/'));
    console.log('Backend Express server initialized in Electron main process');
  } catch (err) {
    console.error('Error starting backend in main process:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'SP & SOP Maker - BKPSDM',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  if (!isDev) {
    await startBackend();
  }

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
