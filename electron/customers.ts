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

export function deleteCustomer(id: number): { success: boolean } {
  const db = getDatabase();
  // Check if customer has invoices
  const invoiceCount = db.prepare('SELECT COUNT(*) as count FROM customer_invoices WHERE customer_id = ?').get(id) as { count: number };

  if (invoiceCount.count > 0) {
    throw new Error('Cannot delete customer with associated invoices');
  }

  db.prepare('DELETE FROM customers WHERE id = ?').run(id);
  return { success: true };
}
