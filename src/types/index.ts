// Category types
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

// Dashboard types
export interface DashboardStats {
  income: number;
  expenses: number;
  result: number;
  invoiceCount: number;
}

// Fiscal Year types
export interface FiscalYear {
  id: number;
  year: number;
  is_active: number;
  created_at: string;
}

// Customer types
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

// Supplier types
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

// Invoice types
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

export interface PossibleDuplicate {
  fileName: string;
  newPath: string;
  existingPath: string;
  existingType: 'customer' | 'supplier' | 'payment';
}

export interface ImportResult {
  customerInvoices: number;
  supplierInvoices: number;
  customerPayments: number;
  skipped: number;
  possibleDuplicates: PossibleDuplicate[];
  errors: string[];
}

export type InvoiceStatus = 'imported' | 'processed' | 'paid' | 'overdue';

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
  possibleDuplicates: PossibleDuplicate[];
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
  totalPossibleDuplicates: PossibleDuplicate[];
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

export interface EntityInvoicesResult<T> {
  invoices: T[];
  years: number[];
}

// Enhanced Dashboard types
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
