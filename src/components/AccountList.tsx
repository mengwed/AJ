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

  const typeColors: Record<string, string> = {
    tillgång: 'from-accent-green/20 to-accent-green/5 border-accent-green/30 text-accent-green',
    skuld: 'from-accent-orange/20 to-accent-orange/5 border-accent-orange/30 text-accent-orange',
    eget_kapital: 'from-accent-purple/20 to-accent-purple/5 border-accent-purple/30 text-accent-purple',
    intäkt: 'from-accent-cyan/20 to-accent-cyan/5 border-accent-cyan/30 text-accent-cyan',
    kostnad: 'from-accent-pink/20 to-accent-pink/5 border-accent-pink/30 text-accent-pink',
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="Sök konto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-12"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as AccountType | 'all')}
          className="input-field w-auto"
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
          className={showForm ? 'btn-secondary' : 'btn-primary'}
        >
          {showForm ? 'Avbryt' : 'Nytt konto'}
        </button>
      </div>

      {/* New Account Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 animate-fade-in">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-accent-green/20 flex items-center justify-center">
              <PlusIcon className="w-6 h-6 text-accent-green" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Nytt konto</h2>
              <p className="text-dark-400 text-sm">Lägg till ett konto i kontoplanen</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Kontonummer"
              value={newAccount.number}
              onChange={(e) => setNewAccount({ ...newAccount, number: e.target.value })}
              className="input-field"
            />
            <input
              type="text"
              placeholder="Kontonamn"
              value={newAccount.name}
              onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              className="input-field md:col-span-2"
            />
            <select
              value={newAccount.type}
              onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value as AccountType })}
              className="input-field"
            >
              {Object.entries(accountTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="btn-primary"
            >
              Skapa konto
            </button>
          </div>
        </form>
      )}

      {/* Account Groups */}
      <div className="space-y-6">
        {Object.entries(groupedAccounts).map(([type, typeAccounts], groupIndex) => (
          <div
            key={type}
            className="card overflow-hidden animate-fade-in"
            style={{ animationDelay: `${groupIndex * 100}ms` }}
          >
            <div className={`px-6 py-4 bg-gradient-to-r ${typeColors[type] || 'from-dark-700 to-dark-800'} border-b border-dark-700/50`}>
              <h3 className="text-sm font-semibold flex items-center gap-3">
                <span className="opacity-80">{accountTypeLabels[type as AccountType]}</span>
                <span className="px-2 py-0.5 text-xs bg-black/20 rounded-full">{typeAccounts.length}</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                      Kontonr
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                      Namn
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {typeAccounts.map((account, index) => (
                    <tr
                      key={account.id}
                      className="table-row animate-fade-in"
                      style={{ animationDelay: `${(groupIndex * 100) + (index * 20)}ms` }}
                    >
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="font-mono text-sm font-medium text-primary-400">
                          {account.account_number}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-white">{account.name}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEdit(account)}
                            className="px-3 py-1.5 text-sm text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded-lg transition-colors"
                          >
                            Redigera
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Är du säker på att du vill ta bort detta konto?')) {
                                onDelete(account.id);
                              }
                            }}
                            className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            Ta bort
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {filteredAccounts.length === 0 && (
        <div className="card">
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="w-8 h-8 text-dark-500" />
            </div>
            <p className="text-dark-400">Inga konton hittades</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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

export default AccountList;
