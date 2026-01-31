import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'bokforing.db');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  initializeDatabase(db);

  return db;
}

function initializeDatabase(db: Database.Database): void {
  // Skapa tabeller
  db.exec(`
    -- Årshantering
    CREATE TABLE IF NOT EXISTS fiscal_years (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Kundregister
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      org_number TEXT,
      address TEXT,
      postal_code TEXT,
      city TEXT,
      email TEXT,
      phone TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Leverantörsregister
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      org_number TEXT,
      address TEXT,
      postal_code TEXT,
      city TEXT,
      email TEXT,
      phone TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Kundfakturor (utgående)
    CREATE TABLE IF NOT EXISTS customer_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fiscal_year_id INTEGER NOT NULL,
      customer_id INTEGER,
      invoice_number TEXT,
      invoice_date TEXT,
      due_date TEXT,
      amount REAL,
      vat REAL,
      total REAL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      parsed_content TEXT,
      status TEXT DEFAULT 'imported',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    -- Leverantörsfakturor (inkommande)
    CREATE TABLE IF NOT EXISTS supplier_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fiscal_year_id INTEGER NOT NULL,
      supplier_id INTEGER,
      invoice_number TEXT,
      invoice_date TEXT,
      due_date TEXT,
      amount REAL,
      vat REAL,
      total REAL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      parsed_content TEXT,
      status TEXT DEFAULT 'imported',
      payment_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    -- Mappkonfiguration
    CREATE TABLE IF NOT EXISTS invoice_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL UNIQUE,
      last_scanned TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Inbetalningsverifikationer (betalningar från kunder)
    CREATE TABLE IF NOT EXISTS customer_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fiscal_year_id INTEGER NOT NULL,
      customer_id INTEGER,
      customer_invoice_id INTEGER,
      payment_date TEXT,
      amount REAL,
      payment_reference TEXT,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      parsed_content TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (customer_invoice_id) REFERENCES customer_invoices(id)
    );

    CREATE INDEX IF NOT EXISTS idx_customer_invoices_fiscal_year ON customer_invoices(fiscal_year_id);
    CREATE INDEX IF NOT EXISTS idx_customer_invoices_customer ON customer_invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_invoices_fiscal_year ON supplier_invoices(fiscal_year_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier ON supplier_invoices(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_customer_payments_fiscal_year ON customer_payments(fiscal_year_id);
    CREATE INDEX IF NOT EXISTS idx_customer_payments_customer ON customer_payments(customer_id);

    -- Kategorier
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrera: lägg till category_id på suppliers om den inte finns
  const supplierColumns = db.prepare("PRAGMA table_info(suppliers)").all() as Array<{ name: string }>;
  if (!supplierColumns.some(col => col.name === 'category_id')) {
    db.exec('ALTER TABLE suppliers ADD COLUMN category_id INTEGER REFERENCES categories(id)');
  }

  // Migrera: lägg till category_id på supplier_invoices om den inte finns
  const invoiceColumns = db.prepare("PRAGMA table_info(supplier_invoices)").all() as Array<{ name: string }>;
  if (!invoiceColumns.some(col => col.name === 'category_id')) {
    db.exec('ALTER TABLE supplier_invoices ADD COLUMN category_id INTEGER REFERENCES categories(id)');
  }

  // Migrera: lägg till emoji på categories om den inte finns
  const categoryColumns = db.prepare("PRAGMA table_info(categories)").all() as Array<{ name: string }>;
  if (!categoryColumns.some(col => col.name === 'emoji')) {
    db.exec('ALTER TABLE categories ADD COLUMN emoji TEXT');
  }

  // Seed fiscal year 2025 if not exists
  const fiscalYearCount = db.prepare('SELECT COUNT(*) as count FROM fiscal_years').get() as { count: number };
  if (fiscalYearCount.count === 0) {
    db.prepare('INSERT INTO fiscal_years (year, is_active) VALUES (2025, 1)').run();
  }
}

// Category operations
export function getAllCategories() {
  const db = getDatabase();
  return db.prepare('SELECT * FROM categories ORDER BY name').all();
}

export function getCategoryById(id: number) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

export function createCategory(data: { name: string; description?: string; emoji?: string }) {
  const db = getDatabase();
  const result = db.prepare('INSERT INTO categories (name, description, emoji) VALUES (?, ?, ?)').run(
    data.name,
    data.description || null,
    data.emoji || null
  );
  return getCategoryById(Number(result.lastInsertRowid));
}

export function updateCategory(id: number, data: { name: string; description?: string; emoji?: string }) {
  const db = getDatabase();
  db.prepare('UPDATE categories SET name = ?, description = ?, emoji = ? WHERE id = ?').run(
    data.name,
    data.description || null,
    data.emoji || null,
    id
  );
  return getCategoryById(id);
}

export function deleteCategory(id: number) {
  const db = getDatabase();
  // Ta bort kategori-referens från leverantörer och fakturor först
  db.prepare('UPDATE suppliers SET category_id = NULL WHERE category_id = ?').run(id);
  db.prepare('UPDATE supplier_invoices SET category_id = NULL WHERE category_id = ?').run(id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  return { success: true };
}

export function getDashboardStats() {
  const db = getDatabase();

  // Hämta aktivt räkenskapsår
  const activeFiscalYear = db.prepare('SELECT id FROM fiscal_years WHERE is_active = 1').get() as { id: number } | undefined;
  const fiscalYearId = activeFiscalYear?.id;

  // Beräkna intäkter från kundfakturor
  const customerInvoiceTotal = fiscalYearId
    ? db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total
        FROM customer_invoices
        WHERE fiscal_year_id = ?
      `).get(fiscalYearId) as { total: number }
    : { total: 0 };

  // Beräkna kostnader från leverantörsfakturor
  const supplierInvoiceTotal = fiscalYearId
    ? db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total
        FROM supplier_invoices
        WHERE fiscal_year_id = ?
      `).get(fiscalYearId) as { total: number }
    : { total: 0 };

  // Antal fakturor
  const invoiceCount = fiscalYearId
    ? db.prepare(`
        SELECT
          (SELECT COUNT(*) FROM customer_invoices WHERE fiscal_year_id = ?) +
          (SELECT COUNT(*) FROM supplier_invoices WHERE fiscal_year_id = ?) as count
      `).get(fiscalYearId, fiscalYearId) as { count: number }
    : { count: 0 };

  return {
    income: customerInvoiceTotal.total,
    expenses: supplierInvoiceTotal.total,
    result: customerInvoiceTotal.total - supplierInvoiceTotal.total,
    invoiceCount: invoiceCount.count
  };
}

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

function calculatePercentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? 100 : null;
  }
  return Math.round(((current - previous) / previous) * 100);
}

export function getDashboardStatsForYear(fiscalYearId: number): DashboardStatsEnhanced {
  const db = getDatabase();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentRealYear = currentDate.getFullYear();

  // Hämta info om det valda räkenskapsåret
  const fiscalYear = db.prepare('SELECT * FROM fiscal_years WHERE id = ?').get(fiscalYearId) as { id: number; year: number; is_active: number } | undefined;

  if (!fiscalYear) {
    return {
      year: currentRealYear,
      income: 0,
      expenses: 0,
      vat: 0,
      result: 0,
      invoiceCount: 0,
      comparison: null,
      isCurrentYear: true,
      comparisonPeriod: null,
    };
  }

  const selectedYear = fiscalYear.year;
  const isCurrentYear = selectedYear === currentRealYear;

  // Hämta intäkter, moms och antal kundfakturor
  let customerQuery: string;
  let customerParams: (number | string)[];

  if (isCurrentYear) {
    // Filtrera på aktuell månad för innevarande år
    const monthPrefix = `${selectedYear}-${String(currentMonth).padStart(2, '0')}`;
    customerQuery = `
      SELECT
        COALESCE(SUM(total), 0) as total,
        COALESCE(SUM(amount), 0) as amount,
        COUNT(*) as count
      FROM customer_invoices
      WHERE fiscal_year_id = ?
        AND invoice_date LIKE ?
    `;
    customerParams = [fiscalYearId, `${monthPrefix}%`];
  } else {
    // Hela året för tidigare år
    customerQuery = `
      SELECT
        COALESCE(SUM(total), 0) as total,
        COALESCE(SUM(amount), 0) as amount,
        COUNT(*) as count
      FROM customer_invoices
      WHERE fiscal_year_id = ?
    `;
    customerParams = [fiscalYearId];
  }

  const customerStats = db.prepare(customerQuery).get(...customerParams) as { total: number; amount: number; count: number };
  // Beräkna moms som total - belopp (vat-fältet kan vara korrupt)
  const customerVat = customerStats.total - customerStats.amount;

  // Hämta kostnader från leverantörsfakturor
  let supplierQuery: string;
  let supplierParams: (number | string)[];

  if (isCurrentYear) {
    const monthPrefix = `${selectedYear}-${String(currentMonth).padStart(2, '0')}`;
    supplierQuery = `
      SELECT
        COALESCE(SUM(total), 0) as total,
        COUNT(*) as count
      FROM supplier_invoices
      WHERE fiscal_year_id = ?
        AND invoice_date LIKE ?
    `;
    supplierParams = [fiscalYearId, `${monthPrefix}%`];
  } else {
    supplierQuery = `
      SELECT
        COALESCE(SUM(total), 0) as total,
        COUNT(*) as count
      FROM supplier_invoices
      WHERE fiscal_year_id = ?
    `;
    supplierParams = [fiscalYearId];
  }

  const supplierStats = db.prepare(supplierQuery).get(...supplierParams) as { total: number; count: number };

  // Hämta föregående periods data för jämförelse
  let comparison: DashboardStatsEnhanced['comparison'] = null;
  let comparisonPeriod: DashboardStatsEnhanced['comparisonPeriod'] = null;

  // Hitta föregående års fiscal year
  const previousFiscalYear = db.prepare(
    'SELECT * FROM fiscal_years WHERE year = ?'
  ).get(selectedYear - 1) as { id: number; year: number } | undefined;

  if (previousFiscalYear) {
    let prevCustomerQuery: string;
    let prevCustomerParams: (number | string)[];
    let prevSupplierQuery: string;
    let prevSupplierParams: (number | string)[];

    if (isCurrentYear) {
      // Jämför med samma månad föregående år
      comparisonPeriod = 'same_month';
      const monthPrefix = `${selectedYear - 1}-${String(currentMonth).padStart(2, '0')}`;

      prevCustomerQuery = `
        SELECT
          COALESCE(SUM(total), 0) as total,
          COALESCE(SUM(amount), 0) as amount
        FROM customer_invoices
        WHERE fiscal_year_id = ?
          AND invoice_date LIKE ?
      `;
      prevCustomerParams = [previousFiscalYear.id, `${monthPrefix}%`];

      prevSupplierQuery = `
        SELECT COALESCE(SUM(total), 0) as total
        FROM supplier_invoices
        WHERE fiscal_year_id = ?
          AND invoice_date LIKE ?
      `;
      prevSupplierParams = [previousFiscalYear.id, `${monthPrefix}%`];
    } else {
      // Jämför med hela föregående år
      comparisonPeriod = 'full_year';

      prevCustomerQuery = `
        SELECT
          COALESCE(SUM(total), 0) as total,
          COALESCE(SUM(amount), 0) as amount
        FROM customer_invoices
        WHERE fiscal_year_id = ?
      `;
      prevCustomerParams = [previousFiscalYear.id];

      prevSupplierQuery = `
        SELECT COALESCE(SUM(total), 0) as total
        FROM supplier_invoices
        WHERE fiscal_year_id = ?
      `;
      prevSupplierParams = [previousFiscalYear.id];
    }

    const prevCustomerStats = db.prepare(prevCustomerQuery).get(...prevCustomerParams) as { total: number; amount: number };
    const prevSupplierStats = db.prepare(prevSupplierQuery).get(...prevSupplierParams) as { total: number };
    // Beräkna moms som total - belopp
    const prevCustomerVat = prevCustomerStats.total - prevCustomerStats.amount;

    comparison = {
      income: prevCustomerStats.amount,
      expenses: prevSupplierStats.total,
      vat: prevCustomerVat,
      incomeChangePercent: calculatePercentChange(customerStats.amount, prevCustomerStats.amount),
      expensesChangePercent: calculatePercentChange(supplierStats.total, prevSupplierStats.total),
      vatChangePercent: calculatePercentChange(customerVat, prevCustomerVat),
    };
  }

  return {
    year: selectedYear,
    income: customerStats.amount,
    expenses: supplierStats.total,
    vat: customerVat,
    result: customerStats.amount - supplierStats.total,
    invoiceCount: customerStats.count + supplierStats.count,
    comparison,
    isCurrentYear,
    comparisonPeriod,
  };
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
