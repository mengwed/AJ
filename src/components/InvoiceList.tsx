import { CustomerInvoice, SupplierInvoice } from '../types';

interface InvoiceListProps {
  type: 'customer' | 'supplier';
  invoices: (CustomerInvoice | SupplierInvoice)[];
  onOpenFile: (filePath: string) => void;
  onDelete: (id: number) => void;
}

function InvoiceList({ type, invoices, onOpenFile, onDelete }: InvoiceListProps) {
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

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      imported: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30',
      processed: 'bg-accent-green/20 text-accent-green border-accent-green/30',
      paid: 'bg-dark-600 text-dark-300 border-dark-500',
      overdue: 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    const labels: Record<string, string> = {
      imported: 'Importerad',
      processed: 'Behandlad',
      paid: 'Betald',
      overdue: 'Förfallen',
    };

    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${styles[status] || styles.imported}`}>
        {labels[status] || status}
      </span>
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
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-700/50">
            <th className="px-4 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
              Filnamn
            </th>
            <th className="px-4 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
              {type === 'customer' ? 'Kund' : 'Leverantör'}
            </th>
            <th className="px-4 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
              Fakturadatum
            </th>
            <th className="px-4 py-4 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">
              Belopp
            </th>
            <th className="px-4 py-4 text-center text-xs font-medium text-dark-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-4 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">
              Åtgärder
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice, index) => {
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
                    onClick={() => onOpenFile(invoice.file_path)}
                    className="flex items-center gap-3 text-sm text-primary-400 hover:text-primary-300 transition-colors text-left group"
                    title={invoice.file_name}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                      <PdfIcon className="w-4 h-4" />
                    </div>
                    <span className="truncate max-w-[200px]">{invoice.file_name}</span>
                  </button>
                </td>
                <td className="px-4 py-4 text-sm text-dark-200">
                  {entityName || <span className="text-dark-500 italic">Ej kopplad</span>}
                </td>
                <td className="px-4 py-4 text-sm text-dark-300">
                  {formatDate(invoice.invoice_date)}
                </td>
                <td className="px-4 py-4 text-sm text-white text-right font-medium">
                  {invoice.total ? `${formatAmount(invoice.total)} kr` : '-'}
                </td>
                <td className="px-4 py-4 text-center">
                  {getStatusBadge(invoice.status)}
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onOpenFile(invoice.file_path)}
                      className="p-2 text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors"
                      title="Öppna PDF"
                    >
                      <ExternalLinkIcon className="w-4 h-4" />
                    </button>
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

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
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

export default InvoiceList;
