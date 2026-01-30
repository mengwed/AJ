import type { Transaction } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: number) => void;
}

function TransactionList({ transactions, onEdit, onDelete }: TransactionListProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE');
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('sv-SE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (transactions.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mx-auto mb-4">
            <DocumentIcon className="w-8 h-8 text-dark-500" />
          </div>
          <p className="text-dark-400 mb-2">Inga verifikationer hittades</p>
          <p className="text-sm text-dark-500">Skapa din första verifikation ovan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700/50">
              <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                Nr
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                Datum
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                Beskrivning
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                Konton
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">
                Belopp
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">
                Åtgärder
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction, index) => {
              const totalAmount = transaction.lines.reduce(
                (sum, line) => sum + (line.debit || 0),
                0
              );

              return (
                <tr
                  key={transaction.id}
                  className="table-row animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400 font-medium text-sm">
                      #{transaction.id}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-white">{transaction.description}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      {transaction.lines.map((line, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs gap-4">
                          <span className="font-mono text-dark-400">
                            {line.account_number} <span className="text-dark-500">{line.account_name}</span>
                          </span>
                          <span className="text-dark-300 tabular-nums">
                            {line.debit ? (
                              <span className="text-accent-green">D: {formatAmount(line.debit)}</span>
                            ) : ''}
                            {line.credit ? (
                              <span className="text-accent-orange">K: {formatAmount(line.credit)}</span>
                            ) : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-white font-semibold">{formatAmount(totalAmount)} kr</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(transaction)}
                        className="px-3 py-1.5 text-sm text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded-lg transition-colors"
                      >
                        Redigera
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Är du säker på att du vill ta bort denna verifikation?')) {
                            onDelete(transaction.id);
                          }
                        }}
                        className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        Ta bort
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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

export default TransactionList;
