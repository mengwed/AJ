import { useEffect, useState } from 'react';
import { useAccounts } from '../hooks/useDatabase';
import AccountList from '../components/AccountList';
import type { Account, AccountType } from '../types';
import { accountTypeLabels } from '../types';

function Accounts() {
  const { accounts, loading, error, fetchAccounts, createAccount, updateAccount, deleteAccount } = useAccounts();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAccount) {
      await updateAccount(
        editingAccount.id,
        editingAccount.account_number,
        editingAccount.name,
        editingAccount.type
      );
      setEditingAccount(null);
    }
  };

  if (loading && accounts.length === 0) {
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
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Kontoplan</h1>
        <p className="text-dark-400">Hantera din kontoplan enligt BAS-standarden</p>
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

      {/* Edit Modal */}
      {editingAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="card p-6 w-full max-w-md mx-4 animate-slide-up">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <EditIcon className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Redigera konto</h2>
                <p className="text-dark-400 text-sm">Uppdatera kontoinformationen</p>
              </div>
            </div>

            <form onSubmit={handleUpdate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">
                    Kontonummer
                  </label>
                  <input
                    type="text"
                    value={editingAccount.account_number}
                    onChange={(e) =>
                      setEditingAccount({ ...editingAccount, account_number: e.target.value })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">
                    Kontonamn
                  </label>
                  <input
                    type="text"
                    value={editingAccount.name}
                    onChange={(e) =>
                      setEditingAccount({ ...editingAccount, name: e.target.value })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">
                    Kontotyp
                  </label>
                  <select
                    value={editingAccount.type}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        type: e.target.value as AccountType,
                      })
                    }
                    className="input-field"
                  >
                    {Object.entries(accountTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-dark-700/50">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="btn-secondary"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Spara
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account List */}
      <AccountList
        accounts={accounts}
        onEdit={handleEdit}
        onDelete={deleteAccount}
        onCreate={createAccount}
      />
    </div>
  );
}

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

export default Accounts;
