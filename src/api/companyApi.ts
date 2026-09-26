import apiClient from './client';
import type { ApiResponse, CompanyProfile, DashboardStats } from '../types/admin';

export const companiesApi = {
  list: () => apiClient.get<ApiResponse<CompanyProfile[]>>('/companies'),
  getById: (id: string) => apiClient.get<ApiResponse<CompanyProfile>>(`/companies/${id}`),
  create: (data: Partial<CompanyProfile>) => apiClient.post<ApiResponse<CompanyProfile>>('/companies', data),
  update: (id: string, data: Partial<CompanyProfile>) =>
    apiClient.patch<ApiResponse<CompanyProfile>>(`/companies/${id}`, data),
  addAddress: (id: string, data: any) => apiClient.post(`/companies/${id}/addresses`, data),
  addBankAccount: (id: string, data: any) => apiClient.post(`/companies/${id}/bank-accounts`, data),
  addSignatory: (id: string, data: any) => apiClient.post(`/companies/${id}/signatories`, data),
  addTerm: (id: string, data: any) => apiClient.post(`/companies/${id}/terms`, data),
};

export const dashboardApi = {
  getStats: () => apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats'),
};
