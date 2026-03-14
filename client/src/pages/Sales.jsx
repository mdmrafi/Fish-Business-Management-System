import { useState, useEffect, useRef } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { HiPlus, HiTrash, HiPencil, HiX } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';

const ALL_ITEMS_NAME = 'All Items';

const isAllItemsSelection = (name = '') => /^all items?$/i.test(name.trim());

/* ── Writable product picker ─────────────────────────────── */
const ProductInput = ({ value, onChange, products }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);

  useEffect(() => { setSearch(value); }, [value]);

  const normalizedProducts = products.filter(p => !isAllItemsSelection(p.name));
  const allOptions = [{ _id: 'all-items', name: ALL_ITEMS_NAME }, ...normalizedProducts];
  const filtered = allOptions.filter(p =>
    p.name.toLowerCase().includes((search || '').toLowerCase())
  );

  const pick = (name) => { onChange(name); setSearch(name); setOpen(false); };

  return (
    <div className="relative">
      <input
        type="text"
        value={search}
        placeholder="Type or select fish…"
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none text-sm"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-auto">
          {filtered.map(p => (
            <li key={p._id} onMouseDown={() => pick(p.name)}
              className="px-4 py-2 text-sm hover:bg-ocean-50 cursor-pointer">{p.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ── Helpers ──────────────────────────────────────────────── */
const emptyItem = () => ({ productName: '', quantitySold: '', pricePerKg: '', commission: '' });

const emptyForm = () => ({
  items: [emptyItem()],
  purchase: '', purchaseCost: '',
  date: new Date().toISOString().split('T')[0]
});

/* ── Main component ──────────────────────────────────────── */
const Sales = () => {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const { admin } = useAuth();
  const canEditDelete = admin?.name === 'Tansir' && admin?.email === 'tansir@fishbusiness.com';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [sRes, prRes, puRes] = await Promise.all([
        API.get('/sales'), API.get('/products'), API.get('/purchases')
      ]);
      setSales(sRes.data);
      setProducts(prRes.data);
      setPurchases(puRes.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  /* ── Item helpers ── */
  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };
  const addItem = () => setForm({ ...form, items: [...form.items, emptyItem()] });
  const removeItem = (idx) => {
    if (form.items.length === 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  /* ── Calculations ── */
  const itemSubtotal = (it) => {
    if (isAllItemsSelection(it.productName)) {
      return (parseFloat(it.pricePerKg) || 0) - (parseFloat(it.commission) || 0);
    }
    return ((parseFloat(it.quantitySold) || 0) * (parseFloat(it.pricePerKg) || 0)) - (parseFloat(it.commission) || 0);
  };

  const totalSale = () => form.items.reduce((s, it) => s + itemSubtotal(it), 0);
  const profitLoss = () => totalSale() - (parseFloat(form.purchaseCost) || 0);

  /* ── Purchase link ── */
  const handlePurchaseChange = (e) => {
    const id = e.target.value;
    const pur = purchases.find(p => p._id === id);
    setForm({ ...form, purchase: id, purchaseCost: pur ? pur.totalExpense || 0 : '' });
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const valid = form.items.every(it => {
      if (!it.productName) return false;
      if (isAllItemsSelection(it.productName)) return !!it.pricePerKg;
      if (!it.quantitySold) return false;
      return !!it.pricePerKg;
    });
    if (!valid) { toast.error('Each item needs product and price. Non-All Items also need quantity.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        date: form.date,
        items: form.items.map(it => ({
          productName: it.productName.trim(),
          product: it.product || undefined,
          quantitySold: isAllItemsSelection(it.productName) ? 1 : parseFloat(it.quantitySold),
          pricePerKg: parseFloat(it.pricePerKg),
          commission: parseFloat(it.commission) || 0,
        })),
        purchase: form.purchase || undefined,
        purchaseCost: parseFloat(form.purchaseCost) || 0,
      };
      if (editingId) {
        await API.put(`/sales/${editingId}`, payload);
        toast.success('Sale updated');
      } else {
        await API.post('/sales', payload);
        toast.success('Sale added');
      }
      setForm(emptyForm()); setEditingId(null); setShowForm(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSubmitting(false); }
  };

  /* ── Edit / Delete ── */
  const handleEdit = (sale) => {
    setForm({
      items: sale.items.map(it => ({
        product: it.product?._id || it.product,
        productName: it.productName,
        quantitySold: it.quantitySold,
        pricePerKg: it.pricePerKg,
        commission: it.commission || '',
      })),
      purchase: sale.purchase || '',
      purchaseCost: sale.purchaseCost || '',
      date: new Date(sale.date).toISOString().split('T')[0],
    });
    setEditingId(sale._id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this sale?')) return;
    try { await API.delete(`/sales/${id}`); toast.success('Deleted'); fetchData(); }
    catch { toast.error('Failed to delete'); }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading sales..." />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales</h1>
          <p className="text-slate-500 text-sm mt-0.5">Record daily fish sales</p>
        </div>
        <button onClick={() => { setForm(emptyForm()); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-gradient-to-r from-ocean-600 to-ocean-700 text-white px-4 py-3 rounded-xl font-semibold text-sm shadow-lg shadow-ocean-500/25 hover:shadow-ocean-500/40 transition-all active:scale-95">
          <HiPlus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Sale</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* ── Sale Form Modal ── */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditingId(null); }} title={editingId ? 'Edit Sale' : 'New Sale'}>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none" />
          </div>

          {/* ── Fish Items ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Fish Items</h3>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 text-xs font-medium text-ocean-600 hover:text-ocean-700 bg-ocean-50 hover:bg-ocean-100 px-2.5 py-1.5 rounded-lg transition-colors">
                <HiPlus className="w-3.5 h-3.5" /> Add Fish
              </button>
            </div>

            {form.items.map((item, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 relative">
                {form.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)}
                    className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <HiX className="w-4 h-4" />
                  </button>
                )}
                <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>

                <ProductInput value={item.productName} products={products}
                  onChange={(name) => {
                    const prod = products.find(p => p.name.toLowerCase() === name.toLowerCase());
                    const items = [...form.items];
                    items[idx] = {
                      ...items[idx],
                      productName: name,
                      product: prod?._id || '',
                      quantitySold: isAllItemsSelection(name) ? '1' : items[idx].quantitySold,
                      pricePerKg: isAllItemsSelection(name) ? '' : items[idx].pricePerKg,
                    };
                    setForm({ ...form, items });
                  }}
                />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Qty (kg)</label>
                    <input type="number" step="0.01" value={item.quantitySold} onChange={(e) => updateItem(idx, 'quantitySold', e.target.value)}
                      placeholder={isAllItemsSelection(item.productName) ? 'Auto: 1' : '0'}
                      disabled={isAllItemsSelection(item.productName)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none text-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">{isAllItemsSelection(item.productName) ? 'Total Sale (৳)' : 'Price/kg (৳)'}</label>
                    <input type="number" step="0.01" value={item.pricePerKg} onChange={(e) => updateItem(idx, 'pricePerKg', e.target.value)}
                      placeholder={isAllItemsSelection(item.productName) ? 'Enter total sale amount' : '0'}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Commission</label>
                    <input type="number" step="0.01" value={item.commission} onChange={(e) => updateItem(idx, 'commission', e.target.value)}
                      placeholder="0" className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none text-sm" />
                  </div>
                </div>
                <p className="text-right text-xs text-slate-500">
                  Subtotal: <span className="font-bold text-slate-700">
                    ৳{itemSubtotal(item).toLocaleString()}
                  </span>
                </p>
              </div>
            ))}
          </div>

          {/* ── Link to Purchase ── */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Link to Purchase (optional)</h3>
            <select value={form.purchase} onChange={handlePurchaseChange}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none appearance-none">
              <option value="">No linked purchase</option>
              {purchases.map(p => (
                <option key={p._id} value={p._id}>
                  {p.items.map(it => it.productName).join(', ')} — {new Date(p.date).toLocaleDateString()} — ৳{p.totalExpense}
                </option>
              ))}
            </select>
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Purchase Cost (৳)</label>
              <input type="number" step="0.01" value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })}
                placeholder="0" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none" />
            </div>
          </div>

          {/* ── Totals ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-r from-blue-50 to-ocean-50 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-500">Total Sale</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">৳{totalSale().toLocaleString()}</p>
            </div>
            <div className={`rounded-xl p-4 text-center ${profitLoss() >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-sm text-slate-500">Profit / Loss</p>
              <p className={`text-2xl font-bold mt-1 ${profitLoss() >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ৳{profitLoss().toLocaleString()}
              </p>
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-ocean-600 to-ocean-700 text-white font-semibold rounded-xl shadow-lg shadow-ocean-500/25 disabled:opacity-60 transition-all text-base">
            {submitting ? 'Saving...' : (editingId ? 'Update Sale' : 'Save Sale')}
          </button>
        </form>
      </Modal>

      {/* ── Sale Cards ── */}
      {sales.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <span className="text-5xl mb-4 block">💰</span>
          <p className="text-slate-500">No sales yet. Add your first sale!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map(sale => (
            <div key={sale._id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg">
                    {sale.items.map(it => it.productName).join(', ')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(sale.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                </div>
                {canEditDelete && (
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(sale)} className="p-2 text-slate-400 hover:text-ocean-600 hover:bg-ocean-50 rounded-lg transition-colors">
                      <HiPencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(sale._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Per-item breakdown */}
              <div className="space-y-2 mb-3">
                {sale.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-xs text-slate-400">{it.productName}</p>
                      <p className="text-base font-bold text-slate-700">
                        {isAllItemsSelection(it.productName) ? 'Combined Sale' : `${it.quantitySold} kg`}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-xs text-slate-400">{isAllItemsSelection(it.productName) ? 'Total Sale' : 'Price/kg'}</p>
                      <p className="text-base font-bold text-slate-700">৳{it.pricePerKg}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-xs text-slate-400">{isAllItemsSelection(it.productName) ? 'Net After Commission' : 'Subtotal'}</p>
                      <p className="text-base font-bold text-slate-700">৳{it.itemTotal?.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals row */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-blue-50 rounded-xl p-2.5">
                  <p className="text-xs text-blue-400">Total Sale</p>
                  <p className="text-lg font-bold text-blue-700">৳{sale.totalSale?.toLocaleString()}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${sale.profitLoss >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className={`text-xs ${sale.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {sale.profitLoss >= 0 ? 'Profit' : 'Loss'}
                  </p>
                  <p className={`text-lg font-bold ${sale.profitLoss >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ৳{Math.abs(sale.profitLoss || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {sale.items.some(it => it.commission > 0) && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                  {sale.items.filter(it => it.commission > 0).map((it, i) => (
                    <span key={i} className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded-lg">
                      Commission ({it.productName}): ৳{it.commission}
                    </span>
                  ))}
                  {sale.purchaseCost > 0 && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">Cost: ৳{sale.purchaseCost}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Sales;
