/**
 * AuthLayout — Unified authenticated application layout.
 * Uses PillNav as the single navigation element across all authenticated pages.
 * Features standard [ Profile ] navigation link and direct [ Sign Out ] action.
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PillNav } from '../navigation/PillNav';
import { LogOut } from 'lucide-react';

/* ── Role → Center Nav Items (standard text-only Profile link) ── */
const NAV_ITEMS_BY_ROLE = {
  DONOR: [
    { label: 'Overview',     href: '/donor',        isExact: true },
    { label: 'My Donations', href: '/donor/list',   activePrefix: '/donor/list', extraPrefix: '/donor/donations' },
    { label: 'Impact',       href: '/donor/impact', activePrefix: '/donor/impact' },
    { label: 'Profile',      href: '/profile',      activePrefix: '/profile' },
  ],
  NGO: [
    { label: 'Dashboard', href: '/ngo',     isExact: true },
    { label: 'Profile',   href: '/profile', activePrefix: '/profile' },
  ],
  VOLUNTEER: [
    { label: 'My Assignments', href: '/volunteer', isExact: true },
    { label: 'Profile',        href: '/profile',   activePrefix: '/profile' },
  ],
};

const ROLE_META = {
  DONOR: {
    label: 'Food Donor',
    dotColor: '#FF5A36',
    badgeClass: 'donor',
    homeRoute: '/donor',
  },
  NGO: {
    label: 'NGO Partner',
    dotColor: '#10B981',
    badgeClass: 'ngo',
    homeRoute: '/ngo',
  },
  VOLUNTEER: {
    label: 'Volunteer Driver',
    dotColor: '#3B82F6',
    badgeClass: 'volunteer',
    homeRoute: '/volunteer',
  },
};

export const AuthLayout = ({ children }) => {
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleMeta = ROLE_META[role] ?? {
    label: role || 'Member',
    dotColor: '#9CA3AF',
    badgeClass: '',
    homeRoute: '/login',
  };

  const rawItems = NAV_ITEMS_BY_ROLE[role] ?? [];

  /* Build items with active detection logic */
  const navItems = rawItems.map((item) => {
    let isActive = false;
    if (item.isExact) {
      isActive = location.pathname === item.href;
    } else if (item.activePrefix) {
      isActive = location.pathname.startsWith(item.activePrefix);
      if (!isActive && item.extraPrefix) {
        isActive = location.pathname.startsWith(item.extraPrefix);
      }
    }
    return { ...item, isActive };
  });

  /* Primary CTA for Donor: Create Donation */
  const ctaItem = role === 'DONOR' ? {
    label: 'Create Donation',
    href: '/donor/create',
    activePrefix: '/donor/create',
    isCta: true,
  } : null;

  /* Direct Sign Out Action (Red text + icon, no dropdown) */
  const rightSlot = (
    <button
      type="button"
      id="auth-direct-signout-btn"
      className="pill-signout-btn"
      onClick={handleLogout}
      title="Sign Out"
      aria-label="Sign Out"
    >
      <LogOut size={14} className="text-red-500 shrink-0" />
      <span>Sign Out</span>
    </button>
  );

  /* Mobile right items (appear in hamburger menu) */
  const mobileRightItems = [
    ...(role === 'DONOR'
      ? [{ type: 'link', label: 'Create Donation', href: '/donor/create', onClick: () => navigate('/donor/create') }]
      : []),
    { type: 'link', label: 'Profile', href: '/profile', onClick: () => navigate('/profile') },
    { type: 'logout', label: 'Sign Out', onClick: handleLogout },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0B0F14] text-slate-900 dark:text-[#F5F7FA] flex flex-col transition-colors duration-200">
      <div className="pt-3">
        <PillNav
          items={navItems}
          activeHref={location.pathname}
          ctaItem={ctaItem}
          rightSlot={rightSlot}
          mobileRightItems={mobileRightItems}
          logoHref={roleMeta.homeRoute}
          isAuthNav={false}
        />
      </div>

      <main className="flex-1 overflow-y-auto pb-10">
        <div className="max-w-[1200px] mx-auto p-5 sm:p-6 auth-layout-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;
