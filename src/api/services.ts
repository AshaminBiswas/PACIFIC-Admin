import apiClient from './client';
import type {
  ApiResponse, PaginatedResponse,
  Product, ProductCategory,
  Lead, ConfiguratorDesign,
  Quotation, CommercialProject,
  Invoice, Blog, GalleryImage,
  Catalog, Faq, Testimonial,
  DashboardStats, AuthTokens,
  CompanyProfile, BusinessParty, Customer360Data,
  PurchaseOrder, ProformaInvoice,
  Payment, ReceivableEntry, PayableEntry, LedgerSummary,
  PaymentFollowup, RecoveryDashboardStats,
  QrScanResult, PublicVerificationData, AuditLog,
  ProductMaterial, ProductFinish, ProductUnit, ProductSubcategory,
  SalesQuotation, SalesOrder, PackingList,
  HardwareCatalogItem, HardwareIssueList, QuotationContentTemplate,
  OrderDocumentTimelineItem,
} from '../types/admin';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<ApiResponse<AuthTokens>>('/auth/login', { email, password }),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats'),
};

// ─── Companies / Multi-Entity ────────────────────────────────────────────────
export const companiesApi = {
  list: () => apiClient.get<ApiResponse<CompanyProfile[]>>('/companies'),
  getById: (id: string) => apiClient.get<ApiResponse<CompanyProfile>>(`/companies/${id}`),
  create: (data: Partial<CompanyProfile>) => apiClient.post<ApiResponse<CompanyProfile>>('/companies', data),
  update: (id: string, data: Partial<CompanyProfile>) =>
    apiClient.patch<ApiResponse<CompanyProfile>>(`/companies/${id}`, data),
  addAddress: (id: string, data: any) => apiClient.post(`/companies/${id}/addresses`, data),
  addBankAccount: (id: string, data: any) => apiClient.post(`/companies/${id}/bank-accounts`, data),
  addSignatory: (id: string, data: any) => apiClient.post(`/companies/${id}/signatories`, data),
  addTerm: (id: string, data: any) => apiClient.post(`/companies/${id}/terms`, data),
};

// ─── B2B CRM ──────────────────────────────────────────────────────────────────
export const crmApi = {
  listCustomers: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<BusinessParty>>>('/crm', { params }),
  getCustomerById: (id: string) => apiClient.get<ApiResponse<BusinessParty>>(`/crm/${id}`),
  getCustomer360: (id: string) => apiClient.get<ApiResponse<Customer360Data>>(`/crm/${id}/360`),
  createCustomer: (data: any) => apiClient.post<ApiResponse<BusinessParty>>('/crm', data),
  updateCustomer: (id: string, data: any) => apiClient.patch<ApiResponse<BusinessParty>>(`/crm/${id}`, data),
  deleteCustomer: (id: string) => apiClient.delete(`/crm/${id}`),
  addContact: (id: string, data: any) => apiClient.post(`/crm/${id}/contacts`, data),
  addAddress: (id: string, data: any) => apiClient.post(`/crm/${id}/addresses`, data),
  checkDuplicates: (data: { legalName?: string; phone?: string; gstin?: string; excludeId?: string }) =>
    apiClient.post<ApiResponse<BusinessParty[]>>('/crm/check-duplicates', data),
  mergeCustomers: (canonicalCustomerId: string, mergedCustomerId: string, reason?: string) =>
    apiClient.post<ApiResponse<any>>('/crm/merge', { canonicalCustomerId, mergedCustomerId, reason }),
};

// ─── Vendors ──────────────────────────────────────────────────────────────────
export const vendorsApi = {
  listVendors: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<BusinessParty>>>('/vendors', { params }),
  getVendorById: (id: string) => apiClient.get<ApiResponse<BusinessParty>>(`/vendors/${id}`),
  createVendor: (data: any) => apiClient.post<ApiResponse<BusinessParty>>('/vendors', data),
  updateVendor: (id: string, data: any) => apiClient.patch<ApiResponse<BusinessParty>>(`/vendors/${id}`, data),
  deleteVendor: (id: string) => apiClient.delete(`/vendors/${id}`),
};

// ─── Purchase Orders (Procurement) ───────────────────────────────────────────
export const poApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<PurchaseOrder>>>('/procurement/po', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<PurchaseOrder>>(`/procurement/po/${id}`),
  create: (data: any) => apiClient.post<ApiResponse<PurchaseOrder>>('/procurement/po', data),
  approve: (id: string) => apiClient.post<ApiResponse<PurchaseOrder>>(`/procurement/po/${id}/approve`),
  cancel: (id: string, reason: string) =>
    apiClient.post<ApiResponse<PurchaseOrder>>(`/procurement/po/${id}/cancel`, { reason }),
  getPdfUrl: (id: string) => `${apiClient.defaults.baseURL}/procurement/po/${id}/pdf`,
};

// ─── Proforma Invoices (Sales) ───────────────────────────────────────────────
export const piApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<ProformaInvoice>>>('/sales/pi', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<ProformaInvoice>>(`/sales/pi/${id}`),
  create: (data: any) => apiClient.post<ApiResponse<ProformaInvoice>>('/sales/pi', data),
  issue: (id: string) => apiClient.post<ApiResponse<ProformaInvoice>>(`/sales/pi/${id}/issue`),
  duplicate: (id: string) => apiClient.post<ApiResponse<ProformaInvoice>>(`/sales/pi/${id}/duplicate`),
  cancel: (id: string, reason: string) =>
    apiClient.post<ApiResponse<ProformaInvoice>>(`/sales/pi/${id}/cancel`, { reason }),
  getPdfUrl: (id: string) => `${apiClient.defaults.baseURL}/sales/pi/${id}/pdf`,
};

// ─── Formal Sales Quotations ────────────────────────────────────────────────
export const salesQuotationsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<SalesQuotation>>>('/sales/quotations', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<SalesQuotation>>(`/sales/quotations/${id}`),
  create: (data: any) => apiClient.post<ApiResponse<SalesQuotation>>('/sales/quotations', data),
  revise: (id: string, data: any) => apiClient.post<ApiResponse<SalesQuotation>>(`/sales/quotations/${id}/revise`, data),
  send: (id: string) => apiClient.post<ApiResponse<SalesQuotation>>(`/sales/quotations/${id}/send`),
  convertToOrder: (id: string) => apiClient.post<ApiResponse<SalesOrder>>(`/sales/quotations/${id}/convert-to-order`),
  listTemplates: (category?: string) =>
    apiClient.get<ApiResponse<QuotationContentTemplate[]>>('/sales/quotations/templates', { params: { category } }),
  saveTemplate: (data: any) => apiClient.post<ApiResponse<QuotationContentTemplate>>('/sales/quotations/templates', data),
  getPdfUrl: (id: string) => `${apiClient.defaults.baseURL}/sales/quotations/${id}/pdf`,
};

// ─── Central Sales Order Hub ────────────────────────────────────────────────
export const salesOrdersApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<SalesOrder>>>('/sales/orders', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<SalesOrder>>(`/sales/orders/${id}`),
  createDirect: (data: any) => apiClient.post<ApiResponse<SalesOrder>>('/sales/orders', data),
  approve: (id: string) => apiClient.post<ApiResponse<SalesOrder>>(`/sales/orders/${id}/approve`),
  cancel: (id: string, reason: string) =>
    apiClient.post<ApiResponse<SalesOrder>>(`/sales/orders/${id}/cancel`, { reason }),
  getTimeline: (id: string) => apiClient.get<ApiResponse<OrderDocumentTimelineItem[]>>(`/sales/orders/${id}/timeline`),
  globalSearch: (query: string) => apiClient.get<ApiResponse<any>>('/sales/orders/search', { params: { q: query } }),
};

// ─── Packing Lists (Logistics) ──────────────────────────────────────────────
export const packingListsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<PackingList>>>('/logistics/packing-lists', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<PackingList>>(`/logistics/packing-lists/${id}`),
  create: (data: any) => apiClient.post<ApiResponse<PackingList>>('/logistics/packing-lists', data),
  acknowledge: (id: string, data: any) =>
    apiClient.post<ApiResponse<PackingList>>(`/logistics/packing-lists/${id}/acknowledge`, data),
  listPacketTypes: () => apiClient.get<ApiResponse<any[]>>('/logistics/packing-lists/packet-types'),
  addPacketType: (name: string) => apiClient.post<ApiResponse<any>>('/logistics/packing-lists/packet-types', { name }),
  getPdfUrl: (id: string) => `${apiClient.defaults.baseURL}/logistics/packing-lists/${id}/pdf`,
};

// ─── Hardware Catalog & Issue Lists (Warehouse) ─────────────────────────────
export const hardwareIssueApi = {
  listCatalog: (category?: string) =>
    apiClient.get<ApiResponse<HardwareCatalogItem[]>>('/warehouse/hardware-catalog', { params: { category } }),
  createCatalogItem: (data: any) => apiClient.post<ApiResponse<HardwareCatalogItem>>('/warehouse/hardware-catalog', data),
  updateCatalogItem: (id: string, data: any) =>
    apiClient.patch<ApiResponse<HardwareCatalogItem>>(`/warehouse/hardware-catalog/${id}`, data),
  listIssues: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<HardwareIssueList>>>('/warehouse/hardware-issues', { params }),
  getIssueById: (id: string) => apiClient.get<ApiResponse<HardwareIssueList>>(`/warehouse/hardware-issues/${id}`),
  createIssue: (data: any) => apiClient.post<ApiResponse<HardwareIssueList>>('/warehouse/hardware-issues', data),
  signStep: (id: string, role: string, name: string) =>
    apiClient.post<ApiResponse<HardwareIssueList>>(`/warehouse/hardware-issues/${id}/sign`, { role, name }),
  getPdfUrl: (id: string) => `${apiClient.defaults.baseURL}/warehouse/hardware-issues/${id}/pdf`,
};

// ─── Extended Products Master ────────────────────────────────────────────────
export const productsMasterApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<Product>>>('/products/master', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<Product>>(`/products/master/${id}`),
  create: (data: any) => apiClient.post<ApiResponse<Product>>('/products/master', data),
  update: (id: string, data: any) => apiClient.patch<ApiResponse<Product>>(`/products/master/${id}`, data),
  delete: (id: string) => apiClient.delete(`/products/master/${id}`),
  getMaterials: () => apiClient.get<ApiResponse<ProductMaterial[]>>('/products/master/materials'),
  getFinishes: () => apiClient.get<ApiResponse<ProductFinish[]>>('/products/master/finishes'),
  getUnits: () => apiClient.get<ApiResponse<ProductUnit[]>>('/products/master/units'),
  getSubcategories: (categoryId?: string) =>
    apiClient.get<ApiResponse<ProductSubcategory[]>>('/products/master/subcategories', { params: { categoryId } }),
};

// ─── Finance & Payments ──────────────────────────────────────────────────────
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
};

// ─── Dues Recovery & Follow-ups ──────────────────────────────────────────────
export const followupsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<PaymentFollowup>>>('/followups', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<PaymentFollowup>>(`/followups/${id}`),
  create: (data: any) => apiClient.post<ApiResponse<PaymentFollowup>>('/followups', data),
  addLog: (id: string, data: any) => apiClient.post(`/followups/${id}/logs`, data),
  getDashboard: () => apiClient.get<ApiResponse<RecoveryDashboardStats>>('/followups/dashboard'),
};

// ─── QR Subsystem ────────────────────────────────────────────────────────────
export const qrApi = {
  scan: (payload: string) => apiClient.post<QrScanResult>('/qr/scan', { payload }),
  generate: (entityType: string, entityId: string) =>
    apiClient.post('/qr/generate', { entityType, entityId }),
  getHistory: () => apiClient.get('/qr/history'),
  verifyPublicToken: (token: string) =>
    apiClient.get<PublicVerificationData>(`/verify/${token}`),
};

// ─── Audit System ─────────────────────────────────────────────────────────────
export const auditApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<AuditLog>>>('/audit', { params }),
};

// ─── Legacy & Existing Products API ──────────────────────────────────────────
export const productsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<Product>>>('/products', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<Product>>(`/products/${id}`),
  create: (data: Partial<Product>) => apiClient.post<ApiResponse<Product>>('/products', data),
  update: (id: string, data: Partial<Product>) => apiClient.put<ApiResponse<Product>>(`/products/${id}`, data),
  delete: (id: string) => apiClient.delete(`/products/${id}`),
  listCategories: () => apiClient.get<ApiResponse<ProductCategory[]>>('/products/categories'),
  createCategory: (data: Partial<ProductCategory>) =>
    apiClient.post<ApiResponse<ProductCategory>>('/products/categories', data),
};

// ─── Legacy & Existing Configurator ──────────────────────────────────────────
export const configuratorApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<ConfiguratorDesign>>>('/configurator', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<ConfiguratorDesign>>(`/configurator/${id}`),
  updateStatus: (id: string, status: string) =>
    apiClient.patch(`/configurator/${id}/status`, { status }),
  delete: (id: string) => apiClient.delete(`/configurator/${id}`),
};

// ─── Legacy Quotes ───────────────────────────────────────────────────────────
export const quotesApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<Quotation>>>('/quotes', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<Quotation>>(`/quotes/${id}`),
  create: (data: Partial<Quotation>) => apiClient.post<ApiResponse<Quotation>>('/quotes', data),
  updateStatus: (id: string, status: string) =>
    apiClient.patch(`/quotes/${id}/status`, { status }),
  delete: (id: string) => apiClient.delete(`/quotes/${id}`),
};

// ─── Legacy Leads ────────────────────────────────────────────────────────────
export const leadsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<Lead>>>('/leads', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<Lead>>(`/leads/${id}`),
  update: (id: string, data: Partial<Lead>) => apiClient.put<ApiResponse<Lead>>(`/leads/${id}`, data),
  delete: (id: string) => apiClient.delete(`/leads/${id}`),
  getStats: () => apiClient.get('/leads/stats'),
};

// ─── Legacy Projects ─────────────────────────────────────────────────────────
export const projectsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<CommercialProject>>>('/projects', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<CommercialProject>>(`/projects/${id}`),
  create: (data: Partial<CommercialProject>) =>
    apiClient.post<ApiResponse<CommercialProject>>('/projects', data),
  update: (id: string, data: Partial<CommercialProject>) =>
    apiClient.put<ApiResponse<CommercialProject>>(`/projects/${id}`, data),
  delete: (id: string) => apiClient.delete(`/projects/${id}`),
};

// ─── Legacy Invoices ─────────────────────────────────────────────────────────
export const invoicesApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<Invoice>>>('/invoices', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<Invoice>>(`/invoices/${id}`),
  create: (data: Partial<Invoice>) => apiClient.post<ApiResponse<Invoice>>('/invoices', data),
  update: (id: string, data: Partial<Invoice>) =>
    apiClient.put<ApiResponse<Invoice>>(`/invoices/${id}`, data),
  delete: (id: string) => apiClient.delete(`/invoices/${id}`),
};

// ─── CMS ─────────────────────────────────────────────────────────────────────
export const cmsApi = {
  listBlogs: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<Blog>>>('/cms/blogs', { params }),
  createBlog: (data: Partial<Blog>) => apiClient.post('/cms/blogs', data),
  updateBlog: (id: string, data: Partial<Blog>) => apiClient.put(`/cms/blogs/${id}`, data),
  deleteBlog: (id: string) => apiClient.delete(`/cms/blogs/${id}`),

  listGallery: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<GalleryImage>>>('/cms/gallery', { params }),
  createGalleryImage: (data: Partial<GalleryImage>) => apiClient.post('/cms/gallery', data),
  updateGalleryImage: (id: string, data: Partial<GalleryImage>) =>
    apiClient.put(`/cms/gallery/${id}`, data),
  deleteGalleryImage: (id: string) => apiClient.delete(`/cms/gallery/${id}`),

  listCatalogs: () => apiClient.get<ApiResponse<Catalog[]>>('/cms/catalogs'),
  createCatalog: (data: Partial<Catalog>) => apiClient.post('/cms/catalogs', data),
  deleteCatalog: (id: string) => apiClient.delete(`/cms/catalogs/${id}`),

  listFaqs: () => apiClient.get<ApiResponse<Faq[]>>('/cms/faqs'),
  createFaq: (data: Partial<Faq>) => apiClient.post('/cms/faqs', data),
  updateFaq: (id: string, data: Partial<Faq>) => apiClient.put(`/cms/faqs/${id}`, data),
  deleteFaq: (id: string) => apiClient.delete(`/cms/faqs/${id}`),

  listTestimonials: () => apiClient.get<ApiResponse<Testimonial[]>>('/cms/testimonials'),
  createTestimonial: (data: Partial<Testimonial>) => apiClient.post('/cms/testimonials', data),
  updateTestimonial: (id: string, data: Partial<Testimonial>) =>
    apiClient.put(`/cms/testimonials/${id}`, data),
  deleteTestimonial: (id: string) => apiClient.delete(`/cms/testimonials/${id}`),
};

// ─── Public Consignee Receipt Acknowledgment ────────────────────────────────
export const publicAckApi = {
  getByToken: (token: string) => apiClient.get<ApiResponse<PackingList>>(`/acknowledge-receipt/${token}`),
  acknowledgeByToken: (token: string, data: { receivedByName: string; receivedByPhone: string; signatureData?: string }) =>
    apiClient.post<ApiResponse<PackingList>>(`/acknowledge-receipt/${token}`, data),
};
