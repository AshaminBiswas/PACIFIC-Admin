import apiClient from './client';
import type { ApiResponse, PaginatedResponse, Invoice } from '../types/admin';

export const invoicesApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<Invoice>>>('/invoices', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<Invoice>>(`/invoices/${id}`),
  create: (data: any) => apiClient.post<ApiResponse<Invoice>>('/invoices', data),
  createFromOrder: (orderId: string) =>
    apiClient.post<ApiResponse<Invoice>>(`/invoices/from-order/${orderId}`),
  update: (id: string, data: any) => apiClient.patch<ApiResponse<Invoice>>(`/invoices/${id}`, data),
  delete: (id: string) => apiClient.delete<ApiResponse<{ success: boolean }>>(`/invoices/${id}`),
  getPdfUrl: (id: string) => {
    const token = localStorage.getItem('pacific_access_token');
    return `${apiClient.defaults.baseURL}/invoices/${id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
};
