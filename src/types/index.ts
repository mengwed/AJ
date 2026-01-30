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
