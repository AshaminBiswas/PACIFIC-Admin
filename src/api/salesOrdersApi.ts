import apiClient from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  SalesOrder,
  OrderDocumentTimelineItem,
  SalesOrderFollowup,
} from '../types/admin';

export const salesOrdersApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<SalesOrder>>>('/sales/orders', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<SalesOrder>>(`/sales/orders/${id}`),
  createDirect: (data: any) => apiClient.post<ApiResponse<SalesOrder>>('/sales/orders', data),
  update: (id: string, data: any) => apiClient.patch<ApiResponse<SalesOrder>>(`/sales/orders/${id}`, data),
  delete: (id: string) => apiClient.delete<ApiResponse<{ success: boolean }>>(`/sales/orders/${id}`),
  approve: (id: string) => apiClient.post<ApiResponse<SalesOrder>>(`/sales/orders/${id}/approve`),
  updateStatus: (id: string, status: string, reason?: string) =>
    apiClient.patch<ApiResponse<SalesOrder>>(`/sales/orders/${id}/status`, { status, reason }),
  cancel: (id: string, reason: string) =>
    apiClient.post<ApiResponse<SalesOrder>>(`/sales/orders/${id}/cancel`, { reason }),
  getTimeline: (id: string) => apiClient.get<ApiResponse<OrderDocumentTimelineItem[]>>(`/sales/orders/${id}/timeline`),
  getFollowups: (orderId: string) =>
    apiClient.get<ApiResponse<{ followups: SalesOrderFollowup[] }>>(`/sales/orders/${orderId}/follow-ups`),
  createFollowup: (orderId: string, data: any) =>
    apiClient.post<ApiResponse<{ followup: SalesOrderFollowup; order: SalesOrder }>>(
      `/sales/orders/${orderId}/follow-ups`,
      data
    ),
  sendFollowupEmail: (orderId: string, data: any) =>
    apiClient.post<ApiResponse<{ message: string; order: SalesOrder }>>(
      `/sales/orders/${orderId}/send-followup-email`,
      data
    ),
  globalSearch: (query: string) => apiClient.get<ApiResponse<any>>('/sales/orders/search', { params: { q: query } }),
  getOrderPdfUrl: (id: string) => {
    const token = localStorage.getItem('pacific_access_token');
    return `${apiClient.defaults.baseURL}/sales/orders/${id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
  recordDispatch: (orderId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/sales/orders/${orderId}/dispatch`, data),
  getDispatchPdfUrl: (orderId: string, dispatchId: string) => {
    const token = localStorage.getItem('pacific_access_token');
    return `${apiClient.defaults.baseURL}/sales/orders/${orderId}/dispatch/${dispatchId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
  createInvoiceFromOrder: (orderId: string) =>
    apiClient.post<ApiResponse<any>>(`/invoices/from-order/${orderId}`),
  getInvoicePdfUrl: (invoiceId: string) => {
    const token = localStorage.getItem('pacific_access_token');
    return `${apiClient.defaults.baseURL}/invoices/${invoiceId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
  deleteDispatch: (orderId: string, dispatchId: string) =>
    apiClient.delete<ApiResponse<{ success: boolean }>>(`/sales/orders/${orderId}/dispatch/${dispatchId}`),
};

