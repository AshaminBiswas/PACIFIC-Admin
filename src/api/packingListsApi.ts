import apiClient from './client';
import type { ApiResponse, PaginatedResponse, PackingList } from '../types/admin';

export const packingListsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<PackingList>>>('/logistics/packing-lists', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<PackingList>>(`/logistics/packing-lists/${id}`),
  create: (data: any) => apiClient.post<ApiResponse<PackingList>>('/logistics/packing-lists', data),
  update: (id: string, data: any) => apiClient.patch<ApiResponse<PackingList>>(`/logistics/packing-lists/${id}`, data),
  delete: (id: string) => apiClient.delete<ApiResponse<{ success: boolean }>>(`/logistics/packing-lists/${id}`),
  acknowledge: (id: string, data: any) =>
    apiClient.post<ApiResponse<PackingList>>(`/logistics/packing-lists/${id}/acknowledge`, data),
  listPacketTypes: () => apiClient.get<ApiResponse<any[]>>('/logistics/packing-lists/packet-types'),
  addPacketType: (name: string) => apiClient.post<ApiResponse<any>>('/logistics/packing-lists/packet-types', { name }),
  getPdfUrl: (id: string) => {
    const token = localStorage.getItem('pacific_access_token');
    return `${apiClient.defaults.baseURL}/logistics/packing-lists/${id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
};

export const publicAckApi = {
  getByToken: (token: string) => apiClient.get<ApiResponse<PackingList>>(`/acknowledge-receipt/${token}`),
  acknowledgeByToken: (token: string, data: { receivedByName: string; receivedByPhone: string; signatureData?: string }) =>
    apiClient.post<ApiResponse<PackingList>>(`/acknowledge-receipt/${token}`, data),
};
