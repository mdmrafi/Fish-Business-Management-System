import { useState, useEffect } from 'react';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { HiShoppingCart, HiCurrencyDollar, HiCash, HiTrendingUp, HiTrendingDown, HiCalendar } from 'react-icons/hi';

const Dashboard = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchReport();
  }, [date]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/reports/daily?date=${date}`);
      setReport(res.data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading dashboard..." />;

  const stats = [
    {
      title: 'Total Purchase',
      value: report?.totalPurchase || 0,
      icon: HiShoppingCart,
      color: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/25',
      count: report?.purchaseCount || 0,
      label: 'entries'
    },
    {
      title: 'Total Sales',
      value: report?.totalSales || 0,
      icon: HiCurrencyDollar,
      color: 'from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald-500/25',
      count: report?.salesCount || 0,
      label: 'entries'
    },
    {
      title: 'Total Expenses',
      value: report?.totalExpenses || 0,
      icon: HiCash,
      color: 'from-amber-500 to-orange-500',
      shadow: 'shadow-amber-500/25',
      count: null,
      label: ''
    },
    {
      title: report?.netProfitLoss >= 0 ? 'Net Profit' : 'Net Loss',
      value: Math.abs(report?.netProfitLoss || 0),
      icon: report?.netProfitLoss >= 0 ? HiTrendingUp : HiTrendingDown,
      color: report?.netProfitLoss >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600',
      shadow: report?.netProfitLoss >= 0 ? 'shadow-green-500/25' : 'shadow-red-500/25',
      count: null,
      label: ''
    }
  ];

  const recentTransactions = [
    ...(report?.purchases || []).map(p => ({
      type: 'Purchase',
      product: (p.items || []).map(it => it.productName).join(', '),
      amount: p.totalExpense,
      date: new Date(p.date).toLocaleDateString(),
      color: 'text-blue-600 bg-blue-50'
    })),
    ...(report?.sales || []).map(s => ({
      type: 'Sale',
      product: (s.items || []).map(it => it.productName).join(', '),
      amount: s.totalSale,
      date: new Date(s.date).toLocaleDateString(),
      color: 'text-emerald-600 bg-emerald-50'
    }))
  ].slice(0, 10);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Daily overview of your business</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-slate-200">
          <HiCalendar className="w-5 h-5 text-ocean-500" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-slate-700 font-medium"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-4 sm:p-5 text-white shadow-lg ${stat.shadow} transition-transform hover:scale-[1.02]`}>
            <div className="flex items-center justify-between mb-3">
              <stat.icon className="w-7 h-7 sm:w-8 sm:h-8 opacity-80" />
              {stat.count !== null && (
                <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">{stat.count} {stat.label}</span>
              )}
            </div>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">
              ৳{stat.value.toLocaleString()}
            </p>
            <p className="text-sm opacity-80 mt-1">{stat.title}</p>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Recent Transactions</h2>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-slate-400 text-sm">No transactions for this date</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentTransactions.map((tx, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${tx.color}`}>
                    {tx.type}
                  </span>
                  <span className="text-sm font-medium text-slate-700">{tx.product}</span>
                </div>
                <span className="text-sm font-bold text-slate-800">৳{tx.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
