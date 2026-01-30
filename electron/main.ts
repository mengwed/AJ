import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import * as db from './database.js';

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import * as fiscalYears from './fiscalYears.js';
import * as customers from './customers.js';
import * as suppliers from './suppliers.js';
import * as invoices from './invoices.js';

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
    mainWindow.loadURL('http://localhost:5177');
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

  // Fiscal Years
  ipcMain.handle('db:getAllFiscalYears', () => fiscalYears.getAllFiscalYears());
  ipcMain.handle('db:getFiscalYearById', (_, id: number) => fiscalYears.getFiscalYearById(id));
  ipcMain.handle('db:getActiveFiscalYear', () => fiscalYears.getActiveFiscalYear());
  ipcMain.handle('db:createFiscalYear', (_, year: number) => fiscalYears.createFiscalYear(year));
  ipcMain.handle('db:setActiveFiscalYear', (_, id: number) => fiscalYears.setActiveFiscalYear(id));
  ipcMain.handle('db:deleteFiscalYear', (_, id: number) => fiscalYears.deleteFiscalYear(id));

  // Customers
  ipcMain.handle('db:getAllCustomers', () => customers.getAllCustomers());
  ipcMain.handle('db:getCustomerById', (_, id: number) => customers.getCustomerById(id));
  ipcMain.handle('db:searchCustomers', (_, query: string) => customers.searchCustomers(query));
  ipcMain.handle('db:createCustomer', (_, data: customers.CustomerInput) => customers.createCustomer(data));
  ipcMain.handle('db:updateCustomer', (_, id: number, data: customers.CustomerInput) => customers.updateCustomer(id, data));
  ipcMain.handle('db:deleteCustomer', (_, id: number) => customers.deleteCustomer(id));

  // Suppliers
  ipcMain.handle('db:getAllSuppliers', () => suppliers.getAllSuppliers());
  ipcMain.handle('db:getSupplierById', (_, id: number) => suppliers.getSupplierById(id));
  ipcMain.handle('db:searchSuppliers', (_, query: string) => suppliers.searchSuppliers(query));
  ipcMain.handle('db:createSupplier', (_, data: suppliers.SupplierInput) => suppliers.createSupplier(data));
  ipcMain.handle('db:updateSupplier', (_, id: number, data: suppliers.SupplierInput) => suppliers.updateSupplier(id, data));
  ipcMain.handle('db:deleteSupplier', (_, id: number) => suppliers.deleteSupplier(id));

  // Invoice Folders
  ipcMain.handle('db:getAllInvoiceFolders', () => invoices.getAllInvoiceFolders());
  ipcMain.handle('db:addInvoiceFolder', (_, folderPath: string) => invoices.addInvoiceFolder(folderPath));
  ipcMain.handle('db:removeInvoiceFolder', (_, id: number) => invoices.removeInvoiceFolder(id));
  ipcMain.handle('db:selectFolder', () => invoices.selectFolder());

  // Customer Invoices
  ipcMain.handle('db:getCustomerInvoices', (_, fiscalYearId: number) => invoices.getCustomerInvoices(fiscalYearId));
  ipcMain.handle('db:getCustomerInvoiceById', (_, id: number) => invoices.getCustomerInvoiceById(id));
  ipcMain.handle('db:updateCustomerInvoice', (_, id: number, data: Parameters<typeof invoices.updateCustomerInvoice>[1]) =>
    invoices.updateCustomerInvoice(id, data));
  ipcMain.handle('db:deleteCustomerInvoice', (_, id: number) => invoices.deleteCustomerInvoice(id));

  // Supplier Invoices
  ipcMain.handle('db:getSupplierInvoices', (_, fiscalYearId: number) => invoices.getSupplierInvoices(fiscalYearId));
  ipcMain.handle('db:getSupplierInvoiceById', (_, id: number) => invoices.getSupplierInvoiceById(id));
  ipcMain.handle('db:updateSupplierInvoice', (_, id: number, data: Parameters<typeof invoices.updateSupplierInvoice>[1]) =>
    invoices.updateSupplierInvoice(id, data));
  ipcMain.handle('db:deleteSupplierInvoice', (_, id: number) => invoices.deleteSupplierInvoice(id));

  // Import Operations
  ipcMain.handle('db:scanAndImportFolder', (_, folderId: number, fiscalYearId: number) =>
    invoices.scanAndImportFolder(folderId, fiscalYearId));
  ipcMain.handle('db:selectAndImportFiles', (_, fiscalYearId: number) =>
    invoices.selectAndImportFiles(fiscalYearId));
  ipcMain.handle('db:openInvoiceFile', (_, filePath: string) => invoices.openInvoiceFile(filePath));

  // Year Folder Import
  ipcMain.handle('db:selectYearFolder', () => invoices.selectYearFolder());
  ipcMain.handle('db:scanYearFolder', (_, folderPath: string) => invoices.scanYearFolder(folderPath));
  ipcMain.handle('db:importYearFolder', (_, folderPath: string, year: number) =>
    invoices.importYearFolder(folderPath, year));
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
