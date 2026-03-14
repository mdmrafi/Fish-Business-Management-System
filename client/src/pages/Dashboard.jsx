import { useState, useEffect } from 'react';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  HiShoppingCart,
  HiCurrencyDollar,
  HiCash,
  HiTrendingUp,
  HiTrendingDown,
  HiCalendar,
  HiChevronLeft,
  HiChevronRight
} from 'react-icons/hi';

const todayDateString = () => new Date().toISOString().split('T')[0];

const shiftMonth = (month, year, step) => {
  const shifted = new Date(year, month - 1 + step, 1);
  return { month: shifted.getMonth() + 1, year: shifted.getFullYear() };
};

const monthLabel = (month, year) => new Date(year, month - 1, 1).toLocaleString('en-US', {
  month: 'long',
  year: 'numeric'
});

const buildStats = (report) => {
  const net = report?.netProfitLoss || 0;

  return [
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
      title: net >= 0 ? 'Net Profit' : 'Net Loss',
      value: Math.abs(net),
      icon: net >= 0 ? HiTrendingUp : HiTrendingDown,
      color: net >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600',
      shadow: net >= 0 ? 'shadow-green-500/25' : 'shadow-red-500/25',
      count: null,
      label: ''
    }
  ];
};

const SummarySection = ({ title, subtitle, stats }) => (
  <div className="space-y-3">
    <div>
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
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
  </div>
);

const Dashboard = () => {
  const [dailyReport, setDailyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayDateString());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchDashboardData();
  }, [date, month, year]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const [dailyRes, monthlyRes] = await Promise.allSettled([
        API.get(`/reports/daily?date=${date}`),
        API.get(`/reports/monthly?month=${month}&year=${year}`)
      ]);

      const dailyOk = dailyRes.status === 'fulfilled';
      const monthlyOk = monthlyRes.status === 'fulfilled';

      setDailyReport(dailyOk ? dailyRes.value.data : null);
      setMonthlyReport(monthlyOk ? monthlyRes.value.data : null);

      if (!dailyOk && !monthlyOk) {
        setFetchError('Failed to load dashboard data. Please check server/API connection.');
      }

      if (!dailyOk) {
        console.error('Error fetching daily report:', dailyRes.reason);
      }
      if (!monthlyOk) {
        console.error('Error fetching monthly report:', monthlyRes.reason);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      setDailyReport(null);
      setMonthlyReport(null);
      setFetchError('Failed to load dashboard data. Please check server/API connection.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    const prev = shiftMonth(month, year, -1);
    setMonth(prev.month);
    setYear(prev.year);
  };

  const handleNextMonth = () => {
    const next = shiftMonth(month, year, 1);
    setMonth(next.month);
    setYear(next.year);
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading dashboard..." />;

  if (fetchError && !dailyReport && !monthlyReport) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 text-center space-y-3">
        <h2 className="text-lg font-semibold text-red-700">Dashboard data could not be loaded</h2>
        <p className="text-sm text-red-600">{fetchError}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const dailyStats = buildStats(dailyReport);
  const monthlyStats = buildStats(monthlyReport);

  const recentTransactions = [
    ...(dailyReport?.purchases || []).map(p => ({
      type: 'Purchase',
      product: (p.items || []).map(it => it.productName).join(', '),
      amount: p.totalExpense,
      date: new Date(p.date).toLocaleDateString(),
      color: 'text-blue-600 bg-blue-50'
    })),
    ...(dailyReport?.sales || []).map(s => ({
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
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Daily and monthly business overview</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="flex items-center justify-between gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-slate-200">
            <button
              onClick={handlePreviousMonth}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
              aria-label="Previous month"
            >
              <HiChevronLeft className="w-5 h-5" />
            </button>
            <p className="text-sm font-semibold text-slate-700">{monthLabel(month, year)}</p>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
              aria-label="Next month"
            >
              <HiChevronRight className="w-5 h-5" />
            </button>
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
      </div>

      {dailyReport && (
        <SummarySection
          title="Selected Date"
          subtitle={new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          stats={dailyStats}
        />
      )}

      {monthlyReport && (
        <SummarySection
          title="Selected Month"
          subtitle={monthLabel(month, year)}
          stats={monthlyStats}
        />
      )}

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
