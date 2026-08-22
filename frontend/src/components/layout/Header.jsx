/**
 * Header — Clean top bar for authenticated app shell.
 * Includes clickable FoodBridge brand link and breadcrumb navigation.
 */

import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  UtensilsCrossed,
  LogOut,
  PlusCircle,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

const ROLE_BADGES = {
  DONOR: {
    label: 'Food Donor',
    dot: 'bg-orange-500',
    className: 'bg-orange-50 text-orange-600 border-orange-200',
  },
  NGO: {
    label: 'NGO Partner',
    dot: 'bg-emerald-500',
    className: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
  VOLUNTEER: {
    label: 'Volunteer',
    dot: 'bg-blue-500',
    className: 'bg-blue-50 text-blue-600 border-blue-200',
  },
};

export const Header = ({ onToggleMobileSidebar, isMobileSidebarOpen }) => {
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

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/donor') return 'Overview';
    if (path === '/donor/list') return 'My Donations';
    if (path === '/donor/create') return 'Post Surplus Food';
    if (path === '/donor/impact') return 'Redistribution Impact';
    if (path.startsWith('/donor/donations/')) return 'Donation Detail';
    if (path === '/ngo') return 'NGO Dashboard';
    if (path === '/volunteer') return 'Driver Dispatch';
    if (path === '/e2e-stepper') return 'E2E Lifecycle Stepper';
    return 'Dashboard';
  };

  const getSectionLabel = () => {
    const path = location.pathname;
    if (path.startsWith('/donor')) return 'Donor Portal';
    if (path.startsWith('/ngo')) return 'NGO Portal';
    if (path.startsWith('/volunteer')) return 'Volunteer Portal';
    return 'FoodBridge';
  };

  const badge = ROLE_BADGES[role] ?? {
    label: role,
    dot: 'bg-slate-400',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const homeRoute = getHomeRoute();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 shrink-0 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">

      {/* Left: Mobile hamburger + Mobile Brand + Desktop Breadcrumb */}
      <div className="flex items-center space-x-3 min-w-0">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
          aria-label="Toggle navigation"
        >
          {isMobileSidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Mobile Brand Link (Clickable to Home) */}
        <Link
          to={homeRoute}
          className="md:hidden flex items-center space-x-2 cursor-pointer group"
          aria-label="Go to FoodBridge home"
          title="Go to FoodBridge home"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF5E3A] to-[#FF4500] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <UtensilsCrossed size={15} />
          </div>
          <span className="text-sm font-extrabold text-slate-900 tracking-tight">FoodBridge</span>
        </Link>

        {/* Desktop Breadcrumbs */}
        <div className="hidden md:flex items-center space-x-2 text-xs">
          <Link
            to={homeRoute}
            className="text-slate-400 hover:text-slate-700 font-semibold transition"
            title="Go to home"
          >
            {getSectionLabel()}
          </Link>
          <ChevronRight size={13} className="text-slate-300" />
          <span className="text-slate-800 font-bold">{getPageTitle()}</span>
        </div>
      </div>

      {/* Right side: Role badge + Quick Action + User identity */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">

        {/* Donor Quick Post CTA */}
        {role === 'DONOR' && (
          <Link
            to="/donor/create"
            className="hidden sm:inline-flex items-center space-x-1.5 px-4 py-2 rounded-full text-white text-xs font-bold transition shadow-md hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #FF5E3A 0%, #FF4500 100%)',
            }}
          >
            <PlusCircle size={14} />
            <span>Post Surplus Food</span>
          </Link>
        )}

        {/* User Role Badge */}
        <span className={`hidden sm:inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold border tracking-wide ${badge.className}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`} />
          <span>{badge.label}</span>
        </span>

        {/* User Email + Sign Out */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <span className="hidden lg:inline text-xs text-slate-600 font-bold truncate max-w-[140px]">
            {user?.email}
          </span>
          <button
            id="topbar-logout-btn"
            onClick={handleLogout}
            className="p-2 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>

      </div>

    </header>
  );
};
