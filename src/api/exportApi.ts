import apiClient from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  ExportDashboardStats,
  ExportCountry,
  ExportCountryRule,
  ExportPort,
  ExportIncoterm,
  ExportCurrency,
  ExportExchangeRate,
  ExportHsCode,
  BusinessParty,
  ExportCustomer360,
  ExportRfq,
  ExportQuotation,
  ExportOrder,
  ExportOrder360,
  ExportPaymentMilestone,
  ExportLc,
  ExportShipment,
  ExportContainer,
  ExportCustomsRecord,
  ExportShippingBill,
  ExportComplianceCheck,
  ExportCertificate,
  ExportExpense,
  ExportBankRealization,
  ExportIrm,
  ExportEbrc,
  ExportDocument,
  ExportTask,
  ExportEmailTemplate,
  ExportEmailLog,
} from '../types/admin';

export const exportApi = {
  // ─── Dashboard & Global Search ──────────────────────────────────────────────
  getDashboard: () => apiClient.get<ApiResponse<ExportDashboardStats>>('/export/dashboard'),
  globalSearch: (q: string) => apiClient.get<ApiResponse<any>>('/export/search', { params: { q } }),

  // ─── Master Lookups ────────────────────────────────────────────────────────
  listCountries: () => apiClient.get<ApiResponse<ExportCountry[]>>('/export/countries'),
  getCountry: (id: string) => apiClient.get<ApiResponse<ExportCountry>>(`/export/countries/${id}`),
  upsertCountry: (data: Partial<ExportCountry>) => apiClient.post<ApiResponse<ExportCountry>>('/export/countries', data),

  listCountryRules: (countryId?: string) =>
    apiClient.get<ApiResponse<ExportCountryRule[]>>('/export/country-rules', { params: { countryId } }),
  upsertCountryRule: (data: Partial<ExportCountryRule>) =>
    apiClient.post<ApiResponse<ExportCountryRule>>('/export/country-rules', data),

  listPorts: (params?: { countryId?: string; portType?: string }) =>
    apiClient.get<ApiResponse<ExportPort[]>>('/export/ports', { params }),
  createPort: (data: Partial<ExportPort>) => apiClient.post<ApiResponse<ExportPort>>('/export/ports', data),
  updatePort: (id: string, data: Partial<ExportPort>) => apiClient.patch<ApiResponse<ExportPort>>(`/export/ports/${id}`, data),

  listIncoterms: () => apiClient.get<ApiResponse<ExportIncoterm[]>>('/export/incoterms'),
  upsertIncoterm: (data: Partial<ExportIncoterm>) => apiClient.post<ApiResponse<ExportIncoterm>>('/export/incoterms', data),

  listCurrencies: () => apiClient.get<ApiResponse<ExportCurrency[]>>('/export/currencies'),
  getExchangeRates: (currencyId?: string) =>
    apiClient.get<ApiResponse<ExportExchangeRate[]>>('/export/exchange-rates', { params: { currencyId } }),
  updateExchangeRate: (data: { currencyId: string; rateToInr: number; rateToUsd: number; effectiveDate?: string; source?: string }) =>
    apiClient.post<ApiResponse<ExportExchangeRate>>('/export/exchange-rates', data),

  listHsCodes: (search?: string) => apiClient.get<ApiResponse<ExportHsCode[]>>('/export/hs-codes', { params: { search } }),
  createHsCode: (data: Partial<ExportHsCode>) => apiClient.post<ApiResponse<ExportHsCode>>('/export/hs-codes', data),

  // ─── Customers & 360 ────────────────────────────────────────────────────────
  listCustomers: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<BusinessParty>>>('/export/customers', { params }),
  createCustomer: (data: any) =>
    apiClient.post<ApiResponse<BusinessParty>>('/export/customers', data),
  deleteCustomer: (id: string) =>
    apiClient.delete<ApiResponse<{ success: boolean }>>(`/export/customers/${id}`),
  getCustomer360: (id: string) => apiClient.get<ApiResponse<ExportCustomer360>>(`/export/customers/${id}/360`),
  upsertCustomerProfile: (partyId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/export/customers/${partyId}/profile`, data),
  addCustomerBankAccount: (partyId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/export/customers/${partyId}/bank-accounts`, data),

  // ─── RFQs ───────────────────────────────────────────────────────────────────
  listRfqs: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<ExportRfq>>>('/export/rfqs', { params }),
  getRfqById: (id: string) => apiClient.get<ApiResponse<ExportRfq>>(`/export/rfqs/${id}`),
  createRfq: (data: any) => apiClient.post<ApiResponse<ExportRfq>>('/export/rfqs', data),
  updateRfq: (id: string, data: any) => apiClient.patch<ApiResponse<ExportRfq>>(`/export/rfqs/${id}`, data),
  convertRfqToQuotation: (id: string) => apiClient.post<ApiResponse<ExportQuotation>>(`/export/rfqs/${id}/convert-to-quotation`),

  // ─── Export Quotations ──────────────────────────────────────────────────────
  listQuotations: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<ExportQuotation>>>('/export/quotations', { params }),
  getQuotationById: (id: string) => apiClient.get<ApiResponse<ExportQuotation>>(`/export/quotations/${id}`),
  createQuotation: (data: any) => apiClient.post<ApiResponse<ExportQuotation>>('/export/quotations', data),
  updateQuotation: (id: string, data: any) => apiClient.patch<ApiResponse<ExportQuotation>>(`/export/quotations/${id}`, data),
  deleteQuotation: (id: string) => apiClient.delete<ApiResponse<{ success: boolean }>>(`/export/quotations/${id}`),
  convertQuotationToOrder: (id: string) =>
    apiClient.post<ApiResponse<ExportOrder>>(`/export/quotations/${id}/convert-to-order`),
  getPdfUrl: (id: string) => {
    const token = localStorage.getItem('pacific_access_token');
    return `${apiClient.defaults.baseURL}/export/quotations/${id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  // ─── Export Orders ──────────────────────────────────────────────────────────
  listOrders: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<ExportOrder>>>('/export/orders', { params }),
  getOrder360: (id: string) => apiClient.get<ApiResponse<ExportOrder360>>(`/export/orders/${id}/360`),
  createOrder: (data: any) => apiClient.post<ApiResponse<ExportOrder>>('/export/orders', data),
  updateOrder: (id: string, data: any) => apiClient.patch<ApiResponse<ExportOrder>>(`/export/orders/${id}`, data),
  updateOrderStage: (id: string, stage: string) =>
    apiClient.patch<ApiResponse<ExportOrder>>(`/export/orders/${id}/stage`, { stage }),

  // Milestones & LC
  listMilestones: (orderId: string) =>
    apiClient.get<ApiResponse<ExportPaymentMilestone[]>>(`/export/orders/${orderId}/milestones`),
  updateMilestone: (id: string, data: any) =>
    apiClient.patch<ApiResponse<ExportPaymentMilestone>>(`/export/milestones/${id}`, data),
  getLcByOrder: (orderId: string) => apiClient.get<ApiResponse<ExportLc[]>>(`/export/orders/${orderId}/lc`),
  upsertLc: (orderId: string, data: any) => apiClient.post<ApiResponse<ExportLc>>(`/export/orders/${orderId}/lc`, data),

  // Customs & Compliance
  getCustomsRecord: (orderId: string) =>
    apiClient.get<ApiResponse<ExportCustomsRecord[]>>(`/export/orders/${orderId}/customs`),
  upsertCustomsRecord: (data: any) => apiClient.post<ApiResponse<ExportCustomsRecord>>('/export/customs', data),
  getShippingBill: (orderId: string) =>
    apiClient.get<ApiResponse<ExportShippingBill[]>>(`/export/orders/${orderId}/shipping-bill`),
  upsertShippingBill: (data: any) => apiClient.post<ApiResponse<ExportShippingBill>>('/export/shipping-bill', data),
  runComplianceCheck: (orderId: string) =>
    apiClient.post<ApiResponse<ExportComplianceCheck>>(`/export/orders/${orderId}/compliance/screen`),
  listCertificates: (orderId: string) =>
    apiClient.get<ApiResponse<ExportCertificate[]>>(`/export/orders/${orderId}/certificates`),
  upsertCertificate: (data: any) => apiClient.post<ApiResponse<ExportCertificate>>('/export/certificates', data),

  // Expenses & Landed Cost
  listExpenses: (orderId: string) =>
    apiClient.get<ApiResponse<ExportExpense[]>>(`/export/orders/${orderId}/expenses`),
  addExpense: (data: any) => apiClient.post<ApiResponse<ExportExpense>>('/export/expenses', data),
  deleteExpense: (id: string) => apiClient.delete(`/export/expenses/${id}`),

  // ─── Shipments & Containers ─────────────────────────────────────────────────
  listShipments: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<ExportShipment>>>('/export/shipments', { params }),
  getShipmentById: (id: string) => apiClient.get<ApiResponse<ExportShipment>>(`/export/shipments/${id}`),
  createShipment: (data: any) => apiClient.post<ApiResponse<ExportShipment>>('/export/shipments', data),
  updateShipment: (id: string, data: any) =>
    apiClient.patch<ApiResponse<ExportShipment>>(`/export/shipments/${id}`, data),

  listContainers: (shipmentId: string) =>
    apiClient.get<ApiResponse<ExportContainer[]>>(`/export/shipments/${shipmentId}/containers`),
  createContainer: (data: any) => apiClient.post<ApiResponse<ExportContainer>>('/export/containers', data),
  updateContainer: (id: string, data: any) =>
    apiClient.patch<ApiResponse<ExportContainer>>(`/export/containers/${id}`, data),
  addShippingEvent: (shipmentId: string, data: any) =>
    apiClient.post<ApiResponse<any>>(`/export/shipments/${shipmentId}/events`, data),

  // ─── Realizations & eBRC ────────────────────────────────────────────────────
  listRealizations: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<ExportBankRealization>>>('/export/realizations', { params }),
  createRealization: (data: any) => apiClient.post<ApiResponse<ExportBankRealization>>('/export/realizations', data),
  addIrm: (realizationId: string, data: any) =>
    apiClient.post<ApiResponse<ExportIrm>>(`/export/realizations/${realizationId}/irms`, data),
  addEbrc: (realizationId: string, data: any) =>
    apiClient.post<ApiResponse<ExportEbrc>>(`/export/realizations/${realizationId}/ebrcs`, data),

  // ─── Documents ──────────────────────────────────────────────────────────────
  listDocuments: (entityType: string, entityId: string) =>
    apiClient.get<ApiResponse<ExportDocument[]>>('/export/documents', { params: { entityType, entityId } }),
  addDocument: (data: any) => apiClient.post<ApiResponse<ExportDocument>>('/export/documents', data),

  // ─── Email Communication ────────────────────────────────────────────────────
  listEmailTemplates: () => apiClient.get<ApiResponse<ExportEmailTemplate[]>>('/export/emails/templates'),
  getEmailTemplate: (code: string) =>
    apiClient.get<ApiResponse<ExportEmailTemplate>>(`/export/emails/templates/${code}`),
  upsertEmailTemplate: (data: any) =>
    apiClient.post<ApiResponse<ExportEmailTemplate>>('/export/emails/templates', data),
  listEmailLogs: (params?: { exportOrderId?: string; partyId?: string; status?: string }) =>
    apiClient.get<ApiResponse<ExportEmailLog[]>>('/export/emails/logs', { params }),
  sendTradeEmail: (data: {
    exportOrderId?: string;
    partyId?: string;
    recipientEmail: string;
    ccEmails?: string;
    bccEmails?: string;
    templateCode?: string;
    subject?: string;
    bodyHtml?: string;
    variables?: Record<string, string>;
  }) => apiClient.post<ApiResponse<any>>('/export/emails/send', data),

  // ─── Tasks ──────────────────────────────────────────────────────────────────
  listTasks: (params?: Record<string, any>) => apiClient.get<ApiResponse<ExportTask[]>>('/export/tasks', { params }),
  createTask: (data: any) => apiClient.post<ApiResponse<ExportTask>>('/export/tasks', data),
  updateTask: (id: string, data: any) => apiClient.patch<ApiResponse<ExportTask>>(`/export/tasks/${id}`, data),
};
