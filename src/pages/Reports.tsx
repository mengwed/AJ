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
        <div className="text-gray-500">Laddar...</div>
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
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Rapporter</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="mb-6">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => setReportType('income')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              reportType === 'income'
                ? 'bg-primary-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Resultaträkning
          </button>
          <button
            onClick={() => setReportType('balance')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              reportType === 'balance'
                ? 'bg-primary-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Balansräkning
          </button>
        </div>
      </div>

      {reportType === 'income' ? (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Resultaträkning {currentYear}
            </h2>
          </div>
          <div className="p-6">
            {/* Intäkter */}
            <div className="mb-6">
              <h3 className="text-md font-semibold text-gray-700 mb-3 pb-2 border-b">
                Intäkter
              </h3>
              {incomeAccounts.length > 0 ? (
                <table className="w-full">
                  <tbody>
                    {incomeAccounts.map((item) => {
                      const amount = item.total_credit - item.total_debit;
                      if (amount === 0) return null;
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="py-2 font-mono text-sm text-gray-600">
                            {item.account_number}
                          </td>
                          <td className="py-2 text-sm text-gray-900">{item.name}</td>
                          <td className="py-2 text-sm text-right font-medium text-green-600">
                            {formatAmount(amount)} kr
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <td colSpan={2} className="py-2">Summa intäkter</td>
                      <td className="py-2 text-right text-green-600">
                        {formatAmount(totalIncome)} kr
                      </td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <p className="text-gray-500">Inga intäkter registrerade</p>
              )}
            </div>

            {/* Kostnader */}
            <div className="mb-6">
              <h3 className="text-md font-semibold text-gray-700 mb-3 pb-2 border-b">
                Kostnader
              </h3>
              {expenseAccounts.length > 0 ? (
                <table className="w-full">
                  <tbody>
                    {expenseAccounts.map((item) => {
                      const amount = item.total_debit - item.total_credit;
                      if (amount === 0) return null;
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="py-2 font-mono text-sm text-gray-600">
                            {item.account_number}
                          </td>
                          <td className="py-2 text-sm text-gray-900">{item.name}</td>
                          <td className="py-2 text-sm text-right font-medium text-red-600">
                            {formatAmount(amount)} kr
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <td colSpan={2} className="py-2">Summa kostnader</td>
                      <td className="py-2 text-right text-red-600">
                        {formatAmount(totalExpenses)} kr
                      </td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <p className="text-gray-500">Inga kostnader registrerade</p>
              )}
            </div>

            {/* Resultat */}
            <div className="border-t-2 border-gray-300 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Årets resultat</span>
                <span className={`text-xl font-bold ${netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatAmount(netResult)} kr
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Balansräkning</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Tillgångar */}
              <div>
                <h3 className="text-md font-semibold text-gray-700 mb-3 pb-2 border-b">
                  Tillgångar
                </h3>
                {assetAccounts.length > 0 ? (
                  <table className="w-full">
                    <tbody>
                      {assetAccounts.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="py-2 font-mono text-sm text-gray-600">
                            {item.account_number}
                          </td>
                          <td className="py-2 text-sm text-gray-900">{item.name}</td>
                          <td className="py-2 text-sm text-right font-medium">
                            {formatAmount(item.balance)} kr
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-semibold">
                        <td colSpan={2} className="py-2">Summa tillgångar</td>
                        <td className="py-2 text-right">{formatAmount(totalAssets)} kr</td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <p className="text-gray-500">Inga tillgångar registrerade</p>
                )}
              </div>

              {/* Skulder & Eget kapital */}
              <div>
                <h3 className="text-md font-semibold text-gray-700 mb-3 pb-2 border-b">
                  Skulder
                </h3>
                {liabilityAccounts.length > 0 ? (
                  <table className="w-full mb-6">
                    <tbody>
                      {liabilityAccounts.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="py-2 font-mono text-sm text-gray-600">
                            {item.account_number}
                          </td>
                          <td className="py-2 text-sm text-gray-900">{item.name}</td>
                          <td className="py-2 text-sm text-right font-medium">
                            {formatAmount(-item.balance)} kr
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-semibold">
                        <td colSpan={2} className="py-2">Summa skulder</td>
                        <td className="py-2 text-right">{formatAmount(totalLiabilities)} kr</td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <p className="text-gray-500 mb-6">Inga skulder registrerade</p>
                )}

                <h3 className="text-md font-semibold text-gray-700 mb-3 pb-2 border-b">
                  Eget kapital
                </h3>
                {equityAccounts.length > 0 ? (
                  <table className="w-full">
                    <tbody>
                      {equityAccounts.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="py-2 font-mono text-sm text-gray-600">
                            {item.account_number}
                          </td>
                          <td className="py-2 text-sm text-gray-900">{item.name}</td>
                          <td className="py-2 text-sm text-right font-medium">
                            {formatAmount(-item.balance)} kr
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-semibold">
                        <td colSpan={2} className="py-2">Summa eget kapital</td>
                        <td className="py-2 text-right">{formatAmount(totalEquity)} kr</td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <p className="text-gray-500">Inget eget kapital registrerat</p>
                )}

                <div className="border-t-2 border-gray-300 pt-4 mt-4">
                  <div className="flex justify-between items-center font-bold">
                    <span>Summa skulder och eget kapital</span>
                    <span>{formatAmount(totalLiabilities + totalEquity)} kr</span>
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

export default Reports;
