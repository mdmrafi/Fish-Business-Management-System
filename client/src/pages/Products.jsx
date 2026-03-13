import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { HiPlus, HiTrash, HiPencil } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { admin } = useAuth();
  const canEditDelete = admin?.name === 'tansir' && admin?.email === 'tansir@fishbusiness.com';

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const res = await API.get('/products');
      setProducts(res.data);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Product name is required'); return; }
    setSubmitting(true);
    try {
      if (editingId) {
        await API.put(`/products/${editingId}`, { name });
        toast.success('Product updated');
      } else {
        await API.post('/products', { name });
        toast.success('Product added');
      }
      setName(''); setEditingId(null); setShowForm(false);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try { await API.delete(`/products/${id}`); toast.success('Product deleted'); fetchProducts(); }
    catch { toast.error('Failed to delete'); }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading products..." />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Products</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage fish product list</p>
        </div>
        <button onClick={() => { setName(''); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-gradient-to-r from-ocean-600 to-ocean-700 text-white px-4 py-3 rounded-xl font-semibold text-sm shadow-lg shadow-ocean-500/25 hover:shadow-ocean-500/40 transition-all active:scale-95">
          <HiPlus className="w-5 h-5" /> Add
        </button>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Product Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ilish, Rui, Katla..."
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none" autoFocus />
          </div>
          <button type="submit" disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-ocean-600 to-ocean-700 text-white font-semibold rounded-xl shadow-lg shadow-ocean-500/25 disabled:opacity-60 transition-all">
            {submitting ? 'Saving...' : (editingId ? 'Update' : 'Add Product')}
          </button>
        </form>
      </Modal>

      {products.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <span className="text-5xl mb-4 block">🐟</span>
          <p className="text-slate-500">No products yet. Add your first fish product!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map(product => (
            <div key={product._id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-ocean-50 flex items-center justify-center text-lg">🐟</div>
                <span className="font-medium text-slate-700">{product.name}</span>
              </div>
              {canEditDelete && (
                <div className="flex gap-1">
                  <button onClick={() => { setName(product.name); setEditingId(product._id); setShowForm(true); }}
                    className="p-2 text-slate-400 hover:text-ocean-600 hover:bg-ocean-50 rounded-lg transition-colors">
                    <HiPencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(product._id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;
