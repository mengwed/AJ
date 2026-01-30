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
        <div className="text-gray-500">Laddar...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Verifikationer</h1>
        {!showForm && !editingTransaction && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            Ny verifikation
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {(showForm || editingTransaction) && (
        <div className="mb-6">
          <TransactionForm
            accounts={accounts}
            transaction={editingTransaction}
            onSubmit={editingTransaction ? handleUpdate : handleCreate}
            onCancel={handleCancel}
          />
        </div>
      )}

      <TransactionList
        transactions={transactions}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default Transactions;
