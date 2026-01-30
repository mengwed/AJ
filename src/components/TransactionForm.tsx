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
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">
        {transaction ? 'Redigera verifikation' : 'Ny verifikation'}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivning</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="T.ex. Inköp kontorsmaterial"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Konteringsrader</label>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
            <div className="col-span-6">Konto</div>
            <div className="col-span-2 text-right">Debet</div>
            <div className="col-span-2 text-right">Kredit</div>
            <div className="col-span-2"></div>
          </div>

          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">
                <select
                  value={line.accountId}
                  onChange={(e) => updateLine(index, 'accountId', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value={0}>Välj konto...</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_number} - {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.debit}
                  onChange={(e) => updateLine(index, 'debit', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-right"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.credit}
                  onChange={(e) => updateLine(index, 'credit', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-right"
                />
              </div>
              <div className="col-span-2 flex justify-center">
                {lines.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addLine}
          className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          + Lägg till rad
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <div className="text-sm">
          <span className={`font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
            Debet: {totalDebit.toFixed(2)} | Kredit: {totalCredit.toFixed(2)}
            {isBalanced ? ' (Balanserad)' : ' (Obalanserad)'}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
          >
            Avbryt
          </button>
          <button
            type="submit"
            disabled={submitting || !isBalanced}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sparar...' : transaction ? 'Uppdatera' : 'Spara'}
          </button>
        </div>
      </div>
    </form>
  );
}

export default TransactionForm;
