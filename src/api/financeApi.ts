import apiClient from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  Payment,
  ReceivableEntry,
  PayableEntry,
  LedgerSummary,
  PaymentFollowup,
  RecoveryDashboardStats,
  CustomerLedgerStatement,
  FollowupTouchpointInput,
  SendLedgerEmailInput,
  ManualLedgerEntryInput,
} from '../types/admin';

export const financeApi = {
  listPayments: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<Payment>>>('/finance/payments', { params }),
  getPaymentById: (id: string) => apiClient.get<ApiResponse<Payment>>(`/finance/payments/${id}`),
  recordPayment: (data: any) => apiClient.post<ApiResponse<Payment>>('/finance/payments', data),
  getReceivables: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<ReceivableEntry[]>>('/finance/receivables', { params }),
  getPayables: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PayableEntry[]>>('/finance/payables', { params }),
  getSummary: () => apiClient.get<ApiResponse<LedgerSummary>>('/finance/summary'),
  getCustomerLedger: (customerId: string, params?: { fromDate?: string; toDate?: string }) =>
    apiClient.get<ApiResponse<CustomerLedgerStatement>>(`/finance/ledger/${customerId}`, { params }),
  sendCustomerLedgerEmail: (customerId: string, data: SendLedgerEmailInput) =>
    apiClient.post<ApiResponse<any>>(`/finance/ledger/${customerId}/send-email`, data),
  recordManualLedgerEntry: (customerId: string, data: ManualLedgerEntryInput) =>
    apiClient.post<ApiResponse<any>>(`/finance/ledger/${customerId}/manual-entry`, data),
};

export const followupsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<PaymentFollowup>>>('/followups', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<PaymentFollowup>>(`/followups/${id}`),
  getByCustomer: (customerId: string) => apiClient.get<ApiResponse<PaymentFollowup>>(`/followups/customer/${customerId}`),
  create: (data: any) => apiClient.post<ApiResponse<PaymentFollowup>>('/followups', data),
  addLog: (id: string, data: any) => apiClient.post(`/followups/${id}/logs`, data),
  logCustomerTouchpoint: (customerId: string, data: FollowupTouchpointInput) =>
    apiClient.post<ApiResponse<any>>(`/followups/customer/${customerId}/log`, data),
  runCadence: () => apiClient.post<ApiResponse<any>>('/followups/run-cadence'),
  getDashboard: () => apiClient.get<ApiResponse<RecoveryDashboardStats>>('/followups/dashboard'),
};
