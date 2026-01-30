import { useState, useEffect } from 'react';
import type { Account, Transaction, TransactionLine } from '../types';

interface TransactionLineInput {
  accountId: number;
  debit: string;
  credit: string;
}

interface TransactionFormProps {
  accounts: Account[];
  transaction?: Transaction | null;
  onSubmit: (date: string, description: string, lines: Array<{ accountId: number; debit: number; credit: number }>) => Promise<void>;
  onCancel: () => void;
}

function TransactionForm({ accounts, transaction, onSubmit, onCancel }: TransactionFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<TransactionLineInput[]>([
    { accountId: 0, debit: '', credit: '' },
    { accountId: 0, debit: '', credit: '' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (transaction) {
      setDate(transaction.date);
      setDescription(transaction.description);
      setLines(
        transaction.lines.map((line: TransactionLine) => ({
          accountId: line.account_id || 0,
          debit: line.debit ? line.debit.toString() : '',
          credit: line.credit ? line.credit.toString() : '',
        }))
      );
    }
  }, [transaction]);

  const addLine = () => {
    setLines([...lines, { accountId: 0, debit: '', credit: '' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof TransactionLineInput, value: string | number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!date) {
      setError('Datum krävs');
      return;
    }

    if (!description.trim()) {
      setError('Beskrivning krävs');
      return;
    }

    const validLines = lines.filter(line => line.accountId > 0 && (parseFloat(line.debit) > 0 || parseFloat(line.credit) > 0));

    if (validLines.length < 2) {
      setError('Minst två konteringsrader krävs');
      return;
    }

    if (!isBalanced) {
      setError('Debet och kredit måste vara i balans');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(
        date,
        description.trim(),
        validLines.map(line => ({
          accountId: line.accountId,
          debit: parseFloat(line.debit) || 0,
          credit: parseFloat(line.credit) || 0,
        }))
      );
    } catch {
      setError('Ett fel uppstod vid sparande');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
          <DocumentIcon className="w-6 h-6 text-primary-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">
            {transaction ? 'Redigera verifikation' : 'Ny verifikation'}
          </h2>
          <p className="text-dark-400 text-sm">Fyll i uppgifter för bokföringen</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
          <ExclamationIcon className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">Datum</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">Beskrivning</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="T.ex. Inköp kontorsmaterial"
            className="input-field"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-dark-200 mb-3">Konteringsrader</label>

        {/* Header */}
        <div className="hidden md:grid grid-cols-12 gap-3 text-xs font-medium text-dark-400 uppercase tracking-wider px-1 mb-2">
          <div className="col-span-6">Konto</div>
          <div className="col-span-2 text-right">Debet</div>
          <div className="col-span-2 text-right">Kredit</div>
          <div className="col-span-2"></div>
        </div>

        {/* Lines */}
        <div className="space-y-2">
          {lines.map((line, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-3 items-center p-3 rounded-xl bg-dark-800/30 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="col-span-12 md:col-span-6">
                <select
                  value={line.accountId}
                  onChange={(e) => updateLine(index, 'accountId', parseInt(e.target.value))}
                  className="input-field text-sm"
                >
                  <option value={0}>Välj konto...</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_number} - {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-5 md:col-span-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.debit}
                  onChange={(e) => updateLine(index, 'debit', e.target.value)}
                  placeholder="0.00"
                  className="input-field text-sm text-right"
                />
              </div>
              <div className="col-span-5 md:col-span-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.credit}
                  onChange={(e) => updateLine(index, 'credit', e.target.value)}
                  placeholder="0.00"
                  className="input-field text-sm text-right"
                />
              </div>
              <div className="col-span-2 flex justify-center">
                {lines.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="p-2 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addLine}
          className="mt-3 text-sm text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1"
        >
          <PlusIcon className="w-4 h-4" />
          Lägg till rad
        </button>
      </div>

      {/* Balance indicator & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-dark-700/50">
        <div className={`flex items-center gap-3 px-4 py-2 rounded-xl ${
          isBalanced
            ? 'bg-accent-green/10 border border-accent-green/30'
            : 'bg-red-500/10 border border-red-500/30'
        }`}>
          {isBalanced ? (
            <CheckIcon className="w-5 h-5 text-accent-green" />
          ) : (
            <ExclamationIcon className="w-5 h-5 text-red-400" />
          )}
          <span className={`text-sm font-medium ${isBalanced ? 'text-accent-green' : 'text-red-400'}`}>
            D: {totalDebit.toFixed(2)} | K: {totalCredit.toFixed(2)}
            <span className="ml-2 text-xs opacity-75">
              {isBalanced ? '(Balanserad)' : '(Obalanserad)'}
            </span>
          </span>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Avbryt
          </button>
          <button
            type="submit"
            disabled={submitting || !isBalanced}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sparar...' : transaction ? 'Uppdatera' : 'Spara'}
          </button>
        </div>
      </div>
    </form>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export default TransactionForm;
