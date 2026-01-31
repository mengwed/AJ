/// <reference types="vite/client" />

interface Window {
  api: {
    // Categories
    getAllCategories: () => Promise<import('./types').Category[]>;
    getCategoryById: (id: number) => Promise<import('./types').Category | undefined>;
    createCategory: (data: import('./types').CategoryInput) => Promise<import('./types').Category>;
    updateCategory: (id: number, data: import('./types').CategoryInput) => Promise<import('./types').Category>;
    deleteCategory: (id: number) => Promise<{ success: boolean }>;

    // Dashboard
    getDashboardStats: () => Promise<import('./types').DashboardStats>;
    getDashboardStatsForYear: (fiscalYearId: number) => Promise<import('./types').DashboardStatsEnhanced>;

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
    deleteCustomer: (id: number, force?: boolean) => Promise<{ success: boolean }>;
    checkCustomerDeletion: (id: number) => Promise<import('./types').CustomerDeletionCheck>;

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
    downloadIcloudFiles: (folderPath: string) => Promise<import('./types').IcloudDownloadResult>;

    // Move invoice between customer/supplier
    moveCustomerInvoiceToSupplier: (id: number) => Promise<import('./types').SupplierInvoice>;
    moveSupplierInvoiceToCustomer: (id: number) => Promise<import('./types').CustomerInvoice>;

    // PDF reading and amount extraction
    readPdfAsBase64: (filePath: string) => Promise<import('./types').PdfReadResult>;
    batchReExtractAmounts: (fiscalYearId: number) => Promise<import('./types').BatchReExtractResult>;

    // Invoices by entity
    getInvoicesByCustomerId: (customerId: number) => Promise<{ invoices: import('./types').CustomerInvoice[]; years: number[] }>;
    getInvoicesBySupplierId: (supplierId: number) => Promise<{ invoices: import('./types').SupplierInvoice[]; years: number[] }>;
  };
}
