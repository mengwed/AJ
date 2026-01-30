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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Laddar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Översikt {currentYear}</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Intäkter</div>
          <div className="text-2xl font-bold text-green-600">
            {formatAmount(stats?.income || 0)} kr
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Kostnader</div>
          <div className="text-2xl font-bold text-red-600">
            {formatAmount(stats?.expenses || 0)} kr
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Resultat</div>
          <div className={`text-2xl font-bold ${(stats?.result || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatAmount(stats?.result || 0)} kr
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Verifikationer</div>
          <div className="text-2xl font-bold text-primary-600">
            {stats?.transactionCount || 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Senaste verifikationer</h2>
            <Link to="/transactions" className="text-sm text-primary-600 hover:text-primary-700">
              Visa alla
            </Link>
          </div>
          <div className="p-6">
            {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {stats.recentTransactions.map((transaction) => {
                  const totalAmount = transaction.lines.reduce(
                    (sum, line) => sum + (line.debit || 0),
                    0
                  );
                  return (
                    <div key={transaction.id} className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">
                          #{transaction.id} - {transaction.description}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(transaction.date)}
                        </div>
                      </div>
                      <div className="text-right font-medium text-gray-900">
                        {formatAmount(totalAmount)} kr
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">
                Inga verifikationer ännu.{' '}
                <Link to="/transactions" className="text-primary-600 hover:underline">
                  Skapa din första
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Snabblänkar</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <Link
                to="/transactions"
                className="flex items-center p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <svg className="w-8 h-8 text-primary-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <div>
                  <div className="font-medium text-gray-900">Ny verifikation</div>
                  <div className="text-sm text-gray-500">Bokför en händelse</div>
                </div>
              </Link>
              <Link
                to="/accounts"
                className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <svg className="w-8 h-8 text-green-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <div>
                  <div className="font-medium text-gray-900">Kontoplan</div>
                  <div className="text-sm text-gray-500">Hantera konton</div>
                </div>
              </Link>
              <Link
                to="/reports"
                className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <svg className="w-8 h-8 text-purple-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div>
                  <div className="font-medium text-gray-900">Rapporter</div>
                  <div className="text-sm text-gray-500">Resultat & Balans</div>
                </div>
              </Link>
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <svg className="w-8 h-8 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <div className="font-medium text-gray-500">Räkenskapsår</div>
                  <div className="text-sm text-gray-400">{currentYear}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
