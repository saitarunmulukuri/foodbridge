/**
 * AppShell — Authenticated application layout.
 * Supports desktop sidebar collapse/expand with localStorage persistence and mobile drawer.
 */

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

const SIDEBAR_COLLAPSED_KEY = 'foodbridge-sidebar-collapsed';

export const AppShell = ({ children }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch (err) {
        // Storage unavailable
        void err;
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFC] dark:bg-[#0B0F14] text-slate-900 dark:text-[#F5F7FA]">

      {/* Sidebar (Desktop fixed + collapsible, Mobile slide-over) */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Header */}
        <Header
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((v) => !v)}
          isMobileSidebarOpen={isMobileSidebarOpen}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />

        {/* Scrollable Page Canvas */}
        <main
          className="flex-1 overflow-y-auto pb-16 md:pb-6"
        >
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>

      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

    </div>
  );
};
