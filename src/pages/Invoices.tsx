import { useState, useEffect } from 'react';
import { FiscalYear, CustomerInvoice, SupplierInvoice, ImportResult } from '../types';
import YearSelector from '../components/YearSelector';
import FolderSelector from '../components/FolderSelector';
import InvoiceList from '../components/InvoiceList';
import YearImportModal from '../components/YearImportModal';

type TabType = 'customer' | 'supplier';

function Invoices() {
  const [activeYear, setActiveYear] = useState<FiscalYear | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('customer');
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showYearImportModal, setShowYearImportModal] = useState(false);

  useEffect(() => {
    if (activeYear) {
      loadInvoices();
    }
  }, [activeYear]);

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

  async function handleFolderImport(folderId: number) {
    if (!activeYear) return;

    setLoading(true);
    try {
      const result = await window.api.scanAndImportFolder(folderId, activeYear.id);
      setImportResult(result);
      loadInvoices();
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setLoading(false);
    }
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

      {/* Folder Selector */}
      <FolderSelector onImport={handleFolderImport} />

      {/* Invoice Tabs & List */}
      <div className="card overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-dark-700/50">
          <nav className="flex">
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
                  {customerInvoices.length}
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
                  {supplierInvoices.length}
                </span>
              </div>
              {activeTab === 'supplier' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent-cyan to-accent-blue" />
              )}
            </button>
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
              invoices={customerInvoices}
              onOpenFile={handleOpenFile}
              onDelete={handleDeleteCustomerInvoice}
            />
          ) : (
            <InvoiceList
              type="supplier"
              invoices={supplierInvoices}
              onOpenFile={handleOpenFile}
              onDelete={handleDeleteSupplierInvoice}
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
    </div>
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

export default Invoices;
