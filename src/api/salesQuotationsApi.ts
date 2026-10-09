import apiClient from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  SalesQuotation,
  SalesOrder,
  QuotationContentTemplate,
  QuotationFollowup,
  QuotationFollowupChannel,
  QuotationFollowupStatus,
} from '../types/admin';

export const salesQuotationsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<SalesQuotation>>>('/sales/quotations', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<SalesQuotation>>(`/sales/quotations/${id}`),
  create: (data: any) => apiClient.post<ApiResponse<SalesQuotation>>('/sales/quotations', data),
  update: (id: string, data: any) => apiClient.patch<ApiResponse<SalesQuotation>>(`/sales/quotations/${id}`, data),
  delete: (id: string) => apiClient.delete<ApiResponse<{ success: boolean }>>(`/sales/quotations/${id}`),
  revise: (id: string, data: any) => apiClient.post<ApiResponse<SalesQuotation>>(`/sales/quotations/${id}/revise`, data),
  send: (id: string) => apiClient.post<ApiResponse<SalesQuotation>>(`/sales/quotations/${id}/send`),
  sendEmail: (id: string, data?: { recipientEmail?: string; subject?: string; message?: string; customNotes?: string }) =>
    apiClient.post<ApiResponse<{ success: boolean; message: string; emailId?: string }>>(`/sales/quotations/${id}/send-email`, data),
  getFollowups: (id: string) =>
    apiClient.get<ApiResponse<{ quotation: SalesQuotation; followups: QuotationFollowup[] }>>(`/sales/quotations/${id}/follow-ups`),
  createFollowup: (id: string, data: {
    channel?: QuotationFollowupChannel;
    status: QuotationFollowupStatus;
    discussionNotes: string;
    nextFollowupDate?: string | null;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
    performedByName?: string;
  }) =>
    apiClient.post<ApiResponse<{ followup: QuotationFollowup; quotation: SalesQuotation }>>(`/sales/quotations/${id}/follow-ups`, data),
  updateFollowupStatus: (id: string, data: {
    followupStatus: QuotationFollowupStatus | string;
    nextFollowupDate?: string | null;
    notes?: string;
    channel?: QuotationFollowupChannel | string;
  }) =>
    apiClient.patch<ApiResponse<{ followup: QuotationFollowup; quotation: SalesQuotation }>>(`/sales/quotations/${id}/follow-up-status`, data),
  sendFollowupEmail: (id: string, data: {
    recipientEmail?: string;
    subject?: string;
    message?: string;
    nextFollowupDate?: string;
    notes?: string;
  }) =>
    apiClient.post<ApiResponse<{ success: boolean; message: string; followup: QuotationFollowup; quotation: SalesQuotation }>>(`/sales/quotations/${id}/send-followup-email`, data),
  convertToPI: (id: string) => apiClient.post<ApiResponse<any>>(`/sales/quotations/${id}/convert-to-pi`),
  convertToOrder: (id: string) => apiClient.post<ApiResponse<SalesOrder>>(`/sales/quotations/${id}/convert-to-order`),
  listTemplates: (category?: string) =>
    apiClient.get<ApiResponse<QuotationContentTemplate[]>>('/sales/quotations/templates', { params: { category } }),
  saveTemplate: (data: any) => apiClient.post<ApiResponse<QuotationContentTemplate>>('/sales/quotations/templates', data),
  getPdfUrl: (id?: string) => {
    return `${apiClient.defaults.baseURL}/sales/quotations/${id || ''}/pdf`;
  },
  getDownloadPdfUrl: (id?: string) => {
    return `${apiClient.defaults.baseURL}/sales/quotations/${id || ''}/pdf?download=true`;
  },
  getShortUrl: (idOrCode?: string, download = false) => {
    const clean = (idOrCode || '').trim();
    const shortCode = clean.length === 36 && clean.includes('-') ? clean.slice(0, 8) : clean;
    const base = apiClient.defaults.baseURL?.replace(/\/api\/v1\/?$/, '') || 'https://pacific-backend-psuw.onrender.com';
    return `${base}/q/${shortCode}${download ? '?dl=1' : ''}`;
  },
};
