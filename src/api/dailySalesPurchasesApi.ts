/**
 * Pacific Restroom Cubicle Enterprise ERP — Daily Sales & Purchase API
 * Manual daily sales & purchase records with Customer / Vendor selection,
 * completely delinked from PI data.
 */

import { apiClient } from './client';
import {
  DailySalesPurchaseItem,
  CreateDailySalesPurchasePayload,
  DailySalesPurchaseSummaryResponse,
  DailySalesPurchaseListResponse,
} from '../types/admin';

export interface DailySalesPurchaseFilterParams {
  startDate?: string;
  endDate?: string;
  date?: string;
  type?: 'ALL' | 'SALES' | 'PURCHASE';
  customerId?: string;
  vendorId?: string;
  category?: string;
  paymentStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
  companyProfileId?: string;
}

export const dailySalesPurchasesApi = {
  /**
   * List entries with filters, search, and pagination.
   */
  async list(params?: DailySalesPurchaseFilterParams): Promise<DailySalesPurchaseListResponse> {
    const res = await apiClient.get('/daily-sales-purchases', { params });
    return res.data?.data || res.data;
  },

  /**
   * Get summary statistics and daily/category breakdowns.
   */
  async getSummary(params?: {
    startDate?: string;
    endDate?: string;
    date?: string;
    companyProfileId?: string;
  }): Promise<DailySalesPurchaseSummaryResponse> {
    const res = await apiClient.get('/daily-sales-purchases/summary', { params });
    return res.data?.data || res.data;
  },

  /**
   * Get single daily entry by ID.
   */
  async getById(id: string): Promise<DailySalesPurchaseItem> {
    const res = await apiClient.get(`/daily-sales-purchases/${id}`);
    return res.data?.data || res.data;
  },

  /**
   * Create a new manual Daily Sales or Purchase entry.
   * If type === 'SALES', customerId selects a Customer.
   * If type === 'PURCHASE', vendorId selects a Vendor.
   */
  async create(payload: CreateDailySalesPurchasePayload): Promise<DailySalesPurchaseItem> {
    const res = await apiClient.post('/daily-sales-purchases', payload);
    return res.data?.data || res.data;
  },

  /**
   * Update an existing daily entry.
   */
  async update(id: string, payload: Partial<CreateDailySalesPurchasePayload>): Promise<DailySalesPurchaseItem> {
    const res = await apiClient.put(`/daily-sales-purchases/${id}`, payload);
    return res.data?.data || res.data;
  },

  /**
   * Delete an entry.
   */
  async delete(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete(`/daily-sales-purchases/${id}`);
    return res.data;
  },

  /**
   * Get printable / download PDF URL with query parameters.
   */
  getPdfUrl(params?: { startDate?: string; endDate?: string; date?: string; dl?: number }): string {
    const baseURL = (apiClient.defaults.baseURL || '/api/v1').replace(/\/$/, '');
    const qs = new URLSearchParams();
    if (params?.startDate) qs.set('startDate', params.startDate);
    if (params?.endDate) qs.set('endDate', params.endDate);
    if (params?.date) qs.set('date', params.date);
    if (params?.dl) qs.set('dl', String(params.dl));
    const token = localStorage.getItem('pacific_access_token') || localStorage.getItem('token');
    if (token) qs.set('token', token);
    return `${baseURL}/daily-sales-purchases/pdf?${qs.toString()}`;
  },

  /**
   * Download binary PDF report directly as Blob with auto-authorization.
   */
  async downloadPdfBlob(params?: { startDate?: string; endDate?: string; date?: string }): Promise<Blob> {
    const res = await apiClient.get('/daily-sales-purchases/pdf', {
      params: { ...params, dl: 1 },
      responseType: 'blob',
    });
    return res.data;
  },

  /**
   * Fetch printable HTML document with embedded SVG charts and colored tables.
   */
  async getPdfHtml(params?: { startDate?: string; endDate?: string; date?: string }): Promise<string> {
    const res = await apiClient.get('/daily-sales-purchases/pdf', {
      params,
      responseType: 'text',
    });
    return res.data;
  },
};
