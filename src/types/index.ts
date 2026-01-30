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

export type AccountType = 'tillgång' | 'skuld' | 'intäkt' | 'kostnad' | 'eget_kapital';

export const accountTypeLabels: Record<AccountType, string> = {
  'tillgång': 'Tillgång',
  'skuld': 'Skuld',
  'intäkt': 'Intäkt',
  'kostnad': 'Kostnad',
  'eget_kapital': 'Eget kapital',
};

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
  created_at: string;
  supplier_name?: string;
}

export interface ImportResult {
  customerInvoices: number;
  supplierInvoices: number;
  skipped: number;
  errors: string[];
}

export type InvoiceStatus = 'imported' | 'processed' | 'paid' | 'overdue';

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
