/**
 * Navbar — Top navigation for FoodBridge.
 * Clean white frosted background, modern typography, Coral-Orange CTA.
 * Clickable brand routes to user's role home or /login.
 */
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UtensilsCrossed, LogOut, PlusCircle, ListFilter, Truck, Building2, UserPlus } from 'lucide-react';

export const Navbar = () => {
  const { user, role, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getHomeRoute = () => {
    if (!isAuthenticated) return '/login';
    if (role === 'DONOR') return '/donor';
    if (role === 'NGO') return '/ngo';
    if (role === 'VOLUNTEER') return '/volunteer';
    return '/';
  };

  const isActive = (path) => location.pathname === path;
  const homeRoute = getHomeRoute();

  const getRoleBadge = () => {
    switch (role) {
      case 'DONOR':
        return (
          <span className="flex items-center space-x-1.5 bg-orange-50 text-orange-600 border border-orange-200 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
            <span>DONOR</span>
          </span>
        );
      case 'NGO':
        return (
          <span className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>NGO</span>
          </span>
        );
      case 'VOLUNTEER':
        return (
          <span className="flex items-center space-x-1.5 bg-blue-50 text-blue-600 border border-blue-200 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <span>VOLUNTEER</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <nav
      className="sticky top-0 z-40 px-6 py-3.5 bg-white/90 backdrop-blur-md border-b border-slate-200"
      style={{
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.03)',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Brand Link (Clickable Home Navigation) */}
        <Link
          to={homeRoute}
          className="flex items-center space-x-3 cursor-pointer group"
          aria-label="Go to FoodBridge home"
          title="Go to FoodBridge home"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF5E3A] to-[#FF4500] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <UtensilsCrossed size={18} strokeWidth={2.4} />
          </div>
          <div>
            <span className="text-base font-extrabold text-slate-900 tracking-tight block">FoodBridge</span>
            <span className="text-[10px] text-slate-400 block -mt-0.5 font-semibold">Redistribution Platform</span>
          </div>
        </Link>

        {/* Authenticated Navigation Links */}
        {isAuthenticated && (
          <div className="hidden md:flex items-center space-x-1 border border-slate-200 bg-slate-50/80 p-1 rounded-full">
            {role === 'DONOR' && (
              <>
                <Link
                  to="/donor/list"
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition flex items-center space-x-1.5 ${
                    isActive('/donor/list')
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ListFilter size={13} />
                  <span>My Donations</span>
                </Link>
                <Link
                  to="/donor/create"
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 ${
                    isActive('/donor/create')
                      ? 'bg-[#FF553E] text-white shadow'
                      : 'text-[#FF553E] hover:bg-orange-50'
                  }`}
                >
                  <PlusCircle size={13} />
                  <span>Post Surplus Food</span>
                </Link>
              </>
            )}

            {role === 'NGO' && (
              <Link
                to="/ngo"
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition flex items-center space-x-1.5 ${
                  isActive('/ngo')
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 size={13} />
                <span>NGO Dashboard</span>
              </Link>
            )}

            {role === 'VOLUNTEER' && (
              <Link
                to="/volunteer"
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition flex items-center space-x-1.5 ${
                  isActive('/volunteer')
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Truck size={13} />
                <span>My Assignments</span>
              </Link>
            )}
          </div>
        )}

        {/* Right side Actions */}
        <div className="flex items-center space-x-3">
          {isAuthenticated ? (
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <span className="text-xs text-slate-900 font-bold block leading-tight">{user?.email}</span>
                <div className="flex justify-end mt-0.5">{getRoleBadge()}</div>
              </div>
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="p-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/register"
                className="px-4 py-2 text-xs font-bold rounded-full text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition flex items-center space-x-1.5"
              >
                <UserPlus size={14} />
                <span>Create Account</span>
              </Link>
              <Link
                to="/login"
                className="fb-btn-primary text-xs"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
};
