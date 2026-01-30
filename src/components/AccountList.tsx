import { useState } from 'react';
import type { Account, AccountType } from '../types';
import { accountTypeLabels } from '../types';

interface AccountListProps {
  accounts: Account[];
  onEdit: (account: Account) => void;
  onDelete: (id: number) => void;
  onCreate: (accountNumber: string, name: string, type: string) => Promise<void>;
}

function AccountList({ accounts, onEdit, onDelete, onCreate }: AccountListProps) {
  const [showForm, setShowForm] = useState(false);
  const [newAccount, setNewAccount] = useState({ number: '', name: '', type: 'kostnad' as AccountType });
  const [filter, setFilter] = useState<AccountType | 'all'>('all');
  const [search, setSearch] = useState('');

  const filteredAccounts = accounts.filter((account) => {
    const matchesFilter = filter === 'all' || account.type === filter;
    const matchesSearch =
      search === '' ||
      account.account_number.includes(search) ||
      account.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const groupedAccounts = filteredAccounts.reduce((groups, account) => {
    const type = account.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(account);
    return groups;
  }, {} as Record<AccountType, Account[]>);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAccount.number && newAccount.name) {
      await onCreate(newAccount.number, newAccount.name, newAccount.type);
      setNewAccount({ number: '', name: '', type: 'kostnad' });
      setShowForm(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Sök konto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as AccountType | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">Alla typer</option>
          {Object.entries(accountTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
        >
          {showForm ? 'Avbryt' : 'Nytt konto'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Kontonummer"
              value={newAccount.number}
              onChange={(e) => setNewAccount({ ...newAccount, number: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Kontonamn"
              value={newAccount.name}
              onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent col-span-2"
            />
            <select
              value={newAccount.type}
              onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value as AccountType })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {Object.entries(accountTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Skapa konto
            </button>
          </div>
        </form>
      )}

      <div className="space-y-6">
        {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
          <div key={type} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">
                {accountTypeLabels[type as AccountType]} ({typeAccounts.length})
              </h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kontonr
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Namn
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Åtgärder
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {typeAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                      {account.account_number}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">{account.name}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onEdit(account)}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                      >
                        Redigera
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Är du säker på att du vill ta bort detta konto?')) {
                            onDelete(account.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Ta bort
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {filteredAccounts.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Inga konton hittades.
        </div>
      )}
    </div>
  );
}

export default AccountList;
