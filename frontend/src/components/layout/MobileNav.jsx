/**
 * MobileNav — Bottom navigation bar for authenticated users on mobile.
 * Cloudhub style: Clean white frosted bar with coral-orange active indicators.
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  ListFilter,
  BarChart3,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const MOBILE_NAV_CONFIG = {
  DONOR: [
    { label: 'Overview',  path: '/donor',        icon: LayoutDashboard, end: true },
    { label: 'Donations', path: '/donor/list',   icon: ListFilter,      end: false },
    { label: 'Post Surplus', path: '/donor/create', icon: PlusCircle,      end: false },
    { label: 'Impact',    path: '/donor/impact', icon: BarChart3,       end: false },
  ],
  NGO: [
    { label: 'Dashboard', path: '/ngo', icon: LayoutDashboard, end: true },
  ],
  VOLUNTEER: [
    { label: 'Dispatch', path: '/volunteer', icon: ClipboardList, end: true },
  ],
};

export const MobileNav = () => {
  const { role } = useAuth();
  const items = MOBILE_NAV_CONFIG[role] ?? [];

  if (items.length === 0) return null;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 flex items-stretch bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors relative
              ${isActive ? 'text-[#FF553E]' : 'text-slate-400 hover:text-slate-700'}`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator at top */}
                <span
                  className={`absolute top-0 left-1/2 -translate-x-1/2 h-1 rounded-full transition-all duration-200 ${
                    isActive ? 'w-10 bg-[#FF553E]' : 'w-0 bg-transparent'
                  }`}
                />
                <Icon
                  size={20}
                  className={`transition-colors ${isActive ? 'text-[#FF553E]' : 'text-slate-400'}`}
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};
