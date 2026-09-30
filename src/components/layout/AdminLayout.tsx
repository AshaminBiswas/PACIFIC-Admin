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
        {(() => {
          const dockItems = (() => {
            switch (user?.role) {
              case 'SALES_MANAGER':
                return [
                  { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
                  { name: 'Quotes', path: '/admin/dashboard/sales-quotations', icon: Receipt },
                  { name: 'Orders', path: '/admin/dashboard/sales-orders', icon: Layers, elevated: true },
                  { name: 'Invoices', path: '/admin/dashboard/proforma-invoices', icon: Receipt },
                  { name: 'CRM', path: '/admin/dashboard/customers', icon: Users },
                ];
              case 'WAREHOUSE_MANAGER':
                return [
                  { name: 'Packing', path: '/admin/dashboard/packing-lists', icon: Layers },
                  { name: 'Dispatch', path: '/admin/dashboard/dispatches', icon: Layers },
                  { name: 'Boards', path: '/admin/dashboard/inventory/boards', icon: Layers, elevated: true },
                  { name: 'Lockers', path: '/admin/dashboard/inventory/lockers', icon: Layers },
                  { name: 'HIL', path: '/admin/dashboard/issue-lists', icon: Receipt },
                ];
              case 'FINANCE_OFFICER':
                return [
                  { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
                  { name: 'Invoices', path: '/admin/dashboard/invoices', icon: Receipt },
                  { name: 'Ledger', path: '/admin/dashboard/payments', icon: CreditCard, elevated: true },
                  { name: 'Forex', path: '/admin/dashboard/export/realization', icon: CreditCard },
                  { name: 'CRM', path: '/admin/dashboard/customers', icon: Users },
                ];
              case 'PROCUREMENT_MANAGER':
                return [
                  { name: 'POs', path: '/admin/dashboard/purchase-orders', icon: Receipt },
                  { name: 'Vendors', path: '/admin/dashboard/vendors', icon: Users },
                  { name: 'Boards', path: '/admin/dashboard/inventory/boards', icon: Layers, elevated: true },
                  { name: 'Lockers', path: '/admin/dashboard/inventory/lockers', icon: Layers },
                  { name: 'Store', path: '/admin/dashboard/inventory/store', icon: Layers },
                ];
              case 'EXPORT_MANAGER':
                return [
                  { name: 'Export', path: '/admin/dashboard/export', icon: LayoutDashboard },
                  { name: 'Orders', path: '/admin/dashboard/export/orders', icon: Receipt },
                  { name: 'Shipments', path: '/admin/dashboard/export/shipments', icon: Layers, elevated: true },
                  { name: 'Buyers', path: '/admin/dashboard/export/customers', icon: Users },
                  { name: 'Forex', path: '/admin/dashboard/export/realization', icon: CreditCard },
                ];
              case 'EDITOR':
                return [
                  { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
                  { name: 'Products', path: '/admin/dashboard/products', icon: Layers },
                  { name: 'Blogs', path: '/admin/dashboard/blogs', icon: Receipt, elevated: true },
                  { name: 'Solutions', path: '/admin/dashboard/solutions', icon: Layers },
                  { name: 'Gallery', path: '/admin/dashboard/gallery', icon: LayoutDashboard },
                ];
              case 'VIEWER':
                return [
                  { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
                  { name: 'Products', path: '/admin/dashboard/products', icon: Layers },
                  { name: 'Projects', path: '/admin/dashboard/projects', icon: Layers, elevated: true },
                  { name: 'Leads', path: '/admin/dashboard/leads', icon: Users },
                  { name: 'Catalogs', path: '/admin/dashboard/catalogs', icon: Receipt },
                ];
              default:
                return [
                  { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
                  { name: 'CRM', path: '/admin/dashboard/customers', icon: Users },
                  { name: 'Board Stock', path: '/admin/dashboard/inventory/boards', icon: Layers, elevated: true },
                  { name: 'Invoices', path: '/admin/dashboard/proforma-invoices', icon: Receipt },
                  { name: 'Dues', path: '/admin/dashboard/payments', icon: CreditCard },
                ];
            }
          })();

          return dockItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            if (item.elevated) {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center -mt-6 group"
                  title={item.name}
                  aria-label={item.name}
                >
                  <div
                    className={`w-13 h-13 rounded-2xl flex items-center justify-center shadow-lg group-active:scale-95 transition-all p-3 ${
                      active
                        ? 'bg-gradient-to-tr from-[#8fd307] to-[#d4ff4d] text-[#030213] ring-2 ring-[#B5F823] shadow-[#7FB706]/60'
                        : 'bg-gradient-to-tr from-[#7FB706] to-[#B5F823] text-[#030213] shadow-[#7FB706]/40'
                    }`}
                  >
                    <Icon className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <span
                    className={`text-[10px] font-bold mt-1 text-center whitespace-nowrap transition ${
                      active ? 'text-[#B5F823]' : 'text-[#7FB706]'
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 p-1 min-h-[44px] min-w-[44px] justify-center text-[10px] font-semibold transition ${
                  active ? 'text-[#7FB706]' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          });
        })()}
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
