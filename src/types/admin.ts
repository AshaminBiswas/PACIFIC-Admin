// Pacific Admin — TypeScript Type Definitions

export type AdminView =
  | 'dashboard'
  | 'products'
  | 'product-categories'
  | 'products-master'
  | 'customers'
  | 'vendors'
  | 'purchase-orders'
  | 'proforma-invoices'
  | 'sales-quotations'
  | 'sales-orders'
  | 'packing-lists'
  | 'hardware-issues'
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
  | 'settings';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AdminUser;
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
  status: string;
  notes?: string;
  customerProfile?: CustomerProfile;
  vendorProfile?: VendorProfile;
  contacts?: PartyContact[];
  addresses?: PartyAddress[];
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
  subtotal: number;
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
  parties?: ProformaInvoiceParty[];
  items?: ProformaInvoiceItem[];
  taxSummary?: ProformaInvoiceTaxSummary[];
  terms?: { clauseNumber: number; text: string }[];
  qrCodes?: QrCode[];
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
  subject: string;
  salutation: string;
  openingParagraph?: string;
  closingParagraph?: string;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  grandTotal: number;
  currency: string;
  isSez: boolean;
  sezDeclarationNote?: string;
  specificationNotes?: string;
  accessoriesNotes?: string;
  termsAndConditions?: string;
  status: SalesQuotationStatus;
  sentAt?: string;
  convertedAt?: string;
  convertedOrderId?: string;
  items: SalesQuotationItem[];
  revisions?: SalesQuotationRevision[];
  createdAt: string;
  updatedAt: string;
}

// ─── Central Sales Order Hub ────────────────────────────────────────────────

export type SalesOrderStatus = 'PENDING' | 'APPROVED' | 'PARTIALLY_DISPATCHED' | 'FULLY_DISPATCHED' | 'CANCELLED';

export interface SalesOrderItem {
  id?: string;
  serialNumber: number;
  productId?: string;
  itemDescription: string;
  quantity: number;
  dispatchedQuantity: number;
  remainingQuantity: number;
  unit: string;
  unitPrice: number;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
}

export interface SalesOrderStatusHistory {
  id: string;
  fromStatus: string;
  toStatus: string;
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
  quotation?: { id: string; quotationNumber: string };
  source: 'FROM_QUOTATION' | 'DIRECT';
  clientPoNumber?: string;
  clientPoDate?: string;
  siteName?: string;
  siteAddress?: string;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  totalTax: number;
  grandTotal: number;
  status: SalesOrderStatus;
  approvedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  items: SalesOrderItem[];
  proformaInvoices?: ProformaInvoice[];
  packingLists?: PackingList[];
  hardwareIssueLists?: HardwareIssueList[];
  statusHistory?: SalesOrderStatusHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderDocumentTimelineItem {
  id: string;
  type: 'QUOTATION' | 'ORDER' | 'PI' | 'PACKING_LIST' | 'HARDWARE_ISSUE' | 'PAYMENT';
  referenceNumber: string;
  title: string;
  date: string;
  status: string;
  amount?: number;
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

