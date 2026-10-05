import apiClient from './client';
import type { ApiResponse, PaginatedResponse, BusinessParty, Customer360Data } from '../types/admin';
import { clearSupplierCache } from './boardInventoryApi';

export const crmApi = {
  listCustomers: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<BusinessParty>>>('/crm', { params }),
  getCustomerById: (id: string) => apiClient.get<ApiResponse<BusinessParty>>(`/crm/${id}`),
  getCustomer: (id: string) => apiClient.get<ApiResponse<BusinessParty>>(`/crm/${id}`),
  getCustomer360: (id: string) => apiClient.get<ApiResponse<Customer360Data>>(`/crm/${id}/360`),
  createCustomer: (data: any) => apiClient.post<ApiResponse<BusinessParty>>('/crm', data),
  updateCustomer: (id: string, data: any) => apiClient.patch<ApiResponse<BusinessParty>>(`/crm/${id}`, data),
  deleteCustomer: (id: string) => apiClient.delete(`/crm/${id}`),
  addContact: (id: string, data: any) => apiClient.post(`/crm/${id}/contacts`, data),
  addAddress: (id: string, data: any) => apiClient.post(`/crm/${id}/addresses`, data),
  checkDuplicates: (data: { legalName?: string; phone?: string; gstin?: string; excludeId?: string }) =>
    apiClient.post<ApiResponse<BusinessParty[]>>('/crm/check-duplicates', data),
  mergeCustomers: (canonicalCustomerId: string, mergedCustomerId: string, reason?: string) =>
    apiClient.post<ApiResponse<any>>('/crm/merge', { canonicalCustomerId, mergedCustomerId, reason }),
};

export const vendorsApi = {
  listVendors: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<BusinessParty>>>('/vendors', { params }),
  getVendorById: (id: string) => apiClient.get<ApiResponse<BusinessParty>>(`/vendors/${id}`),
  createVendor: async (data: any) => {
    clearSupplierCache();
    return apiClient.post<ApiResponse<BusinessParty>>('/vendors', data);
  },
  updateVendor: async (id: string, data: any) => {
    clearSupplierCache();
    return apiClient.patch<ApiResponse<BusinessParty>>(`/vendors/${id}`, data);
  },
  deleteVendor: async (id: string) => {
    clearSupplierCache();
    return apiClient.delete(`/vendors/${id}`);
  },
};

