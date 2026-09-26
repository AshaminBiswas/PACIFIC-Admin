import apiClient from './client';
import type { ApiResponse, PaginatedResponse, PurchaseOrder } from '../types/admin';

export const poApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<PurchaseOrder>>>('/procurement/po', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<PurchaseOrder>>(`/procurement/po/${id}`),
  create: (data: any) => apiClient.post<ApiResponse<PurchaseOrder>>('/procurement/po', data),
  approve: (id: string) => apiClient.post<ApiResponse<PurchaseOrder>>(`/procurement/po/${id}/approve`),
  cancel: (id: string, reason: string) =>
    apiClient.post<ApiResponse<PurchaseOrder>>(`/procurement/po/${id}/cancel`, { reason }),
  delete: (id: string) => apiClient.delete<ApiResponse<{ success: boolean }>>(`/procurement/po/${id}`),
  getPdfUrl: (id: string) => {
    const token = localStorage.getItem('pacific_access_token');
    return `${apiClient.defaults.baseURL}/procurement/po/${id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
};
