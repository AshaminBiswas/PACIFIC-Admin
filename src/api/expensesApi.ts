import { apiClient, API_URL } from './client';
import type {
  ExpenseEntry,
  UpdateExpenseInput,
  ExpenseCategory,
  ExpenseDailyLedger,
  ExpenseFloatTopUp,
  BranchCashBalanceInfo,
  MultiBranchSummaryInfo,
  ExpenseRollupAnalytics,
} from '../types/admin';

const OFFLINE_QUEUE_KEY = 'prc_offline_expense_queue';
const BRANCHES_CACHE_KEY = 'prc_cached_branches';
const CATEGORIES_CACHE_KEY = 'prc_cached_categories';

const DEFAULT_BRANCHES = [
  { id: 'branch-kolkata', name: 'Kolkata Regional Hub & Warehouse', code: 'KOLKATA' },
];

export function getCachedBranches(): { id: string; name: string; code: string }[] {
  try {
    const raw = localStorage.getItem(BRANCHES_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed) && parsed.length > 0) {
      const hasKolkata = parsed.some((b: any) => b.id === 'branch-kolkata' || b.code?.toUpperCase().includes('KOL'));
      return hasKolkata ? parsed : [...DEFAULT_BRANCHES, ...parsed];
    }
    return DEFAULT_BRANCHES;
  } catch {
    return DEFAULT_BRANCHES;
  }
}

export function saveCachedBranches(branches: { id: string; name: string; code: string }[]) {
  try {
    localStorage.setItem(BRANCHES_CACHE_KEY, JSON.stringify(branches));
  } catch {}
}

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: 'b3ef4e2a-791d-4bab-9abe-9729b2e55d20', name: 'Logistics & Cartage', isActive: true },
  { id: '894f0c75-79f0-4cd3-8d5d-1ced38d45979', name: 'Packaging Materials', isActive: true },
  { id: '4152a4f9-b58e-48d1-92f7-626005283c94', name: 'Tea & Refreshments', isActive: true },
  { id: '33a15137-7c4f-4a80-8cff-f0299a41a9ff', name: 'Site Hardware & Supplies', isActive: true },
  { id: '9e676c01-cc44-4c88-98f8-eff388e9d6df', name: 'Tool & Machine Maintenance', isActive: true },
  { id: '04715712-d623-4424-afc1-4594842295ed', name: 'Electricity & Utilities', isActive: true },
  { id: 'eafc3c84-8b0a-4200-a85f-624c9ebc03c3', name: 'Office Supplies & Stationery', isActive: true },
  { id: '0fb1a8c9-9859-4c46-a74c-61367ff665fc', name: 'Staff Local Travel', isActive: true },
  { id: '00a93db8-1ae2-490b-8f48-145808f95738', name: 'Casual Daily Labor', isActive: true },
  { id: '58c8b81e-670e-486f-a566-78920d6028d6', name: 'Miscellaneous Petty Cash', isActive: true },
  { id: '582687b0-23fb-470b-810e-7a774a79cded', name: 'Salaries & Wages', isActive: true },
  { id: '827a4409-dae9-4e5a-b957-4ab83b607f87', name: 'Hotel & Rent', isActive: true },
];

export function getCachedCategories(): ExpenseCategory[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveCachedCategories(categories: ExpenseCategory[]) {
  try {
    localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(categories));
  } catch {}
}

// ─── Offline Queue Engine ────────────────────────────────────────────────────

export interface OfflineQueuedExpense {
  clientTempId: string;
  amount: number;
  amountInPaise?: boolean;
  categoryId: string;
  categoryName?: string;
  subCategory?: string | null;
  paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER';
  description: string;
  paidTo: string;
  paidBy?: string | null;
  receiptAttachment?: string | null;
  branchId: string;
  branchName?: string;
  departmentId?: string | null;
  employeeId?: string | null;
  date?: string;
  time?: string;
  queuedAt: string;
}

export function getOfflineQueue(): OfflineQueuedExpense[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineQueuedExpense[]) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function addToOfflineQueue(item: Omit<OfflineQueuedExpense, 'clientTempId' | 'queuedAt'>): OfflineQueuedExpense {
  const queue = getOfflineQueue();
  const now = new Date();
  const dateStr = item.date || now.toISOString().split('T')[0];
  const timeStr = item.time || now.toTimeString().split(' ')[0];
  const queued: OfflineQueuedExpense = {
    ...item,
    date: dateStr,
    time: timeStr,
    clientTempId: `off_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: now.toISOString(),
  };
  queue.push(queued);
  saveOfflineQueue(queue);
  return queued;
}

export function removeFromOfflineQueue(clientTempId: string) {
  const queue = getOfflineQueue().filter((q) => q.clientTempId !== clientTempId);
  saveOfflineQueue(queue);
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

// ─── Expenses API Client ─────────────────────────────────────────────────────

export const expensesApi = {
  // 0. Branches
  async getBranches(): Promise<{ id: string; name: string; code: string }[]> {
    try {
      const res = await apiClient.get('/branch-ledger/branches');
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const cleanList = list.filter((b: any) => b.id !== 'branch-up' && !String(b.code || '').toUpperCase().includes('DUMMY'));
        const formatted = cleanList.map((b: any) => ({ id: String(b.id), name: String(b.name), code: String(b.code) }));
        const kol = formatted.find((b: any) => b.id === 'branch-kolkata' || b.code?.toUpperCase().includes('KOL')) || DEFAULT_BRANCHES[0];
        const others = formatted.filter((b: any) => b.id !== kol.id);
        const finalList = [kol, ...others];
        saveCachedBranches(finalList);
        return finalList;
      }
    } catch {}
    return getCachedBranches();
  },

  async createBranch(payload: {
    name: string;
    code: string;
    city: string;
    state: string;
    address?: string;
    phone?: string;
    contactPerson?: string;
    openingBalance?: number;
  }): Promise<{ id: string; name: string; code: string }> {
    try {
      const res = await apiClient.post('/branch-ledger/branches', payload);
      const b = res.data?.data || res.data;
      const current = getCachedBranches();
      const newB = {
        id: b.id || `branch-${payload.code.toLowerCase()}`,
        name: b.name || payload.name,
        code: (b.code || payload.code).toUpperCase(),
      };
      const updated = [...current.filter((item) => item.id !== newB.id), newB];
      saveCachedBranches(updated);
      return newB;
    } catch {
      const localId = `branch-${payload.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const newB = { id: localId, name: payload.name, code: payload.code.toUpperCase() };
      const current = getCachedBranches();
      const updated = [...current.filter((item) => item.id !== localId), newB];
      saveCachedBranches(updated);
      return newB;
    }
  },

  // 1. Live Running Balance
  async getLiveBalance(branchId: string): Promise<BranchCashBalanceInfo> {
    const res = await apiClient.get<{ success: boolean; data: BranchCashBalanceInfo }>(`/expenses/live-balance/${branchId}`);
    return res.data.data;
  },

  // 2. Multi-Branch Summary (Super Admin)
  async getMultiBranchSummary(): Promise<MultiBranchSummaryInfo> {
    const res = await apiClient.get<{ success: boolean; data: MultiBranchSummaryInfo }>('/expenses/summary/multi-branch');
    return res.data.data;
  },

  // 3. Paginated Expense List
  async getExpenses(params: Record<string, any> = {}): Promise<{
    entries: ExpenseEntry[];
    nextCursor: string | null;
    hasMore: boolean;
    totalCount: number;
  }> {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        sp.set(k, String(v));
      }
    });

    const res = await apiClient.get<{
      success: boolean;
      data: ExpenseEntry[];
      nextCursor?: string | null;
      hasMore?: boolean;
      totalCount?: number;
    }>(`/expenses?${sp.toString()}`);

    return {
      entries: res.data.data || [],
      nextCursor: res.data.nextCursor ?? null,
      hasMore: res.data.hasMore ?? false,
      totalCount: res.data.totalCount ?? (res.data.data ? res.data.data.length : 0),
    };
  },

  // 4. Create Single Expense (with offline queue fallback)
  async createExpense(data: {
    amount: number;
    amountInPaise?: boolean;
    categoryId: string;
    subCategory?: string | null;
    paymentMode?: 'CASH' | 'UPI' | 'BANK_TRANSFER';
    description: string;
    paidTo: string;
    paidBy?: string | null;
    receiptAttachment?: string | null;
    branchId: string;
    departmentId?: string | null;
    employeeId?: string | null;
    date?: string;
    time?: string;
    clientTempId?: string | null;
  }): Promise<{ expense: ExpenseEntry; budgetWarning?: string | null; isOffline?: boolean }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const queued = addToOfflineQueue(data as any);
      const optimistic: ExpenseEntry = {
        id: queued.clientTempId,
        entryNumber: `OFFLINE-${queued.clientTempId.slice(-4).toUpperCase()}`,
        date: queued.date || new Date().toISOString().split('T')[0],
        time: queued.time || new Date().toTimeString().split(' ')[0],
        amount: Math.round(data.amount * 100),
        categoryId: data.categoryId,
        subCategory: data.subCategory,
        paymentMode: data.paymentMode || 'CASH',
        description: data.description,
        paidTo: data.paidTo,
        paidBy: data.paidBy,
        receiptAttachment: data.receiptAttachment,
        branchId: data.branchId,
        departmentId: data.departmentId,
        employeeId: data.employeeId,
        addedById: 'current-user',
        status: 'PENDING',
        isVoid: false,
        clientTempId: queued.clientTempId,
        createdAt: queued.queuedAt,
        updatedAt: queued.queuedAt,
      };
      return { expense: optimistic, isOffline: true };
    }

    try {
      const res = await apiClient.post<{ success: boolean; data: ExpenseEntry; budgetWarning?: string }>('/expenses', data);
      return { expense: res.data.data, budgetWarning: res.data.budgetWarning };
    } catch (err: any) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        const queued = addToOfflineQueue(data as any);
        const optimistic: ExpenseEntry = {
          id: queued.clientTempId,
          entryNumber: `OFFLINE-${queued.clientTempId.slice(-4).toUpperCase()}`,
          date: queued.date || new Date().toISOString().split('T')[0],
          time: queued.time || new Date().toTimeString().split(' ')[0],
          amount: Math.round(data.amount * 100),
          categoryId: data.categoryId,
          subCategory: data.subCategory,
          paymentMode: data.paymentMode || 'CASH',
          description: data.description,
          paidTo: data.paidTo,
          receiptAttachment: data.receiptAttachment,
          branchId: data.branchId,
          departmentId: data.departmentId,
          employeeId: data.employeeId,
          addedById: 'current-user',
          status: 'PENDING',
          isVoid: false,
          clientTempId: queued.clientTempId,
          createdAt: queued.queuedAt,
          updatedAt: queued.queuedAt,
        };
        return { expense: optimistic, isOffline: true };
      }
      throw err;
    }
  },

  // 5. Batch Sync Offline Queue
  async syncOfflineQueue(): Promise<{
    syncedCount: number;
    duplicateCount: number;
    errorCount: number;
    synced: any[];
  }> {
    const queue = getOfflineQueue();
    if (queue.length === 0) {
      return { syncedCount: 0, duplicateCount: 0, errorCount: 0, synced: [] };
    }

    const payload = queue.map((q) => ({
      amount: q.amount,
      amountInPaise: false,
      categoryId: q.categoryId,
      subCategory: q.subCategory,
      paymentMode: q.paymentMode,
      description: q.description,
      paidTo: q.paidTo,
      receiptAttachment: q.receiptAttachment,
      branchId: q.branchId,
      departmentId: q.departmentId,
      employeeId: q.employeeId,
      date: q.date,
      time: q.time,
      clientTempId: q.clientTempId,
    }));

    const res = await apiClient.post<{
      success: boolean;
      data: { syncedCount: number; duplicateCount: number; errorCount: number; synced: any[] };
    }>('/expenses/batch-sync', { entries: payload });

    clearOfflineQueue();
    return res.data.data;
  },

  // 6. Get Single Expense
  async getExpenseById(id: string): Promise<ExpenseEntry> {
    const res = await apiClient.get<{ success: boolean; data: ExpenseEntry }>(`/expenses/${id}`);
    return res.data.data;
  },

  // 7. Update Expense
  async updateExpense(id: string, data: UpdateExpenseInput): Promise<ExpenseEntry> {
    const res = await apiClient.patch<{ success: boolean; data: ExpenseEntry }>(`/expenses/${id}`, data);
    return res.data.data;
  },

  // 8. Delete Expense (Super Admin only)
  async deleteExpense(id: string, reason: string = 'Super Admin deleted record'): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/expenses/${id}`, { data: { reason } });
    return res.data;
  },

  // 9. Approve Expense
  async approveExpense(id: string, notes?: string): Promise<ExpenseEntry> {
    const res = await apiClient.post<{ success: boolean; data: ExpenseEntry }>(`/expenses/${id}/approve`, { notes });
    return res.data.data;
  },

  // 10. Reject Expense
  async rejectExpense(id: string, rejectionReason: string): Promise<ExpenseEntry> {
    const res = await apiClient.post<{ success: boolean; data: ExpenseEntry }>(`/expenses/${id}/reject`, { rejectionReason });
    return res.data.data;
  },

  // 11. Void Expense
  async voidExpense(id: string, voidReason: string): Promise<ExpenseEntry> {
    const res = await apiClient.post<{ success: boolean; data: ExpenseEntry }>(`/expenses/${id}/void`, { voidReason });
    return res.data.data;
  },

  // 12. Float Top-Up
  async addFloatTopUp(data: {
    branchId: string;
    amount: number;
    amountInPaise?: boolean;
    source: string;
    referenceNo?: string | null;
    notes?: string | null;
    date?: string;
    receiptAttachment?: string | null;
  }): Promise<ExpenseFloatTopUp> {
    const res = await apiClient.post<{ success: boolean; data: ExpenseFloatTopUp }>('/expenses/ledger/float-topup', data);
    return res.data.data;
  },

  // 13. Get Float Top-Ups
  async getFloatTopUps(params: { branchId?: string; startDate?: string; endDate?: string; limit?: number } = {}): Promise<ExpenseFloatTopUp[]> {
    const sp = new URLSearchParams();
    if (params.branchId) sp.set('branchId', params.branchId);
    if (params.startDate) sp.set('startDate', params.startDate);
    if (params.endDate) sp.set('endDate', params.endDate);
    if (params.limit) sp.set('limit', String(params.limit));
    const res = await apiClient.get<{ success: boolean; data: ExpenseFloatTopUp[] }>(`/expenses/ledger/float-topup?${sp.toString()}`);
    return res.data.data || [];
  },

  // 14. Delete Float Top-Up (Super Admin only)
  async deleteFloatTopUp(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/expenses/ledger/float-topup/${id}`);
    return res.data;
  },

  // 15. Daily Reconciliation
  async reconcileDaily(data: {
    branchId: string;
    date: string;
    physicalCashCounted: number;
    amountInPaise?: boolean;
    notes?: string | null;
    reconciliationNotes?: string | null;
  }): Promise<ExpenseDailyLedger> {
    const payload = {
      ...data,
      notes: data.notes || data.reconciliationNotes || null,
    };
    const res = await apiClient.post<{ success: boolean; data: ExpenseDailyLedger }>('/expenses/ledger/reconcile', payload);
    return res.data.data;
  },

  // 16. Categories CRUD
  async getCategories(
    branchOrParams?: string | { branchId?: string; month?: number; year?: number },
    month?: number,
    year?: number
  ): Promise<ExpenseCategory[]> {
    const sp = new URLSearchParams();
    if (typeof branchOrParams === 'object' && branchOrParams !== null) {
      if (branchOrParams.branchId) sp.set('branchId', branchOrParams.branchId);
      if (branchOrParams.month) sp.set('month', String(branchOrParams.month));
      if (branchOrParams.year) sp.set('year', String(branchOrParams.year));
    } else {
      if (branchOrParams) sp.set('branchId', branchOrParams);
      if (month) sp.set('month', String(month));
      if (year) sp.set('year', String(year));
    }
    const res = await apiClient.get<{ success: boolean; data: ExpenseCategory[] }>(`/expenses/categories?${sp.toString()}`);
    return res.data.data || [];
  },

  async createCategory(data: { name: string; description?: string | null; monthlyBudgetLimit?: number | null }): Promise<ExpenseCategory> {
    const res = await apiClient.post<{ success: boolean; data: ExpenseCategory }>('/expenses/categories', data);
    return res.data.data;
  },

  async updateCategory(
    id: string,
    data: { name?: string; description?: string | null; monthlyBudgetLimit?: number | null; isActive?: boolean }
  ): Promise<ExpenseCategory> {
    const res = await apiClient.patch<{ success: boolean; data: ExpenseCategory }>(`/expenses/categories/${id}`, data);
    return res.data.data;
  },

  async deleteCategory(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/expenses/categories/${id}`);
    return res.data;
  },

  // 17. Analytics
  async getAnalytics(params: { branchId?: string; year?: number; month?: number; period?: string } = {}): Promise<ExpenseRollupAnalytics> {
    const sp = new URLSearchParams();
    if (params.branchId) sp.set('branchId', params.branchId);
    if (params.year) sp.set('year', String(params.year));
    if (params.month) sp.set('month', String(params.month));
    if (params.period) sp.set('period', params.period);
    const res = await apiClient.get<{ success: boolean; data: ExpenseRollupAnalytics }>(`/expenses/reports/analytics?${sp.toString()}`);
    return res.data.data;
  },

  // 18. Download Multi-Sheet Excel Report (.xlsx) from Server
  async downloadExcelReport(query: {
    period: 'day' | 'week' | 'month' | 'year';
    branchId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
  }): Promise<void> {
    const sp = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        sp.set(k, String(v));
      }
    });

    const res = await apiClient.get(`/expenses/reports/export?${sp.toString()}`, {
      responseType: 'blob',
    });

    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const disposition = res.headers['content-disposition'] || '';
    const match = String(disposition).match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : `Expenses_Report_${query.period}_${Date.now()}.xlsx`;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // 19. Upload Receipt File
  async uploadReceipt(file: File): Promise<{ url: string; fileName: string; size: number }> {
    const formData = new FormData();
    formData.append('receipt', file);
    const res = await apiClient.post<{ success: boolean; data: { url: string; fileName: string; size: number } }>(
      '/expenses/upload-receipt',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return res.data.data;
  },
};
