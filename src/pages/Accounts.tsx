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
        <div className="text-gray-500">Laddar...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Kontoplan</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {editingAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Redigera konto</h2>
            <form onSubmit={handleUpdate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kontonummer
                  </label>
                  <input
                    type="text"
                    value={editingAccount.account_number}
                    onChange={(e) =>
                      setEditingAccount({ ...editingAccount, account_number: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kontonamn
                  </label>
                  <input
                    type="text"
                    value={editingAccount.name}
                    onChange={(e) =>
                      setEditingAccount({ ...editingAccount, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {Object.entries(accountTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  Spara
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AccountList
        accounts={accounts}
        onEdit={handleEdit}
        onDelete={deleteAccount}
        onCreate={createAccount}
      />
    </div>
  );
}

export default Accounts;
