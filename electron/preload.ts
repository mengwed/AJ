import { contextBridge, ipcRenderer } from 'electron';

export interface Category {
  id: number;
  name: string;
  description: string | null;
  emoji: string | null;
  created_at: string;
}

export interface CategoryInput {
  name: string;
  description?: string;
  emoji?: string;
}

export interface DashboardStats {
  income: number;
  expenses: number;
  result: number;
  invoiceCount: number;
}

export interface DashboardStatsEnhanced {
  year: number;
  income: number;
  expenses: number;
  vat: number;
  result: number;
  invoiceCount: number;
  comparison: {
    income: number | null;
    expenses: number | null;
    vat: number | null;
    incomeChangePercent: number | null;
    expensesChangePercent: number | null;
    vatChangePercent: number | null;
  } | null;
  isCurrentYear: boolean;
  comparisonPeriod: 'full_year' | 'same_month' | null;
}

export interface FiscalYear {
  id: number;
  year: number;
  is_active: number;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  org_number: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface CustomerInput {
  name: string;
  org_number?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  email?: string;
  phone?: string;
}

export interface CustomerDeletionCheck {
  canDelete: boolean;
  invoiceCount: number;
  paymentCount: number;
  invoiceYears: number[];
  paymentYears: number[];
}

export interface Supplier {
  id: number;
  name: string;
  org_number: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  category_id: number | null;
  category_name?: string;
  created_at: string;
}

export interface SupplierInput {
  name: string;
  org_number?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  email?: string;
  phone?: string;
  category_id?: number | null;
}

export interface InvoiceFolder {
  id: number;
  path: string;
  last_scanned: string | null;
  created_at: string;
}

export interface CustomerInvoice {
  id: number;
  fiscal_year_id: number;
  customer_id: number | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  amount: number | null;
  vat: number | null;
  total: number | null;
  file_path: string;
  file_name: string;
  parsed_content: string | null;
  status: string;
  created_at: string;
  customer_name?: string;
}

export interface SupplierInvoice {
  id: number;
  fiscal_year_id: number;
  supplier_id: number | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  amount: number | null;
  vat: number | null;
  total: number | null;
  file_path: string;
  file_name: string;
  parsed_content: string | null;
  status: string;
  payment_date: string | null;
  category_id: number | null;
  effective_category_id: number | null;
  effective_category_name: string | null;
  effective_category_emoji: string | null;
  supplier_category_id: number | null;
  supplier_category_name: string | null;
  supplier_category_emoji: string | null;
  created_at: string;
  supplier_name?: string;
}

export interface ImportResult {
  customerInvoices: number;
  supplierInvoices: number;
  skipped: number;
  errors: string[];
}

// Year Import types
export interface MonthFolderInfo {
  name: string;
  path: string;
  monthNumber: number | null;
  pdfCount: number;
  icloudCount: number;
}

export interface YearFolderPreview {
  folderPath: string;
  folderName: string;
  detectedYear: number | null;
  monthFolders: MonthFolderInfo[];
  rootPdfCount: number;
  rootIcloudCount: number;
  totalPdfCount: number;
  totalIcloudCount: number;
}

export interface IcloudDownloadResult {
  requested: number;
  errors: string[];
}

export interface MonthImportResult {
  folderName: string;
  monthNumber: number | null;
  imported: number;
  skipped: number;
  errors: string[];
}

export interface YearImportResult {
  year: number;
  fiscalYearId: number;
  fiscalYearCreated: boolean;
  monthResults: MonthImportResult[];
  rootResult: MonthImportResult | null;
  totalImported: number;
  totalSkipped: number;
  totalErrors: string[];
}

export interface BatchReExtractResult {
  customerInvoicesUpdated: number;
  supplierInvoicesUpdated: number;
  errors: string[];
}

export interface PdfReadResult {
  success: boolean;
  data?: string;
  error?: string;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  rowCount?: number;
  error?: string;
}

const api = {
  // Categories
  getAllCategories: (): Promise<Category[]> => ipcRenderer.invoke('db:getAllCategories'),
  getCategoryById: (id: number): Promise<Category | undefined> =>
    ipcRenderer.invoke('db:getCategoryById', id),
  createCategory: (data: CategoryInput): Promise<Category> =>
    ipcRenderer.invoke('db:createCategory', data),
  updateCategory: (id: number, data: CategoryInput): Promise<Category> =>
    ipcRenderer.invoke('db:updateCategory', id, data),
  deleteCategory: (id: number): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:deleteCategory', id),

  // Dashboard
  getDashboardStats: (): Promise<DashboardStats> => ipcRenderer.invoke('db:getDashboardStats'),
  getDashboardStatsForYear: (fiscalYearId: number): Promise<DashboardStatsEnhanced> =>
    ipcRenderer.invoke('db:getDashboardStatsForYear', fiscalYearId),

  // Fiscal Years
  getAllFiscalYears: (): Promise<FiscalYear[]> => ipcRenderer.invoke('db:getAllFiscalYears'),
  getFiscalYearById: (id: number): Promise<FiscalYear | undefined> =>
    ipcRenderer.invoke('db:getFiscalYearById', id),
  getActiveFiscalYear: (): Promise<FiscalYear | undefined> =>
    ipcRenderer.invoke('db:getActiveFiscalYear'),
  createFiscalYear: (year: number): Promise<FiscalYear> =>
    ipcRenderer.invoke('db:createFiscalYear', year),
  setActiveFiscalYear: (id: number): Promise<FiscalYear> =>
    ipcRenderer.invoke('db:setActiveFiscalYear', id),
  deleteFiscalYear: (id: number): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:deleteFiscalYear', id),

  // Customers
  getAllCustomers: (): Promise<Customer[]> => ipcRenderer.invoke('db:getAllCustomers'),
  getCustomerById: (id: number): Promise<Customer | undefined> =>
    ipcRenderer.invoke('db:getCustomerById', id),
  searchCustomers: (query: string): Promise<Customer[]> =>
    ipcRenderer.invoke('db:searchCustomers', query),
  createCustomer: (data: CustomerInput): Promise<Customer> =>
    ipcRenderer.invoke('db:createCustomer', data),
  updateCustomer: (id: number, data: CustomerInput): Promise<Customer> =>
    ipcRenderer.invoke('db:updateCustomer', id, data),
  deleteCustomer: (id: number, force?: boolean): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:deleteCustomer', id, force),
  checkCustomerDeletion: (id: number): Promise<CustomerDeletionCheck> =>
    ipcRenderer.invoke('db:checkCustomerDeletion', id),

  // Suppliers
  getAllSuppliers: (): Promise<Supplier[]> => ipcRenderer.invoke('db:getAllSuppliers'),
  getSupplierById: (id: number): Promise<Supplier | undefined> =>
    ipcRenderer.invoke('db:getSupplierById', id),
  searchSuppliers: (query: string): Promise<Supplier[]> =>
    ipcRenderer.invoke('db:searchSuppliers', query),
  createSupplier: (data: SupplierInput): Promise<Supplier> =>
    ipcRenderer.invoke('db:createSupplier', data),
  updateSupplier: (id: number, data: SupplierInput): Promise<Supplier> =>
    ipcRenderer.invoke('db:updateSupplier', id, data),
  deleteSupplier: (id: number): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:deleteSupplier', id),

  // Invoice Folders
  getAllInvoiceFolders: (): Promise<InvoiceFolder[]> =>
    ipcRenderer.invoke('db:getAllInvoiceFolders'),
  addInvoiceFolder: (folderPath: string): Promise<InvoiceFolder> =>
    ipcRenderer.invoke('db:addInvoiceFolder', folderPath),
  removeInvoiceFolder: (id: number): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:removeInvoiceFolder', id),
  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('db:selectFolder'),

  // Customer Invoices
  getCustomerInvoices: (fiscalYearId: number): Promise<CustomerInvoice[]> =>
    ipcRenderer.invoke('db:getCustomerInvoices', fiscalYearId),
  getCustomerInvoiceById: (id: number): Promise<CustomerInvoice | undefined> =>
    ipcRenderer.invoke('db:getCustomerInvoiceById', id),
  updateCustomerInvoice: (id: number, data: Partial<CustomerInvoice>): Promise<CustomerInvoice> =>
    ipcRenderer.invoke('db:updateCustomerInvoice', id, data),
  deleteCustomerInvoice: (id: number): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:deleteCustomerInvoice', id),

  // Supplier Invoices
  getSupplierInvoices: (fiscalYearId: number): Promise<SupplierInvoice[]> =>
    ipcRenderer.invoke('db:getSupplierInvoices', fiscalYearId),
  getSupplierInvoiceById: (id: number): Promise<SupplierInvoice | undefined> =>
    ipcRenderer.invoke('db:getSupplierInvoiceById', id),
  updateSupplierInvoice: (id: number, data: Partial<SupplierInvoice>): Promise<SupplierInvoice> =>
    ipcRenderer.invoke('db:updateSupplierInvoice', id, data),
  deleteSupplierInvoice: (id: number): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:deleteSupplierInvoice', id),

  // Import Operations
  scanAndImportFolder: (folderId: number, fiscalYearId: number): Promise<ImportResult> =>
    ipcRenderer.invoke('db:scanAndImportFolder', folderId, fiscalYearId),
  selectAndImportFiles: (fiscalYearId: number): Promise<ImportResult> =>
    ipcRenderer.invoke('db:selectAndImportFiles', fiscalYearId),
  openInvoiceFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('db:openInvoiceFile', filePath),

  // Year Folder Import
  selectYearFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('db:selectYearFolder'),
  scanYearFolder: (folderPath: string): Promise<YearFolderPreview> =>
    ipcRenderer.invoke('db:scanYearFolder', folderPath),
  importYearFolder: (folderPath: string, year: number): Promise<YearImportResult> =>
    ipcRenderer.invoke('db:importYearFolder', folderPath, year),
  downloadIcloudFiles: (folderPath: string): Promise<IcloudDownloadResult> =>
    ipcRenderer.invoke('db:downloadIcloudFiles', folderPath),

  // Move invoice between customer/supplier
  moveCustomerInvoiceToSupplier: (id: number): Promise<SupplierInvoice> =>
    ipcRenderer.invoke('db:moveCustomerInvoiceToSupplier', id),
  moveSupplierInvoiceToCustomer: (id: number): Promise<CustomerInvoice> =>
    ipcRenderer.invoke('db:moveSupplierInvoiceToCustomer', id),

  // PDF reading and amount extraction
  readPdfAsBase64: (filePath: string): Promise<PdfReadResult> =>
    ipcRenderer.invoke('db:readPdfAsBase64', filePath),
  batchReExtractAmounts: (fiscalYearId: number): Promise<BatchReExtractResult> =>
    ipcRenderer.invoke('db:batchReExtractAmounts', fiscalYearId),

  // Invoices by entity
  getInvoicesByCustomerId: (customerId: number): Promise<{ invoices: CustomerInvoice[]; years: number[] }> =>
    ipcRenderer.invoke('db:getInvoicesByCustomerId', customerId),
  getInvoicesBySupplierId: (supplierId: number): Promise<{ invoices: SupplierInvoice[]; years: number[] }> =>
    ipcRenderer.invoke('db:getInvoicesBySupplierId', supplierId),

  // Excel export
  exportInvoicesToExcel: (fiscalYearId: number): Promise<ExportResult> =>
    ipcRenderer.invoke('db:exportInvoicesToExcel', fiscalYearId),
};

contextBridge.exposeInMainWorld('api', api);

declare global {
  interface Window {
    api: typeof api;
  }
}
