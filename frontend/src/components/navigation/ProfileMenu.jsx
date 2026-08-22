import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, LogOut, CheckCircle2 } from 'lucide-react';

export const ProfileMenu = ({ user, roleMeta, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isProfileActive = location.pathname === '/profile';

  // Close on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleProfileClick = () => {
    setIsOpen(false);
    navigate('/profile');
  };

  const handleSignOutClick = () => {
    setIsOpen(false);
    onLogout();
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Profile Trigger Button: Looks and behaves exactly like a normal navigation pill */}
      <button
        type="button"
        id="auth-profile-menu-btn"
        className={`pill${isProfileActive ? ' is-active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Profile"
      >
        <span className="flex items-center gap-1.5">
          <User size={14} className="shrink-0 text-slate-600" />
          <span>Profile</span>
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="pill-profile-dropdown animate-fade-in"
          role="menu"
          aria-orientation="vertical"
        >
          {/* Dropdown Header: Identity Info */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 rounded-t-2xl">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1.5"
                style={{
                  color: roleMeta.dotColor,
                  backgroundColor: `${roleMeta.dotColor}12`,
                  borderColor: `${roleMeta.dotColor}30`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: roleMeta.dotColor }}
                />
                {roleMeta.label}
              </span>
              <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={11} />
                Verified
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-900 truncate mt-1">
              {user?.email || 'Authenticated User'}
            </div>
          </div>

          {/* Dropdown Items */}
          <div className="p-1.5 space-y-0.5">
            <button
              type="button"
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition flex items-center gap-2.5"
              onClick={handleProfileClick}
              role="menuitem"
            >
              <User size={14} className="text-slate-500" />
              <span>Digital ID & Profile</span>
            </button>

            <div className="my-1 border-t border-slate-100" />

            <button
              type="button"
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition flex items-center gap-2.5"
              onClick={handleSignOutClick}
              role="menuitem"
            >
              <LogOut size={14} className="text-rose-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
