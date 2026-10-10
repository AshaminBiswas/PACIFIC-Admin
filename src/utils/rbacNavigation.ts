import type { UserRole } from '../types/admin';

/**
 * Access permissions mapped by navigation path.
 * If a role is included in allowedRoles, the user can see and navigate to the path.
 * SUPER_ADMIN has unconditional universal access.
 */
export const PATH_PERMISSIONS: Record<string, UserRole[]> = {
  // ─── Dashboard Overview ───────────────────────────────────────────────────
  '/admin/dashboard': [
    'SUPER_ADMIN',
    'ADMIN',
    'SALES_MANAGER',
    'WAREHOUSE_MANAGER',
    'FINANCE_OFFICER',
    'PROCUREMENT_MANAGER',
    'EXPORT_MANAGER',
    'EDITOR',
    'VIEWER',
  ],

  // ─── Commercial Sales Pipeline ────────────────────────────────────────────
  '/admin/dashboard/sales-quotations': ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'VIEWER'],
  '/admin/dashboard/proforma-invoices': ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'FINANCE_OFFICER', 'VIEWER'],
  '/admin/dashboard/sales-orders': ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'VIEWER'],
  '/admin/dashboard/invoices': ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'FINANCE_OFFICER', 'VIEWER'],
  '/admin/dashboard/packing-lists': ['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'VIEWER'],
  '/admin/dashboard/dispatches': ['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'VIEWER'],
  '/admin/dashboard/issue-lists': ['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'VIEWER'],

  // ─── Procurement & Inventory ─────────────────────────────────────────────
  '/admin/dashboard/purchase-orders': ['SUPER_ADMIN', 'ADMIN', 'PROCUREMENT_MANAGER', 'VIEWER'],
  '/admin/dashboard/vendors': ['SUPER_ADMIN', 'ADMIN', 'PROCUREMENT_MANAGER', 'VIEWER'],
  '/admin/dashboard/inventory/boards': ['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'PROCUREMENT_MANAGER', 'VIEWER'],
  '/admin/dashboard/inventory/hardware': ['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'PROCUREMENT_MANAGER', 'VIEWER'],
  '/admin/dashboard/inventory/lockers': ['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'PROCUREMENT_MANAGER', 'VIEWER'],
  '/admin/dashboard/inventory/ump': ['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'PROCUREMENT_MANAGER', 'VIEWER'],
  '/admin/dashboard/inventory/store': ['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'PROCUREMENT_MANAGER', 'VIEWER'],

  // ─── CRM & Finance ────────────────────────────────────────────────────────
  '/admin/dashboard/customers': ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'FINANCE_OFFICER', 'VIEWER'],
  '/admin/dashboard/payments': ['SUPER_ADMIN', 'ADMIN', 'FINANCE_OFFICER', 'VIEWER'],

  // ─── Export & Global Trade Suite ──────────────────────────────────────────
  '/admin/dashboard/export': ['SUPER_ADMIN', 'ADMIN', 'EXPORT_MANAGER', 'VIEWER'],
  '/admin/dashboard/export/orders': ['SUPER_ADMIN', 'ADMIN', 'EXPORT_MANAGER', 'VIEWER'],
  '/admin/dashboard/export/shipments': ['SUPER_ADMIN', 'ADMIN', 'EXPORT_MANAGER', 'VIEWER'],
  '/admin/dashboard/export/customers': ['SUPER_ADMIN', 'ADMIN', 'EXPORT_MANAGER', 'VIEWER'],
  '/admin/dashboard/export/quotations': ['SUPER_ADMIN', 'ADMIN', 'EXPORT_MANAGER', 'VIEWER'],
  '/admin/dashboard/export/realization': ['SUPER_ADMIN', 'ADMIN', 'EXPORT_MANAGER', 'FINANCE_OFFICER', 'VIEWER'],
  '/admin/dashboard/export/emails': ['SUPER_ADMIN', 'ADMIN', 'EXPORT_MANAGER', 'VIEWER'],

  // ─── Website CMS Suite ────────────────────────────────────────────────────
  '/admin/dashboard/products': ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER'],
  '/admin/dashboard/configurator-leads': ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'EDITOR', 'VIEWER'],
  '/admin/dashboard/quotations': ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'EDITOR', 'VIEWER'],
  '/admin/dashboard/projects': ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER'],
  '/admin/dashboard/leads': ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'EDITOR', 'VIEWER'],
  '/admin/dashboard/contact-queries': ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER'],
  '/admin/dashboard/blogs': ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER'],
  '/admin/dashboard/solutions': ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER'],
  '/admin/dashboard/gallery': ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER'],
  '/admin/dashboard/hero': ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER'],
  '/admin/dashboard/core-services': ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER'],
  '/admin/dashboard/page-banners': ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER'],
  '/admin/dashboard/catalogs': ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER'],
  '/admin/dashboard/feedback': ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER'],
  '/admin/dashboard/faq': ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER'],

  // ─── System & Security ────────────────────────────────────────────────────
  '/admin/dashboard/qr-center': ['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'VIEWER'],
  '/admin/dashboard/company-settings': ['SUPER_ADMIN', 'ADMIN'],
  '/admin/dashboard/admin-management': ['SUPER_ADMIN'],
  '/admin/dashboard/profile': [
    'SUPER_ADMIN',
    'ADMIN',
    'SALES_MANAGER',
    'WAREHOUSE_MANAGER',
    'FINANCE_OFFICER',
    'PROCUREMENT_MANAGER',
    'EXPORT_MANAGER',
    'EDITOR',
    'VIEWER',
  ],
};

/**
 * Checks if a user role is permitted to access a given route path
 */
export function canRoleAccessPath(role: UserRole | string | undefined, path: string): boolean {
  if (!role) return false;
  const roleUpper = role.toUpperCase() as UserRole;
  if (roleUpper === 'SUPER_ADMIN') return true;

  // Exact match
  if (PATH_PERMISSIONS[path]) {
    return PATH_PERMISSIONS[path].includes(roleUpper);
  }

  // Prefix match (e.g. nested detail/edit routes)
  for (const [permPath, allowedRoles] of Object.entries(PATH_PERMISSIONS)) {
    if (path.startsWith(permPath) && allowedRoles.includes(roleUpper)) {
      return true;
    }
  }

  // Default fallback: ADMIN has operational access unless explicitly restricted
  if (roleUpper === 'ADMIN' && !path.includes('admin-management')) {
    return true;
  }

  return false;
}

/**
 * Filters an array of navigation items to only include items accessible by the role
 */
export function filterNavItemsByRole<T extends { path: string }>(
  items: T[],
  role: UserRole | string | undefined
): T[] {
  if (!role) return [];
  if (role.toUpperCase() === 'SUPER_ADMIN') return items;
  return items.filter((item) => canRoleAccessPath(role, item.path));
}

/**
 * Returns role display badge details (name, color, description)
 */
export function getRoleBadgeInfo(role: string = 'EDITOR'): {
  name: string;
  badgeClass: string;
  dotColor: string;
  description: string;
} {
  const r = role.toUpperCase();
  switch (r) {
    case 'SUPER_ADMIN':
      return {
        name: 'Super Administrator',
        badgeClass: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
        dotColor: 'bg-purple-400',
        description: 'Master platform authority, full configuration, and deletion rights',
      };
    case 'ADMIN':
      return {
        name: 'Administrator',
        badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
        dotColor: 'bg-blue-400',
        description: 'Complete operational management across ERP, CRM, and CMS modules',
      };
    case 'SALES_MANAGER':
      return {
        name: 'Sales Manager',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
        dotColor: 'bg-emerald-400',
        description: 'Sales Quotations, Proforma Invoices, Sales Orders, and B2B Clients',
      };
    case 'WAREHOUSE_MANAGER':
      return {
        name: 'Warehouse & Logistics',
        badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
        dotColor: 'bg-amber-400',
        description: 'Packing Lists, Dispatches, Store Hardware Lists (HIL), and Board Inventory',
      };
    case 'FINANCE_OFFICER':
      return {
        name: 'Finance & Accounts',
        badgeClass: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
        dotColor: 'bg-cyan-400',
        description: 'Payments Ledger, Aging, Tax Invoices, and Bank Realization',
      };
    case 'PROCUREMENT_MANAGER':
      return {
        name: 'Procurement Manager',
        badgeClass: 'bg-orange-500/10 text-orange-400 border border-orange-500/30',
        dotColor: 'bg-orange-400',
        description: 'Vendor Directory, Purchase Orders, and Raw Material Stocking',
      };
    case 'EXPORT_MANAGER':
      return {
        name: 'Export & Trade Manager',
        badgeClass: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30',
        dotColor: 'bg-indigo-400',
        description: 'Global Buyers CRM, Vessel Shipments, Export Quotations, and Forex Hub',
      };
    case 'EDITOR':
      return {
        name: 'Content Editor',
        badgeClass: 'bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/30',
        dotColor: 'bg-[#7FB706]',
        description: 'Website CMS, Projects, Blogs, Media Gallery, and Visitor Leads',
      };
    case 'VIEWER':
      return {
        name: 'Read-Only Observer',
        badgeClass: 'bg-gray-500/10 text-gray-400 border border-gray-500/30',
        dotColor: 'bg-gray-400',
        description: 'Auditing and read-only visibility across ERP and website operations',
      };
    default:
      return {
        name: role,
        badgeClass: 'bg-gray-500/10 text-gray-400 border border-gray-500/30',
        dotColor: 'bg-gray-400',
        description: 'Standard staff user',
      };
  }
}
