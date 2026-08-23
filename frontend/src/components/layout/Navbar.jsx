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
      className="sticky top-0 z-40 px-6 py-3.5 bg-white/90 dark:bg-[#11171F]/90 backdrop-blur-md border-b border-slate-200 dark:border-[#26313D]"
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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF5A2F] to-[#FF4500] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <UtensilsCrossed size={18} strokeWidth={2.4} />
          </div>
          <div>
            <span className="text-base font-extrabold text-slate-900 dark:text-[#F5F7FA] tracking-tight block">FoodBridge</span>
            <span className="text-[10px] text-slate-400 dark:text-[#748296] block -mt-0.5 font-semibold">Redistribution Platform</span>
          </div>
        </Link>

        {/* Authenticated Navigation Links */}
        {isAuthenticated && (
          <div className="hidden md:flex items-center space-x-1 border border-slate-200 dark:border-[#26313D] bg-slate-50/80 dark:bg-[#171E27] p-1 rounded-full">
            {role === 'DONOR' && (
              <>
                <Link
                  to="/donor/list"
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition flex items-center space-x-1.5 ${
                    isActive('/donor/list')
                      ? 'bg-white dark:bg-[#11171F] text-slate-900 dark:text-[#F5F7FA] shadow-sm'
                      : 'text-slate-600 dark:text-[#A5B1C2] hover:text-slate-900 dark:hover:text-[#F5F7FA]'
                  }`}
                >
                  <ListFilter size={13} />
                  <span>My Donations</span>
                </Link>
                <Link
                  to="/donor/create"
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 ${
                    isActive('/donor/create')
                      ? 'bg-[#FF5A2F] text-white shadow'
                      : 'text-[#FF5A2F] hover:bg-orange-50 dark:hover:bg-orange-500/15'
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
                    ? 'bg-white dark:bg-[#11171F] text-slate-900 dark:text-[#F5F7FA] shadow-sm'
                    : 'text-slate-600 dark:text-[#A5B1C2] hover:text-slate-900 dark:hover:text-[#F5F7FA]'
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
                    ? 'bg-white dark:bg-[#11171F] text-slate-900 dark:text-[#F5F7FA] shadow-sm'
                    : 'text-slate-600 dark:text-[#A5B1C2] hover:text-slate-900 dark:hover:text-[#F5F7FA]'
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
                <span className="text-xs text-slate-900 dark:text-[#F5F7FA] font-bold block leading-tight">{user?.email}</span>
                <div className="flex justify-end mt-0.5">{getRoleBadge()}</div>
              </div>
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="p-2 rounded-full bg-slate-100 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D] text-slate-600 dark:text-[#A5B1C2] hover:text-red-600 hover:border-red-200 dark:hover:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 transition cursor-pointer"
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
                className="px-4 py-2 text-xs font-bold rounded-full text-slate-700 dark:text-[#F5F7FA] hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-[#171E27] transition flex items-center space-x-1.5"
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
