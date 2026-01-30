import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useDatabase';

function Dashboard() {
  const { stats, loading, error, fetchStats } = useDashboard();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('sv-SE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-dark-400">
          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          Laddar...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 border-red-500/30 bg-red-500/10">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Översikt</h1>
          <p className="text-dark-400">Räkenskapsår {currentYear}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-800/50 border border-dark-700/50">
          <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          <span className="text-sm text-dark-300">Live data</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-accent-green/10 text-accent-green">
              <TrendingUpIcon className="w-6 h-6" />
            </div>
            <span className="badge badge-success">+12%</span>
          </div>
          <div className="text-dark-400 text-sm font-medium mb-1">Intäkter</div>
          <div className="text-3xl font-bold text-white">
            {formatAmount(stats?.income || 0)}
            <span className="text-lg text-dark-400 ml-1">kr</span>
          </div>
        </div>

        <div className="stat-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-accent-orange/10 text-accent-orange">
              <TrendingDownIcon className="w-6 h-6" />
            </div>
            <span className="badge badge-warning">-8%</span>
          </div>
          <div className="text-dark-400 text-sm font-medium mb-1">Kostnader</div>
          <div className="text-3xl font-bold text-white">
            {formatAmount(stats?.expenses || 0)}
            <span className="text-lg text-dark-400 ml-1">kr</span>
          </div>
        </div>

        <div className="stat-card group">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${(stats?.result || 0) >= 0 ? 'bg-primary-500/10 text-primary-400' : 'bg-red-500/10 text-red-400'}`}>
              <ChartIcon className="w-6 h-6" />
            </div>
            <span className={`badge ${(stats?.result || 0) >= 0 ? 'badge-purple' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
              {(stats?.result || 0) >= 0 ? 'Vinst' : 'Förlust'}
            </span>
          </div>
          <div className="text-dark-400 text-sm font-medium mb-1">Resultat</div>
          <div className={`text-3xl font-bold ${(stats?.result || 0) >= 0 ? 'text-white' : 'text-red-400'}`}>
            {formatAmount(stats?.result || 0)}
            <span className="text-lg text-dark-400 ml-1">kr</span>
          </div>
        </div>

        <div className="stat-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-accent-cyan/10 text-accent-cyan">
              <DocumentIcon className="w-6 h-6" />
            </div>
            <span className="badge badge-info">Totalt</span>
          </div>
          <div className="text-dark-400 text-sm font-medium mb-1">Verifikationer</div>
          <div className="text-3xl font-bold text-white">
            {stats?.transactionCount || 0}
            <span className="text-lg text-dark-400 ml-1">st</span>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-white">Senaste verifikationer</h2>
            <Link to="/transactions" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
              Visa alla →
            </Link>
          </div>

          {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {stats.recentTransactions.map((transaction, index) => {
                const totalAmount = transaction.lines.reduce(
                  (sum, line) => sum + (line.debit || 0),
                  0
                );
                return (
                  <div
                    key={transaction.id}
                    className="flex justify-between items-center p-4 rounded-xl bg-dark-800/30 hover:bg-dark-700/30 transition-all duration-200 group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400 font-medium">
                        #{transaction.id}
                      </div>
                      <div>
                        <div className="font-medium text-white group-hover:text-primary-400 transition-colors">
                          {transaction.description}
                        </div>
                        <div className="text-sm text-dark-400">
                          {formatDate(transaction.date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-white">
                        {formatAmount(totalAmount)} kr
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mx-auto mb-4">
                <DocumentIcon className="w-8 h-8 text-dark-500" />
              </div>
              <p className="text-dark-400 mb-4">Inga verifikationer ännu</p>
              <Link to="/transactions" className="btn-primary inline-flex items-center gap-2">
                <PlusIcon className="w-5 h-5" />
                Skapa din första
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Snabbåtgärder</h2>

          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/transactions"
              className="group p-5 rounded-xl bg-gradient-to-br from-primary-600/20 to-primary-500/5 border border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/10"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <PlusIcon className="w-6 h-6 text-primary-400" />
              </div>
              <div className="font-medium text-white mb-1">Ny verifikation</div>
              <div className="text-sm text-dark-400">Bokför en händelse</div>
            </Link>

            <Link
              to="/invoices"
              className="group p-5 rounded-xl bg-gradient-to-br from-accent-cyan/20 to-accent-cyan/5 border border-accent-cyan/20 hover:border-accent-cyan/40 transition-all duration-300 hover:shadow-lg hover:shadow-accent-cyan/10"
            >
              <div className="w-12 h-12 rounded-xl bg-accent-cyan/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <InvoiceIcon className="w-6 h-6 text-accent-cyan" />
              </div>
              <div className="font-medium text-white mb-1">Fakturor</div>
              <div className="text-sm text-dark-400">Importera PDF</div>
            </Link>

            <Link
              to="/customers"
              className="group p-5 rounded-xl bg-gradient-to-br from-accent-pink/20 to-accent-pink/5 border border-accent-pink/20 hover:border-accent-pink/40 transition-all duration-300 hover:shadow-lg hover:shadow-accent-pink/10"
            >
              <div className="w-12 h-12 rounded-xl bg-accent-pink/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UsersIcon className="w-6 h-6 text-accent-pink" />
              </div>
              <div className="font-medium text-white mb-1">Kunder</div>
              <div className="text-sm text-dark-400">Hantera register</div>
            </Link>

            <Link
              to="/reports"
              className="group p-5 rounded-xl bg-gradient-to-br from-accent-green/20 to-accent-green/5 border border-accent-green/20 hover:border-accent-green/40 transition-all duration-300 hover:shadow-lg hover:shadow-accent-green/10"
            >
              <div className="w-12 h-12 rounded-xl bg-accent-green/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ChartIcon className="w-6 h-6 text-accent-green" />
              </div>
              <div className="font-medium text-white mb-1">Rapporter</div>
              <div className="text-sm text-dark-400">Resultat & Balans</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icons
function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function TrendingDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

function InvoiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

export default Dashboard;
