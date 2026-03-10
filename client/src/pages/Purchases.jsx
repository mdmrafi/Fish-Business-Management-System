import { useState, useEffect, useRef } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { HiPlus, HiTrash, HiPencil, HiX } from 'react-icons/hi';

/* ── Writable product picker (datalist-style) ────────────── */
const ProductInput = ({ value, onChange, products }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const ref = useRef();

  useEffect(() => { setSearch(value); }, [value]);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes((search || '').toLowerCase())
  );

  const pick = (name) => { onChange(name); setSearch(name); setOpen(false); };

  return (
    <div className="relative" ref={ref}>
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

/* ── Empty helpers ────────────────────────────────────────── */
const emptyItem = () => ({ productName: '', quantity: '', pricePerKg: '', freeKg: '' });

const emptyForm = () => ({
  items: [emptyItem()],
  carRent: '', workerSalary: '', iceCost: '', customExpenses: [],
  date: new Date().toISOString().split('T')[0]
});

/* ── Main component ──────────────────────────────────────── */
const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [pRes, prRes] = await Promise.all([API.get('/purchases'), API.get('/products')]);
      setPurchases(pRes.data);
      setProducts(prRes.data);
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

  /* ── Custom expense helpers ── */
  const addCustomExpense = () => {
    if (!customName.trim() || !customAmount) return;
    setForm({ ...form, customExpenses: [...form.customExpenses, { name: customName.trim(), amount: parseFloat(customAmount) || 0 }] });
    setCustomName(''); setCustomAmount('');
  };
  const removeCustomExpense = (idx) => {
    setForm({ ...form, customExpenses: form.customExpenses.filter((_, i) => i !== idx) });
  };

  /* ── Calculations ── */
  const itemsTotal = () => form.items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.pricePerKg) || 0), 0);
  const expensesTotal = () => (parseFloat(form.carRent) || 0) + (parseFloat(form.workerSalary) || 0) + (parseFloat(form.iceCost) || 0) +
    form.customExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const grandTotal = () => itemsTotal() + expensesTotal();

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const valid = form.items.every(it => it.productName && it.quantity && it.pricePerKg);
    if (!valid) { toast.error('Each item needs product, quantity and price'); return; }
    setSubmitting(true);
    try {
      const payload = {
        date: form.date,
        items: form.items.map(it => ({
          productName: it.productName.trim(),
          product: it.product || undefined,
          quantity: parseFloat(it.quantity),
          pricePerKg: parseFloat(it.pricePerKg),
          freeKg: parseFloat(it.freeKg) || 0,
        })),
        carRent: parseFloat(form.carRent) || 0,
        workerSalary: parseFloat(form.workerSalary) || 0,
        iceCost: parseFloat(form.iceCost) || 0,
        customExpenses: form.customExpenses,
      };
      if (editingId) {
        await API.put(`/purchases/${editingId}`, payload);
        toast.success('Purchase updated');
      } else {
        await API.post('/purchases', payload);
        toast.success('Purchase added');
      }
      setForm(emptyForm()); setEditingId(null); setShowForm(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSubmitting(false); }
  };

  /* ── Edit / Delete ── */
  const handleEdit = (p) => {
    setForm({
      items: p.items.map(it => ({
        product: it.product?._id || it.product,
        productName: it.productName,
        quantity: it.quantity,
        pricePerKg: it.pricePerKg,
        freeKg: it.freeKg || '',
      })),
      carRent: p.carRent || '',
      workerSalary: p.workerSalary || '',
      iceCost: p.iceCost || '',
      customExpenses: p.customExpenses || [],
      date: new Date(p.date).toISOString().split('T')[0],
    });
    setEditingId(p._id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this purchase?')) return;
    try { await API.delete(`/purchases/${id}`); toast.success('Deleted'); fetchData(); }
    catch { toast.error('Failed to delete'); }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading purchases..." />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Purchases</h1>
          <p className="text-slate-500 text-sm mt-0.5">Record daily fish purchases</p>
        </div>
        <button onClick={() => { setForm(emptyForm()); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-gradient-to-r from-ocean-600 to-ocean-700 text-white px-4 py-3 rounded-xl font-semibold text-sm shadow-lg shadow-ocean-500/25 hover:shadow-ocean-500/40 transition-all active:scale-95">
          <HiPlus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Purchase</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* ── Purchase Form Modal ── */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditingId(null); }} title={editingId ? 'Edit Purchase' : 'New Purchase'}>
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
                    items[idx] = { ...items[idx], productName: name, product: prod?._id || '' };
                    setForm({ ...form, items });
                  }}
                />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Qty (kg)</label>
                    <input type="number" step="0.01" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      placeholder="0" className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Price/kg (৳)</label>
                    <input type="number" step="0.01" value={item.pricePerKg} onChange={(e) => updateItem(idx, 'pricePerKg', e.target.value)}
                      placeholder="0" className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Free (kg)</label>
                    <input type="number" step="0.01" value={item.freeKg} onChange={(e) => updateItem(idx, 'freeKg', e.target.value)}
                      placeholder="0" className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none text-sm" />
                  </div>
                </div>
                <p className="text-right text-xs text-slate-500">
                  Subtotal: <span className="font-bold text-slate-700">৳{((parseFloat(item.quantity) || 0) * (parseFloat(item.pricePerKg) || 0)).toLocaleString()}</span>
                </p>
              </div>
            ))}
          </div>

          {/* ── Default Expenses ── */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Expenses</h3>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Car Rent</label>
                <input type="number" value={form.carRent} onChange={(e) => setForm({ ...form, carRent: e.target.value })}
                  placeholder="0" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Worker</label>
                <input type="number" value={form.workerSalary} onChange={(e) => setForm({ ...form, workerSalary: e.target.value })}
                  placeholder="0" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Ice Cost</label>
                <input type="number" value={form.iceCost} onChange={(e) => setForm({ ...form, iceCost: e.target.value })}
                  placeholder="0" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none text-sm" />
              </div>
            </div>
          </div>

          {/* ── Custom Expenses ── */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Custom Expenses</h3>
            {form.customExpenses.map((exp, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <span className="flex-1 text-sm bg-slate-50 px-3 py-2 rounded-lg">{exp.name}</span>
                <span className="text-sm font-medium text-slate-700">৳{exp.amount}</span>
                <button type="button" onClick={() => removeCustomExpense(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <HiX className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)}
                placeholder="Expense name" className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-ocean-500" />
              <input type="number" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Amount" className="w-24 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-ocean-500" />
              <button type="button" onClick={addCustomExpense}
                className="px-3 py-2.5 bg-ocean-50 text-ocean-600 rounded-lg text-sm font-medium hover:bg-ocean-100 transition-colors">
                <HiPlus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Total ── */}
          <div className="bg-gradient-to-r from-blue-50 to-ocean-50 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-500">Total Expense</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">৳{grandTotal().toLocaleString()}</p>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-ocean-600 to-ocean-700 text-white font-semibold rounded-xl shadow-lg shadow-ocean-500/25 disabled:opacity-60 transition-all text-base">
            {submitting ? 'Saving...' : (editingId ? 'Update Purchase' : 'Save Purchase')}
          </button>
        </form>
      </Modal>

      {/* ── Purchase Cards ── */}
      {purchases.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <span className="text-5xl mb-4 block">📦</span>
          <p className="text-slate-500">No purchases yet. Add your first purchase!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map(purchase => (
            <div key={purchase._id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg">
                    {purchase.items.map(it => it.productName).join(', ')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(purchase.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(purchase)} className="p-2 text-slate-400 hover:text-ocean-600 hover:bg-ocean-50 rounded-lg transition-colors">
                    <HiPencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(purchase._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Per-item breakdown */}
              <div className="space-y-2 mb-3">
                {purchase.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-xs text-slate-400">{it.productName}</p>
                      <p className="text-base font-bold text-slate-700">{it.quantity} kg</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-xs text-slate-400">Price/kg</p>
                      <p className="text-base font-bold text-slate-700">৳{it.pricePerKg}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-xs text-slate-400">Subtotal</p>
                      <p className="text-base font-bold text-slate-700">৳{it.itemTotal?.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grand total */}
              <div className="bg-blue-50 rounded-xl p-2.5 text-center mb-2">
                <p className="text-xs text-blue-400">Total</p>
                <p className="text-lg font-bold text-blue-700">৳{purchase.totalExpense?.toLocaleString()}</p>
              </div>

              {(purchase.items.some(it => it.freeKg > 0) || purchase.carRent > 0 || purchase.workerSalary > 0 || purchase.iceCost > 0 || purchase.customExpenses?.length > 0) && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                  {purchase.items.filter(it => it.freeKg > 0).map((it, i) => (
                    <span key={i} className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg">Free ({it.productName}): {it.freeKg}kg</span>
                  ))}
                  {purchase.carRent > 0 && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">Car: ৳{purchase.carRent}</span>}
                  {purchase.workerSalary > 0 && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">Worker: ৳{purchase.workerSalary}</span>}
                  {purchase.iceCost > 0 && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">Ice: ৳{purchase.iceCost}</span>}
                  {purchase.customExpenses?.map((e, i) => (
                    <span key={i} className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-lg">{e.name}: ৳{e.amount}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Purchases;
