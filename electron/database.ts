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
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('tillgång', 'skuld', 'intäkt', 'kostnad', 'eget_kapital'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transaction_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transaction_lines_transaction ON transaction_lines(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_transaction_lines_account ON transaction_lines(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

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

    CREATE INDEX IF NOT EXISTS idx_customer_invoices_fiscal_year ON customer_invoices(fiscal_year_id);
    CREATE INDEX IF NOT EXISTS idx_customer_invoices_customer ON customer_invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_invoices_fiscal_year ON supplier_invoices(fiscal_year_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier ON supplier_invoices(supplier_id);
  `);

  // Kolla om kontoplan redan finns
  const count = db.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number };

  if (count.count === 0) {
    seedAccounts(db);
  }

  // Seed fiscal year 2025 if not exists
  const fiscalYearCount = db.prepare('SELECT COUNT(*) as count FROM fiscal_years').get() as { count: number };
  if (fiscalYearCount.count === 0) {
    db.prepare('INSERT INTO fiscal_years (year, is_active) VALUES (2025, 1)').run();
  }
}

function seedAccounts(db: Database.Database): void {
  const accounts = [
    // Tillgångar (1000-1999)
    { number: '1910', name: 'Kassa', type: 'tillgång' },
    { number: '1920', name: 'PlusGiro', type: 'tillgång' },
    { number: '1930', name: 'Företagskonto/checkkonto', type: 'tillgång' },
    { number: '1940', name: 'Övriga bankkonton', type: 'tillgång' },
    { number: '1510', name: 'Kundfordringar', type: 'tillgång' },
    { number: '1200', name: 'Maskiner och inventarier', type: 'tillgång' },
    { number: '1210', name: 'Datorer', type: 'tillgång' },
    { number: '1220', name: 'Inventarier och verktyg', type: 'tillgång' },
    { number: '1400', name: 'Lager', type: 'tillgång' },
    { number: '1610', name: 'Förutbetalda kostnader', type: 'tillgång' },
    { number: '1630', name: 'Upplupna intäkter', type: 'tillgång' },
    { number: '1650', name: 'Momsfordran', type: 'tillgång' },

    // Eget kapital (2000-2099)
    { number: '2010', name: 'Eget kapital', type: 'eget_kapital' },
    { number: '2013', name: 'Privata uttag', type: 'eget_kapital' },
    { number: '2018', name: 'Egna insättningar', type: 'eget_kapital' },
    { number: '2091', name: 'Balanserad vinst', type: 'eget_kapital' },
    { number: '2099', name: 'Årets resultat', type: 'eget_kapital' },

    // Skulder (2100-2999)
    { number: '2440', name: 'Leverantörsskulder', type: 'skuld' },
    { number: '2510', name: 'Skatteskulder', type: 'skuld' },
    { number: '2610', name: 'Utgående moms 25%', type: 'skuld' },
    { number: '2620', name: 'Utgående moms 12%', type: 'skuld' },
    { number: '2630', name: 'Utgående moms 6%', type: 'skuld' },
    { number: '2640', name: 'Ingående moms', type: 'skuld' },
    { number: '2650', name: 'Redovisningskonto för moms', type: 'skuld' },
    { number: '2710', name: 'Personalskatt', type: 'skuld' },
    { number: '2730', name: 'Arbetsgivaravgifter', type: 'skuld' },
    { number: '2890', name: 'Övriga kortfristiga skulder', type: 'skuld' },
    { number: '2910', name: 'Upplupna löner', type: 'skuld' },
    { number: '2920', name: 'Upplupna semesterlöner', type: 'skuld' },
    { number: '2940', name: 'Upplupna arbetsgivaravgifter', type: 'skuld' },
    { number: '2990', name: 'Övriga upplupna kostnader', type: 'skuld' },

    // Intäkter (3000-3999)
    { number: '3000', name: 'Försäljning varor', type: 'intäkt' },
    { number: '3001', name: 'Försäljning varor 25% moms', type: 'intäkt' },
    { number: '3002', name: 'Försäljning varor 12% moms', type: 'intäkt' },
    { number: '3003', name: 'Försäljning varor 6% moms', type: 'intäkt' },
    { number: '3010', name: 'Försäljning tjänster', type: 'intäkt' },
    { number: '3011', name: 'Försäljning tjänster 25% moms', type: 'intäkt' },
    { number: '3040', name: 'Försäljning tjänster utland', type: 'intäkt' },
    { number: '3590', name: 'Övriga sidointäkter', type: 'intäkt' },
    { number: '3740', name: 'Öresutjämning', type: 'intäkt' },
    { number: '3960', name: 'Valutakursvinster', type: 'intäkt' },
    { number: '8310', name: 'Ränteintäkter', type: 'intäkt' },

    // Kostnader (4000-8999)
    { number: '4000', name: 'Inköp varor och material', type: 'kostnad' },
    { number: '4010', name: 'Inköp varor 25% moms', type: 'kostnad' },
    { number: '4531', name: 'Import av varor EU', type: 'kostnad' },
    { number: '5010', name: 'Lokalhyra', type: 'kostnad' },
    { number: '5020', name: 'El för lokaler', type: 'kostnad' },
    { number: '5060', name: 'Städning och renhållning', type: 'kostnad' },
    { number: '5090', name: 'Övriga lokalkostnader', type: 'kostnad' },
    { number: '5200', name: 'Hyra av anläggningstillgångar', type: 'kostnad' },
    { number: '5400', name: 'Förbrukningsinventarier', type: 'kostnad' },
    { number: '5410', name: 'Förbrukningsinventarier', type: 'kostnad' },
    { number: '5460', name: 'Förbrukningsmaterial', type: 'kostnad' },
    { number: '5480', name: 'Arbetskläder och skyddsmaterial', type: 'kostnad' },
    { number: '5500', name: 'Reparation och underhåll', type: 'kostnad' },
    { number: '5610', name: 'Kontorsmateriel', type: 'kostnad' },
    { number: '5800', name: 'Resekostnader', type: 'kostnad' },
    { number: '5810', name: 'Biljetter', type: 'kostnad' },
    { number: '5830', name: 'Hotell och logi', type: 'kostnad' },
    { number: '5890', name: 'Övriga resekostnader', type: 'kostnad' },
    { number: '5900', name: 'Reklam och PR', type: 'kostnad' },
    { number: '5910', name: 'Annonsering', type: 'kostnad' },
    { number: '6000', name: 'Övriga försäljningskostnader', type: 'kostnad' },
    { number: '6070', name: 'Representation', type: 'kostnad' },
    { number: '6071', name: 'Representation, avdragsgill', type: 'kostnad' },
    { number: '6072', name: 'Representation, ej avdragsgill', type: 'kostnad' },
    { number: '6110', name: 'Kontorsmaterial', type: 'kostnad' },
    { number: '6200', name: 'Telefon och kommunikation', type: 'kostnad' },
    { number: '6210', name: 'Telefon', type: 'kostnad' },
    { number: '6211', name: 'Fast telefoni', type: 'kostnad' },
    { number: '6212', name: 'Mobiltelefon', type: 'kostnad' },
    { number: '6230', name: 'Datakommunikation', type: 'kostnad' },
    { number: '6250', name: 'Postbefordran', type: 'kostnad' },
    { number: '6310', name: 'Företagsförsäkringar', type: 'kostnad' },
    { number: '6410', name: 'Styrelsearvoden', type: 'kostnad' },
    { number: '6420', name: 'Ersättningar till revisor', type: 'kostnad' },
    { number: '6530', name: 'Redovisningstjänster', type: 'kostnad' },
    { number: '6540', name: 'IT-tjänster', type: 'kostnad' },
    { number: '6550', name: 'Konsultarvoden', type: 'kostnad' },
    { number: '6570', name: 'Bankkostnader', type: 'kostnad' },
    { number: '6990', name: 'Övriga externa kostnader', type: 'kostnad' },
    { number: '7010', name: 'Löner tjänstemän', type: 'kostnad' },
    { number: '7210', name: 'Löner kollektivanställda', type: 'kostnad' },
    { number: '7510', name: 'Arbetsgivaravgifter', type: 'kostnad' },
    { number: '7519', name: 'Sociala avgifter för semester', type: 'kostnad' },
    { number: '7610', name: 'Utbildning', type: 'kostnad' },
    { number: '7690', name: 'Övriga personalkostnader', type: 'kostnad' },
    { number: '7810', name: 'Avskrivningar byggnader', type: 'kostnad' },
    { number: '7820', name: 'Avskrivningar maskiner', type: 'kostnad' },
    { number: '7830', name: 'Avskrivningar inventarier', type: 'kostnad' },
    { number: '7832', name: 'Avskrivningar datorer', type: 'kostnad' },
    { number: '8310', name: 'Ränteintäkter', type: 'intäkt' },
    { number: '8410', name: 'Räntekostnader', type: 'kostnad' },
    { number: '8910', name: 'Skatt på årets resultat', type: 'kostnad' },
  ];

  const stmt = db.prepare('INSERT OR IGNORE INTO accounts (account_number, name, type) VALUES (?, ?, ?)');

  for (const account of accounts) {
    stmt.run(account.number, account.name, account.type);
  }
}

// Account operations
export function getAllAccounts() {
  const db = getDatabase();
  return db.prepare('SELECT * FROM accounts ORDER BY account_number').all();
}

export function getAccountById(id: number) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
}

export function createAccount(accountNumber: string, name: string, type: string) {
  const db = getDatabase();
  const result = db.prepare('INSERT INTO accounts (account_number, name, type) VALUES (?, ?, ?)').run(accountNumber, name, type);
  return { id: result.lastInsertRowid, accountNumber, name, type };
}

export function updateAccount(id: number, accountNumber: string, name: string, type: string) {
  const db = getDatabase();
  db.prepare('UPDATE accounts SET account_number = ?, name = ?, type = ? WHERE id = ?').run(accountNumber, name, type, id);
  return { id, accountNumber, name, type };
}

export function deleteAccount(id: number) {
  const db = getDatabase();
  db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
  return { success: true };
}

// Transaction operations
export function getAllTransactions() {
  const db = getDatabase();
  return db.prepare(`
    SELECT t.*,
           json_group_array(
             json_object(
               'id', tl.id,
               'account_id', tl.account_id,
               'account_number', a.account_number,
               'account_name', a.name,
               'debit', tl.debit,
               'credit', tl.credit
             )
           ) as lines
    FROM transactions t
    LEFT JOIN transaction_lines tl ON t.id = tl.transaction_id
    LEFT JOIN accounts a ON tl.account_id = a.id
    GROUP BY t.id
    ORDER BY t.date DESC, t.id DESC
  `).all().map((row: unknown) => {
    const r = row as { lines: string };
    return {
      ...r,
      lines: JSON.parse(r.lines).filter((l: { id: number | null }) => l.id !== null)
    };
  });
}

export function getTransactionById(id: number) {
  const db = getDatabase();
  const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  if (!transaction) return null;

  const lines = db.prepare(`
    SELECT tl.*, a.account_number, a.name as account_name
    FROM transaction_lines tl
    JOIN accounts a ON tl.account_id = a.id
    WHERE tl.transaction_id = ?
  `).all(id);

  return { ...(transaction as object), lines };
}

export function createTransaction(date: string, description: string, lines: Array<{ accountId: number; debit: number; credit: number }>) {
  const db = getDatabase();

  const result = db.prepare('INSERT INTO transactions (date, description) VALUES (?, ?)').run(date, description);
  const transactionId = result.lastInsertRowid;

  const lineStmt = db.prepare('INSERT INTO transaction_lines (transaction_id, account_id, debit, credit) VALUES (?, ?, ?, ?)');

  for (const line of lines) {
    lineStmt.run(transactionId, line.accountId, line.debit, line.credit);
  }

  return getTransactionById(Number(transactionId));
}

export function updateTransaction(id: number, date: string, description: string, lines: Array<{ accountId: number; debit: number; credit: number }>) {
  const db = getDatabase();

  db.prepare('UPDATE transactions SET date = ?, description = ? WHERE id = ?').run(date, description, id);
  db.prepare('DELETE FROM transaction_lines WHERE transaction_id = ?').run(id);

  const lineStmt = db.prepare('INSERT INTO transaction_lines (transaction_id, account_id, debit, credit) VALUES (?, ?, ?, ?)');

  for (const line of lines) {
    lineStmt.run(id, line.accountId, line.debit, line.credit);
  }

  return getTransactionById(id);
}

export function deleteTransaction(id: number) {
  const db = getDatabase();
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  return { success: true };
}

// Report operations
export function getBalanceReport() {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      a.id,
      a.account_number,
      a.name,
      a.type,
      COALESCE(SUM(tl.debit), 0) as total_debit,
      COALESCE(SUM(tl.credit), 0) as total_credit,
      COALESCE(SUM(tl.debit), 0) - COALESCE(SUM(tl.credit), 0) as balance
    FROM accounts a
    LEFT JOIN transaction_lines tl ON a.id = tl.account_id
    GROUP BY a.id
    HAVING balance != 0
    ORDER BY a.account_number
  `).all();
}

export function getIncomeStatement(startDate?: string, endDate?: string) {
  const db = getDatabase();
  let query = `
    SELECT
      a.id,
      a.account_number,
      a.name,
      a.type,
      COALESCE(SUM(tl.debit), 0) as total_debit,
      COALESCE(SUM(tl.credit), 0) as total_credit
    FROM accounts a
    LEFT JOIN transaction_lines tl ON a.id = tl.account_id
    LEFT JOIN transactions t ON tl.transaction_id = t.id
    WHERE a.type IN ('intäkt', 'kostnad')
  `;

  const params: string[] = [];
  if (startDate) {
    query += ' AND t.date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND t.date <= ?';
    params.push(endDate);
  }

  query += ' GROUP BY a.id ORDER BY a.account_number';

  return db.prepare(query).all(...params);
}

export function getDashboardStats() {
  const db = getDatabase();

  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;
  const endOfYear = `${currentYear}-12-31`;

  const income = db.prepare(`
    SELECT COALESCE(SUM(tl.credit) - SUM(tl.debit), 0) as total
    FROM transaction_lines tl
    JOIN accounts a ON tl.account_id = a.id
    JOIN transactions t ON tl.transaction_id = t.id
    WHERE a.type = 'intäkt' AND t.date >= ? AND t.date <= ?
  `).get(startOfYear, endOfYear) as { total: number };

  const expenses = db.prepare(`
    SELECT COALESCE(SUM(tl.debit) - SUM(tl.credit), 0) as total
    FROM transaction_lines tl
    JOIN accounts a ON tl.account_id = a.id
    JOIN transactions t ON tl.transaction_id = t.id
    WHERE a.type = 'kostnad' AND t.date >= ? AND t.date <= ?
  `).get(startOfYear, endOfYear) as { total: number };

  const transactionCount = db.prepare(`
    SELECT COUNT(*) as count FROM transactions WHERE date >= ? AND date <= ?
  `).get(startOfYear, endOfYear) as { count: number };

  const recentTransactions = db.prepare(`
    SELECT t.*,
           json_group_array(
             json_object(
               'id', tl.id,
               'account_number', a.account_number,
               'account_name', a.name,
               'debit', tl.debit,
               'credit', tl.credit
             )
           ) as lines
    FROM transactions t
    LEFT JOIN transaction_lines tl ON t.id = tl.transaction_id
    LEFT JOIN accounts a ON tl.account_id = a.id
    GROUP BY t.id
    ORDER BY t.date DESC, t.id DESC
    LIMIT 5
  `).all().map((row: unknown) => {
    const r = row as { lines: string };
    return {
      ...r,
      lines: JSON.parse(r.lines).filter((l: { id: number | null }) => l.id !== null)
    };
  });

  return {
    income: income.total,
    expenses: expenses.total,
    result: income.total - expenses.total,
    transactionCount: transactionCount.count,
    recentTransactions
  };
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
