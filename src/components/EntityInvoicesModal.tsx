import { useState, useEffect, useMemo } from 'react';
import { CustomerInvoice, SupplierInvoice } from '../types';
import PDFViewerModal from './PDFViewerModal';

interface EntityInvoicesModalProps {
  isOpen: boolean;
  type: 'customer' | 'supplier';
  entityId: number;
  entityName: string;
  onClose: () => void;
}

function EntityInvoicesModal({ isOpen, type, entityId, entityName, onClose }: EntityInvoicesModalProps) {
  const [invoices, setInvoices] = useState<(CustomerInvoice | SupplierInvoice)[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [pdfViewer, setPdfViewer] = useState<{ filePath: string; fileName: string } | null>(null);

  useEffect(() => {
    if (isOpen && entityId) {
      loadInvoices();
    }
  }, [isOpen, entityId, type]);

  async function loadInvoices() {
    setLoading(true);
    try {
      if (type === 'customer') {
        const result = await window.api.getInvoicesByCustomerId(entityId);
        setInvoices(result.invoices);
        setYears(result.years);
      } else {
        const result = await window.api.getInvoicesBySupplierId(entityId);
        setInvoices(result.invoices);
        setYears(result.years);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filtrera fakturor baserat på valt år
  const filteredInvoices = useMemo(() => {
    if (selectedYear === 'all') return invoices;
    return invoices.filter(inv => {
      // Extrahera år från invoice_date
      if (inv.invoice_date) {
        const year = parseInt(inv.invoice_date.split('-')[0], 10);
        return year === selectedYear;
      }
      return false;
    });
  }, [invoices, selectedYear]);

  // Beräkna totalsumma
  const totalSum = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  }, [filteredInvoices]);

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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center">
        {/* Bakgrund */}
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative z-10 flex flex-col max-w-4xl w-full max-h-[85vh] mx-4 bg-dark-800 rounded-2xl shadow-2xl border border-dark-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                type === 'customer' ? 'bg-accent-pink/20' : 'bg-accent-cyan/20'
              }`}>
                {type === 'customer' ? (
                  <UsersIcon className="w-5 h-5 text-accent-pink" />
                ) : (
                  <TruckIcon className="w-5 h-5 text-accent-cyan" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Fakturor för {entityName}
                </h2>
                <p className="text-sm text-dark-400">
                  {filteredInvoices.length} {type === 'customer' ? 'kundfakturor' : 'leverantörsfakturor'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* År-filter */}
              {years.length > 1 && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="bg-dark-700 border border-dark-600 text-sm text-dark-200 rounded-lg px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">Alla år ({invoices.length})</option>
                  {years.map(year => (
                    <option key={year} value={year}>
                      {year} ({invoices.filter(inv => inv.invoice_date?.startsWith(String(year))).length})
                    </option>
                  ))}
                </select>
              )}

              {/* Stäng-knapp */}
              <button
                onClick={onClose}
                className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                title="Stäng"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Innehåll */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3 text-dark-400">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  Laddar fakturor...
                </div>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mx-auto mb-4">
                  <DocumentIcon className="w-8 h-8 text-dark-500" />
                </div>
                <p className="text-dark-400">Inga fakturor hittades</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-dark-800">
                  <tr className="border-b border-dark-700/50">
                    <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                      Filnamn
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">
                      Belopp
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">
                      Moms
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">
                      Total
                    </th>
                    {type === 'supplier' && (
                      <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                        Kategori
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice, index) => (
                    <tr
                      key={invoice.id}
                      className="table-row animate-fade-in"
                      style={{ animationDelay: `${index * 20}ms` }}
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setPdfViewer({ filePath: invoice.file_path, fileName: invoice.file_name })}
                          className="flex items-center gap-3 text-sm text-primary-400 hover:text-primary-300 transition-colors text-left group"
                          title="Visa PDF"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                            <PdfIcon className="w-4 h-4" />
                          </div>
                          <span className="truncate max-w-[200px]">{invoice.file_name}</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-dark-300">
                        {formatDate(invoice.invoice_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-dark-300 text-right">
                        {invoice.amount !== null ? `${formatAmount(invoice.amount)} kr` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-dark-300 text-right">
                        {invoice.vat !== null ? `${formatAmount(invoice.vat)} kr` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-white font-medium text-right">
                        {invoice.total !== null ? `${formatAmount(invoice.total)} kr` : '-'}
                      </td>
                      {type === 'supplier' && (
                        <td className="px-6 py-4 text-sm text-dark-300">
                          {(invoice as SupplierInvoice).effective_category_emoji && (
                            <span className="mr-1">{(invoice as SupplierInvoice).effective_category_emoji}</span>
                          )}
                          {(invoice as SupplierInvoice).effective_category_name || '-'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer med totalsumma */}
          {filteredInvoices.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-dark-700 bg-dark-800/50">
              <span className="text-sm text-dark-400">
                {filteredInvoices.length} fakturor
              </span>
              <div className="text-right">
                <span className="text-sm text-dark-400 mr-2">Totalt:</span>
                <span className="text-lg font-semibold text-white">
                  {formatAmount(totalSum)} kr
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      {pdfViewer && (
        <PDFViewerModal
          isOpen={true}
          filePath={pdfViewer.filePath}
          fileName={pdfViewer.fileName}
          onClose={() => setPdfViewer(null)}
        />
      )}
    </>
  );
}

// Ikoner
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default EntityInvoicesModal;
