import { useEffect, useState } from 'react';
import { useTransactions, useAccounts } from '../hooks/useDatabase';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import type { Transaction } from '../types';

function Transactions() {
  const { transactions, loading, error, fetchTransactions, createTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { accounts, fetchAccounts } = useAccounts();
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
  }, [fetchTransactions, fetchAccounts]);

  const handleCreate = async (date: string, description: string, lines: Array<{ accountId: number; debit: number; credit: number }>) => {
    await createTransaction(date, description, lines);
    setShowForm(false);
  };

  const handleUpdate = async (date: string, description: string, lines: Array<{ accountId: number; debit: number; credit: number }>) => {
    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, date, description, lines);
      setEditingTransaction(null);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    await deleteTransaction(id);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTransaction(null);
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-dark-400">
          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          Laddar...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Verifikationer</h1>
          <p className="text-dark-400">{transactions.length} bokförda händelser</p>
        </div>
        {!showForm && !editingTransaction && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Ny verifikation
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-red-500/30 bg-red-500/10 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <ExclamationIcon className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      {(showForm || editingTransaction) && (
        <div className="animate-fade-in">
          <TransactionForm
            accounts={accounts}
            transaction={editingTransaction}
            onSubmit={editingTransaction ? handleUpdate : handleCreate}
            onCancel={handleCancel}
          />
        </div>
      )}

      {/* List */}
      <TransactionList
        transactions={transactions}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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

export default Transactions;
