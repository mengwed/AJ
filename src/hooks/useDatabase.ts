import { useState, useCallback } from 'react';
import type {
  Account,
  Transaction,
  DashboardStats,
  BalanceReportItem,
  IncomeStatementItem,
} from '../types';

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.getAllAccounts();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  }, []);

  const createAccount = useCallback(async (accountNumber: string, name: string, type: string) => {
    try {
      await window.api.createAccount(accountNumber, name, type);
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
      throw err;
    }
  }, [fetchAccounts]);

  const updateAccount = useCallback(async (id: number, accountNumber: string, name: string, type: string) => {
    try {
      await window.api.updateAccount(id, accountNumber, name, type);
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
      throw err;
    }
  }, [fetchAccounts]);

  const deleteAccount = useCallback(async (id: number) => {
    try {
      await window.api.deleteAccount(id);
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
      throw err;
    }
  }, [fetchAccounts]);

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.getAllTransactions();
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTransaction = useCallback(async (
    date: string,
    description: string,
    lines: Array<{ accountId: number; debit: number; credit: number }>
  ) => {
    try {
      await window.api.createTransaction(date, description, lines);
      await fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
      throw err;
    }
  }, [fetchTransactions]);

  const updateTransaction = useCallback(async (
    id: number,
    date: string,
    description: string,
    lines: Array<{ accountId: number; debit: number; credit: number }>
  ) => {
    try {
      await window.api.updateTransaction(id, date, description, lines);
      await fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
      throw err;
    }
  }, [fetchTransactions]);

  const deleteTransaction = useCallback(async (id: number) => {
    try {
      await window.api.deleteTransaction(id);
      await fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
      throw err;
    }
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, error, fetchStats };
}

export function useReports() {
  const [balanceReport, setBalanceReport] = useState<BalanceReportItem[]>([]);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalanceReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.getBalanceReport();
      setBalanceReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchIncomeStatement = useCallback(async (startDate?: string, endDate?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.getIncomeStatement(startDate, endDate);
      setIncomeStatement(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    balanceReport,
    incomeStatement,
    loading,
    error,
    fetchBalanceReport,
    fetchIncomeStatement,
  };
}
