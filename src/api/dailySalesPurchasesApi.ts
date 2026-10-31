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
};
