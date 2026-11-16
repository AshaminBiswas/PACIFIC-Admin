import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes fresh by default
      gcTime: 30 * 60 * 1000, // 30 minutes in memory cache
      refetchOnWindowFocus: false, // Prevent redundant background fetches on tab switch
      refetchOnReconnect: true,
      retry: 1, // Max 1 retry on network failures
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Centralized, type-safe Query Key Factory
 * Eliminates magic strings and ensures surgical cache invalidation.
 */
export const queryKeys = {
  // Dashboard & Metrics
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    analytics: (period?: string) => [...queryKeys.dashboard.all, 'analytics', period || 'default'] as const,
    dailyReports: (date?: string) => [...queryKeys.dashboard.all, 'dailyReports', date || 'today'] as const,
  },

  // CRM & Domestic B2B Customers
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (params: Record<string, any>) => [...queryKeys.customers.lists(), params] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
    customer360: (id: string) => [...queryKeys.customers.all, '360', id] as const,
    dues: () => [...queryKeys.customers.all, 'dues'] as const,
  },

  // Vendors & Procurement
  vendors: {
    all: ['vendors'] as const,
    lists: () => [...queryKeys.vendors.all, 'list'] as const,
    list: (params: Record<string, any>) => [...queryKeys.vendors.lists(), params] as const,
    detail: (id: string) => [...queryKeys.vendors.all, 'detail', id] as const,
  },

  // Purchase Orders (PO)
  purchaseOrders: {
    all: ['purchaseOrders'] as const,
    lists: () => [...queryKeys.purchaseOrders.all, 'list'] as const,
    list: (params: Record<string, any>) => [...queryKeys.purchaseOrders.lists(), params] as const,
    detail: (id: string) => [...queryKeys.purchaseOrders.all, 'detail', id] as const,
  },

  // Quotations
  quotations: {
    all: ['quotations'] as const,
    lists: () => [...queryKeys.quotations.all, 'list'] as const,
    list: (params: Record<string, any>) => [...queryKeys.quotations.lists(), params] as const,
    details: () => [...queryKeys.quotations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.quotations.details(), id] as const,
  },

  // Proforma Invoices (PI)
  proforma: {
    all: ['proforma'] as const,
    lists: () => [...queryKeys.proforma.all, 'list'] as const,
    list: (params: Record<string, any>) => [...queryKeys.proforma.lists(), params] as const,
    detail: (id: string) => [...queryKeys.proforma.all, 'detail', id] as const,
  },

  // Sales Orders
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (params: Record<string, any>) => [...queryKeys.orders.lists(), params] as const,
    detail: (id: string) => [...queryKeys.orders.all, 'detail', id] as const,
  },

  // Invoices & Tax Invoices
  invoices: {
    all: ['invoices'] as const,
    lists: () => [...queryKeys.invoices.all, 'list'] as const,
    list: (params: Record<string, any>) => [...queryKeys.invoices.lists(), params] as const,
    details: () => [...queryKeys.invoices.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.invoices.details(), id] as const,
    dues: () => [...queryKeys.invoices.all, 'dues'] as const,
  },

  // Inventory: Boards & Hardware
  inventory: {
    all: ['inventory'] as const,
    boards: (params?: Record<string, any>) => [...queryKeys.inventory.all, 'boards', params || {}] as const,
    boardDetail: (id: string) => [...queryKeys.inventory.all, 'board', id] as const,
    boardSuppliers: () => [...queryKeys.inventory.all, 'boardSuppliers'] as const,
    boardAnalytics: () => [...queryKeys.inventory.all, 'boardAnalytics'] as const,
    hardware: (params?: Record<string, any>) => [...queryKeys.inventory.all, 'hardware', params || {}] as const,
    hardwareCatalog: () => [...queryKeys.inventory.all, 'hardwareCatalog'] as const,
  },

  // Products & Catalogs Master
  products: {
    all: ['products'] as const,
    master: () => [...queryKeys.products.all, 'master'] as const,
    categories: () => [...queryKeys.products.all, 'categories'] as const,
    list: (params?: Record<string, any>) => [...queryKeys.products.all, 'list', params || {}] as const,
    detail: (id: string) => [...queryKeys.products.all, 'detail', id] as const,
  },

  // Employees & UP Factory
  employees: {
    all: ['employees'] as const,
    list: (params?: Record<string, any>) => [...queryKeys.employees.all, 'list', params || {}] as const,
    detail: (id: string) => [...queryKeys.employees.all, 'detail', id] as const,
    payroll: (period?: string) => [...queryKeys.employees.all, 'payroll', period || 'current'] as const,
  },

  upEmployees: {
    all: ['upEmployees'] as const,
    list: (params?: Record<string, any>) => [...queryKeys.upEmployees.all, 'list', params || {}] as const,
    detail: (id: string) => [...queryKeys.upEmployees.all, 'detail', id] as const,
    payroll: (period?: string) => [...queryKeys.upEmployees.all, 'payroll', period || 'current'] as const,
    advances: (employeeId?: string) => [...queryKeys.upEmployees.all, 'advances', employeeId || 'all'] as const,
  },

  // Companies / Settings
  companies: {
    all: ['companies'] as const,
    active: () => [...queryKeys.companies.all, 'active'] as const,
    list: () => [...queryKeys.companies.all, 'list'] as const,
  },
};
