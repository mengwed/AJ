import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import * as db from './database.js';
import * as fiscalYears from './fiscalYears.js';
import * as customers from './customers.js';
import * as suppliers from './suppliers.js';
import * as invoices from './invoices.js';

// Simple file logger for debugging production issues
const logFile = path.join(os.homedir(), 'aj-bokforing-debug.log');
function log(msg: string) {
  const timestamp = new Date().toISOString();
  try {
    fs.appendFileSync(logFile, `${timestamp}: ${msg}\n`);
  } catch (e) {
    // Ignore write errors
  }
  console.log(msg);
}

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log at module load time
log('Module loaded, __dirname: ' + __dirname);
log('isDev: ' + !app.isPackaged + ', isInAppBundle: ' + __dirname.includes('.app/Contents/Resources'));
log('All imports completed');

let mainWindow: BrowserWindow | null = null;

// Detektera om vi kör i dev-läge
// Kolla om vi är i en .app bundle ELLER om dist/index.html finns lokalt
const isInAppBundle = __dirname.includes('.app/Contents/Resources');
const isDev = !app.isPackaged && !isInAppBundle;

function createWindow(): void {
  // I packad app, preload ligger i samma mapp som main.js
  const preloadPath = path.join(__dirname, 'preload.js');
  log('Preload path: ' + preloadPath);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: true, // Visa direkt
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
  });

  // Öppna devTools endast i dev-läge
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5177');
  } else {
    // I packad app, använd app.getAppPath() för korrekt sökväg
    const appPath = app.getAppPath();
    const indexPath = path.join(appPath, 'dist', 'index.html');
    log('App path: ' + appPath);
    log('Loading index from: ' + indexPath);
    mainWindow.loadFile(indexPath).catch(err => {
      log('Failed to load index.html: ' + err.message);
    });
  }

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    log('Failed to load: ' + errorCode + ' ' + errorDescription);
  });

  mainWindow.once('ready-to-show', () => {
    log('Window ready to show');
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
function setupIpcHandlers(): void {
  // Categories
  ipcMain.handle('db:getAllCategories', () => db.getAllCategories());
  ipcMain.handle('db:getCategoryById', (_, id: number) => db.getCategoryById(id));
  ipcMain.handle('db:createCategory', (_, data: { name: string; description?: string }) =>
    db.createCategory(data));
  ipcMain.handle('db:updateCategory', (_, id: number, data: { name: string; description?: string }) =>
    db.updateCategory(id, data));
  ipcMain.handle('db:deleteCategory', (_, id: number) => db.deleteCategory(id));

  // Dashboard
  ipcMain.handle('db:getDashboardStats', () => db.getDashboardStats());
  ipcMain.handle('db:getDashboardStatsForYear', (_, fiscalYearId: number) =>
    db.getDashboardStatsForYear(fiscalYearId));

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
  ipcMain.handle('db:deleteCustomer', (_, id: number, force?: boolean) => customers.deleteCustomer(id, force));
  ipcMain.handle('db:checkCustomerDeletion', (_, id: number) => customers.checkCustomerDeletion(id));

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
  ipcMain.handle('db:downloadIcloudFiles', (_, folderPath: string) =>
    invoices.downloadIcloudFiles(folderPath));

  // Move invoice between customer/supplier
  ipcMain.handle('db:moveCustomerInvoiceToSupplier', (_, id: number) =>
    invoices.moveCustomerInvoiceToSupplier(id));
  ipcMain.handle('db:moveSupplierInvoiceToCustomer', (_, id: number) =>
    invoices.moveSupplierInvoiceToCustomer(id));

  // PDF reading and amount extraction
  ipcMain.handle('db:readPdfAsBase64', (_, filePath: string) =>
    invoices.readPdfAsBase64(filePath));
  ipcMain.handle('db:batchReExtractAmounts', (_, fiscalYearId: number) =>
    invoices.batchReExtractAmounts(fiscalYearId));

  // Invoices by entity
  ipcMain.handle('db:getInvoicesByCustomerId', (_, customerId: number) =>
    invoices.getInvoicesByCustomerId(customerId));
  ipcMain.handle('db:getInvoicesBySupplierId', (_, supplierId: number) =>
    invoices.getInvoicesBySupplierId(supplierId));

  // Excel export
  ipcMain.handle('db:exportInvoicesToExcel', (_, fiscalYearId: number) =>
    invoices.exportInvoicesToExcel(fiscalYearId));
}

process.on('uncaughtException', (error) => {
  log('Uncaught exception: ' + error.message + '\n' + error.stack);
});

process.on('unhandledRejection', (reason) => {
  log('Unhandled rejection: ' + reason);
});

process.on('exit', (code) => {
  log('Process exit with code: ' + code);
});

log('Setting up app.whenReady()...');
log('app.isReady(): ' + app.isReady());

// Timeout to check if app never becomes ready
setTimeout(() => {
  log('Timeout check - app.isReady(): ' + app.isReady());
}, 5000);

app.on('ready', () => {
  log('app ready event fired');
});

app.whenReady().then(() => {
  log('app.whenReady() callback triggered');
  log('App ready, isDev: ' + isDev);
  log('__dirname: ' + __dirname);
  log('app.getAppPath(): ' + app.getAppPath());

  try {
    // Ta bort restriktiv CSP för att tillåta emoji-bilder och fonter
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      // Ta bort eventuell CSP-header som blockerar
      delete responseHeaders['content-security-policy'];
      delete responseHeaders['Content-Security-Policy'];
      callback({ responseHeaders });
    });

    setupIpcHandlers();
    log('IPC handlers setup complete');
    createWindow();
    log('Window created');
  } catch (error) {
    log('Error during app initialization: ' + (error as Error).message);
  }

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
