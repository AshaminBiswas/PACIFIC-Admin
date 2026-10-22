import { apiClient, API_URL } from './client';
import type {
  InstallerBill,
  CubicleModel,
  CubicleInstaller,
  ListInstallerBillsResponse,
  CreateInstallerBillPayload,
  UpdateInstallerBillPayload,
  RecordPaymentPayload,
  RecordAdvancePayload,
  InstallerAdvanceRecord,
  CreateCubicleModelPayload,
  UpdateCubicleModelPayload,
  CreateCubicleInstallerPayload,
  UpdateCubicleInstallerPayload,
  InstallerBillsFilter,
  InstallerExportFilter,
  InstallerLedgerResponse,
  BillAuditLogEntry,
} from '../types/installerPayment';

export const installerPaymentsService = {
  // ─── Bills Operations ──────────────────────────────────────────────────────

  async listBills(params: InstallerBillsFilter = {}): Promise<ListInstallerBillsResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.search) query.append('search', params.search);
    if (params.installerId) query.append('installerId', params.installerId);
    if (params.installerEmail) query.append('installerEmail', params.installerEmail);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.isNcr && params.isNcr !== 'all') query.append('isNcr', params.isNcr);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    const qStr = query.toString();
    const res = await apiClient.get<any>(`/installer-payments${qStr ? `?${qStr}` : ''}`);
    const data = res.data?.data || res.data;
    return (
      data || {
        bills: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        kpis: { totalBills: 0, totalAmount: 0, totalPaid: 0, totalDue: 0, clearedCount: 0, partialCount: 0 },
      }
    );
  },

  async getBill(id: string): Promise<InstallerBill> {
    const res = await apiClient.get<any>(`/installer-payments/${encodeURIComponent(id)}`);
    return res.data?.data || res.data;
  },

  async createBill(payload: CreateInstallerBillPayload): Promise<InstallerBill> {
    const res = await apiClient.post<any>('/installer-payments', payload);
    return res.data?.data || res.data;
  },

  async updateBill(id: string, payload: UpdateInstallerBillPayload): Promise<InstallerBill> {
    const res = await apiClient.patch<any>(`/installer-payments/${encodeURIComponent(id)}`, payload);
    return res.data?.data || res.data;
  },

  async getBillAuditLogs(billId: string): Promise<BillAuditLogEntry[]> {
    const res = await apiClient.get<any>(`/installer-payments/${encodeURIComponent(billId)}/audit-logs`);
    return res.data?.data || res.data || [];
  },

  async recordPayment(billId: string, payload: RecordPaymentPayload): Promise<InstallerBill> {
    const res = await apiClient.post<any>(`/installer-payments/${encodeURIComponent(billId)}/payments`, payload);
    return res.data?.data || res.data;
  },

  async recordAdvance(payload: RecordAdvancePayload): Promise<any> {
    const res = await apiClient.post<any>('/installer-payments/advances', payload);
    return res.data?.data || res.data;
  },

  async deleteAdvance(paymentId: string): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient.delete<any>(`/installer-payments/advances/${encodeURIComponent(paymentId)}`);
    return res.data?.data || res.data;
  },

  async deletePayment(paymentId: string): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient.delete<any>(`/installer-payments/payments/${encodeURIComponent(paymentId)}`);
    return res.data?.data || res.data;
  },

  async listAdvances(installerId?: string): Promise<InstallerAdvanceRecord[]> {
    try {
      const query = new URLSearchParams();
      if (installerId) query.append('installerId', installerId);
      const qStr = query.toString();
      const res = await apiClient.get<any>(`/installer-payments/advances${qStr ? `?${qStr}` : ''}`);
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) return data;
      return [];
    } catch {
      return [];
    }
  },

  async downloadBillPdf(id: string, billNo: string): Promise<void> {
    const res = await apiClient.get(`/installer-payments/${encodeURIComponent(id)}/pdf`, {
      responseType: 'blob',
    });

    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(billNo || 'PPSI-Bill').replace(/[\/\\]/g, '-')}-Payment-Advice.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async resendClearanceEmail(id: string, recipientEmail?: string): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient.post<any>(`/installer-payments/${encodeURIComponent(id)}/resend-email`, {
      recipientEmail,
    });
    return res.data?.data || res.data;
  },

  async deleteBill(id: string): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient.delete<any>(`/installer-payments/${encodeURIComponent(id)}`);
    return res.data?.data || res.data;
  },

  // ─── Cubicle Model Master (Super Admin Only) ───────────────────────────────

  async listModels(activeOnly = false, category?: string): Promise<CubicleModel[]> {
    try {
      const query = new URLSearchParams();
      if (activeOnly) query.append('activeOnly', 'true');
      if (category && category !== 'ALL') query.append('category', category);
      const qStr = query.toString();
      const res = await apiClient.get<any>(`/installer-payments/models${qStr ? `?${qStr}` : ''}`);
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) return data;
      return [];
    } catch {
      return [];
    }
  },

  async createModel(payload: CreateCubicleModelPayload): Promise<CubicleModel> {
    const res = await apiClient.post<any>('/installer-payments/models', payload);
    return res.data?.data || res.data;
  },

  async updateModel(id: string, payload: UpdateCubicleModelPayload): Promise<CubicleModel> {
    const res = await apiClient.patch<any>(`/installer-payments/models/${encodeURIComponent(id)}`, payload);
    return res.data?.data || res.data;
  },

  async deactivateModel(id: string): Promise<CubicleModel> {
    const res = await apiClient.delete<any>(`/installer-payments/models/${encodeURIComponent(id)}`);
    return res.data?.data || res.data;
  },

  // ─── Installers Directory (Master) ────────────────────────────────────────

  async listInstallers(includeInactive = false): Promise<CubicleInstaller[]> {
    try {
      const res = await apiClient.get<any>(
        `/installer-payments/installers${includeInactive ? '?includeInactive=true' : ''}`
      );
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) return data;
      return [];
    } catch {
      return [];
    }
  },

  async createInstaller(payload: CreateCubicleInstallerPayload): Promise<CubicleInstaller> {
    const res = await apiClient.post<any>('/installer-payments/installers', payload);
    return res.data?.data || res.data;
  },

  async updateInstaller(id: string, payload: UpdateCubicleInstallerPayload): Promise<CubicleInstaller> {
    const res = await apiClient.patch<any>(`/installer-payments/installers/${encodeURIComponent(id)}`, payload);
    return res.data?.data || res.data;
  },

  async deactivateInstaller(id: string): Promise<CubicleInstaller> {
    const res = await apiClient.delete<any>(`/installer-payments/installers/${encodeURIComponent(id)}`);
    return res.data?.data || res.data;
  },

  // ─── Full History & Installer Export (Super Admin Only) ─────────────────────

  async exportExcel(filters: InstallerExportFilter = {}, filename?: string): Promise<void> {
    const query = new URLSearchParams();
    if (filters.installerId) query.append('installerId', filters.installerId);
    if (filters.month) query.append('month', filters.month.toString());
    if (filters.year) query.append('year', filters.year.toString());
    if (filters.startDate) query.append('startDate', filters.startDate);
    if (filters.endDate) query.append('endDate', filters.endDate);
    if (filters.status && filters.status !== 'ALL') query.append('status', filters.status);

    const qStr = query.toString();
    const res = await apiClient.get(`/installer-payments/export/excel${qStr ? `?${qStr}` : ''}`, {
      responseType: 'blob',
    });

    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.download = filename || `Installer-Payments-History-${dateStamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // ─── Installer-Wise Ledger & Payment Statement ─────────────────────────────

  async getInstallerLedger(installerId: string): Promise<InstallerLedgerResponse> {
    const res = await apiClient.get<any>(`/installer-payments/installers/${encodeURIComponent(installerId)}/ledger`);
    return res.data?.data || res.data;
  },
};

export const installerPaymentsApi = installerPaymentsService;
export default installerPaymentsService;
