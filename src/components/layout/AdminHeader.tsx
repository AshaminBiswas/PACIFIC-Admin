import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, LogOut, ShieldCheck, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

interface AdminHeaderProps {
  currentTitle: string;
  onOpenSidebar: () => void;
  onLogout: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onInstallApp?: () => void;
  isInstalled?: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentTitle,
  onOpenSidebar,
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { user } = useAdminAuth();

  const userDisplayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email?.split('@')[0] || 'Admin';

  const userRole = user?.role || 'SUPER_ADMIN';

  return (
    <header className="h-16 bg-[#030213]/80 backdrop-blur-md border-b border-white/5 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Collapse / Expand Button in Header */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="hidden lg:flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-[#7FB706] transition-colors border border-white/5"
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}

        <div>
          <h1 className="text-base lg:text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span>{currentTitle}</span>
            <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-[#7FB706]" />
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Profile Icon / Card — Navigates to dedicated Admin Profile Page */}
        <Link
          to="/admin/dashboard/profile"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#7FB706]/40 transition text-left cursor-pointer group"
          title="Open Admin Profile: 2FA, Verify QR, Install App & Security Settings"
        >
          <div className="w-7 h-7 rounded-lg bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#7FB706] group-hover:scale-105 transition font-bold text-xs">
            {userDisplayName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-white group-hover:text-[#7FB706] transition leading-none">
              {userDisplayName}
            </p>
            <p className="text-[10px] text-[#7FB706] font-semibold mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>{userRole}</span>
            </p>
          </div>
        </Link>

        {/* Quick Log Out Button */}
        <button
          onClick={onLogout}
          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/20 cursor-pointer"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
