import { getDatabase } from './database.js';
import { dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';

// Regex pattern for customer invoices: YYYY-MM-DD Faktura...
const CUSTOMER_INVOICE_PATTERN = /^\d{4}-\d{2}-\d{2}\s+[Ff]aktura/;

export interface InvoiceFolder {
  id: number;
  path: string;
  last_scanned: string | null;
  created_at: string;
}

export interface CustomerInvoice {
  id: number;
  fiscal_year_id: number;
  customer_id: number | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  amount: number | null;
  vat: number | null;
  total: number | null;
  file_path: string;
  file_name: string;
  parsed_content: string | null;
  status: string;
  created_at: string;
  customer_name?: string;
}

export interface SupplierInvoice {
  id: number;
  fiscal_year_id: number;
  supplier_id: number | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  amount: number | null;
  vat: number | null;
  total: number | null;
  file_path: string;
  file_name: string;
  parsed_content: string | null;
  status: string;
  payment_date: string | null;
  created_at: string;
  supplier_name?: string;
}

export interface ImportResult {
  customerInvoices: number;
  supplierInvoices: number;
  skipped: number;
  errors: string[];
}

// Invoice Folder Operations
export function getAllInvoiceFolders(): InvoiceFolder[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM invoice_folders ORDER BY path').all() as InvoiceFolder[];
}

export function addInvoiceFolder(folderPath: string): InvoiceFolder {
  const db = getDatabase();
  const result = db.prepare('INSERT INTO invoice_folders (path) VALUES (?)').run(folderPath);
  return db.prepare('SELECT * FROM invoice_folders WHERE id = ?').get(result.lastInsertRowid) as InvoiceFolder;
}

export function removeInvoiceFolder(id: number): { success: boolean } {
  const db = getDatabase();
  db.prepare('DELETE FROM invoice_folders WHERE id = ?').run(id);
  return { success: true };
}

export async function selectFolder(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Välj mapp med fakturor',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

// PDF Parsing
async function parsePdf(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

function isCustomerInvoice(fileName: string): boolean {
  return CUSTOMER_INVOICE_PATTERN.test(fileName);
}

function extractDateFromFilename(fileName: string): string | null {
  const match = fileName.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

// Customer Invoice Operations
export function getCustomerInvoices(fiscalYearId: number): CustomerInvoice[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT ci.*, c.name as customer_name
    FROM customer_invoices ci
    LEFT JOIN customers c ON ci.customer_id = c.id
    WHERE ci.fiscal_year_id = ?
    ORDER BY ci.invoice_date DESC, ci.id DESC
  `).all(fiscalYearId) as CustomerInvoice[];
}

export function getCustomerInvoiceById(id: number): CustomerInvoice | undefined {
  const db = getDatabase();
  return db.prepare(`
    SELECT ci.*, c.name as customer_name
    FROM customer_invoices ci
    LEFT JOIN customers c ON ci.customer_id = c.id
    WHERE ci.id = ?
  `).get(id) as CustomerInvoice | undefined;
}

export function updateCustomerInvoice(
  id: number,
  data: {
    customer_id?: number | null;
    invoice_number?: string;
    invoice_date?: string;
    due_date?: string;
    amount?: number;
    vat?: number;
    total?: number;
    status?: string;
  }
): CustomerInvoice {
  const db = getDatabase();
  const current = getCustomerInvoiceById(id);
  if (!current) throw new Error('Invoice not found');

  db.prepare(`
    UPDATE customer_invoices
    SET customer_id = ?, invoice_number = ?, invoice_date = ?, due_date = ?,
        amount = ?, vat = ?, total = ?, status = ?
    WHERE id = ?
  `).run(
    data.customer_id !== undefined ? data.customer_id : current.customer_id,
    data.invoice_number !== undefined ? data.invoice_number : current.invoice_number,
    data.invoice_date !== undefined ? data.invoice_date : current.invoice_date,
    data.due_date !== undefined ? data.due_date : current.due_date,
    data.amount !== undefined ? data.amount : current.amount,
    data.vat !== undefined ? data.vat : current.vat,
    data.total !== undefined ? data.total : current.total,
    data.status !== undefined ? data.status : current.status,
    id
  );

  return getCustomerInvoiceById(id)!;
}

export function deleteCustomerInvoice(id: number): { success: boolean } {
  const db = getDatabase();
  db.prepare('DELETE FROM customer_invoices WHERE id = ?').run(id);
  return { success: true };
}

// Supplier Invoice Operations
export function getSupplierInvoices(fiscalYearId: number): SupplierInvoice[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT si.*, s.name as supplier_name
    FROM supplier_invoices si
    LEFT JOIN suppliers s ON si.supplier_id = s.id
    WHERE si.fiscal_year_id = ?
    ORDER BY si.invoice_date DESC, si.id DESC
  `).all(fiscalYearId) as SupplierInvoice[];
}

export function getSupplierInvoiceById(id: number): SupplierInvoice | undefined {
  const db = getDatabase();
  return db.prepare(`
    SELECT si.*, s.name as supplier_name
    FROM supplier_invoices si
    LEFT JOIN suppliers s ON si.supplier_id = s.id
    WHERE si.id = ?
  `).get(id) as SupplierInvoice | undefined;
}

export function updateSupplierInvoice(
  id: number,
  data: {
    supplier_id?: number | null;
    invoice_number?: string;
    invoice_date?: string;
    due_date?: string;
    amount?: number;
    vat?: number;
    total?: number;
    status?: string;
    payment_date?: string | null;
  }
): SupplierInvoice {
  const db = getDatabase();
  const current = getSupplierInvoiceById(id);
  if (!current) throw new Error('Invoice not found');

  db.prepare(`
    UPDATE supplier_invoices
    SET supplier_id = ?, invoice_number = ?, invoice_date = ?, due_date = ?,
        amount = ?, vat = ?, total = ?, status = ?, payment_date = ?
    WHERE id = ?
  `).run(
    data.supplier_id !== undefined ? data.supplier_id : current.supplier_id,
    data.invoice_number !== undefined ? data.invoice_number : current.invoice_number,
    data.invoice_date !== undefined ? data.invoice_date : current.invoice_date,
    data.due_date !== undefined ? data.due_date : current.due_date,
    data.amount !== undefined ? data.amount : current.amount,
    data.vat !== undefined ? data.vat : current.vat,
    data.total !== undefined ? data.total : current.total,
    data.status !== undefined ? data.status : current.status,
    data.payment_date !== undefined ? data.payment_date : current.payment_date,
    id
  );

  return getSupplierInvoiceById(id)!;
}

export function deleteSupplierInvoice(id: number): { success: boolean } {
  const db = getDatabase();
  db.prepare('DELETE FROM supplier_invoices WHERE id = ?').run(id);
  return { success: true };
}

// Import Operations
function isAlreadyImported(filePath: string): boolean {
  const db = getDatabase();
  const customerCount = db.prepare('SELECT COUNT(*) as count FROM customer_invoices WHERE file_path = ?').get(filePath) as { count: number };
  const supplierCount = db.prepare('SELECT COUNT(*) as count FROM supplier_invoices WHERE file_path = ?').get(filePath) as { count: number };
  return customerCount.count > 0 || supplierCount.count > 0;
}

export async function scanAndImportFolder(folderId: number, fiscalYearId: number): Promise<ImportResult> {
  const db = getDatabase();
  const folder = db.prepare('SELECT * FROM invoice_folders WHERE id = ?').get(folderId) as InvoiceFolder | undefined;

  if (!folder) {
    throw new Error('Folder not found');
  }

  const result: ImportResult = {
    customerInvoices: 0,
    supplierInvoices: 0,
    skipped: 0,
    errors: [],
  };

  const files = fs.readdirSync(folder.path);
  const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

  for (const fileName of pdfFiles) {
    const filePath = path.join(folder.path, fileName);

    // Skip already imported files
    if (isAlreadyImported(filePath)) {
      result.skipped++;
      continue;
    }

    try {
      const parsedContent = await parsePdf(filePath);
      const invoiceDate = extractDateFromFilename(fileName);

      if (isCustomerInvoice(fileName)) {
        // Import as customer invoice
        db.prepare(`
          INSERT INTO customer_invoices (fiscal_year_id, file_path, file_name, parsed_content, invoice_date, status)
          VALUES (?, ?, ?, ?, ?, 'imported')
        `).run(fiscalYearId, filePath, fileName, parsedContent, invoiceDate);
        result.customerInvoices++;
      } else {
        // Import as supplier invoice
        db.prepare(`
          INSERT INTO supplier_invoices (fiscal_year_id, file_path, file_name, parsed_content, invoice_date, status)
          VALUES (?, ?, ?, ?, ?, 'imported')
        `).run(fiscalYearId, filePath, fileName, parsedContent, invoiceDate);
        result.supplierInvoices++;
      }
    } catch (error) {
      result.errors.push(`${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update last scanned timestamp
  db.prepare('UPDATE invoice_folders SET last_scanned = datetime("now") WHERE id = ?').run(folderId);

  return result;
}

export async function importSingleFile(filePath: string, fiscalYearId: number): Promise<{ type: 'customer' | 'supplier'; invoice: CustomerInvoice | SupplierInvoice }> {
  const db = getDatabase();
  const fileName = path.basename(filePath);

  if (isAlreadyImported(filePath)) {
    throw new Error('File is already imported');
  }

  const parsedContent = await parsePdf(filePath);
  const invoiceDate = extractDateFromFilename(fileName);

  if (isCustomerInvoice(fileName)) {
    const result = db.prepare(`
      INSERT INTO customer_invoices (fiscal_year_id, file_path, file_name, parsed_content, invoice_date, status)
      VALUES (?, ?, ?, ?, ?, 'imported')
    `).run(fiscalYearId, filePath, fileName, parsedContent, invoiceDate);

    return {
      type: 'customer',
      invoice: getCustomerInvoiceById(Number(result.lastInsertRowid))!,
    };
  } else {
    const result = db.prepare(`
      INSERT INTO supplier_invoices (fiscal_year_id, file_path, file_name, parsed_content, invoice_date, status)
      VALUES (?, ?, ?, ?, ?, 'imported')
    `).run(fiscalYearId, filePath, fileName, parsedContent, invoiceDate);

    return {
      type: 'supplier',
      invoice: getSupplierInvoiceById(Number(result.lastInsertRowid))!,
    };
  }
}

export async function selectAndImportFiles(fiscalYearId: number): Promise<ImportResult> {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    title: 'Välj PDF-fakturor att importera',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { customerInvoices: 0, supplierInvoices: 0, skipped: 0, errors: [] };
  }

  const importResult: ImportResult = {
    customerInvoices: 0,
    supplierInvoices: 0,
    skipped: 0,
    errors: [],
  };

  for (const filePath of result.filePaths) {
    try {
      const imported = await importSingleFile(filePath, fiscalYearId);
      if (imported.type === 'customer') {
        importResult.customerInvoices++;
      } else {
        importResult.supplierInvoices++;
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'File is already imported') {
        importResult.skipped++;
      } else {
        importResult.errors.push(`${path.basename(filePath)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  return importResult;
}

// Open PDF file in default application
export function openInvoiceFile(filePath: string): void {
  const { shell } = require('electron');
  shell.openPath(filePath);
}

// ========== Year Folder Import ==========

export interface MonthFolderInfo {
  name: string;
  path: string;
  monthNumber: number | null;
  pdfCount: number;
}

export interface YearFolderPreview {
  folderPath: string;
  folderName: string;
  detectedYear: number | null;
  monthFolders: MonthFolderInfo[];
  rootPdfCount: number;
  totalPdfCount: number;
}

export interface MonthImportResult {
  folderName: string;
  monthNumber: number | null;
  imported: number;
  skipped: number;
  errors: string[];
}

export interface YearImportResult {
  year: number;
  fiscalYearId: number;
  fiscalYearCreated: boolean;
  monthResults: MonthImportResult[];
  rootResult: MonthImportResult | null;
  totalImported: number;
  totalSkipped: number;
  totalErrors: string[];
}

// Svenska månadsnamn för mappidentifiering
const SWEDISH_MONTHS: Record<string, number> = {
  'januari': 1, 'jan': 1,
  'februari': 2, 'feb': 2,
  'mars': 3, 'mar': 3,
  'april': 4, 'apr': 4,
  'maj': 5,
  'juni': 6, 'jun': 6,
  'juli': 7, 'jul': 7,
  'augusti': 8, 'aug': 8,
  'september': 9, 'sep': 9, 'sept': 9,
  'oktober': 10, 'okt': 10,
  'november': 11, 'nov': 11,
  'december': 12, 'dec': 12,
};

/**
 * Extrahera år från mappnamn (t.ex. "2024", "Bokföring 2024", "2024-fakturor")
 */
export function extractYearFromFolderName(folderName: string): number | null {
  const match = folderName.match(/\b(20\d{2})\b/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extrahera månadsnummer från mappnamn
 * Stödjer: "01", "1", "2024-01", "01 Januari", "Januari", "jan", etc.
 */
export function extractMonthNumber(folderName: string): number | null {
  const lowerName = folderName.toLowerCase();

  // Försök hitta numeriskt prefix (01, 1, 2024-01, etc.)
  // Matchar: "01", "1", "2024-01", "01_", "01 ", etc.
  const numericMatch = folderName.match(/^(?:\d{4}[-_])?(\d{1,2})(?:\s|_|$|-|[a-zA-ZåäöÅÄÖ])/);
  if (numericMatch) {
    const month = parseInt(numericMatch[1], 10);
    if (month >= 1 && month <= 12) {
      return month;
    }
  }

  // Försök hitta svenskt månadsnamn
  for (const [monthName, monthNum] of Object.entries(SWEDISH_MONTHS)) {
    if (lowerName.includes(monthName)) {
      return monthNum;
    }
  }

  return null;
}

/**
 * Räkna antal PDF-filer i en mapp (ej rekursivt)
 */
function countPdfsInFolder(folderPath: string): number {
  try {
    const files = fs.readdirSync(folderPath);
    return files.filter(f => f.toLowerCase().endsWith('.pdf')).length;
  } catch {
    return 0;
  }
}

/**
 * Öppna dialog för att välja årsmapp
 */
export async function selectYearFolder(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Välj årsmapp med fakturor',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

/**
 * Skanna en årsmapp och returnera förhandsgranskningsdata
 */
export function scanYearFolder(folderPath: string): YearFolderPreview {
  const folderName = path.basename(folderPath);
  const detectedYear = extractYearFromFolderName(folderName);

  const entries = fs.readdirSync(folderPath, { withFileTypes: true });

  // Hitta undermappar (potentiella månadsmappar)
  const monthFolders: MonthFolderInfo[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subfolderPath = path.join(folderPath, entry.name);
      const monthNumber = extractMonthNumber(entry.name);
      const pdfCount = countPdfsInFolder(subfolderPath);

      monthFolders.push({
        name: entry.name,
        path: subfolderPath,
        monthNumber,
        pdfCount,
      });
    }
  }

  // Sortera efter månadsnummer (null sist)
  monthFolders.sort((a, b) => {
    if (a.monthNumber === null && b.monthNumber === null) return 0;
    if (a.monthNumber === null) return 1;
    if (b.monthNumber === null) return -1;
    return a.monthNumber - b.monthNumber;
  });

  // Räkna PDFer direkt i rotmappen
  const rootPdfCount = countPdfsInFolder(folderPath);

  // Totalt antal PDFer
  const totalPdfCount = rootPdfCount + monthFolders.reduce((sum, mf) => sum + mf.pdfCount, 0);

  return {
    folderPath,
    folderName,
    detectedYear,
    monthFolders,
    rootPdfCount,
    totalPdfCount,
  };
}

/**
 * Importera PDFer från en specifik mapp
 */
async function importFolderPdfs(
  folderPath: string,
  fiscalYearId: number,
  folderName: string,
  monthNumber: number | null
): Promise<MonthImportResult> {
  const result: MonthImportResult = {
    folderName,
    monthNumber,
    imported: 0,
    skipped: 0,
    errors: [],
  };

  const db = getDatabase();

  try {
    const files = fs.readdirSync(folderPath);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

    for (const fileName of pdfFiles) {
      const filePath = path.join(folderPath, fileName);

      // Hoppa över redan importerade filer
      if (isAlreadyImported(filePath)) {
        result.skipped++;
        continue;
      }

      try {
        const parsedContent = await parsePdf(filePath);
        const invoiceDate = extractDateFromFilename(fileName);

        if (isCustomerInvoice(fileName)) {
          db.prepare(`
            INSERT INTO customer_invoices (fiscal_year_id, file_path, file_name, parsed_content, invoice_date, status)
            VALUES (?, ?, ?, ?, ?, 'imported')
          `).run(fiscalYearId, filePath, fileName, parsedContent, invoiceDate);
        } else {
          db.prepare(`
            INSERT INTO supplier_invoices (fiscal_year_id, file_path, file_name, parsed_content, invoice_date, status)
            VALUES (?, ?, ?, ?, ?, 'imported')
          `).run(fiscalYearId, filePath, fileName, parsedContent, invoiceDate);
        }

        result.imported++;
      } catch (error) {
        result.errors.push(`${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  } catch (error) {
    result.errors.push(`Kunde inte läsa mapp: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Hitta eller skapa räkenskapsår
 */
function getOrCreateFiscalYear(year: number): { fiscalYear: { id: number; year: number }; created: boolean } {
  const db = getDatabase();

  // Kolla om året redan finns
  const existing = db.prepare('SELECT id, year FROM fiscal_years WHERE year = ?').get(year) as { id: number; year: number } | undefined;

  if (existing) {
    return { fiscalYear: existing, created: false };
  }

  // Skapa nytt år
  const result = db.prepare('INSERT INTO fiscal_years (year, is_active) VALUES (?, 0)').run(year);
  return {
    fiscalYear: { id: Number(result.lastInsertRowid), year },
    created: true,
  };
}

/**
 * Importera alla fakturor från en årsmapp
 */
export async function importYearFolder(
  folderPath: string,
  year: number
): Promise<YearImportResult> {
  // Hitta eller skapa räkenskapsår
  const { fiscalYear, created } = getOrCreateFiscalYear(year);

  const result: YearImportResult = {
    year,
    fiscalYearId: fiscalYear.id,
    fiscalYearCreated: created,
    monthResults: [],
    rootResult: null,
    totalImported: 0,
    totalSkipped: 0,
    totalErrors: [],
  };

  // Skanna mapstrukturen
  const preview = scanYearFolder(folderPath);

  // Importera från månadsmappar
  for (const monthFolder of preview.monthFolders) {
    const monthResult = await importFolderPdfs(
      monthFolder.path,
      fiscalYear.id,
      monthFolder.name,
      monthFolder.monthNumber
    );

    result.monthResults.push(monthResult);
    result.totalImported += monthResult.imported;
    result.totalSkipped += monthResult.skipped;
    result.totalErrors.push(...monthResult.errors);
  }

  // Importera från rotmappen om det finns PDFer där
  if (preview.rootPdfCount > 0) {
    const rootResult = await importFolderPdfs(
      folderPath,
      fiscalYear.id,
      '(rotmapp)',
      null
    );

    result.rootResult = rootResult;
    result.totalImported += rootResult.imported;
    result.totalSkipped += rootResult.skipped;
    result.totalErrors.push(...rootResult.errors);
  }

  return result;
}
