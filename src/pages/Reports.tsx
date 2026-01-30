import { useEffect, useState } from 'react';
import { useReports } from '../hooks/useDatabase';

type ReportType = 'income' | 'balance';

function Reports() {
  const { balanceReport, incomeStatement, loading, error, fetchBalanceReport, fetchIncomeStatement } = useReports();
  const [reportType, setReportType] = useState<ReportType>('income');
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (reportType === 'income') {
      fetchIncomeStatement(`${currentYear}-01-01`, `${currentYear}-12-31`);
    } else {
      fetchBalanceReport();
    }
  }, [reportType, fetchIncomeStatement, fetchBalanceReport, currentYear]);

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('sv-SE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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

  // Group income statement by type
  const incomeAccounts = incomeStatement.filter((item) => item.type === 'intäkt');
  const expenseAccounts = incomeStatement.filter((item) => item.type === 'kostnad');

  const totalIncome = incomeAccounts.reduce(
    (sum, item) => sum + (item.total_credit - item.total_debit),
    0
  );
  const totalExpenses = expenseAccounts.reduce(
    (sum, item) => sum + (item.total_debit - item.total_credit),
    0
  );
  const netResult = totalIncome - totalExpenses;

  // Group balance report by type
  const assetAccounts = balanceReport.filter((item) => item.type === 'tillgång');
  const liabilityAccounts = balanceReport.filter((item) => item.type === 'skuld');
  const equityAccounts = balanceReport.filter((item) => item.type === 'eget_kapital');

  const totalAssets = assetAccounts.reduce((sum, item) => sum + item.balance, 0);
  const totalLiabilities = liabilityAccounts.reduce((sum, item) => sum - item.balance, 0);
  const totalEquity = equityAccounts.reduce((sum, item) => sum - item.balance, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Rapporter</h1>
          <p className="text-dark-400">Finansiella rapporter för {currentYear}</p>
        </div>
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

      {/* Report Type Selector */}
      <div className="inline-flex rounded-xl bg-dark-800/50 border border-dark-700 p-1">
        <button
          onClick={() => setReportType('income')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            reportType === 'income'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
              : 'text-dark-300 hover:text-white'
          }`}
        >
          Resultaträkning
        </button>
        <button
          onClick={() => setReportType('balance')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            reportType === 'balance'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
              : 'text-dark-300 hover:text-white'
          }`}
        >
          Balansräkning
        </button>
      </div>

      {reportType === 'income' ? (
        <div className="card overflow-hidden animate-fade-in">
          <div className="px-6 py-4 border-b border-dark-700/50 bg-gradient-to-r from-accent-green/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-green/20 flex items-center justify-center">
                <TrendingUpIcon className="w-5 h-5 text-accent-green" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Resultaträkning {currentYear}</h2>
                <p className="text-sm text-dark-400">Intäkter och kostnader</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Intäkter */}
            <div>
              <h3 className="text-sm font-semibold text-accent-green uppercase tracking-wider mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent-green" />
                Intäkter
              </h3>
              {incomeAccounts.length > 0 ? (
                <div className="space-y-2">
                  {incomeAccounts.map((item, index) => {
                    const amount = item.total_credit - item.total_debit;
                    if (amount === 0) return null;
                    return (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 rounded-xl bg-dark-800/30 hover:bg-dark-700/30 transition-colors animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-dark-400">{item.account_number}</span>
                          <span className="text-white">{item.name}</span>
                        </div>
                        <span className="font-medium text-accent-green">{formatAmount(amount)} kr</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between items-center p-4 rounded-xl bg-accent-green/10 border border-accent-green/30 mt-4">
                    <span className="font-semibold text-white">Summa intäkter</span>
                    <span className="text-lg font-bold text-accent-green">{formatAmount(totalIncome)} kr</span>
                  </div>
                </div>
              ) : (
                <p className="text-dark-400 text-center py-4">Inga intäkter registrerade</p>
              )}
            </div>

            {/* Kostnader */}
            <div>
              <h3 className="text-sm font-semibold text-accent-orange uppercase tracking-wider mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent-orange" />
                Kostnader
              </h3>
              {expenseAccounts.length > 0 ? (
                <div className="space-y-2">
                  {expenseAccounts.map((item, index) => {
                    const amount = item.total_debit - item.total_credit;
                    if (amount === 0) return null;
                    return (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 rounded-xl bg-dark-800/30 hover:bg-dark-700/30 transition-colors animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-dark-400">{item.account_number}</span>
                          <span className="text-white">{item.name}</span>
                        </div>
                        <span className="font-medium text-accent-orange">{formatAmount(amount)} kr</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between items-center p-4 rounded-xl bg-accent-orange/10 border border-accent-orange/30 mt-4">
                    <span className="font-semibold text-white">Summa kostnader</span>
                    <span className="text-lg font-bold text-accent-orange">{formatAmount(totalExpenses)} kr</span>
                  </div>
                </div>
              ) : (
                <p className="text-dark-400 text-center py-4">Inga kostnader registrerade</p>
              )}
            </div>

            {/* Resultat */}
            <div className={`p-6 rounded-2xl ${
              netResult >= 0
                ? 'bg-gradient-to-br from-accent-green/20 to-accent-green/5 border border-accent-green/30'
                : 'bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/30'
            }`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${netResult >= 0 ? 'bg-accent-green/20' : 'bg-red-500/20'} flex items-center justify-center`}>
                    {netResult >= 0 ? (
                      <TrendingUpIcon className="w-6 h-6 text-accent-green" />
                    ) : (
                      <TrendingDownIcon className="w-6 h-6 text-red-400" />
                    )}
                  </div>
                  <div>
                    <span className="text-lg font-bold text-white">Årets resultat</span>
                    <p className="text-sm text-dark-400">{netResult >= 0 ? 'Vinst' : 'Förlust'}</p>
                  </div>
                </div>
                <span className={`text-3xl font-bold ${netResult >= 0 ? 'text-accent-green' : 'text-red-400'}`}>
                  {formatAmount(netResult)} kr
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden animate-fade-in">
          <div className="px-6 py-4 border-b border-dark-700/50 bg-gradient-to-r from-accent-cyan/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-cyan/20 flex items-center justify-center">
                <ChartIcon className="w-5 h-5 text-accent-cyan" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Balansräkning</h2>
                <p className="text-sm text-dark-400">Tillgångar, skulder och eget kapital</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Tillgångar */}
              <div>
                <h3 className="text-sm font-semibold text-accent-green uppercase tracking-wider mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent-green" />
                  Tillgångar
                </h3>
                {assetAccounts.length > 0 ? (
                  <div className="space-y-2">
                    {assetAccounts.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 rounded-xl bg-dark-800/30 hover:bg-dark-700/30 transition-colors animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-dark-400">{item.account_number}</span>
                          <span className="text-white">{item.name}</span>
                        </div>
                        <span className="font-medium text-white">{formatAmount(item.balance)} kr</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center p-4 rounded-xl bg-accent-green/10 border border-accent-green/30 mt-4">
                      <span className="font-semibold text-white">Summa tillgångar</span>
                      <span className="text-lg font-bold text-accent-green">{formatAmount(totalAssets)} kr</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-dark-400 text-center py-4">Inga tillgångar registrerade</p>
                )}
              </div>

              {/* Skulder & Eget kapital */}
              <div className="space-y-8">
                {/* Skulder */}
                <div>
                  <h3 className="text-sm font-semibold text-accent-orange uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent-orange" />
                    Skulder
                  </h3>
                  {liabilityAccounts.length > 0 ? (
                    <div className="space-y-2">
                      {liabilityAccounts.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center p-3 rounded-xl bg-dark-800/30 hover:bg-dark-700/30 transition-colors animate-fade-in"
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm text-dark-400">{item.account_number}</span>
                            <span className="text-white">{item.name}</span>
                          </div>
                          <span className="font-medium text-white">{formatAmount(-item.balance)} kr</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center p-4 rounded-xl bg-accent-orange/10 border border-accent-orange/30 mt-4">
                        <span className="font-semibold text-white">Summa skulder</span>
                        <span className="text-lg font-bold text-accent-orange">{formatAmount(totalLiabilities)} kr</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-dark-400 text-center py-4">Inga skulder registrerade</p>
                  )}
                </div>

                {/* Eget kapital */}
                <div>
                  <h3 className="text-sm font-semibold text-accent-purple uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent-purple" />
                    Eget kapital
                  </h3>
                  {equityAccounts.length > 0 ? (
                    <div className="space-y-2">
                      {equityAccounts.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center p-3 rounded-xl bg-dark-800/30 hover:bg-dark-700/30 transition-colors animate-fade-in"
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm text-dark-400">{item.account_number}</span>
                            <span className="text-white">{item.name}</span>
                          </div>
                          <span className="font-medium text-white">{formatAmount(-item.balance)} kr</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center p-4 rounded-xl bg-accent-purple/10 border border-accent-purple/30 mt-4">
                        <span className="font-semibold text-white">Summa eget kapital</span>
                        <span className="text-lg font-bold text-accent-purple">{formatAmount(totalEquity)} kr</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-dark-400 text-center py-4">Inget eget kapital registrerat</p>
                  )}
                </div>

                {/* Total skulder + eget kapital */}
                <div className="p-4 rounded-xl bg-accent-cyan/10 border border-accent-cyan/30">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white">Summa skulder och eget kapital</span>
                    <span className="text-lg font-bold text-accent-cyan">{formatAmount(totalLiabilities + totalEquity)} kr</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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

export default Reports;
