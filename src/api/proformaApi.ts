import apiClient from './client';
import type { ApiResponse, PaginatedResponse, ProformaInvoice, DocumentRevision } from '../types/admin';

export const piApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<ProformaInvoice>>>('/sales/pi', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<ProformaInvoice>>(`/sales/pi/${id}`),
  create: (data: any) => apiClient.post<ApiResponse<ProformaInvoice>>('/sales/pi', data, { timeout: 60000 }),
  update: (id: string, data: any) => apiClient.patch<ApiResponse<ProformaInvoice>>(`/sales/pi/${id}`, data, { timeout: 60000 }),
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
  getRevisions: (id: string) =>
    apiClient.get<ApiResponse<DocumentRevision[]>>(`/sales/pi/${id}/revisions`),
  getRevision: (id: string, rev: number) =>
    apiClient.get<ApiResponse<any>>(`/sales/pi/${id}/revisions/${rev}`),
  getRevisionPdfUrl: (id: string, rev: number, download = false) => {
    let token = localStorage.getItem('pacific_access_token');
    if (!token) {
      try {
        let supaToken = localStorage.getItem('sb-bcbswbzbtskvmdqmgrjm-auth-token');
        if (!supaToken) {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
              supaToken = localStorage.getItem(k);
              break;
            }
          }
        }
        if (supaToken) {
          const parsed = JSON.parse(supaToken);
          token = parsed?.access_token || null;
        }
      } catch {}
    }
    const baseURL = (apiClient.defaults.baseURL || '/api/v1').replace(/\/$/, '');
    const authQuery = token ? `&token=${encodeURIComponent(token)}` : '';
    return `${baseURL}/sales/pi/${id}/revisions/${rev}/pdf?download=${download ? 'true' : 'false'}${authQuery}`;
  },
  getPdfUrl: (id: string, download = false) => {
    let token = localStorage.getItem('pacific_access_token');
    if (!token) {
      try {
        let supaToken = localStorage.getItem('sb-bcbswbzbtskvmdqmgrjm-auth-token');
        if (!supaToken) {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
              supaToken = localStorage.getItem(k);
              break;
            }
          }
        }
        if (supaToken) {
          const parsed = JSON.parse(supaToken);
          token = parsed?.access_token || null;
        }
      } catch {}
    }
    const baseURL = (apiClient.defaults.baseURL || '/api/v1').replace(/\/$/, '');
    const qs = new URLSearchParams();
    if (download) {
      qs.set('download', 'true');
      qs.set('dl', '1');
      qs.set('format', 'pdf');
    }
    if (token) qs.set('token', token);
    const qStr = qs.toString();
    return `${baseURL}/sales/pi/${id}/pdf${qStr ? `?${qStr}` : ''}`;
  },
  getPdfHtml: async (id: string): Promise<string> => {
    const res = await apiClient.get<string>(`/sales/pi/${id}/pdf`, {
      responseType: 'text',
    });
    return res.data;
  },
  downloadPdfBlob: async (id: string): Promise<Blob> => {
    const res = await apiClient.get(`/sales/pi/${id}/pdf`, {
      params: { download: 'true', dl: '1', format: 'pdf' },
      responseType: 'blob',
    });
    return res.data;
  },
};
