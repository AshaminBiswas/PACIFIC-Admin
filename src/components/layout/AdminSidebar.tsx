import React from 'react';
import { Link, useLocation } from 'react-router-dom';
// @ts-ignore
import logo from '../../image/logo/logo.webp';
import {
  LayoutDashboard,
  Package,
  FileText,
  Lightbulb,
  ImageIcon,
  MonitorPlay,
  Layers,
  LayoutTemplate,
  MessageSquare,
  Star,
  HelpCircle,
  Users,
  FileDown,
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
  X,
  Globe,
  Ship,
  Coins,
  Mail,
  Anchor,
  ShieldCheck,
  Download,
  Lock,
  Columns,
} from 'lucide-react';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onInstallApp?: () => void;
  isInstalled?: boolean;
}

// 7-stage sales pipeline — ordered to match the commercial lifecycle
export const salesPipelineItems = [
  { name: 'Sales Quotations',   path: '/admin/dashboard/sales-quotations',   icon: FileText,    step: '01' },
  { name: 'Proforma Invoices',  path: '/admin/dashboard/proforma-invoices',  icon: Receipt,     step: '02' },
  { name: 'Sales Orders Hub',   path: '/admin/dashboard/sales-orders',       icon: ShoppingBag, step: '03' },
  { name: 'Bill & Tax Invoices',path: '/admin/dashboard/invoices',            icon: Layers,      step: '04' },
  { name: 'Packing Lists',      path: '/admin/dashboard/packing-lists',      icon: Package,     step: '05' },
  { name: 'Dispatch & Gate Pass', path: '/admin/dashboard/dispatches',       icon: Truck,       step: '06' },
  { name: 'Issue Lists (HIL)',  path: '/admin/dashboard/issue-lists',        icon: Wrench,      step: '07' },
];

export const procurementNavItems = [
  { name: 'Purchase Orders', path: '/admin/dashboard/purchase-orders', icon: ClipboardList },
  { name: 'Suppliers & Vendors', path: '/admin/dashboard/vendors', icon: Briefcase },
  { name: 'Restroom Boards', path: '/admin/dashboard/inventory/boards', icon: Layers },
  { name: 'Locker Boards', path: '/admin/dashboard/inventory/lockers', icon: Lock },
  { name: 'UMP Partitions', path: '/admin/dashboard/inventory/ump', icon: Columns },
  { name: 'General Store', path: '/admin/dashboard/inventory/store', icon: Package },
];

export const crmFinanceNavItems = [
  { name: 'B2B Customers', path: '/admin/dashboard/customers', icon: Users },
  { name: 'Payments & Ledger', path: '/admin/dashboard/payments', icon: CreditCard },
];

export const systemNavItems = [
  { name: 'QR Center', path: '/admin/dashboard/qr-center', icon: QrCode },
  { name: 'Company Settings', path: '/admin/dashboard/company-settings', icon: Building2 },
  { name: 'Admins & Roles', path: '/admin/dashboard/admin-management', icon: ShieldCheck },
];

export const erpNavItems = [
  ...salesPipelineItems,
  ...procurementNavItems,
  ...crmFinanceNavItems,
  ...systemNavItems,
];


export const cmsNavItems = [
  { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Products & Models', path: '/admin/dashboard/products', icon: Package },
  { name: '3D Configurator Leads', path: '/admin/dashboard/configurator-leads', icon: Cpu },
  { name: 'Quotations', path: '/admin/dashboard/quotations', icon: FileText },
  { name: 'Commercial Projects', path: '/admin/dashboard/projects', icon: Briefcase },
  { name: 'Visitor Leads', path: '/admin/dashboard/leads', icon: Users },
  { name: 'Contact Queries', path: '/admin/dashboard/contact-queries', icon: MessageSquare },
  { name: 'Blogs CMS', path: '/admin/dashboard/blogs', icon: FileText },
  { name: 'Solutions CMS', path: '/admin/dashboard/solutions', icon: Lightbulb },
  { name: 'Photo Gallery', path: '/admin/dashboard/gallery', icon: ImageIcon },
  { name: 'Hero Sliders', path: '/admin/dashboard/hero', icon: MonitorPlay },
  { name: 'Core Services', path: '/admin/dashboard/core-services', icon: Layers },
  { name: 'Page Banners', path: '/admin/dashboard/page-banners', icon: LayoutTemplate },
  { name: 'PDF Catalogs', path: '/admin/dashboard/catalogs', icon: FileDown },
  { name: 'Client Testimonials', path: '/admin/dashboard/feedback', icon: Star },
  { name: 'FAQs', path: '/admin/dashboard/faq', icon: HelpCircle },
];

export const exportNavItems = [
  { name: 'Export Dashboard', path: '/admin/dashboard/export', icon: Globe },
  { name: 'Export Orders & Hub', path: '/admin/dashboard/export/orders', icon: Ship },
  { name: 'Logistics & Vessels', path: '/admin/dashboard/export/shipments', icon: Anchor },
  { name: 'Foreign Buyers (CRM)', path: '/admin/dashboard/export/customers', icon: Users },
  { name: 'Export Quotations', path: '/admin/dashboard/export/quotations', icon: FileText },
  { name: 'Forex & eBRC Hub', path: '/admin/dashboard/export/realization', icon: Coins },
  { name: 'Trade Email Hub', path: '/admin/dashboard/export/emails', icon: Mail },
];

export const allNavItems = [...erpNavItems, ...exportNavItems, ...cmsNavItems];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
  onInstallApp,
  isInstalled = false,
}) => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/admin/dashboard') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar aside — Fixed height & static on desktop with smooth width collapse */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 h-full overflow-hidden bg-[#030213] border-r border-white/5 flex flex-col transition-all duration-300 ease-in-out shrink-0 ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Fixed Brand Header with Logo, Title, and Collapse Trigger */}
        <div
          className={`border-b border-white/5 flex items-center shrink-0 sticky top-0 z-20 bg-[#030213] ${
            isCollapsed ? 'py-3 px-2 flex-col justify-center' : 'p-4 justify-between'
          }`}
        >
          <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'justify-center' : ''}`}>
            <img
              src={logo}
              alt="Pacific Products & Solutions"
              className={`object-contain rounded-xl bg-white/5 border border-white/10 shrink-0 ${
                isCollapsed ? 'h-10 w-10 p-1 mx-auto' : 'h-11 w-auto p-1.5'
              }`}
            />
            {!isCollapsed && (
              <div className="truncate min-w-0">
                <p className="text-xs font-black tracking-wider text-white truncate">PACIFIC CUBICLES</p>
                <p className="text-[10px] tracking-wider text-[#7FB706] font-semibold truncate">ENTERPRISE ERP</p>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <div className="flex items-center gap-1 lg:hidden">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
              title="Close Menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Nav Items — Isolated Scroll Area without Scrollbar */}
        <nav
          className={`flex-1 overflow-y-auto overscroll-contain no-scrollbar ${
            isCollapsed ? 'px-2 py-2 space-y-3' : 'p-3 space-y-5'
          }`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* ── ERP & Operations ─────────────────────────────── */}
          {!isCollapsed && (
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#7FB706]">
              ERP &amp; Operations
            </div>
          )}

          {/* Sub-group: Sales Pipeline (7 Stages) */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 pb-1.5 flex items-center gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Sales Pipeline</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
            ) : (
              <div className="my-1 mx-1 border-t border-white/10" />
            )}
            <div className="space-y-0.5">
              {salesPipelineItems.map((item) => (
                <Link
                  key={item.step + item.path}
                  to={item.path}
                  onClick={onClose}
                  title={isCollapsed ? `${item.step} ${item.name}` : undefined}
                  className={`flex items-center rounded-xl text-xs font-semibold transition-all ${
                    isCollapsed
                      ? 'justify-center p-2 min-h-[40px] w-full'
                      : 'gap-2.5 pl-2 pr-3 py-2 min-h-[42px]'
                  } ${
                    isActive(item.path)
                      ? 'bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {/* Step badge */}
                  {!isCollapsed && (
                    <span className={`shrink-0 text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-md border ${
                      isActive(item.path)
                        ? 'bg-[#7FB706]/20 border-[#7FB706]/40 text-[#7FB706]'
                        : 'bg-white/5 border-white/10 text-gray-500'
                    }`}>
                      {item.step}
                    </span>
                  )}
                  <div className={`flex items-center justify-center shrink-0 ${
                    isActive(item.path) ? 'text-[#7FB706]' : 'text-gray-400'
                  }`}>
                    <item.icon className="w-4 h-4 shrink-0" />
                  </div>
                  {!isCollapsed && (
                    <span className={`truncate ${isActive(item.path) ? 'text-[#7FB706]' : 'text-gray-300'}`}>
                      {item.name}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Sub-group: Procurement */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 pb-1.5 flex items-center gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Procurement</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
            ) : (
              <div className="my-1 mx-1 border-t border-white/10" />
            )}
            <div className="space-y-0.5">
              {procurementNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  title={isCollapsed ? item.name : undefined}
                  className={`flex items-center rounded-xl text-xs font-semibold transition-all ${
                    isCollapsed
                      ? 'justify-center p-2 min-h-[40px] w-full'
                      : 'gap-3 px-3 py-2.5 min-h-[44px]'
                  } ${
                    isActive(item.path)
                      ? 'bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className={`flex items-center justify-center shrink-0 ${isActive(item.path) ? 'text-[#7FB706]' : 'text-gray-400'}`}>
                    <item.icon className="w-5 h-5 shrink-0" />
                  </div>
                  {!isCollapsed && (
                    <span className={`truncate ${isActive(item.path) ? 'text-[#7FB706]' : 'text-gray-300'}`}>
                      {item.name}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Sub-group: CRM & Finance */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 pb-1.5 flex items-center gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">CRM &amp; Finance</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
            ) : (
              <div className="my-1 mx-1 border-t border-white/10" />
            )}
            <div className="space-y-0.5">
              {crmFinanceNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  title={isCollapsed ? item.name : undefined}
                  className={`flex items-center rounded-xl text-xs font-semibold transition-all ${
                    isCollapsed
                      ? 'justify-center p-2 min-h-[40px] w-full'
                      : 'gap-3 px-3 py-2.5 min-h-[44px]'
                  } ${
                    isActive(item.path)
                      ? 'bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className={`flex items-center justify-center shrink-0 ${isActive(item.path) ? 'text-[#7FB706]' : 'text-gray-400'}`}>
                    <item.icon className="w-5 h-5 shrink-0" />
                  </div>
                  {!isCollapsed && (
                    <span className={`truncate ${isActive(item.path) ? 'text-[#7FB706]' : 'text-gray-300'}`}>
                      {item.name}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Sub-group: System */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 pb-1.5 flex items-center gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">System</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
            ) : (
              <div className="my-1 mx-1 border-t border-white/10" />
            )}
            <div className="space-y-0.5">
              {systemNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  title={isCollapsed ? item.name : undefined}
                  className={`flex items-center rounded-xl text-xs font-semibold transition-all ${
                    isCollapsed
                      ? 'justify-center p-2 min-h-[40px] w-full'
                      : 'gap-3 px-3 py-2.5 min-h-[44px]'
                  } ${
                    isActive(item.path)
                      ? 'bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className={`flex items-center justify-center shrink-0 ${isActive(item.path) ? 'text-[#7FB706]' : 'text-gray-400'}`}>
                    <item.icon className="w-5 h-5 shrink-0" />
                  </div>
                  {!isCollapsed && (
                    <span className={`truncate ${isActive(item.path) ? 'text-[#7FB706]' : 'text-gray-300'}`}>
                      {item.name}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>


          {/* Section: Export & Global Trade */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#B5F823]">
                Export &amp; Global Trade
              </div>
            ) : (
              <div className="my-2 mx-1 border-t border-white/10" />
            )}
            <div className="space-y-1">
              {exportNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  title={isCollapsed ? item.name : undefined}
                  className={`flex items-center rounded-xl text-xs font-semibold transition-all ${
                    isCollapsed
                      ? 'justify-center p-2 min-h-[40px] w-full'
                      : 'gap-3 px-3 py-2.5 min-h-[44px]'
                  } ${
                    isActive(item.path)
                      ? 'bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div
                    className={`flex items-center justify-center shrink-0 ${
                      isActive(item.path) ? 'text-[#7FB706]' : 'text-gray-400 group-hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`truncate ${
                        isActive(item.path) ? 'text-[#7FB706]' : 'text-gray-300'
                      }`}
                    >
                      {item.name}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Section: Website CMS */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#7FB706]">
                Website CMS Suite
              </div>
            ) : (
              <div className="my-2 mx-1 border-t border-white/10" />
            )}
            <div className="space-y-1">
              {cmsNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  title={isCollapsed ? item.name : undefined}
                  className={`flex items-center rounded-xl text-xs font-semibold transition-all ${
                    isCollapsed
                      ? 'justify-center p-2 min-h-[40px] w-full'
                      : 'gap-3 px-3 py-2.5 min-h-[44px]'
                  } ${
                    isActive(item.path)
                      ? 'bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div
                    className={`flex items-center justify-center shrink-0 ${
                      isActive(item.path) ? 'text-[#7FB706]' : 'text-gray-400'
                    }`}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`truncate ${
                        isActive(item.path) ? 'text-[#7FB706]' : 'text-gray-300'
                      }`}
                    >
                      {item.name}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* PWA Install Button in Sidebar Footer */}
        {!isInstalled && onInstallApp && (
          <div className="p-3 border-t border-white/5 shrink-0 bg-[#07061d]">
            <button
              type="button"
              onClick={onInstallApp}
              title="Install Pacific Admin as a native app"
              className={`w-full flex items-center rounded-xl bg-gradient-to-r from-[#7FB706]/15 to-[#B5F823]/10 hover:from-[#7FB706]/25 hover:to-[#B5F823]/20 border border-[#7FB706]/30 text-[#7FB706] text-xs font-bold transition-all shadow-sm cursor-pointer ${
                isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2.5'
              }`}
            >
              <Download className="w-4 h-4 shrink-0 text-[#7FB706]" />
              {!isCollapsed && (
                <div className="text-left truncate">
                  <p className="text-white text-xs font-bold leading-tight">Install Mobile App</p>
                  <p className="text-[10px] text-gray-400 font-normal mt-0.5 leading-tight">Add to Home Screen</p>
                </div>
              )}
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
