/**
 * Pacific Restroom Cubicle Enterprise ERP — Analytics & High-Performance Reporting API
 * Supports all 8 standard reporting periods, real-time comparison metrics,
 * paginated transaction ledgers, and asynchronous report queue operations.
 */

import { apiClient } from './client';
import {
  DashboardAnalyticsResponse,
  ReportingPeriodSelection,
  TransactionLedgerResponse,
  AsyncReportJob,
} from '../types/admin';

export interface DashboardQueryParams {
  periodType: string;
  date?: string;
  week?: string;
  month?: string;
  quarter?: string;
  quarterYear?: number;
  quarterType?: string;
  halfYear?: string;
  halfYearYear?: number;
  year?: number;
  financialYear?: string;
  customStart?: string;
  customEnd?: string;
  compareCustomStart?: string;
  compareCustomEnd?: string;
  comparisonMode?: string;
  companyProfileId?: string;
  refresh?: boolean;
}

export interface TransactionQueryParams {
  startDate: string;
  endDate: string;
  type?: 'ALL' | 'SALES' | 'PURCHASE' | 'PAYMENT';
  page?: number;
  limit?: number;
  companyProfileId?: string;
}

export interface EnqueueReportRequest {
  reportType: 'SALES_SUMMARY' | 'PURCHASE_SUMMARY' | 'TRANSACTIONS' | 'PROFIT_LOSS' | 'OUTSTANDING_RECEIVABLES' | 'GST_RECONCILIATION';
  format: 'xlsx' | 'csv' | 'pdf';
  startDate: string;
  endDate: string;
  companyProfileId?: string;
  idempotencyKey?: string;
}

export const analyticsApi = {
  /**
   * Fetch complete enterprise dashboard analytics for a given reporting period.
   * Leverages server-side tier-1 cache for P95 < 2s response times under concurrent load.
   */
  async getDashboard(params: DashboardQueryParams): Promise<DashboardAnalyticsResponse> {
    const res = await apiClient.get<{ success: boolean; data: DashboardAnalyticsResponse }>(
      '/analytics/dashboard',
      { params }
    );
    return res.data.data;
  },

  /**
   * Fetch paginated transaction ledger entries synchronized with the active date range.
   */
  async getTransactions(params: TransactionQueryParams): Promise<TransactionLedgerResponse> {
    const res = await apiClient.get<{ success: boolean; data: TransactionLedgerResponse }>(
      '/analytics/transactions',
      { params }
    );
    return res.data.data;
  },

  /**
   * Enqueue heavy report generation into background worker queue (non-blocking).
   */
  async enqueueReport(body: EnqueueReportRequest): Promise<{
    jobId: string;
    status: string;
    reportType: string;
    format: string;
    createdAt: string;
  }> {
    const res = await apiClient.post<{
      success: boolean;
      data: {
        jobId: string;
        status: string;
        reportType: string;
        format: string;
        createdAt: string;
      };
    }>('/analytics/reports/async', body);
    return res.data.data;
  },

  /**
   * Poll status of an enqueued report job (progress %, status, download token).
   */
  async getReportJobStatus(jobId: string): Promise<AsyncReportJob> {
    const res = await apiClient.get<{ success: boolean; data: AsyncReportJob }>(
      `/analytics/reports/status/${jobId}`
    );
    return res.data.data;
  },

  /**
   * Return server download URL for a completed report.
   */
  getDownloadUrl(token: string): string {
    const baseURL = (apiClient.defaults.baseURL || '').replace(/\/$/, '');
    return `${baseURL}/analytics/reports/download/${token}`;
  },

  /**
   * Fetch server cache performance metrics (hit ratio, RPS, eviction count).
   */
  async getCacheMetrics(): Promise<{
    hits: number;
    misses: number;
    total: number;
    hitRatioPct: number;
    size: number;
  }> {
    const res = await apiClient.get<{
      success: boolean;
      data: {
        hits: number;
        misses: number;
        total: number;
        hitRatioPct: number;
        size: number;
      };
    }>('/analytics/cache-metrics');
    return res.data.data;
  },
};
