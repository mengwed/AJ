import { useState, useRef, useEffect, useMemo } from 'react';
import { CustomerInvoice, SupplierInvoice, Category } from '../types';
import EntitySelector from './EntitySelector';

interface InvoiceListProps {
  type: 'customer' | 'supplier';
  invoices: (CustomerInvoice | SupplierInvoice)[];
  categories?: Category[];
  onOpenFile: (filePath: string) => void;
  onViewFile?: (filePath: string, fileName: string) => void;
  onDelete: (id: number) => void;
  onUpdateMapping?: (invoiceId: number, entityId: number | null) => void;
  onRecategorize?: (invoiceId: number) => void;
  onUpdateAmounts?: (invoiceId: number, updates: { amount?: number | null; vat?: number | null; total?: number | null }) => void;
  onUpdateCategory?: (invoiceId: number, categoryId: number | null) => void;
  onEditingChange?: (invoiceId: number | null) => void;
}

type AmountField = 'amount' | 'vat' | 'total';
const FIELD_ORDER: AmountField[] = ['amount', 'vat', 'total'];

type SortKey = 'file_name' | 'entity_name' | 'invoice_date' | 'amount' | 'vat' | 'total' | 'category';
type SortDirection = 'asc' | 'desc';

function InvoiceList({ type, invoices, categories, onOpenFile, onViewFile, onDelete, onUpdateMapping, onRecategorize, onUpdateAmounts, onUpdateCategory, onEditingChange }: InvoiceListProps) {
  const [editingCell, setEditingCell] = useState<{ invoiceId: number; field: AmountField } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('invoice_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const pendingNavigation = useRef<{ invoiceId: number; field: AmountField } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('sv-SE');
  }

  function formatAmount(amount: number | null): string {
    if (amount === null) return '-';
    return new Intl.NumberFormat('sv-SE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function parseAmount(value: string): number | null {
    if (!value.trim()) return null;
    // Handle Swedish format (space as thousands separator, comma as decimal)
    const normalized = value.replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? null : Math.round(num);
  }

  function getNextCell(currentInvoiceId: number, currentField: AmountField, reverse: boolean = false, sorted: (CustomerInvoice | SupplierInvoice)[]): { invoiceId: number; field: AmountField } | null {
    const currentFieldIndex = FIELD_ORDER.indexOf(currentField);
    const currentInvoiceIndex = sorted.findIndex(inv => inv.id === currentInvoiceId);

    if (currentInvoiceIndex === -1) return null;

    if (reverse) {
      // Shift+Tab: go backwards
      if (currentFieldIndex > 0) {
        return { invoiceId: currentInvoiceId, field: FIELD_ORDER[currentFieldIndex - 1] };
      } else if (currentInvoiceIndex > 0) {
        return { invoiceId: sorted[currentInvoiceIndex - 1].id, field: 'total' };
      }
    } else {
      // Tab: go forwards
      if (currentFieldIndex < FIELD_ORDER.length - 1) {
        return { invoiceId: currentInvoiceId, field: FIELD_ORDER[currentFieldIndex + 1] };
      } else if (currentInvoiceIndex < sorted.length - 1) {
        return { invoiceId: sorted[currentInvoiceIndex + 1].id, field: 'amount' };
      }
    }
    return null;
  }

  function startEdit(invoiceId: number, field: AmountField, currentValue: number | null) {
    setEditingCell({ invoiceId, field });
    setEditValue(currentValue !== null ? currentValue.toString() : '');
  }

  function saveEdit(invoiceId: number, field: AmountField) {
    if (!onUpdateAmounts) return;
    const newValue = parseAmount(editValue);
    onUpdateAmounts(invoiceId, { [field]: newValue });
  }

  function handleBlur() {
    if (!editingCell) return;

    // If we have a pending navigation, don't close the cell - let the navigation handle it
    if (pendingNavigation.current) {
      const nav = pendingNavigation.current;
      pendingNavigation.current = null;

      // Save current value
      saveEdit(editingCell.invoiceId, editingCell.field);

      // Navigate to next cell
      const nextInvoice = invoices.find(inv => inv.id === nav.invoiceId);
      if (nextInvoice) {
        const nextValue = nextInvoice[nav.field];
        setEditingCell(nav);
        setEditValue(nextValue !== null ? nextValue.toString() : '');
      }
    } else {
      // Normal blur - save and close
      saveEdit(editingCell.invoiceId, editingCell.field);
      setEditingCell(null);
      setEditValue('');
    }
  }

  function cancelEdit() {
    pendingNavigation.current = null;
    setEditingCell(null);
    setEditValue('');
  }

  function handleKeyDown(e: React.KeyboardEvent, invoiceId: number, field: AmountField) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(invoiceId, field);
      setEditingCell(null);
      setEditValue('');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === 'Tab') {
      const nextCell = getNextCell(invoiceId, field, e.shiftKey, sortedInvoices);
      if (nextCell) {
        e.preventDefault();
        pendingNavigation.current = nextCell;
        // Trigger blur which will handle the navigation
        inputRef.current?.blur();
      } else {
        // No next cell, let default Tab behavior happen (exit editing)
        saveEdit(invoiceId, field);
        setEditingCell(null);
        setEditValue('');
      }
    }
  }

  // Focus input when editing cell changes
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell?.invoiceId, editingCell?.field]);

  // Notify parent when editing state changes
  useEffect(() => {
    onEditingChange?.(editingCell?.invoiceId ?? null);
  }, [editingCell?.invoiceId, onEditingChange]);

  // Sort invoices
  const sortedInvoices = useMemo(() => {
    const sorted = [...invoices].sort((a, b) => {
      let aValue: string | number | null;
      let bValue: string | number | null;

      switch (sortKey) {
        case 'file_name':
          aValue = a.file_name.toLowerCase();
          bValue = b.file_name.toLowerCase();
          break;
        case 'entity_name':
          aValue = type === 'customer'
            ? ((a as CustomerInvoice).customer_name || '').toLowerCase()
            : ((a as SupplierInvoice).supplier_name || '').toLowerCase();
          bValue = type === 'customer'
            ? ((b as CustomerInvoice).customer_name || '').toLowerCase()
            : ((b as SupplierInvoice).supplier_name || '').toLowerCase();
          break;
        case 'invoice_date':
          aValue = a.invoice_date || '';
          bValue = b.invoice_date || '';
          break;
        case 'amount':
          aValue = a.amount ?? -Infinity;
          bValue = b.amount ?? -Infinity;
          break;
        case 'vat':
          aValue = a.vat ?? -Infinity;
          bValue = b.vat ?? -Infinity;
          break;
        case 'total':
          aValue = a.total ?? -Infinity;
          bValue = b.total ?? -Infinity;
          break;
        case 'category':
          aValue = type === 'supplier'
            ? ((a as SupplierInvoice).effective_category_name || '').toLowerCase()
            : '';
          bValue = type === 'supplier'
            ? ((b as SupplierInvoice).effective_category_name || '').toLowerCase()
            : '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [invoices, sortKey, sortDirection, type]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }

  function renderEditableCell(invoiceId: number, field: AmountField, value: number | null, isTotal: boolean = false) {
    const isEditing = editingCell?.invoiceId === invoiceId && editingCell?.field === field;

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => handleKeyDown(e, invoiceId, field)}
          className="w-24 px-2 py-1 text-sm text-right bg-dark-700 border border-primary-500 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="0"
        />
      );
    }

    return (
      <button
        onClick={() => onUpdateAmounts && startEdit(invoiceId, field, value)}
        className={`text-sm text-right w-full px-2 py-1 rounded transition-colors ${
          onUpdateAmounts
            ? 'hover:bg-dark-700 cursor-pointer'
            : 'cursor-default'
        } ${isTotal ? 'text-white font-medium' : 'text-dark-300'}`}
        title={onUpdateAmounts ? 'Klicka för att redigera' : undefined}
        disabled={!onUpdateAmounts}
      >
        {value !== null ? `${formatAmount(value)} kr` : '-'}
      </button>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mx-auto mb-4">
          <DocumentIcon className="w-8 h-8 text-dark-500" />
        </div>
        <p className="text-dark-400">
          Inga {type === 'customer' ? 'kundfakturor' : 'leverantörsfakturor'} importerade
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
      <table className="w-full">
        <thead className="sticky top-0 z-10 bg-dark-800">
          <tr className="border-b border-dark-700/50">
            <SortableHeader
              label="Filnamn"
              sortKey="file_name"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              align="left"
            />
            <SortableHeader
              label={type === 'customer' ? 'Kund' : 'Leverantör'}
              sortKey="entity_name"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              align="left"
            />
            <SortableHeader
              label="Fakturadatum"
              sortKey="invoice_date"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              align="left"
            />
            <SortableHeader
              label="Belopp (ex moms)"
              sortKey="amount"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              align="right"
            />
            <SortableHeader
              label="Moms"
              sortKey="vat"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              align="right"
            />
            <SortableHeader
              label="Total"
              sortKey="total"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              align="right"
            />
            {type === 'supplier' && (
              <SortableHeader
                label="Kategori"
                sortKey="category"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="left"
              />
            )}
            <th className="px-4 py-4 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">
              Åtgärder
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedInvoices.map((invoice, index) => {
            const entityName = type === 'customer'
              ? (invoice as CustomerInvoice).customer_name
              : (invoice as SupplierInvoice).supplier_name;

            return (
              <tr
                key={invoice.id}
                className="table-row animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <td className="px-4 py-4">
                  <button
                    onClick={() => onViewFile ? onViewFile(invoice.file_path, invoice.file_name) : onOpenFile(invoice.file_path)}
                    className="flex items-center gap-3 text-sm text-primary-400 hover:text-primary-300 transition-colors text-left group"
                    title={onViewFile ? 'Visa PDF i appen' : invoice.file_name}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                      <PdfIcon className="w-4 h-4" />
                    </div>
                    <span className="truncate max-w-[200px]">{invoice.file_name}</span>
                  </button>
                </td>
                <td className="px-4 py-4 text-sm text-dark-200">
                  {onUpdateMapping ? (
                    <EntitySelector
                      type={type}
                      value={type === 'customer'
                        ? (invoice as CustomerInvoice).customer_id
                        : (invoice as SupplierInvoice).supplier_id}
                      entityName={entityName}
                      onChange={(entityId) => onUpdateMapping(invoice.id, entityId)}
                    />
                  ) : (
                    entityName || <span className="text-dark-500 italic">Ej kopplad</span>
                  )}
                </td>
                <td className="px-4 py-4 text-sm text-dark-300">
                  {formatDate(invoice.invoice_date)}
                </td>
                <td className="px-4 py-4 text-right">
                  {renderEditableCell(invoice.id, 'amount', invoice.amount)}
                </td>
                <td className="px-4 py-4 text-right">
                  {renderEditableCell(invoice.id, 'vat', invoice.vat)}
                </td>
                <td className="px-4 py-4 text-right">
                  {renderEditableCell(invoice.id, 'total', invoice.total, true)}
                </td>
                {type === 'supplier' && (
                  <td className="px-4 py-4">
                    {onUpdateCategory && categories ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={(invoice as SupplierInvoice).category_id || ''}
                          onChange={(e) => onUpdateCategory(invoice.id, e.target.value ? parseInt(e.target.value) : null)}
                          className="bg-dark-700 border border-dark-600 text-sm text-dark-200 rounded-lg px-2 py-1 focus:ring-primary-500 focus:border-primary-500 cursor-pointer max-w-[160px]"
                        >
                          <option value="">
                            {(invoice as SupplierInvoice).effective_category_name && !(invoice as SupplierInvoice).category_id
                              ? `${(invoice as SupplierInvoice).effective_category_emoji ? (invoice as SupplierInvoice).effective_category_emoji + ' ' : ''}${(invoice as SupplierInvoice).effective_category_name}`
                              : 'Välj...'}
                          </option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.emoji ? `${cat.emoji} ` : ''}{cat.name}</option>
                          ))}
                        </select>
                        {(invoice as SupplierInvoice).category_id && (
                          <button
                            onClick={() => onUpdateCategory(invoice.id, null)}
                            className="text-dark-500 hover:text-dark-300 text-xs"
                            title="Ta bort egen kategori (använd ärvd från leverantör)"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-dark-300">
                        {(invoice as SupplierInvoice).effective_category_emoji && (
                          <span className="mr-1">{(invoice as SupplierInvoice).effective_category_emoji}</span>
                        )}
                        {(invoice as SupplierInvoice).effective_category_name || <span className="text-dark-500 italic">-</span>}
                      </span>
                    )}
                  </td>
                )}
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onRecategorize && (
                      <button
                        onClick={() => onRecategorize(invoice.id)}
                        className="p-2 text-dark-400 hover:text-accent-cyan hover:bg-accent-cyan/10 rounded-lg transition-colors"
                        title={type === 'customer' ? 'Flytta till leverantörsfakturor' : 'Flytta till kundfakturor'}
                      >
                        <SwitchIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(invoice.id)}
                      className="p-2 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Ta bort"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface SortableHeaderProps {
  label: string;
  sortKey: SortKey;
  currentSortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  align: 'left' | 'right' | 'center';
}

function SortableHeader({ label, sortKey, currentSortKey, sortDirection, onSort, align }: SortableHeaderProps) {
  const isActive = currentSortKey === sortKey;
  const alignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

  return (
    <th className="px-4 py-4 text-xs font-medium text-dark-400 uppercase tracking-wider">
      <button
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 ${alignClass} w-full hover:text-dark-200 transition-colors group`}
      >
        <span className={align === 'right' ? 'order-2' : ''}>{label}</span>
        <span className={`${align === 'right' ? 'order-1' : ''} ${isActive ? 'text-primary-400' : 'text-dark-600 group-hover:text-dark-400'}`}>
          {isActive ? (
            sortDirection === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />
          ) : (
            <ChevronUpDownIcon className="w-3.5 h-3.5" />
          )}
        </span>
      </button>
    </th>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronUpDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function PdfIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function SwitchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

export default InvoiceList;
