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
  category_id: number | null;
  category_name?: string;
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
  category_id?: number | null;
}

export function getAllSuppliers(): Supplier[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT s.*, c.name as category_name
    FROM suppliers s
    LEFT JOIN categories c ON s.category_id = c.id
    ORDER BY s.name
  `).all() as Supplier[];
}

export function getSupplierById(id: number): Supplier | undefined {
  const db = getDatabase();
  return db.prepare(`
    SELECT s.*, c.name as category_name
    FROM suppliers s
    LEFT JOIN categories c ON s.category_id = c.id
    WHERE s.id = ?
  `).get(id) as Supplier | undefined;
}

export function searchSuppliers(query: string): Supplier[] {
  const db = getDatabase();
  const searchPattern = `%${query}%`;
  return db.prepare(`
    SELECT s.*, c.name as category_name
    FROM suppliers s
    LEFT JOIN categories c ON s.category_id = c.id
    WHERE s.name LIKE ? OR s.org_number LIKE ? OR s.email LIKE ?
    ORDER BY s.name
  `).all(searchPattern, searchPattern, searchPattern) as Supplier[];
}

export function findSupplierByOrgNumber(orgNumber: string): Supplier | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM suppliers WHERE org_number = ?').get(orgNumber) as Supplier | undefined;
}

export function createSupplier(data: SupplierInput): Supplier {
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO suppliers (name, org_number, address, postal_code, city, email, phone, category_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.name,
    data.org_number || null,
    data.address || null,
    data.postal_code || null,
    data.city || null,
    data.email || null,
    data.phone || null,
    data.category_id || null
  );
  return getSupplierById(Number(result.lastInsertRowid))!;
}

export function updateSupplier(id: number, data: SupplierInput): Supplier {
  const db = getDatabase();
  db.prepare(`
    UPDATE suppliers
    SET name = ?, org_number = ?, address = ?, postal_code = ?, city = ?, email = ?, phone = ?, category_id = ?
    WHERE id = ?
  `).run(
    data.name,
    data.org_number || null,
    data.address || null,
    data.postal_code || null,
    data.city || null,
    data.email || null,
    data.phone || null,
    data.category_id !== undefined ? data.category_id : null,
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

/**
 * Normalisera leverantörsnamn för jämförelse
 * Tar bort suffix som AB, HB, månader, etc.
 */
function normalizeSupplierName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+(ab|hb|kb|ltd|as|a\/s|aktiebolag)\b/gi, '') // Ta bort bolagsformer
    .replace(/\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\b/gi, '') // Månader
    .replace(/\s+(jan|feb|mar|apr|jun|jul|aug|sep|okt|nov|dec)\b/gi, '') // Korta månader
    .replace(/\s+[a-z]$/gi, '') // Enstaka bokstav i slutet (t.ex. "F")
    .replace(/\s+(kvitto|utlägg|faktura|bokfo|bokföring)\b/gi, '') // Fakturarelaterade ord
    .replace(/[-_&]/g, ' ') // Bindestreck till mellanslag
    .replace(/\s+/g, ' ') // Normalisera whitespace
    .trim();
}

/**
 * Extrahera kärnnamnet (första 1-2 orden) för matchning
 */
function extractCoreName(name: string): string {
  const normalized = normalizeSupplierName(name);
  const words = normalized.split(' ').filter(w => w.length > 1);
  // Ta max 2 första orden för matchning
  return words.slice(0, 2).join(' ');
}

/**
 * Hitta leverantör baserat på org.nummer eller namn, eller skapa en ny
 */
export function findOrCreateSupplier(name: string, orgNumber?: string): number {
  const db = getDatabase();

  // Normalisera org.nummer (ta bort bindestreck för jämförelse)
  const normalizedOrgNumber = orgNumber?.replace(/-/g, '') || null;

  // 1. Sök först på org.nummer om det finns
  if (normalizedOrgNumber) {
    const byOrgNumber = db.prepare(`
      SELECT * FROM suppliers
      WHERE REPLACE(org_number, '-', '') = ?
    `).get(normalizedOrgNumber) as Supplier | undefined;

    if (byOrgNumber) {
      return byOrgNumber.id;
    }
  }

  // 2. Sök på exakt namn
  const byExactName = db.prepare(`
    SELECT * FROM suppliers WHERE LOWER(name) = LOWER(?)
  `).get(name) as Supplier | undefined;

  if (byExactName) {
    return byExactName.id;
  }

  // 3. Sök på normaliserat namn
  const normalizedName = normalizeSupplierName(name);
  const allSuppliers = db.prepare('SELECT * FROM suppliers').all() as Supplier[];

  for (const supplier of allSuppliers) {
    const normalizedExisting = normalizeSupplierName(supplier.name);
    // Exakt match på normaliserat namn
    if (normalizedExisting === normalizedName) {
      return supplier.id;
    }
  }

  // 4. Sök på kärnnamn (första 1-2 orden)
  const coreName = extractCoreName(name);
  if (coreName.length >= 3) {
    for (const supplier of allSuppliers) {
      const existingCore = extractCoreName(supplier.name);
      if (existingCore === coreName) {
        return supplier.id;
      }
      // Kolla om ena innehåller den andra
      if (existingCore.length >= 3 && coreName.length >= 3) {
        if (existingCore.startsWith(coreName) || coreName.startsWith(existingCore)) {
          return supplier.id;
        }
      }
    }
  }

  // 5. Skapa ny leverantör
  const formattedOrgNumber = orgNumber || null;
  const result = db.prepare(`
    INSERT INTO suppliers (name, org_number)
    VALUES (?, ?)
  `).run(name, formattedOrgNumber);

  return Number(result.lastInsertRowid);
}
