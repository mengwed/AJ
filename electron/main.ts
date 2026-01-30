import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import * as db from './database';

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
function setupIpcHandlers(): void {
  // Accounts
  ipcMain.handle('db:getAllAccounts', () => db.getAllAccounts());
  ipcMain.handle('db:getAccountById', (_, id: number) => db.getAccountById(id));
  ipcMain.handle('db:createAccount', (_, accountNumber: string, name: string, type: string) =>
    db.createAccount(accountNumber, name, type));
  ipcMain.handle('db:updateAccount', (_, id: number, accountNumber: string, name: string, type: string) =>
    db.updateAccount(id, accountNumber, name, type));
  ipcMain.handle('db:deleteAccount', (_, id: number) => db.deleteAccount(id));

  // Transactions
  ipcMain.handle('db:getAllTransactions', () => db.getAllTransactions());
  ipcMain.handle('db:getTransactionById', (_, id: number) => db.getTransactionById(id));
  ipcMain.handle('db:createTransaction', (_, date: string, description: string, lines: Array<{ accountId: number; debit: number; credit: number }>) =>
    db.createTransaction(date, description, lines));
  ipcMain.handle('db:updateTransaction', (_, id: number, date: string, description: string, lines: Array<{ accountId: number; debit: number; credit: number }>) =>
    db.updateTransaction(id, date, description, lines));
  ipcMain.handle('db:deleteTransaction', (_, id: number) => db.deleteTransaction(id));

  // Reports
  ipcMain.handle('db:getBalanceReport', () => db.getBalanceReport());
  ipcMain.handle('db:getIncomeStatement', (_, startDate?: string, endDate?: string) =>
    db.getIncomeStatement(startDate, endDate));
  ipcMain.handle('db:getDashboardStats', () => db.getDashboardStats());
}

app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  db.closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  db.closeDatabase();
});
