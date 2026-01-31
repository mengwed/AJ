import { getDatabase } from './database.js';

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

export function getAllCustomers(): Customer[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM customers ORDER BY name').all() as Customer[];
}

export function getCustomerById(id: number): Customer | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer | undefined;
}

export function searchCustomers(query: string): Customer[] {
  const db = getDatabase();
  const searchPattern = `%${query}%`;
  return db.prepare(`
    SELECT * FROM customers
    WHERE name LIKE ? OR org_number LIKE ? OR email LIKE ?
    ORDER BY name
  `).all(searchPattern, searchPattern, searchPattern) as Customer[];
}

export function findCustomerByOrgNumber(orgNumber: string): Customer | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM customers WHERE org_number = ?').get(orgNumber) as Customer | undefined;
}

export function createCustomer(data: CustomerInput): Customer {
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO customers (name, org_number, address, postal_code, city, email, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.name,
    data.org_number || null,
    data.address || null,
    data.postal_code || null,
    data.city || null,
    data.email || null,
    data.phone || null
  );
  return getCustomerById(Number(result.lastInsertRowid))!;
}

export function updateCustomer(id: number, data: CustomerInput): Customer {
  const db = getDatabase();
  db.prepare(`
    UPDATE customers
    SET name = ?, org_number = ?, address = ?, postal_code = ?, city = ?, email = ?, phone = ?
    WHERE id = ?
  `).run(
    data.name,
    data.org_number || null,
    data.address || null,
    data.postal_code || null,
    data.city || null,
    data.email || null,
    data.phone || null,
    id
  );
  return getCustomerById(id)!;
}

export interface CustomerDeletionCheck {
  canDelete: boolean;
  invoiceCount: number;
  paymentCount: number;
  invoiceYears: number[];
  paymentYears: number[];
}

export function checkCustomerDeletion(id: number): CustomerDeletionCheck {
  const db = getDatabase();

  // Kolla kundfakturor
  const invoices = db.prepare(`
    SELECT COUNT(*) as count, GROUP_CONCAT(DISTINCT fy.year) as years
    FROM customer_invoices ci
    JOIN fiscal_years fy ON ci.fiscal_year_id = fy.id
    WHERE ci.customer_id = ?
  `).get(id) as { count: number; years: string | null };

  // Kolla kundbetalningar
  const payments = db.prepare(`
    SELECT COUNT(*) as count, GROUP_CONCAT(DISTINCT fy.year) as years
    FROM customer_payments cp
    JOIN fiscal_years fy ON cp.fiscal_year_id = fy.id
    WHERE cp.customer_id = ?
  `).get(id) as { count: number; years: string | null };

  const invoiceYears = invoices.years ? invoices.years.split(',').map(Number) : [];
  const paymentYears = payments.years ? payments.years.split(',').map(Number) : [];

  return {
    canDelete: invoices.count === 0 && payments.count === 0,
    invoiceCount: invoices.count,
    paymentCount: payments.count,
    invoiceYears,
    paymentYears
  };
}

export function deleteCustomer(id: number, force: boolean = false): { success: boolean; message?: string } {
  const db = getDatabase();

  const check = checkCustomerDeletion(id);

  if (!check.canDelete && !force) {
    const parts: string[] = [];
    if (check.invoiceCount > 0) {
      parts.push(`${check.invoiceCount} faktura/or (år: ${check.invoiceYears.join(', ')})`);
    }
    if (check.paymentCount > 0) {
      parts.push(`${check.paymentCount} betalning/ar (år: ${check.paymentYears.join(', ')})`);
    }
    throw new Error(`Kunden har kopplingar: ${parts.join(', ')}. Använd tvingad borttagning för att ta bort ändå.`);
  }

  if (force) {
    // Sätt customer_id till NULL på relaterade poster istället för att blockera
    db.prepare('UPDATE customer_invoices SET customer_id = NULL WHERE customer_id = ?').run(id);
    db.prepare('UPDATE customer_payments SET customer_id = NULL WHERE customer_id = ?').run(id);
  }

  db.prepare('DELETE FROM customers WHERE id = ?').run(id);
  return { success: true };
}

/**
 * Normalisera kundnamn för jämförelse
 */
function normalizeCustomerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+(ab|hb|kb|ltd|as|a\/s|aktiebolag)\b/gi, '')
    .replace(/[-_&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrahera kärnnamnet för matchning
 */
function extractCustomerCoreName(name: string): string {
  const normalized = normalizeCustomerName(name);
  const words = normalized.split(' ').filter(w => w.length > 1);
  return words.slice(0, 2).join(' ');
}

/**
 * Hitta kund baserat på org.nummer eller namn, eller skapa en ny
 */
export function findOrCreateCustomer(name: string, orgNumber?: string): number {
  const db = getDatabase();

  // Normalisera org.nummer (ta bort bindestreck för jämförelse)
  const normalizedOrgNumber = orgNumber?.replace(/-/g, '') || null;

  // 1. Sök först på org.nummer om det finns
  if (normalizedOrgNumber) {
    const byOrgNumber = db.prepare(`
      SELECT * FROM customers
      WHERE REPLACE(org_number, '-', '') = ?
    `).get(normalizedOrgNumber) as Customer | undefined;

    if (byOrgNumber) {
      return byOrgNumber.id;
    }
  }

  // 2. Sök på exakt namn
  const byExactName = db.prepare(`
    SELECT * FROM customers WHERE LOWER(name) = LOWER(?)
  `).get(name) as Customer | undefined;

  if (byExactName) {
    return byExactName.id;
  }

  // 3. Sök på normaliserat namn
  const normalizedName = normalizeCustomerName(name);
  const allCustomers = db.prepare('SELECT * FROM customers').all() as Customer[];

  for (const customer of allCustomers) {
    const normalizedExisting = normalizeCustomerName(customer.name);
    if (normalizedExisting === normalizedName) {
      return customer.id;
    }
  }

  // 4. Sök på kärnnamn
  const coreName = extractCustomerCoreName(name);
  if (coreName.length >= 3) {
    for (const customer of allCustomers) {
      const existingCore = extractCustomerCoreName(customer.name);
      if (existingCore === coreName) {
        return customer.id;
      }
      if (existingCore.length >= 3 && coreName.length >= 3) {
        if (existingCore.startsWith(coreName) || coreName.startsWith(existingCore)) {
          return customer.id;
        }
      }
    }
  }

  // 5. Skapa ny kund
  const formattedOrgNumber = orgNumber || null;
  const result = db.prepare(`
    INSERT INTO customers (name, org_number)
    VALUES (?, ?)
  `).run(name, formattedOrgNumber);

  return Number(result.lastInsertRowid);
}
