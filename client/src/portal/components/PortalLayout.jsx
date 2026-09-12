import { Link, useNavigate } from 'react-router-dom';
import { getPortalUser, portalLogout } from '../api/portalAuth';

export default function PortalLayout({ children }) {
  const user = getPortalUser();
  const navigate = useNavigate();

  function handleLogout() {
    portalLogout();
    navigate('/portal/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-slate-800">TRIKON Business Portal</h1>
          <p className="text-xs text-slate-500">{user?.name} · {user?.role}</p>
        </div>
        <nav className="flex items-center gap-4 text-sm text-slate-600">
          <Link to="/portal/dashboard" className="hover:text-indigo-600">Dashboard</Link>
          {user?.role === 'customer' && (
            <>
              <Link to="/portal/invoices" className="hover:text-indigo-600">Invoices</Link>
              <Link to="/portal/quotes" className="hover:text-indigo-600">Quotes</Link>
            </>
          )}
          {(user?.role === 'supplier' || user?.role === 'vendor') && (
            <Link to="/portal/orders" className="hover:text-indigo-600">Orders</Link>
          )}
          <Link to="/portal/requests" className="hover:text-indigo-600">Requests</Link>
          <button onClick={handleLogout} className="text-slate-500 hover:text-slate-900">Logout</button>
        </nav>
      </header>
      <main className="max-w-[1400px] mx-auto px-6 py-8">{children}</main>
    </div>
  );
}