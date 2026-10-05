import type { AxiosResponse } from 'axios';
import apiClient from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  BoardInventoryItem,
  BoardStockMovement,
  BoardSupplier,
  BoardAnalyticsSummary,
  InwardStockInput,
  ManualIssueInput,
  AutoDeductInput,
  CreateBoardItemInput,
  UpdateBoardItemInput,
} from '../types/admin';

export const SUPPLIERS_CACHE_KEY = 'pacific_inventory_suppliers_cache_v1';
export const SUPPLIERS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours TTL

interface CachedSuppliersEnvelope {
  timestamp: number;
  data: BoardSupplier[];
}

let memorySuppliersCache: CachedSuppliersEnvelope | null = null;

/**
 * Synchronously retrieves cached suppliers from memory (L1) or localStorage (L2).
 * Returns null if cache is empty or expired.
 */
export function getCachedSuppliersSync(): BoardSupplier[] | null {
  const now = Date.now();
  // 1. In-memory check
  if (memorySuppliersCache && now - memorySuppliersCache.timestamp < SUPPLIERS_CACHE_TTL_MS) {
    return memorySuppliersCache.data;
  }

  // 2. localStorage check
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(SUPPLIERS_CACHE_KEY) : null;
    if (raw) {
      const parsed: CachedSuppliersEnvelope = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.data) && now - parsed.timestamp < SUPPLIERS_CACHE_TTL_MS) {
        memorySuppliersCache = parsed;
        return parsed.data;
      }
    }
  } catch (err) {
    console.warn('[boardInventoryApi] Failed to read cached suppliers from localStorage:', err);
  }
  return null;
}

/**
 * Saves suppliers to both in-memory cache and localStorage with current timestamp.
 */
export function setCachedSuppliersSync(suppliers: BoardSupplier[]): void {
  const envelope: CachedSuppliersEnvelope = {
    timestamp: Date.now(),
    data: suppliers,
  };
  memorySuppliersCache = envelope;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SUPPLIERS_CACHE_KEY, JSON.stringify(envelope));
    }
  } catch (err) {
    console.warn('[boardInventoryApi] Failed to write suppliers to localStorage cache:', err);
  }
}

/**
 * Clears the supplier cache from memory and localStorage.
 * Call this whenever a vendor/supplier is created, updated, or removed.
 */
export function clearSupplierCache(): void {
  memorySuppliersCache = null;
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SUPPLIERS_CACHE_KEY);
    }
  } catch (err) {
    console.warn('[boardInventoryApi] Failed to clear supplier cache from localStorage:', err);
  }
}

export const boardInventoryApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<BoardInventoryItem>>>('/inventory/boards', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<BoardInventoryItem>>(`/inventory/boards/${id}`),

  create: (data: CreateBoardItemInput) =>
    apiClient.post<ApiResponse<BoardInventoryItem>>('/inventory/boards', data),

  update: (id: string, data: UpdateBoardItemInput) =>
    apiClient.put<ApiResponse<BoardInventoryItem>>(`/inventory/boards/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ success: boolean }>>(`/inventory/boards/${id}`),

  inward: (data: InwardStockInput) =>
    apiClient.post<ApiResponse<{ item: BoardInventoryItem; movement: BoardStockMovement }>>('/inventory/boards/inward', data),

  issue: (data: ManualIssueInput) =>
    apiClient.post<ApiResponse<{ item: BoardInventoryItem; movement: BoardStockMovement }>>('/inventory/boards/issue', data),

  autoDeduct: (data: AutoDeductInput) =>
    apiClient.post<ApiResponse<{ success: boolean; deductions: Array<{ itemCode: string; designNo: string; deductedQty: number; movementId: string }>; totalDeducted: number }>>('/inventory/boards/auto-deduct', data),

  adjustMovement: (movementId: string, data: { newQuantity: number; reason?: string }) =>
    apiClient.put<ApiResponse<BoardStockMovement>>(`/inventory/boards/movements/${movementId}/adjust`, data),

  /**
   * Fetches approved suppliers with intelligent client-side localStorage caching.
   * If forceRefresh is false, returns cached suppliers immediately if present.
   * If forceRefresh is true or cache is missing, requests database once and caches the result.
   */
  listSuppliers: async (forceRefresh = false): Promise<AxiosResponse<ApiResponse<BoardSupplier[]>>> => {
    if (!forceRefresh) {
      const cached = getCachedSuppliersSync();
      if (cached && cached.length > 0) {
        return {
          data: {
            success: true,
            data: cached,
          },
          status: 200,
          statusText: 'OK (Cached)',
          headers: {},
          config: {} as any,
        };
      }
    }

    const response = await apiClient.get<ApiResponse<BoardSupplier[]>>('/inventory/boards/suppliers');
    if (response.data?.data && Array.isArray(response.data.data)) {
      setCachedSuppliersSync(response.data.data);
    }
    return response;
  },

  getCachedSuppliersSync,
  setCachedSuppliersSync,
  clearSupplierCache,

  getMovements: (params?: {
    inventoryItemId?: string;
    movementType?: string;
    timeframe?: 'day' | 'week' | 'month' | 'year' | 'custom';
    startDate?: string;
    endDate?: string;
    warehouse?: string;
    limit?: number;
  }) =>
    apiClient.get<ApiResponse<BoardStockMovement[]>>('/inventory/boards/movements', { params }),

  getAnalytics: (params?: {
    timeframe?: 'day' | 'week' | 'month' | 'year' | 'custom';
    startDate?: string;
    endDate?: string;
    warehouse?: string;
    category?: string;
  }) =>
    apiClient.get<ApiResponse<BoardAnalyticsSummary>>('/inventory/boards/analytics', { params }),
};

