import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { AdminSidebar, allNavItems } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { ViewErrorBoundary } from '../common/ViewErrorBoundary';
import { PageLoader } from '../common/PageLoader';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  LayoutDashboard,
  Users,
  Layers,
  Receipt,
  CreditCard,
  Clock,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from '../common/PWAInstallModal';
import { PWAInstallBanner } from '../common/PWAInstallBanner';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const WARNING_BEFORE = 60 * 1000; // show warning 1 min before logout

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAdminAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('pacific_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pacific_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  // ── PWA Mobile App Installation ─────────────────────────
  const pwa = usePWAInstall();

  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // ── Logout Handler ──────────────────────────────────────
  const handleLogout = useCallback(async () => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowTimeoutWarning(false);

    await logout();
    navigate('/login');
  }, [logout, navigate]);

  // ── Inactivity Timer Reset ──────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowTimeoutWarning(false);

    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    warningTimerRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      setSecondsLeft(60);

      countdownRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      logoutTimerRef.current = setTimeout(() => {
        handleLogout();
      }, WARNING_BEFORE);
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE);
  }, [handleLogout]);

  // ── Activity Listeners ──────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    const onActivity = () => {
      if (!showTimeoutWarning) {
        resetInactivityTimer();
      }
    };

    resetInactivityTimer();

    activityEvents.forEach((event) => {
      document.addEventListener(event, onActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, onActivity);
      });
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [user, resetInactivityTimer, showTimeoutWarning]);

  const isActive = (path: string) => {
    if (path === '/admin/dashboard') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const currentTitle = allNavItems.find((i) => isActive(i.path))?.name || 'Dashboard';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a1a] text-white">
      {/* Decoupled Collapsible Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        onInstallApp={pwa.promptInstall}
        isInstalled={pwa.isInstalled}
      />

      {/* Main Content Area — Bounded Full-Height Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden w-full relative">
        {/* Decoupled Header — Fixed at Top */}
        <AdminHeader
          currentTitle={currentTitle}
          onOpenSidebar={() => setSidebarOpen(true)}
          onLogout={handleLogout}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
          onInstallApp={pwa.promptInstall}
          isInstalled={pwa.isInstalled}
        />

        {/* Dynamic Page Outlet — Independently Scrollable Right Side Content */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain min-h-0 w-full p-4 lg:p-8 pb-24 lg:pb-8"
        >
          <div className="max-w-7xl mx-auto w-full">
            <ViewErrorBoundary onResetView={() => navigate('/admin/dashboard')}>
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </ViewErrorBoundary>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Dock (< lg) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-[#030213]/95 backdrop-blur-lg border-t border-white/10 z-40 px-2 py-2 flex items-center justify-around">
        <Link
          to="/admin/dashboard"
          className={`flex flex-col items-center gap-1 p-1 min-h-[44px] min-w-[44px] justify-center text-[10px] font-semibold transition ${
            isActive('/admin/dashboard') && location.pathname === '/admin/dashboard'
              ? 'text-[#7FB706]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Overview</span>
        </Link>

        <Link
          to="/admin/dashboard/customers"
          className={`flex flex-col items-center gap-1 p-1 min-h-[44px] min-w-[44px] justify-center text-[10px] font-semibold transition ${
            isActive('/admin/dashboard/customers')
              ? 'text-[#7FB706]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>CRM</span>
        </Link>

        {/* Elevated Floating Restroom Board Stock Trigger */}
        <Link
          to="/admin/dashboard/inventory/boards"
          className="flex flex-col items-center -mt-6 group"
          title="Restroom Board Stock"
          aria-label="Restroom Board Stock"
        >
          <div
            className={`w-13 h-13 rounded-2xl flex items-center justify-center shadow-lg group-active:scale-95 transition-all p-3 ${
              isActive('/admin/dashboard/inventory/boards')
                ? 'bg-gradient-to-tr from-[#8fd307] to-[#d4ff4d] text-[#030213] ring-2 ring-[#B5F823] shadow-[#7FB706]/60'
                : 'bg-gradient-to-tr from-[#7FB706] to-[#B5F823] text-[#030213] shadow-[#7FB706]/40'
            }`}
          >
            <Layers className="w-7 h-7 stroke-[2.5]" />
          </div>
          <span
            className={`text-[10px] font-bold mt-1 text-center whitespace-nowrap transition ${
              isActive('/admin/dashboard/inventory/boards')
                ? 'text-[#B5F823]'
                : 'text-[#7FB706]'
            }`}
          >
            Board Stock
          </span>
        </Link>

        <Link
          to="/admin/dashboard/proforma-invoices"
          className={`flex flex-col items-center gap-1 p-1 min-h-[44px] min-w-[44px] justify-center text-[10px] font-semibold transition ${
            isActive('/admin/dashboard/proforma-invoices')
              ? 'text-[#7FB706]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span>Invoices</span>
        </Link>

        <Link
          to="/admin/dashboard/payments"
          className={`flex flex-col items-center gap-1 p-1 min-h-[44px] min-w-[44px] justify-center text-[10px] font-semibold transition ${
            isActive('/admin/dashboard/payments')
              ? 'text-[#7FB706]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span>Dues</span>
        </Link>
      </div>

      {/* Inactivity Warning Modal */}
      {showTimeoutWarning && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f0e26] border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Session Expiring Soon</h3>
              <p className="text-xs text-gray-400 mt-1">
                You have been inactive. To protect Pacific corporate data, you will be logged out in:
              </p>
            </div>
            <div className="text-3xl font-black text-amber-400 font-mono">
              00:{secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={resetInactivityTimer}
                className="px-5 py-2.5 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] text-xs font-bold transition shadow-lg shadow-[#7FB706]/20"
              >
                Stay Logged In
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-semibold transition"
              >
                Log Out Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating PWA Install Banner (< lg) */}
      <PWAInstallBanner
        isInstalled={pwa.isInstalled}
        isDismissed={pwa.isDismissed}
        onInstall={pwa.promptInstall}
        onDismiss={() => pwa.dismissPrompt(72)}
      />

      {/* PWA Installation Modal (Interactive / iOS Guide / Standalone) */}
      <PWAInstallModal
        isOpen={pwa.showInstallModal}
        onClose={() => pwa.setShowInstallModal(false)}
        onInstall={pwa.promptInstall}
        isIOS={pwa.isIOS}
        isAndroid={pwa.isAndroid}
        isWindows={pwa.isWindows}
        canPromptDirectly={pwa.canPromptDirectly}
      />
    </div>
  );
};

export default AdminLayout;
