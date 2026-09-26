import apiClient from './client';
import type { ApiResponse, PaginatedResponse, ProformaInvoice } from '../types/admin';

export const piApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<ProformaInvoice>>>('/sales/pi', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<ProformaInvoice>>(`/sales/pi/${id}`),
  create: (data: any) => apiClient.post<ApiResponse<ProformaInvoice>>('/sales/pi', data),
  update: (id: string, data: any) => apiClient.patch<ApiResponse<ProformaInvoice>>(`/sales/pi/${id}`, data),
  delete: (id: string) => apiClient.delete<ApiResponse<{ success: boolean }>>(`/sales/pi/${id}`),
  issue: (id: string) => apiClient.post<ApiResponse<ProformaInvoice>>(`/sales/pi/${id}/issue`),
  duplicate: (id: string) => apiClient.post<ApiResponse<ProformaInvoice>>(`/sales/pi/${id}/duplicate`),
  cancel: (id: string, reason: string) =>
    apiClient.post<ApiResponse<ProformaInvoice>>(`/sales/pi/${id}/cancel`, { reason }),
  recordAdvancePayment: (id: string, data: {
    amount: number;
    paymentDate?: string;
    paymentMode?: string;
    referenceNumber?: string;
    notes?: string;
  }) => apiClient.post<ApiResponse<ProformaInvoice>>(`/sales/pi/${id}/advance-payment`, data),
  convertToOrder: (id: string) => apiClient.post<ApiResponse<any>>(`/sales/pi/${id}/convert-to-order`),
  getFollowups: (id: string) => apiClient.get<ApiResponse<any[]>>(`/sales/pi/${id}/followups`),
  addFollowup: (id: string, data: {
    communicationChannel: string;
    followupStatus: string;
    discussionNotes: string;
    promisedPaymentDate?: string;
    promisedAmount?: number;
    nextFollowupDate?: string;
    priority?: string;
  }) => apiClient.post<ApiResponse<any>>(`/sales/pi/${id}/followups`, data),
  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient.patch<ApiResponse<ProformaInvoice>>(`/sales/pi/${id}`, { status, notes }),
  getPdfUrl: (id: string) => {
    const token = localStorage.getItem('pacific_access_token');
    return `${apiClient.defaults.baseURL}/sales/pi/${id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
};
