import { getDatabase } from './database.js';
import { dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';
import { findOrCreateSupplier } from './suppliers.js';
import { findOrCreateCustomer } from './customers.js';

// Regex pattern for customer invoices: YYYY-MM-DD Faktura [nummer/kundnamn]
// OBS: "Faktura" måste följas av mellanslag (inte "Fakturaportal" etc)
const CUSTOMER_INVOICE_PATTERN = /^\d{2,4}-\d{2}-\d{2}\s+[Ff]aktura\s+/;

// ========== Beloppsextraktion från PDF ==========

export interface ExtractedAmounts {
  amount: number | null;  // Belopp ex moms
  vat: number | null;     // Moms
  total: number | null;   // Total inkl moms
}

/**
 * Parsa nummerformat till number
 * Hanterar:
 * - Svenskt: "1 234,56" eller "1234,56" (komma = decimal)
 * - Internationellt: "1,234.56" eller "33,000.00" (punkt = decimal, komma = tusentals)
 * - Suffix: "kr", "SEK", ":-"
 */
function parseSwedishNumber(str: string): number | null {
  if (!str) return null;

  // Ta bort kr, SEK, :- och whitespace runt
  let cleaned = str
    .replace(/\s*(kr|sek|:-)\s*$/i, '')
    .trim();

  // Hantera negativt belopp
  const isNegative = cleaned.startsWith('-') || cleaned.startsWith('−');
  if (isNegative) {
    cleaned = cleaned.slice(1).trim();
  }

  // Avgör format baserat på position av komma och punkt
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma > -1 && lastDot > -1) {
    // Båda finns - den sista är decimaltecken
    if (lastDot > lastComma) {
      // Internationellt format: "1,234.56" - komma är tusentals, punkt är decimal
      cleaned = cleaned.replace(/,/g, '').replace(/\s/g, '');
    } else {
      // Svenskt format: "1.234,56" - punkt är tusentals, komma är decimal
      cleaned = cleaned.replace(/\./g, '').replace(/\s/g, '').replace(',', '.');
    }
  } else if (lastComma > -1) {
    // Bara komma finns
    const afterComma = cleaned.substring(lastComma + 1);
    if (afterComma.length === 3 && /^\d{3}$/.test(afterComma)) {
      // "33,000" - komma är tusentalsavgränsare (3 siffror efter)
      cleaned = cleaned.replace(/,/g, '').replace(/\s/g, '');
    } else {
      // "1234,56" - komma är decimaltecken
      cleaned = cleaned.replace(/\s/g, '').replace(',', '.');
    }
  } else if (lastDot > -1) {
    // Bara punkt finns
    const afterDot = cleaned.substring(lastDot + 1);
    if (afterDot.length === 3 && /^\d{3}$/.test(afterDot)) {
      // "1.234" - punkt är tusentalsavgränsare
      cleaned = cleaned.replace(/\./g, '').replace(/\s/g, '');
    } else {
      // "1234.56" - punkt är decimaltecken
      cleaned = cleaned.replace(/\s/g, '');
    }
  } else {
    // Varken komma eller punkt - bara ta bort mellanslag
    cleaned = cleaned.replace(/\s/g, '');
  }

  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;

  return isNegative ? -num : num;
}

/**
 * Extrahera belopp, moms och total från PDF-innehåll
 * Söker efter svenska mönster för fakturabelopp
 *
 * Nummermönster:
 * - Svenska tal kan ha mellanslag som tusentalsseparator: "29 250,00"
 * - Använd NUM_PATTERN för att matcha dessa korrekt
 * - Undvik att matcha "51 5 jan" som "515" (artikelkod + dag)
 */
export function extractInvoiceAmounts(parsedContent: string): ExtractedAmounts {
  const result: ExtractedAmounts = {
    amount: null,
    vat: null,
    total: null,
  };

  if (!parsedContent) return result;

  // Normalisera innehållet
  const content = parsedContent.replace(/\r\n/g, '\n');

  // Nummermönster som matchar svenska tal med mellanslag som tusentalsseparator
  // "29 250,00" eller "1 234 567,89" men INTE "51 5 jan"
  // Mönstret kräver att efter mellanslag kommer exakt 3 siffror (tusentalsgrupp)
  // NUM = \d{1,3}(?:\s\d{3})*(?:[.,]\d+)?  - t.ex. "29 250,00" eller "1 234,56"
  // Förenklat: vi fångar hela numret inkl mellanslag och låter parseSwedishNumber hantera det

  // Mönster för total (att betala) - svenska och engelska
  const totalPatterns = [
    // "Att betala 29 250,00 SEK" - med mellanslag som tusentalsseparator
    /\batt\s+betala\s+(\d{1,3}(?:\s\d{3})*[.,]\d+)\s*sek/i,
    // "ATT BETALA\n41,250.00 SEK" - belopp på egen rad efter ATT BETALA
    /\batt\s+betala\s*\n\s*(\d[\d\s.,]*\d)\s*sek/i,
    // "Att betala 132,00 SEK" (utan tusentalsseparator)
    /\batt\s+betala\s+(\d[\d.,]*)\s*sek/i,
    // "Att betala: 159,00 SEK" (med kolon)
    /\batt\s+betala:\s*([−-]?\d[\d\s.,]*\d)\s*(?:kr|sek)?/i,
    // "Belopp inkl moms 513,40" (Nespresso)
    /belopp\s+inkl\.?\s*moms\s+(\d[\d\s.,]*\d)/i,
    // "ATT BETALA ... SEK 18 763,00" (SEK före belopp, samma rad)
    /\batt\s+betala[^\n]*sek\s+(\d[\d\s.,]+)/i,
    // "Amount 259.00 SEK" (engelska kvitton)
    /\bamount\s+(\d[\d.,]+)\s*(?:sek|usd|eur|gbp)/i,
    // "Brutto: 39.00 kr" (Parkster etc)
    /brutto[:\s]+(\d[\d.,]*)\s*(?:kr|sek)?/i,
    // "YOUR ORDER SEK 390.62"
    /your\s+order[:\s]+(?:sek|usd|eur|gbp)?\s*(\d[\d.,]*)/i,
    // "Belopp kr\n415,00" (Transportstyrelsen - belopp på nästa rad)
    /belopp\s+kr\s*\n\s*(\d[\d.,]*)/i,
    // "Totalt inkl. moms 419,01"
    /totalt?\s+inkl\.?\s*moms\s+(\d[\d\s.,]*\d)/i,
    // "Summa inkl moms: 1234"
    /\bsumma\s+inkl\.?\s*moms[:\s]+(?:kr)?(\d[\d\s.,]*\d)/i,
    // "Fakturabelopp: 1234"
    /fakturabelopp[:\s]+(\d[\d\s.,]*\d)/i,
    // "Att betala 159,00 kr" (med kr)
    /\batt\s+betala\s+(\d[\d\s.,]*\d)\s*kr/i,
  ];

  for (const pattern of totalPatterns) {
    const match = content.match(pattern);
    if (match) {
      result.total = parseSwedishNumber(match[1]);
      if (result.total !== null && result.total > 100) break; // Sanity check: total bör vara > 100
    }
  }

  // Mönster för moms - endast säkra, entydiga mönster
  // VIKTIGT: Undvik \s i capture-grupper för att inte fånga flera tal som ett
  const vatPatterns = [
    // "Totalt momsbelopp\n25,00%\n5 850,00" - momsbelopp följt av procent och värde
    /totalt\s+momsbelopp\s*\n[^\n]*\n\s*(\d[\d.,]*\d)/im,
    // "Momsbelopp" i header, ta sista talet på nästa rad (momsen)
    /momsbelopp[^\n]*\n.*\s(\d[\d.,]*\d)\s*$/im,
    // "25 33,000.00 8,250.00" - momstabell: procent, belopp, momsbelopp (ta sista)
    /^25\s+[\d.,]+\s+([\d.,]+)\s*$/m,
    // "Varav moms: 1234" eller "Varav moms 1234"
    /varav\s+moms[:\s]+(\d[\d.,]*\d)/i,
    // "Moms 25 %: 7.80 kr" (Parkster) - med kolon före belopp
    /moms\s+\d+\s*%\s*:\s*(\d[\d.,]+)\s*(?:kr|sek)?/i,
    // "VAT (25%): SEK 78.12" - engelska
    /vat\s*\(\d+\s*%\)[:\s]+(?:sek|usd|eur|gbp)?\s*(\d[\d.,]+)/i,
    // "Utgående moms: 1234" - med kolon
    /utgående\s+moms:\s*(\d[\d.,]*\d)/i,
  ];

  for (const pattern of vatPatterns) {
    const match = content.match(pattern);
    if (match) {
      result.vat = parseSwedishNumber(match[1]);
      if (result.vat !== null) break;
    }
  }

  // Mönster för belopp exklusive moms - svenska och engelska
  const amountPatterns = [
    // "Summa exkl.moms 23 400,00 SEK" - på samma rad med SEK
    /summa\s+exkl\.?\s*moms\s+(\d[\d\s.,]*\d)\s*sek/i,
    // "Summa exkl. moms\n33,000.00" - belopp på egen rad direkt efter
    /summa\s+exkl\.?\s*moms\s*\n\s*(\d[\d\s.,]+)/im,
    // "Summa exkl. moms ... 105,78" - ta sista talet på raden (med prefix)
    /summa\s+exkl\.?\s*moms[^\n]*\s(\d[\d\s.,]+)\s*$/im,
    // "25 33,000.00 8,250.00" - momstabell: procent, belopp (ta första beloppet)
    /^25\s+([\d\s.,]+)\s+[\d\s.,]+\s*$/m,
    // "Nettobelopp 25 %: 31.20 kr" (Parkster)
    /nettobelopp[^:]*[:\s]+(\d[\d.,]*)\s*(?:kr|sek)?/i,
    // "Exkl.moms: 127,40" (med kolon)
    /exkl\.?\s*moms:\s*(\d[\d\s.,]*\d)/i,
    // "Netto: 1234"
    /\bnetto:\s*(\d[\d\s.,]*\d)/i,
    // "Subtotal: SEK 312.50" eller "Delsumma: 1234"
    /(?:subtotal|delsumma)[:\s]+(?:sek|usd|eur|gbp|kr)?\s*(\d[\d\s.,]*\d)/i,
    // "Belopp exkl moms: 1234"
    /belopp\s+exkl\.?\s*moms[:\s]+(\d[\d\s.,]*\d)/i,
  ];

  for (const pattern of amountPatterns) {
    const match = content.match(pattern);
    if (match) {
      result.amount = parseSwedishNumber(match[1]);
      if (result.amount !== null) break;
    }
  }

  // Beräkna saknade värden om vi har 2 av 3
  if (result.total !== null && result.vat !== null && result.amount === null) {
    result.amount = result.total - result.vat;
  } else if (result.total !== null && result.amount !== null && result.vat === null) {
    result.vat = result.total - result.amount;
  } else if (result.amount !== null && result.vat !== null && result.total === null) {
    result.total = result.amount + result.vat;
  }

  // Om vi bara har total, försök beräkna moms baserat på momssats i dokumentet
  if (result.total !== null && result.amount === null && result.vat === null) {
    // Kolla vilken momssats som nämns i dokumentet
    if (/\b6\s*%/.test(content)) {
      // 6% moms (böcker, tidningar, kollektivtrafik)
      result.amount = Math.round((result.total / 1.06) * 100) / 100;
      result.vat = Math.round((result.total - result.amount) * 100) / 100;
    } else if (/\b12\s*%/.test(content)) {
      // 12% moms (livsmedel, hotell)
      result.amount = Math.round((result.total / 1.12) * 100) / 100;
      result.vat = Math.round((result.total - result.amount) * 100) / 100;
    } else if (/25\s*%|moms|vat/i.test(content)) {
      // 25% moms (standard)
      result.amount = Math.round((result.total / 1.25) * 100) / 100;
      result.vat = Math.round((result.total - result.amount) * 100) / 100;
    } else {
      // Ingen moms hittad - troligen momsfritt (skatter, avgifter, etc.)
      result.amount = result.total;
      result.vat = 0;
    }
  }

  return result;
}

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
  category_id: number | null;
  effective_category_id: number | null;
  effective_category_name: string | null;
  effective_category_emoji: string | null;
  supplier_category_id: number | null;
  supplier_category_name: string | null;
  supplier_category_emoji: string | null;
  created_at: string;
  supplier_name?: string;
}

export interface CustomerPayment {
  id: number;
  fiscal_year_id: number;
  customer_id: number | null;
  customer_invoice_id: number | null;
  payment_date: string | null;
  amount: number | null;
  payment_reference: string | null;
  file_path: string;
  file_name: string;
  parsed_content: string | null;
  created_at: string;
  customer_name?: string;
}

export interface PossibleDuplicate {
  fileName: string;
  newPath: string;
  existingPath: string;
  existingType: 'customer' | 'supplier' | 'payment';
}

export interface ImportResult {
  customerInvoices: number;
  supplierInvoices: number;
  customerPayments: number;
  skipped: number;
  possibleDuplicates: PossibleDuplicate[];
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

function isCustomerInvoiceByFilename(fileName: string): boolean {
  return CUSTOMER_INVOICE_PATTERN.test(fileName);
}

/**
 * Analysera PDF-innehåll för att avgöra om det är en kundfaktura (faktura vi skickat)
 *
 * VIKTIGT: Vara mycket restriktiv - default är leverantörsfaktura.
 * Bara identifiera som kundfaktura om vi hittar VÅRA unika identifierare
 * OCH det inte är ett kontoutdrag/betalningsbekräftelse.
 *
 * Strategi: Leta efter VÅRT bankgiro, IBAN eller momsreg.nr
 * MEN exkludera kontoutdrag/transaktionsinformation från banken.
 */
function isCustomerInvoiceByContent(parsedContent: string): boolean {
  if (!parsedContent) return false;

  // EXKLUDERA: Kontoutdrag och transaktionsinformation från banken
  // Dessa innehåller vårt IBAN men är inte kundfakturor
  if (/transaktionsinformation/i.test(parsedContent)) {
    return false;
  }
  if (/kontoutdrag/i.test(parsedContent)) {
    return false;
  }
  // "Uttag" + vårt IBAN = vi betalade något, inte kundfaktura
  if (/uttag/i.test(parsedContent) && /SE1080000832799836474693/.test(parsedContent)) {
    return false;
  }
  // Swedbank-transaktioner som visar vårt konto
  if (/kontoinformation/i.test(parsedContent) && /företagskonto/i.test(parsedContent)) {
    return false;
  }

  // ENDA sättet att identifiera kundfaktura via innehåll:
  // Leta efter VÅRA unika bankuppgifter som betalningsinformation

  // 1. Vårt bankgiro (5774-4724) - detta är betalinfo på fakturor vi skickar
  if (/5774-4724/.test(parsedContent)) {
    // Dubbelkolla att det inte är "Mottagare" i en inbetalning (hanteras separat)
    if (!/mottagare.*5774-4724/is.test(parsedContent)) {
      return true;
    }
  }

  // 2. Vårt momsreg.nr (unikt format) - finns bara på våra fakturor
  if (/SE710111528001/.test(parsedContent)) {
    return true;
  }

  // Allt annat = leverantörsfaktura (eller okänt)
  return false;
}

/**
 * Avgör om en faktura är en kundfaktura baserat på filnamn OCH innehåll
 */
function isCustomerInvoice(fileName: string, parsedContent?: string): boolean {
  // Filnamn är första kontrollen
  if (isCustomerInvoiceByFilename(fileName)) {
    return true;
  }

  // Om vi har PDF-innehåll, analysera det också
  if (parsedContent) {
    return isCustomerInvoiceByContent(parsedContent);
  }

  return false;
}

/**
 * Identifiera om PDF är en inbetalningsverifikation (betalning från kund)
 * Mönster:
 * - Filnamn: "Inbetalning", "Inbetalningsdetaljer", "Inbet från"
 * - Innehåll: "Mottagare: ... Bankgironummer: 5774-4724" (vårt bankgiro som mottagare)
 */
function isCustomerPaymentByFilename(fileName: string): boolean {
  return /inbetalning|inbet\s/i.test(fileName);
}

function isCustomerPaymentByContent(parsedContent: string): boolean {
  if (!parsedContent) return false;

  // "Mottagare" + vårt bankgiro = vi mottar betalning
  if (/mottagare.*5774-4724/is.test(parsedContent)) {
    return true;
  }

  // "Inbetalningsdetaljer" i innehållet
  if (/inbetalningsdetaljer/i.test(parsedContent)) {
    return true;
  }

  return false;
}

function isCustomerPayment(fileName: string, parsedContent?: string): boolean {
  if (isCustomerPaymentByFilename(fileName)) {
    return true;
  }

  if (parsedContent && isCustomerPaymentByContent(parsedContent)) {
    return true;
  }

  return false;
}

/**
 * Extrahera information från inbetalningsverifikation
 */
function extractPaymentInfo(parsedContent: string, fileName: string): {
  customerName?: string;
  amount?: number;
  paymentReference?: string;
  paymentDate?: string;
} {
  const result: {
    customerName?: string;
    amount?: number;
    paymentReference?: string;
    paymentDate?: string;
  } = {};

  // Extrahera belopp
  const amountMatch = parsedContent.match(/belopp\s+(\d[\d\s]*[\d,]+)/i);
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/\s/g, '').replace(',', '.');
    result.amount = parseFloat(amountStr);
  }

  // Extrahera betalningsreferens (fakturanummer)
  const refMatch = parsedContent.match(/betalningsreferens\s+(\d+)/i);
  if (refMatch) {
    result.paymentReference = refMatch[1];
  }

  // Extrahera fakturanummer från filnamn (t.ex. "SVT 1362")
  const fileRefMatch = fileName.match(/(\d{4})/);
  if (fileRefMatch && !result.paymentReference) {
    result.paymentReference = fileRefMatch[1];
  }

  // Extrahera avsändarens namn (kunden)
  const senderMatch = parsedContent.match(/uppgifter om avsändaren\s*\n*namn\s+([A-ZÅÄÖ][A-Za-zÅÄÖåäö\s]+)/i);
  if (senderMatch) {
    result.customerName = senderMatch[1].trim();
  }

  // Extrahera datum
  const dateMatch = parsedContent.match(/datum\s+(\d{4}-\d{2}-\d{2})/i);
  if (dateMatch) {
    result.paymentDate = dateMatch[1];
  }

  return result;
}

function extractDateFromFilename(fileName: string): string | null {
  // Matcha YYYY-MM-DD eller YY-MM-DD
  const match = fileName.match(/^(\d{2,4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  let year = match[1];
  const month = match[2];
  const day = match[3];

  // Konvertera 2-siffrigt år till 4-siffrigt (antar 2000-talet)
  if (year.length === 2) {
    year = '20' + year;
  }

  return `${year}-${month}-${day}`;
}

// ========== Leverantörs/Kund-extraktion ==========

export interface ExtractedEntity {
  name: string;
  orgNumber?: string;
}

/**
 * Kolla om en sträng ser ut som ett ogiltigt leverantörsnamn
 */
function isInvalidSupplierName(name: string): boolean {
  const lower = name.toLowerCase();

  // Adresser
  if (/gata|väg|gatan|vägen|lgh|box\s+\d/i.test(name)) return true;

  // Rubriker och dokumenttermer som start
  const badStarts = [
    'faktura', 'kvitto', 'receipt', 'invoice', 'specifikation', 'utbetalning',
    'inbetalning', 'transaktion', 'genomförd', 'kontoutdrag', 'detaljer',
    'referens', 'bankgiro', 'betalning', 'your order', 'has been paid',
    'sida', 'page', 'datum', 'date', 'summa', 'total', 'moms', 'vat',
    'belopp', 'amount', 'konto', 'namn', 'beräkning', 'utgår',
    'låneavisering', 'månadsavgift', 'prog.vara', 'prog.',
  ];

  for (const pattern of badStarts) {
    if (lower === pattern || lower.startsWith(pattern + ' ')) {
      return true;
    }
  }

  // Slutar med dessa
  const badEnds = ['specifikation', 'detaljer', 'betalning', 'transaktion'];
  for (const pattern of badEnds) {
    if (lower.endsWith(' ' + pattern) || lower.endsWith(pattern)) {
      return true;
    }
  }

  // Innehåller "ej betalad", "kopia" etc.
  if (/ej betalad|kopia|påminnel/i.test(name)) return true;

  // För korta namn
  if (name.replace(/\s/g, '').length < 3) return true;

  // Bara siffror och bindestreck
  if (/^[\d\s\-–,.]+$/.test(name)) return true;

  // Börjar med siffror (t.ex. "199 kr")
  if (/^\d+\s*(kr|sek|:-)/i.test(name)) return true;

  return false;
}

/**
 * Rensa och validera ett extraherat leverantörsnamn
 */
function cleanAndValidateSupplierName(raw: string): string | null {
  let name = raw
    .replace(/\s+/g, ' ')
    .trim();

  // Ta bort ledande "- " och belopp
  name = name
    .replace(/^[-–]\s*/, '') // Ledande bindestreck
    .replace(/^\d+[,.]?\d*\s*(kr|sek|:-)\s*[-–]?\s*/i, '') // Ledande belopp "199 kr -"
    .replace(/^[-–]\s*/, '') // Bindestreck igen efter belopp
    .trim();

  // Ta bort trailing " -" eller " - "
  name = name
    .replace(/\s*[-–]\s*$/, '')
    .replace(/\s*[-–]\s+\w{0,2}$/, '') // " - F" etc
    .trim();

  // Ta bort parenteser med innehåll om det är för långt
  if (name.length > 40) {
    name = name.replace(/\s*\([^)]+\)\s*$/, '').trim();
  }

  // Ta bort efter komma/semikolon
  name = name.replace(/[,;].*$/, '').trim();

  // Ta bort "Box 123..." och postnummer
  name = name
    .replace(/\s*Box\s+\d+.*$/i, '')
    .replace(/\s*\d{3}\s*\d{2}\s+[A-ZÅÄÖ][a-zåäö]+.*$/i, '')
    .trim();

  // Begränsa längden
  if (name.length > 50) {
    const parts = name.split(/\s+/);
    name = parts.slice(0, 4).join(' ');
  }

  if (isInvalidSupplierName(name)) {
    return null;
  }

  // Sista kontroll - om namnet fortfarande börjar/slutar med bindestreck
  name = name.replace(/^[-–]\s*/, '').replace(/\s*[-–]$/, '').trim();

  if (name.length < 2) {
    return null;
  }

  return name;
}

/**
 * Extrahera leverantörsinformation från PDF-innehåll
 * Använder flera strategier för att hitta leverantören:
 * 1. Leta efter "Fordringsägare", "Betalningsmottagare" etc.
 * 2. Leta efter företagsnamn nära org.nummer
 * 3. Leta efter företagsnamn med AB/HB/Ltd i första raderna
 * 4. Leta i sidfot med org.nummer
 */
export function extractSupplierFromPdf(parsedContent: string): ExtractedEntity | null {
  if (!parsedContent || parsedContent.trim().length === 0) {
    return null;
  }

  let name: string | null = null;
  let orgNumber: string | null = null;

  // 1. Leta efter "Fordringsägare" eller "Betalningsmottagare" (t.ex. Fortnox)
  const creditorMatch = parsedContent.match(/(?:fordringsägare|betalningsmottagare)\s*\n?\s*([A-ZÅÄÖ][A-Za-zÅÄÖåäö\s&]+(?:AB|HB|KB|Ltd)?)/i);
  if (creditorMatch) {
    name = cleanAndValidateSupplierName(creditorMatch[1]);
  }

  // 2. Leta efter företagsnamn på rad med eller nära org.nummer
  // T.ex. "hallon c/o HI3G Access AB ... Org. Nr. 556593-4899"
  if (!name) {
    const orgLineMatch = parsedContent.match(/([A-ZÅÄÖ][A-Za-zÅÄÖåäö\s&]+(?:AB|HB|KB|Ltd))[\s,;.]+.*?(?:org\.?\s*(?:nr|nummer)?\.?:?\s*)(\d{6}[-]?\d{4})/i);
    if (orgLineMatch) {
      name = cleanAndValidateSupplierName(orgLineMatch[1]);
      const rawOrg = orgLineMatch[2].replace(/\s/g, '');
      orgNumber = rawOrg.length === 10 ? rawOrg.slice(0, 6) + '-' + rawOrg.slice(6) : rawOrg;
    }
  }

  // 3. Leta efter org.nummer och ta företagsnamnet före det på samma rad
  if (!name) {
    const beforeOrgMatch = parsedContent.match(/([A-ZÅÄÖ][A-Za-zÅÄÖåäö\s&]+(?:AB|HB|KB|Ltd)?)[,\s]+(?:org\.?\s*(?:nr|nummer)?\.?:?\s*)(\d{6}[-]?\d{4})/i);
    if (beforeOrgMatch) {
      name = cleanAndValidateSupplierName(beforeOrgMatch[1]);
      const rawOrg = beforeOrgMatch[2].replace(/\s/g, '');
      orgNumber = rawOrg.length === 10 ? rawOrg.slice(0, 6) + '-' + rawOrg.slice(6) : rawOrg;
    }
  }

  // 4. Leta efter "Postadress" följt av företagsnamn (myndigheter)
  if (!name) {
    const postadressMatch = parsedContent.match(/postadress[^\n]*\n\s*([A-ZÅÄÖ][A-ZÅÄÖ\s]+)\n/i);
    if (postadressMatch) {
      name = cleanAndValidateSupplierName(postadressMatch[1]);
    }
  }

  // 5. Leta efter första raden som ser ut som ett företagsnamn med AB/HB/Ltd
  if (!name) {
    const lines = parsedContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    for (const line of lines.slice(0, 10)) {
      // Matcha företagsnamn med suffix
      const companyMatch = line.match(/^([A-ZÅÄÖ][A-Za-zÅÄÖåäö\s&éè]+(?:AB|HB|KB|Ltd|AS|A\/S|Aktiebolag)[^,]*)/i);
      if (companyMatch) {
        const validated = cleanAndValidateSupplierName(companyMatch[1]);
        if (validated) {
          name = validated;
          break;
        }
      }
    }
  }

  // 6. Leta efter första raden med ett rimligt företagsnamn (fallback)
  // Men undvik rader som ser ut som kundnamn (personnamn) eller rubriker
  if (!name) {
    const lines = parsedContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    for (const line of lines.slice(0, 5)) {
      // Hoppa över sidnummer, datum, "Faktura", personnamn etc.
      if (/^(sida|page|faktura|kvitto|receipt|datum|date|\d)/i.test(line)) continue;
      if (/^[A-ZÅÄÖ]+\s+[A-ZÅÄÖ]+\s+[A-ZÅÄÖ]+$/i.test(line)) continue; // Tre ord med bara versaler = troligen personnamn
      if (line.length < 5 || line.length > 60) continue;

      // Ta företagsnamn som innehåller vanliga suffix eller är ett känt mönster
      if (/\b(AB|HB|KB|Ltd|AS|A\/S|Aktiebolag|division|Sweden|Sverige)\b/i.test(line)) {
        const validated = cleanAndValidateSupplierName(line);
        if (validated) {
          name = validated;
          break;
        }
      }
    }
  }

  // 7. Extrahera org.nummer separat om vi inte hittade det ännu
  if (!orgNumber) {
    const orgMatch = parsedContent.match(/(?:org\.?\s*(?:nr|nummer)?\.?:?\s*)(\d{6}[-]?\d{4})/i);
    if (orgMatch) {
      const rawOrg = orgMatch[1].replace(/\s/g, '');
      orgNumber = rawOrg.length === 10 ? rawOrg.slice(0, 6) + '-' + rawOrg.slice(6) : rawOrg;
    }
  }

  if (!name) {
    return null;
  }

  return {
    name,
    orgNumber: orgNumber || undefined,
  };
}

/**
 * Extrahera leverantörsnamn från filnamn
 * Mönster: YY-MM-DD [Leverantörsnamn] ...
 * Exempel: "25-01-08 Parkering SVT.pdf" → "Parkering SVT"
 * Exempel: "25-01-06 Fortnox 159 kr.pdf" → "Fortnox"
 */
export function extractSupplierFromFilename(fileName: string): ExtractedEntity | null {
  // Ta bort .pdf-ändelsen
  const baseName = fileName.replace(/\.pdf$/i, '');

  // Matcha datum i början: YY-MM-DD eller YYYY-MM-DD
  const dateMatch = baseName.match(/^\d{2,4}-\d{2}-\d{2}\s+(.+)$/);
  if (!dateMatch) {
    return null;
  }

  let afterDate = dateMatch[1].trim();

  // Ta bort ledande "- " (vanligt i filnamn)
  afterDate = afterDate.replace(/^[-–]\s*/, '').trim();

  // Hoppa över kundfakturor (börjar med "Faktura")
  if (/^faktura/i.test(afterDate)) {
    return null;
  }

  // Ta bort suffix som indikerar belopp eller period
  afterDate = afterDate
    .replace(/\s+\d+[,.]?\d*\s*(kr|sek|:-)?\.?$/i, '') // Belopp i slutet
    .replace(/\s+(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)\.?\s*[-–]?\s*\d*$/i, '') // Månadsförkortningar
    .replace(/\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s*[-–]?\s*\d*$/i, '') // Hela månadsnamn
    .replace(/\s+[-–]\s*\d+$/, '') // " - 25" etc
    .replace(/\s+[A-Z]$/, '') // Enstaka versal i slutet
    .replace(/\s+[-–]\s*$/, '') // Trailing " -"
    .trim();

  // Ta allt som namn (filnamn är oftast pålitliga)
  if (afterDate.length >= 2) {
    const validated = cleanAndValidateSupplierName(afterDate);
    if (validated) {
      return { name: validated };
    }
  }

  return null;
}

/**
 * Extrahera kundinformation från PDF-innehåll
 * Letar efter kundnamn i fakturor som vi skickat
 */
export function extractCustomerFromPdf(parsedContent: string): ExtractedEntity | null {
  if (!parsedContent || parsedContent.trim().length === 0) {
    return null;
  }

  let name: string | null = null;
  let orgNumber: string | null = null;

  // Leta efter kundrelaterade mönster
  const customerPatterns = [
    /(?:kund|mottagare|till|faktureras)[\s:]+([A-ZÅÄÖ][A-Za-zÅÄÖåäö\s&]+(?:AB|HB|KB)?)/i,
    /(?:faktura till)[\s:]+([A-ZÅÄÖ][A-Za-zÅÄÖåäö\s&]+)/i,
  ];

  for (const pattern of customerPatterns) {
    const match = parsedContent.match(pattern);
    if (match) {
      name = match[1].trim();
      break;
    }
  }

  // Leta efter org.nummer efter kundnamn
  if (name) {
    const orgMatch = parsedContent.match(/(?:org\.?\s*(?:nr|nummer)?\.?:?\s*)(\d{6}[-\s]?\d{4})/i);
    if (orgMatch) {
      const raw = orgMatch[1].replace(/\s/g, '');
      if (raw.length === 10) {
        orgNumber = raw.slice(0, 6) + '-' + raw.slice(6);
      } else if (raw.length === 11 && raw[6] === '-') {
        orgNumber = raw;
      }
    }
  }

  if (!name) {
    return null;
  }

  // Rensa upp namnet
  name = name
    .replace(/\s+/g, ' ')
    .replace(/[,;].*$/, '')
    .trim();

  if (name.length > 100) {
    name = name.substring(0, 100);
  }

  return {
    name,
    orgNumber: orgNumber || undefined,
  };
}

/**
 * Extrahera kundnamn från filnamn för kundfakturor
 * Mönster: YY-MM-DD Faktura [nummer] [Kundnamn] ...
 * Exempel: "25-12-13 Faktura 1368 UR.pdf" → "UR"
 * Exempel: "25-01-15 Faktura AB Company 5000 kr.pdf" → "AB Company"
 */
export function extractCustomerFromFilename(fileName: string): ExtractedEntity | null {
  // Ta bort .pdf-ändelsen
  const baseName = fileName.replace(/\.pdf$/i, '');

  // Matcha kundfaktura-mönstret: datum + Faktura + resten
  const match = baseName.match(/^\d{2,4}-\d{2}-\d{2}\s+[Ff]aktura\s+(.+)$/);
  if (!match) {
    return null;
  }

  let afterFaktura = match[1].trim();

  // Hoppa över fakturanummer i början (en eller flera siffror följt av mellanslag)
  // T.ex. "1368 UR" → "UR"
  const skipNumberMatch = afterFaktura.match(/^\d+\s+(.+)$/);
  if (skipNumberMatch) {
    afterFaktura = skipNumberMatch[1].trim();
  }

  // Extrahera kundnamnet - allt fram till siffror (summor), "kr", "SEK"
  // Kundnamn kan börja med stor bokstav eller vara versaler
  const nameMatch = afterFaktura.match(/^([A-Za-zÅÄÖåäö][A-Za-zÅÄÖåäö\s&-]*?)(?:\s+\d|\s+kr|\s+SEK|\.pdf|$)/i);

  if (nameMatch) {
    let name = nameMatch[1].trim();
    name = name.replace(/[-\s]+$/, '');

    if (name.length >= 2) {
      return { name };
    }
  }

  // Fallback: ta allt som finns kvar (om det är rimligt)
  const remaining = afterFaktura.replace(/\s+\d.*$/, '').trim();
  if (remaining.length >= 2 && /[a-zA-ZåäöÅÄÖ]/.test(remaining)) {
    return { name: remaining };
  }

  return null;
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
    SELECT si.*,
      s.name as supplier_name,
      s.category_id as supplier_category_id,
      sc.name as supplier_category_name,
      sc.emoji as supplier_category_emoji,
      COALESCE(si.category_id, s.category_id) as effective_category_id,
      c.name as effective_category_name,
      c.emoji as effective_category_emoji
    FROM supplier_invoices si
    LEFT JOIN suppliers s ON si.supplier_id = s.id
    LEFT JOIN categories sc ON s.category_id = sc.id
    LEFT JOIN categories c ON COALESCE(si.category_id, s.category_id) = c.id
    WHERE si.fiscal_year_id = ?
    ORDER BY si.invoice_date DESC, si.id DESC
  `).all(fiscalYearId) as SupplierInvoice[];
}

export function getSupplierInvoiceById(id: number): SupplierInvoice | undefined {
  const db = getDatabase();
  return db.prepare(`
    SELECT si.*,
      s.name as supplier_name,
      s.category_id as supplier_category_id,
      sc.name as supplier_category_name,
      sc.emoji as supplier_category_emoji,
      COALESCE(si.category_id, s.category_id) as effective_category_id,
      c.name as effective_category_name,
      c.emoji as effective_category_emoji
    FROM supplier_invoices si
    LEFT JOIN suppliers s ON si.supplier_id = s.id
    LEFT JOIN categories sc ON s.category_id = sc.id
    LEFT JOIN categories c ON COALESCE(si.category_id, s.category_id) = c.id
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
    category_id?: number | null;
  }
): SupplierInvoice {
  const db = getDatabase();
  const current = getSupplierInvoiceById(id);
  if (!current) throw new Error('Invoice not found');

  db.prepare(`
    UPDATE supplier_invoices
    SET supplier_id = ?, invoice_number = ?, invoice_date = ?, due_date = ?,
        amount = ?, vat = ?, total = ?, status = ?, payment_date = ?, category_id = ?
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
    data.category_id !== undefined ? data.category_id : current.category_id,
    id
  );

  return getSupplierInvoiceById(id)!;
}

export function deleteSupplierInvoice(id: number): { success: boolean } {
  const db = getDatabase();
  db.prepare('DELETE FROM supplier_invoices WHERE id = ?').run(id);
  return { success: true };
}

// Customer Payment Operations
export function getCustomerPayments(fiscalYearId: number): CustomerPayment[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT cp.*, c.name as customer_name
    FROM customer_payments cp
    LEFT JOIN customers c ON cp.customer_id = c.id
    WHERE cp.fiscal_year_id = ?
    ORDER BY cp.payment_date DESC, cp.id DESC
  `).all(fiscalYearId) as CustomerPayment[];
}

export function getCustomerPaymentById(id: number): CustomerPayment | undefined {
  const db = getDatabase();
  return db.prepare(`
    SELECT cp.*, c.name as customer_name
    FROM customer_payments cp
    LEFT JOIN customers c ON cp.customer_id = c.id
    WHERE cp.id = ?
  `).get(id) as CustomerPayment | undefined;
}

export function deleteCustomerPayment(id: number): { success: boolean } {
  const db = getDatabase();
  db.prepare('DELETE FROM customer_payments WHERE id = ?').run(id);
  return { success: true };
}

// Import Operations

// Typ för dublettstatus
type DuplicateStatus =
  | { status: 'new' }
  | { status: 'exact_duplicate' }
  | { status: 'possible_duplicate'; existingPath: string; existingType: 'customer' | 'supplier' | 'payment' };

/**
 * Kontrollera om en fil redan finns importerad eller har samma filnamn som en befintlig fil
 * @param filePath Hela sökvägen till filen
 * @param fileName Enbart filnamnet
 * @returns Status: 'new', 'exact_duplicate' eller 'possible_duplicate'
 */
function checkDuplicateStatus(filePath: string, fileName: string): DuplicateStatus {
  const db = getDatabase();

  // 1. Kolla exakt sökväg först
  const customerExact = db.prepare('SELECT file_path FROM customer_invoices WHERE file_path = ?').get(filePath) as { file_path: string } | undefined;
  if (customerExact) {
    return { status: 'exact_duplicate' };
  }

  const supplierExact = db.prepare('SELECT file_path FROM supplier_invoices WHERE file_path = ?').get(filePath) as { file_path: string } | undefined;
  if (supplierExact) {
    return { status: 'exact_duplicate' };
  }

  const paymentExact = db.prepare('SELECT file_path FROM customer_payments WHERE file_path = ?').get(filePath) as { file_path: string } | undefined;
  if (paymentExact) {
    return { status: 'exact_duplicate' };
  }

  // 2. Kolla om samma filnamn finns på annan sökväg
  const customerByName = db.prepare('SELECT file_path FROM customer_invoices WHERE file_name = ? AND file_path != ?').get(fileName, filePath) as { file_path: string } | undefined;
  if (customerByName) {
    return { status: 'possible_duplicate', existingPath: customerByName.file_path, existingType: 'customer' };
  }

  const supplierByName = db.prepare('SELECT file_path FROM supplier_invoices WHERE file_name = ? AND file_path != ?').get(fileName, filePath) as { file_path: string } | undefined;
  if (supplierByName) {
    return { status: 'possible_duplicate', existingPath: supplierByName.file_path, existingType: 'supplier' };
  }

  const paymentByName = db.prepare('SELECT file_path FROM customer_payments WHERE file_name = ? AND file_path != ?').get(fileName, filePath) as { file_path: string } | undefined;
  if (paymentByName) {
    return { status: 'possible_duplicate', existingPath: paymentByName.file_path, existingType: 'payment' };
  }

  // 3. Ingen match - ny fil
  return { status: 'new' };
}

// Behåll isAlreadyImported för bakåtkompatibilitet
function isAlreadyImported(filePath: string): boolean {
  const db = getDatabase();
  const customerCount = db.prepare('SELECT COUNT(*) as count FROM customer_invoices WHERE file_path = ?').get(filePath) as { count: number };
  const supplierCount = db.prepare('SELECT COUNT(*) as count FROM supplier_invoices WHERE file_path = ?').get(filePath) as { count: number };
  const paymentCount = db.prepare('SELECT COUNT(*) as count FROM customer_payments WHERE file_path = ?').get(filePath) as { count: number };
  return customerCount.count > 0 || supplierCount.count > 0 || paymentCount.count > 0;
}

/**
 * Hitta alla PDF-filer rekursivt i en mapp (inkl. undermappar)
 */
function findPdfsRecursively(dirPath: string): string[] {
  const pdfFiles: string[] = [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Rekursivt sök i undermappar
        pdfFiles.push(...findPdfsRecursively(fullPath));
      } else if (entry.name.toLowerCase().endsWith('.pdf')) {
        // Vanlig PDF-fil
        pdfFiles.push(fullPath);
      } else if (entry.name.startsWith('.') && entry.name.toLowerCase().endsWith('.pdf.icloud')) {
        // iCloud placeholder - extrahera riktiga filnamnet och sökvägen
        // .filnamn.pdf.icloud -> filnamn.pdf
        const realName = entry.name.slice(1, -7);
        const realPath = path.join(dirPath, realName);
        // Lägg till som potentiell fil (kommer att misslyckas vid import men loggas)
        pdfFiles.push(realPath);
      }
    }
  } catch (err) {
    console.error(`Kunde inte läsa mapp ${dirPath}:`, err);
  }

  return pdfFiles;
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
    customerPayments: 0,
    skipped: 0,
    possibleDuplicates: [],
    errors: [],
  };

  // Hitta alla PDF-filer rekursivt
  const pdfFiles = findPdfsRecursively(folder.path);

  for (const filePath of pdfFiles) {
    const fileName = path.basename(filePath);

    // Kolla dublettstatus
    const duplicateStatus = checkDuplicateStatus(filePath, fileName);

    if (duplicateStatus.status === 'exact_duplicate') {
      result.skipped++;
      continue;
    }

    if (duplicateStatus.status === 'possible_duplicate') {
      result.possibleDuplicates.push({
        fileName,
        newPath: filePath,
        existingPath: duplicateStatus.existingPath,
        existingType: duplicateStatus.existingType,
      });
      result.skipped++;
      continue;
    }

    // Kolla om filen faktiskt existerar (kan vara iCloud-fil som inte är nedladdad)
    if (!fs.existsSync(filePath)) {
      result.errors.push(`${fileName}: Filen finns i iCloud men är inte nedladdad lokalt`);
      continue;
    }

    try {
      const parsedContent = await parsePdf(filePath);
      const invoiceDate = extractDateFromFilename(fileName);

      // 1. Kolla först om det är en inbetalningsverifikation
      if (isCustomerPayment(fileName, parsedContent)) {
        const paymentInfo = extractPaymentInfo(parsedContent, fileName);

        let customerId: number | null = null;
        if (paymentInfo.customerName) {
          customerId = findOrCreateCustomer(paymentInfo.customerName);
        }

        db.prepare(`
          INSERT INTO customer_payments (fiscal_year_id, customer_id, payment_date, amount, payment_reference, file_path, file_name, parsed_content)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          fiscalYearId,
          customerId,
          paymentInfo.paymentDate || invoiceDate,
          paymentInfo.amount || null,
          paymentInfo.paymentReference || null,
          filePath,
          fileName,
          parsedContent
        );
        result.customerPayments++;
      }
      // 2. Kolla om det är en kundfaktura
      else if (isCustomerInvoice(fileName, parsedContent)) {
        const customerInfo = extractCustomerFromPdf(parsedContent)
          || extractCustomerFromFilename(fileName);

        let customerId: number | null = null;
        if (customerInfo) {
          customerId = findOrCreateCustomer(customerInfo.name, customerInfo.orgNumber);
        }

        // Extrahera belopp från PDF-innehåll
        const amounts = extractInvoiceAmounts(parsedContent);

        db.prepare(`
          INSERT INTO customer_invoices (fiscal_year_id, customer_id, file_path, file_name, parsed_content, invoice_date, amount, vat, total, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'imported')
        `).run(fiscalYearId, customerId, filePath, fileName, parsedContent, invoiceDate, amounts.amount, amounts.vat, amounts.total);
        result.customerInvoices++;
      }
      // 3. Annars är det en leverantörsfaktura
      else {
        const supplierInfo = extractSupplierFromFilename(fileName)
          || extractSupplierFromPdf(parsedContent);

        let supplierId: number | null = null;
        if (supplierInfo) {
          supplierId = findOrCreateSupplier(supplierInfo.name, supplierInfo.orgNumber);
        }

        // Extrahera belopp från PDF-innehåll
        const amounts = extractInvoiceAmounts(parsedContent);

        db.prepare(`
          INSERT INTO supplier_invoices (fiscal_year_id, supplier_id, file_path, file_name, parsed_content, invoice_date, amount, vat, total, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'imported')
        `).run(fiscalYearId, supplierId, filePath, fileName, parsedContent, invoiceDate, amounts.amount, amounts.vat, amounts.total);
        result.supplierInvoices++;
      }
    } catch (error) {
      result.errors.push(`${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update last scanned timestamp
  db.prepare("UPDATE invoice_folders SET last_scanned = datetime('now') WHERE id = ?").run(folderId);

  return result;
}

export async function importSingleFile(filePath: string, fiscalYearId: number): Promise<{ type: 'customer' | 'supplier' | 'payment'; invoice?: CustomerInvoice | SupplierInvoice; payment?: CustomerPayment }> {
  const db = getDatabase();
  const fileName = path.basename(filePath);

  if (isAlreadyImported(filePath)) {
    throw new Error('File is already imported');
  }

  const parsedContent = await parsePdf(filePath);
  const invoiceDate = extractDateFromFilename(fileName);

  // 1. Kolla först om det är en inbetalningsverifikation
  if (isCustomerPayment(fileName, parsedContent)) {
    const paymentInfo = extractPaymentInfo(parsedContent, fileName);

    let customerId: number | null = null;
    if (paymentInfo.customerName) {
      customerId = findOrCreateCustomer(paymentInfo.customerName);
    }

    const result = db.prepare(`
      INSERT INTO customer_payments (fiscal_year_id, customer_id, payment_date, amount, payment_reference, file_path, file_name, parsed_content)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fiscalYearId,
      customerId,
      paymentInfo.paymentDate || invoiceDate,
      paymentInfo.amount || null,
      paymentInfo.paymentReference || null,
      filePath,
      fileName,
      parsedContent
    );

    return {
      type: 'payment',
      payment: getCustomerPaymentById(Number(result.lastInsertRowid))!,
    };
  }

  // 2. Kolla om det är en kundfaktura
  if (isCustomerInvoice(fileName, parsedContent)) {
    const customerInfo = extractCustomerFromPdf(parsedContent)
      || extractCustomerFromFilename(fileName);

    let customerId: number | null = null;
    if (customerInfo) {
      customerId = findOrCreateCustomer(customerInfo.name, customerInfo.orgNumber);
    }

    // Extrahera belopp från PDF-innehåll
    const amounts = extractInvoiceAmounts(parsedContent);

    const result = db.prepare(`
      INSERT INTO customer_invoices (fiscal_year_id, customer_id, file_path, file_name, parsed_content, invoice_date, amount, vat, total, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'imported')
    `).run(fiscalYearId, customerId, filePath, fileName, parsedContent, invoiceDate, amounts.amount, amounts.vat, amounts.total);

    return {
      type: 'customer',
      invoice: getCustomerInvoiceById(Number(result.lastInsertRowid))!,
    };
  }

  // 3. Annars är det en leverantörsfaktura
  const supplierInfo = extractSupplierFromFilename(fileName)
    || extractSupplierFromPdf(parsedContent);

  let supplierId: number | null = null;
  if (supplierInfo) {
    supplierId = findOrCreateSupplier(supplierInfo.name, supplierInfo.orgNumber);
  }

  // Extrahera belopp från PDF-innehåll
  const amounts = extractInvoiceAmounts(parsedContent);

  const result = db.prepare(`
    INSERT INTO supplier_invoices (fiscal_year_id, supplier_id, file_path, file_name, parsed_content, invoice_date, amount, vat, total, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'imported')
  `).run(fiscalYearId, supplierId, filePath, fileName, parsedContent, invoiceDate, amounts.amount, amounts.vat, amounts.total);

  return {
    type: 'supplier',
    invoice: getSupplierInvoiceById(Number(result.lastInsertRowid))!,
  };
}

export async function selectAndImportFiles(fiscalYearId: number): Promise<ImportResult> {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    title: 'Välj PDF-fakturor att importera',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { customerInvoices: 0, supplierInvoices: 0, customerPayments: 0, skipped: 0, possibleDuplicates: [], errors: [] };
  }

  const importResult: ImportResult = {
    customerInvoices: 0,
    supplierInvoices: 0,
    customerPayments: 0,
    skipped: 0,
    possibleDuplicates: [],
    errors: [],
  };

  for (const filePath of result.filePaths) {
    const fileName = path.basename(filePath);

    // Kolla dublettstatus
    const duplicateStatus = checkDuplicateStatus(filePath, fileName);

    if (duplicateStatus.status === 'exact_duplicate') {
      importResult.skipped++;
      continue;
    }

    if (duplicateStatus.status === 'possible_duplicate') {
      importResult.possibleDuplicates.push({
        fileName,
        newPath: filePath,
        existingPath: duplicateStatus.existingPath,
        existingType: duplicateStatus.existingType,
      });
      importResult.skipped++;
      continue;
    }

    try {
      const imported = await importSingleFile(filePath, fiscalYearId);
      if (imported.type === 'payment') {
        importResult.customerPayments++;
      } else if (imported.type === 'customer') {
        importResult.customerInvoices++;
      } else {
        importResult.supplierInvoices++;
      }
    } catch (error) {
      importResult.errors.push(`${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return importResult;
}

// Open PDF file in default application
export function openInvoiceFile(filePath: string): void {
  const { shell } = require('electron');
  shell.openPath(filePath);
}

// Move invoice between customer and supplier tables
export function moveCustomerInvoiceToSupplier(invoiceId: number): SupplierInvoice {
  const db = getDatabase();
  const original = getCustomerInvoiceById(invoiceId);
  if (!original) throw new Error('Invoice not found');

  // Kopiera till supplier_invoices
  const result = db.prepare(`
    INSERT INTO supplier_invoices
      (fiscal_year_id, supplier_id, invoice_number, invoice_date, due_date,
       amount, vat, total, file_path, file_name, parsed_content, status)
    VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'imported')
  `).run(
    original.fiscal_year_id, original.invoice_number, original.invoice_date,
    original.due_date, original.amount, original.vat, original.total,
    original.file_path, original.file_name, original.parsed_content
  );

  // Ta bort original
  db.prepare('DELETE FROM customer_invoices WHERE id = ?').run(invoiceId);
  return getSupplierInvoiceById(Number(result.lastInsertRowid))!;
}

export function moveSupplierInvoiceToCustomer(invoiceId: number): CustomerInvoice {
  const db = getDatabase();
  const original = getSupplierInvoiceById(invoiceId);
  if (!original) throw new Error('Invoice not found');

  // Kopiera till customer_invoices
  const result = db.prepare(`
    INSERT INTO customer_invoices
      (fiscal_year_id, customer_id, invoice_number, invoice_date, due_date,
       amount, vat, total, file_path, file_name, parsed_content, status)
    VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'imported')
  `).run(
    original.fiscal_year_id, original.invoice_number, original.invoice_date,
    original.due_date, original.amount, original.vat, original.total,
    original.file_path, original.file_name, original.parsed_content
  );

  // Ta bort original
  db.prepare('DELETE FROM supplier_invoices WHERE id = ?').run(invoiceId);
  return getCustomerInvoiceById(Number(result.lastInsertRowid))!;
}

// ========== Year Folder Import ==========

export interface MonthFolderInfo {
  name: string;
  path: string;
  monthNumber: number | null;
  pdfCount: number;
  icloudCount: number;
}

export interface YearFolderPreview {
  folderPath: string;
  folderName: string;
  detectedYear: number | null;
  monthFolders: MonthFolderInfo[];
  rootPdfCount: number;
  rootIcloudCount: number;
  totalPdfCount: number;
  totalIcloudCount: number;
}

export interface MonthImportResult {
  folderName: string;
  monthNumber: number | null;
  imported: number;
  skipped: number;
  possibleDuplicates: PossibleDuplicate[];
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
  totalPossibleDuplicates: PossibleDuplicate[];
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
 * Returnerar både lokala och iCloud-filer
 */
function countPdfsInFolder(folderPath: string): { local: number; icloud: number } {
  try {
    const files = fs.readdirSync(folderPath);
    const localPdfs = files.filter(f => f.toLowerCase().endsWith('.pdf')).length;
    // iCloud placeholder-filer har formatet: .filnamn.pdf.icloud
    const icloudPdfs = files.filter(f => f.startsWith('.') && f.toLowerCase().endsWith('.pdf.icloud')).length;
    return { local: localPdfs, icloud: icloudPdfs };
  } catch {
    return { local: 0, icloud: 0 };
  }
}

/**
 * Hämta lista på iCloud-filer som inte är nedladdade
 */
function getIcloudFiles(folderPath: string): string[] {
  try {
    const files = fs.readdirSync(folderPath);
    return files
      .filter(f => f.startsWith('.') && f.toLowerCase().endsWith('.pdf.icloud'))
      .map(f => path.join(folderPath, f));
  } catch {
    return [];
  }
}

/**
 * Trigga nedladdning av iCloud-filer med brctl
 */
export async function downloadIcloudFiles(folderPath: string): Promise<{ requested: number; errors: string[] }> {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  const result = { requested: 0, errors: [] as string[] };

  // Hitta alla iCloud-filer rekursivt
  const allIcloudFiles: string[] = [];

  function findIcloudFilesRecursive(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          findIcloudFilesRecursive(fullPath);
        } else if (entry.name.startsWith('.') && entry.name.toLowerCase().endsWith('.pdf.icloud')) {
          allIcloudFiles.push(fullPath);
        }
      }
    } catch (err) {
      result.errors.push(`Kunde inte läsa mapp ${dir}: ${err}`);
    }
  }

  findIcloudFilesRecursive(folderPath);

  // Trigga nedladdning för varje fil
  for (const icloudFile of allIcloudFiles) {
    try {
      // brctl download triggar nedladdning av iCloud-filer
      await execAsync(`brctl download "${icloudFile}"`);
      result.requested++;
    } catch (err) {
      // Försök alternativ metod - öppna filen för att trigga nedladdning
      try {
        // Extrahera det riktiga filnamnet från .filnamn.pdf.icloud
        const dir = path.dirname(icloudFile);
        const icloudName = path.basename(icloudFile);
        // Ta bort ledande . och avslutande .icloud
        const realName = icloudName.slice(1, -7);
        const realPath = path.join(dir, realName);

        // Kolla om filen finns nu (kan ha laddats ned)
        if (!fs.existsSync(realPath)) {
          result.errors.push(`${realName}: Kunde inte trigga nedladdning`);
        } else {
          result.requested++;
        }
      } catch {
        result.errors.push(`${path.basename(icloudFile)}: ${err}`);
      }
    }
  }

  return result;
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
      const counts = countPdfsInFolder(subfolderPath);

      monthFolders.push({
        name: entry.name,
        path: subfolderPath,
        monthNumber,
        pdfCount: counts.local,
        icloudCount: counts.icloud,
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
  const rootCounts = countPdfsInFolder(folderPath);

  // Totalt antal PDFer
  const totalPdfCount = rootCounts.local + monthFolders.reduce((sum, mf) => sum + mf.pdfCount, 0);
  const totalIcloudCount = rootCounts.icloud + monthFolders.reduce((sum, mf) => sum + mf.icloudCount, 0);

  return {
    folderPath,
    folderName,
    detectedYear,
    monthFolders,
    rootPdfCount: rootCounts.local,
    rootIcloudCount: rootCounts.icloud,
    totalPdfCount,
    totalIcloudCount,
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
    possibleDuplicates: [],
    errors: [],
  };

  const db = getDatabase();

  try {
    const files = fs.readdirSync(folderPath);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

    for (const fileName of pdfFiles) {
      const filePath = path.join(folderPath, fileName);

      // Kolla dublettstatus
      const duplicateStatus = checkDuplicateStatus(filePath, fileName);

      if (duplicateStatus.status === 'exact_duplicate') {
        result.skipped++;
        continue;
      }

      if (duplicateStatus.status === 'possible_duplicate') {
        result.possibleDuplicates.push({
          fileName,
          newPath: filePath,
          existingPath: duplicateStatus.existingPath,
          existingType: duplicateStatus.existingType,
        });
        result.skipped++;
        continue;
      }

      try {
        const parsedContent = await parsePdf(filePath);
        const invoiceDate = extractDateFromFilename(fileName);

        // 1. Kolla först om det är en inbetalningsverifikation
        if (isCustomerPayment(fileName, parsedContent)) {
          const paymentInfo = extractPaymentInfo(parsedContent, fileName);

          let customerId: number | null = null;
          if (paymentInfo.customerName) {
            customerId = findOrCreateCustomer(paymentInfo.customerName);
          }

          db.prepare(`
            INSERT INTO customer_payments (fiscal_year_id, customer_id, payment_date, amount, payment_reference, file_path, file_name, parsed_content)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            fiscalYearId,
            customerId,
            paymentInfo.paymentDate || invoiceDate,
            paymentInfo.amount || null,
            paymentInfo.paymentReference || null,
            filePath,
            fileName,
            parsedContent
          );
        }
        // 2. Kolla om det är en kundfaktura
        else if (isCustomerInvoice(fileName, parsedContent)) {
          const customerInfo = extractCustomerFromPdf(parsedContent)
            || extractCustomerFromFilename(fileName);

          let customerId: number | null = null;
          if (customerInfo) {
            customerId = findOrCreateCustomer(customerInfo.name, customerInfo.orgNumber);
          }

          // Extrahera belopp från PDF-innehåll
          const amounts = extractInvoiceAmounts(parsedContent);

          db.prepare(`
            INSERT INTO customer_invoices (fiscal_year_id, customer_id, file_path, file_name, parsed_content, invoice_date, amount, vat, total, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'imported')
          `).run(fiscalYearId, customerId, filePath, fileName, parsedContent, invoiceDate, amounts.amount, amounts.vat, amounts.total);
        }
        // 3. Annars är det en leverantörsfaktura
        else {
          const supplierInfo = extractSupplierFromFilename(fileName)
            || extractSupplierFromPdf(parsedContent);

          let supplierId: number | null = null;
          if (supplierInfo) {
            supplierId = findOrCreateSupplier(supplierInfo.name, supplierInfo.orgNumber);
          }

          // Extrahera belopp från PDF-innehåll
          const amounts = extractInvoiceAmounts(parsedContent);

          db.prepare(`
            INSERT INTO supplier_invoices (fiscal_year_id, supplier_id, file_path, file_name, parsed_content, invoice_date, amount, vat, total, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'imported')
          `).run(fiscalYearId, supplierId, filePath, fileName, parsedContent, invoiceDate, amounts.amount, amounts.vat, amounts.total);
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
    totalPossibleDuplicates: [],
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
    result.totalPossibleDuplicates.push(...monthResult.possibleDuplicates);
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
    result.totalPossibleDuplicates.push(...rootResult.possibleDuplicates);
    result.totalErrors.push(...rootResult.errors);
  }

  return result;
}

// ========== PDF-läsning som Base64 ==========

export interface PdfReadResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Läs en PDF-fil och returnera som Base64-sträng med detaljerad felinfo
 */
export function readPdfAsBase64(filePath: string): PdfReadResult {
  try {
    if (!filePath) {
      return { success: false, error: 'Ingen filsökväg angiven' };
    }

    // Kolla om det är en iCloud-placeholder
    const fileName = path.basename(filePath);
    if (fileName.startsWith('.') && fileName.endsWith('.icloud')) {
      return {
        success: false,
        error: 'Filen är inte nedladdad från iCloud. Öppna Finder och klicka på filen för att ladda ner den.'
      };
    }

    if (!fs.existsSync(filePath)) {
      // Kolla om det finns en iCloud-placeholder istället
      const dir = path.dirname(filePath);
      const iCloudName = '.' + fileName + '.icloud';
      const iCloudPath = path.join(dir, iCloudName);

      if (fs.existsSync(iCloudPath)) {
        return {
          success: false,
          error: 'Filen är inte nedladdad från iCloud. Öppna Finder och klicka på filen för att ladda ner den.'
        };
      }

      return { success: false, error: `Filen hittades inte: ${filePath}` };
    }

    // Kolla filstorlek
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return { success: false, error: 'Filen är tom (0 bytes)' };
    }

    const buffer = fs.readFileSync(filePath);

    // Verifiera att det ser ut som en PDF (börjar med %PDF)
    const header = buffer.slice(0, 5).toString('ascii');
    if (!header.startsWith('%PDF')) {
      return { success: false, error: 'Filen är inte en giltig PDF-fil' };
    }

    return { success: true, data: buffer.toString('base64') };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Kunde inte läsa PDF: ${errorMsg}`);
    return { success: false, error: `Kunde inte läsa filen: ${errorMsg}` };
  }
}

// ========== Batch re-extraction av belopp ==========

export interface BatchReExtractResult {
  customerInvoicesUpdated: number;
  supplierInvoicesUpdated: number;
  errors: string[];
}

/**
 * Kör beloppsextraktion på alla redan importerade fakturor för ett räkenskapsår
 */
// ========== Fakturor per kund/leverantör ==========

export interface EntityInvoicesResult<T> {
  invoices: T[];
  years: number[];
}

/**
 * Hämta alla kundfakturor för en specifik kund
 */
export function getInvoicesByCustomerId(customerId: number): EntityInvoicesResult<CustomerInvoice> {
  const db = getDatabase();

  const invoices = db.prepare(`
    SELECT ci.*, c.name as customer_name, fy.year as fiscal_year
    FROM customer_invoices ci
    LEFT JOIN customers c ON ci.customer_id = c.id
    LEFT JOIN fiscal_years fy ON ci.fiscal_year_id = fy.id
    WHERE ci.customer_id = ?
    ORDER BY ci.invoice_date DESC, ci.id DESC
  `).all(customerId) as (CustomerInvoice & { fiscal_year: number })[];

  // Extrahera unika år
  const yearsSet = new Set<number>();
  for (const inv of invoices) {
    if (inv.fiscal_year) {
      yearsSet.add(inv.fiscal_year);
    }
  }
  const years = Array.from(yearsSet).sort((a, b) => b - a);

  return { invoices, years };
}

/**
 * Hämta alla leverantörsfakturor för en specifik leverantör
 */
export function getInvoicesBySupplierId(supplierId: number): EntityInvoicesResult<SupplierInvoice> {
  const db = getDatabase();

  const invoices = db.prepare(`
    SELECT si.*,
      s.name as supplier_name,
      s.category_id as supplier_category_id,
      sc.name as supplier_category_name,
      sc.emoji as supplier_category_emoji,
      COALESCE(si.category_id, s.category_id) as effective_category_id,
      c.name as effective_category_name,
      c.emoji as effective_category_emoji,
      fy.year as fiscal_year
    FROM supplier_invoices si
    LEFT JOIN suppliers s ON si.supplier_id = s.id
    LEFT JOIN categories sc ON s.category_id = sc.id
    LEFT JOIN categories c ON COALESCE(si.category_id, s.category_id) = c.id
    LEFT JOIN fiscal_years fy ON si.fiscal_year_id = fy.id
    WHERE si.supplier_id = ?
    ORDER BY si.invoice_date DESC, si.id DESC
  `).all(supplierId) as (SupplierInvoice & { fiscal_year: number })[];

  // Extrahera unika år
  const yearsSet = new Set<number>();
  for (const inv of invoices) {
    if (inv.fiscal_year) {
      yearsSet.add(inv.fiscal_year);
    }
  }
  const years = Array.from(yearsSet).sort((a, b) => b - a);

  return { invoices, years };
}

export function batchReExtractAmounts(fiscalYearId: number): BatchReExtractResult {
  const db = getDatabase();
  const result: BatchReExtractResult = {
    customerInvoicesUpdated: 0,
    supplierInvoicesUpdated: 0,
    errors: [],
  };

  // Uppdatera kundfakturor
  const customerInvoices = db.prepare(`
    SELECT id, parsed_content, file_name
    FROM customer_invoices
    WHERE fiscal_year_id = ? AND parsed_content IS NOT NULL
  `).all(fiscalYearId) as Array<{ id: number; parsed_content: string; file_name: string }>;

  for (const invoice of customerInvoices) {
    try {
      const amounts = extractInvoiceAmounts(invoice.parsed_content);
      if (amounts.amount !== null || amounts.vat !== null || amounts.total !== null) {
        db.prepare(`
          UPDATE customer_invoices
          SET amount = ?, vat = ?, total = ?
          WHERE id = ?
        `).run(amounts.amount, amounts.vat, amounts.total, invoice.id);
        result.customerInvoicesUpdated++;
      }
    } catch (error) {
      result.errors.push(`Kundfaktura ${invoice.file_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Uppdatera leverantörsfakturor
  const supplierInvoices = db.prepare(`
    SELECT id, parsed_content, file_name
    FROM supplier_invoices
    WHERE fiscal_year_id = ? AND parsed_content IS NOT NULL
  `).all(fiscalYearId) as Array<{ id: number; parsed_content: string; file_name: string }>;

  for (const invoice of supplierInvoices) {
    try {
      const amounts = extractInvoiceAmounts(invoice.parsed_content);
      if (amounts.amount !== null || amounts.vat !== null || amounts.total !== null) {
        db.prepare(`
          UPDATE supplier_invoices
          SET amount = ?, vat = ?, total = ?
          WHERE id = ?
        `).run(amounts.amount, amounts.vat, amounts.total, invoice.id);
        result.supplierInvoicesUpdated++;
      }
    } catch (error) {
      result.errors.push(`Leverantörsfaktura ${invoice.file_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return result;
}
