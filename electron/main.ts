import { app, BrowserWindow, ipcMain, session } from 'electron';
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
}

app.whenReady().then(() => {
  // Ta bort restriktiv CSP för att tillåta emoji-bilder och fonter
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    // Ta bort eventuell CSP-header som blockerar
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    callback({ responseHeaders });
  });

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
