import { contextBridge, ipcRenderer } from 'electron';

export interface Account {
  id: number;
  account_number: string;
  name: string;
  type: 'tillgång' | 'skuld' | 'intäkt' | 'kostnad' | 'eget_kapital';
}

export interface TransactionLine {
  id?: number;
  account_id?: number;
  accountId?: number;
  account_number?: string;
  account_name?: string;
  debit: number;
  credit: number;
}

export interface Transaction {
  id: number;
  date: string;
  description: string;
  created_at: string;
  lines: TransactionLine[];
}

export interface DashboardStats {
  income: number;
  expenses: number;
  result: number;
  transactionCount: number;
  recentTransactions: Transaction[];
}

export interface BalanceReportItem {
  id: number;
  account_number: string;
  name: string;
  type: string;
  total_debit: number;
  total_credit: number;
  balance: number;
}

export interface IncomeStatementItem {
  id: number;
  account_number: string;
  name: string;
  type: string;
  total_debit: number;
  total_credit: number;
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

export interface Supplier {
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

export interface SupplierInput {
  name: string;
  org_number?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  email?: string;
  phone?: string;
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
}

export interface YearFolderPreview {
  folderPath: string;
  folderName: string;
  detectedYear: number | null;
  monthFolders: MonthFolderInfo[];
  rootPdfCount: number;
  totalPdfCount: number;
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

const api = {
  // Accounts
  getAllAccounts: (): Promise<Account[]> => ipcRenderer.invoke('db:getAllAccounts'),
  getAccountById: (id: number): Promise<Account | null> => ipcRenderer.invoke('db:getAccountById', id),
  createAccount: (accountNumber: string, name: string, type: string): Promise<Account> =>
    ipcRenderer.invoke('db:createAccount', accountNumber, name, type),
  updateAccount: (id: number, accountNumber: string, name: string, type: string): Promise<Account> =>
    ipcRenderer.invoke('db:updateAccount', id, accountNumber, name, type),
  deleteAccount: (id: number): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:deleteAccount', id),

  // Transactions
  getAllTransactions: (): Promise<Transaction[]> => ipcRenderer.invoke('db:getAllTransactions'),
  getTransactionById: (id: number): Promise<Transaction | null> =>
    ipcRenderer.invoke('db:getTransactionById', id),
  createTransaction: (
    date: string,
    description: string,
    lines: Array<{ accountId: number; debit: number; credit: number }>
  ): Promise<Transaction> =>
    ipcRenderer.invoke('db:createTransaction', date, description, lines),
  updateTransaction: (
    id: number,
    date: string,
    description: string,
    lines: Array<{ accountId: number; debit: number; credit: number }>
  ): Promise<Transaction> =>
    ipcRenderer.invoke('db:updateTransaction', id, date, description, lines),
  deleteTransaction: (id: number): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:deleteTransaction', id),

  // Reports
  getBalanceReport: (): Promise<BalanceReportItem[]> => ipcRenderer.invoke('db:getBalanceReport'),
  getIncomeStatement: (startDate?: string, endDate?: string): Promise<IncomeStatementItem[]> =>
    ipcRenderer.invoke('db:getIncomeStatement', startDate, endDate),
  getDashboardStats: (): Promise<DashboardStats> => ipcRenderer.invoke('db:getDashboardStats'),

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
  deleteCustomer: (id: number): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:deleteCustomer', id),

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
};

contextBridge.exposeInMainWorld('api', api);

declare global {
  interface Window {
    api: typeof api;
  }
}
