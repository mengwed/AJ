import { getDatabase } from './database.js';

export interface Supplier {
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

export interface SupplierInput {
  name: string;
  org_number?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  email?: string;
  phone?: string;
}

export function getAllSuppliers(): Supplier[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM suppliers ORDER BY name').all() as Supplier[];
}

export function getSupplierById(id: number): Supplier | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as Supplier | undefined;
}

export function searchSuppliers(query: string): Supplier[] {
  const db = getDatabase();
  const searchPattern = `%${query}%`;
  return db.prepare(`
    SELECT * FROM suppliers
    WHERE name LIKE ? OR org_number LIKE ? OR email LIKE ?
    ORDER BY name
  `).all(searchPattern, searchPattern, searchPattern) as Supplier[];
}

export function findSupplierByOrgNumber(orgNumber: string): Supplier | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM suppliers WHERE org_number = ?').get(orgNumber) as Supplier | undefined;
}

export function createSupplier(data: SupplierInput): Supplier {
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO suppliers (name, org_number, address, postal_code, city, email, phone)
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
  return getSupplierById(Number(result.lastInsertRowid))!;
}

export function updateSupplier(id: number, data: SupplierInput): Supplier {
  const db = getDatabase();
  db.prepare(`
    UPDATE suppliers
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
  return getSupplierById(id)!;
}

export function deleteSupplier(id: number): { success: boolean } {
  const db = getDatabase();
  // Check if supplier has invoices
  const invoiceCount = db.prepare('SELECT COUNT(*) as count FROM supplier_invoices WHERE supplier_id = ?').get(id) as { count: number };

  if (invoiceCount.count > 0) {
    throw new Error('Cannot delete supplier with associated invoices');
  }

  db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
  return { success: true };
}
