import { useState, useCallback } from 'react';
import type {
  DashboardStats,
  DashboardStatsEnhanced,
  Category,
  CategoryInput,
} from '../types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.getAllCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  }, []);

  const createCategory = useCallback(async (data: CategoryInput) => {
    try {
      await window.api.createCategory(data);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
      throw err;
    }
  }, [fetchCategories]);

  const updateCategory = useCallback(async (id: number, data: CategoryInput) => {
    try {
      await window.api.updateCategory(id, data);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
      throw err;
    }
  }, [fetchCategories]);

  const deleteCategory = useCallback(async (id: number) => {
    try {
      await window.api.deleteCategory(id);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
      throw err;
    }
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
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

export function useDashboardForYear() {
  const [stats, setStats] = useState<DashboardStatsEnhanced | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (fiscalYearId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.getDashboardStatsForYear(fiscalYearId);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, error, fetchStats };
}
