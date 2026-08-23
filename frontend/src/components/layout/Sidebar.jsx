/**
 * Sidebar — FoodBridge clean sidebar navigation with React Bits LineSidebar animation.
 * Desktop: Collapsible left navigation bar (256px expanded / 72px collapsed).
 * Clicking the brand logo toggles collapse/expand directly.
 * Mobile: Slide-over drawer when toggled.
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  LayoutDashboard,
  PlusCircle,
  ListFilter,
  BarChart3,
  ClipboardList,
  LogOut,
  X,
  User,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LineSidebar } from '../common/LineSidebar';

const NAV_SECTIONS = {
  DONOR: [
    {
      title: 'OPERATIONS',
      items: [
        { label: 'Overview',          path: '/donor',        icon: LayoutDashboard },
        { label: 'My Donations',       path: '/donor/list',   icon: ListFilter      },
        { label: 'Post Surplus Food',  path: '/donor/create', icon: PlusCircle      },
      ],
    },
    {
      title: 'ANALYTICS',
      items: [
        { label: 'Redistribution Impact', path: '/donor/impact', icon: BarChart3 },
      ],
    },
  ],
  NGO: [
    {
      title: 'RESCUE QUEUE',
      items: [
        { label: 'NGO Dashboard',   path: '/ngo', icon: LayoutDashboard },
      ],
    },
  ],
  VOLUNTEER: [
    {
      title: 'DISPATCH',
      items: [
        { label: 'My Assignments', path: '/volunteer', icon: ClipboardList },
      ],
    },
  ],
};

const ROLE_LABELS = {
  DONOR:     'Food Donor',
  NGO:       'NGO Partner',
  VOLUNTEER: 'Volunteer Driver',
};

const ROLE_ACCENT = {
  DONOR:     'text-orange-600 bg-orange-50 border-orange-200',
  NGO:       'text-emerald-600 bg-emerald-50 border-emerald-200',
  VOLUNTEER: 'text-blue-600 bg-blue-50 border-blue-200',
};

const ROLE_COLOR = {
  DONOR:     '#FF553E',
  NGO:       '#10B981',
  VOLUNTEER: '#3B82F6',
};

export const Sidebar = ({
  isMobileOpen,
  onMobileClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { user, role, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const sections = NAV_SECTIONS[role] ?? [];

  const getHomeRoute = () => {
    if (!isAuthenticated) return '/login';
    if (role === 'DONOR') return '/donor';
    if (role === 'NGO') return '/ngo';
    if (role === 'VOLUNTEER') return '/volunteer';
    return '/';
  };

  const isActive = (path) => {
    if (path === '/donor' || path === '/ngo' || path === '/volunteer') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const homeRoute = getHomeRoute();

  const renderNavContent = (isDrawer = false) => {
    const collapsed = isDrawer ? false : isCollapsed;
    const themeAccent = ROLE_COLOR[role] ?? '#FF553E';

    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#11171F] border-r border-slate-200 dark:border-[#26313D] shadow-sm transition-all duration-200">

        {/* Brand Header — Clicking logo on desktop collapses/expands the sidebar */}
        <div className={`py-4 border-b border-slate-200 dark:border-[#26313D] flex items-center justify-between ${collapsed ? 'px-3 justify-center' : 'px-5'}`}>
          {!isDrawer ? (
            <button
              id="sidebar-logo-toggle-btn"
              type="button"
              onClick={onToggleCollapse}
              className={`flex items-center space-x-3 cursor-pointer group rounded-xl p-1 -m-1 transition-colors hover:bg-slate-50 dark:hover:bg-[#171E27] text-left w-full ${collapsed ? 'justify-center' : ''}`}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Click to expand sidebar' : 'Click to collapse sidebar'}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF5A2F] to-[#FF4500] flex items-center justify-center text-white shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <UtensilsCrossed size={18} strokeWidth={2.4} />
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <span className="text-base font-extrabold text-slate-900 dark:text-[#F5F7FA] tracking-tight leading-tight block">FoodBridge</span>
                  <span className="text-[10px] text-slate-400 dark:text-[#748296] leading-tight block font-semibold">Redistribution</span>
                </div>
              )}
            </button>
          ) : (
            <Link
              to={homeRoute}
              onClick={onMobileClose}
              className="flex items-center space-x-3 cursor-pointer group rounded-xl p-1 -m-1 transition-colors hover:bg-slate-50 dark:hover:bg-[#171E27]"
              aria-label="Go to FoodBridge home"
              title="Go to FoodBridge home"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF5A2F] to-[#FF4500] flex items-center justify-center text-white shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <UtensilsCrossed size={18} strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <span className="text-base font-extrabold text-slate-900 dark:text-[#F5F7FA] tracking-tight leading-tight block">FoodBridge</span>
                <span className="text-[10px] text-slate-400 dark:text-[#748296] leading-tight block font-semibold">Redistribution</span>
              </div>
            </Link>
          )}

          {/* Mobile drawer close button */}
          {isDrawer && onMobileClose && (
            <button
              onClick={onMobileClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Grouped Navigation Items with React Bits LineSidebar animation */}
        {!collapsed ? (
          <div className="flex-1 py-4 px-3 overflow-y-auto space-y-6">
            {sections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-[#748296] mb-1.5">
                  {section.title}
                </p>
                <LineSidebar
                  items={section.items}
                  accentColor={themeAccent}
                  textColor="#475569"
                  markerColor="#E2E8F0"
                  showIndex={true}
                  showMarker={true}
                  markerLength={18}
                  markerGap={6}
                  maxShift={10}
                  fontSize={0.82}
                  itemGap={10}
                  activePath={location.pathname}
                  onItemClick={(_index, item) => {
                    if (isDrawer && onMobileClose) onMobileClose();
                    if (item?.path) navigate(item.path);
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          /* Collapsed icon column with floating hover tooltips */
          <nav className="flex-1 py-4 px-2 space-y-3 overflow-y-auto">
            {sections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1.5">
                {sIdx > 0 && <div className="h-px bg-slate-200 dark:bg-[#26313D] mx-2 my-2" />}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center justify-center p-2.5 rounded-xl text-xs transition-all duration-150 relative group
                        ${active
                          ? 'bg-orange-50 dark:bg-orange-500/15 text-[#FF5A2F] font-bold shadow-sm'
                          : 'text-slate-600 dark:text-[#A5B1C2] hover:text-slate-900 dark:hover:text-[#F5F7FA] hover:bg-slate-50 dark:hover:bg-[#171E27]'
                        }`}
                      aria-label={item.label}
                    >
                      <Icon
                        size={19}
                        className={`shrink-0 transition-colors ${active ? 'text-[#FF5A2F]' : 'text-slate-400 dark:text-[#748296] group-hover:text-slate-700 dark:group-hover:text-[#F5F7FA]'}`}
                      />
                      {/* Floating tooltip on hover */}
                      <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        )}

        {/* User Profile & Sign Out Footer */}
        <div className={`border-t border-slate-200 dark:border-[#26313D] bg-slate-50/50 dark:bg-[#171E27]/50 shrink-0 ${collapsed ? 'p-2 space-y-2' : 'p-3.5 space-y-2.5'}`}>
          {!collapsed ? (
            <>
              <div className="px-3 py-2 rounded-xl bg-white dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D] shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-800 dark:text-[#F5F7FA] font-bold truncate flex-1 mr-2">{user?.email}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border tracking-wider shrink-0 ${ROLE_ACCENT[role] ?? 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                    {ROLE_LABELS[role] ?? role}
                  </span>
                </div>
              </div>

              <button
                id="sidebar-logout-btn"
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-[#A5B1C2] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent hover:border-red-200 dark:hover:border-red-500/20 transition-all cursor-pointer"
              >
                <LogOut size={14} className="shrink-0" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div
                className="w-8 h-8 rounded-xl bg-white dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D] flex items-center justify-center text-slate-600 dark:text-[#A5B1C2] shadow-sm"
                title={`${user?.email} (${ROLE_LABELS[role] ?? role})`}
              >
                <User size={15} />
              </div>
              <button
                id="sidebar-logout-collapsed-btn"
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition cursor-pointer"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>

      </div>
    );
  };

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 h-screen sticky top-0 overflow-hidden transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-fade-in">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <div className="relative flex flex-col max-w-[280px] w-full shadow-2xl animate-slide-in-left">
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
