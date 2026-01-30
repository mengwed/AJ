import { getDatabase } from './database.js';

export interface FiscalYear {
  id: number;
  year: number;
  is_active: number;
  created_at: string;
}

export function getAllFiscalYears(): FiscalYear[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM fiscal_years ORDER BY year DESC').all() as FiscalYear[];
}

export function getFiscalYearById(id: number): FiscalYear | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM fiscal_years WHERE id = ?').get(id) as FiscalYear | undefined;
}

export function getActiveFiscalYear(): FiscalYear | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM fiscal_years WHERE is_active = 1').get() as FiscalYear | undefined;
}

export function createFiscalYear(year: number): FiscalYear {
  const db = getDatabase();
  const result = db.prepare('INSERT INTO fiscal_years (year, is_active) VALUES (?, 0)').run(year);
  return getFiscalYearById(Number(result.lastInsertRowid))!;
}

export function setActiveFiscalYear(id: number): FiscalYear {
  const db = getDatabase();
  // Deactivate all fiscal years
  db.prepare('UPDATE fiscal_years SET is_active = 0').run();
  // Activate the selected one
  db.prepare('UPDATE fiscal_years SET is_active = 1 WHERE id = ?').run(id);
  return getFiscalYearById(id)!;
}

export function deleteFiscalYear(id: number): { success: boolean } {
  const db = getDatabase();
  // Check if fiscal year has invoices
  const customerInvoiceCount = db.prepare('SELECT COUNT(*) as count FROM customer_invoices WHERE fiscal_year_id = ?').get(id) as { count: number };
  const supplierInvoiceCount = db.prepare('SELECT COUNT(*) as count FROM supplier_invoices WHERE fiscal_year_id = ?').get(id) as { count: number };

  if (customerInvoiceCount.count > 0 || supplierInvoiceCount.count > 0) {
    throw new Error('Cannot delete fiscal year with associated invoices');
  }

  db.prepare('DELETE FROM fiscal_years WHERE id = ?').run(id);
  return { success: true };
}
