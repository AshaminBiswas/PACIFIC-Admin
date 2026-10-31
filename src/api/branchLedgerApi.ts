/**
 * Pacific Restroom Cubicle Enterprise ERP — Branch Debit & Credit Ledger API
 * Dynamic Branch Management & Accounting Ledger with PDF Reporting
 */

import { apiClient } from './client';
import {
  BranchItem,
  CreateBranchPayload,
  BranchTransactionItem,
  CreateBranchTransactionPayload,
  BranchLedgerSummaryResponse,
  BranchTransactionListResponse,
} from '../types/admin';

export interface BranchLedgerFilterParams {
  branchId?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  type?: 'ALL' | 'CREDIT' | 'DEBIT';
  category?: string;
  paymentMode?: string;
  paymentStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
  companyProfileId?: string;
}

export const branchLedgerApi = {
  /**
   * Get list of all branches with live financial statistics.
   */
  async getBranches(params?: { isActive?: boolean; companyProfileId?: string }): Promise<BranchItem[]> {
    const res = await apiClient.get('/branch-ledger/branches', { params });
    return res.data?.data || res.data || [];
  },

  /**
   * Get single branch with live balance.
   */
  async getBranchById(id: string): Promise<BranchItem> {
    const res = await apiClient.get(`/branch-ledger/branches/${id}`);
    return res.data?.data || res.data;
  },

  /**
   * Create a new branch dynamically.
   */
  async createBranch(payload: CreateBranchPayload): Promise<BranchItem> {
    const res = await apiClient.post('/branch-ledger/branches', payload);
    return res.data?.data || res.data;
  },

  /**
   * Update branch metadata or opening balance.
   */
  async updateBranch(id: string, payload: Partial<CreateBranchPayload>): Promise<BranchItem> {
    const res = await apiClient.put(`/branch-ledger/branches/${id}`, payload);
    return res.data?.data || res.data;
  },

  /**
   * List branch transactions with filtering, search, and pagination.
   */
  async getTransactions(params?: BranchLedgerFilterParams): Promise<BranchTransactionListResponse> {
    const res = await apiClient.get('/branch-ledger/transactions', { params });
    return res.data?.data || res.data;
  },

  /**
   * Get single transaction by ID.
   */
  async getTransactionById(id: string): Promise<BranchTransactionItem> {
    const res = await apiClient.get(`/branch-ledger/transactions/${id}`);
    return res.data?.data || res.data;
  },

  /**
   * Record a new Debit or Credit entry.
   */
  async createTransaction(payload: CreateBranchTransactionPayload): Promise<BranchTransactionItem> {
    const res = await apiClient.post('/branch-ledger/transactions', payload);
    return res.data?.data || res.data;
  },

  /**
   * Update an existing transaction.
   */
  async updateTransaction(id: string, payload: Partial<CreateBranchTransactionPayload>): Promise<BranchTransactionItem> {
    const res = await apiClient.put(`/branch-ledger/transactions/${id}`, payload);
    return res.data?.data || res.data;
  },

  /**
   * Soft delete a transaction.
   */
  async deleteTransaction(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete(`/branch-ledger/transactions/${id}`);
    return res.data?.data || res.data;
  },

  /**
   * Get financial summary, daily breakdown, and category distribution.
   */
  async getSummary(params?: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
    date?: string;
    companyProfileId?: string;
  }): Promise<BranchLedgerSummaryResponse> {
    const res = await apiClient.get('/branch-ledger/summary', { params });
    return res.data?.data || res.data;
  },

  /**
   * Get authenticated PDF report endpoint URL.
   */
  getPdfUrl(params?: { branchId?: string; startDate?: string; endDate?: string; date?: string; dl?: number }): string {
    const baseURL = (apiClient.defaults.baseURL || '/api/v1').replace(/\/$/, '');
    const qs = new URLSearchParams();
    if (params?.branchId) qs.set('branchId', params.branchId);
    if (params?.startDate) qs.set('startDate', params.startDate);
    if (params?.endDate) qs.set('endDate', params.endDate);
    if (params?.date) qs.set('date', params.date);
    if (params?.dl) qs.set('dl', String(params.dl));
    const token = localStorage.getItem('pacific_access_token') || localStorage.getItem('token');
    if (token) qs.set('token', token);
    return `${baseURL}/branch-ledger/pdf?${qs.toString()}`;
  },

  /**
   * Fetch printable HTML document with embedded SVG charts and colored tables.
   */
  async getPdfHtml(params?: { branchId?: string; startDate?: string; endDate?: string; date?: string }): Promise<string> {
    const res = await apiClient.get('/branch-ledger/pdf', {
      params,
      responseType: 'text',
    });
    return res.data;
  },

  /**
   * Download binary PDF report as Blob.
   */
  async downloadPdfBlob(params?: { branchId?: string; startDate?: string; endDate?: string; date?: string }): Promise<Blob> {
    const res = await apiClient.get('/branch-ledger/pdf', {
      params: { ...params, dl: 1 },
      responseType: 'blob',
    });
    return res.data;
  },
};
