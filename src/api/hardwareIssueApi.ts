import apiClient from './client';
import type { ApiResponse, PaginatedResponse, HardwareCatalogItem, HardwareIssueList } from '../types/admin';

export const hardwareIssueApi = {
  listCatalog: (category?: string) =>
    apiClient.get<ApiResponse<HardwareCatalogItem[]>>('/warehouse/hardware-catalog', { params: { category } }),
  createCatalogItem: (data: any) => apiClient.post<ApiResponse<HardwareCatalogItem>>('/warehouse/hardware-catalog', data),
  updateCatalogItem: (id: string, data: any) =>
    apiClient.patch<ApiResponse<HardwareCatalogItem>>(`/warehouse/hardware-catalog/${id}`, data),
  listIssues: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<HardwareIssueList>>>('/warehouse/hardware-issues', { params }),
  getIssueById: (id: string) => apiClient.get<ApiResponse<HardwareIssueList>>(`/warehouse/hardware-issues/${id}`),
  createIssue: (data: any) => apiClient.post<ApiResponse<HardwareIssueList>>('/warehouse/hardware-issues', data),
  updateIssue: (id: string, data: any) => apiClient.patch<ApiResponse<HardwareIssueList>>(`/warehouse/hardware-issues/${id}`, data),
  deleteIssue: (id: string) => apiClient.delete<ApiResponse<{ success: boolean }>>(`/warehouse/hardware-issues/${id}`),
  signStep: (id: string, role: string, name: string) =>
    apiClient.post<ApiResponse<HardwareIssueList>>(`/warehouse/hardware-issues/${id}/sign`, { role, name }),
  getPdfUrl: (id: string) => {
    const token = localStorage.getItem('pacific_access_token');
    return `${apiClient.defaults.baseURL}/warehouse/hardware-issues/${id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
};
