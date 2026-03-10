import { useState, useEffect } from 'react';
import API from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { exportToExcel } from '../utils/exportExcel';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { HiCalendar, HiDownload } from 'react-icons/hi';
import toast from 'react-hot-toast';

const Reports = () => {
  const [view, setView] = useState('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReport(); }, [view, date, month, year]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const url = view === 'daily' ? `/reports/daily?date=${date}` : `/reports/monthly?month=${month}&year=${year}`;
      const res = await API.get(url);
      setReport(res.data);
    } catch (error) {
      toast.error('Failed to load report');
    } finally { setLoading(false); }
  };

  const handleExport = () => {
    if (!report) return;
    const data = view === 'daily'
      ? [{ Date: report.date, Purchases: report.totalPurchase, Sales: report.totalSales, Expenses: report.totalExpenses, 'Net P/L': report.netProfitLoss }]
      : (report.dailyBreakdown || []).map(d => ({ Date: d.date, Purchases: d.purchases, Sales: d.sales, Expenses: d.expenses, 'Net P/L': d.sales - d.purchases }));
    exportToExcel(data, `report_${view}`);
    toast.success('Exported!');
  };

  const summaryCards = report ? [
    { label: 'Total Purchase', value: report.totalPurchase, color: 'text-blue-700 bg-blue-50' },
    { label: 'Total Sales', value: report.totalSales, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Total Expenses', value: report.totalExpenses, color: 'text-amber-700 bg-amber-50' },
    { label: 'Net P/L', value: report.netProfitLoss, color: report.netProfitLoss >= 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50' },
  ] : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
          <HiDownload className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Toggle & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
          {['daily', 'monthly'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`flex-1 px-6 py-2.5 text-sm font-medium rounded-lg capitalize transition-all ${view === v ? 'bg-ocean-600 text-white' : 'text-slate-500'}`}>
              {v}
            </button>
          ))}
        </div>
        {view === 'daily' ? (
          <div className="relative">
            <HiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full sm:w-auto pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-ocean-500" />
          </div>
        ) : (
          <div className="flex gap-2">
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
              className="px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-ocean-500">
              {Array.from({length:12},(_,i)=>i+1).map(m => (
                <option key={m} value={m}>{new Date(2000,m-1).toLocaleString('en',{month:'long'})}</option>
              ))}
            </select>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))}
              className="px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-ocean-500">
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? <LoadingSpinner size="lg" text="Loading report..." /> : report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {summaryCards.map((card, i) => (
              <div key={i} className={`rounded-2xl p-4 ${card.color}`}>
                <p className="text-xs font-medium opacity-70">{card.label}</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">৳{Math.abs(card.value || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          {view === 'monthly' && report.dailyBreakdown?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Daily Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={report.dailyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.split('-')[2]} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `৳${v.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="purchases" fill="#3b82f6" name="Purchases" radius={[4,4,0,0]} />
                  <Bar dataKey="sales" fill="#10b981" name="Sales" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Stats */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-400">Purchase entries:</span> <span className="font-bold text-slate-700 ml-1">{report.purchaseCount}</span></div>
              <div><span className="text-slate-400">Sales entries:</span> <span className="font-bold text-slate-700 ml-1">{report.salesCount}</span></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
