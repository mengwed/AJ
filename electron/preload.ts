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
};

contextBridge.exposeInMainWorld('api', api);

declare global {
  interface Window {
    api: typeof api;
  }
}
