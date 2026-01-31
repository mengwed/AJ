import { useState, useEffect, useMemo } from 'react';
import { FiscalYear, CustomerInvoice, SupplierInvoice, ImportResult, Category, ExportResult } from '../types';
import YearSelector from '../components/YearSelector';
import InvoiceList from '../components/InvoiceList';
import YearImportModal from '../components/YearImportModal';
import PDFViewerModal from '../components/PDFViewerModal';

type TabType = 'customer' | 'supplier';

function Invoices() {
  const [activeYear, setActiveYear] = useState<FiscalYear | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('customer');
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showYearImportModal, setShowYearImportModal] = useState(false);
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false);
  const [showMissingAmountOnly, setShowMissingAmountOnly] = useState(false);
  const [viewingPdf, setViewingPdf] = useState<{ filePath: string; fileName: string } | null>(null);
  const [editingCustomerInvoiceId, setEditingCustomerInvoiceId] = useState<number | null>(null);
  const [editingSupplierInvoiceId, setEditingSupplierInvoiceId] = useState<number | null>(null);
  const [reExtractResult, setReExtractResult] = useState<{ customerInvoicesUpdated: number; supplierInvoicesUpdated: number; errors: string[] } | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (activeYear) {
      loadInvoices();
    }
  }, [activeYear]);

  async function loadCategories() {
    const data = await window.api.getAllCategories();
    setCategories(data);
  }

  async function loadInvoices() {
    if (!activeYear) return;

    setLoading(true);
    const [customers, suppliers] = await Promise.all([
      window.api.getCustomerInvoices(activeYear.id),
      window.api.getSupplierInvoices(activeYear.id),
    ]);
    setCustomerInvoices(customers);
    setSupplierInvoices(suppliers);
    setLoading(false);
  }

  function handleYearChange(year: FiscalYear) {
    setActiveYear(year);
  }

  async function handleSelectAndImport() {
    if (!activeYear) return;

    setLoading(true);
    try {
      const result = await window.api.selectAndImportFiles(activeYear.id);
      if (result.customerInvoices > 0 || result.supplierInvoices > 0 || result.skipped > 0) {
        setImportResult(result);
        loadInvoices();
      }
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenFile(filePath: string) {
    await window.api.openInvoiceFile(filePath);
  }

  function handleViewFile(filePath: string, fileName: string) {
    setViewingPdf({ filePath, fileName });
  }

  async function handleDeleteCustomerInvoice(id: number) {
    if (confirm('Är du säker på att du vill ta bort denna faktura?')) {
      await window.api.deleteCustomerInvoice(id);
      loadInvoices();
    }
  }

  async function handleDeleteSupplierInvoice(id: number) {
    if (confirm('Är du säker på att du vill ta bort denna faktura?')) {
      await window.api.deleteSupplierInvoice(id);
      loadInvoices();
    }
  }

  function dismissImportResult() {
    setImportResult(null);
  }

  async function handleUpdateCustomerMapping(invoiceId: number, customerId: number | null) {
    await window.api.updateCustomerInvoice(invoiceId, { customer_id: customerId });
    loadInvoices();
  }

  async function handleUpdateSupplierMapping(invoiceId: number, supplierId: number | null) {
    await window.api.updateSupplierInvoice(invoiceId, { supplier_id: supplierId });
    loadInvoices();
  }

  async function handleRecategorizeToSupplier(invoiceId: number) {
    if (confirm('Flytta till leverantörsfakturor?')) {
      await window.api.moveCustomerInvoiceToSupplier(invoiceId);
      loadInvoices();
    }
  }

  async function handleRecategorizeToCustomer(invoiceId: number) {
    if (confirm('Flytta till kundfakturor?')) {
      await window.api.moveSupplierInvoiceToCustomer(invoiceId);
      loadInvoices();
    }
  }

  // Filter invoices based on active filters
  // Always keep the currently-editing invoice visible (pinned)
  const filteredCustomerInvoices = customerInvoices.filter(inv => {
    // Always show the invoice being edited
    if (inv.id === editingCustomerInvoiceId) return true;
    if (showUnmappedOnly && inv.customer_id !== null) return false;
    if (showMissingAmountOnly && inv.amount !== null) return false;
    return true;
  });

  const filteredSupplierInvoices = supplierInvoices.filter(inv => {
    // Always show the invoice being edited
    if (inv.id === editingSupplierInvoiceId) return true;
    if (showUnmappedOnly && inv.supplier_id !== null) return false;
    if (showMissingAmountOnly && inv.amount !== null) return false;
    return true;
  });

  // Calculate totals for customer invoices
  // Beräkna moms som total - belopp istället för att använda vat-fältet (som kan vara korrupt)
  const customerTotals = useMemo(() => {
    return customerInvoices.reduce(
      (acc, inv) => {
        const amount = inv.amount || 0;
        const total = inv.total || 0;
        const vat = total - amount;
        return {
          amount: acc.amount + amount,
          vat: acc.vat + vat,
          total: acc.total + total,
        };
      },
      { amount: 0, vat: 0, total: 0 }
    );
  }, [customerInvoices]);

  // Calculate totals for supplier invoices
  const supplierTotals = useMemo(() => {
    return supplierInvoices.reduce(
      (acc, inv) => {
        const amount = inv.amount || 0;
        const total = inv.total || 0;
        const vat = total - amount;
        return {
          amount: acc.amount + amount,
          vat: acc.vat + vat,
          total: acc.total + total,
        };
      },
      { amount: 0, vat: 0, total: 0 }
    );
  }, [supplierInvoices]);

  function formatAmount(value: number): string {
    return value.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  async function handleUpdateCustomerAmounts(invoiceId: number, updates: { amount?: number | null; vat?: number | null; total?: number | null }) {
    // Update local state optimistically for smooth Tab navigation
    setCustomerInvoices(prev => prev.map(inv =>
      inv.id === invoiceId ? { ...inv, ...updates } : inv
    ));
    // Save to database in background
    await window.api.updateCustomerInvoice(invoiceId, updates);
  }

  async function handleUpdateSupplierAmounts(invoiceId: number, updates: { amount?: number | null; vat?: number | null; total?: number | null }) {
    // Update local state optimistically for smooth Tab navigation
    setSupplierInvoices(prev => prev.map(inv =>
      inv.id === invoiceId ? { ...inv, ...updates } : inv
    ));
    // Save to database in background
    await window.api.updateSupplierInvoice(invoiceId, updates);
  }

  async function handleReExtractAmounts() {
    if (!activeYear) return;
    setLoading(true);
    try {
      const result = await window.api.batchReExtractAmounts(activeYear.id);
      setReExtractResult(result);
      loadInvoices();
    } catch (error) {
      console.error('Re-extraction failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateSupplierCategory(invoiceId: number, categoryId: number | null) {
    // Find the invoice to get supplier's category for effective display
    const invoice = supplierInvoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    // Find category for optimistic update
    const category = categoryId ? categories.find(c => c.id === categoryId) : null;

    // Update local state optimistically
    setSupplierInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        // If setting a specific category, use that; if clearing, fall back to supplier's category
        const effectiveCategoryId = categoryId !== null ? categoryId : inv.supplier_category_id || null;
        const effectiveCategoryName = categoryId !== null
          ? (category?.name || null)
          : inv.supplier_category_name || null;
        const effectiveCategoryEmoji = categoryId !== null
          ? (category?.emoji || null)
          : inv.supplier_category_emoji || null;

        return {
          ...inv,
          category_id: categoryId,
          effective_category_id: effectiveCategoryId,
          effective_category_name: effectiveCategoryName,
          effective_category_emoji: effectiveCategoryEmoji,
        };
      }
      return inv;
    }));

    // Save to database in background
    await window.api.updateSupplierInvoice(invoiceId, { category_id: categoryId });
  }

  async function handleExportToExcel() {
    if (!activeYear) return;
    setLoading(true);
    try {
      const result = await window.api.exportInvoicesToExcel(activeYear.id);
      setExportResult(result);
    } catch (error) {
      setExportResult({
        success: false,
        error: error instanceof Error ? error.message : 'Okänt fel vid export',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Fakturor</h1>
          <p className="text-dark-400">Hantera dina kund- och leverantörsfakturor</p>
        </div>
        <div className="flex items-center gap-4">
          <YearSelector onYearChange={handleYearChange} />
          <button
            onClick={handleExportToExcel}
            disabled={!activeYear || loading}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportera alla fakturor till Excel"
          >
            <DownloadIcon className="w-5 h-5" />
            Exportera Excel
          </button>
          <button
            onClick={handleReExtractAmounts}
            disabled={!activeYear || loading}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Kör om beloppsextraktion på alla fakturor"
          >
            <RefreshIcon className="w-5 h-5" />
            Kör om belopp
          </button>
          <button
            onClick={() => setShowYearImportModal(true)}
            disabled={loading}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FolderPlusIcon className="w-5 h-5" />
            Importera årsmapp
          </button>
          <button
            onClick={handleSelectAndImport}
            disabled={!activeYear || loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UploadIcon className="w-5 h-5" />
            Importera PDF
          </button>
        </div>
      </div>

      {/* Invoice Totals Summary */}
      {activeYear && (
        <div className="card px-4 py-3 space-y-2">
          {/* Customer Invoices Summary */}
          <div className="flex items-center text-sm whitespace-nowrap">
            <div className="flex items-center gap-2 w-[180px]">
              <UserIcon className="w-4 h-4 text-primary-400" />
              <span className="font-medium text-primary-400">Kundfakturor</span>
            </div>
            <div className="w-[200px]">
              <span className="text-dark-400">Belopp</span>
              <span className="ml-2 text-white font-medium tabular-nums">{formatAmount(customerTotals.amount)} kr</span>
            </div>
            <div className="w-[200px]">
              <span className="text-dark-400">Moms</span>
              <span className="ml-2 text-white font-medium tabular-nums">{formatAmount(customerTotals.vat)} kr</span>
            </div>
            <div>
              <span className="text-dark-400">Total</span>
              <span className="ml-2 text-primary-400 font-semibold tabular-nums">{formatAmount(customerTotals.total)} kr</span>
            </div>
          </div>

          {/* Supplier Invoices Summary */}
          <div className="flex items-center text-sm whitespace-nowrap">
            <div className="flex items-center gap-2 w-[180px]">
              <TruckIcon className="w-4 h-4 text-accent-cyan" />
              <span className="font-medium text-accent-cyan">Leverantörsfakturor</span>
            </div>
            <div className="w-[200px]">
              <span className="text-dark-400">Belopp</span>
              <span className="ml-2 text-white font-medium tabular-nums">{formatAmount(supplierTotals.amount)} kr</span>
            </div>
            <div className="w-[200px]">
              <span className="text-dark-400">Moms</span>
              <span className="ml-2 text-white font-medium tabular-nums">{formatAmount(supplierTotals.vat)} kr</span>
            </div>
            <div>
              <span className="text-dark-400">Total</span>
              <span className="ml-2 text-accent-cyan font-semibold tabular-nums">{formatAmount(supplierTotals.total)} kr</span>
            </div>
          </div>
        </div>
      )}

      {/* Export Result */}
      {exportResult && (
        <div className={`card p-4 animate-fade-in ${exportResult.success ? 'border-accent-green/30 bg-accent-green/10' : 'border-red-500/30 bg-red-500/10'}`}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className={`font-medium flex items-center gap-2 ${exportResult.success ? 'text-accent-green' : 'text-red-400'}`}>
                {exportResult.success ? <CheckIcon className="w-5 h-5" /> : <XIcon className="w-5 h-5" />}
                {exportResult.success ? 'Export slutförd' : 'Export misslyckades'}
              </h3>
              <div className="text-sm text-dark-300 mt-2">
                {exportResult.success ? (
                  <>
                    <p>Antal rader: <span className="text-white font-medium">{exportResult.rowCount}</span></p>
                    <p className="text-dark-400 text-xs mt-1 truncate max-w-md">{exportResult.filePath}</p>
                  </>
                ) : (
                  <p className="text-red-400">{exportResult.error}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setExportResult(null)}
              className="text-dark-400 hover:text-white transition-colors p-1"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Re-Extract Result */}
      {reExtractResult && (
        <div className="card p-4 border-accent-cyan/30 bg-accent-cyan/10 animate-fade-in">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-accent-cyan flex items-center gap-2">
                <CheckIcon className="w-5 h-5" />
                Beloppsextraktion slutförd
              </h3>
              <div className="text-sm text-dark-300 mt-2 space-y-1">
                <p>Kundfakturor uppdaterade: <span className="text-white font-medium">{reExtractResult.customerInvoicesUpdated}</span></p>
                <p>Leverantörsfakturor uppdaterade: <span className="text-white font-medium">{reExtractResult.supplierInvoicesUpdated}</span></p>
                {reExtractResult.errors.length > 0 && (
                  <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-red-400 font-medium mb-1">Fel:</p>
                    <ul className="list-disc list-inside text-red-400/80 text-xs">
                      {reExtractResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setReExtractResult(null)}
              className="text-dark-400 hover:text-white transition-colors p-1"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className="card p-4 border-accent-green/30 bg-accent-green/10 animate-fade-in">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-accent-green flex items-center gap-2">
                <CheckIcon className="w-5 h-5" />
                Import slutförd
              </h3>
              <div className="text-sm text-dark-300 mt-2 space-y-1">
                <p>Kundfakturor: <span className="text-white font-medium">{importResult.customerInvoices}</span></p>
                <p>Leverantörsfakturor: <span className="text-white font-medium">{importResult.supplierInvoices}</span></p>
                {importResult.skipped > 0 && (
                  <p>Överhoppade: <span className="text-dark-400">{importResult.skipped}</span></p>
                )}
                {importResult.errors.length > 0 && (
                  <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-red-400 font-medium mb-1">Fel:</p>
                    <ul className="list-disc list-inside text-red-400/80 text-xs">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={dismissImportResult}
              className="text-dark-400 hover:text-white transition-colors p-1"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Invoice Tabs & List */}
      <div className="card overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-dark-700/50">
          <nav className="flex items-center">
            <button
              onClick={() => setActiveTab('customer')}
              className={`relative px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'customer'
                  ? 'text-primary-400'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Kundfakturor
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'customer'
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'bg-dark-700 text-dark-400'
                }`}>
                  {filteredCustomerInvoices.length}
                  {(showUnmappedOnly || showMissingAmountOnly) && customerInvoices.length !== filteredCustomerInvoices.length && (
                    <span className="text-dark-500">/{customerInvoices.length}</span>
                  )}
                </span>
              </div>
              {activeTab === 'customer' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-primary-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('supplier')}
              className={`relative px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'supplier'
                  ? 'text-accent-cyan'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <TruckIcon className="w-4 h-4" />
                Leverantörsfakturor
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'supplier'
                    ? 'bg-accent-cyan/20 text-accent-cyan'
                    : 'bg-dark-700 text-dark-400'
                }`}>
                  {filteredSupplierInvoices.length}
                  {(showUnmappedOnly || showMissingAmountOnly) && supplierInvoices.length !== filteredSupplierInvoices.length && (
                    <span className="text-dark-500">/{supplierInvoices.length}</span>
                  )}
                </span>
              </div>
              {activeTab === 'supplier' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent-cyan to-accent-blue" />
              )}
            </button>

            {/* Filters */}
            <div className="flex items-center gap-4 ml-auto pr-4">
              <label className="flex items-center gap-2 text-sm text-dark-400 cursor-pointer hover:text-dark-300 transition-colors">
                <input
                  type="checkbox"
                  checked={showUnmappedOnly}
                  onChange={(e) => setShowUnmappedOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer"
                />
                Visa endast omappade
              </label>
              <label className="flex items-center gap-2 text-sm text-dark-400 cursor-pointer hover:text-dark-300 transition-colors">
                <input
                  type="checkbox"
                  checked={showMissingAmountOnly}
                  onChange={(e) => setShowMissingAmountOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-accent-cyan focus:ring-accent-cyan focus:ring-offset-0 cursor-pointer"
                />
                Saknar belopp
              </label>
            </div>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3 text-dark-400">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                Laddar...
              </div>
            </div>
          ) : !activeYear ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-8 h-8 text-dark-500" />
              </div>
              <p className="text-dark-400">Välj ett räkenskapsår för att visa fakturor</p>
            </div>
          ) : activeTab === 'customer' ? (
            <InvoiceList
              type="customer"
              invoices={filteredCustomerInvoices}
              onOpenFile={handleOpenFile}
              onViewFile={handleViewFile}
              onDelete={handleDeleteCustomerInvoice}
              onUpdateMapping={handleUpdateCustomerMapping}
              onRecategorize={handleRecategorizeToSupplier}
              onUpdateAmounts={handleUpdateCustomerAmounts}
              onEditingChange={setEditingCustomerInvoiceId}
            />
          ) : (
            <InvoiceList
              type="supplier"
              invoices={filteredSupplierInvoices}
              onOpenFile={handleOpenFile}
              onViewFile={handleViewFile}
              onDelete={handleDeleteSupplierInvoice}
              onUpdateMapping={handleUpdateSupplierMapping}
              onRecategorize={handleRecategorizeToCustomer}
              onUpdateAmounts={handleUpdateSupplierAmounts}
              onEditingChange={setEditingSupplierInvoiceId}
              categories={categories}
              onUpdateCategory={handleUpdateSupplierCategory}
            />
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="card p-5 border-primary-500/20 bg-primary-500/5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
            <InfoIcon className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="font-medium text-white mb-2">Filnamnsmönster för kategorisering</h3>
            <div className="text-sm text-dark-300 space-y-2">
              <p>
                <span className="text-primary-400 font-medium">Kundfaktura:</span> Filnamn som börjar med datum och "Faktura"
              </p>
              <p className="ml-4 text-dark-400">
                Exempel: <code className="px-2 py-0.5 rounded bg-dark-700 text-accent-cyan text-xs">2025-01-15 Faktura AB Company.pdf</code>
              </p>
              <p>
                <span className="text-accent-cyan font-medium">Leverantörsfaktura:</span> Alla andra PDF-filer
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Year Import Modal */}
      <YearImportModal
        isOpen={showYearImportModal}
        onClose={() => setShowYearImportModal(false)}
        onImportComplete={loadInvoices}
      />

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        isOpen={viewingPdf !== null}
        filePath={viewingPdf?.filePath || ''}
        fileName={viewingPdf?.fileName || ''}
        onClose={() => setViewingPdf(null)}
      />
    </div>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function FolderPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h1m6-11v11m0-11h4l4 4v7a2 2 0 01-2 2h-1m-6-11h4m-2 11a2 2 0 11-4 0m6 0a2 2 0 11-4 0" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

export default Invoices;
