/// <reference types="vite/client" />

interface Window {
  api: {
    // Accounts
    getAllAccounts: () => Promise<import('./types').Account[]>;
    getAccountById: (id: number) => Promise<import('./types').Account | null>;
    createAccount: (accountNumber: string, name: string, type: string) => Promise<import('./types').Account>;
    updateAccount: (id: number, accountNumber: string, name: string, type: string) => Promise<import('./types').Account>;
    deleteAccount: (id: number) => Promise<{ success: boolean }>;

    // Transactions
    getAllTransactions: () => Promise<import('./types').Transaction[]>;
    getTransactionById: (id: number) => Promise<import('./types').Transaction | null>;
    createTransaction: (
      date: string,
      description: string,
      lines: Array<{ accountId: number; debit: number; credit: number }>
    ) => Promise<import('./types').Transaction>;
    updateTransaction: (
      id: number,
      date: string,
      description: string,
      lines: Array<{ accountId: number; debit: number; credit: number }>
    ) => Promise<import('./types').Transaction>;
    deleteTransaction: (id: number) => Promise<{ success: boolean }>;

    // Reports
    getBalanceReport: () => Promise<import('./types').BalanceReportItem[]>;
    getIncomeStatement: (startDate?: string, endDate?: string) => Promise<import('./types').IncomeStatementItem[]>;
    getDashboardStats: () => Promise<import('./types').DashboardStats>;

    // Fiscal Years
    getAllFiscalYears: () => Promise<import('./types').FiscalYear[]>;
    getFiscalYearById: (id: number) => Promise<import('./types').FiscalYear | undefined>;
    getActiveFiscalYear: () => Promise<import('./types').FiscalYear | undefined>;
    createFiscalYear: (year: number) => Promise<import('./types').FiscalYear>;
    setActiveFiscalYear: (id: number) => Promise<import('./types').FiscalYear>;
    deleteFiscalYear: (id: number) => Promise<{ success: boolean }>;

    // Customers
    getAllCustomers: () => Promise<import('./types').Customer[]>;
    getCustomerById: (id: number) => Promise<import('./types').Customer | undefined>;
    searchCustomers: (query: string) => Promise<import('./types').Customer[]>;
    createCustomer: (data: import('./types').CustomerInput) => Promise<import('./types').Customer>;
    updateCustomer: (id: number, data: import('./types').CustomerInput) => Promise<import('./types').Customer>;
    deleteCustomer: (id: number) => Promise<{ success: boolean }>;

    // Suppliers
    getAllSuppliers: () => Promise<import('./types').Supplier[]>;
    getSupplierById: (id: number) => Promise<import('./types').Supplier | undefined>;
    searchSuppliers: (query: string) => Promise<import('./types').Supplier[]>;
    createSupplier: (data: import('./types').SupplierInput) => Promise<import('./types').Supplier>;
    updateSupplier: (id: number, data: import('./types').SupplierInput) => Promise<import('./types').Supplier>;
    deleteSupplier: (id: number) => Promise<{ success: boolean }>;

    // Invoice Folders
    getAllInvoiceFolders: () => Promise<import('./types').InvoiceFolder[]>;
    addInvoiceFolder: (folderPath: string) => Promise<import('./types').InvoiceFolder>;
    removeInvoiceFolder: (id: number) => Promise<{ success: boolean }>;
    selectFolder: () => Promise<string | null>;

    // Customer Invoices
    getCustomerInvoices: (fiscalYearId: number) => Promise<import('./types').CustomerInvoice[]>;
    getCustomerInvoiceById: (id: number) => Promise<import('./types').CustomerInvoice | undefined>;
    updateCustomerInvoice: (id: number, data: Partial<import('./types').CustomerInvoice>) => Promise<import('./types').CustomerInvoice>;
    deleteCustomerInvoice: (id: number) => Promise<{ success: boolean }>;

    // Supplier Invoices
    getSupplierInvoices: (fiscalYearId: number) => Promise<import('./types').SupplierInvoice[]>;
    getSupplierInvoiceById: (id: number) => Promise<import('./types').SupplierInvoice | undefined>;
    updateSupplierInvoice: (id: number, data: Partial<import('./types').SupplierInvoice>) => Promise<import('./types').SupplierInvoice>;
    deleteSupplierInvoice: (id: number) => Promise<{ success: boolean }>;

    // Import Operations
    scanAndImportFolder: (folderId: number, fiscalYearId: number) => Promise<import('./types').ImportResult>;
    selectAndImportFiles: (fiscalYearId: number) => Promise<import('./types').ImportResult>;
    openInvoiceFile: (filePath: string) => Promise<void>;

    // Year Folder Import
    selectYearFolder: () => Promise<string | null>;
    scanYearFolder: (folderPath: string) => Promise<import('./types').YearFolderPreview>;
    importYearFolder: (folderPath: string, year: number) => Promise<import('./types').YearImportResult>;
  };
}
