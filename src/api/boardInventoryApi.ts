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

  listSuppliers: () =>
    apiClient.get<ApiResponse<BoardSupplier[]>>('/inventory/boards/suppliers'),

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
