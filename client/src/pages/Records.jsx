import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { exportToExcel } from '../utils/exportExcel';
import { HiSearch, HiCalendar, HiDownload, HiTrash, HiPencil } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';

const Records = () => {
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { admin } = useAuth();
  const canEditDelete = admin?.name === 'Tansir' && admin?.email === 'tansir@fishbusiness.com';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFilter) params.date = dateFilter;
      if (searchTerm) params.product = searchTerm;
      const [pRes, sRes] = await Promise.all([
        API.get('/purchases', { params }),
        API.get('/sales', { params })
      ]);
      setPurchases(pRes.data);
      setSales(sRes.data);
    } catch (error) {
      toast.error('Failed to load records');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 400);
    return () => clearTimeout(timer);
  }, [searchTerm, dateFilter]);

  const handleDeletePurchase = async (id) => {
    if (!window.confirm('Delete?')) return;
    try { await API.delete(`/purchases/${id}`); toast.success('Deleted'); fetchData(); }
    catch { toast.error('Failed'); }
  };
  const handleDeleteSale = async (id) => {
    if (!window.confirm('Delete?')) return;
    try { await API.delete(`/sales/${id}`); toast.success('Deleted'); fetchData(); }
    catch { toast.error('Failed'); }
  };

  const handleExport = () => {
    const data = [];
    purchases.forEach(p => {
      (p.items || []).forEach(it => {
        data.push({ Type:'Purchase', Product:it.productName, Date:new Date(p.date).toLocaleDateString(),
          Quantity:it.quantity, 'Price/kg':it.pricePerKg, 'Free kg':it.freeKg || 0, 'Item Total':it.itemTotal,
          'Car Rent':p.carRent||0, 'Worker Salary':p.workerSalary||0, 'Ice Cost':p.iceCost||0, 'Bill Total':p.totalExpense });
      });
    });
    sales.forEach(s => {
      (s.items || []).forEach(it => {
        data.push({ Type:'Sale', Product:it.productName, Date:new Date(s.date).toLocaleDateString(),
          Quantity:it.quantitySold, 'Price/kg':it.pricePerKg, Commission:it.commission||0, 'Item Total':it.itemTotal,
          'Bill Total':s.totalSale, ProfitLoss:s.profitLoss });
      });
    });
    if (!data.length) { toast.error('No data to export'); return; }
    exportToExcel(data, `records_${dateFilter || 'all'}`);
    toast.success('Exported!');
  };

  const filteredPurchases = activeTab === 'sales' ? [] : purchases;
  const filteredSales = activeTab === 'purchases' ? [] : sales;

  if (loading) return <LoadingSpinner size="lg" text="Loading records..." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Records</h1>
        <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm hover:bg-green-700 transition-colors">
          <HiDownload className="w-4 h-4" /> Export Excel
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by product..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none" />
        </div>
        <div className="relative">
          <HiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="w-full sm:w-auto pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
        {['all','purchases','sales'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all capitalize ${activeTab === tab ? 'bg-ocean-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-slate-50 border-b border-slate-100">
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Fish</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Items</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
            <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {filteredPurchases.map(p => (
              <tr key={`p-${p._id}`} className="hover:bg-slate-50">
                <td className="px-5 py-3"><span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600">Purchase</span></td>
                <td className="px-5 py-3 text-sm font-medium text-slate-700">{(p.items || []).map(it => it.productName).join(', ')}</td>
                <td className="px-5 py-3 text-sm text-slate-500">{new Date(p.date).toLocaleDateString()}</td>
                <td className="px-5 py-3 text-sm text-right text-slate-700">{(p.items || []).length}</td>
                <td className="px-5 py-3 text-sm text-right font-bold text-blue-700">৳{p.totalExpense?.toLocaleString()}</td>
                <td className="px-5 py-3 text-center">
                  {canEditDelete && <button onClick={() => handleDeletePurchase(p._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><HiTrash className="w-4 h-4" /></button>}
                </td>
              </tr>
            ))}
            {filteredSales.map(s => (
              <tr key={`s-${s._id}`} className="hover:bg-slate-50">
                <td className="px-5 py-3"><span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600">Sale</span></td>
                <td className="px-5 py-3 text-sm font-medium text-slate-700">{(s.items || []).map(it => it.productName).join(', ')}</td>
                <td className="px-5 py-3 text-sm text-slate-500">{new Date(s.date).toLocaleDateString()}</td>
                <td className="px-5 py-3 text-sm text-right text-slate-700">{(s.items || []).length}</td>
                <td className="px-5 py-3 text-sm text-right font-bold text-emerald-700">৳{s.totalSale?.toLocaleString()}</td>
                <td className="px-5 py-3 text-center">
                  {canEditDelete && <button onClick={() => handleDeleteSale(s._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><HiTrash className="w-4 h-4" /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredPurchases.length && !filteredSales.length && (
          <div className="py-12 text-center text-slate-400 text-sm">No records found</div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {!filteredPurchases.length && !filteredSales.length && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-100"><p className="text-slate-400">No records found</p></div>
        )}
        {filteredPurchases.map(p => (
          <div key={`p-${p._id}`} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600">Purchase</span>
                <h3 className="font-semibold text-slate-800 mt-1">{(p.items || []).map(it => it.productName).join(', ')}</h3>
                <p className="text-xs text-slate-400">{new Date(p.date).toLocaleDateString()}</p>
              </div>
              {canEditDelete && <button onClick={() => handleDeletePurchase(p._id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg"><HiTrash className="w-4 h-4" /></button>}
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-50 rounded-lg p-2"><p className="text-xs text-slate-400">Items</p><p className="font-bold text-sm">{(p.items || []).length}</p></div>
              <div className="bg-blue-50 rounded-lg p-2"><p className="text-xs text-blue-400">Total</p><p className="font-bold text-sm text-blue-700">৳{p.totalExpense?.toLocaleString()}</p></div>
            </div>
          </div>
        ))}
        {filteredSales.map(s => (
          <div key={`s-${s._id}`} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600">Sale</span>
                <h3 className="font-semibold text-slate-800 mt-1">{(s.items || []).map(it => it.productName).join(', ')}</h3>
                <p className="text-xs text-slate-400">{new Date(s.date).toLocaleDateString()}</p>
              </div>
              {canEditDelete && <button onClick={() => handleDeleteSale(s._id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg"><HiTrash className="w-4 h-4" /></button>}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 rounded-lg p-2"><p className="text-xs text-slate-400">Items</p><p className="font-bold text-sm">{(s.items || []).length}</p></div>
              <div className="bg-emerald-50 rounded-lg p-2"><p className="text-xs text-emerald-400">Total</p><p className="font-bold text-sm text-emerald-700">৳{s.totalSale?.toLocaleString()}</p></div>
              <div className={`rounded-lg p-2 ${s.profitLoss>=0?'bg-green-50':'bg-red-50'}`}>
                <p className={`text-xs ${s.profitLoss>=0?'text-green-400':'text-red-400'}`}>{s.profitLoss>=0?'Profit':'Loss'}</p>
                <p className={`font-bold text-sm ${s.profitLoss>=0?'text-green-700':'text-red-700'}`}>৳{Math.abs(s.profitLoss||0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Records;
