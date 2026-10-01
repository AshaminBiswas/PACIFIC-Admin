// Pacific Admin — TypeScript Type Definitions

export type AdminView =
  | 'dashboard'
  | 'products'
  | 'product-categories'
  | 'customers'
  | 'vendors'
  | 'purchase-orders'
  | 'proforma-invoices'
  | 'sales-quotations'
  | 'sales-orders'
  | 'packing-lists'
  | 'issue-lists'
  | 'payments'
  | 'followups'
  | 'qr-center'
  | 'company-settings'
  | 'audit-logs'
  | 'configurator-leads'
  | 'quotations'
  | 'leads'
  | 'projects'
  | 'invoices'
  | 'cms-blogs'
  | 'cms-gallery'
  | 'cms-hero-slides'
  | 'cms-catalogs'
  | 'cms-faqs'
  | 'cms-testimonials'
  | 'board-inventory'
  | 'locker-inventory'
  | 'ump-inventory'
  | 'store-inventory'
  | 'settings';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SALES_MANAGER'
  | 'WAREHOUSE_MANAGER'
  | 'FINANCE_OFFICER'
  | 'PROCUREMENT_MANAGER'
  | 'EXPORT_MANAGER'
  | 'EDITOR'
  | 'VIEWER';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword?: boolean;
  twoFactorEnabled?: boolean;
  isTwoFactorPending?: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  sessionToken?: string;
  user: AdminUser;
}

export interface AdminSession {
  id: string;
  sessionToken: string;
  ipAddress?: string | null;
  browser?: string | null;
  os?: string | null;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
  isCurrent?: boolean;
}

export interface TwoFactorSetupData {
  secret: string;
  qrCodeUrl: string;
  recoveryCodes: string[];
}

// ─── RBAC & User Management ──────────────────────────────────────────────────

export interface Permission {
  id: string;
  code: string;
  module: string;
  description: string;
  createdAt?: string;
}

export interface RoleManagementItem {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isSystem: boolean;
  permissionCount?: number;
  assignedUsersCount?: number;
  permissions?: Permission[];
  users?: AdminUser[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GroupedPermissionsResponse {
  total: number;
  modules: string[];
  grouped: Record<string, Permission[]>;
  all: Permission[];
}

export interface AdminUserManagementItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  twoFactorEnabled?: boolean;
  isTwoFactorPending?: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  customRoles?: RoleManagementItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateAdminUserPayload {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role?: string;
  roleIds?: string[];
  isActive?: boolean;
  mustChangePassword?: boolean;
  isTwoFactorPending?: boolean;
}

export interface UpdateAdminUserPayload {
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
  roleIds?: string[];
  mustChangePassword?: boolean;
  isTwoFactorPending?: boolean;
}

export interface CreateRolePayload {
  name: string;
  code?: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  permissionIds?: string[];
}


// ─── Multi-Entity & Company ──────────────────────────────────────────────────

export interface CompanyProfile {
  id: string;
  companyName: string;
  legalName: string;
  entityCode: string;
  country: string;
  currency: string;
  taxRegime: string;
  gstin?: string;
  pan?: string;
  vatNumber?: string;
  state?: string;
  stateCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  signatureUrl?: string;
  status: string;
  addresses?: CompanyAddress[];
  bankAccounts?: CompanyBankAccount[];
  signatories?: CompanySignatory[];
  terms?: CompanyTerm[];
  createdAt: string;
}

export interface CompanyAddress {
  id: string;
  companyProfileId: string;
  type: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  stateCode?: string;
  postalCode: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  isDefault: boolean;
}

export interface CompanyBankAccount {
  id: string;
  companyProfileId: string;
  bankName: string;
  accountNumber: string;
  ifscCode?: string;
  swiftCode?: string;
  branch?: string;
  iban?: string;
  isDefault: boolean;
}

export interface CompanySignatory {
  id: string;
  companyProfileId: string;
  name: string;
  designation: string;
  signatureUrl?: string;
  isDefault: boolean;
}

export interface CompanyTerm {
  id: string;
  companyProfileId: string;
  documentType: string;
  title: string;
  content: string;
  sortOrder: number;
  isDefault: boolean;
}

// ─── Business Parties (CRM & Vendors) ────────────────────────────────────────

export type PartyType = 'CUSTOMER' | 'VENDOR' | 'BOTH';

export interface BusinessParty {
  id: string;
  companyProfileId?: string;
  partyType: PartyType;
  legalName: string;
  tradeName?: string;
  gstin?: string;
  pan?: string;
  email?: string;
  phone?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: string;
  notes?: string;
  customerProfile?: CustomerProfile;
  exportCustomerProfile?: ExportCustomerProfile;
  vendorProfile?: VendorProfile;
  contacts?: PartyContact[];
  addresses?: PartyAddress[];
  purchaseOrders?: PurchaseOrder[];
  payments?: Payment[];
  summary?: {
    totalPoValue?: number;
    totalPaidValue?: number;
    outstandingBalance?: number;
    totalPoCount?: number;
    totalPaymentsCount?: number;
  };
  _count?: {
    exportOrders?: number;
    exportQuotations?: number;
    exportRfqs?: number;
    salesOrders?: number;
    salesQuotations?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfile {
  id: string;
  partyId: string;
  customerType: string;
  creditLimit?: number;
  paymentTermsDays: number;
  status: string;
}

export interface VendorProfile {
  id: string;
  partyId: string;
  vendorType: string;
  paymentTermsDays: number;
  status: string;
}

export interface PartyContact {
  id: string;
  partyId: string;
  name: string;
  designation?: string;
  department?: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
}

export interface PartyAddress {
  id: string;
  partyId: string;
  addressType: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  stateCode?: string;
  country: string;
  postalCode?: string;
  gstin?: string;
  isDefaultBilling: boolean;
  isDefaultShipping: boolean;
}

export interface Customer360Data {
  customer: BusinessParty;
  kpis: {
    totalPurchaseValue?: number;
    totalQuotedValue?: number;
    totalOrderedValue?: number;
    totalDispatchedValue?: number;
    totalInvoiced: number;
    totalPaid: number;
    outstandingBalance: number;
    advanceBalance: number;
    overdueBalance: number;
    openInvoicesCount: number;
    conversionRatePercent?: number;
    lastPurchaseDate?: string;
    lastPaymentDate?: string;
  };
  recentProformaInvoices: ProformaInvoice[];
  recentOrders?: SalesOrder[];
  recentQuotations?: SalesQuotation[];
  recentPackingLists?: PackingList[];
  recentPayments: Payment[];
  activeFollowups: PaymentFollowup[];
  timeline?: OrderDocumentTimelineItem[];
}

// ─── Products Master Extended ────────────────────────────────────────────────

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface ProductSubcategory {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ProductMaterial {
  id: string;
  name: string;
  code?: string;
}

export interface ProductFinish {
  id: string;
  name: string;
  code?: string;
}

export interface ProductUnit {
  id: string;
  code: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDesc?: string;
  sku?: string;
  barcode?: string;
  hsnSac?: string;
  categoryId: string;
  category?: ProductCategory;
  subcategoryId?: string;
  subcategory?: ProductSubcategory;
  materialId?: string;
  material?: ProductMaterial;
  finishId?: string;
  finish?: ProductFinish;
  unitId?: string;
  unit?: ProductUnit;
  thickness?: string;
  cuttingSize?: string;
  gstRate?: number;
  basePrice?: number;
  costPrice?: number;
  isFeatured: boolean;
  isActive: boolean;
  images: string[];
  specifications: Record<string, any>;
  tags: string[];
  qrCodes?: QrCode[];
  createdAt: string;
  updatedAt: string;
}

// ─── Purchase Orders (Procurement) ───────────────────────────────────────────

export type POStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
  id?: string;
  serialNumber: number;
  productId?: string;
  description: string;
  finish?: string;
  thickness?: string;
  cuttingSize?: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  gstRate?: number;
  gstAmount?: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  companyProfileId: string;
  companyProfile?: CompanyProfile;
  vendorId: string;
  vendor?: BusinessParty;
  poDate: string;
  subject?: string;
  description?: string;
  deliveryAddressJson: any;
  billingAddressJson: any;
  paymentTerms?: string;
  deliveryTerms?: string;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  currency: string;
  status: POStatus;
  items: PurchaseOrderItem[];
  createdById?: string;
  approvedById?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Proforma Invoices (Sales) ───────────────────────────────────────────────

export type PIStatus = 'DRAFT' | 'ISSUED' | 'CONVERTED' | 'CANCELLED';

export interface ProformaInvoiceParty {
  id?: string;
  partyRole: string; // BILL_TO, SHIP_TO
  partyName: string;
  gstin?: string;
  addressLine: string;
  state: string;
  stateCode?: string;
  phone?: string;
  email?: string;
}

export interface ProformaInvoiceItem {
  id?: string;
  serialNumber: number;
  productId?: string;
  product?: Product;
  description: string;
  hsnSac?: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
}

export interface ProformaInvoiceTaxSummary {
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export interface ProformaInvoice {
  id: string;
  piNumber: string;
  piDate: string;
  companyProfileId: string;
  companyProfile?: CompanyProfile;
  customerId: string;
  customer?: BusinessParty;
  placeOfSupply: string;
  placeOfSupplyStateCode: string;
  reverseCharge: boolean;
  modeOfTransport?: string;
  vehicleNumber?: string;
  grLrNumber?: string;
  linkedPoNumber?: string;
  linkedPoDate?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
  termsAndConditions?: string;
  subtotal: number;
  installationCharge?: number;
  installationRatePerCubicle?: number;
  installationCubicleCount?: number;
  freightAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  roundingAdjustment: number;
  grandTotal: number;
  amountInWords?: string;
  currency: string;
  status: PIStatus;
  quotationId?: string | null;
  quotationRef?: string | null;
  orderId?: string | null;
  advancePercentage?: number;
  advanceRequiredAmount?: number;
  advanceReceivedAmount?: number;
  advancePaymentStatus?: 'PENDING' | 'PARTIAL' | 'FULLY_RECEIVED';
  advancePaymentDate?: string | null;
  advancePaymentReference?: string | null;
  advancePaymentMode?: string | null;
  convertedOrderId?: string | null;
  parties?: ProformaInvoiceParty[];
  items?: ProformaInvoiceItem[];
  taxSummary?: ProformaInvoiceTaxSummary[];
  terms?: { clauseNumber: number; text: string }[];
  qrCodes?: QrCode[];
  statusHistory?: Array<{
    id: string;
    fromStatus: string;
    toStatus: string;
    comment?: string;
    changedById?: string;
    changedBy?: { firstName?: string; lastName?: string };
    createdAt: string;
  }>;
  followups?: Array<{
    id: string;
    followupStatus: string;
    priority: string;
    nextFollowupDate?: string;
    promisedPaymentDate?: string;
    promisedAmount?: number;
    notes?: string;
    communicationChannel: string;
    createdAt: string;
    logs?: Array<{
      id: string;
      notes: string;
      channel: string;
      status: string;
      actionDate: string;
    }>;
  }>;
  createdAt: string;
  updatedAt: string;
}

// ─── Finance, Payments & Follow-ups ──────────────────────────────────────────

export type PaymentType = 'CUSTOMER_PAYMENT' | 'VENDOR_PAYMENT' | 'ADVANCE' | 'REFUND';
export type PaymentMethod = 'NEFT_RTGS' | 'IMPS' | 'UPI' | 'CHEQUE' | 'CASH' | 'CARD';

export interface PaymentAllocation {
  id?: string;
  documentType: string;
  documentId: string;
  proformaInvoiceId?: string;
  proformaInvoice?: ProformaInvoice;
  allocatedAmount: number;
}

export interface Payment {
  id: string;
  companyProfileId: string;
  partyId: string;
  party?: BusinessParty;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  paymentDate: string;
  amount: number;
  unallocatedAmount: number;
  currency: string;
  notes?: string;
  status: string;
  allocations?: PaymentAllocation[];
  createdAt: string;
}

export interface ReceivableEntry {
  id: string;
  customerId: string;
  customer?: CustomerProfile & { party?: BusinessParty };
  proformaInvoiceId?: string;
  proformaInvoice?: ProformaInvoice;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate?: string;
  status: 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  createdAt: string;
}

export interface PayableEntry {
  id: string;
  vendorId: string;
  vendor?: VendorProfile & { party?: BusinessParty };
  purchaseOrderId?: string;
  purchaseOrder?: PurchaseOrder;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate?: string;
  status: 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  createdAt: string;
}

export interface LedgerSummary {
  receivables: { total: number; collected: number; outstanding: number };
  payables: { total: number; paid: number; outstanding: number };
  monthlyCollections: number;
}

export interface PaymentFollowup {
  id: string;
  customerId: string;
  customer?: BusinessParty;
  proformaInvoiceId?: string;
  proformaInvoice?: ProformaInvoice;
  outstandingAmount: number;
  dueDate?: string;
  followupStatus: 'PENDING' | 'CONTACTED' | 'PROMISED_TO_PAY' | 'DISPUTED' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedUserId?: string;
  assignedUser?: { id: string; firstName: string; lastName: string; email: string };
  nextFollowupDate?: string;
  promisedPaymentDate?: string;
  promisedAmount?: number;
  notes?: string;
  communicationChannel: string;
  logs?: Array<{ id: string; notes: string; response?: string; createdAt: string; user?: { firstName: string; lastName: string } }>;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryDashboardStats {
  totalOutstanding: number;
  overdueAmount: number;
  dueTodayCount: number;
  dueThisWeekCount: number;
  promiseToPayCount: number;
  promiseToPayAmount: number;
  pendingFollowupsCount: number;
  collectedToday: number;
}

export interface CustomerLedgerEntry {
  id: string;
  serialNo: number;
  date: string;
  docType: 'PI' | 'SALES_ORDER' | 'PAYMENT' | 'OPENING';
  docRef: string;
  description: string;
  dueDate?: string | null;
  daysOverdue?: number;
  debit: number;
  credit: number;
  runningBalance: number;
  status?: string;
  notes?: string;
}

export interface CustomerLedgerStatement {
  customer: {
    id: string;
    legalName: string;
    tradeName?: string | null;
    gstin?: string | null;
    pan?: string | null;
    email?: string | null;
    phone?: string | null;
    paymentTermsDays: number;
    creditLimit?: number | null;
    customerType?: string | null;
    status: string;
    billingAddress?: any;
    primaryContact?: any;
  };
  company?: {
    legalName: string;
    tradeName?: string;
    gstin?: string;
    pan?: string;
    email?: string;
    phone?: string;
    address?: string;
    bankAccount?: {
      bankName: string;
      accountNumber: string;
      ifscCode: string;
      swiftCode?: string;
      branch: string;
    };
    signatory?: {
      name: string;
      designation: string;
      signatureUrl?: string | null;
    };
  };
  summary: {
    openingBalance: number;
    periodDebits: number;
    periodCredits: number;
    closingBalance: number;
    overdueAmount: number;
    daysOverdue: number;
    earliestDueDate: string | null;
    paymentTermsDays: number;
    currency: string;
    totalTransactions: number;
  };
  cadence: {
    currentStage: 'CURRENT' | 'REMINDER_1' | 'REMINDER_2' | 'REMINDER_3' | 'FINAL_NOTICE' | 'MANUAL_FOLLOWUP';
    lastReminderDate: string | null;
    nextReminderDate: string | null;
    followupStatus: string;
    priority: string;
    promisedPaymentDate?: string | null;
    promisedAmount?: number | null;
    notes?: string | null;
  };
  entries: CustomerLedgerEntry[];
  logs: Array<{
    id: string;
    notes: string;
    response?: string;
    createdAt: string;
    user?: { id: string; firstName: string; lastName: string };
  }>;
}

export interface FollowupTouchpointInput {
  channel: 'PHONE' | 'WHATSAPP' | 'VISIT' | 'EMAIL';
  notes: string;
  customerResponse?: string;
  promisedPaymentDate?: string;
  promisedAmount?: number;
  nextFollowupDate?: string;
  followupStatus?: string;
}

export interface SendLedgerEmailInput {
  to?: string | string[];
  cc?: string[];
  subject?: string;
  notes?: string;
  stage?: 'REMINDER_1' | 'REMINDER_2' | 'REMINDER_3' | 'FINAL_NOTICE' | 'MANUAL_EMAIL' | 'STATEMENT';
}

export interface ManualLedgerEntryInput {
  entryType: 'DEBIT' | 'CREDIT';
  nature?: 'OPENING_BALANCE' | 'PAST_INVOICE' | 'PAST_PAYMENT' | 'ADJUSTMENT';
  date: string;
  docRef: string;
  description: string;
  amount: number;
  paymentMethod?: string;
  dueDate?: string;
}

// ─── QR Code Subsystem ───────────────────────────────────────────────────────

export interface QrCode {
  id: string;
  entityType: string;
  entityId: string;
  token: string;
  qrData: string;
  status: string;
  createdAt: string;
}

export interface QrScanResult {
  success: boolean;
  type?: string;
  entityId?: string;
  token?: string;
  targetRoute?: string;
  data?: any;
  message?: string;
}

export interface PublicVerificationData {
  valid: boolean;
  message: string;
  document?: {
    documentType: string;
    documentNumber: string;
    companyName: string;
    partyName: string;
    date: string;
    currency: string;
    maskedAmount: string;
    status: string;
    verifiedAt: string;
  };
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  userId?: string;
  user?: { id: string; email: string; firstName: string; lastName: string };
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  timestamp: string;
}

// ─── Legacy & CMS Types (Maintained for backward compatibility) ───────────────

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'NEGOTIATING' | 'WON' | 'LOST' | 'INACTIVE';
export type LeadSource = 'WEBSITE' | 'CONFIGURATOR' | 'REFERRAL' | 'DIRECT' | 'SOCIAL' | 'EMAIL' | 'PHONE' | 'OTHER';

export interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  source: LeadSource;
  status: LeadStatus;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConfiguratorStatus = 'DRAFT' | 'SUBMITTED' | 'QUOTED' | 'CONVERTED';

export interface ConfiguratorDesign {
  id: string;
  designName?: string;
  configuration: Record<string, any>;
  estimatedPrice?: number;
  status: ConfiguratorStatus;
  leadId?: string;
  lead?: Pick<Lead, 'id' | 'firstName' | 'lastName' | 'email' | 'phone'>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type QuotationStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';

export interface QuotationItem {
  id: string;
  productId?: string;
  product?: Pick<Product, 'id' | 'name'>;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  leadId?: string;
  lead?: Pick<Lead, 'id' | 'firstName' | 'lastName' | 'email'>;
  designId?: string;
  status: QuotationStatus;
  validUntil?: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  notes?: string;
  terms?: string;
  items: QuotationItem[];
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'INQUIRY' | 'DESIGN' | 'PROPOSAL' | 'APPROVED' | 'IN_PROGRESS' | 'INSTALLATION' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';

export interface CommercialProject {
  id: string;
  title: string;
  clientName: string;
  clientCompany?: string;
  description?: string;
  location?: string;
  status: ProjectStatus;
  budget?: number;
  startDate?: string;
  endDate?: string;
  completedAt?: string;
  images: string[];
  tags: string[];
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  quotationId?: string;
  projectId?: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate?: string;
  paidAt?: string;
  subtotal: number;
  installationCharge?: number;
  installationRatePerCubicle?: number;
  installationCubicleCount?: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type BlogStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  coverImageUrl?: string;
  status: BlogStatus;
  publishedAt?: string;
  tags: string[];
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryImage {
  id: string;
  title?: string;
  description?: string;
  imageUrl: string;
  category?: string;
  tags: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface Catalog {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  coverUrl?: string;
  category?: string;
  downloadCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Testimonial {
  id: string;
  clientName: string;
  company?: string;
  designation?: string;
  message: string;
  rating?: number;
  avatarUrl?: string;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface DashboardStats {
  overview: {
    totalProducts: number;
    totalLeads: number;
    newLeads: number;
    totalQuotations: number;
    pendingQuotations: number;
    totalProjects: number;
    activeProjects: number;
    totalInvoices: number;
    paidInvoices: number;
    configuratorDesigns: number;
  };
  revenue: {
    paid: number;
    pending: number;
  };
  recentLeads: Lead[];
  recentDesigns: ConfiguratorDesign[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: { field: string; message: string }[];
}

// ─── Sales Quotation Letter System ──────────────────────────────────────────

export type SalesQuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED' | 'EXPIRED';

export interface SalesQuotationItem {
  id?: string;
  serialNumber: number;
  itemDescription: string;
  specifications?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  hsnCode?: string;
  boardType?: string;
  cubicleSize?: string;
  boardColor?: string;
  boardThickness?: string;
  doorSize?: string;
  overallHeight?: string;
  hardwarePackage?: string;
  customSpecsJson?: any;
}

export interface SalesQuotationRevision {
  id: string;
  revisionNumber: number;
  date: string;
  totalAmount: number;
  snapshotData?: any;
  reason?: string;
  createdAt: string;
}

export interface QuotationContentTemplate {
  id: string;
  category: 'BODY_PARAGRAPH' | 'SPECIFICATION' | 'ACCESSORY_NOTE' | 'TERMS_CONDITION';
  title: string;
  content: string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface SalesQuotation {
  id: string;
  quotationNumber: string;
  referenceNumber?: string;
  revisionNumber: number;
  date: string;
  validUntil?: string;
  customerId: string;
  customer?: BusinessParty;
  companyProfileId: string;
  companyProfile?: CompanyProfile;
  preparedById?: string;
  preparedBy?: AdminUser;
  staffName?: string;
  staffDesignation?: string;
  staffPhone?: string;
  staffEmail?: string;
  siteName?: string;
  siteAddress?: string;
  projectName?: string;
  recipientSalutation?: string;
  recipientName?: string;
  recipientCompany?: string;
  recipientAddress?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  subject: string;
  salutation: string;
  openingParagraph?: string;
  closingParagraph?: string;
  basicPrice?: number;
  installationCharge?: number;
  installationRatePerCubicle?: number;
  installationCubicleCount?: number;
  freightTerms?: string;
  freightAmount?: number;
  gstRate?: number;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  gstAmount?: number;
  totalTax: number;
  grandTotal: number;
  currency: string;
  isSez: boolean;
  isSezExempt?: boolean;
  sezCertificateRef?: string;
  sezDeclarationNote?: string;
  specificationNotes?: string;
  accessoriesNotes?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  warrantyText?: string;
  accessoriesText?: string;
  generalTerms?: string;
  otherTerms?: string;
  termsAndConditions?: string;
  notes?: string;
  status: SalesQuotationStatus;
  sentAt?: string;
  convertedAt?: string;
  convertedOrderId?: string;
  convertedPiId?: string | null;
  items: SalesQuotationItem[];
  revisions?: SalesQuotationRevision[];
  nextFollowupDate?: string;
  followupStatus?: string;
  lastFollowupDate?: string;
  followupCount?: number;
  followups?: QuotationFollowup[];
  createdAt: string;
  updatedAt: string;
}

export type QuotationFollowupChannel = 'CALL' | 'WHATSAPP' | 'EMAIL' | 'SMS' | 'IN_PERSON' | 'OTHER';
export type QuotationFollowupStatus = 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'NO_ANSWER' | 'INTERESTED' | 'PRICE_NEGOTIATION' | 'ORDER_CONFIRMED' | 'DROPPED' | 'CALLBACK_REQUESTED';

export interface QuotationFollowup {
  id: string;
  quotationId: string;
  channel: QuotationFollowupChannel;
  status: QuotationFollowupStatus;
  discussionNotes: string;
  nextFollowupDate?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  performedById?: string | null;
  performedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Central Sales Order Hub ────────────────────────────────────────────────

export type SalesOrderStatus =
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'WAITING_FOR_ADVANCE'
  | 'APPROVED'
  | 'PI_ISSUED'
  | 'IN_PRODUCTION'
  | 'PARTIALLY_DISPATCHED'
  | 'FULLY_DISPATCHED'
  | 'COMPLETED'
  | 'CANCELLED';

export type SalesOrderSource =
  | 'FROM_QUOTATION'
  | 'CONVERTED_QUOTATION'
  | 'CONVERTED_PROFORMA'
  | 'DIRECT'
  | 'DIRECT_ENTRY'
  | 'B2B_SELF_SERVICE'
  | 'CUSTOMER_PO_UPLOAD';

export interface SalesOrderItem {
  id?: string;
  serialNumber: number;
  productId?: string;
  description?: string;
  itemDescription?: string;
  quantity: number;
  dispatchedQuantity?: number;
  remainingQuantity?: number;
  unit: string;
  rate?: number;
  unitPrice?: number;
  taxableAmount?: number;
  gstRate?: number;
  gstAmount?: number;
  amount?: number;
  totalAmount?: number;
  boardType?: string;
  cubicleSize?: string;
  boardColor?: string;
  boardThickness?: string;
  doorSize?: string;
  overallHeight?: string;
  hardwarePackage?: string;
  specsJson?: any;
}

export interface SalesOrderStatusHistory {
  id: string;
  fromStatus: string;
  toStatus: string;
  comment?: string;
  reason?: string;
  changedById?: string;
  changedBy?: { firstName: string; lastName: string };
  createdAt: string;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  customerId: string;
  customer?: BusinessParty;
  companyProfileId: string;
  companyProfile?: CompanyProfile;
  quotationId?: string;
  quotationRef?: string;
  quotation?: { id: string; quotationNumber?: string; referenceNumber?: string };
  source: SalesOrderSource;
  clientPoNumber?: string;
  clientPoDate?: string;
  customerPoNumber?: string;
  customerPoDate?: string;
  siteName?: string;
  siteAddress?: string;
  placeOfSupply?: string;
  placeOfSupplyStateCode?: string;
  subtotal: number;
  installationCharge?: number;
  installationRatePerCubicle?: number;
  installationCubicleCount?: number;
  freightAmount?: number;
  discountAmount?: number;
  taxableAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  taxAmount?: number;
  totalTax?: number;
  grandTotal: number;
  totalAmount?: number;
  advancePercentage?: number;
  advanceRequiredAmount?: number;
  advanceReceivedAmount?: number;
  advancePaymentStatus?: string;
  currency?: string;
  status: SalesOrderStatus;
  statusReason?: string;
  approvedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  notes?: string;
  accessoriesText?: string | null;
  termsJson?: any;
  termsAndConditions?: string;
  billingAddressSnapshot?: any;
  shippingAddressSnapshot?: any;
  siteContactSnapshot?: any;
  proformaInvoiceId?: string | null;
  piNumber?: string | null;
  items: SalesOrderItem[];
  proformaInvoices?: ProformaInvoice[];
  packingLists?: PackingList[];
  hardwareIssueLists?: HardwareIssueList[];
  dispatchRecords?: DispatchRecord[];
  invoices?: any[];
  statusHistory?: SalesOrderStatusHistory[];
  nextFollowupDate?: string | null;
  followupStatus?: string | null;
  lastFollowupDate?: string | null;
  followupCount?: number;
  followups?: SalesOrderFollowup[];
  createdAt: string;
  updatedAt: string;
}

export type OrderDocumentTimelineType =
  | 'QUOTATION'
  | 'PI'
  | 'ORDER'
  | 'INVOICE'
  | 'PACKING_LIST'
  | 'DISPATCH'
  | 'HARDWARE_ISSUE'
  | 'PAYMENT';

export interface OrderDocumentTimelineItem {
  id: string;
  type: OrderDocumentTimelineType;
  stageNumber?: number;
  referenceNumber: string;
  title: string;
  date: string;
  status: string;
  amount?: number;
  pdfUrl?: string;
  metadata?: Record<string, any>;
}

export interface DispatchRecord {
  id: string;
  dispatchNumber: string;
  orderId?: string | null;
  packingListId?: string | null;
  customerId?: string | null;
  transporterName?: string | null;
  vehicleNumber?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  lrNumber?: string | null;
  lrDate?: string | null;
  ewayBillNumber?: string | null;
  dispatchDate: string;
  totalPackages?: number | null;
  status: 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'ACKNOWLEDGED' | string;
  termsAndConditions?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  order?: SalesOrder;
  packingList?: PackingList;
}

export type SalesOrderFollowupChannel = 'CALL' | 'WHATSAPP' | 'EMAIL' | 'SMS' | 'IN_PERSON' | 'OTHER';

export type SalesOrderFollowupStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'SITE_MEASUREMENT_PENDING'
  | 'ADVANCE_PAYMENT_PENDING'
  | 'PRODUCTION_HOLD'
  | 'FABRICATION_IN_PROGRESS'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'DELIVERY_CONFIRMED'
  | 'CANCELLED';

export interface SalesOrderFollowup {
  id: string;
  orderId: string;
  channel: SalesOrderFollowupChannel;
  status: SalesOrderFollowupStatus;
  discussionNotes: string;
  nextFollowupDate?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  performedById?: string | null;
  performedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Packing List System ───────────────────────────────────────────────────

export interface PackingListItem {
  id?: string;
  serialNumber: number;
  description: string;
  size?: string;
  designNo?: string;
  quantity: number;
  noOfPackets?: number;
  natureOfPacket?: string;
}

export interface PacketNatureLookup {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface PackingList {
  id: string;
  packingListNumber: string;
  orderId?: string;
  order?: { id: string; orderNumber: string; status: string };
  proformaInvoiceId?: string;
  proformaInvoice?: { id: string; piNumber: string };
  customerId: string;
  customer?: BusinessParty;
  companyProfileId: string;
  date: string;
  consignorName: string;
  consignorAddress: string;
  shipToName: string;
  shipToAddress: string;
  siteContactName?: string;
  siteContactPhone?: string;
  isPartialDispatch: boolean;
  isStandalone: boolean;
  totalQuantity: number;
  totalPackages?: number;
  receiptStatus: 'DISPATCHED' | 'DELIVERED' | 'ACKNOWLEDGED';
  checkedByName?: string;
  authorisedSignatoryName?: string;
  digitalAckToken?: string;
  receivedByName?: string;
  receivedByPhone?: string;
  receivedAt?: string;
  receiptSignatureData?: string;
  notes?: string;
  items: PackingListItem[];
  createdAt: string;
  updatedAt: string;
}

// ─── Hardware Catalog & Issue Lists ─────────────────────────────────────────

export interface HardwareCatalogItem {
  id: string;
  name: string;
  category: string;
  defaultSize?: string;
  defaultColor?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface HardwareIssueListItem {
  id?: string;
  serialNumber: number;
  hardwareCatalogItemId?: string;
  catalogItem?: HardwareCatalogItem;
  description: string;
  category: string;
  color?: string;
  size?: string;
  quantity: number;
  remarks?: string;
  isCustomItem: boolean;
}

export interface HardwareIssueList {
  id: string;
  issueNumber: string;
  date: string;
  customerId: string;
  customer?: BusinessParty;
  orderId?: string;
  order?: { id: string; orderNumber: string };
  proformaInvoiceId?: string;
  proformaInvoice?: { id: string; piNumber: string };
  buyerName: string;
  buyerAddress: string;
  projectName?: string;
  status: 'ISSUED' | 'CHECKED' | 'VERIFIED';
  storeKeeperName?: string;
  storeKeeperSignedAt?: string;
  packedByName?: string;
  packedBySignedAt?: string;
  checkedByName?: string;
  checkedBySignedAt?: string;
  inchargeName?: string;
  inchargeSignedAt?: string;
  items: HardwareIssueListItem[];
  createdAt: string;
  updatedAt: string;
}

// ─── Customer Deduplication & Merge Logs ────────────────────────────────────

export interface CustomerMergeLog {
  id: string;
  canonicalCustomerId: string;
  mergedCustomerId: string;
  mergedPartySnapshot: any;
  reason?: string;
  mergedById?: string;
  createdAt: string;
}

// ─── Export & International Trade Management Module Types ─────────────────────

export interface ExportCountry {
  id: string;
  countryCode: string;
  name: string;
  region?: string;
  currencyCode?: string;
  dialCode?: string;
  requiresCoo: boolean;
  requiresLegalization: boolean;
  inspectionAgency?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rules?: ExportCountryRule[];
  ports?: ExportPort[];
  _count?: { ports?: number; customerProfiles?: number; orders?: number };
}

export interface ExportCountryRule {
  id: string;
  countryId: string;
  country?: ExportCountry;
  ruleType: string;
  ruleKey: string;
  ruleValue?: string;
  requiredDocChecklist: any;
  restrictedHsCodes: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExportPort {
  id: string;
  countryId?: string;
  country?: ExportCountry;
  portCode: string;
  name: string;
  portType: 'SEA' | 'AIR' | 'LAND';
  unLocode?: string;
  customsStationCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExportIncoterm {
  id: string;
  code: string;
  name: string;
  freightResponsibility?: string;
  insuranceResponsibility?: string;
  riskTransferPoint?: string;
  customsExportResponsibility?: string;
  customsImportResponsibility?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExportCurrency {
  id: string;
  currencyCode: string;
  name: string;
  symbol?: string;
  isBase: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rates?: ExportExchangeRate[];
}

export interface ExportExchangeRate {
  id: string;
  currencyId: string;
  currency?: ExportCurrency;
  rateToInr: number;
  rateToUsd: number;
  effectiveDate: string;
  source: string;
  createdAt: string;
}

export interface ExportHsCode {
  id: string;
  hsCode: string;
  description: string;
  chapter?: string;
  dutyRate: number;
  rodtepRate: number;
  drawbackRate: number;
  gstRate: number;
  requiresInspection: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExportCustomerProfile {
  id: string;
  partyId: string;
  party?: BusinessParty;
  countryId?: string;
  country?: ExportCountry;
  foreignTaxId?: string;
  vatTrn?: string;
  defaultIncotermId?: string;
  defaultIncoterm?: ExportIncoterm;
  defaultCurrency: string;
  defaultDestinationPortId?: string;
  defaultDestinationPort?: ExportPort;
  creditTermsDays: number;
  creditLimitUsd: number;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH';
  complianceStatus: 'VERIFIED' | 'PENDING' | 'RESTRICTED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportCustomerBankAccount {
  id: string;
  partyId: string;
  bankName: string;
  swiftBic?: string;
  iban?: string;
  accountNumberMasked?: string;
  routingNumber?: string;
  currency: string;
  countryId?: string;
  country?: ExportCountry;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExportCustomer360 {
  party: BusinessParty & {
    exportCustomerProfile?: ExportCustomerProfile;
    exportBankAccounts?: ExportCustomerBankAccount[];
    contacts?: PartyContact[];
    addresses?: PartyAddress[];
    exportOrders?: ExportOrder[];
    exportQuotations?: ExportQuotation[];
    exportRfqs?: ExportRfq[];
    exportEmails?: ExportEmailLog[];
  };
  tradeMetrics: {
    totalOrdersCount: number;
    lifetimeTradeValueUsd: number;
    lifetimeFobValueUsd: number;
    lifetimeRealizedUsd: number;
    outstandingBalanceUsd: number;
  };
}

export interface ExportRfqItem {
  id?: string;
  productId?: string;
  itemDescription: string;
  quantity: number;
  unit: string;
  targetRate?: number;
  notes?: string;
}

export interface ExportRfq {
  id: string;
  rfqNumber: string;
  partyId: string;
  party?: BusinessParty;
  countryId?: string;
  country?: ExportCountry;
  incotermId?: string;
  incoterm?: ExportIncoterm;
  destinationPortId?: string;
  destinationPort?: ExportPort;
  targetDeliveryDate?: string;
  currency: string;
  estimatedValue: number;
  status: 'RECEIVED' | 'ANALYSIS' | 'QUOTED' | 'WON' | 'LOST' | 'EXPIRED';
  notes?: string;
  items?: ExportRfqItem[];
  _count?: { quotations?: number };
  createdAt: string;
  updatedAt: string;
}

export interface ExportQuotationItem {
  id?: string;
  productId?: string;
  hsCodeId?: string;
  itemCode?: string;
  description: string;
  quantity: number;
  unit: string;
  unitRate: number;
  totalAmount: number;
  cbm?: number;
  grossWeightKg?: number;
  netWeightKg?: number;
}

export interface ExportQuotation {
  id: string;
  quotationNumber: string;
  rfqId?: string;
  rfq?: ExportRfq;
  partyId: string;
  party?: BusinessParty;
  companyProfileId?: string;
  companyProfile?: CompanyProfile;
  countryId?: string;
  country?: ExportCountry;
  incotermId?: string;
  incoterm?: ExportIncoterm;
  portOfLoadingId?: string;
  portOfLoading?: ExportPort;
  portOfDestinationId?: string;
  portOfDestination?: ExportPort;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  freightCharges: number;
  insuranceCharges: number;
  otherCharges: number;
  totalAmount: number;
  fobValue: number;
  validUntil?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';
  notes?: string;
  items?: ExportQuotationItem[];
  createdAt: string;
  updatedAt: string;
}

export type ExportOrderStage =
  | 'ORDER_CONFIRMED'
  | 'ADVANCE_RECEIVED'
  | 'IN_PRODUCTION'
  | 'PACKED'
  | 'CUSTOMS_CLEARED'
  | 'ON_BOARD'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'REALIZED'
  | 'CLOSED'
  | 'CANCELLED';

export interface ExportPaymentMilestone {
  id: string;
  exportOrderId: string;
  milestoneName: string;
  percentage: number;
  amount: number;
  currency: string;
  dueDate?: string;
  isPaid: boolean;
  paidAmount?: number;
  paidDate?: string;
  paymentId?: string;
  payment?: Payment;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportLc {
  id: string;
  exportOrderId: string;
  lcNumber: string;
  issuingBank: string;
  advisingBank?: string;
  amount: number;
  currency: string;
  issueDate?: string;
  expiryDate?: string;
  latestShipmentDate?: string;
  tolerancePercentage: number;
  lcType: string;
  status: string;
  discrepancyNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportContainer {
  id: string;
  shipmentId: string;
  containerNumber: string;
  containerType: string;
  sealNumber?: string;
  tareWeightKg: number;
  payloadWeightKg: number;
  grossWeightKg: number;
  cbm: number;
  stuffingDate?: string;
  gateInDate?: string;
  qrCodeId?: string;
  qrCode?: QrCode;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportShippingEvent {
  id: string;
  shipmentId: string;
  containerId?: string;
  eventType: string;
  eventLocation?: string;
  eventTimestamp: string;
  source: string;
  notes?: string;
  createdAt: string;
}

export interface ExportShipment {
  id: string;
  shipmentNumber: string;
  exportOrderId: string;
  exportOrder?: ExportOrder;
  shippingLine?: string;
  forwarderPartnerId?: string;
  forwarderPartner?: BusinessParty;
  bookingNumber?: string;
  vesselName?: string;
  voyageNumber?: string;
  blAwbNumber?: string;
  blType: string;
  blDate?: string;
  etd?: string;
  eta?: string;
  actualDeparture?: string;
  actualArrival?: string;
  portOfLoadingId?: string;
  portOfLoading?: ExportPort;
  portOfDestinationId?: string;
  portOfDestination?: ExportPort;
  freightTerm: string;
  status: string;
  notes?: string;
  containers?: ExportContainer[];
  shippingEvents?: ExportShippingEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface ExportShippingBill {
  id: string;
  exportOrderId: string;
  customsRecordId?: string;
  sbNumber: string;
  sbDate?: string;
  portCode?: string;
  fobValueInr: number;
  drawbackClaimed: number;
  rodtepClaimed: number;
  leoDate?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportCustomsRecord {
  id: string;
  exportOrderId: string;
  countryId?: string;
  country?: ExportCountry;
  filingType: string;
  chaPartnerId?: string;
  chaPartner?: BusinessParty;
  status: string;
  assessmentDate?: string;
  examDate?: string;
  letExportOrderDate?: string;
  customsOfficerNotes?: string;
  shippingBills?: ExportShippingBill[];
  createdAt: string;
  updatedAt: string;
}

export interface ExportComplianceCheck {
  id: string;
  exportOrderId: string;
  partyId?: string;
  party?: BusinessParty;
  screeningType: string;
  status: 'PASSED' | 'REVIEW_REQUIRED' | 'BLOCKED' | 'OVERRIDDEN';
  matchedList?: string;
  riskScore: number;
  reviewedById?: string;
  reviewedBy?: { id: string; firstName: string; lastName: string };
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportCertificate {
  id: string;
  exportOrderId: string;
  certificateType: string;
  certificateNumber?: string;
  issuingAuthority?: string;
  issueDate?: string;
  expiryDate?: string;
  fileUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportExpense {
  id: string;
  exportOrderId: string;
  shipmentId?: string;
  shipment?: ExportShipment;
  expenseType: string;
  vendorId?: string;
  vendor?: BusinessParty;
  amount: number;
  currency: string;
  exchangeRate: number;
  amountInr: number;
  invoiceNumber?: string;
  isPaid: boolean;
  paidDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportIrm {
  id: string;
  bankRealizationId: string;
  irmNumber: string;
  irmDate?: string;
  amount: number;
  currency: string;
  remitterName?: string;
  swiftRef?: string;
  createdAt: string;
}

export interface ExportEbrc {
  id: string;
  bankRealizationId: string;
  ebrcNumber: string;
  ebrcDate?: string;
  dgftStatus: string;
  fobValueRealized: number;
  createdAt: string;
}

export interface ExportBankRealization {
  id: string;
  exportOrderId: string;
  exportOrder?: { id: string; exportOrderNumber: string; party?: { legalName: string } };
  invoiceNumber?: string;
  paymentId?: string;
  payment?: Payment;
  realizedAmount: number;
  currency: string;
  realizedAmountInr: number;
  realizationDate?: string;
  adBankCode?: string;
  adBankName?: string;
  bankRefNumber?: string;
  status: string;
  notes?: string;
  irms?: ExportIrm[];
  ebrcs?: ExportEbrc[];
  createdAt: string;
  updatedAt: string;
}

export interface ExportDocument {
  id: string;
  entityType: string;
  entityId: string;
  documentType: string;
  title: string;
  fileUrl: string;
  fileSize: number;
  version: number;
  status: string;
  uploadedById?: string;
  uploadedBy?: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface ExportTask {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  department: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  slaHours: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  assignedToUserId?: string;
  assignedToUser?: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface ExportEmailTemplate {
  id: string;
  templateCode: string;
  name: string;
  subjectTemplate: string;
  bodyTemplateHtml: string;
  variables: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExportEmailLog {
  id: string;
  exportOrderId?: string;
  exportOrder?: { exportOrderNumber: string };
  partyId?: string;
  party?: { legalName: string };
  recipientEmail: string;
  ccEmails?: string;
  bccEmails?: string;
  subject: string;
  bodyHtml: string;
  templateCode?: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED';
  provider: string;
  providerMessageId?: string;
  errorMessage?: string;
  attachments: Array<{ filename: string }>;
  sentByUserId?: string;
  sentByUser?: { id: string; firstName: string; lastName: string; email: string };
  sentAt: string;
  createdAt: string;
}

export interface ExportProfitability {
  revenueUsd: number;
  subtotalUsd: number;
  freightCostUsd: number;
  insuranceCostUsd: number;
  revenueInr: number;
  totalExpensesInr: number;
  netProfitInr: number;
  netProfitMarginPct: number;
  exchangeRate: number;
}

export interface ExportOrder {
  id: string;
  exportOrderNumber: string;
  salesOrderId?: string;
  salesOrder?: SalesOrder;
  partyId: string;
  party?: BusinessParty;
  companyProfileId?: string;
  companyProfile?: CompanyProfile;
  countryId?: string;
  country?: ExportCountry;
  incotermId?: string;
  incoterm?: ExportIncoterm;
  portOfLoadingId?: string;
  portOfLoading?: ExportPort;
  portOfDestinationId?: string;
  portOfDestination?: ExportPort;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  freightCost: number;
  insuranceCost: number;
  totalOrderValue: number;
  fobValue: number;
  commercialInvoiceNumber?: string;
  buyerPoNumber?: string;
  buyerPoDate?: string;
  paymentMethod: string;
  stage: ExportOrderStage;
  status: string;
  notes?: string;
  paymentMilestones?: ExportPaymentMilestone[];
  lcs?: ExportLc[];
  shipments?: ExportShipment[];
  customsRecords?: ExportCustomsRecord[];
  shippingBills?: ExportShippingBill[];
  complianceChecks?: ExportComplianceCheck[];
  certificates?: ExportCertificate[];
  expenses?: ExportExpense[];
  bankRealizations?: ExportBankRealization[];
  emailLogs?: ExportEmailLog[];
  _count?: {
    shipments?: number;
    paymentMilestones?: number;
    expenses?: number;
    bankRealizations?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ExportOrder360 {
  order: ExportOrder;
  profitability: ExportProfitability;
  realizationProgress: {
    totalRealizedUsd: number;
    outstandingUsd: number;
    realizationPercentage: number;
  };
}

export interface ExportDashboardStats {
  totalOrders: number;
  activeOrders: number;
  totalOrderValueUsd: number;
  fobValueUsd: number;
  realizedAmountUsd: number;
  realizedAmountInr: number;
  countriesCount: number;
  totalContainers: number;
  inTransitShipments: number;
  pendingTasks: number;
  ordersByStage: Array<{ stage: string; _count: { id: number }; _sum: { totalOrderValue: number; fobValue: number } }>;
  recentRealizations: ExportBankRealization[];
  recentEmails: ExportEmailLog[];
}

// ─── Products & Models Management Catalog Types ──────────────────────────────

export type ProductCategoryType = 'Cubicle' | 'Lockers' | 'Urinal Partitions' | 'Kids Toilet';

export type HardwareMaterialType = 'SS Hardware' | 'Nylon Hardware' | 'Aluminium Profile' | 'Standard' | 'Both';

export type SSHardwareColor = 'golden' | 'Black' | 'stainless steel';

export interface ModelHardwareOption {
  material: HardwareMaterialType;
  enabled: boolean;
  colors?: SSHardwareColor[];
}

export interface ModelHardwareItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  material?: HardwareMaterialType;
  notes?: string;
  isExtraLeg?: boolean;
}

export interface ProductModelColor {
  name: string;
  imageUrl: string;
}

export interface ProductCatalogModel {
  id: string;
  slug: string;
  title: string;
  category: ProductCategoryType;
  subtitle: string;
  description: string;
  imageUrl: string;
  additionalImages?: string[];
  videos?: string[];
  videoUrls?: string[];
  colors?: ProductModelColor[];
  hardwareOptions?: ModelHardwareOption[];
  hardwareList: ModelHardwareItem[];
  specifications: Array<{ label: string; value: string }>;
  features?: string[];
  applications?: string[];
  hasExtraLeg?: boolean;
  tierCount?: number | string;
  sortOrder?: number;
  published?: boolean;
  isFeatured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TopProductCategory {
  id: string;
  key: ProductCategoryType;
  name: string;
  tagline: string;
  description: string;
  imageUrl: string;
  modelCount: number;
}

// ─── Board Inventory Management System ───────────────────────────────────────

export type BoardMovementType =
  | 'INWARD'
  | 'ISSUE_AUTO'
  | 'ISSUE_MANUAL'
  | 'ADJUSTMENT_ADD'
  | 'ADJUSTMENT_SUB'
  | 'RETURN_VENDOR';

export interface BoardInventoryItem {
  id: string;
  itemCode: string;
  serialNumber: number;
  category?: 'RESTROOM_CUBICLE' | 'LOCKER_BOARD' | 'URINAL_PARTITION' | 'STORE_HARDWARE' | string;
  warehouse?: 'DELHI' | 'KOLKATA' | string;
  designNo: string;
  designName?: string | null;
  size: string;
  thickness: string;
  boardType: string;
  vendorId: string;
  vendorName?: string | null;
  openingStock: number | string;
  currentStock: number | string;
  totalInward: number | string;
  totalIssued: number | string;
  reorderLevel: number | string;
  unit: string;
  unitCost?: number | string | null;
  locationRack?: string | null;
  status: 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCONTINUED';
  notes?: string | null;
  lastAlertSentAt?: string | null;
  createdAt: string;
  updatedAt: string;
  vendor?: {
    id: string;
    partyId: string;
    party: {
      legalName: string;
      tradeName?: string | null;
      phone?: string | null;
      email?: string | null;
    };
  };
  movements?: BoardStockMovement[];
}

export interface BoardStockMovement {
  id: string;
  movementNumber: string;
  inventoryItemId: string;
  warehouse?: string;
  movementType: BoardMovementType;
  movementDate: string;
  quantity: number | string;
  stockBefore: number | string;
  stockAfter: number | string;
  supplierInvoiceNo?: string | null;
  supplierInvoiceDate?: string | null;
  batchLotNo?: string | null;
  unitCost?: number | string | null;
  totalValue?: number | string | null;
  issueListId?: string | null;
  issueListNumber?: string | null;
  dispatchRecordId?: string | null;
  packingListId?: string | null;
  orderId?: string | null;
  issueReference?: string | null;
  issuedToPerson?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
  inventoryItem?: {
    id: string;
    itemCode: string;
    designNo: string;
    designName?: string | null;
    size: string;
    thickness: string;
    boardType: string;
    vendorName?: string | null;
  };
}

export interface BoardSupplier {
  id: string;
  partyId: string;
  name: string;
  legalName: string;
  vendorType: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  totalSkus: number;
  totalSheets: number;
}

export interface BoardAnalyticsSummary {
  totalSkus: number;
  totalSheets: number;
  totalValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
  periodInward: number;
  periodIssued: number;
  supplierDistribution: Record<string, { skus: number; sheets: number; valuation: number }>;
  thicknessDistribution: Record<string, number>;
  boardTypeDistribution: Record<string, number>;
}

export interface InwardStockInput {
  inventoryItemId: string;
  quantity: number;
  supplierInvoiceNo?: string;
  supplierInvoiceDate?: string;
  batchLotNo?: string;
  unitCost?: number;
  notes?: string;
  createdById?: string;
}

export interface ManualIssueInput {
  inventoryItemId: string;
  quantity: number;
  issueReference?: string;
  issuedToPerson?: string;
  notes?: string;
  createdById?: string;
}

export interface AutoDeductInput {
  issueListId: string;
  issueListNumber: string;
  orderId?: string;
  packingListId?: string;
  dispatchRecordId?: string;
  issueReference?: string;
  issuedToPerson?: string;
  items: Array<{
    designNo: string;
    thickness?: string;
    size?: string;
    quantity: number;
  }>;
  createdById?: string;
}

export interface CreateBoardItemInput {
  category?: 'RESTROOM_CUBICLE' | 'LOCKER_BOARD' | 'URINAL_PARTITION' | 'STORE_HARDWARE' | string;
  warehouse?: 'DELHI' | 'KOLKATA' | string;
  designNo: string;
  designName?: string;
  size: string;
  thickness: string;
  boardType: string;
  vendorId: string;
  vendorName?: string;
  openingStock?: number;
  reorderLevel?: number;
  unitCost?: number;
  locationRack?: string;
  notes?: string;
}

export interface UpdateBoardItemInput {
  designNo?: string;
  designName?: string;
  size?: string;
  thickness?: string;
  boardType?: string;
  reorderLevel?: number;
  unitCost?: number;
  locationRack?: string;
  notes?: string;
}
