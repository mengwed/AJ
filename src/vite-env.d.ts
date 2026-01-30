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
  };
}
