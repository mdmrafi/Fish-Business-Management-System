import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  HiHome, HiShoppingCart, HiCurrencyDollar, 
  HiClipboardList, HiChartBar, HiCube, 
  HiLogout, HiMenu, HiX 
} from 'react-icons/hi';

const navItems = [
  { path: '/', label: 'Dashboard', icon: HiHome },
  { path: '/purchases', label: 'Purchases', icon: HiShoppingCart },
  { path: '/sales', label: 'Sales', icon: HiCurrencyDollar },
  { path: '/records', label: 'Records', icon: HiClipboardList },
  { path: '/reports', label: 'Reports', icon: HiChartBar },
  { path: '/products', label: 'Products', icon: HiCube },
];

const Layout = ({ children }) => {
  const { admin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-gradient-to-b from-ocean-800 to-ocean-900 shadow-xl z-30">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-ocean-700/50">
          <span className="text-3xl">🐟</span>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Fish Business</h1>
            <p className="text-ocean-300 text-xs">Management System</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                location.pathname === item.path
                  ? 'bg-white/15 text-white shadow-lg shadow-ocean-900/20'
                  : 'text-ocean-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-ocean-700/50">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-ocean-600 flex items-center justify-center text-white font-bold text-sm">
              {admin?.name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{admin?.name || 'Admin'}</p>
              <p className="text-ocean-400 text-xs truncate">{admin?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-ocean-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <HiLogout className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-gradient-to-r from-ocean-700 to-ocean-800 shadow-lg z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐟</span>
            <h1 className="text-white font-bold text-lg">Fish Business</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white p-2 rounded-lg hover:bg-white/10"
          >
            {sidebarOpen ? <HiX className="w-6 h-6" /> : <HiMenu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-ocean-800 to-ocean-900 shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-ocean-700/50">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🐟</span>
                <h1 className="text-white font-bold">Fish Business</h1>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-white p-1">
                <HiX className="w-6 h-6" />
              </button>
            </div>
            <nav className="px-3 py-4 space-y-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    location.pathname === item.path
                      ? 'bg-white/15 text-white'
                      : 'text-ocean-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-ocean-700/50">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm text-ocean-200 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <HiLogout className="w-5 h-5" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex justify-around items-center py-1">
          {navItems.slice(0, 5).map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-2 py-2 min-w-[60px] rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'text-ocean-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <item.icon className={`w-6 h-6 ${location.pathname === item.path ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 pb-20 lg:pb-4">
        <div className="max-w-6xl mx-auto px-4 py-4 lg:py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
