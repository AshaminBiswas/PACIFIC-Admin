import { apiClient, API_URL } from './client';
import type {
  UPExpense,
  UPCategory,
  UPCashDay,
  UPAuditRecord,
  UPDashboardData,
  CreateUpExpenseInput,
  UpdateUpExpenseInput,
  CreateUpCategoryInput,
  UpdateUpCategoryInput,
  ReconcileCashInput,
} from '../types/admin';

export const upApi = {
  checkAccess: async () => {
    const res = await apiClient.get<{ success: boolean; data: { hasAccess: boolean; isSuperAdmin: boolean } }>('/up/access');
    return res.data;
  },

  getDashboard: async (range: string = 'month', startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ range });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const res = await apiClient.get<{ success: boolean; data: UPDashboardData }>(`/up/dashboard?${params.toString()}`);
    return res.data;
  },

  getExpenses: async (params: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    paymentMode?: string;
    verified?: string;
    search?: string;
  } = {}) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        sp.set(k, String(v));
      }
    });
    const res = await apiClient.get<{
      success: boolean;
      data: {
        items: UPExpense[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          totalAmount: number;
        };
      };
    }>(`/up/expenses?${sp.toString()}`);
    return res.data;
  },

  getExpenseById: async (id: string) => {
    const res = await apiClient.get<{ success: boolean; data: UPExpense }>(`/up/expenses/${id}`);
    return res.data;
  },

  createExpense: async (data: CreateUpExpenseInput) => {
    const res = await apiClient.post<{ success: boolean; data: UPExpense; message?: string }>('/up/expenses', data);
    return res.data;
  },

  updateExpense: async (id: string, data: UpdateUpExpenseInput) => {
    const res = await apiClient.patch<{ success: boolean; data: UPExpense; message?: string }>(`/up/expenses/${id}`, data);
    return res.data;
  },

  deleteExpense: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/up/expenses/${id}`);
    return res.data;
  },

  verifyExpense: async (id: string, verified?: boolean) => {
    const res = await apiClient.post<{ success: boolean; data: UPExpense; message?: string }>(`/up/expenses/${id}/verify`, { verified });
    return res.data;
  },

  bulkVerifyExpenses: async (ids: string[], verified: boolean = true) => {
    const res = await apiClient.post<{ success: boolean; data: { count: number }; message?: string }>('/up/expenses/bulk-verify', { ids, verified });
    return res.data;
  },

  getExpenseAudit: async (id: string) => {
    const res = await apiClient.get<{ success: boolean; data: UPAuditRecord[] }>(`/up/expenses/${id}/audit`);
    return res.data;
  },

  listCategories: async (includeInactive: boolean = false) => {
    const res = await apiClient.get<{ success: boolean; data: UPCategory[] }>(`/up/categories?includeInactive=${includeInactive}`);
    return res.data;
  },

  createCategory: async (data: CreateUpCategoryInput) => {
    const res = await apiClient.post<{ success: boolean; data: UPCategory; message?: string }>('/up/categories', data);
    return res.data;
  },

  updateCategory: async (id: string, data: UpdateUpCategoryInput) => {
    const res = await apiClient.patch<{ success: boolean; data: UPCategory; message?: string }>(`/up/categories/${id}`, data);
    return res.data;
  },

  getCashStatus: async (dateStr?: string) => {
    const sp = dateStr ? `?date=${encodeURIComponent(dateStr)}` : '';
    const res = await apiClient.get<{ success: boolean; data: UPCashDay }>(`/up/cash/status${sp}`);
    return res.data;
  },

  listCashDays: async (limit: number = 30) => {
    const res = await apiClient.get<{ success: boolean; data: UPCashDay[] }>(`/up/cash?limit=${limit}`);
    return res.data;
  },

  reconcileCash: async (data: ReconcileCashInput) => {
    const res = await apiClient.post<{ success: boolean; data: UPCashDay; message?: string }>('/up/cash/reconcile', data);
    return res.data;
  },

  exportReport: async (params?: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    paymentMode?: string;
    verified?: string;
    search?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          sp.set(k, String(v));
        }
      });
    }

    const token = localStorage.getItem('pacific_access_token');
    const res = await fetch(`${API_URL}/up/reports/export?${sp.toString()}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to export UP daily expenses');
    }

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : `UP_Expenses_Export_${Date.now()}.xlsx`;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
