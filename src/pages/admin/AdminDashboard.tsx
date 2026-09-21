import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link, Outlet, useLocation } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
// @ts-ignore
import logo from "@/image/logo/logo.webp";
import {
  LayoutDashboard,
  Package,
  FileText,
  Lightbulb,
  ImageIcon,
  LogOut,
  Menu,
  ChevronRight,
  MonitorPlay,
  Layers,
  LayoutTemplate,
  MessageSquare,
  Star,
  HelpCircle,
  Users,
  FileDown,
  Clock,
  ExternalLink,
  Search,
  Briefcase,
  Receipt,
  Cpu,
  Truck,
  Boxes,
  CreditCard,
  QrCode,
  Building2,
  ClipboardList,
  ShoppingBag,
  Wrench,
} from "lucide-react";

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const WARNING_BEFORE = 60 * 1000; // show warning 1 min before logout

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // ── Auth check ──────────────────────────────────────────
  useEffect(() => {
    async function check() {
      if (!isSupabaseConfigured()) {
        navigate("/admin");
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/admin");
      } else {
        setUser(data.session.user);
      }
      setChecking(false);
    }
    check();
  }, [navigate]);

  // ── Logout handler ──────────────────────────────────────
  const handleLogout = useCallback(async () => {
    // Clear all timers
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowTimeoutWarning(false);

    await supabase.auth.signOut();
    navigate("/admin");
  }, [navigate]);

  // ── Reset inactivity timer ──────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowTimeoutWarning(false);

    // Clear existing timers
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Set warning timer (fires 1 min before logout)
    warningTimerRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      setSecondsLeft(60);

      // Start countdown
      countdownRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Set actual logout timer (1 min after warning)
      logoutTimerRef.current = setTimeout(() => {
        handleLogout();
      }, WARNING_BEFORE);
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE);
  }, [handleLogout]);

  // ── Activity listeners ──────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    const onActivity = () => {
      // Only reset if not already in warning state
      if (!showTimeoutWarning) {
        resetInactivityTimer();
      }
    };

    // Start the timer
    resetInactivityTimer();

    // Listen for user activity
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
  }, [user, resetInactivityTimer]);

  // ── ERP & Operations Navigation ─────────────────────────
  const erpNavItems = [
    { name: "Sales Quotations", path: "/admin/dashboard/sales-quotations", icon: FileText, badge: "PPS/D" },
    { name: "Sales Orders Hub", path: "/admin/dashboard/sales-orders", icon: ShoppingBag, badge: "Flow" },
    { name: "Proforma Invoices", path: "/admin/dashboard/proforma-invoices", icon: Receipt, badge: "GST/VAT" },
    { name: "Packing Lists", path: "/admin/dashboard/packing-lists", icon: Package, badge: "Dispatch" },
    { name: "Hardware Issues", path: "/admin/dashboard/hardware-issues", icon: Wrench, badge: "Store" },
    { name: "Purchase Orders", path: "/admin/dashboard/purchase-orders", icon: ClipboardList, badge: "PO" },
    { name: "B2B Customers", path: "/admin/dashboard/customers", icon: Users, badge: "CRM 360" },
    { name: "Suppliers & Vendors", path: "/admin/dashboard/vendors", icon: Truck, badge: "Raw Mat" },
    { name: "Payments & Ledger", path: "/admin/dashboard/payments", icon: CreditCard, badge: "Dues" },
    { name: "Products Master", path: "/admin/dashboard/products-master", icon: Boxes, badge: "HPL" },
    { name: "QR Center", path: "/admin/dashboard/qr-center", icon: QrCode, badge: "Scan" },
    { name: "Company Settings", path: "/admin/dashboard/company-settings", icon: Building2, badge: "Multi-Entity" },
  ];

  // ── CMS & Website Navigation ────────────────────────────
  const cmsNavItems = [
    { name: "Overview", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Services CMS", path: "/admin/dashboard/products", icon: Package },
    { name: "3D Configurator Leads", path: "/admin/dashboard/configurator-leads", icon: Cpu },
    { name: "Quotations", path: "/admin/dashboard/quotations", icon: FileText },
    { name: "Commercial Projects", path: "/admin/dashboard/projects", icon: Briefcase },
    { name: "Website Invoices", path: "/admin/dashboard/invoices", icon: Receipt },
    { name: "Visitor Leads", path: "/admin/dashboard/leads", icon: Users },
    { name: "Contact Queries", path: "/admin/dashboard/contact-queries", icon: MessageSquare },
    { name: "Blogs CMS", path: "/admin/dashboard/blogs", icon: FileText },
    { name: "Solutions CMS", path: "/admin/dashboard/solutions", icon: Lightbulb },
    { name: "Photo Gallery", path: "/admin/dashboard/gallery", icon: ImageIcon },
    { name: "Hero Sliders", path: "/admin/dashboard/hero", icon: MonitorPlay },
    { name: "Core Services", path: "/admin/dashboard/core-services", icon: Layers },
    { name: "Page Banners", path: "/admin/dashboard/page-banners", icon: LayoutTemplate },
    { name: "PDF Catalogs", path: "/admin/dashboard/catalogs", icon: FileDown },
    { name: "Client Testimonials", path: "/admin/dashboard/feedback", icon: Star },
    { name: "FAQs", path: "/admin/dashboard/faq", icon: HelpCircle },
  ];

  const allNavItems = [...erpNavItems, ...cmsNavItems];

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="animate-pulse text-white text-lg font-semibold tracking-wide">
          Loading Pacific Admin...
        </div>
      </div>
    );
  }

  const isActive = (path: string) => {
    if (path === "/admin/dashboard") return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const currentTitle = allNavItems.find((i) => isActive(i.path))?.name || "Dashboard";

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col lg:flex-row">
      {/* Desktop & Mobile Slide-out Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#030213] border-r border-white/5 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Pacific Products & Solutions"
              className="h-12 w-auto object-contain rounded-xl bg-white/5 p-1.5 border border-white/10"
            />
            <div>
              <p className="text-xs font-black tracking-wider text-white">PACIFIC CUBICLES</p>
              <p className="text-[10px] tracking-wider text-[#7FB706] font-semibold">ENTERPRISE ERP</p>
            </div>
          </div>
        </div>

        {/* Scrollable Nav Items */}
        <nav
          className="flex-1 overflow-y-auto p-3 space-y-6 scrollbar-thin"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#ffffff15 transparent" }}
        >
          {/* Section: ERP & Operations */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#7FB706]">
              ERP & Operations
            </div>
            <div className="space-y-1">
              {erpNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
                    isActive(item.path)
                      ? "bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.name}</span>
                  {item.badge && (
                    <span
                      className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isActive(item.path)
                          ? "bg-[#7FB706]/20 text-[#7FB706]"
                          : "bg-white/5 text-gray-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Section: Website CMS & Leads */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Website CMS & Leads
            </div>
            <div className="space-y-1">
              {cmsNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all min-h-[40px] ${
                    isActive(item.path)
                      ? "bg-[#7FB706]/15 text-[#7FB706]"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.name}</span>
                  {isActive(item.path) && <ChevronRight className="w-3.5 h-3.5 ml-auto text-[#7FB706]" />}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* User / Sign Out Footer */}
        <div className="p-3 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 bg-gradient-to-br from-[#7FB706] to-[#B5F823] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.email?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white truncate font-semibold">{user?.email || "Admin"}</p>
              <p className="text-[10px] text-gray-500">Super Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 w-full transition-colors min-h-[44px]"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="bg-[#030213]/90 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 py-3 sticky top-0 z-30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Mobile menu trigger */}
              <button
                className="lg:hidden p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Breadcrumb Title */}
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <span>Pacific ERP</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-gray-300 font-medium">{currentTitle}</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                  {currentTitle}
                </h2>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/admin/dashboard/qr-center"
                className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-[#7FB706]/20 hover:bg-[#7FB706]/30 border border-[#7FB706]/40 rounded-xl transition-all min-h-[38px]"
              >
                <QrCode className="w-3.5 h-3.5 text-[#7FB706]" />
                <span>QR Scanner</span>
              </Link>

              <Link
                to="/"
                target="_blank"
                className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all min-h-[38px]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Public Site</span>
              </Link>

              <div className="w-8 h-8 bg-gradient-to-br from-[#7FB706] to-[#B5F823] rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md shadow-[#7FB706]/20 shrink-0">
                {user?.email?.[0]?.toUpperCase() || "A"}
              </div>
            </div>
          </div>
        </header>

        {/* Content Outlet with Mobile Bottom Bar Clearance */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 pb-24 lg:pb-6">
          <div className="bg-[#0d0d20]/60 rounded-2xl border border-white/[0.04] min-h-full p-4 sm:p-6 lg:p-8 shadow-2xl">
            <Outlet />
          </div>
        </main>

        {/* Desktop Footer */}
        <footer className="hidden lg:flex px-6 py-3 border-t border-white/5 items-center justify-between text-[11px] text-gray-600 bg-[#030213]/40">
          <span>© {new Date().getFullYear()} Pacific Products & Solutions — Enterprise Cubicle ERP</span>
          <span>Version 3.0 · Concurrency Safe · Multi-Entity</span>
        </footer>

        {/* ── Mobile Bottom Navigation Bar ──────────────────────────────── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#030213]/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around shadow-2xl">
          <Link
            to="/admin/dashboard"
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[54px] text-[10px] font-semibold transition-colors ${
              location.pathname === "/admin/dashboard"
                ? "text-[#7FB706]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span>Overview</span>
          </Link>

          <Link
            to="/admin/dashboard/customers"
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[54px] text-[10px] font-semibold transition-colors ${
              isActive("/admin/dashboard/customers")
                ? "text-[#7FB706]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>CRM</span>
          </Link>

          {/* Floating Center Scan QR Button with Glowing Ring */}
          <Link
            to="/admin/dashboard/qr-center"
            className="flex flex-col items-center justify-center -mt-6 group"
            aria-label="Scan Document QR Code"
          >
            <div className="w-13 h-13 p-3 rounded-full bg-gradient-to-tr from-[#7FB706] to-[#B5F823] flex items-center justify-center text-black shadow-lg shadow-[#7FB706]/40 border-2 border-[#030213] group-active:scale-95 transition-transform">
              <QrCode className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-black text-[#7FB706] mt-0.5 tracking-tight uppercase">
              Scan QR
            </span>
          </Link>

          <Link
            to="/admin/dashboard/proforma-invoices"
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[54px] text-[10px] font-semibold transition-colors ${
              isActive("/admin/dashboard/proforma-invoices")
                ? "text-[#7FB706]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Receipt className="w-5 h-5 mb-0.5" />
            <span>Invoices</span>
          </Link>

          <Link
            to="/admin/dashboard/payments"
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[54px] text-[10px] font-semibold transition-colors ${
              isActive("/admin/dashboard/payments")
                ? "text-[#7FB706]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <CreditCard className="w-5 h-5 mb-0.5" />
            <span>Dues</span>
          </Link>
        </nav>
      </div>

      {/* Inactivity Warning Toast */}
      {showTimeoutWarning && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[100] animate-[slideUp_0.3s_ease-out]">
          <div className="bg-[#1a1a2e] border border-yellow-500/30 rounded-2xl p-5 shadow-2xl shadow-black/40 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/15 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white mb-1">Session Expiring</h4>
                <p className="text-xs text-gray-400 mb-3">
                  You'll be logged out in <span className="text-yellow-400 font-bold">{secondsLeft}s</span> due to inactivity.
                </p>
                <button
                  onClick={resetInactivityTimer}
                  className="px-4 py-2 text-xs font-semibold bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-lg transition-colors w-full min-h-[44px]"
                >
                  Stay Logged In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
