import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardForYear } from '../hooks/useDatabase';
import YearSelector from '../components/YearSelector';
import type { FiscalYear } from '../types';

function Dashboard() {
  const { stats, loading, error, fetchStats } = useDashboardForYear();
  const [selectedYear, setSelectedYear] = useState<FiscalYear | null>(null);

  useEffect(() => {
    if (selectedYear) {
      fetchStats(selectedYear.id);
    }
  }, [selectedYear, fetchStats]);

  const handleYearChange = (year: FiscalYear) => {
    setSelectedYear(year);
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('sv-SE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatPercentBadge = (percent: number | null | undefined, inverted = false) => {
    if (percent === null || percent === undefined) {
      return null;
    }

    const isPositive = inverted ? percent < 0 : percent > 0;
    const isNegative = inverted ? percent > 0 : percent < 0;
    const sign = percent > 0 ? '+' : '';

    return (
      <span
        className={`badge ${
          isPositive
            ? 'badge-success'
            : isNegative
            ? 'badge-warning'
            : 'bg-dark-600/50 text-dark-300 border border-dark-500/30'
        }`}
      >
        {sign}{percent}%
      </span>
    );
  };

  const getComparisonText = () => {
    if (!stats?.comparisonPeriod) return null;

    if (stats.comparisonPeriod === 'same_month') {
      const monthNames = [
        'januari', 'februari', 'mars', 'april', 'maj', 'juni',
        'juli', 'augusti', 'september', 'oktober', 'november', 'december'
      ];
      const currentMonth = new Date().getMonth();
      return `vs ${monthNames[currentMonth]} ${stats.year - 1}`;
    }

    return `vs ${stats.year - 1}`;
  };

  if (loading && !stats) {
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

  const comparisonText = getComparisonText();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Översikt</h1>
          <p className="text-dark-400">
            {stats?.isCurrentYear
              ? `${new Date().toLocaleDateString('sv-SE', { month: 'long' })} ${stats?.year}`
              : `Räkenskapsår ${stats?.year || ''}`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <YearSelector onYearChange={handleYearChange} />
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-800/50 border border-dark-700/50">
            <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            <span className="text-sm text-dark-300">Live data</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Intäkter */}
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-accent-green/10 text-accent-green">
              <TrendingUpIcon className="w-6 h-6" />
            </div>
            {formatPercentBadge(stats?.comparison?.incomeChangePercent)}
          </div>
          <div className="text-dark-400 text-sm font-medium mb-1">Intäkter</div>
          <div className="text-3xl font-bold text-white">
            {formatAmount(stats?.income || 0)}
            <span className="text-lg text-dark-400 ml-1">kr</span>
          </div>
          {stats?.comparison?.income !== null && stats?.comparison?.income !== undefined && (
            <div className="mt-2 text-xs text-dark-500">
              {comparisonText}: {formatAmount(stats.comparison.income)} kr
            </div>
          )}
        </div>

        {/* Kostnader */}
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-accent-orange/10 text-accent-orange">
              <TrendingDownIcon className="w-6 h-6" />
            </div>
            {formatPercentBadge(stats?.comparison?.expensesChangePercent, true)}
          </div>
          <div className="text-dark-400 text-sm font-medium mb-1">Kostnader</div>
          <div className="text-3xl font-bold text-white">
            {formatAmount(stats?.expenses || 0)}
            <span className="text-lg text-dark-400 ml-1">kr</span>
          </div>
          {stats?.comparison?.expenses !== null && stats?.comparison?.expenses !== undefined && (
            <div className="mt-2 text-xs text-dark-500">
              {comparisonText}: {formatAmount(stats.comparison.expenses)} kr
            </div>
          )}
        </div>

        {/* Moms */}
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-primary-500/10 text-primary-400">
              <PercentIcon className="w-6 h-6" />
            </div>
            {formatPercentBadge(stats?.comparison?.vatChangePercent)}
          </div>
          <div className="text-dark-400 text-sm font-medium mb-1">Moms</div>
          <div className="text-3xl font-bold text-white">
            {formatAmount(stats?.vat || 0)}
            <span className="text-lg text-dark-400 ml-1">kr</span>
          </div>
          {stats?.comparison?.vat !== null && stats?.comparison?.vat !== undefined && (
            <div className="mt-2 text-xs text-dark-500">
              {comparisonText}: {formatAmount(stats.comparison.vat)} kr
            </div>
          )}
        </div>

        {/* Resultat */}
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

        {/* Fakturor */}
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-accent-cyan/10 text-accent-cyan">
              <DocumentIcon className="w-6 h-6" />
            </div>
            <span className="badge badge-info">Totalt</span>
          </div>
          <div className="text-dark-400 text-sm font-medium mb-1">Fakturor</div>
          <div className="text-3xl font-bold text-white">
            {stats?.invoiceCount || 0}
            <span className="text-lg text-dark-400 ml-1">st</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Snabbåtgärder</h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            to="/suppliers"
            className="group p-5 rounded-xl bg-gradient-to-br from-accent-green/20 to-accent-green/5 border border-accent-green/20 hover:border-accent-green/40 transition-all duration-300 hover:shadow-lg hover:shadow-accent-green/10"
          >
            <div className="w-12 h-12 rounded-xl bg-accent-green/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <TruckIcon className="w-6 h-6 text-accent-green" />
            </div>
            <div className="font-medium text-white mb-1">Leverantörer</div>
            <div className="text-sm text-dark-400">Hantera register</div>
          </Link>

          <Link
            to="/categories"
            className="group p-5 rounded-xl bg-gradient-to-br from-primary-600/20 to-primary-500/5 border border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/10"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <TagIcon className="w-6 h-6 text-primary-400" />
            </div>
            <div className="font-medium text-white mb-1">Kategorier</div>
            <div className="text-sm text-dark-400">Organisera kostnader</div>
          </Link>
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

function PercentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h.01M15 17h.01M5 19l14-14M9 9a2 2 0 11-4 0 2 2 0 014 0zm10 10a2 2 0 11-4 0 2 2 0 014 0z" />
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

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h1m6-11v11m0-11h4l4 4v7a2 2 0 01-2 2h-1m-6-11h4m-2 11a2 2 0 11-4 0m6 0a2 2 0 11-4 0" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

export default Dashboard;
