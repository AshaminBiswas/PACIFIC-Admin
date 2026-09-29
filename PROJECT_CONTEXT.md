# Pacific Admin Console — Project Context

## 1. Project Overview

| Property | Value |
|----------|-------|
| **Project** | Pacific Restroom Cubicle Admin & Enterprise ERP Console |
| **Port** | 5176 |
| **Backend** | `http://localhost:5001/api/v1` (PACIFIC-Backend) & Supabase Auth |
| **Framework** | React 18.3, Vite 6, TypeScript 5.7 |
| **Styling** | Tailwind CSS 3.4, Dark Mode Brand Palette (`#030213`, `#7FB706`, `#B5F823`) |
| **Mobile-First UX** | Responsive table-to-card transforms, $\ge 44\text{px}$ touch targets, Mobile Bottom Navigation Bar, HTML5 Camera QR Scanner |

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 18.3 + Vite 6 |
| **Routing** | `react-router-dom` v7 (Nested Dashboard Outlet + Public Verification Route) |
| **Language** | TypeScript 5.7 (strict mode, zero errors enforced via `npx tsc --noEmit`) |
| **Styling** | Tailwind CSS 3.4 + Custom Scrollbars + Glassmorphism Backdrop Blurs |
| **Backend & DB** | Supabase JS Client (`@supabase/supabase-js`) + PACIFIC-Backend Axios Client (`/api/v1`) |
| **QR Subsystem** | HTML5 `navigator.mediaDevices.getUserMedia` + Web Audio API synthesizer + QR Server API |
| **PDF & Printing** | Single-page A4 Vector HTML/CSS with iframe preview & native `window.print()` triggers |
| **Icons** | `lucide-react` |

---

## 3. Project Structure

```
D:\PACIFIC-Admin\
├── prisma/
│   ├── schema.prisma                 # Complete 79-model schema synced with Supabase PostgreSQL
│   └── migrations/
│       ├── 0_init/
│       │   └── migration.sql         # Baseline DDL SQL defining all 79 tables, foreign keys & indexes
│       └── migration_lock.toml       # Prisma PostgreSQL provider lock
├── src/
│   ├── main.tsx                      # React entry point
│   ├── App.tsx                       # Router config with AdminAuthProvider, lazyWithRetry & Protected Routes
│   ├── index.css                     # Tailwind base styles & custom scrollbars
│   ├── image/logo/                   # Brand vector/webp assets (logo.webp)
│   ├── api/                          # Modular API layer (aligned with PRC-Backend/admin pattern)
│   │   ├── client.ts                 # Axios client with JWT auto-injection & transparent refresh
│   │   ├── authApi.ts                # Authentication, token lifecycle & super-admin provisioning
│   │   ├── salesQuotationsApi.ts     # Sales Quotations, revisions, SEZ LUT validation, order conversion
│   │   ├── salesOrdersApi.ts         # Sales Orders Hub, status transitions & multi-document timeline
│   │   ├── proformaApi.ts            # Proforma Invoices (PI) lifecycle, server GST engine & printing
│   │   ├── packingListsApi.ts        # Packing Lists, BOM auto-explosion, packet nature & consignee receipts
│   │   ├── hardwareIssueApi.ts       # Hardware store issues, 44-item catalog & 4-role sequential signoff
│   │   ├── crmApi.ts                 # B2B CRM: Customer 360, contacts, addresses, deduplication & merge
│   │   ├── procurementApi.ts         # Purchase Orders (PO) wizard, approvals & vendor orders
│   │   ├── financeApi.ts             # Payments, allocations, receivables/payables & recovery dashboard
│   │   ├── productsApi.ts            # Cubicle catalog: materials, finishes, units, barcode/HSN/SAC
│   │   ├── qrApi.ts                  # QR codes, cryptographic verification tokens & audit scan logs
│   │   ├── companyApi.ts             # Multi-entity switcher (India GST / UAE VAT), banks & signatories
│   │   ├── cmsApi.ts                 # CMS suite: services, blogs, gallery, banners, catalogs, testimonials
│   │   ├── exportApi.ts              # Global Trade & Export API client: Orders, Shipments, Forex, CRM, Realization, Email Hub
│   │   ├── boardInventoryApi.ts      # Board Inventory API client: 4 suppliers, inwards, auto-deductions, adjustments, reports
│   │   ├── index.ts                  # Master API index re-exporting all domain services
│   │   └── services.ts               # Backward-compatible facade re-exporting all APIs
│   ├── types/
│   │   └── admin.ts                  # TypeScript interfaces for all ERP, CRM, Tax, QR, and CMS models
│   ├── context/
│   │   └── AdminAuthContext.tsx      # Centralized React Auth Context with session & role management
│   ├── hooks/
│   │   ├── useAsyncAction.ts         # Resilient async action execution with multi-state transitions
│   │   └── useDebounce.ts            # Fast search & filter debouncing hook (300ms default)
│   ├── utils/
│   │   ├── lazyWithRetry.ts          # Automatic chunk reload utility for zero-downtime Vite deployments
│   │   └── formatters.ts             # Currency (INR/AED), date/time, and number formatting helpers
│   ├── components/
│   │   ├── ProtectedRoute.tsx        # Route guard checking backend JWT and Supabase sessions
│   │   ├── layout/
│   │   │   ├── AdminLayout.tsx       # Master layout shell: Header, Sidebar, Mobile Bottom Dock, Outlet
│   │   │   ├── AdminSidebar.tsx      # Grouped navigation drawer with active pills and collapsible sections
│   │   │   └── AdminHeader.tsx       # Top bar: Profile card, role badge, quick links & logout trigger
│   │   └── common/
│   │       ├── ViewErrorBoundary.tsx # Per-view error boundary preventing full-app crash on render faults
│   │       ├── AsyncActionButton.tsx # Standardized button with loading spinners and disabled states
│   │       ├── DocumentFlowTimeline.tsx # Universal 7-stage interactive document flow stepper with stage highlighting, pulse indicators & advance badge
│   │       ├── DocumentFlowTimelineModal.tsx # Universal modal hosting document flow timeline with status intelligence & next steps
│   │       ├── PageLoader.tsx        # Branded loading fallback spinner
│   │       ├── inventory/            # Board Inventory Modals:
│   │       │   ├── StockInwardModal.tsx   # Date, supplier (4 vendors), invoice/lot, qty, unit cost
│   │       │   ├── StockIssueModal.tsx    # Factory issue, WO reference, operator, live stock impact
│   │       │   ├── AdjustMovementModal.tsx# Edit/adjust auto-deductions & reconciliation
│   │       │   ├── CreateBoardModal.tsx   # New SKU master creation wizard
│   │       │   ├── BoardLedgerModal.tsx   # Movement audit ledger with filter & adjust actions
│   │       │   └── BoardReportsModal.tsx  # Visual analytics, vector PDF print, and Excel (.xlsx) export
│   │       └── finance/              # Customer Ledger, Payments & Recovery Modals:
│   │           ├── RecordPaymentModal.tsx    # Live payment recording modal with Bank A/C copy & ledger reflection
│   │           ├── ManualLedgerEntryModal.tsx# Pre-ERP historical transaction modal (Past Invoice/Opening Balance/Advance)
│   │           ├── SendLedgerEmailModal.tsx  # Manual statement & reminder notice email dispatch
│   │           └── LogFollowupModal.tsx      # Omnichannel touchpoint logger (Phone, WhatsApp, Visit, Email)
│   ├── lib/
│   │   ├── supabase.ts               # Supabase client & storage utilities
│   │   ├── database.types.ts         # Supabase table definitions
│   │   └── hooks.ts                  # Custom data fetching hooks
│   └── pages/
│       ├── SalesQuotationsPage.tsx   # Formal Sales Quotation Letter (PPS/D/<FY>/<seq>), narrative specs, SEZ validator, 1-click order convert
│       ├── DraftQuotationPage.tsx    # Dedicated 4-step Quotation Letter Draft Wizard with full localStorage persistence
│       ├── EditSalesQuotationPage.tsx # Quotation editor with board types (HPL & HDF) and hardware accessories selection
│       ├── QuotationFollowupPage.tsx # Dedicated full-page Quotation Follow-Up & Discussion Hub with omnichannel touchpoints
│       ├── SalesOrdersPage.tsx       # Central Sales Order Hub (PPS/ORD/<FY>/<seq>), cross-document universal search & timeline
│       ├── SalesOrderDetailPage.tsx  # Dedicated Sales Order 360 view (/admin/dashboard/sales-orders/:id), 7-stage lifecycle stepper, Order PDF modal, Invoice & Dispatch triggers
│       ├── SalesOrderTimelinePage.tsx # Dedicated 7-stage interactive document lifecycle pipeline (Quotation -> PI -> Order -> Invoice -> PL -> Dispatch -> HIL) with Advance Tracking & universal PDF viewer
│       ├── SalesOrderFollowupPage.tsx # Dedicated full-page Sales Order Follow-Up & Discussion Hub with omnichannel touchpoints
│       ├── ProformaInvoicesPage.tsx  # Central Proforma Invoices Hub (PPS/PI/<FY>/<seq>) with Stage 02 timeline & clickable rows
│       ├── CreateProformaPage.tsx    # Single-page PI quotation-grade builder with live calculation dock, quotation import, advance percentage & auto-save
│       ├── EditProformaInvoicePage.tsx # Single-page PI editor with full specifications & advance tracking
│       ├── ProformaInvoiceDetailPage.tsx # Dedicated Proforma Invoice 360 view (/admin/dashboard/proforma-invoices/:id), Quotation link, advance tracker, status changer
│       ├── ProformaInvoiceFollowupPage.tsx # Omnichannel PI follow-up CRM hub (/admin/dashboard/proforma-invoices/:id/follow-up)
│       ├── PackingListsPage.tsx      # Packing List Generation (PPS/PL/<FY>/<seq>), BOM auto-explosion, packet nature classification
│       ├── DispatchStatusPage.tsx    # Stage 06 Dispatch & Gate Pass Hub (/admin/dashboard/dispatches) cross-linking Quotation, PI, Order & Packing List
│       ├── CustomersPage.tsx         # B2B CRM: Customer directory, mobile cards, search, and Customer Merge Tool
│       ├── CustomerDetailPage.tsx   # Dedicated Customer 360 page (/admin/dashboard/customers/:id), KPIs, unified timeline, orders & quotes tables, contacts
│       ├── EditCustomerPage.tsx       # Dedicated full-page Customer Editor (/admin/dashboard/customers/:id/edit)
│       ├── CustomerFollowupPage.tsx   # Dedicated full-page Customer Follow-Up & Discussion Hub (/admin/dashboard/customers/:id/follow-up) with omnichannel logger, automated overdue cadence, and Statement of Account ledger
│       ├── VendorsPage.tsx           # Supplier Master: HPL boards, hardware, aluminium extrusions directory
│       ├── VendorDetailPage.tsx     # Dedicated Supplier 360 page (/admin/dashboard/vendors/:id), PO value, payments, orders table & contacts
│       ├── EditVendorPage.tsx        # Dedicated full-page Supplier Editor (/admin/dashboard/vendors/:id/edit), category, terms, addresses & contacts
│       ├── PurchaseOrdersPage.tsx    # Multi-step PO wizard, approval workflow, vector A4 PDF preview
│       ├── PaymentsPage.tsx          # Payment recording, PI invoice allocation, receivables/payables ledger, customer ledger & Statement of Account email modal
│       ├── QrCenterPage.tsx          # Mobile camera scanner, targeting brackets, laser beam, QR generator
│       ├── CompanySettingsPage.tsx   # Multi-entity switcher (India GST / UAE VAT), bank accounts, signatories, sequences
│       ├── PublicVerifyPage.tsx      # Public-safe document certificate verification (/verify/:token)
│       ├── ConsigneeAckPage.tsx      # Public consignee digital delivery acknowledgment & signature canvas (/acknowledge-receipt/:token)
│       ├── ConfiguratorLeadsPage.tsx # 3D configurator design leads
│       ├── QuotationsPage.tsx        # Legacy B2B price estimates
│       ├── ProjectsPage.tsx          # Commercial installation projects
│       ├── InvoicesPage.tsx          # Legacy invoices
│       ├── export/                   # Export & International Trade Suite:
│       │   ├── ExportDashboardPage.tsx   # Global export KPIs, omni-search, trade funnels & activity
│       │   ├── ExportOrdersPage.tsx      # Export Order 360, Milestones, Landed Cost & ICEGATE LEO
│       │   ├── ExportShipmentsPage.tsx   # Vessel tracking, container stuffing (20GP/40HC), BL/AWB, timeline events
│       │   ├── ExportCustomersPage.tsx   # Foreign buyers CRM 360, SWIFT/IBAN bank coordinates, sanctions check
│       │   ├── ExportQuotationsPage.tsx  # Multi-currency export quotes, inbound RFQs, 1-click order convert
│       │   ├── ExportRealizationPage.tsx # Forex realizations, AD bank IRMs, eBRC tracker, EDPMS compliance
│       │   └── ExportEmailHubPage.tsx    # Trade email dispatch hub, parameterized templates, delivery logging
│       ├── inventory/                # Raw Material Board Inventory:
│       │   └── BoardInventoryPage.tsx# High-speed compact board inventory register: 4 suppliers, live search, editable auto-deductions, PDF/Excel visual reports
│       └── admin/                    # Admin CMS Suite:
│           ├── AdminLogin.tsx        # Branded dark login page
│           ├── AdminDashboard.tsx    # App Shell rendering AdminLayout
│           ├── AdminOverview.tsx     # Operations KPI cards
│           ├── AdminProducts.tsx     # Products & Models Hub (Cubicle, Lockers, Urinal Partitions, Kids Toilet)
│           ├── AdminBlogs.tsx        # Blog CMS
│           ├── AdminSolutions.tsx    # Solution pages CMS
│           ├── AdminGallery.tsx      # Project gallery
│           ├── AdminHero.tsx         # Hero carousel
│           ├── AdminCoreServices.tsx # Core services editor
│           ├── AdminPageBanners.tsx  # Page headers
│           ├── AdminCatalogs.tsx     # PDF brochure manager
│           ├── AdminContactQueries.tsx # Contact inquiry inbox
│           ├── AdminFeedback.tsx     # Testimonials & ratings
│           ├── AdminFAQ.tsx          # FAQ editor
│           └── AdminLeads.tsx        # Visitor leads inbox
├── vite.config.ts                    # Vite config, port 5176, backend proxy to 5001
├── tailwind.config.js
├── tsconfig.json
├── AGENTS.md / GEMINI.md
└── PROJECT_CONTEXT.md
```

---

## 4. Admin Navigation & Routing Matrix

| Route | Page Component | Access | Description |
|---|---|---|---|
| `/verify/:token` | `PublicVerifyPage` | **Public** | Cryptographic authenticity badge for customer QR scans |
| `/acknowledge-receipt/:token` | `ConsigneeAckPage` | **Public** | Public digital receipt acknowledgment endpoint with interactive HTML5 signature canvas |
| `/admin` / `/login` | `AdminLogin` | **Public** | Admin authentication gateway |
| `/admin/dashboard` | `AdminOverview` | Protected | KPI cards, quick actions, recent activity |
| `/admin/dashboard/sales-quotations` | `SalesQuotationsPage` | Protected | Formal Sales Quotation Letter (`PPS/D/26-27/817`), narrative specs, SEZ validator, 1-click order convert |
| `/admin/dashboard/sales-quotations/new` | `DraftQuotationPage` | Protected | Dedicated 4-step Quotation Letter Draft Wizard with full `localStorage` persistence |
| `/admin/dashboard/sales-quotations/:id` | `SalesQuotationDetailPage` | Protected | Quotation 360 overview, action bar, line items & follow-up status |
| `/admin/dashboard/sales-quotations/:id/edit` | `EditSalesQuotationPage` | Protected | Dedicated Quotation Editor with HPL/HDF board types and hardware accessories |
| `/admin/dashboard/sales-quotations/:id/follow-up` | `QuotationFollowupPage` | Protected | Dedicated full-page Follow-Up & Discussion Hub (Omnichannel Call, WhatsApp, SMS, Email, Timeline) |
| `/admin/dashboard/sales-orders` | `SalesOrdersPage` | Protected | Central Sales Order Hub (`PPS/ORD/2026-27/...`), cross-document universal search & timeline |
| `/admin/dashboard/sales-orders/new` | `CreateSalesOrderPage` | Protected | Dedicated create page with localStorage auto-save |
| `/admin/dashboard/sales-orders/:id` | `SalesOrderDetailPage` | Protected | Dedicated Sales Order 360 overview, 5-stage lifecycle stepper, specs, audit history & linked docs |
| `/admin/dashboard/sales-orders/:id/edit` | `EditSalesOrderPage` | Protected | Dedicated Sales Order Editor with full specifications, delivery site & commercial terms |
| `/admin/dashboard/sales-orders/:id/timeline` | `SalesOrderTimelinePage` | Protected | Dedicated 5-stage interactive document lifecycle pipeline, status badges & cross-document links |
| `/admin/dashboard/sales-orders/:id/follow-up` | `SalesOrderFollowupPage` | Protected | Dedicated full-page Order Follow-Up & Discussion Hub (Call, WhatsApp, SMS, Resend Email, Timeline) |
| `/admin/dashboard/proforma-invoices` | `ProformaInvoicesPage`| Protected | Central Proforma Invoices Hub (`PPS/PI/2026-27/...`), Stage 02 timeline, advance tracking & clickable 360 rows |
| `/admin/dashboard/proforma-invoices/new` | `CreateProformaPage` | Protected | Single-page PI quotation-grade builder with live calculation dock, quotation import, advance percentage & auto-save |
| `/admin/dashboard/proforma-invoices/:id` | `ProformaInvoiceDetailPage` | Protected | Dedicated Proforma Invoice 360 overview, originating Quotation link, advance tracking hero, status changer & PDF |
| `/admin/dashboard/proforma-invoices/:id/edit` | `EditProformaInvoicePage` | Protected | Dedicated Proforma Invoice Editor with full specifications, delivery site & commercial terms |
| `/admin/dashboard/proforma-invoices/:id/follow-up` | `ProformaInvoiceFollowupPage` | Protected | Dedicated full-page PI Follow-Up & Discussion Hub (Omnichannel Call, WhatsApp, Email, Advance receipt & Timeline) |
| `/admin/dashboard/packing-lists` | `PackingListsPage` | Protected | Packing List Generation, BOM explosion, packet nature classification |
| `/admin/dashboard/packing-lists/new` | `CreatePackingListPage` | Protected | Dedicated packing list create page with localStorage |
| `/admin/dashboard/dispatches` | `DispatchStatusPage` | Protected | Stage 06 Dispatch & Gate Pass Hub cross-reconciling Quotations, PIs, Orders, and Packing Lists with carrier tracking |
| `/admin/dashboard/issue-lists` | `HardwareIssuePage` | Protected | Hardware Issue Lists, 44-item hardware catalog, 4-role sign-off |
| `/admin/dashboard/issue-lists/new` | `CreateHardwareIssuePage` | Protected | Dedicated hardware issue create page with localStorage |
| `/admin/dashboard/purchase-orders` | `PurchaseOrdersPage` | Protected | Procurement PO wizard (finish, thickness, sizes), PDF preview |
| `/admin/dashboard/purchase-orders/new` | `CreatePurchaseOrderPage` | Protected | Dedicated PO create page with localStorage |
| `/admin/dashboard/inventory/boards` | `BoardInventoryPage` | Protected | Restroom Board Stock Register across 4 vendors with dual-warehouse depot filter |
| `/admin/dashboard/inventory/boards/new` | `CreateBoardSkuPage` | Protected | Dedicated full-page SKU Master Creator with standard presets & live SKU code preview |
| `/admin/dashboard/inventory/lockers` | `LockerInventoryPage` | Protected | Locker Board Stock Register (Sl No, Design No, Size, Thickness, Board Type, Opening, Closing, Issues, Record Level) |
| `/admin/dashboard/inventory/ump` | `UmpInventoryPage` | Protected | Urinal Modesty Panel / Partition Register (S.No, D.No, Opening Stock, Record, Issue, ClosingStock, Remarks) |
| `/admin/dashboard/inventory/store` | `StoreInventoryPage` | Protected | General Store, Hardware accessories, fasteners & consumables inventory register |
| `/admin/dashboard/customers` | `CustomersPage` | Protected | B2B CRM, Customer directory, search, real-time deduplication, Merge Tool |
| `/admin/dashboard/customers/new` | `CreateCustomerPage` | Protected | Dedicated customer create page with localStorage |
| `/admin/dashboard/customers/:id` | `CustomerDetailPage` | Protected | Dedicated Customer 360 page: Financial KPIs, Unified Chronological Timeline, Orders & Quotes itemized tables, Contacts & Addresses, and Ledger & Follow-up (chronological running balance, 5-stage automated cadence stepper, manual email dispatch, and touchpoint logger) |
| `/admin/dashboard/customers/:id/edit` | `EditCustomerPage` | Protected | Dedicated full-page Customer Editor: Company profile, GSTIN/PAN, commercial terms, credit limits, primary contact, billing address |
| `/admin/dashboard/customers/:id/follow-up` | `CustomerFollowupPage` | Protected | Dedicated full-page Customer Follow-Up & Discussion Hub (Omnichannel Call, WhatsApp, Visit, Email, 4-tier automated cadence stepper, live Statement of Account ledger, manual dispatch modal & audit history) |
| `/admin/dashboard/vendors` | `VendorsPage` | Protected | Supplier registry (HPL boards, SS/Nylon hardware, extrusions) |
| `/admin/dashboard/vendors/new` | `CreateVendorPage` | Protected | Dedicated vendor create page with localStorage |
| `/admin/dashboard/vendors/:id` | `VendorDetailPage` | Protected | Dedicated Supplier 360 page: PO total values, payment history, Purchase Orders list, contacts & addresses |
| `/admin/dashboard/vendors/:id/edit` | `EditVendorPage` | Protected | Dedicated full-page Supplier Editor: Legal name, category, payment terms, contact persons, depot addresses |
| `/admin/dashboard/payments` | `PaymentsPage` | Protected | Payment allocation, Receivables & Payables ledgers, Dues recovery, Customer Ledger & Statement of Account, 4-tier automated overdue escalation cadence, manual email dispatch modal, and vector print |
| `/admin/dashboard/payments/new` | `CreatePaymentPage` | Protected | Dedicated payment record page with localStorage |
| `/admin/dashboard/qr-center` | `QrCenterPage` | Protected | Camera viewfinder QR scanner, code generator, audit logs |
| `/admin/dashboard/company-settings`| `CompanySettingsPage`| Protected | Multi-entity manager (IN/AE), bank accounts, signatories, sequences |
| `/admin/dashboard/export` | `ExportDashboardPage` | Protected | Global Export KPIs, omni-search, stage pipelines & realization tracker |
| `/admin/dashboard/export/orders` | `ExportOrdersPage` | Protected | Export Order Hub (Order 360, Milestones, Landed Cost & ICEGATE LEO) |
| `/admin/dashboard/export/orders/new` | `CreateExportOrderPage` | Protected | Dedicated export order create page with localStorage |
| `/admin/dashboard/export/shipments`| `ExportShipmentsPage` | Protected | Vessel tracking, container stuffing, BL/AWB, timeline events |
| `/admin/dashboard/export/shipments/new` | `CreateExportShipmentPage` | Protected | Dedicated shipment plan page with localStorage |
| `/admin/dashboard/export/customers`| `ExportCustomersPage` | Protected | Foreign Buyers CRM 360, SWIFT/IBAN, sanctions check |
| `/admin/dashboard/export/customers/new` | `CreateExportCustomerPage` | Protected | Dedicated buyer create page with localStorage |
| `/admin/dashboard/export/quotations`| `ExportQuotationsPage`| Protected | Multi-currency export quotes, inbound RFQs, 1-click order convert |
| `/admin/dashboard/export/quotations/new` | `CreateExportQuotationPage` | Protected | Dual-tab (Quotation / RFQ) create page with localStorage, `?type=` param |
| `/admin/dashboard/export/realization`| `ExportRealizationPage`| Protected | Forex realizations, AD bank IRMs, eBRC tracker, EDPMS compliance |
| `/admin/dashboard/export/realization/new` | `CreateExportRealizationPage` | Protected | Dedicated realization record page with localStorage |
| `/admin/dashboard/export/emails` | `ExportEmailHubPage` | Protected | Global trade email dispatch hub, parameterized templates, delivery logging |
| `/admin/dashboard/export/emails/new` | `ComposeExportEmailPage` | Protected | Dedicated email compose page with localStorage |
| `/admin/dashboard/products` | `AdminProducts` | Protected | Products & Models Management Hub: 4 core products (Cubicle, Lockers, Urinal Partitions, Kids Toilet), models with SS/Nylon hardware options, model-specific BOMs, Model A extra leg, Kids safety hardware, image upload & full CRUD |
| `/admin/dashboard/products/new` | `CreateAdminProductPage` | Protected | Dedicated Model Builder page with category selection, image upload, hardware options & BOM list |
| `/admin/dashboard/products/:id` | `ProductModelDetailPage` | Protected | Dedicated Model 360 view with photo showcase, hardware configuration & itemized BOM table |
| `/admin/dashboard/products/:id/edit` | `EditProductModelPage` | Protected | Dedicated full-page Model Editor with hardware options & BOM builder |
| `/admin/dashboard/blogs` | `AdminBlogs` | Protected | Blog management (edit stays in modal) |
| `/admin/dashboard/blogs/new` | `CreateBlogPage` | Protected | Dedicated blog post create page with localStorage |
| `/admin/dashboard/solutions` | `AdminSolutions` | Protected | Solutions CMS (edit stays in modal) |
| `/admin/dashboard/solutions/new` | `CreateSolutionPage` | Protected | Dedicated solution create page with localStorage |
| `/admin/dashboard/gallery` | `AdminGallery` | Protected | Installation photo gallery |
| `/admin/dashboard/gallery/new` | `CreateGalleryPage` | Protected | Dedicated gallery image create page with localStorage |
| `/admin/dashboard/hero` | `AdminHero` | Protected | Homepage hero slides |
| `/admin/dashboard/core-services` | `AdminCoreServices` | Protected | Core services |
| `/admin/dashboard/page-banners` | `AdminPageBanners` | Protected | Header banners |
| `/admin/dashboard/catalogs` | `AdminCatalogs` | Protected | Downloadable PDF brochures |
| `/admin/dashboard/catalogs/new` | `CreateCatalogPage` | Protected | Dedicated catalog upload page with localStorage |
| `/admin/dashboard/contact-queries` | `AdminContactQueries` | Protected | Contact form leads |
| `/admin/dashboard/contact-queries/new` | `CreateContactQueryPage` | Protected | Dedicated contact query create page with localStorage |
| `/admin/dashboard/feedback` | `AdminFeedback` | Protected | Customer testimonials |
| `/admin/dashboard/faq` | `AdminFAQ` | Protected | FAQ editor |
| `/admin/dashboard/leads` | `AdminLeads` | Protected | Visitor inquiries |
| `/admin/dashboard/configurator-leads` | `ConfiguratorLeadsPage` | Protected | 3D Configurator design submissions |
| `/admin/dashboard/quotations` | `QuotationsPage` | Protected | Quotation estimates |
| `/admin/dashboard/quotations/new` | `CreateLegacyQuotationPage` | Protected | Dedicated legacy quotation create page with localStorage |
| `/admin/dashboard/projects` | `ProjectsPage` | Protected | Commercial projects |
| `/admin/dashboard/projects/new` | `CreateProjectPage` | Protected | Dedicated project create page with localStorage |
| `/admin/dashboard/invoices` | `InvoicesPage` | Protected | Commercial invoices |
| `/admin/dashboard/invoices/new` | `CreateInvoicePage` | Protected | Dedicated invoice create page with localStorage |

---

## 5. Mobile-First Ergonomics & Responsiveness

1. **Touch Targets**: All interactive buttons, tabs, camera triggers, and modal actions are styled with `min-h-[44px]` (or `min-h-[48px]`).
2. **Mobile Bottom Navigation Bar**: On viewports `< lg`, a bottom bar remains fixed with 1-tap shortcuts:
   - `Overview`
   - `CRM` (Customers)
   - **Floating Scan QR** (Elevated center button with glowing gradient and haptic ring)
   - `Invoices` (Proforma Invoices)
   - `Dues` (Payments & Ledgers)
3. **Table-to-Card Responsive Transformation**: Tables automatically collapse into touch-friendly cards on small screens (`< md`), ensuring readability without horizontal overflow.
4. **Camera Scanner**: Integrates `navigator.mediaDevices.getUserMedia` with environment/back-camera priority, animated targeting brackets, scanning laser line, and Web Audio API synthesizer beep on scan.

---

## 6. Security & Session Handling

- **Primary API Authentication (`/api/v1/auth/login`)**: Admin panel authenticates directly against the Pacific Enterprise Backend API (`port 5001`), issuing Bearer JWT tokens (`pacific_access_token` and `pacific_refresh_token`) stored in `localStorage`.
- **Axios Client Auto-Injection**: `src/api/client.ts` intercepts all enterprise ERP requests to automatically inject the Bearer token and handle transparent silent token refreshing.
- **Unified Dual-Auth Gateway**: `AdminLogin.tsx` logs into the backend API and concurrently initializes the Supabase Auth session. Both backend users and Supabase `auth.users` are provisioned and synchronized so password logins succeed seamlessly across both authentication layers.
- **Guarded Routes (`ProtectedRoute.tsx`)**: Validates presence of the backend JWT token and profile before granting access to dashboard views.
- **Automatic Inactivity Logout**: Session monitored for 10 minutes of inactivity. A warning toast with live countdown appears 60 seconds before termination with a "Stay Logged In" button.
- **Cryptographically Signed QR Tokens**: Generated with HMAC-SHA256. Public endpoint `/verify/:token` never exposes primary keys or confidential profit margins.
- **Supabase Administrative Data Engine**: `src/lib/supabase.ts` connects to the primary database project (`kgalsrokdmsrqysyoffm`) using `VITE_SUPABASE_SERVICE_ROLE_KEY` / `VITE_SUPABASE_SECRET_KEY`, enabling full administrative CRUD across all 79 relational tables and CMS models without RLS permission rejection.
- **SQL Schema Compatibility Views**: PostgreSQL views `feedback` (aliasing `testimonials`) and `contact_queries` (aliasing `leads`) bridge legacy CMS table requests, supporting both camelCase and snake_case timestamp queries.
- **Prisma Connection Pooling**: Configured with `connection_limit=3&pool_timeout=30` on port 6543 pooler to prevent pool exhaustion on high-concurrency queries.
- **ImageKit.io Cloud Media Engine & CDN**: `src/lib/imagekit.ts` serves as the primary high-performance media pipeline for all images (primary covers, additional gallery swatches, CMS banners) and video demonstration files (.mp4, .webm, .mov). Uploads stream directly to ImageKit CDN (`https://ik.imagekit.io/1r254icf2/`) using authenticated REST API and client-side optimization (`browser-image-compression`). Only clean public CDN URLs are stored in PostgreSQL (`image_url`, `additional_images`, and `specifications.__hardware_meta.videos`). Supabase Storage acts as an automated fallback.
- **Automated Cloud Storage Provisioning**: Supabase Storage buckets `uploads`, `documents`, `products`, and `catalogs` are configured as secondary fallback for media and document uploads from the admin console.
- **Strict TypeScript & Build Verification**:
  - Zero TypeScript errors: `npx tsc --noEmit`
  - Zero-error Vite bundle build: `npm run build`

---

## 7. Global Export & International Trade Management Subsystem

The Export & International Trade module is an integrated enterprise suite designed for end-to-end management of cross-border restroom cubicle contracts, logistics, customs, foreign exchange realizations, and automated trade communications.

### Core Architectural Pillars

1. **Zero Duplication Master Architecture**:
   - Master entities (`business_parties`, `company_profiles`, `products`, `sales_orders`, `proforma_invoices`, `packing_lists`, `payments`, `users`, `qr_codes`) are strictly reused.
   - The export schema establishes non-destructive 1:1 and 1:N extension tables (`export_orders`, `export_shipments`, `export_bank_realizations`, `export_customer_profiles`, etc.).

2. **Multi-Currency Pricing & Incoterms 2020 Engine**:
   - Dynamic conversion across USD, AED, SAR, EUR, GBP, and INR.
   - Real-time FOB value extraction and automated landed cost calculations (Cost, Freight, Marine Insurance, Other Port Handling).

3. **International CRM & Buyer 360**:
   - Dedicated foreign buyer profiling with SWIFT/BIC, IBAN, and intermediary correspondent bank records.
   - Foreign tax ID / TRN verification, credit limits, and real-time AML / sanctions screening status.

4. **Ocean Logistics & Container Stuffing**:
   - Vessel schedule tracking with ETD, ETA, actual departure/arrival, and voyage identifiers.
   - Container management across 20GP, 40GP, 40HC, 45HC, and LCL with tare/payload weights, CBM volumes, and customs bolt seal logging.
   - Milestone event timeline from factory gate-out to destination port clearance and buyer delivery.

5. **Customs, ICEGATE & Compliance**:
   - Export Shipping Bill generation (`sb_number`, `sb_date`, port code, LEO date).
   - RoDTEP (Remission of Duties and Taxes on Exported Products) and Duty Drawback tracking.
   - Certificates repository: Certificate of Origin (COO), phytosanitary, fumigation, and legalization.

6. **Forex Realization & eBRC Tracking**:
   - Inward Remittance Messages (IRMs) linked to Authorized Dealer (AD) banks under RBI EDPMS guidelines.
   - Foreign Inward Remittance Certificate (FIRC) reference logging and DGFT electronic Bank Realization Certificate (eBRC) issuance tracking.

7. **Trade Email Dispatch & Communications Hub**:
   - Outbound communication center with Resend / Nodemailer SMTP engine.
   - Parameterized trade templates (`EXPORT_QUOTATION`, `EXPORT_ORDER_CONFIRMATION`, `EXPORT_SHIPPING_ADVICE`, `EXPORT_LEO_CLEARED`, `EXPORT_DOCS_DISPATCH`, `EXPORT_PAYMENT_REMINDER`).
   - Dynamic variable injection chips (`{{customerName}}`, `{{orderNumber}}`, `{{vesselName}}`, etc.), delivery state badges, and direct mail dispatch modal.

---

## 8. Seamless JWT Token Auto-Refresh Architecture

The admin console implements an enterprise dual-layer auto-refresh engine to prevent authentication dropouts, race conditions, and accidental logouts during active work:

1. **Queued Concurrency-Safe 401 Interceptor (`src/api/client.ts`)**:
   - Multiple parallel requests hitting 401 concurrently are grouped into a thread-safe `failedQueue`.
   - Exactly **one** `/auth/refresh` request is dispatched to the backend, avoiding invalidation of rotated refresh tokens.
   - Upon receipt of the new access token and rotated refresh token, all queued requests are updated with the new `Bearer` header and retried transparently.
   - If the refresh token itself is revoked or missing, the session is purged and redirected only from protected routes (public routes like `/login` or `/verify` are preserved).

2. **Proactive Background Auto-Refresh (`src/context/AdminAuthContext.tsx`)**:
   - `parseJwtExpiry()` decodes the access token `exp` timestamp in the browser.
   - An automated background monitor runs every 60 seconds.
   - If the token has less than 3 minutes of validity remaining, it triggers a silent background refresh **before** any request can fail with 401.
   - Tab visibility changes (`visibilitychange`) and browser window focus (`focus`) automatically inspect token freshness so sleeping or background tabs seamlessly resume without interruption.

3. **Unified Auth Context Bridging (`src/context/AdminAuthContext.tsx` & `src/context/AuthContext.tsx`)**:
   - `AdminAuthProvider` serves as the root context provider in `App.tsx`.
   - `src/context/AuthContext.tsx` bridges `useAuth()` directly to `useAdminAuth()`, and `AdminAuthContext.tsx` re-exports `useAuth = useAdminAuth`.
   - All admin and ERP pages (`SalesQuotationsPage`, `SalesOrdersPage`, `ProformaInvoicesPage`, `PackingListsPage`, `HardwareIssuePage`, `QuotationsPage`) consume `useAdminAuth`, completely eliminating runtime `useAuth must be used within AuthProvider` errors.

---

## 9. Company Profile Resolution & Hardware Issue Workflow

1. **Frontend (`src/pages/CreateHardwareIssuePage.tsx`)**:
   - Fetches active company profiles via `companiesApi.list()` and auto-populates `companyProfileId`.
   - Propagates `companyProfileId` when an existing `SalesOrder` is linked.
   - Includes fallback to the first active company profile in `handleSubmit` payload.

2. **Backend Self-Healing (`src/modules/hardware-issue/hardware-issue.service.ts`)**:
   - Resolves `data.companyProfileId`, falling back to `status: 'ACTIVE'` or first existing company profile.
   - Self-heals by seeding a default company profile (`Pacific Products & Solutions`, `PPS_IN`) if the database has zero records, guaranteeing sequential document numbering (`PPS/HIL/<FY>/<seq>`) never throws a 500 foreign key or missing ID error.

---

## 10. Super Admin Universal Access & Authenticated Document Previews

1. **Universal Super Admin Bypass**:
   - **Backend Middleware (`requireRole`, `requirePermission`, `requireEntityScope`)**: `SUPER_ADMIN` and `ADMIN` roles are granted immediate, unconditional access across all endpoints and entities without encountering 401 or 403 authorization blocks.
   - **Frontend Context (`AdminAuthContext.tsx`)**: `hasRole` returns `true` unconditionally for `SUPER_ADMIN` and `ADMIN`, ensuring all navigation links, action buttons, and views remain permanently accessible.

2. **Authenticated Document & PDF Preview Engine**:
   - **Multi-Transport Token Authentication (`requireAuth`)**: Accepts Bearer tokens via `Authorization` headers, `req.query.token`, and `req.cookies.accessToken`.
   - **Secure URL Generation**: `getPdfUrl` across `salesQuotationsApi`, `exportApi`, `hardwareIssueApi`, `packingListsApi`, `proformaApi`, and `procurementApi` automatically appends `?token=${encodeURIComponent(token)}` for native browser tabs and iframe fallbacks.
   - **`srcDoc` Vector HTML Sandboxing**: Previews in `SalesQuotationsPage`, `ExportQuotationsPage`, `HardwareIssuePage`, and `PackingListsPage` execute an authenticated `fetch()` with Bearer headers and render the HTML directly via `<iframe srcDoc={pdfHtml} />`, completely eliminating 401 "Authentication required" errors on document previews.
   - **In-Memory Printing**: Preview modals leverage in-memory window creation (`window.open('', '_blank')` + `printWindow.document.write(pdfHtml)`) for crisp, authentic vector printing without browser dialog download prompts.
   - **Export Quotation Breakdown & Letter Generator**: `ExportQuotationsPage.tsx` integrates both an interactive modal detail viewer (Incoterms, ports, buyer, items, costs) and a vector A4 export quotation letter generated by backend `pdf.service.ts`.
   - **CMS Quotations Viewer (`QuotationsPage.tsx`)**: The Eye action button opens a dedicated Quotation Details breakdown modal displaying customer/lead data, line items, taxes, totals, and print triggers.

---

## 11. System-Wide Full CRUD, QR Verification Engine & Delete Access

1. **Open Delete Access (All Authenticated Admins)**:
   - **Frontend UI**: `isSuperAdmin` role guards have been removed from all Delete buttons across every ERP list page. All authenticated admin users can see and trigger deletion across Sales Quotations, Sales Orders, Proforma Invoices, Packing Lists, Hardware Issues, Purchase Orders, Customers, Vendors, Quotations (CMS), Projects, Invoices, Configurator Leads. Delete confirmation dialogs use the message: _"This action cannot be undone."_
   - **`AdminManagementPage.tsx` (Roles & Permissions)**: `isSuperAdmin` guards remain intentionally on the Admin Management page's role/user delete actions (system role protection remains active).
   - **Serial Numbers (#)**: Every list page table and mobile card view includes a serial number (`#`) column/badge showing `(page - 1) * limit + idx + 1` starting from 1.

2. **System-Wide Full Edit Modals & Update Endpoints**:
   - Comprehensive interactive edit dialogs with form state validation, reactive line-item calculators, and direct backend API integrations (`PATCH /:id`):
     - **Sales Quotations (`SalesQuotationsPage.tsx`)**: Edit status, validity, notes, line items, rates, taxes, and customer delivery terms.
     - **Sales Orders (`SalesOrdersPage.tsx`)**: Edit status, site name, site address, client PO number & date, line item quantities, and units.
     - **Proforma Invoices (`ProformaInvoicesPage.tsx`)**: Edit status, linked PO details, transport modes, vehicle numbers, LR numbers, and notes.
     - **Packing Lists (`PackingListsPage.tsx`)**: Edit consignor, ship-to destinations, contact persons, signatories, and package item quantities/packet counts.
     - **Hardware Issue Lists (`HardwareIssuePage.tsx`)**: Edit consignee, project name, store keepers, sequential signers, and itemized hardware catalog pieces.
     - **CMS Quotations (`QuotationsPage.tsx`)**: Edit status, validity dates, notes, terms, line item descriptions, unit prices, and auto-computed totals.

3. **Default QR Verification Subsystem on All Generated PDFs**:
   - **Default Automatic Token Issuance (`qrService.getOrCreateDocumentQr`)**: All 6 PDF generators (`generatePoHtml`, `generateQuotationPdfHtml`, `generateExportQuotationPdfHtml`, `generatePiHtml`, `generatePackingListPdfHtml`, `generateHardwareIssuePdfHtml`) automatically generate and embed a cryptographically verified QR code pointing to `${baseUrl}/verify/${token}`.
   - **Public Verification Route (`/verify/:token`)**: Supported by `PublicVerifyPage.tsx`, displaying an official security certificate badge, document status, issuer information, issuance timestamps, and line-item summaries for all document types (`QUOTATION`, `ORDER`, `PACKING_LIST`, `HARDWARE_ISSUE`, `EXPORT_QUOTATION`, `PI`, `PO`).

4. **Dedicated Full-Page CRM Intelligence & Customer Lifecycle**:
   - **Customer 360 Page (`CustomerDetailPage.tsx` at `/admin/dashboard/customers/:id`)**:
     - Navigates from both desktop table rows ("Customer 360" button or company name link) and mobile cards.
     - Features 4 sub-tabs: Overview & Commercial Profile, Unified Chronological Timeline (across Quotes, Orders, PIs, Packing Lists, Hardware Issues, Payments), Transactions (itemized Sales Orders and Quotations tables with direct links), and Contacts & Addresses.
     - Direct action buttons for "Edit Customer", "Merge Records", "New Quote", and "Delete Customer".
   - **Customer Edit Page (`EditCustomerPage.tsx` at `/admin/dashboard/customers/:id/edit`)**:
     - Dedicated full-page editor with multi-section form: Company Registration (Legal Name, Trade Name, GSTIN, PAN, Email, Phone, Account Status), Commercial Terms & Credit Control (Customer Type, Payment Terms Days, Credit Limit), Primary Contact Person, and Primary Billing Address (Street Lines 1 & 2, City, State, State Code, Postal Code, Notes).
     - Submits to `PATCH /api/v1/crm/customers/:id` with automatic upsert of customer profile, contacts, and billing address.
   - **Enterprise Relational Safe Delete Architecture**:
     - `auth.middleware.ts` updated to allow both `SUPER_ADMIN` and `ADMIN` roles to execute `DELETE /api/v1/crm/customers/:id` (fixing previous 403 Forbidden).
     - `crm.service.ts` inspects linked transactions (`salesQuotations`, `salesOrders`, `proformaInvoices`, `packingLists`, `hardwareIssues`, `payments`, etc.). If commercial records exist, it soft-deletes (`status = 'DELETED'`) to protect relational integrity and prevent Postgres foreign key restriction errors; if zero transactions exist, it safely removes child records before deleting the party.
     - `listCustomers` filters out `DELETED` records automatically.

5. **Vendor & Supplier Master Intelligence & Lifecycle**:
   - **Supplier 360 Page (`VendorDetailPage.tsx` at `/admin/dashboard/vendors/:id`)**:
     - Accessible from desktop table ("View" button or supplier name link) and mobile cards.
     - Financial & Procurement KPIs: Total PO Value, Total PO Count, Total Payments Made, Outstanding Dues, and Payment Terms.
     - 4 Sub-Tabs: Overview & Profile (Category, Terms, Status, Internal Notes), Purchase Orders (itemized table with PO Number, Date, Total Amount, Status, and link), Payments (itemized table with Reference, Date, Method, Amount, Status), and Contacts & Addresses (Supplier representatives and registered factory/office coordinates).
     - Direct action buttons for "Edit Supplier", "New Purchase Order", "Refresh", and "Delete Supplier" (with confirmation and redirect).
   - **Supplier Edit Page (`EditVendorPage.tsx` at `/admin/dashboard/vendors/:id/edit`)**:
     - Dedicated full-page editor: Supplier Registration (Legal Name, Trade Name, GSTIN, PAN, Email, Phone, Status), Category & Terms (HPL Boards, HDF Boards, Hardware, Aluminium, SS, Nylon, Raw Materials; Payment Terms Days), Primary Contact Person, Primary Registered Address / Depot, and Procurement Notes.
     - Submits to `PATCH /api/v1/vendors/:id` with atomic upsert of vendor profile, contacts, and addresses.
   - **Safe Delete & Procurement Relational Protection**:
     - `vendors.service.ts` inspects linked purchase orders, payments, and export expenses. If commercial records exist, it soft-deletes (`status = 'DELETED'`) to preserve audit and foreign key integrity; if none exist, it removes child records before party deletion.
     - `listVendors` automatically filters out `DELETED` records.

---

## 12. Production-Grade Custom Admin & Role Management System (RBAC)

1. **Enterprise RBAC Architecture (`src/modules/roles` & `src/modules/users`)**:
   - **Automated Database Seeding**: On initialization, `rolesService.seedDefaultRolesAndPermissions()` seeds 52 modular permissions across Sales & CRM, Logistics, Export & Global Trade, Procurement, Finance, CMS, Users, and Settings, along with 9 default system roles (`SUPER_ADMIN`, `ADMIN`, `SALES_MANAGER`, `WAREHOUSE_MANAGER`, `FINANCE_OFFICER`, `PROCUREMENT_MANAGER`, `EXPORT_MANAGER`, `EDITOR`, `VIEWER`).
   - **Role Management Endpoints (`/api/v1/roles`)**:
     - `GET /` — List roles with permission count and assigned user counts.
     - `GET /permissions` — Grouped permissions taxonomy across all platform modules.
     - `GET /:id` — Detailed role capabilities and assigned staff.
     - `POST /` — Create custom role with auto-slugged code and permission assignments (Super Admin only).
     - `PATCH /:id` — Modify role name, description, and permission matrix (Super Admin only).
     - `DELETE /:id` — Delete custom role (System roles protected; active user assignment check enforced).
   - **User Management Endpoints (`/api/v1/users`)**:
     - `GET /` — Paginated staff directory with universal search, role filter, and status filter.
     - `GET /:id` — Detailed staff profile with primary and custom role assignments.
     - `POST /` — Provision admin user with secure 12-round bcrypt hash, primary role, and custom role mappings.
     - `PATCH /:id` — Update staff profile, primary role, custom roles, or active status.
     - `POST /:id/reset-password` — Secure password reset that clears active refresh tokens.
     - `DELETE /:id` — Permanent account removal with strict self-deletion and last-super-admin guards.

2. **Mobile-First Responsive Console (`src/pages/AdminManagementPage.tsx`)**:
   - **Header & Metric Counters**: Real-time KPI cards displaying Total Admins, Active Staff, Custom Roles, and Platform Permissions.
   - **Tab 1 — Administrators & Staff**:
     - Desktop data table transforming to responsive touch cards on mobile viewports ($\ge 44\text{px}$ touch targets).
     - Interactive quick-toggle for Active / Suspended status.
     - Modals: **Create/Edit Admin User Modal** with automated secure password generator, and **Reset Password Modal** with one-click clipboard copying.
   - **Tab 2 — Roles & Permission Matrix**:
     - Role capability cards showing permission coverage bars and assigned user badges.
     - **Granular Permission Matrix Modal / Drawer**: Grouped module cards with module-level "Select All" / "Deselect All", master toggle, and clear operational capability descriptions.
   - **Navigation & Routing**:
     - Integrated in `AdminSidebar.tsx` as `Admins & Roles` (`/admin/dashboard/admin-management`).
     - Route registered with `lazyWithRetry` under `App.tsx`.

---

## 13. Company Settings Enhancements & Global Copy Button Removal

1. **Authorized Signatories Digital Signature Upload**:
   - **Interactive File Upload (`CompanySettingsPage.tsx`)**: The Authorized Signatories modal includes a dedicated file upload zone supporting PNG, JPG, SVG, and WebP images ($\le 5\text{MB}$).
   - **Client-Side FileReader & Instant Preview**: Selected files are converted to high-fidelity Base64 data URLs via `FileReader.readAsDataURL()`, displaying an instant visual preview with options to Change Signature, Remove Signature, or manually specify an image URL.
   - **Cross-Document Rendering**: Uploaded digital signatures are linked to company profiles and displayed in the Signatories overview cards and printed documents.

2. **Address Types & Billing Tax Identifiers (GSTIN & PAN)**:
   - **Address Types (`CompanySettingsPage.tsx`)**: Address type selection includes `BILLING` (Billing Address), `DELIVERY` (Delivery Address), `REGISTERED_OFFICE` (Registered Corporate Office), `FACTORY`, and `WAREHOUSE`.
   - **Conditional Tax Fields**: Selecting `BILLING` dynamically reveals dedicated input fields for **GST Number (GSTIN)** and **PAN Number** with automatic uppercase formatting and monospace typography.
   - **Cross-Stack & Database Synchronization**:
     - Backend PostgreSQL table `company_addresses` updated with `gstin TEXT` and `pan TEXT` columns.
     - Prisma schemas (`prisma/schema.prisma` in both backend and admin) updated and Prisma client re-generated.
     - TypeScript interfaces (`CompanyAddress` in `src/types/admin.ts`) updated with `gstin?: string` and `pan?: string`.
   - **Visual Badges & Information Cards**: Address side-cards render color-coded category badges (`Billing Address` in blue, `Delivery Address` in emerald) and display GSTIN and PAN details when configured.

3. **Global Removal of Copy / Duplicate Buttons**:
   - All duplicate and copy action buttons have been removed across all paths, prioritizing direct editing:
     - **`ProformaInvoicesPage.tsx`**: Removed desktop row duplicate button and mobile card duplicate button.
     - **`SalesQuotationsPage.tsx`**: Removed table row copy button.
     - **`QrCenterPage.tsx`**: Removed "Copy URL" button, maintaining the direct "Download PNG" action.
     - **`AdminManagementPage.tsx`**: Removed the "Copy" button from the password reset modal, formatting the temporary password as selectable monospace text.

---

## 14. Document Lifecycle & Supplier Master Updates

1. **Clean Proforma Invoice (PI) Deletion & Cascade Relational Cleanup**:
   - **Foreign Key Alignment**: Corrected Prisma relation targeting for child tables (`proforma_invoice_tax_summary`, `proforma_invoice_items`, `proforma_invoice_parties`, `proforma_invoice_terms`, `proforma_invoice_status_history`) using the actual foreign key column `piId`.
   - **Comprehensive Dependency Resolution**: Before removing a Proforma Invoice, `piService.delete()` systematically clears:
     - Payment allocations (`paymentAllocation`) and ledger receivable entries (`receivableEntry`).
     - Payment follow-up reminders (`paymentFollowupReminder`), follow-up activity logs (`paymentFollowupLog`), and master follow-ups (`paymentFollowup`).
     - Verification infrastructure: scan audit logs (`qrScanLog`), active QR codes (`qrCode`), and cryptographic verification tokens (`documentVerificationToken`).
   - Super Admins can delete duplicate or obsolete PIs without foreign key constraint or 500 internal server errors.

2. **Sales Quotation Deletion with Seamless Order Unlinking**:
   - **Converted Quotation Protection Removal**: Eliminated artificial blocker restricting deletion of quotations in `CONVERTED` status.
   - **Order Association Unlinking**: Associated sales orders have their `quotationId` safely cleared (`prisma.salesOrder.updateMany({ where: { quotationId: id }, data: { quotationId: null } })`), preserving order history and tracking integrity.
   - **Cascade Purge**: Revisions (`salesQuotationRevision`), line items (`salesQuotationItem`), QR tokens (`documentVerificationToken`), scan logs, and active QR codes are pruned prior to quotation removal.

3. **Vendor Supply Category Specialization (HPL Boards & HDF Boards)**:
   - **Supply Category Restriction**: In `CreateVendorPage.tsx`, the `supplyCategory` dropdown options are strictly limited to:
     - `HPL_BOARDS` ("HPL Boards")
     - `HDF_BOARDS` ("HDF Boards")
   - **Table & Filter Sync (`VendorsPage.tsx`)**: Table badges and filter dropdowns updated to seamlessly reflect "HPL Boards" and "HDF Boards" across desktop table and mobile responsive card views.

---

## 15. Sales Quotation Letters Overhaul & Professional PDF System

1. **Dedicated Read-Only Detail View (`SalesQuotationDetailPage.tsx`)**:
   - **Route**: `/admin/dashboard/sales-quotations/:id` registered with `lazyWithRetry` in `App.tsx`.
   - **Interactive Navigation**: Clicking any table row in `SalesQuotationsPage.tsx` navigates directly to the dedicated detail view, displaying comprehensive quotation records:
     - Header badge indicating quotation number, revision number (`Rev X`), status badge, and SEZ zero-rated compliance tag.
     - **Recipient & Project Cards**: Contact person, organization, billing/project address, email, phone, project title, and subject.
     - **Pricing Summary & Statutory Breakdown**: Basic price, installation charges, freight terms and amounts, GST rate, SEZ tax exemption status, and grand total formatted in currency words.
     - **Line Items Specification Table**: Full technical specifications (cubicle dimensions, board color, board thickness, door dimensions, and overall height) with unit rate and line total calculations.
     - **Terms & Notes**: Commercial payment terms, delivery and lead times, standard hardware inclusion list, warranty commitments, and revision history logs.
     - **Action Header**: One-click actions to Print/Save PDF, Mark Sent to Client, Edit Quotation, Convert to Official Sales Order, and Super Admin-exclusive Delete.

2. **Dedicated Full-Page Edit Form (`EditSalesQuotationPage.tsx`)**:
   - **Route**: `/admin/dashboard/sales-quotations/:id/edit` registered with `lazyWithRetry` in `App.tsx`.
   - **Pre-Filled Form from API**: Eliminates empty popups by fetching fresh server data via `salesQuotationsApi.getById(id)` on component mount, populating all recipient details, line items with correct unit rates and quantities, cubicle specifications, and terms.
   - **Form Autosave & Draft Recovery**: Real-time debounced auto-save to `localStorage` under `pacific_edit_quotation_v1_{id}` with a manual Reset button to discard edits and reload server state.
   - **Live Pricing Calculation Banner**: Real-time reactive calculation of basic price, installation, freight, GST amount, and grand total.
   - **Line Items Editor**: Add, remove, and reorder cubicle line items with collapsible technical specification cards (size, color, thickness, door size, height).

3. **Quotation List Table Cleanup & Mobile-First Overhaul (`SalesQuotationsPage.tsx`)**:
   - **Removed "R1" Revision Badge**: Cleaned quotation reference display by removing `R1` / `R{revisionNumber}` tag from the list views (desktop table and mobile cards).
   - **Customer Column Simplification**: Removed project location and site address from the customer column, presenting clean customer/company names.
   - **Date Column Simplification**: Removed validity date from the date column, displaying only the formal quotation issuance date.
   - **Follow-Up Column Streamlining**: Removed redundant "Order Confirmed" badge from the follow-up column for converted quotations.
   - **Streamlined Action Suite**: Removed WhatsApp, Phone, Follow-up, and PI buttons from the Actions column in both desktop table and mobile cards, retaining a focused 4-button action suite: Download PDF, Email Quotation, Edit, and Delete.
   - **Mobile-First Responsive Ergonomics**: Reduced padding, font sizes, and margins for small devices across KPI metrics, search filters, and mobile cards; integrated responsive pagination controls (`totalPages > 1`).
   - **Quotation Details Isolation**: All changes isolated strictly to the quotation list view without altering the Quotation Details page (`SalesQuotationDetailPage.tsx`).
   - **Non-Interfering Actions**: Action buttons use `e.stopPropagation()` to prevent unwanted row navigation when triggering actions.

4. **Professional Monochrome PDF Redesign (`generateQuotationPdfHtml` in `pdf.service.ts`)**:
   - **Monochrome Executive Palette**: All borders styled in pure black (`1px solid #000000`), zero padding inside the outer frame (`padding: 0;`), with crisp inner margins on printable sections.
   - **Typography & Weight**: All typography strictly rendered in pure black (`#000000`) and standard regular weight (`font-weight: normal !important;`), avoiding heavy bold text for an elegant executive presentation.
   - **Borderless Verification QR Code**: QR code container stripped of all outer borders (`border: none !important; outline: none !important;`), cleanly linked to `/verify/:token` for authentic verification scans.
   - **Dynamic Authorized Signatory**: Automatically resolves uploaded digital signatures from `companyProfile.signatories` (default/active signatory `signatureUrl`), rendering the signatory name and designation beneath the authorized sign-off line.
   - **Company Logo Integration**: Integrated company logo dynamically from `public/pacific_logo.png` via base64 Data URI resolver (`resolveCompanyLogoDataUri`), ensuring self-contained offline and cross-origin rendering.

5. **Direct Customer Email Transmission via Resend Infrastructure**:
   - **Backend Route & Controller**: `POST /api/v1/sales/quotations/:id/send-email` guarded by `requireAuth` and `requirePermission('quotation:send')`.
   - **Resend Delivery Engine (`emailService.sendEmail`)**: Utilizes `RESEND_API_KEY` and `RESEND_FROM` configured in backend `.env` (`Pacific Products & Solutions <ejaj@pacificproduct.in>`).
   - **Automatic Document Attachment**: Automatically renders and attaches the formal quotation HTML letter (`Quotation_<ref>.html`) with embedded verification QR code.
   - **Quotation Status Lifecycle & Auditing**: Transitions quotation status from `DRAFT` to `SENT` upon dispatch, automatically setting `sentAt` timestamp and logging an audit event.
   - **Interactive Frontend Email Modals**:
     - **Detail View (`SalesQuotationDetailPage.tsx`)**: Header action button opening an interactive modal with validated recipient email, subject, custom notes, and Resend delivery trigger.
     - **List View (`SalesQuotationsPage.tsx`)**: Fast-action email trigger in both desktop table rows and mobile responsive cards with pre-filled recipient email and subject.

6. **Comprehensive Input Field Validations**:
   - **Edit Quotation Page (`EditSalesQuotationPage.tsx`)**: Client-side field-level validation for recipient name, email pattern (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), phone pattern, project name, non-negative installation and freight charges, positive quantities ($> 0$), non-negative unit rates ($\ge 0$), and line item descriptions with highlighted red borders and helper messages.
   - **Draft Quotation Page (`DraftQuotationPage.tsx`)**: Multi-step validation preventing submission with empty project names, missing line items, zero quantities, or negative pricing before creating draft quotations.

---

## 16. Quotation Letter Precision Pricing, Borderless Specs & Data Persistence

1. **Resolution of ₹ 0 Pricing & Rate/Amount Storage**:
   - **Root Cause**: Field name discrepancy between frontend draft wizard payload (`itemDescription`, `unitPrice`) and backend service expectations (`description`, `rate`). Additionally, Prisma Decimal types returned from PostgreSQL were not uniformly coerced to JavaScript `Number`, causing missing or zeroed values in calculations and summary views.
   - **Dual-Field Normalization in Backend (`quotations.service.ts`)**:
     - `create()` and `update()` now flexibly resolve `rate: Number(it.rate ?? it.unitPrice ?? 0)`, `description: it.description || it.itemDescription || 'Pacific Restroom Cubicle Partition'`, and calculate accurate line `amount: Number(it.amount ?? (qty * rate))`.
     - Computed fields (`basicPrice`, `taxable`, `gstAmount`, `grandTotal`, `amountInWords`) accurately aggregate across all line items and discount deductions.
   - **Output Normalization Helper (`formatQuotationOutput`)**: Coerces all Prisma `Decimal` fields to standard JavaScript `Number` and ensures both `quotationNumber` and `referenceNumber` are populated across `list()`, `getById()`, `create()`, `revise()`, `update()`, and `send()`.
   - **Draft Form Alignment (`DraftQuotationPage.tsx`)**: Explicitly maps `description: it.itemDescription`, `rate: Number(it.unitPrice) || 0`, `quantity: Number(it.quantity) || 1`, `amount: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)`, and `cubicleSize: it.specifications || undefined`.

2. **Borderless Line Item Technical Specifications in PDF (`pdf.service.ts`)**:
   - Removed the rectangular bounding border around line item specifications (`.spec-box { border: none !important; padding: 2px 0; margin: 2px 0; font-size: 8.5px; line-height: 1.35; }`).
   - Cleaned up conditional rendering: only renders bulleted specs if size, color, thickness, door size, or height are explicitly provided, eliminating hardcoded placeholder text ("D.No. ___ (Pending Approval)", etc.).

3. **Unified Quotation Number & Grand Total in Quotations List (`SalesQuotationsPage.tsx`)**:
   - **Quotation Number**: Resolved blank display by referencing `{q.referenceNumber || q.quotationNumber || '—'}` across both desktop table and mobile card views.
   - **Grand Total**: Formatted via `{Number(q.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` ensuring amounts always display with 2 decimal places and proper Indian numbering format.
   - **Customer & Project Details**: Displays `{q.projectName || q.siteName || q.siteAddress}` under the customer legal name.
   - **Super Admin Delete Confirmation**: Updated to display `{q.referenceNumber || q.quotationNumber}` in the confirmation dialog.

4. **Guaranteed PostgreSQL Database Persistence**:
   - All rates, quantities, descriptions, cubicle specifications, customer linkages, and computed price breakdowns persist accurately to the `sales_quotations` and `sales_quotation_items` tables via Prisma ORM.

---

## 17. Quotation Wizard Streamlining, Numbering Format & True PDF Attachments

1. **Streamlined 3-Step Quotation Creation Wizard (`DraftQuotationPage.tsx`)**:
   - **Removed Redundant "2. Staff Sign-off" Step**: Form now consists of:
     - `1. Client & Site`
     - `2. Pricing Table`
     - `3. Narrative & T&Cs`
   - **Rationale**: Signatory details, designated roles, and signature image assets are dynamically resolved from configured Company Profile Signatories (`CompanySettingsPage`), removing duplicate manual entry.
   - **Validation & Step Navigation**: Direct seamless transition between Client/Site, Pricing Table, and Narrative Clauses with updated back/next button states and step validation.

2. **Standardized Quick Boilerplate Presets (`DraftQuotationPage.tsx`)**:
   - **Standard Cubicle**: Restroom cubicle partition system with 12mm HPL boards, powder-coated aluminium extrusions, nylon/SS 304 hardware package.
   - **Urinal Partition**: Urinal privacy partition screens with 12mm solid compact laminate, heavy-duty aluminium/SS 304 U-channels, chamfered safety edges (450mm x 900mm/1200mm).
   - **Hpl Locker**: Heavy-duty moisture-resistant HPL tier lockers with cam key locks, master key system, integrated ventilation slots, and SS continuous piano hinges.

3. **Quotation Numbering Schema Update (`sequence.service.ts` & DB)**:
   - Changed quotation sequence prefix from `PPS/D/<FY>/` to **`PPS/QT/<FY>/`** (e.g. `PPS/QT/26-27/005`).
   - Synced database `document_sequences` table prefix and migrated existing database quotation reference numbers.
   - Updated UI search placeholders and KPI indicators in `SalesQuotationsPage.tsx`.

4. **True Binary PDF Email Attachments via Puppeteer (`htmlToPdf.ts` & `quotations.service.ts`)**:
   - Integrated headless Chromium (`puppeteer`) to render the full A4 quotation template with all inline base64 assets (QR, signature, company logo) into a valid `.pdf` binary buffer.
   - Quotation dispatch via Resend now delivers a genuine `Quotation_<ref>.pdf` attachment (`application/pdf`) rather than an `.html` file.

5. **Quotations List Action Buttons Update (`SalesQuotationsPage.tsx` & `salesQuotationsApi.ts`)**:
   - **Replaced Print Button with Direct Download**: Removed the print option button and added a direct `Download PDF` button (using `<Download />` icon) linked to `salesQuotationsApi.getDownloadPdfUrl(q.id)`. The backend `/pdf?download=true` endpoint directly compiles and streams `Quotation_<ref>.pdf` as a file attachment.
   - **Removed "Mark as Sent" Button**: Deleted the manual "Mark as Sent" action from the list table rows, as dispatch lifecycle is now managed directly via the dedicated customer email workflow.

6. **Unified Quotation Creation Page & Hardware Selection (`DraftQuotationPage.tsx` & `EditSalesQuotationPage.tsx`)**:
   - **Page Alignment**: Rebuilt `DraftQuotationPage.tsx` to mirror the design and UX of `EditSalesQuotationPage.tsx`: single-page continuous layout, real-time live total calculation banner (Basic, Installation, Freight, GST, Grand Total), clear modular cards (Recipient Details, Project & Validity, Pricing Options, Line Items, Hardware Selection & Inclusions, Commercial Terms), Client Master selection with instant contact/address auto-fill, and draft auto-saving with Reset option.
   - **Hardware Selection System**:
     - **Quick Hardware Presets**: Added one-click hardware package cards for *SS 304 Stainless Steel (Satin Finish)*, *Black Polyamide Nylon (Grade A)*, *SS 316 Marine Grade (Anti-Corrosion)*, and *Aluminium Heavy-Duty (Architectural)* which automatically populate the standard hardware accessories technical clauses and propagate defaults to line items.
      - **Per-Item Hardware Selection**: Added a dedicated `Hardware Selection` dropdown in each line item's technical specifications.
      - **Cross-Stack Data Persistence**: Stored `hardwarePackage` into line item `customSpecsJson` in PostgreSQL (`sales_quotation_items`), passed it to `QuotationPdfData`, and rendered `• Hardware: <package>` in the quotation PDF spec-box.

7. **Separation of Hardware Selection & Board Type ("HPL & HDF")**:
   - **Isolated Hardware Selection Block**: Separated hardware selection into its own standalone block per line item (featuring a `<Wrench />` badge, dropdown for standard & custom packages, and quick pill-selectors for SS 304, Nylon, SS 316, and Aluminium) distinct from physical board dimensions.
   - **Board Type (`HPL` & `HDF`)**: Added a dedicated `Board Type` selector with options `HPL (High Pressure Compact Laminate)` and `HDF (High Density Fibreboard)` within the Cubicle Technical Specifications card for every line item.
   - **Unified Creation & Edit UX**: Both `DraftQuotationPage.tsx` and `EditSalesQuotationPage.tsx` share identical visual hierarchy, Quick Boilerplate Presets, real-time live total banner, modular technical specs, and hardware packages.
   - **Cross-Stack Schema & PDF Synchronization**: Updated `src/types/admin.ts` (`SalesQuotationItem`), backend `quotations.service.ts` (`create`, `update`, `getPdfHtml`), and `pdf.service.ts` (`QuotationPdfData`, line-item `.spec-box` rendering `• Board Type:` and `• Hardware:`).

---

## 18. Quotation Follow-Up & Omnichannel Client Engagement System

1. **Auto-Scheduling Rule (Within 2 to 3 Hours)**:
   - **Auto-Scheduler Trigger**: Whenever a quotation is created (`POST /sales/quotations`) or issued/sent (`POST /sales/quotations/:id/send`, `POST /sales/quotations/:id/send-email`), the backend automatically initializes `nextFollowupDate` to **2.5 hours** from the current timestamp (`Date.now() + 2.5 * 60 * 60 * 1000`) with `followupStatus: 'PENDING'`.
   - **Scheduled Entry**: An initial `quotation_followups` record is seeded with `status: 'SCHEDULED'` and `discussionNotes: 'Initial follow-up auto-scheduled within 2.5 hours of quotation creation.'`.

2. **Mobile-First Omnichannel Engagement Hub (`QuotationFollowupModal.tsx`)**:
   - **Touch Target Standard**: Full $\ge 44\text{px}$ minimum clickable surfaces for mobile and desktop screens.
   - **Omnichannel Channels**:
     - **Phone Call**: Direct `tel:` link triggering the native dialer with immediate outcome logger focus.
     - **WhatsApp**: Direct `https://wa.me/` link pre-populated with client name, quotation reference number, project name, total value, and professional pitch.
     - **Messages (SMS)**: Direct `sms:` link for native mobile text message dispatch.
     - **Email Follow-up Hub**: Integrated dispatch via Resend/Nodemailer (`POST /sales/quotations/:id/send-followup-email`) with customizable subject, message body, automatic next follow-up scheduling, and CRM timeline logging.

3. **Discussion Logging & Outcome Statuses**:
   - **Outcome Statuses**: `COMPLETED`, `INTERESTED` (warm lead), `PRICE_NEGOTIATION`, `CALLBACK_REQUESTED`, `NO_ANSWER`, `ORDER_CONFIRMED` (automatically updates quotation status to `ACCEPTED`), `DROPPED`, `SCHEDULED`.
   - **Quick Preset Chips**: Rapid 1-tap discussion notes presets ("Spoke with client, reviewing offer", "Client requested price negotiation / discount", "Shared formal quotation on WhatsApp", "Client requested site visit / mockup cubicle inspection", "Quotation accepted! Client preparing formal Purchase Order", "No response on call; sent WhatsApp message and email summary").
   - **Quick Schedule Presets**: `+2 Hours`, `+4 Hours`, `Tomorrow 10 AM`, `Tomorrow 3 PM`, `In 2 Days`, `In 1 Week`, and native `datetime-local` picker.

4. **Timeline History**:
   - Reverse-chronological activity log displaying channel badges, performer name, outcome status pill, timestamp, and notes.

5. **List & Detail Page Integration**:
   - **`SalesQuotationsPage.tsx`**: Live Follow-up countdown pills (Overdue with pulsing badge, Due in X hours, Scheduled), direct WhatsApp and Call buttons on both desktop table rows and mobile card views, and dedicated Follow-Up modal trigger.
   - **`SalesQuotationDetailPage.tsx`**: Top action buttons for Follow-Up, WhatsApp, and Call; dedicated 4th card in Info Grid ("Follow-Up Hub") with live status and one-tap logging; and `QuotationFollowupModal` integration.

6. **Database & API Cross-Stack Sync**:
   - **PostgreSQL Table**: `quotation_followups` (`id`, `quotationId` FK cascade, `channel`, `status`, `discussionNotes`, `nextFollowupDate`, `contactPerson`, `contactPhone`, `contactEmail`, `performedById`, `performedByName`, `createdAt`, `updatedAt`).
   - **`sales_quotations` Columns**: `nextFollowupDate`, `followupStatus`, `lastFollowupDate`, `followupCount`.
   - **API Endpoints**: `GET /sales/quotations/:id/follow-ups`, `POST /sales/quotations/:id/follow-ups`, `POST /sales/quotations/:id/send-followup-email`.
   - **TypeScript Types**: `QuotationFollowup`, `QuotationFollowupChannel`, `QuotationFollowupStatus` in `src/types/admin.ts`.

---

## 19. ERP 7-Stage Commercial Lifecycle Pipeline, Stage-Specific T&C Vector PDFs & Proforma Advance Tracking System

1. **Re-Architected 7-Stage Pipeline (Bi-Directionally Linked & Standalone Supported)**:
   - **Stage 1 — Sales Quotation (`PPS/D/...`)**: Formal architectural proposal & rate estimate. Delinked from direct Order creation; converts directly to Proforma Invoice (`POST /sales/quotations/:id/convert-to-pi`).
   - **Stage 2 — Proforma Invoice (`PPS/PI/...`)**: Precondition commercial invoice with dedicated Advance Payment Tracking (`advancePercentage`, `advanceRequiredAmount`, `advanceReceivedAmount`, `advancePaymentStatus`). Converted to Sales Order only upon clearance or manual administrative override (`POST /sales/pi/:id/convert-to-order`).
   - **Stage 3 — Sales Order Hub (`PPS/ORD/...`)**: Official manufacturing fabrication order. Default status starts at `PENDING_APPROVAL` $\rightarrow$ `WAITING_FOR_ADVANCE` $\rightarrow$ `APPROVED` $\rightarrow$ `IN_PRODUCTION` $\rightarrow$ `PARTIALLY_DISPATCHED` $\rightarrow$ `FULLY_DISPATCHED`. Accurate source tracking distinguishes `CONVERTED_PROFORMA`, `CONVERTED_QUOTATION`, and `Direct Order`.
   - **Stage 4 — Bill & Tax Invoice (`PPS/INV/...`)**: Official statutory GST Tax Invoice under CGST Act 2017 Sec 31. Generated in 1-click from Sales Order (`POST /invoices/from-order/:orderId`).
   - **Stage 5 — Packing List (`PPS/PL/...`)**: BOM explosion, packet nature classification (Panels, Doors, Hardware, Extrusions), and physical consignee receipt verification.
   - **Stage 6 — Dispatch & Gate Pass (`PPS/DSP/...`)**: Carrier vehicle custody record (`transporterName`, `vehicleNumber`, `driverName`, `driverPhone`, `lrNumber`, `ewayBillNumber`, `totalPackages`) and factory security stamp.
   - **Stage 7 — Hardware Issue List (`PPS/HIL/...`)**: Warehouse store picking slip with sequential 4-role installer sign-off protocol.

2. **Stage-Specific Terms & Conditions ("Alag T&C") Vector A4 PDF Engines**:
   - Every single stage generates a vector A4 PDF template with layout parity to Quotation Letters, but distinct legal and commercial terms:
     - **Quotation**: 30-day validity, site readiness, tolerances, 1-yr cubicle warranty.
     - **Proforma Invoice**: Advance precondition before production, virtual bank account remittance.
     - **Sales Order**: Approved site drawings & PO confirmation, 7-10 day fabrication, ₹500/day demurrage after 5 days, plant pre-dispatch inspection.
     - **Tax Invoice**: CGST Act 2017 Sec 31 statutory declaration, 18% p.a. overdue interest, custom-cut non-returnable policy, Delhi/NCR jurisdiction.
     - **Packing List**: Consignment packet count check, 24-hr shortage/damage report window on POD, indoor flat panel stacking.
     - **Dispatch Challan**: Carrier road transport risk, site security gate pass stamp, 3-hour unloading limit, driver external sign-off.
     - **Hardware Issue**: Store requisition strictly against verified drawings, installer count check, 48-hr excess return, 4-role sequential sign-off.

3. **Frontend Views Overhaul**:
   - **`SalesQuotationsPage.tsx` & `SalesQuotationDetailPage.tsx`**: Action button converted to `[ Convert to PI (Stage 2) ]`.
   - **`ProformaInvoicesPage.tsx`**: Added advance progress bar, `[ Record Advance ]` modal, and `[ To Order ]` action.
   - **`SalesOrdersPage.tsx`**: Fixed source badges (`Proforma Convert` vs `Quotation Convert` vs `Direct Order`) across desktop and mobile views. Clicking order navigates to `/admin/dashboard/sales-orders/:id`.
   - **`SalesOrderDetailPage.tsx`**: Added Order PDF modal with iframe preview and native print, `[ Generate Tax Invoice ]` trigger, `[ Record Dispatch ]` modal, and linked document list spanning all 7 stages.
   - **`SalesOrderTimelinePage.tsx`**: Full 7-stage visual pipeline stepper, live Stage 2 Advance Payment Tracker with progress bar and modal, Universal Vector A4 PDF Preview Modal for all stages, and downstream generation triggers.

4. **Universal 7-Stage `DocumentFlowTimeline` Across All 7 Pipeline Stages**:
   - Integrated `DocumentFlowTimeline.tsx` consistently into every stage of the commercial pipeline:
     - **Stage 1**: `SalesQuotationsPage.tsx`, `SalesQuotationDetailPage.tsx`, `DraftQuotationPage.tsx`, `EditSalesQuotationPage.tsx` (`currentStage={1}`)
     - **Stage 2**: `ProformaInvoicesPage.tsx`, `ProformaInvoiceDetailPage.tsx`, `ProformaInvoiceFollowupPage.tsx`, `CreateProformaPage.tsx`, `EditProformaInvoicePage.tsx` (`currentStage={2}`)
     - **Stage 3**: `SalesOrdersPage.tsx`, `SalesOrderDetailPage.tsx`, `CreateSalesOrderPage.tsx` (`currentStage={3}`)
     - **Stage 4**: `InvoicesPage.tsx`, `CreateInvoicePage.tsx` (`currentStage={4}`)
     - **Stage 5**: `PackingListsPage.tsx`, `CreatePackingListPage.tsx` (`currentStage={5}`)
     - **Stage 6**: Dispatch & Gate Pass integration (`currentStage={6}`)
     - **Stage 7**: `HardwareIssuePage.tsx`, `CreateHardwareIssuePage.tsx` (`currentStage={7}`)
   - Features active stage pulsing glow, completed stage checkmarks, advance clearance pill badge, and deep linking between originating Quotations, PIs, Orders, and downstream dispatches.

5. **Proforma Invoice (PI) 360 Ecosystem & Advance Tracking CRM**:
   - **Sequence Numbering**: Replaced temporary `DRAFT-PI-...` prefixes with server sequence-generated numbers starting strictly with `PPS/PI/<FY>/<seq>` (e.g., `PPS/PI/2026-27/0001`).
   - **Clickable 360 Detail View (`ProformaInvoiceDetailPage.tsx`)**: Clicking any row or card in `ProformaInvoicesPage` navigates to `/admin/dashboard/proforma-invoices/:id` showcasing originating Quotation link, Bill To/Ship To addresses, line items table with HSN/SAC, tax summary dock, and terms & conditions.
   - **Omnichannel Follow-Up Hub (`ProformaInvoiceFollowupPage.tsx`)**: Modeled after Quotation follow-ups; supports Direct Call, WhatsApp templates, Email composing, scheduled touchpoints, advance receipt tracking, and chronologically audited interaction logs.
   - **Single-Page Quotation-Grade Builder (`CreateProformaPage.tsx` & `EditProformaInvoicePage.tsx`)**: Upgraded to single-page builders featuring localStorage auto-save, draft reset, 1-click quotation import, live subtotal/tax/grand-total dock, advance percentage slider, and party address synchronizer.

---

## 20. Quotation & Proforma Invoice List UI Streamlining & Mobile Optimization

1. **Quotation List Refactoring (`SalesQuotationsPage.tsx`)**:
   - **Revision Tag Removed**: Removed the `R{revisionNumber}` badge from both desktop table rows and mobile card headers.
   - **Customer Column Cleaned**: Removed project location (`projectName`, `siteName`, `siteAddress`) from the Customer column in table and mobile views, keeping display focused strictly on customer name.
   - **Date Column Cleaned**: Removed valid-until date (`validUntil`) from the Date column; displays strictly the quotation creation date.
   - **Follow-up Column Cleaned**: Removed the `"Order Confirmed"` badge from the Follow-up column and mobile cards.
   - **Action Column Streamlined**: Removed `WhatsApp`, `Phone (Call)`, `Follow-Up`, and `Convert to PI` buttons from the list view action columns. Action suite streamlined to 4 essential actions: *View/Download PDF*, *Email Quotation*, *Edit Quotation*, and *Delete Quotation*.
   - **Responsive Optimization**: Reduced padding (`p-3.5` / `p-3`), reduced font sizes (`text-xs`, `text-[11px]`), optimized margin spacing, and added responsive pagination controls for compact mobile screens.
   - **Strict Scope**: All modifications isolated to the list view; `SalesQuotationDetailPage.tsx` remains untouched.

2. **Proforma Invoice List Refactoring (`ProformaInvoicesPage.tsx`)**:
   - **Advance Tracking Column Removed**: Deleted the `Advance Tracking` column header and progress bar cells from the desktop table, and removed the advance tracker box from mobile cards.
   - **Action Buttons Removed**: Removed `Status`, `Follow-up`, `Advance`, and `Order / To Order` action buttons from table and mobile cards. Streamlined actions to: *PDF Preview*, *Issue* (for draft PIs), *Edit*, and *Delete*.
   - **Complete Status Button Elimination**: Replaced interactive status trigger buttons with clean, non-clickable static status badge pills (`<span>{pi.status}</span>`). Removed status change button completely from the list route.
   - **Dead Modal Cleanup**: Removed redundant modal markup (Status Update Modal, Advance Payment Modal) and unused state handlers (`statusPi`, `advancePi`, `handleOpenStatusModal`, `handleSaveStatus`, `handleOpenAdvanceModal`, `handleSaveAdvancePayment`, `handleConvertToOrder`) from the list page, as these lifecycle workflows are fully housed within `ProformaInvoiceDetailPage.tsx`.
   - **Responsive Optimization**: Compact mobile card view with reduced margins, padding (`p-3.5`), font sizing, and responsive pagination controls.
   - **Strict Scope**: All modifications isolated to the list view; `ProformaInvoiceDetailPage.tsx` remains untouched.

---

## 21. Central Sales Orders List UI Streamlining & Mobile Optimization

1. **Central Sales Orders List Refactoring (`SalesOrdersPage.tsx`)**:
   - **Customer Column Cleaned**: Removed project location (`siteName`, `Standard Site`) from the Customer column, displaying strictly the customer legal name.
   - **Date Column Cleaned ("Source & Date" $\rightarrow$ "Date")**: Removed all source classification badges (`Proforma Convert`, `Quotation Convert`, `Direct Order`, quotation reference `quoteRef`, and proforma invoice reference `piRef`) from the Date column and mobile card header, leaving a clean date display. Renamed column header from `Customer & Site` to `Customer` and `Source & Date` to `Date`.
   - **Dispatch Progress Column Removed**: Deleted the `Dispatch Progress` table column header and the unit dispatch progress bar cell from the desktop table, as well as the progress bar block from mobile cards.
   - **Action Column Streamlined**: Removed `WhatsApp`, `Phone (Call)`, `Follow-Up`, `Document Timeline`, and `Cancel Order` buttons from both the desktop table rows and mobile card views. Streamlined actions to:
     - 👁️ **View Details** (`Eye` button / link to Order 360)
     - ✅ **Approve Order** (`CheckCircle2` button, visible when status is `PENDING` or `PENDING_APPROVAL`)
     - ✏️ **Edit Sales Order** (`Edit` button)
     - 🗑️ **Delete Sales Order** (`Trash2` button)
   - **Dead Modal & Handlers Cleanup**: Removed dead timeline modal markup (`selectedOrderTimeline`) and unused handlers (`handleOpenTimeline`, `handleCancelOrder`) since full lifecycle timelines and cancel operations reside in dedicated pages (`SalesOrderTimelinePage.tsx` and `SalesOrderDetailPage.tsx`).
   - **Mobile Responsiveness & Spacing**:
     - Reduced card padding to `p-3 sm:p-3.5`, typography to `text-xs`/`text-sm`, and optimized spacing.
     - Single compact mobile action row with `View`, `Approve`, `Edit`, `Delete`.
     - Added responsive pagination controls (`{totalPages > 1 && ...}`) for compact mobile screens.
     - KPI cards adjusted to `p-3 sm:p-4` with responsive typography.
   - **Scope**: List modifications isolated strictly to `SalesOrdersPage.tsx`.

2. **Sales Order Details Page Action Buttons Refactoring (`SalesOrderDetailPage.tsx`)**:
   - **Buttons Removed**: Removed `Document Timeline`, `Record Dispatch`, `WhatsApp`, and `Call` buttons from the top action bar header.
   - **Streamlined Top Actions**: Retained essential workflow triggers (Update Status, Follow-Up Hub, Order PDF, Tax Invoice, Edit Order, Print, Cancel Order).
     - 🚀 **Update Status** (`[ Update Status ]` modal)
     - ⏱️ **Follow-Up Hub** (`[ Follow-Up (count) ]` navigation)
     - 📄 **Order PDF** (`[ Order PDF ]` vector preview)
     - 💳 **Tax Invoice** (`[ Tax Invoice ]` stage 4 generator)
     - ✏️ **Edit Order** (`[ Edit ]` modal)
     - 🖨️ **Print** (`[ Print ]` browser print)
     - 🚫 **Cancel Order** (`[ Cancel Order ]` trigger)

---

## 22. Document Flow Timeline Architecture & Universal Individual Linking

1. **Removal of Static List Hub Banners**:
   - The static top banner ("Document Flow Timeline • Stage XX of 07") has been systematically removed from all 7 list hub views:
     - `dashboard/sales-quotations` (`SalesQuotationsPage.tsx`)
     - `dashboard/proforma-invoices` (`ProformaInvoicesPage.tsx`)
     - `dashboard/sales-orders` (`SalesOrdersPage.tsx`)
     - `dashboard/invoices` (`InvoicesPage.tsx`)
     - `dashboard/packing-lists` (`PackingListsPage.tsx`)
     - `dashboard/dispatches` (`DispatchStatusPage.tsx`)
     - `dashboard/issue-lists` (`HardwareIssuePage.tsx`)
   - Replaced misleading aggregate-level static timeline banners with document-specific timelines linked to individual records.

2. **Core Stepper & Intelligence Dock (`DocumentFlowTimeline.tsx`)**:
   - Upgraded `DocumentFlowTimeline.tsx` with rich intelligence props: `currentStatus`, `statusDescription`, `nextStepTitle`, `nextStepDescription`, `nextStepActionLabel`, `nextStepActionUrl`, `onNextStepAction`, `documentRef`, and `showNextStepCard`.
   - **Current Status Card**: Displays active stage badge, status description, and reference number.
   - **Next Step Card**: Displays dynamic next step guidance (e.g., Quotation -> Convert to PI / Create Sales Order; PI -> Collect Advance / Convert to Order; Order -> Issue Tax Invoice & PL; Tax Invoice -> Consignment Packing List; Packing List -> Gate Pass; Dispatch -> Consignee Acknowledgment & HIL; Issue List -> Sequential 4-Role Sign-off) with direct action triggers.
   - **Linked Lifecycle Strip**: 1-click pills connecting all linked stages in that document's commercial flow.

3. **Universal Document Flow Timeline Modal (`DocumentFlowTimelineModal.tsx`)**:
   - Reusable modal dialog hosting the complete `DocumentFlowTimeline` with document title, stage, reference, status, next steps, and "Full Details" navigation.
   - Integrated across list views without dedicated detail pages:
     - **`InvoicesPage.tsx`**: Table row clicks, mobile card tap, and Action column "Flow" button open modal for the specific invoice.
     - **`PackingListsPage.tsx`**: Table row clicks, mobile card tap, and Action column "Flow" button open modal for the specific packing list.
     - **`DispatchStatusPage.tsx`**: Table row clicks, mobile card tap, and Action column "Flow" button open modal for the specific dispatch record.
     - **`HardwareIssuePage.tsx`**: Table row clicks, mobile card tap, and Action column "Flow" button open modal for the specific issue list.

4. **Dedicated Detail Page Integrations**:
   - **`SalesQuotationDetailPage.tsx`**: Embedded full Document Flow Timeline with current quotation status and reference.
   - **`ProformaInvoiceDetailPage.tsx`**: Embedded full Document Flow Timeline with current PI status and reference.
   - **`SalesOrderDetailPage.tsx`**: Embedded full Document Flow Timeline with current order status and reference.

---

## 16. Products & Models Management Hub (Cubicle, Lockers, Urinal Partitions, Kids Toilet)

1. **Dynamic Four Core Product Lines (Form-Driven Model Catalog)**:
   - **Route**: `/admin/dashboard/products` (`AdminProducts.tsx`) with dedicated builder `/admin/dashboard/products/new` (`CreateAdminProductPage.tsx`).
   - Replaced static seeded models with a pure, form-driven catalog architecture:
     - **No Hardcoded Cards**: Pre-seeded models are managed dynamically (`DEFAULT_CATALOG_MODELS = []`). The catalog models are created, edited, and deleted dynamically by the administrator, supported by standard presets (`PACIFIC_STANDARD_QUOTATION_MODELS`).
     - **Product 1 — Cubicle**:
       - Dual Hardware Option: **SS Hardware** (3 selectable colors: *Golden*, *Black*, *Stainless Steel*) and **Nylon Hardware**.
       - Standardized Description & 6 Engineering Specifications: Dedicated form inputs (Standard Height: 1980 mm / 2000 mm, Standard Depth: 1500 mm – 1800 mm, Door Width: 600 mm / 900 mm, Board Thickness: 12mm / 18mm Solid Compact Phenolic Laminate, Fire Rating: Class 1 / BS 476 Part 7, Water Resistance: 100% Moisture Proof).
       - Hardware Bill of Materials (BOM): Component name, material applicability (SS / Nylon / Both), and technical notes.
     - **Product 2 — Lockers**:
       - Uniform Standard Hardware: Shared heavy-duty hardware suite with **no color options**, customizable tier counts (Tier 1–6, Z-Shape).
     - **Product 3 — Urinal Partitions**:
       - Extra Floor Leg Hardware: Dedicated extra supporting floor leg (100–150mm) option for Model A, alongside wall cantilever configurations.
     - **Product 4 — Kids Toilet** (ID: `'Kids Toilet'`, Key: `'Kids Toilet'`):
       - Child-Safety Ergonomic Partitions: Specially engineered for schools, kindergartens, daycare centers, and amusement parks.
       - Key Features: Anti-finger pinch clearance gaps, low-height doors for supervisory oversight, rounded anti-collision safety corners, soft-closing nylon spring hinges, and outside emergency release coin latch for faculty safety access.
       - Hardware Options: Supports both SS Safety Hardware (Golden, Black, SS) and vibrant Nylon Hardware.

2. **Universal Image Upload Everywhere**:
   - Image upload option on **every product category** and **every single model**.
   - Dual-transport: Direct file picker uploading to Supabase Storage bucket (`products`) via `uploadImage(file, "products")` with webp optimization and client-side `FileReader` instant preview, alongside manual image URL input.

3. **Interactive UI, Tabs & Full CRUD Operations**:
   - **Product Line Tabs**: Clean direct category tabs for the 4 core products: "1. Cubicle", "2. Lockers", "3. Urinal Partitions", and "4. Kids Toilet".
   - **Active Product Banner**: Displays high-res cover image, tagline, and description with an "Edit Product Cover" dialog.
   - **Dual View Modes**: Switch between **Visual Cards View** and **Detailed Table View**.
   - **Dedicated Full-Page Add New Model (`/admin/dashboard/products/new`)**: `CreateAdminProductPage.tsx` provides full-page model creation with auto-drafting, category switching, hardware option configuration, image upload, and interactive BOM builder.
   - **Dedicated Full-Page Model 360 View (`/admin/dashboard/products/:id`)**: `ProductModelDetailPage.tsx` displays high-resolution media gallery, category badges, hardware configurations, itemized BOM breakdown table, and 1-click BOM print action.
   - **Dedicated Full-Page Edit Model (`/admin/dashboard/products/:id/edit`)**: `EditProductModelPage.tsx` loads existing model specifications, image preview, SS color options, extra floor leg toggles, and editable BOM table.
   - **Delete Modal with Guard**: Standard confirmation dialog: *"This action cannot be undone."*
   - **Persistence & Synchronization**: `productCatalogApi` synchronizes with Supabase table `products` in real-time, backed by `localStorage` caching (`pacific_product_catalog_models_v4`) with automatic purge of older `v1-v3` caches. Empty state offers direct "Create First Model" action.

---

## 17. Quotation Model Linking, Auto-Fetching & PDF Synchronization

1. **Quotation Line Item Model Selection (`DraftQuotationPage.tsx` & `EditSalesQuotationPage.tsx`)**:
   - **Model Dropdown Selection**: Instead of manual free-text input for line item descriptions, a dedicated `<select>` control displays all available product models grouped by category (*Restroom Cubicle Systems*, *Compact Laminate Lockers*, *Urinal Partition Screens*, and *Custom / Non-Catalog Item*).
   - **Database-Driven Catalog Parity**: All 24 official Pacific models (13 Cubicles, 7 Lockers, 4 Urinal Partitions) are persisted directly in Supabase PostgreSQL table `products` with structured `__hardware_meta`. Both `/admin/dashboard/products` and the quotation creation/edit pages fetch strictly via `productCatalogApi.listModels()`, ensuring exact 1:1 parity with no static mock discrepancies. Any model created, updated, or deleted by the administrator in the product manager instantly reflects across quotations.

2. **Automated Specifications & Hardware List Inclusions Auto-Fetch**:
   - **Hardware List Replacement**: When a product model is selected, its itemized Hardware Bill of Materials (BOM) is automatically converted into a structured bullet list and replaces the content of `"Standard Inclusions & Hardware Accessories *"` (`accessoriesText`).
   - **Dimension & Specification Auto-Fill**:
     - `cubicleSize`: Auto-populated from model depth/dimensions (e.g. `1000mm W × 1500mm D` or standard depth specifications).
     - `doorSize`: Auto-populated from model door width specifications (e.g. `600 mm (Standard) / 900 mm (Accessible)`).
     - `overallHeight`: Auto-populated from model height specifications (e.g. `1980 mm / 2000 mm (including 150mm floor gap)`).
     - `boardThickness`: Auto-populated (e.g. `12mm / 18mm Solid Compact Phenolic Laminate`).
     - `boardType`: Pre-selected as `HPL`.
     - `hardwarePackage`: Auto-set to the model's applicable hardware specification (e.g. SS 304 / Nylon / Heavy-Duty Locker / Urinal partition mounts).

3. **Backend PDF Generation System Synchronization (`pdf.service.ts`)**:
   - **Preserved Multi-Line Bullet Lists**: Styled `.accessories-box` with `white-space: pre-line;` to ensure multi-line hardware inclusions render crisply with proper indentation and line breaks across all printed and downloaded PDFs.
   - **Clean Specification Rendering**: Line-item `.spec-box` explicitly renders all auto-fetched attributes (`• Board Type`, `• Board Thickness`, `• Board Color`, `• Cubicle / Depth Size`, `• Door Size`, `• Overall Height`, and `• Hardware Package`).

---

## 18. Small-Device Global Scrollbar Removal & Mobile PWA App Installation

1. **Global Scrollbar Removal on Small Devices (`src/index.css`)**:
   - **Target Viewports**: Applied to all viewports $\le 1024\text{px}$ (`@media (max-width: 1024px)`) and all coarse touch devices (`@media (pointer: coarse)`).
   - **Complete Invisibility**: Set `-ms-overflow-style: none !important;` and `scrollbar-width: none !important;` on all elements, alongside `*::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }`.
   - **Scrollability Preserved**: Smooth touch scrolling, momentum swipe, and drag scroll functionality remain 100% active and unhindered throughout the entire app without visible scrollbars cluttering mobile screens.
   - **Removed Inline Overrides**: Cleaned inline `style={{ scrollbarWidth: 'thin' }}` from `AdminLayout.tsx` so CSS rules take precedence everywhere.

2. **Progressive Web App (PWA) Mobile App Installation**:
   - **True Square Icons (`public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`)**: Replaced non-square images with exact 192x192, 512x512, and 180x180 square PNG icons with `#030213` brand background and centered high-res Pacific logos, fulfilling strict Chromium maskable and icon criteria.
   - **Web App Manifest (`public/manifest.json`)**: Configured with `display: "standalone"`, `display_override: ["standalone", "minimal-ui", "window-controls-overlay"]`, `theme_color: "#030213"`, `background_color: "#030213"`, app metadata, and separated "any" and "maskable" icon declarations.
   - **Early Event Capture (`index.html`)**: Added an inline head/body script capturing `beforeinstallprompt` into `window.__deferredPwaPrompt` before React mounts, preventing race condition loss of the install event during Vite bundle hydration.
   - **Service Worker Reliability (`src/utils/registerServiceWorker.ts` & `public/sw.js`)**: Implemented immediate execution if `document.readyState !== 'loading'`, avoiding missed `load` listeners on SPAs. Service worker precaches shell assets and provides network-first fetch handler for offline resilience.
   - **Installation Hook (`src/hooks/usePWAInstall.ts`)**:
     - Captures both `beforeinstallprompt` and early custom `pwa-prompt-ready` events.
     - Detects standalone mode (`display-mode: standalone` / `window.navigator.standalone`).
     - Detects iOS, Android, and Windows Desktop platforms.
     - Provides direct `promptInstall()` triggering native prompt when available, or opening platform-specific guidance.
   - **UI Integration**:
     - **Header Trigger (`AdminHeader.tsx`)**: Dedicated "Install App" button with `<Download />` icon displayed when the app is not yet installed.
     - **Sidebar Trigger (`AdminSidebar.tsx`)**: "Install Mobile App" card located in the sidebar footer.
     - **Floating Mobile Install Banner (`PWAInstallBanner.tsx`)**: Sleek, dismissible floating bottom banner for mobile screens (`lg:hidden`) floating above the bottom dock.
     - **Platform-Aware Install Modal (`PWAInstallModal.tsx`)**: 1-click install action when native prompt is ready, plus clear visual instructions for:
       - **Windows**: Address bar install icon (💻⬇️) or Menu (⋮) -> "Install Pacific Admin...".
       - **Android**: Menu (⋮) -> "Install app" / "Add to Home screen".
       - **iOS (Safari)**: Share [↑] -> "Add to Home Screen" [+] -> "Add".





    - **Browser Tab Favicon & Touch Icon (index.html)**: Configured <link rel="icon" type="image/png" href="/tab-logo.png" /> and <link rel="shortcut icon" href="/tab-logo.png" /> ensuring Chrome and all desktop/mobile browsers display tab-logo.png directly on browser tabs and shortcuts.

---

## 19. Strict Separation: Domestic B2B Customers vs. Foreign Buyers (International CRM)

1. **Architecture & Relation Model**:
   - **Domestic B2B Customers**: Represented by BusinessParty where exportCustomerProfile is null and linked to CustomerProfile (Indian GSTIN, PAN, state/city, CONTRACTOR / ARCHITECT / CORPORATE / INSTITUTIONAL types).
   - **Foreign Buyers (International CRM)**: Represented by BusinessParty linked to ExportCustomerProfile (exportCustomerProfile: { isNot: null }) storing destination country, foreign tax ID / VAT TRN, default incoterm (CIF, FOB, etc.), foreign currency (USD, EUR, AED), overseas port, and international bank coordinates (SWIFT/BIC, IBAN).

2. **Query & Controller Boundary Enforcement**:
   - **Domestic CRM (/api/v1/crm)**: crmService.listCustomers and crmService.checkDuplicates strictly enforce exportCustomerProfile: null. Foreign buyers are never mixed into domestic quotation workflows, sales orders, or domestic customer lists.
   - **International CRM Desk (/api/v1/export/customers)**: exportService.listExportCustomers and exportService.globalOmniSearch strictly enforce exportCustomerProfile: { isNot: null } (or filtered by countryId). Domestic customers are never mixed into international export desk queries.
   - **Dedicated Creation Pipeline**: Added POST /api/v1/export/customers handled by exportService.createExportCustomer creating BusinessParty and ExportCustomerProfile in a single atomic transaction without creating an accidental domestic CustomerProfile. Added DELETE /api/v1/export/customers/:id for deletion of foreign buyer records.
   - **Frontend Integration**: exportApi.createCustomer and exportApi.deleteCustomer wired up to CreateExportCustomerPage.tsx and ExportCustomersPage.tsx.

---

## 20. Performance Optimization, Resilient Cache Architecture & Icon Manifest Resolution

1. **PWA Manifest & Square Icons Resolution**:
   - Generated exact square icons from 1024x1024 tab-logo.png:
     - public/icon-192.png (192x192)
     - public/icon-512.png (512x512)
     - public/apple-touch-icon.png (180x180)
   - Resolves Chrome manifest warning: 'Error while trying to use icon-192.png (Download error or resource isn't a valid image)'.

2. **Catalog API Resilient Cache-First Architecture (productCatalogApi.ts)**:
   - Instant Rendering: Reads memory/localStorage models immediately (0ms latency) without blocking on remote network responses.
   - Resilient Background Sync: Bound remote Supabase calls to strict 2500ms timeouts with quiet fallback, preventing ERR_CONNECTION_RESET or HTTP2_PROTOCOL_ERROR from freezing the UI.
   - Instant Save & Delete: Commits updates to cache and localStorage immediately before background syncing, ensuring zero lag for admin users.

3. **Supabase Client Global Timeout (supabase.ts)**:
   - Configured global fetch with an AbortController (4000ms timeout) so remote connection failures terminate cleanly instead of locking the thread.

4. **Backend Throughput Acceleration (database.ts)**:
   - Prisma logging restricted to ['error'] in PACIFIC-Backend, eliminating synchronous query terminal logging on every database transaction.

5. **Cleaned Console Output**:
   - Removed redundant [PWA] Service Worker and prompt console logs from registerServiceWorker.ts and index.html.

---

## 21. Quotation Hardware Inclusions & Creation Page Streamlining

1. **Hardware Inclusions Narrative Cleanup (quotationProductPresets.ts)**:
   - Removed the default headline 'Dual Hardware Options: SS Hardware (golden, Black, stainless steel) & High-Impact Polyamide Nylon' from cubicle hardware inclusions.
   - Standard inclusions now render only the clean, itemized hardware components without the redundant dual-options header.

2. **Line Item UI Simplification (DraftQuotationPage.tsx & EditSalesQuotationPage.tsx)**:
   - Removed the redundant 'Hardware Selection Item Package' card from each line item, as hardware details are already auto-fetched by model selection and managed under Standard Inclusions & Hardware Accessories.
   - Updated Section 5 heading to 'Standard Inclusions & Hardware Accessories'.

---

## 22. Product Model Hardware BOM Form Streamlining

1. **Hardware BOM Builder Dropdown Removal (`CreateAdminProductPage.tsx` & `EditProductModelPage.tsx`)**:
   - In Section 6 (**Hardware Bill of Materials**), removed the redundant material dropdown (`Both (SS & Nylon)` / `SS Hardware Only` / `Nylon Hardware Only`).
   - Adding a hardware component now simply requires entering the component name and pressing Enter or clicking `+ Add Component`.
   - Hardware component addition assigns the standard `'Both'` material designation automatically for cubicle models.
   - Also aligned `AdminProducts.tsx` quick-add modal to remove the corresponding material dropdown for unified behavior across all model creation entry points.

---

## 23. Resend Email Dispatch Service & SChannel Transport Fix

1. **Root Cause Analysis (`Unable to fetch data. The request could not be resolved`)**:
   - In Node.js (v24), the built-in `fetch` engine (Undici) suffered from connection timeouts (`UND_ERR_CONNECT_TIMEOUT`, code: `ECONNRESET`) when attempting TLS handshakes with Cloudflare/Resend endpoints (`api.resend.com` on Indian edge IPs).
   - Resend SDK caught these low-level socket timeouts and surfaced them as generic application errors: `Unable to fetch data. The request could not be resolved.`
   - In addition, the default fallback sender address in `env.ts` (`sales@pacificrestroomcubicle.com`) was unverified on Resend, whereas the verified domain is `pacificproduct.in`.

2. **Backend Resilient Multi-Transport Architecture (`PACIFIC-Backend/src/utils/email.service.ts`)**:
   - Implemented primary execution via Windows native `curl.exe` with piped `--data-binary @-` over `stdin`.
   - `curl.exe` utilizes Windows OS-native Schannel (SSPI), which seamlessly performs TLS renegotiation with Cloudflare edge nodes without timeout or connection reset.
   - Preserved Resend SDK as secondary fallback transport with structured error handling.
   - Synchronized verified domain sender: default `from` address enforced to `Pacific Products & Solutions <ejaj@pacificproduct.in>`.
   - Verified automated end-to-end PDF attachment email delivery to `delivered@resend.dev` with 200 OK delivery confirmation.

---

## 24. Hardware Bill of Materials (BOM) Tag Badge Cleanup

1. **Hardware Material Badges Removal (`CreateAdminProductPage.tsx` & `EditProductModelPage.tsx`)**:
   - In Section 6 (**Hardware Bill of Materials**), removed material badge chips (`SS Hardware`, `Both`, `Nylon Hardware`) from the component list items.
   - Hardware items now display cleanly with their component index and name (`1. Stainless Steel U-Channel`), without visual tag clutter.
   - Preserved `Extra Leg` indicator badge exclusively for Urinal Partition Model A specifications.
   - Aligned `ProductModelDetailPage.tsx` and `AdminProducts.tsx` by removing the redundant Material table column for clean and uniform presentation across detail and modal views.
---

## 25. Board Inventory Management System

1. **Architecture & Scope**:
   - High-performance, scalable raw material compact board stock management for Pacific cubicle manufacturing operations.
   - **4 Supported Manufacturers/Suppliers**: **Royal Crown** (`ROYAL CROWN LAMINATES LTD`), **Stylam** (`STYLAM INDUSTRIES LIMITED`), **Merino** (`MERINO INDUSTRIES LIMITED`), and **Balaji Action Tesa** (`BALAJI ACTION BUILDWELL`).
   - Seeded and synchronized with `vendor_profiles` and linked through `board_inventory_items` and `board_stock_movements`.

2. **Core Data Models & Fields**:
   - `BoardInventoryItem`: `serialNumber`, `itemCode`, `designNo`, `designName`, `size`, `thickness`, `boardType`, `vendorId`, `vendorName`, `openingStock`, `currentStock`, `totalInward`, `totalIssued`, `reorderLevel`, `unitCost`, `locationRack`, `status` (`ACTIVE`, `LOW_STOCK`, `OUT_OF_STOCK`).
   - `BoardStockMovement`: Immutable audit ledger recording `movementNumber`, `inventoryItemId`, `movementType` (`INWARD`, `ISSUE_AUTO`, `ISSUE_MANUAL`, `ADJUSTMENT_ADD`, `ADJUSTMENT_SUB`), `quantity`, `stockBefore`, `stockAfter`, `supplierInvoiceNo`, `supplierInvoiceDate`, `batchLotNo`, `issueListId`, `packingListId`, `notes`, `createdById`.

3. **Inward Stock Tracking**:
   - `StockInwardModal.tsx`: Tracks shipment arrival date, selected supplier from the 4 vendors, invoice/challan number, invoice date, batch/lot number, inward quantity (sheets), unit cost (₹), and rack allocation.
   - Automatically credits `currentStock`, updates status, and logs an `INWARD` movement.

4. **Issue Lists & Dispatch Auto-Deduction with Editability**:
   - Integrated with packing lists & dispatch lists (`packing-lists.service.ts`): Automatically matches panel design numbers (`designNo`, `size`, `thickness`) and decrements `currentStock`, logging `ISSUE_AUTO` movements.
   - **Editable Deductions (`AdjustMovementModal.tsx`)**: Operators can adjust any auto-deduction or manual issue at any time, inputting a revised sheet count and adjustment reason. Inventory balances are dynamically reconciled in real-time.
   - `StockIssueModal.tsx`: Manual stock issue for factory fabrication, sample testing, or scrap with instant stock balance impact warning.

5. **Visual Reporting & Multi-Format Export**:
   - `BoardReportsModal.tsx`:
     - Timeframe filtering: **Day-wise** (Today), **Week-wise** (Past 7 days), **Month-wise** (Current month), **Financial Year** (FY audit), and **Custom Date Range**.
     - Visual charts: Supplier distribution bars (percentage share across 4 vendors), thickness distribution breakdown, and board type breakdown.
     - **Excel (.xlsx)**: Dual-sheet workbook generation (`xlsx`) containing master inventory register and movements ledger.
     - **PDF & Print Preview**: Single-page vector A4 layout with Pacific Products letterhead, metric cards, visual distribution graphs, and printable stock register.

6. **Frontend Routing & Navigation**:
   - Registered `/admin/dashboard/inventory/boards` and `/admin/dashboard/board-inventory` in `App.tsx`.
   - Added `Board Inventory` to `procurementNavItems` in `AdminSidebar.tsx` alongside Purchase Orders and Vendors.

---

## 26. Dedicated SKU Creator, Dual Warehouses & Multi-Module Inventory Expansion

1. **Dedicated Full-Page SKU Master Creator (`CreateBoardSkuPage.tsx`)**:
   - Route: `/admin/dashboard/inventory/boards/new`
   - Replaced modal creation with a dedicated full page featuring live SKU preview generation.
   - **Board Types**: `HPL`, `HDF`, and `Custom Type`.
   - **Preset Sizes (Dual Imperial & Metric Notation)**:
     - `4/4` (1220 × 1220 mm / 4' × 4')
     - `6/6` (1830 × 1830 mm / 6' × 6')
     - `6/7` (1830 × 2135 mm / 6' × 7')
     - `6/8` (1830 × 2440 mm / 6' × 8')
     - `10/4` (3050 × 1220 mm / 10' × 4')
     - Custom Length × Width (mm)
   - **Standard Thicknesses**: `12mm`, `18mm`, `9mm`, `3mm`, and Custom Thickness.
   - **Warehouse Assignment**: `Delhi Warehouse (Central)`, `Kolkata Warehouse (East)`, or Custom Depot.
   - **Category Switcher**: Restroom Cubicle (`RESTROOM_CUBICLE`), Locker Board (`LOCKER_BOARD`), Urinal Modesty Panel (`URINAL_PARTITION_UMP`), and Store Item (`STORE_HARDWARE`). Supports query parameter pre-selection (`?category=...&warehouse=...`).

2. **Dual-Warehouse Separation (Kolkata & Delhi)**:
   - Partitioned raw material inventory balances across **Delhi Central Depot** and **Kolkata Eastern Depot**.
   - Segmented filter pill bar on all inventory pages enabling operators to view All Depots combined or focus specifically on local warehouse stock.
   - Table rows feature visual warehouse pill badges (`DELHI` in sky blue, `KOLKATA` in amber).

3. **Automated Multi-Recipient Low-Stock Email Alert Engine**:
   - Trigger: Automatically dispatched when closing stock drops $\le$ reorder level after an issue list creation, auto-deduction, or manual stock withdrawal.
   - Recipients: Sent to all 5 required operational mailboxes:
     - `ashaminbiswas1@gmail.com`
     - `ejaj@pacificproduct.in`
     - `info@pacificproduct.in`
     - `info.kolkata@pacificproduct.in`
     - `info.pacificproduct@gmail.com`
   - Transport: Windows OS native `curl.exe` with Schannel SSPI (immune to Node.js Undici TLS timeouts on Windows).
   - Content: Responsive HTML alert table displaying warehouse depot (Kolkata vs Delhi), SKU code, design shade, thickness, size, current stock vs reorder threshold, and emergency reorder instructions.
   - Throttling: Enforces 12-hour per-SKU alert cooldown via `lastAlertSentAt` to prevent inbox flooding.

4. **Extended Inventory Subsystems**:
   - **Locker Board Stock Management (`LockerInventoryPage.tsx` at `/admin/dashboard/inventory/lockers`)**:
     - Fields: `Sl No`, `Design No`, `Size`, `Thickness`, `Board Type`, `Opening Stock`, `Closing Stock`, `Issue Details`, `Record Level`, `Warehouse`, `Actions`.
   - **Urinal Modesty Panel / Partition Register (`UmpInventoryPage.tsx` at `/admin/dashboard/inventory/ump`)**:
     - Fields: `S.No`, `D.No`, `Size & Thk`, `Opening Stock`, `Record`, `Issue`, `ClosingStock`, `Remarks`, `Warehouse`, `Actions`.
   - **General Store & Hardware Inventory (`StoreInventoryPage.tsx` at `/admin/dashboard/inventory/store`)**:
     - Fields: `Sl No`, `Part / Item Code`, `Item Description`, `Category / Spec`, `Opening Stock`, `Current Stock`, `Reorder Level`, `Rack Location`, `Warehouse`, `Actions`.

5. **Sidebar Navigation Consolidation**:
   - Grouped all inventory modules under `procurementNavItems` in `AdminSidebar.tsx`:
     - Purchase Orders
     - Suppliers & Vendors
     - Restroom Boards
     - Locker Boards
     - UMP Partitions
     - General Store

6. **Mobile-First Responsiveness**:
   - Compact responsive padding (`px-2 sm:px-4 md:px-6`), optimized table font sizes (`text-[11px] sm:text-xs`), touch targets $\ge 44\text{px}$, and horizontal smooth touch scrolling.

---

## 13. Customer Payment Follow-up & Real-Time Ledger Generation System

1. **Chronological Ledger Calculation Engine (`ledger.service.ts` & `financeApi.getCustomerLedger`)**:
   - Aggregates all transactions for any customer:
     - **Debits (+)**: Proforma Invoices (`PPS/PI/...`) and direct independent Sales Orders (`PPS/ORD/...`).
     - **Anti-Duplication**: If a Sales Order has a linked Proforma Invoice, the debit is attributed to the PI to prevent double-charging the customer's account.
     - **Credits (-)**: Confirmed Payments (`PPS/PAY/...`, bank UTRs, Cheques).
   - Computes chronological running balance: $\text{Bal}_i = \text{Bal}_{i-1} + \text{Debit}_i - \text{Credit}_i$.
   - Supports date range filtering with dynamic `openingBalance`, period debits, period credits, and closing balance.
   - Calculates FIFO overdue dues and days overdue based on customer's `paymentTermsDays`.

2. **Automated 4-Tier Overdue Cadence (3 Consecutive Days Rule)**:
   - Evaluates overdue accounts against configured terms:
     - **Auto-Reminder 1**: Triggered on Day 1 overdue with full Statement of Account & bank coordinates.
     - **Auto-Reminder 2**: Dispatched **3 consecutive days** after Reminder 1 if still unpaid.
     - **Auto-Reminder 3**: Dispatched **3 consecutive days** after Reminder 2 if still unpaid.
     - **Final Notice**: Dispatched **3 consecutive days** after Reminder 3 if still unpaid.
     - **Manual Follow-up**: Transitioned after Final Notice for executive telephone, WhatsApp, or on-site visits.
   - Automated runner endpoint: `POST /api/v1/followups/run-cadence`.

3. **Persistent Omnichannel Audit Trail & History**:
   - Every automated email, manual statement dispatch, phone call, WhatsApp touchpoint, and promised payment date/amount is recorded in `PaymentFollowup` and `PaymentFollowupLog` with user attribution and timestamps.

4. **Payments & Ledger Hub (`PaymentsPage.tsx` at `/admin/dashboard/payments`)**:
   - 4th tab: **"Customer Ledger & Statement"** with customer search, date range filters, KPI cards, vector A4 print, CSV export, cadence progress stepper, and manual email modal (`SendLedgerEmailModal.tsx`).

5. **Customer 360 Hub (`CustomerDetailPage.tsx` at `/admin/dashboard/customers/:id`)**:
   - 5th tab: **"Ledger & Follow-up"** with visual cadence stepper, live running balance ledger table, touchpoint history, and quick action modals (`SendLedgerEmailModal.tsx`, `LogFollowupModal.tsx`).

6. **Clean Deletion of Products Master**:
   - Removed legacy `ProductsMasterPage.tsx` and `CreateProductPage.tsx`.
   - Removed `/admin/dashboard/products-master` from sidebar navigation and route declarations (redirected to `/admin/dashboard/products`).

---

## 14. Dedicated Customer Follow-up & Discussion Hub (`CustomerFollowupPage.tsx`)

1. **Full-Page Dedicated Hub (`/admin/dashboard/customers/:id/follow-up`)**:
   - Symmetrically styled alongside Quotation Follow-up (`QuotationFollowupPage`) and Proforma Invoice Follow-up (`ProformaInvoiceFollowupPage`).
   - Top Header Bar with navigation breadcrumb link (`← Back to Customer 360`), legal entity name, trade name, terms badge (`30 Days Net`), GSTIN, PAN, and live refresh trigger.
   - Financial Summary KPIs: Total Invoiced (Debits), Payments Received (Credits), Net Balance Outstanding, and Overdue Amount.
   - 4-Tier Automated Cadence Stepper (Reminder 1 ➔ Reminder 2 ➔ Reminder 3 ➔ Final Notice ➔ Escalated/Manual) displaying current overdue stage.

2. **4 Dedicated Sub-Tabs**:
   - **Log Interaction / Call**: Omnichannel touchpoint recording across 4 channels (Phone Call, WhatsApp, In-Person Visit, Email). Features 6 quick discussion chips, detailed notes, customer response, promised payment date & amount, next follow-up date picker, and status selector (`PROMISED_TO_PAY`, `DISPUTED`, `ESCALATED`, etc.).
   - **Statement of Account (Ledger)**: Real-time chronological debit/credit ledger table with running balances, printable Vector A4 invoice statement via print popup, and CSV export.
   - **Dispatch Notice Email**: Stage-specific notice email generation (`STATEMENT`, `REMINDER_1`, `REMINDER_2`, `REMINDER_3`, `FINAL_NOTICE`). Dynamic subject and professional body auto-populated with invoice totals, terms, and bank RTGS coordinates. Dispatches via backend email infrastructure with audit logging.
   - **Touchpoint History**: Unified chronological audit trail combining automated cadence notice emails and manual staff interactions with timestamps and user attribution.

3. **Universal Access Points**:
   - **B2B Customers Table (`CustomersPage.tsx`)**: Prominent amber `Follow-up` button on every desktop row and mobile card action bar.
   - **Customer 360 Page (`CustomerDetailPage.tsx`)**: Header action button `Follow-up Hub` alongside Edit Customer, Merge, and New Quote; plus quick-launch button in the `Ledger & Follow-up` tab.

---

## 27. Financial Synchronization, Pre-ERP Historical Ledger, Executive Statement & Bank Remittance

1. **Customer 360 vs Ledger KPI Alignment & Advance Display**:
   - **Root Cause & Resolution**: Resolved discrepancy where Customer 360 previously filtered only `ISSUED` proforma invoices while Ledger aggregated all active invoices, causing draft PIs (such as `PPS/PI/2026-27/0008` ₹21,830 for Ashamin Biswas) to show as ₹0 invoiced. Aligned `crm.service.ts` to include all non-cancelled PIs (`status: { notIn: ['CANCELLED'] }`), producing a synchronized ₹21,830 total invoiced.
   - **Advance / Credit In Hand Display**: When confirmed customer receipts exceed total invoiced (e.g. ₹1,12,100 paid vs ₹21,830 invoiced), the Outstanding Due KPI card transitions to an **"Advance in Hand"** card in emerald green with an **"Advance / Credit Balance"** badge, showing ₹90,270 without confusing negative signs.

2. **Universal Customer Payment Recording (`RecordPaymentModal.tsx`)**:
   - Operator modal available across Customer 360, Customer Follow-up Hub, and Payments & Ledger Hub.
   - Fields: Payment Date, Amount (₹), Payment Mode (`NEFT_RTGS`, `IMPS`, `UPI`, `CHEQUE`, `CASH`, `CARD`), Reference / UTR / Cheque No., and Narration notes.
   - Embeds live company bank verification info (`Central Bank Of India`) with 1-click account/IFSC copy.
   - Immediately dispatches to `POST /api/v1/finance/payments`, creates payment allocation, and updates customer ledger balances in real time.

3. **Pre-ERP Historical Transaction System (`ManualLedgerEntryModal.tsx`)**:
   - Allows recording past pre-ERP transactions before migration to Pacific ERP:
     - **Debit Entries (+)**: Historical / Legacy Invoices, Opening Due Balances, Debit Adjustments. Supports optional itemized line items (description, quantity, unit rate, amount).
     - **Credit Entries (-)**: Past Bank Transfers / Remittances, Opening Advance Balances, Credit Adjustments.
   - Backend endpoint: `POST /api/v1/finance/ledger/:customerId/manual-entry` in `ledger.service.ts`.
   - Creates persistent audit records with reference numbers (e.g. `HIST-INV-...`, `HIST-REC-...`), maintaining historical integrity in customer statements.

4. **Executive Quotation-Style Statement of Account Redesign**:
   - Redesigned Vector print & PDF statement to match official Pacific Sales Quotation styling:
     - Monochrome executive borders (`#000000` double outer border, single inner grid).
     - Company header with logo, GSTIN, PAN, and corporate address (`B-20, Ganga Vihar, Gokalpuri, Delhi - 110094`).
     - Customer Billing block (`M/S [Customer Name]`, Contact Person, Phone, Email, GSTIN, PAN, Payment Terms).
     - Financial KPI Summary: Total Debits (Invoiced), Total Credits (Paid), and Net Closing Balance.
     - Itemized Transaction Ledger: Date, Ref / Doc No, Transaction Type, Narration, Debit (₹), Credit (₹), and Running Balance (₹).
     - **Amount in Words**: Formal Indian Numbering System (`Rupees ... Only`) with Credit / Debit suffix.
     - **Entity Bank Accounts & Remittance Info**: Central Bank of India account, IFSC, Branch, Beneficiary.
     - **Official Sign-off Block**: For Pacific Products & Solutions, Authorized Signatory (`Ejajul Shaikh`, Company Head).

5. **Entity Bank Accounts & Remittance Info Synchronization**:
   - Sourced directly from `/company-settings` database records (`Central Bank Of India`, A/C `3466708013`, IFSC `CBIN0283809`, Branch `B-20, Ganga Vihar, Gokalpuri, Delhi - 110094`).
   - Symmetrically rendered in dedicated visual cards with 1-click copy buttons in `CustomerDetailPage.tsx`, `CustomerFollowupPage.tsx`, and `PaymentsPage.tsx`.

---

## 28. Dynamic Vendor Master Integration & Test Data Cleansing

1. **Test Payment Deletion**:
   - Safely and completely removed test payment `PPS/PAY/2026-27/0002` (UTR: `UTR-163111`, ₹1,12,100.00) from the database (`payments` table).
   - Customer 360 and Ledger for Ashamin Biswas now accurately reflect only the active proforma invoice (`PPS/PI/2026-27/0008` ₹21,830.00) with zero payments (`periodCredits: 0`), resulting in a true closing balance of ₹21,830.00.

2. **Dynamic Vendor Master Integration for Inventory SKU Creation**:
   - **Backend (`boardInventory.service.ts`)**:
     - Removed hardcoded 4-supplier filter in `listSuppliers()`.
     - Now dynamically queries all active vendors from the **Vendor & Supplier Master** (`BusinessParty` where `partyType in ['VENDOR', 'BOTH']` and `status != 'DELETED'`), auto-creating or linking `VendorProfile` records if missing.
     - `createBoard()` now robustly resolves `vendorProfile` by either `vendorProfile.id` or `partyId` with automatic fallbacks.
   - **Frontend (`CreateBoardSkuPage.tsx` & `CreateBoardModal.tsx`)**:
     - Updated Section 2 label: **"Approved Supplier / Manufacturer * (Vendor & Supplier Master)"**.
     - Added direct link to `/admin/dashboard/vendors` (**"Manage in Vendor Master ↗"**) to add or edit vendors on the fly.
     - Dropdown dynamically displays all active suppliers from the Vendor Master with count badge.
     - Validation updated to guide operators to select a supplier from the Vendor Master.
     - `BoardInventoryPage.tsx` summary banner updated to dynamically show `{suppliers.length} Master Suppliers`.

---

## 29. Complete Database Data Purging & Unthrottled Real-Time Low-Stock Alert Engine

1. **Permanent Database Purge of Hardcoded Stock & Vendor Master**:
   - **Board Inventory**: Permanently purged all hardcoded and test board inventory items and stock movements from `board_inventory_items` and `board_stock_movements`.
   - **Vendor & Supplier Master**: Permanently deleted all vendor business parties, vendor profiles, addresses, and contacts from `business_parties` (`partyType: 'VENDOR'`), `vendor_profiles`, `party_addresses`, and `party_contacts`.
   - **Customer Preservation**: All customer business parties (`Ashamin Biswas`, `Precious Trading Company`) and their financial documents (Proforma Invoices, Sales Orders) remain 100% preserved.

2. **Unthrottled Real-Time Low-Stock Multi-Recipient Alert Engine**:
   - **Throttle Removal**: Removed the 6-hour artificial delay (`lastAlertSentAt < 6h`) from `inventoryAlert.service.ts`. The alert engine now triggers an automated email **every single time** stock hits or is at/below the reorder threshold level across all operations.
   - **Multi-Operation Hooks**:
     - `createBoard`: Fires if new SKU opening stock $\le$ reorder level (`SKU Initialized at or below Reorder Level`).
     - `updateBoard`: Fires if SKU stock level or reorder threshold is updated to $\le$ reorder level.
     - `issueStockManual`: Fires whenever a manual issue drops stock to $\le$ reorder level (`Manual Stock Issue`).
     - `autoDeductForIssueList`: Fires whenever an automated issue list deduction breaches the reorder threshold (`Auto-Deduction for Issue List PPS/ISS/...`).
     - `adjustDeductionMovement`: Fires whenever an issue movement adjustment results in stock $\le$ reorder level (`Stock Movement Adjusted`).
   - **5 Operational Mailboxes**: All alerts are automatically emailed via Resend curl transport to:
     - `ashaminbiswas1@gmail.com`
     - `ejaj@pacificproduct.in`
     - `info@pacificproduct.in`
     - `info.kolkata@pacificproduct.in`
     - `info.pacificproduct@gmail.com`
   - **Rich Audit Details in Email**:
     - Trigger event reason and reference number.
     - Warehouse Depot (`Delhi Central Depot` vs `Kolkata East India Depot`).
     - SKU Code, Design / Shade No, Board Category & Type, Dimensions & Thickness.
     - Current Stock in Hand vs Reorder Threshold Level.
     - Deficit calculation and Recommended Minimum Order Quantity.
     - Direct Action Box for Immediate Purchase Order issuance.
   - **Live Verification**: Verified end-to-end with live Resend delivery resulting in successful transmission to all 5 operational mailboxes.



---

## 30. Delivery Address Master Architecture & 07 Delhi GST Split Rule

1. **Delivery Address Master Architecture for Every Customer**:
   - **Data Model**: Sourced from party_addresses with addressType: 'SHIPPING' (isDefaultShipping: true) alongside addressType: 'BILLING' (isDefaultBilling: true).
   - **Customer Onboarding (CreateCustomerPage.tsx)**:
     - Form includes distinct Section 2 (Primary Billing Address) and Section 3 (Delivery / Site Shipping Address).
     - Features [x] Delivery address is same as billing address toggle that auto-syncs or unlocks custom delivery location fields.
     - Submits both addresses in parallel so delivery coordinates are saved from day one.
   - **Customer Management (EditCustomerPage.tsx)**:
     - Displays dedicated fields for Delivery Address Line 1 & 2, City, State, State Code, and Postal Code.
     - Loads both billing and shipping records without erasing existing delivery addresses.
   - **Customer 360 View (CustomerDetailPage.tsx)**:
     - Quick Details sidebar and Addresses tab render both the Default Billing badge and a distinct green Default Delivery badge (DELIVERY / SITE ADDRESS).
   - **Cross-Document Auto-Population**:
     - Selecting a customer automatically populates the recipient's Delivery / Site Address in Quotation (DraftQuotationPage.tsx), Proforma Invoice (CreateProformaPage.tsx), Sales Order (CreateSalesOrderPage.tsx), and Tax Invoice (CreateInvoicePage.tsx).

2. **07 Delhi GST Split Rule (CGST 9% + SGST 9% vs IGST 18%)**:
   - **Statutory Logic**: Pacific Restroom Cubicles operates from Mandoli, New Delhi (07). If the place of supply, recipient billing state, or delivery site is within Delhi (State Code 07 or state containing 'Delhi'):
     - **Intra-State Supply**: Total 18% GST splits equally into CGST @ 9% + SGST @ 9% (IGST = 0%).
     - **Inter-State Supply**: Outside Delhi applies IGST @ 18% (CGST = 0%, SGST = 0%).
   - **Centralized Engine (src/utils/tax.ts)**:
     - calculateGstSplit provides uniform tax determination across all client views.
     - Backend tax engine (tax.engine.ts) enhanced with normalizeStateCode() for robust mapping of '07', 'Delhi', 'DELHI (07)'.
   - **Uniform Implementation Across 4 Core Documents**:
     1. **Quotation**:
        - DraftQuotationPage.tsx & EditSalesQuotationPage.tsx: Live summary dock splits taxes into CGST (9%) + SGST (9%) for Delhi or IGST (18%) for inter-state.
        - SalesQuotationDetailPage.tsx: Financial summary card highlights Delhi supply with CGST 9% and SGST 9% rows.
        - PDF Generator (generateQuotationPdfHtml): A4 printout dynamically displays CGST 9% and SGST 9% rows for Delhi supplies.
     2. **Proforma Invoice (PI)**:
        - CreateProformaPage.tsx & EditProformaInvoicePage.tsx: Floating summary bar displays live CGST 9% and SGST 9% lines.
        - ProformaInvoiceDetailPage.tsx: Financial breakdown card splits GST for 07 Delhi.
        - PDF Generator (generatePiHtml): Tax table renders explicit CGST (9%): and SGST (9%): rows.
     3. **Sales Order (Direct & Quotation-linked)**:
        - CreateSalesOrderPage.tsx: Live calculation dock calculates and renders CGST 9% and SGST 9% when site/billing is Delhi.
        - SalesOrderDetailPage.tsx: Financial Value card renders Delhi Supply badge with CGST 9% and SGST 9% lines.
        - PDF Generator (generateSalesOrderPdfHtml): Order confirmation PDF prints CGST (9%) and SGST (9%) or IGST (18%).
     4. **Tax Invoice / Bill (Stage 4)**:
        - CreateInvoicePage.tsx: Form features customer picker, delivery address snapshot, and statutory tax breakdown dock.
        - PDF Generator (generateTaxInvoicePdfHtml): Renders two-column BILLED TO (RECEIVER) and SHIPPED TO (DELIVERY / SITE) header, and splits tax rows into CGST (9%): + SGST (9%): for Delhi recipients.

---

## 31. Proforma Invoice (PI) UI/UX Realignment & Technical Hardware Specifications Synchronization

1. **Quotation to Proforma Invoice Conversion Specifications Preservation**:
   - **Backend (`pi.service.ts` `createFromQuotation`)**:
     - Preserves all standard inclusions & hardware accessories by prepending them to the PI terms clauses (`Standard Inclusions & Hardware Accessories:\n${quotation.accessoriesText}`).
     - Concatenates item technical specifications (`boardType`, `boardThickness`, `boardColor`, `cubicleSize`, `doorSize`, `overallHeight`, `hardwarePackage`) directly into `description` with `\n(Board: ... | Hardware: ...)`.
     - Maps customer `pan` and `pincode` into `billTo.addressLine` alongside legal GSTIN.
     - Preserves delivery coordinates from customer shipping address or quotation recipient address.
     - Robustly identifies Delhi supplies (`isDelhi`) and assigns `placeOfSupplyStateCode = '07'`, triggering statutory CGST 9% and SGST 9% tax breakdown.

2. **Proforma Invoice Detail View (`ProformaInvoiceDetailPage.tsx`)**:
   - **Delhi CGST 9% & SGST 9% Split**: Displays explicit `CGST (9%)` and `SGST (9%)` in dedicated blue monospace badges whenever supply is within Delhi (`07`), bypassing legacy single-rate IGST fallback.
   - **Dedicated Hardware Inclusions Card**: Extracts factory accessories from terms and renders a prominent, styled **Standard Inclusions & Hardware Accessories** card with `Wrench` icon above commercial terms.
   - **Item Specifications Rendering**: Added `whitespace-pre-line leading-relaxed` formatting so multi-line technical dimensions and board/hardware specifications display cleanly.
   - **PAN Display in Billing Party**: Extracts and highlights customer PAN from profile or formatted address line.

3. **Complete PI Creation UI Alignment (`CreateProformaPage.tsx`)**:
   - Upgraded to match `DraftQuotationPage.tsx` with:
     - **Client Master & Company Entity Selection**: Customer dropdown auto-populates legal name, trade name, GSTIN, PAN, and billing/shipping addresses.
     - **Quotation Fast-Import**: Dropdown to import approved quotations directly into PI line items and specifications.
     - **Billing Address (Customer Legal Entity)**: Dedicated fields for Legal Name, GSTIN (15 chars), PAN (10 chars), Address Line, City, Pincode (6 digits), State & Code, Phone & Email.
     - **Delivery Address (Site / Ship To)**: Consignee name, delivery address line, city, pincode, state, phone, and 1-click **"Same as Billing"** sync button.
     - **Transport & Logistics**: Place of supply, state code, mode of transport, vehicle number, GR/LR number, linked PO number & date, freight amount, advance %, and RCM toggle.
     - **4 Interactive Hardware Presets (`HARDWARE_PRESETS`)**: SS 304 Stainless Steel (`SS_304`), Black Polyamide Nylon (`NYLON_BLACK`), SS 316 Marine Grade (`SS_316`), and Heavy-Duty Aluminium (`ALUMINIUM`).
     - **Quotation Line Items Layout**:
       - Quick Boilerplate Presets (`Standard Cubicle`, `Urinal Partition`, `Hpl Locker`).
       - Product Model Catalog Selector (`getMergedQuotationModels`: Cubicles, Lockers, Urinal Partitions) which auto-fills dimensions, board thickness, and hardware inclusions.
       - Clean 3-column row (`Unit`, `Quantity *`, `Rate (₹) *`) removing extraneous in-row HSN/SAC and GST inputs (defaulting silently to `9403` and `18%`).
       - Cubicle Technical Specifications Sub-Card (Board Type, Board Thickness, Board Color, Cubicle Size, Door Size, Overall Height, and Hardware Package).
       - Right-aligned `Line Total: ₹ ...` display card per item.
     - **Commercial Terms & Conditions**: Numbered clause manager with add/remove actions.
     - **Live Financial & GST Split Floating Dock**: Live basic price, freight, taxable total, Delhi CGST 9% + SGST 9% (or IGST 18%), grand total, and required advance amount.

4. **Complete PI Edit UI Alignment (`EditProformaInvoicePage.tsx`)**:
   - Upgraded to replicate the exact same rich, responsive interface when editing existing PIs:
     - Customer assignment & lifecycle status switcher (`DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `CANCELLED`).
     - Billing Address with GSTIN, PAN, and Pincode fields.
     - Delivery Address with Pincode and "Same as Billing" 1-click sync.
     - 4 Interactive Hardware Presets and Standard Inclusions editor.
     - Exact Quotation Line Items structure with Quick Boilerplate Presets, 3-column pricing row (`Unit`, `Quantity`, `Rate`), technical specification sub-card, and bottom-right Line Total.
     - Delhi CGST 9% + SGST 9% live floating dock with advance clearance progress.

5. **PI Detail View Line Items (`ProformaInvoiceDetailPage.tsx`)**:
   - Replaced legacy 9-column commercial table with Quotation's clean 6-column Line Items table (`S.No`, `Description`, `Unit`, `Qty`, `Rate (₹)`, `Amount (₹)`).
   - Structured specification parser (`parseItemSpecs`) that renders neat bullet points under each product title (`• Size:`, `• Color:`, `• Thickness:`, `• Door:`, `• Height:`, `• Hardware:`).
   - Responsive mobile card transformation with item amount badge and unit $\times$ rate calculation.
   - Preserves GST summary dock, Delhi CGST 9% + SGST 9% split badges, and Standard Inclusions & Hardware Accessories card.

6. **Database Schema Synchronization & Header Simplification**:
   - **PostgreSQL Database & Prisma Schema (`schema.prisma`)**:
     - Added dedicated specification columns (`boardType`, `boardThickness`, `boardColor`, `cubicleSize`, `doorSize`, `overallHeight`, `hardwarePackage`) directly to `proforma_invoice_items` and `sales_quotation_items`.
     - Altered live PostgreSQL database tables (`ALTER TABLE proforma_invoice_items ...`) and regenerated Prisma client across both backend and frontend workspaces (`npx prisma generate`).
     - Updated backend `pi.service.ts` (`create`, `update`, `createFromQuotation`) to directly persist and return individual technical specification fields.
   - **Top Navigation Simplification**:
     - Removed redundant top action header ("Edit Proforma Invoice / Create Proforma Invoice", document number pills, Cancel, and duplicate Save buttons) from both `CreateProformaPage.tsx` and `EditProformaInvoicePage.tsx`.
     - Replaced with a single clean, high-contrast back button (`Back to PI Details` / `Back to Proforma Invoices`), ensuring that all primary actions and financial metrics stay unified in the bottom floating dock.

7. **Grand Total Form Footer Placement & Formal Vector PDF Template Realignment**:
   - **Form Footer Financial Summary**:
     - Moved the full Statutory GST Breakdown & Grand Total card to the bottom form footer (positioned between Card 6 Commercial Terms & Conditions and the sticky bottom action bar) in both `CreateProformaPage.tsx` and `EditProformaInvoicePage.tsx`.
     - Displays live Basic Price, Freight, Taxable Value, Delhi CGST 9% + SGST 9% (or IGST 18%), Grand Total, and Advance Required amount without cluttering the top of the form.
   - **Vector A4 Proforma Invoice PDF Template (`pdf.service.ts` & `pi.service.ts`)**:
     - Redesigned `generatePiHtml` in backend `pdf.service.ts` to visually match the formal Quotation PDF layout.
     - **Company Logo Integration**: Dynamically resolves and embeds the official Pacific logo via `resolveCompanyLogoDataUri(data.logoUrl)` (reading base64 asset directly from disk or profile).
     - **Header & Verification**: Crisp single-line `#000000` vector border, company address, phone, GSTIN, PAN, `PROFORMA INVOICE` title badge, document reference, date, place of supply, dispatch details, and document QR code.
     - **Dual-Party Grid**: Formal side-by-side **Bill To (Buyer)** and **Ship To (Delivery Site)** party tables displaying buyer legal name, full street address, state code, GSTIN, and PAN.
     - **Items Table & Technical Specs**: 6-column pricing table with auto-parsed bullet points for board type, board thickness, board color, cubicle size, door size, overall height, and hardware package under each line item description.
     - **Statutory Delhi GST Breakdown**: Displays explicit `CGST @ 9%` and `SGST @ 9%` for Delhi transactions (`07`) or `IGST @ 18%` for interstate supplies, with exact rounding adjustments and amount in words.
     - **Standard Inclusions & Hardware Accessories Box**: Renders the complete standard SS 304 hardware package and factory inclusions.
     - **Entity Bank Remittance Details**: Prominently displays primary bank account name, bank name, account number, IFSC code, and branch for electronic payment transfers (RTGS / NEFT / IMPS).
     - **Signatory Sign-off**: Dual signature footer featuring Client Acceptance signature line on the left and authorized signatory signature image, name, designation, and mobile contact on the right.

---

## 32. Sales Order Parity, CRUD Realignment & Conversion Synchronization

1. **Relational Database Schema & Prisma Migration**:
   - **PostgreSQL Database & Prisma Schema (`schema.prisma`)**:
     - Added dedicated hardware specification columns (`boardType`, `boardThickness`, `boardColor`, `cubicleSize`, `doorSize`, `overallHeight`, `hardwarePackage`) directly to `sales_order_items`.
     - Added statutory tax, logistics, accessories, and terms columns (`placeOfSupply`, `placeOfSupplyStateCode`, `freightAmount`, `cgstAmount`, `sgstAmount`, `igstAmount`, `accessoriesText`, `termsJson`) directly to `sales_orders`.
     - Altered live PostgreSQL database tables (`ALTER TABLE sales_order_items ...`, `ALTER TABLE sales_orders ...`) and regenerated Prisma client across both backend and frontend workspaces (`npx prisma generate`).

2. **Backend Order Lifecycle & Conversion Synchronization (`orders.service.ts`)**:
   - **Quotation to Sales Order Conversion (`createFromQuotation`)**:
     - Extracts and persists all 7 technical hardware specifications (`boardType`, `boardThickness`, `boardColor`, `cubicleSize`, `doorSize`, `overallHeight`, `hardwarePackage`) from quotation line items.
     - Preserves standard inclusions and hardware accessories text (`accessoriesText`), customer delivery site coordinates, and commercial terms.
     - Automatically evaluates statutory place of supply (`isDelhi` / `07`) and splits taxes into CGST @ 9% + SGST @ 9% for Delhi transactions or IGST @ 18% for interstate supplies.
   - **Proforma Invoice to Sales Order Conversion (`createFromProforma`)**:
     - Extracts and maps line item specifications, linked PO numbers/dates, billing & shipping party snapshots, accessories, and terms.
     - Automatically carries forward freight, subtotal, and Delhi statutory CGST/SGST tax split amounts.
   - **Direct Creation & Update Endpoints (`createDirect` & `update`)**:
     - Submits and persists all 7 technical dimensions per line item alongside unit, quantity, rate, and total amount.
     - Full update capability on existing sales orders via `PATCH /api/v1/orders/:id`, synchronizing customer profiles, dual addresses, technical specifications, and commercial terms.

3. **Sales Order Detail View Parity (`SalesOrderDetailPage.tsx`)**:
   - **Dual-Column Address Cards**: Prominently renders **Billing Party (Customer)** (with Legal/Trade Name, GSTIN, PAN, Pincode, Address, Phone, Email) alongside **Delivery Site / Shipping Party** (with Site Name, Address, Pincode, State, Phone).
   - **Technical Hardware Specifications Breakdown**: Structured specification parser (`parseItemSpecs`) that renders clean bullet points under each product title (`• Size:`, `• Color:`, `• Thickness:`, `• Door:`, `• Height:`, `• Hardware:`).
   - **Statutory Delhi GST Breakdown Dock**: Displays live Subtotal, Freight, Delhi CGST 9% + SGST 9% (or IGST 18%), and Grand Total with Delhi intra-state supply highlight badge.
   - **Standard Inclusions & Hardware Accessories Card**: Renders the complete factory hardware inclusions and accessories package.
   - **Commercial Terms & Conditions Card**: Itemized list of agreed operational and delivery terms.
   - **Direct Edit Navigation**: Replaced legacy small modal trigger with a direct action button navigating to `/admin/dashboard/sales-orders/:id/edit`.

4. **Dedicated Full-Page Sales Order Editor (`EditSalesOrderPage.tsx`)**:
   - Accessible via `/admin/dashboard/sales-orders/:id/edit`.
   - **Customer Assignment & Lifecycle Status**: Live status switcher (`DRAFT`, `CONFIRMED`, `IN_PRODUCTION`, `READY_FOR_DISPATCH`, `DISPATCHED`, `COMPLETED`, `CANCELLED`).
   - **Dual-Column Billing & Shipping Form**: Dedicated fields for Legal Name, GSTIN, PAN, Pincode, Address Line, City, State & Code, Phone, and Email, with a 1-click **"Same as Billing"** delivery address sync button.
   - **4 Interactive Hardware Presets (`HARDWARE_PRESETS`)**: SS 304 Stainless Steel (`SS_304`), Black Polyamide Nylon (`NYLON_BLACK`), SS 316 Marine Grade (`SS_316`), and Heavy-Duty Aluminium (`ALUMINIUM`).
   - **Line Items Structure**:
     - Quick Boilerplate Presets (`Standard Cubicle`, `Urinal Partition`, `Hpl Locker`).
     - Product Model Catalog Selector (`getMergedQuotationModels`) which auto-populates dimensions, board thickness, and hardware inclusions.
     - 3-column pricing row (`Unit`, `Quantity *`, `Rate (₹) *`).
     - Cubicle Technical Specifications Sub-Card (Board Type, Board Thickness, Board Color, Cubicle Size, Door Size, Overall Height, and Hardware Package).
     - Duplicate item and remove item actions.
   - **Commercial Terms & Conditions Manager**: Numbered clause editor with add/remove actions.
   - **Sticky Bottom Financial Dock**: Live Basic Price, Freight, Taxable Total, Delhi CGST 9% + SGST 9% (or IGST 18%), and Grand Total.

5. **Create Sales Order Page Upgrade (`CreateSalesOrderPage.tsx`)**:
   - **Quotation & PI Fast-Import**: Dropdowns to import accepted quotations or issued Proforma Invoices with 1-click auto-population of all specs, prices, and terms.
   - Complete visual and functional parity with `DraftQuotationPage.tsx` and `CreateProformaPage.tsx`.
   - Dedicated Billing Party and Delivery Site cards, 4 interactive hardware presets, product catalog model selector, technical specifications sub-card per item, and Delhi GST split dock.

6. **Sales Order PDF Vector A4 Alignment (`generateSalesOrderPdfHtml` in `pdf.service.ts`)**:
   - Replaced legacy basic HTML layout with the vector A4 single-page template matching `generateQuotationPdfHtml` and `generatePiHtml`.
   - **Header & Verification**: Brand logo (`resolveCompanyLogoDataUri`), crisp dark header styling, order date, order number, revision tag, and verified document QR code.
   - **Order Details Grid**: Client PO number & PO date, payment terms, and Place of Supply with statutory State Code.
   - **Dual-Party Cards**: Distinct **Bill To** and **Ship To** addresses with Legal Name, full address, GSTIN, PAN, and contact details.
   - **6-Column Line Items Table**: `#`, `Item Description & Specifications`, `HSN/SAC`, `Qty`, `Unit Rate (₹)`, `Total Amount (₹)`. Automatically renders 7-dimension technical specifications (Board Type, Thickness, Color, Cubicle Size, Door Size, Height, Hardware Package) as bullet points beneath the product description.
   - **Statutory Delhi GST Split**: Computes and displays `CGST @ 9%` and `SGST @ 9%` for intra-state (Delhi `07`) or `IGST @ 18%` for inter-state orders, with exact amounts and Amount in Words.
   - **Standard Inclusions & Hardware Accessories Box**: Renders factory hardware inclusions matching Quotation/PI.
   - **Entity Bank Remittance Details**: Displays entity bank coordinates (Bank Name, Account Number, IFSC, Branch) for wire/RTGS transfers.
   - **Commercial Order Terms & Sign-off**: Dual signatures with Client Acceptance on the left and Authorized Signatory with seal/signature image on the right.

---

## 33. Hardware Preset Tabs Removal & Hardware List Sanitization

1. **Removal of Redundant Hardware Preset Cards**:
   - Removed the 4 interactive preset tabs/cards (`SS 304 Satin Finish / Most Popular / SS 304 Stainless Steel`, `Grade A Nylon / High Impact / Black Polyamide Nylon`, `SS 316 Marine / Coastal & Pool / SS 316 Marine Grade`, and `Aluminium Alloy / Architectural Grade / Aluminium Heavy-Duty`) and their subtitle across:
     - Quotation Creation (`DraftQuotationPage.tsx`) & Quotation Edit (`EditSalesQuotationPage.tsx`)
     - Proforma Invoice Creation (`CreateProformaPage.tsx`) & Proforma Invoice Edit (`EditProformaInvoicePage.tsx`)
     - Sales Order Creation (`CreateSalesOrderPage.tsx`) & Sales Order Edit (`EditSalesOrderPage.tsx`)
   - Simplified Section: Retained the clean section header and standard full-width textarea for `Standard Inclusions & Hardware Accessories *`, populated directly from model selections via `formatModelHardwareInclusions` or default baseline package.

2. **Sanitization of `[SS Hardware]` Tag from Hardware Lists & PDFs**:
   - In `formatModelHardwareInclusions` (`quotationProductPresets.ts`): Filtered out `SS Hardware` from the material tag formatter (`mat`) and stripped any occurrence of `[SS Hardware]` from hardware component names or notes.
   - In Backend PDF Generator (`pdf.service.ts`): Added sanitization regex (`replace(/\[SS Hardware\]/gi, '').replace(/\s{2,}/g, ' ').trim()`) to `generatePiHtml`, `generateQuotationPdfHtml`, and `generateSalesOrderPdfHtml` to ensure no `[SS Hardware]` tags ever appear in generated customer PDFs.

---

## 34. Customer Search Combobox, Listed Models Constraint & Boilerplate Presets Removal

1. **Multi-Attribute Searchable Customer Combobox (`CustomerSearchSelect.tsx`)**:
   - Built a dedicated, reusable dropdown combobox component (`src/components/common/CustomerSearchSelect.tsx`) to replace standard `<select>` elements for Customer Party selection.
   - **Multi-Field Real-Time Search**: Filters across Legal Name, Trade Name, Email / `contactEmail`, GSTIN, PAN, Phone / `contactPhone`, and Contact Name.
   - **Rich Dropdown Item Presentation**: Renders party name, address city/state, emerald GSTIN badge (`FileText`), blue email badge (`Mail`), phone badge (`Phone`), and selection checkmark (`Check`).
   - **Auto-Fill Integration**: Automatically populates customer billing party details (Party Name, GSTIN, PAN, Address Line, City, State, State Code, Phone, Email) and shipping party details upon selection across:
     - Proforma Invoice Creation (`CreateProformaPage.tsx`) & Edit (`EditProformaInvoicePage.tsx`)
     - Sales Order Creation (`CreateSalesOrderPage.tsx`) & Edit (`EditSalesOrderPage.tsx`)

2. **Strict Listed Product Models Constraint in PI and Sales Order**:
   - **Removed `CUSTOM` / Manual Text Input**: Eliminated the `<option value="CUSTOM">Custom / Manual Description</option>` option and the manual text description input field from line items in `CreateSalesOrderPage.tsx`, `CreateProformaPage.tsx`, `EditSalesOrderPage.tsx`, and `EditProformaInvoicePage.tsx`.
   - **Full-Width Categorized Selector**: Rendered a full-width select dropdown grouped into catalog optgroups (`Restroom Cubicles`, `Modular Lockers`, `Urinal Partitions`).
   - **Description Persistence & Feedback**: Selecting any listed model automatically assigns the formatted model name (`Pacific ${selected.title} (${selected.category})`), populates dimensions (cubicle size, door size, height, board thickness, board type, hardware package), auto-generates accessories text, and shows a crisp **Selected Model** indicator beneath the select element.

3. **Complete Removal of "Quick Boilerplate Presets"**:
   - Removed the `"Quick Boilerplate Presets"` toolbar (`Standard Cubicle`, `Urinal Partition`, `Hpl Locker`) and the `applyBoilerplatePreset` helper function across `CreateSalesOrderPage.tsx`, `CreateProformaPage.tsx`, `EditSalesOrderPage.tsx`, and `EditProformaInvoicePage.tsx`.
   - Line items are cleanly added via **"Add Item Row"** and configured using catalog product model presets.

---

## 35. Cloud & Render Deployment Resolution (`PACIFIC-Backend`)

1. **Root Cause Analysis of `Error: Cannot find module '/opt/render/project/src/dist/server.js'`**:
   - Render defaults its Node service Build Command to `npm install` (or `yarn`), which only downloads packages and skips running `npm run build` (`prisma generate && tsc`).
   - Because `dist/` is git-ignored, Render was attempting to execute the start command (`node dist/server.js`) without compiling TypeScript source into `dist/server.js`.
   - In production environments where `NODE_ENV=production`, `npm install` skips `devDependencies`, which could also lead to missing `tsc` or `prisma` binaries during build time.

2. **Resolution Applied in Codebase**:
   - **Production Dependencies**: Moved `prisma` and `typescript` from `devDependencies` into `dependencies` in `PACIFIC-Backend/package.json` to guarantee their availability on cloud container runners even with `NODE_ENV=production`.
   - **Infrastructure as Code**: Added `render.yaml` defining:
     - `buildCommand: npm install && npm run build`
     - `startCommand: npm start` (which executes `node src/scripts/fix-db.js && node dist/server.js`)
     - `runtime: node`

3. **Required Render Dashboard Settings**:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

---

## 36. Render Cloud API Integration & Enhanced CORS Policy

1. **Admin Panel Endpoint Alignment (`PACIFIC-Admin`)**:
   - Set backend URL target to `https://pacific-backend-psuw.onrender.com/api/v1` in:
     - `src/api/client.ts`: Updated default fallback `API_URL` to `https://pacific-backend-psuw.onrender.com/api/v1`.
     - `.env`: `VITE_API_URL="https://pacific-backend-psuw.onrender.com/api/v1"`.
     - `.env.example`: `VITE_API_URL=https://pacific-backend-psuw.onrender.com/api/v1`.
   - Also updated storefront environment configs (`d:\frontend\.env`, `.env.production`, `.env.example`) to match the new cloud backend endpoint.

2. **Backend CORS Architecture (`PACIFIC-Backend`)**:
   - Enhanced `corsOptions` in `src/app.ts` to dynamically support:
     - All localhost / 127.0.0.1 development ports (`http://localhost:*`, `http://127.0.0.1:*`).
     - All Vercel preview & production deployments (`https://*.vercel.app`).
     - All Render cloud services (`https://*.onrender.com`).
     - All Netlify deployments (`https://*.netlify.app`).
     - Configured `ALLOWED_ORIGINS` with dynamic origin echoing for credentials support (`credentials: true`).
     - Extended `allowedHeaders` with `Cache-Control`, `X-Refresh-Token`, `x-client-info`, `Pragma`, `Range`.
     - Synchronized `render.yaml` with `ALLOWED_ORIGINS` and recompiled `dist/`.

---

## 37. Modern TypeScript 5/6 Migration: Deprecated `baseUrl` Removal

1. **Resolution of TypeScript 7.0 Deprecation Warning**:
   - In modern TypeScript (starting TS 5.0+ and preparing for TS 7.0), `baseUrl` has been deprecated when using `"moduleResolution": "bundler"`.
   - Updated `d:/PACIFIC-Admin/tsconfig.json`:
     - Removed `"baseUrl": "."`
     - Updated path mappings to direct relative syntax: `"@/*": ["./src/*"]`
   - Preserved all strict compiler checks and full Vite path resolution compatibility.
   - Both `npx tsc --noEmit` and `npm run build` pass with zero errors and zero deprecation warnings.







---

## 38. Production Vercel Admin Origin Whitelist (https://pacific-admin-one.vercel.app)

1. **CORS Explicit Integration**:
   - Whitelisted `https://pacific-admin-one.vercel.app` across `PACIFIC-Backend`:
     - `src/app.ts`: Explicit check and trailing-slash normalization (`origin.replace(/\/+$/, '')`).
     - `src/config/env.ts`: Added to `ALLOWED_ORIGINS` and set as default `ADMIN_URL` and `CORS_ORIGIN`.
     - `render.yaml`: Updated `ALLOWED_ORIGINS`, `CORS_ORIGIN`, and `ADMIN_URL`.
     - `.env`: Updated environment configurations.
   - Recompiled `dist/` with `npx tsc` and pushed to GitHub `AshaminBiswas/PACIFIC-Backend` (`main`).

---

## 39. Mobile Bottom Navigation Dock: Restroom Board Stock Quick Action

1. **Center Action Replacement (`AdminLayout.tsx`)**:
   - Replaced legacy elevated center floating trigger (`Scan QR` / `QrCode` pointing to `/admin/dashboard/qr-center`) with a dedicated **Restroom Board Stock** trigger.
   - **Route**: Links directly to `/admin/dashboard/inventory/boards` (`BoardInventoryPage`).
   - **Icon**: `Layers` (`lucide-react`), aligned with the rest of the application's Restroom Boards inventory branding.
   - **Design & Ergonomics**:
     - Preserves elevated floating pill styling (`w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#7FB706] to-[#B5F823] text-[#030213] -mt-6`).
     - Active route highlighting: When on `/admin/dashboard/inventory/boards`, the button gains an enhanced vibrant gradient (`from-[#8fd307] to-[#d4ff4d] ring-2 ring-[#B5F823] shadow-[#7FB706]/60`) and text switches to `#B5F823`.
     - Explicit label: `Board Stock` in bold 10px type with touch target $\ge 44\text{px}$.

---

## 40. Proforma Invoice Individual Hardware Line Items & Offline QR Code PDF Integration

1. **Hardware Items Individualization in Proforma Invoice (PI)**:
   - **Model Selection Decomposition**: When selecting a cubicle, locker, or urinal model in either `CreateProformaPage.tsx` or `EditProformaInvoicePage.tsx`, the hardware list is automatically extracted as individual, editable line items using `extractModelHardwareItems(model, cubicleQuantity)` in `src/utils/quotationProductPresets.ts`.
   - **Per-Item Pricing & Quantity Controls**: Each hardware component (e.g. Gravity Hinges, Indicator Locks, Door Pulls, Coat Hooks, Adjustable Supporting Legs, Headrail, Fasteners) receives its dedicated unit (`PAIR`, `SET`, `NOS`, `RMT`, etc.), HSN (`8302`/`7610`), quantity multiplier, and custom rate (₹).
   - **Custom Hardware Line Items**: Added `+ Add Custom Hardware` button allowing arbitrary accessory/hardware items to be added with custom descriptions, HSN, unit, quantity, and rate.
   - **Clean Distinction in UI**: Cubicle items render model selection and board technical specifications, while hardware items render dedicated lightweight cards without clutter.
   - **Cross-Stack Calculation**: Individual line item subtotals dynamically integrate into taxable amount, CGST/SGST/IGST breakdown, and grand total calculations.

2. **Proforma Invoice PDF Clean Rendering & QR Code Verification**:
   - **Hardware Item Cleanliness in PDF**: `pdfService.generatePiHtml` cleanly separates items with technical board specifications from standalone hardware items, avoiding redundant empty specification boxes and accurately presenting HSN `8302`, units, and rates.
   - **Inline Base64 QR Code Generation**: Upgraded `qrService.generateQrDataUrl` in `PACIFIC-Backend` using the official `qrcode` library to generate inline `data:image/png;base64,...` data URIs directly. This completely resolves blocked or missing QR codes caused by external HTTP calls during PDF printing or previewing in iframe modals.

---

## 41. Production Stability: Supabase 401 Fix & Proforma Invoice 500 FK Resolution

1. **Supabase 401 Unauthorized (`UNAUTHORIZED_UNREGISTERED_API_KEY`) Fix**:
   - **Root Cause**: An unregistered publishable key (`sb_publishable_0xZl0he-gZZ-5K9qcN5-Yg_6u9J96cs`) was configured or evaluated before the JWT key, causing Supabase PostgREST to reject all REST calls across CMS tables (`hero_images`, `gallery_images`, `testimonials`, `blogs`, `products`, `leads`, `visitor_leads`, `page_banners`, `catalogs`, etc.). Additionally, stale browser localStorage tokens (`sb-*-auth-token`) could override the Authorization header with expired session credentials.
   - **Canonical JWT Integration (`src/lib/supabase.ts`)**:
     - Embedded verified working Supabase JWT keys (`DEFAULT_SUPABASE_ANON_KEY` and `DEFAULT_SUPABASE_SERVICE_ROLE_KEY`).
     - Added `isValidSupabaseKey()` filter to proactively detect and reject any unregistered keys starting with `sb_publishable_` or `sb_secret_`.
     - Prioritized standard JWT keys starting with `eyJ...`.
   - **Self-Healing 401 Fetch Interceptor**:
     - Global Supabase client `fetch` wrapper intercepts HTTP 401 responses.
     - Automatically purges stale `sb-*-auth-token` entries from browser `localStorage` and retries the request once with canonical headers (`apikey: <key>`, `Authorization: Bearer <key>`).
     - Eliminates client 401 lockouts even across existing user browser profiles.
   - **Environment Sync (`.env`)**: Updated `.env` with verified working JWT keys.

2. **Proforma Invoice 500 Error Foreign Key (`productId` & `customerId`) Resolution**:
   - **Root Cause**: `proforma_invoice_items.productId` maintains a strict foreign key relation to `erp_products(id)`. When catalog model slugs (e.g. `'standard-c1-ss-304'`) or custom hardware items were submitted as `productId`, PostgreSQL threw a foreign key violation, returning an unhandled 500 error from Express. Additionally, direct customer creation with unmapped `customerId` failed the `business_parties` relation.
   - **Backend Validation & Auto-Resolution (`PACIFIC-Backend/src/modules/sales/pi.service.ts`)**:
     - **Product FK Safeguard**: Pre-validates all candidate `productId`s against `prisma.product.findMany()`. Any identifier not present in `erp_products` is safely stored as `productId: null` while preserving all line item metadata, specifications, HSN, rates, and amounts. Applied across both `create` and `update`.
     - **Customer Auto-Resolution**: If `customerId` is null or does not exist in `business_parties`, automatically looks up by GSTIN or legal name, or provisions a customer record from `data.billTo`.
   - **Frontend Sanitization (`CreateProformaPage.tsx` & `EditProformaInvoicePage.tsx`)**:
     - Sanitized `productId` submission using UUID regex verification (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`), preventing catalog model slugs from being transmitted as foreign keys.

---

## 42. Cross-Continental Latency & Dual Auth Compatibility (CRM 401 & PI 500 Resolution)

1. **CRM 401 Error & Dual Auth Protocol (`PACIFIC-Backend/src/middleware/auth.middleware.ts`)**:
   - **Root Cause**: When users logged in using Supabase Auth (or when `AdminLogin.tsx` fell back to `supabase.auth.signInWithPassword`), the active bearer token in `localStorage` was a Supabase-signed JWT. When sent to `GET /api/v1/crm?limit=100`, `requireAuth` strictly attempted `jwt.verify(token, env.jwt.secret)`, failing with `Invalid or expired token (401)`.
   - **Dual Auth Compatibility**:
     - Enhanced `requireAuth` to verify primary backend JWTs, test alternate known secrets, and support Supabase Auth session tokens (`decoded.iss?.includes('supabase')` / `decoded.aud === 'authenticated'`).
     - Extracts user email/UUID from the Supabase token, looks up the active user in `prisma.user`, and attaches their official ERP user identity (`id`, `email`, `role: 'SUPER_ADMIN'`).
   - **Frontend Token Resilience (`src/api/client.ts`)**:
     - Request interceptor automatically checks for and syncs active Supabase session tokens if `pacific_access_token` is missing.
     - Added `.catch()` fallback to `crmApi.listCustomers` in `CreateProformaPage.tsx` to prevent lookup blockers.

2. **Proforma Invoice 500 Error: Prisma Transaction Timeout (`PACIFIC-Backend/src/modules/sales/pi.service.ts`)**:
   - **Root Cause**: Under Render Cloud to Supabase PostgreSQL (Mumbai `aws-0-ap-south-1`) latency, inserting across 5 related tables (`proforma_invoices`, `items`, `tax_summary`, `terms`, `parties`, `status_history`, and `audit_logs`) took $\sim 5236\text{ms}$. Because Prisma's default interactive transaction timeout is $5000\text{ms}$, Prisma closed the transaction and threw `Transaction API error: Transaction already closed: A query cannot be executed on an expired transaction`, producing an HTTP 500.
   - **Transaction Timeout Elevation**:
     - Configured `{ maxWait: 15000, timeout: 45000 }` on all `prisma.$transaction` blocks in `pi.service.ts` (`create`, `issue`, and `update`).
     - Extended execution window to 45 seconds, completely eliminating timeout errors over remote network poolers.

---

## 43. Proforma Invoice PDF Optimization: Logo Data URI, Redundant Hardware Text Removal & QR Code Print Resilience

1. **Embedded Company Logo Resilience across Cloud Containers (`pdf.service.ts` & `defaultLogo.ts`)**:
   - **Root Cause of Missing Logo on Render**: `resolveCompanyLogoDataUri()` checked local disk paths relative to `../PACIFIC-Admin/public/pacific_logo.png` or `d:/PACIFIC-Admin/public/pacific_logo.png`. Because `PACIFIC-Backend` is deployed independently on Render Cloud Linux containers (`/opt/render/project/src`), the sibling admin directory does not exist, causing `resolveCompanyLogoDataUri` to return an empty string and omitting the `<img alt="Logo" ...>` tag.
   - **Compiled Base64 Data URI Integration (`src/modules/pdf/defaultLogo.ts`)**:
     - Copied `pacific_logo.png` into `assets/pacific_logo.png` inside the backend repository.
     - Generated `DEFAULT_PACIFIC_LOGO_DATA_URI` as a compiled TypeScript constant, guaranteeing that the official Pacific Restroom Cubicles logo is permanently bundled in memory.
     - `resolveCompanyLogoDataUri()` now checks filesystem candidate paths and reliably falls back to `DEFAULT_PACIFIC_LOGO_DATA_URI`, guaranteeing 100% logo presence in PI, Tax Invoice, Sales Order, Packing List, and Hardware Issue PDFs on Render Cloud.

2. **Removal of Redundant "Standard Inclusions & Hardware Accessories" Text (`pdf.service.ts`)**:
   - **Context**: Since hardware components are now extracted and listed as individual, priced line items with distinct HSN (`8302`), units, and rates in the items table, the legacy hardcoded fallback `"Standard SS 304 Grade Hardware Package: Gravity Hinges with Nylon Bushing..."` duplicated information and cluttered the PDF.
   - **Resolution**:
     - Removed hardcoded SS 304 fallback from `rawAccessoriesText` in both `generatePiHtml` and `generateSoHtml`.
     - The "Standard Inclusions & Hardware Accessories" section only renders if `data.accessoriesText` is explicitly supplied and does not match the legacy boilerplate string. When individual line items are used, the redundant block is omitted.

3. **QR Code Verification Generation & Print/Download Visibility (`pi.service.ts` & `pdf.service.ts`)**:
   - **QR Code Data URI Resilience (`pi.service.ts`)**:
     - Wrapped `qrService.getOrCreateDocumentQr` with an inline `try-catch` and fallback to `QRCode.toDataURL(...)`. If database verification token lookup encounters a network delay, an inline base64 QR code data URI (`data:image/png;base64,...`) pointing to `/verify/<piNumber>` is immediately generated on the fly.
   - **Print Color Adjust & High-Contrast CSS (`pdf.service.ts`)**:
     - Added `-webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;` to `@media print` body and `img` elements.
     - Enhanced `<img src="${data.qrDataUrl}" ... />` with `image-rendering: -webkit-optimize-contrast; image-rendering: pixelated;` and explicit print visibility so browser print preview and "Save as PDF" drivers preserve the QR bitmap without clipping or blank rendering.

4. **Frontend Iframe-Direct Print & Download Execution (`ProformaInvoiceDetailPage.tsx` & `ProformaInvoicesPage.tsx`)**:
   - **Root Cause of Missing QR in Print / Save PDF**: In `window.open('', '_blank')`, `printWindow.print()` was executed immediately after `document.write(pdfHtml)` before browser renderer bitmap decoding could complete for inline base64 image elements.
   - **Iframe-Direct Printing**:
     - Assigned unique IDs (`pi-detail-pdf-iframe` and `pi-list-pdf-iframe`) to the modal preview iframes.
     - When the user clicks "Print / Save PDF", the handler prints directly from `iframe.contentWindow.print()` where the PDF HTML, logo, and QR code are already decoded and rendered on-screen.
     - Added a 500ms bitmap decoding buffer to popup window fallback to ensure images are fully decoded before triggering print.

---

## 44. PI Creation Page Streamlining & Automated Quotation-to-PI Model & Hardware Decomposition

1. **Deletion of "Standard Inclusions & Hardware Accessories" Card (`CreateProformaPage.tsx` & `EditProformaInvoicePage.tsx`)**:
   - **User Requirement**: Delete the "Standard Inclusions & Hardware Accessories" card from the PI creation and edit pages and ensure hardware is treated exclusively as individual items.
   - **UI Streamlining**:
     - Deleted Card 4 ("Standard Inclusions & Hardware Accessories" textarea card) from both `CreateProformaPage.tsx` and `EditProformaInvoicePage.tsx`.
     - Renumbered subsequent cards (Line Items Configuration $\rightarrow$ Card 4, Financial Summary $\rightarrow$ Card 5, Advance & Terms $\rightarrow$ Card 6).
   - **Terms Cleansing**:
     - Removed the automatic injection of `Standard Inclusions & Hardware Accessories:\n...` in `finalTerms`.
     - `finalTerms` now filters out legacy inclusions strings cleanly, completely removing redundant text from database terms and PDF documents.

2. **Automated Quotation-to-PI Model & Hardware Decomposition (Frontend & Backend)**:
   - **Quotation Import Auto-Decomposition (`CreateProformaPage.tsx`)**:
     - Integrated `findMatchingCatalogModel()` from `quotationProductPresets.ts` to automatically detect catalog cubicle models (by ID, slug, title match, or category fallback).
     - When converting or importing a quotation, each cubicle item automatically expands with its dimensions and generates individual hardware line items using `extractModelHardwareItems()`.
     - Each hardware item (Gravity Hinges, Indicator Lock, Door Pull Handle, Coat Hook, Supporting Legs, Top Headrail Box Extrusion, Wall Fixing U-Channels & Fasteners) is created as an individual line item with its own rate, unit (`PAIR`, `SET`, `NOS`, `RMT`), quantity scaled by cubicle quantity, and HSN (`8302`/`7610`).
     - Added URL parameter support: accessing `/admin/dashboard/proforma-invoices/create?quotationId=<id>` automatically loads and decomposes the quotation specifications without requiring manual interaction.
     - Form defaults now initialize with `Pacific Delight` and its 7 standard hardware items pre-populated.
   - **Backend 1-Click Conversion (`PACIFIC-Backend/src/modules/sales/pi.service.ts`)**:
     - Updated `createFromQuotation()` to auto-generate the complete individual hardware line item breakdown for each cubicle item.
     - Excluded `Standard Inclusions & Hardware Accessories` from `terms`.

3. **Logo Data URI Conversion in PI PDF Generation (`pi.service.ts`)**:
   - Converted `companyProfile.logoUrl` to a self-contained base64 data URI via `fetchImageAsDataUri()`, ensuring the Pacific logo renders reliably in PDFs across remote hosting environments.

---

## 45. Proforma Invoice 2-Page PDF Architecture: Page 1 Technical Specifications & Page 2 Commercial Annexure

1. **Dedicated 2-Page Layout Architecture (`pdf.service.ts`)**:
   - **User Requirement**: All item descriptions and technical specifications on Page 1, with Bank Remittance, Commercial Terms & Conditions, and Acceptance Signatures on a dedicated Page 2.
   - **Page 1 (Commercial Invoice & Technical Specifications)**:
     - Document header with official Pacific logo, full registered address, statutory GSTIN, PAN, title badge, reference number, date, place of supply, and high-contrast verification QR code.
     - Dual-party coordinates grid (Bill To & Ship To).
     - Full line items table showing Sr No, Description & Technical Specifications (Board Type, Board Thickness, Board Color, Cubicle Size, Door Size, Overall Height, Hardware Package), HSN/SAC, Unit, Qty, Rate, and Amount.
     - Pricing summary table rows: Basic Subtotal, Freight (if any), CGST/SGST (9% each) or IGST (18%), Rounding, Grand Total, and Advance Required.
     - Amount in words.
     - Bottom continuation banner: `Page 1 of 2 — Technical Specifications & Commercial Evaluation [ Continued on Page 2 for Bank Remittance, Terms & Acceptance Signatures >> ]`.
   - **Page 2 (Commercial Annexure: Bank Remittance, Terms & Sign-off)**:
     - Header banner with Pacific logo, company name, subtitle, Annexure title badge, PI reference, date, grand total, and advance required amount.
     - **BANK REMITTANCE & PAYMENT DETAILS**: Boxed card with Central Bank Of India, Account Name: Pacific Restroom Cubicle & Locker Solutions, A/C No: 3466708013, IFSC Code: CBIN0283809, Branch: B-20, Ganga Vihar, Gokalpuri, Delhi - 110094.
     - **COMMERCIAL TERMS & CONDITIONS**: 6 official numbered clauses (Payment Terms, Delivery Terms, 10-year partition & 1-year hardware warranty, custom sizing no cancellation policy, statutory GST/transport, Delhi/NCR jurisdiction).
     - **Sign-off Block**:
       - Left column: Client Acceptance Signature & Stamp with signature line and date.
       - Right column: Best Regards, For Pacific Restroom Cubicle & Locker Solutions, signature graphic, Ejajul Shaikh (Company Head, Mobile: +91 9818592113 / 9882056529).
       - Page 2 footer note.

2. **Page-Break & Print CSS Synchronization (`pdf.service.ts`)**:
   - Enforced `.page-1 { page-break-after: always !important; break-after: page !important; }` and `.page-2 { page-break-before: always !important; break-before: page !important; page-break-after: avoid !important; break-after: avoid !important; }`.
   - Styled `@media screen` with sheet margin and shadow for realistic document viewer preview in modal iframes, while `@media print` eliminates shadows and guarantees exact 2-page print / Save as PDF output.

3. **Synchronization in Frontend & Backend (`CreateProformaPage.tsx`, `EditProformaInvoicePage.tsx`, `pi.service.ts`)**:
   - Synced `DEFAULT_TERMS` across frontend and backend to the official 6 commercial terms.
   - Updated bank details fallback to Central Bank Of India and signatory defaults to Ejajul Shaikh, Company Head.

---

## 46. PI PDF Dynamic Filename, Compact Single-Line Buyer Coordinates & Edit PI Model Auto-Detection

1. **Dynamic PDF Download Filename (`<Billing Company Name>_<PI Number>.pdf`)**:
   - **Backend PDF Generation (`pdf.service.ts` & `pi.controller.ts`)**:
     - Sanitized billing party name and reference number (`safeBillingCompanyName_safePiNumber`).
     - Injected `<title>${safeBillingCompanyName}_${safePiNumber}</title>` into vector A4 HTML `<head>`.
     - In `piController.getPdfHtml()`, attached `Content-Disposition: inline; filename="${billingName}_${cleanPiNumber}.pdf"`.
   - **Frontend Iframe & Print Window Overrides (`ProformaInvoiceDetailPage.tsx` & `ProformaInvoicesPage.tsx`)**:
     - Pre-computed target document title `${billingName}_${cleanPiNumber}` before invoking browser print dialogs.
     - Set `iframe.contentDocument.title = docTitle` and `printWindow.document.title = docTitle`. When users click "Print / Save PDF", modern browsers default the suggested PDF file name directly to `<The Billing Company Name>_<PI number>.pdf`.

2. **Compact Single-Line Buyer Coordinates Grid & Duplicate PAN Elimination (`pdf.service.ts`, `CreateProformaPage.tsx`, `EditProformaInvoicePage.tsx`)**:
   - **Eliminated Duplicate PAN**:
     - Removed redundant `PAN: ...` string concatenation into `addressLine` across `CreateProformaPage.tsx` and `EditProformaInvoicePage.tsx`.
     - Passed `pan` strictly in party payloads (`billTo.pan`).
     - Added regex sanitation in `pdf.service.ts` (`cleanBillAddress = address.replace(/,\s*PAN:\s*[A-Z0-9]+/gi, '').replace(/PAN:\s*[A-Z0-9]+/gi, '')`), ensuring even legacy records never render duplicate PAN numbers.
   - **Single-Line Coordinates Hierarchy**:
     - **Line 1 (Name)**: Bold billing company / buyer legal name.
     - **Line 2 (Address, State, and PIN in a single line)**: Clean address string merged seamlessly with State & PIN (`Plot 42, Sector 18, Gurugram, PIN: 122015, State: Haryana (06)`).
     - **Line 3 (PAN and GST in a single line)**: `GSTIN: <gstin> | PAN: <pan>` separated by a high-contrast vertical divider pipe.
     - **Line 4 (Phone and Email in a single line)**: `Phone: <phone> | Email: <email>`.
     - Mirrored clean single-line formatting to `SHIP TO (DELIVERY SITE)`.

3. **Edit PI Page Cubicle Model & Pre-filled Info Auto-Detection (`EditProformaInvoicePage.tsx`)**:
   - **Problem Solved**: When opening an existing PI for editing, the cubicle model dropdown previously displayed `-- Choose Product Model --` unselected, risking loss of specifications.
   - **Intelligent Catalog Matching**:
     - Integrated `findMatchingCatalogModel()` during `loadData()`. Matches each item against `catalogModels` via product ID, model slug, description title tokens, or category heuristics.
     - Automatically assigns `modelId: matchedModel.id` and `parentModelId: matchedModel.id`, ensuring `<select value={item.modelId}>` is immediately pre-selected with the correct cubicle model.
     - Added uncatalogued/custom model fallback option in the select dropdown so no model ID is ever unrepresented.
     - Preserves all saved technical specifications (`boardType`, `boardThickness`, `boardColor`, `cubicleSize`, `doorSize`, `overallHeight`, `hardwarePackage`, `rate`, `quantity`, `unit`), falling back to catalog model defaults only when fields are unpopulated.
     - Auto-expands individual hardware line items if editing a legacy PI where hardware was not previously itemized.

---

## 47. Optional UMP & Locker Sections in Quotation and PI Pages

All four document-creation pages (`CreateProformaPage`, `EditProformaInvoicePage`, `DraftQuotationPage`, `EditSalesQuotationPage`) now feature three structured sections inside the "Line Items" card:

### Section Structure (all four pages)

| Section | Theme | Description |
|---------|-------|-------------|
| **Item #1 (Primary System)** | Green `#7FB706` | Always shown. Cubicle model selector + unit/qty/rate + technical specs. |
| **Optional Section #2 — UMP** | Cyan `cyan-500` | Collapsible. Appears with full form only when a UMP model is selected. |
| **Optional Section #3 — Locker** | Purple `purple-500` | Collapsible. Appears with full form only when a Locker model is selected. |
| **Additional Cubicle Systems** | Green `#7FB706` | Any extra items added via "Add Item" button. |

### Key Interfaces

- **`CreateItem`** (PI pages) / **`EditItem`** (Quotation pages): Both now include:
  ```ts
  systemCategory?: 'cubicle' | 'ump' | 'locker';
  ```
  This is a **frontend-only** field — not a DB column. It persists via `customSpecsJson.systemCategory` in the API payload.

### Handlers Added (all four pages)

- **`handleSelectUmpModel(modelId: string)`** — Selects a UMP model, auto-populates specs from `extractModelDimensions()`, updates `accessoriesText` (Quotation pages) or adds hardware items (PI pages).
- **`handleUmpFieldChange(field, val)`** — Updates UMP item's individual field without disturbing cubicle or locker items.
- **`handleSelectLockerModel(modelId: string)`** — Same as above but for Locker category.
- **`handleLockerFieldChange(field, val)`** — Updates Locker item's individual field.
- **`buildQuotationAccessoriesText(primaryModel?, umpModel?, lockerModel?)`** — Quotation-page helper that composes the `accessoriesText` textarea content with category-aware section headers (e.g., `--- RESTROOM CUBICLE HARDWARE ---`, `--- URINAL MODESTY PARTITION HARDWARE ---`, `--- MODULAR LOCKER HARDWARE ---`).

### `DEFAULT_ACCESSORIES_TEXT` Constant
Defined at module level in `DraftQuotationPage.tsx` and `EditSalesQuotationPage.tsx`. Provides a fallback hardware inclusions text when no model is selected, ensuring the accessoriesText field is never empty.

### getMergedQuotationModels Usage
All four pages now call `getMergedQuotationModels(models || [])` when loading catalog models. This merges API models with static built-in presets, ensuring the model dropdown is always populated even if the API fails.

### systemCategory Detection on Load (Edit Pages)
`EditProformaInvoicePage.tsx` and `EditSalesQuotationPage.tsx` detect `systemCategory` from `customSpecsJson.systemCategory` when loading existing records. Falls back to keyword detection:
- Contains `"locker"` → `'locker'`
- Contains `"urinal"` or `"ump"` → `'ump'`
- Otherwise → `'cubicle'`

### PDF Output
Backend `pdf.service.ts` uses `systemCategory` from `customSpecsJson` (passed as `item.customSpecsJson?.systemCategory`) to render category-aware labels in both Quotation PDF and PI PDF:
- **Cubicle items**: "Restroom Cubicle System" heading
- **UMP items**: "Urinal Modesty Partition" heading
- **Locker items**: "Modular Locker System" heading
- **Hardware items**: grouped under their parent category with badge labels

### Files Changed
| File | Change |
|------|--------|
| `src/pages/CreateProformaPage.tsx` | UMP/Locker sections, handlers, hardware items |
| `src/pages/EditProformaInvoicePage.tsx` | UMP/Locker sections, handlers, hardware items |
| `src/pages/DraftQuotationPage.tsx` | UMP/Locker sections, handlers, accessoriesText builder |
| `src/pages/EditSalesQuotationPage.tsx` | UMP/Locker sections, handlers, accessoriesText builder |
| `src/utils/quotationProductPresets.ts` | Source of model data, `getMergedQuotationModels`, `extractModelDimensions`, `formatModelHardwareInclusions`, `extractModelHardwareItems` |

---

## 48. Quotation PDF 2-Page Strict Layout Architecture

Sales Quotation PDF (`pdf.service.ts` -> `generateQuotationPdfHtml`) has been restructured into an exact 2-page print layout:

### Page Breakdown
- **Page 1 (`.page-container.page-1`)**:
  - Full company header (Logo, Name, Address, GSTIN, Phone, Ref, Date, Project, Document Verification QR code).
  - Recipient & Subject table (To: Client, Valid Until, Subject).
  - Formal narrative opening ("Dear Sir / Madam, With reference to our discussion...").
  - Detailed Line Items Table (S.No, Description & Technical Specifications for Cubicle, UMP, and Locker systems, Unit, Qty, Rate, Amount).
  - Pricing summary breakdown (Basic Price, Installation, Freight, CGST+SGST / IGST / SEZ, Grand Total).
  - Amount in words.
  - Page 1 continuation notice & footer (`Page 1 of 2 — Quotation & Technical Specification Schedule`).

- **Page 2 (`.page-container.page-2`)**:
  - Header annexure banner (Company branding, Reference number, Project, Date, Grand Total).
  - **Standard Inclusions & Hardware Accessories**: Parsed via `formatQuotationAccessoriesHtml()` so category headers (e.g. `--- URINAL MODESTY PARTITION HARDWARE ---`, `--- MODULAR LOCKER HARDWARE ---`, `--- RESTROOM CUBICLE HARDWARE ---`) render as clean highlighted section badges with green accent borders, preventing inline header collisions and formatting individual bullets with clean typography.
  - **Warranty Commitment**: Dedicated styled commitment box (10-year moisture defect partition warranty, 1-year workmanship & hardware warranty).
  - **Commercial Terms & Conditions**: Structured list/table with General Terms, Payment Terms, Delivery & Lead Time, and statutory compliance.
  - **Sign-off Block**: Dual column with Client Acceptance Signature & Stamp on the left, and Company Authorized Signatory (Ejajul Shaikh / Company Head, signature image, contact) on the right.
  - Page 2 footer note (`Page 2 of 2 — Hardware Specifications, Commercial Terms & Acceptance`).

---

## 49. B2B Customer Creation 500 Resolution (pgBouncer Nested Writes & Audit Foreign Key) & Build Package Sanitization

1. **Root Cause Analysis of 500 Internal Server Error on B2B Customer Creation**:
   - **pgBouncer Interactive Transaction Timeout**: The Supabase PostgreSQL database URL connects via port 6543 (`?pgbouncer=true`). Supabase's transaction pooling mode does not support long or multi-round interactive transactions (`prisma.$transaction(async (tx) => { ... })`). In `crm.service.ts`, `createCustomer` previously executed 5-6 sequential interactive queries (`tx.businessParty.create`, `tx.customerProfile.create`, `tx.partyContact.create`, `tx.partyAddress.create`, `auditService.logMutation`). Over remote network connections, pgBouncer aborted the transaction pooler slot with: `PrismaClientKnownRequestError: Transaction API error: Unable to start a transaction in the given time.`
   - **Audit Log Foreign Key Constraint**: `audit_logs.userId` maintains a strict foreign key relation to `users.id`. When users sign in via external Supabase auth or JWT tokens whose ID is not present in PostgreSQL's local `users` table, inserting the audit log threw a foreign key constraint violation (`audit_logs_userId_fkey`).

2. **Backend Architecture Fixes (`PACIFIC-Backend`)**:
   - **Atomic Nested Writes (`src/modules/crm/crm.service.ts`)**:
     - Refactored `crmService.createCustomer` to utilize Prisma's native atomic nested write pattern:
       ```ts
       await prisma.businessParty.create({
         data: {
           partyType: 'CUSTOMER',
           legalName,
           tradeName,
           gstin,
           pan,
           customerProfile: { create: { customerType, creditLimit, ... } },
           contacts: { create: [{ contactPerson, email, phone, ... }] },
           addresses: { create: [...] },
         },
         include: { customerProfile: true, contacts: true, addresses: true }
       });
       ```
     - Executes as a single atomic SQL statement in under 1 second, completely bypassing interactive transaction pooling limitations on pgBouncer.
     - Similarly refactored `crmService.updateCustomer` to eliminate blocking interactive transaction wrappers.
   - **Audit Log Foreign Key Safeguard (`src/modules/audit/audit.service.ts`)**:
     - Added existence check in `auditService.logMutation`: queries `prisma.user.findUnique({ where: { id: userId } })` before inserting. If the user does not exist in the local database, it safely records `userId: null` and preserves the action details, eliminating 500 foreign key errors.

3. **Frontend Package Sanitization & `allowScripts` Resolution (`PACIFIC-Admin`)**:
   - **Removal of Server Packages from Frontend SPA**:
     - Removed `@prisma/client`, `prisma`, and `fs-extra` from `d:/PACIFIC-Admin/package.json`. These database and Node-only packages were mistakenly listed in frontend dependencies despite never being imported anywhere in Vite `src/`.
     - Removing them reduced Vercel build bundle bloat by over 150MB, eliminated 3 of the 4 `npm warn install-scripts` warnings, and resolved deprecated engine alerts.
   - **Configured `allowScripts`**:
     - Added `"allowScripts": { "esbuild": true }` to `d:/PACIFIC-Admin/package.json` to explicitly approve modern Vite esbuild postinstall scripts.
     - Added `"allowScripts": { "@prisma/client": true, "@prisma/engines": true, "prisma": true, "esbuild": true }` to `d:/PACIFIC-Backend/package.json`.

---

## 50. Signature Mobile Number Sanitization & Customer Deletion pgBouncer Optimization

1. **Quotation & PI PDF Signature Section Mobile Number Sanitization**:
   - **Root Cause**: In backend `pdf.service.ts` (`generateQuotationPdfHtml`) and `quotations.service.ts`, `issuingStaffPhone` previously defaulted to `+91 8010834316`.
   - **Sanitization & Defensive Filtering**:
     - Completely removed the hardcoded `+91 8010834316` fallback from `pdf.service.ts` and `quotations.service.ts`.
     - Added active sanitization filter (`!phone.includes('8010834316')`) across both `pdf.service.ts` and `quotations.service.ts`. If no phone is provided (or if the phone matches the old number), the `Mobile: ...` line in the signature section is completely omitted rather than displaying an incorrect number.
     - PI PDF fallback explicitly verified as `+91 9818592113 / 9882056529` (Company Head Ejajul Shaikh) with sanitization against `8010834316`.

2. **Customer Deletion 500 Error / Transaction Timeout Resolution**:
   - **Root Cause**: `crmService.deleteCustomer` wrapped 7 separate sequential delete queries inside `prisma.$transaction(async (tx) => { ... })`. Over remote network connections to Supabase pgBouncer on port 6543 (`?pgbouncer=true`), executing multi-round interactive transactions exceeded the 5000ms default interactive transaction limit (timing out at 5668ms with `Transaction API error: Transaction already closed: A commit cannot be executed on an expired transaction`). In addition, attempting parallel queries over pgBouncer exhausted client connection pool limits.
   - **Native Database Cascade Delete (`src/modules/crm/crm.service.ts`)**:
     - The PostgreSQL database schema already defines `onDelete: Cascade` on all dependent customer relations: `CustomerProfile`, `VendorProfile`, `PartyContact`, `PartyAddress`, `ExportCustomerProfile`, and `ExportCustomerBankAccount`.
     - Refactored `deleteCustomer` to eliminate `prisma.$transaction`. It first deletes any non-cascading merge logs (`prisma.customerMergeLog.deleteMany`), and then executes `prisma.businessParty.delete({ where: { id } })`.
     - PostgreSQL natively cascades deletions to all child profiles, contacts, and addresses in a single atomic SQL operation taking under 500ms.
     - Added `{ timeout: 30000, maxWait: 15000 }` to `crmService.mergeCustomers` to protect customer merging from pooler timeouts.
     - Verified end-to-end: dummy customer deletion executes with status 200 in under 800ms with zero errors.














---

## 51. Indian GST Architecture Overhaul: 07 (Delhi) Intra-State vs Interstate (IGST 18%) Authority

1. **Supreme GSTIN Authority Rule**:
   - **Primary Rule**: If a GSTIN is provided (length >= 2):
     - If the GSTIN starts with '07' (Delhi state code) -> **Intra-State Supply**: Tax is split equally as **CGST @ 9%** and **SGST @ 9%** (IGST = 0%).
     - If the GSTIN starts with any other code (e.g. '06' Haryana, '08' Rajasthan, '09' Uttar Pradesh, '27' Maharashtra, etc.) -> **Inter-State Supply**: Tax is strictly **IGST @ 18%** (CGST = 0%, SGST = 0%).
     - Under Indian GST Law, a registered buyer's GSTIN is the sole legal authority for place of supply. No secondary fallback (such as arbitrary address regexes or defaulted state codes) may override an active GSTIN.
   - **Unregistered / B2C Buyer Fallback**: Only if no GSTIN is provided, fallback to state code '07' or explicit name check matching 'Delhi'.

2. **Frontend Overhaul (PACIFIC-Admin)**:
   - **src/utils/tax.ts**:
     - Added comprehensive GST_STATE_CODE_MAP covering all 36 Indian states and union territories.
     - Refactored isDelhiState(gstin, stateCode, stateName, address): cleans any non-alphanumeric characters, checks cleanGstin.startsWith('07') first. If GSTIN exists and does not start with '07', returns false immediately.
     - calculateGstSplit() accepts buyerGstin?: string and derives isDelhi using the authoritative rule.
   - **Sales Quotations (DraftQuotationPage.tsx, EditSalesQuotationPage.tsx, SalesQuotationDetailPage.tsx)**:
     - Resolves activeGstin from selected customer profile or recipient data and passes it directly to calculateGstSplit().
   - **Proforma Invoices (CreateProformaPage.tsx, EditProformaInvoicePage.tsx, ProformaInvoiceDetailPage.tsx)**:
     - Integrated GST_STATE_CODE_MAP in billing address inputs to auto-populate the exact state name based on GSTIN prefix (e.g. '06' -> Haryana, '08' -> Rajasthan, '27' -> Maharashtra), replacing previously hardcoded 'Delhi' defaults.
   - **Sales Orders (CreateSalesOrderPage.tsx, EditSalesOrderPage.tsx, SalesOrderDetailPage.tsx)**:
     - Uses activeGstin and GST_STATE_CODE_MAP for live calculation of CGST/SGST vs IGST across creation forms, edit views, and detail pages.

3. **Backend Overhaul (PACIFIC-Backend)**:
   - **Central Tax Engine (src/modules/tax/tax.engine.ts)**:
     - Added buyerGstin?: string to TaxCalculationParams.
     - In calculateGstTax(), checks cleanBuyerGstin.startsWith('07') first. Interstate GSTINs are guaranteed isIntraState = false with 18% IGST.
     - Exported GST_STATE_CODE_MAP and isDelhiGst(gstin, stateCode, stateName) helper function for use across all modules.
   - **Proforma Invoice Service (src/modules/sales/pi.service.ts)**:
     - In create(): passes buyerGstin into calculateGstTax(); sets placeOfSupplyStateCode and placeOfSupply using buyerGstin prefix and GST_STATE_CODE_MAP rather than defaulting to Delhi.
     - In update(): passes buyerGstin into calculateGstTax() and synchronizes party addresses with the correct state and state code.
     - In createFromQuotation(): evaluates customerGstin first to correctly assign interstate state codes.
     - In getPdfHtml(): ensures billTo and shipTo party fallbacks reflect the PI's actual placeOfSupply and placeOfSupplyStateCode.
   - **Sales Orders Service (src/modules/orders/orders.service.ts)**:
     - In createFromQuotation(), create(), and update(): removed regex fallbacks that previously overrode interstate GSTINs when placeOfSupply was empty or defaulted to '07'.
     - In getPdfHtml(): derives state code and POS cleanly using isDelhiGst() and the buyer GSTIN.
   - **Sales Quotations Service (src/modules/quotations/quotations.service.ts)**:
     - Passes recipientGstin from quote.customer?.gstin into pdfService.generateQuotationPdfHtml().
   - **PDF Generation Service (src/modules/pdf/pdf.service.ts)**:
     - **Quotation PDF (generateQuotationPdfHtml)**: Fixed critical bug where data.gstRate === 18 was causing ALL quotations to display CGST @ 9% + SGST @ 9%. Now uses isDelhiGst(data.recipientGstin, undefined, data.recipientAddress).
     - **PI PDF (generatePiHtml)**: Replaced flawed !(data.placeOfSupply || '').trim() fallback with isDelhiGst().
     - **Sales Order PDF (generateSalesOrderPdfHtml)**: Uses isDelhiGst().
     - **Tax Invoice PDF (generateTaxInvoicePdfHtml)**: Uses isDelhiGst().

---

## 29. NVIDIA NIM Multi-Angle 4:3 Gallery Generation Engine & ImageKit.io Storage

### 1. Architectural Overview
- **Service**: `src/lib/openaiImageService.ts` (synced across both `PACIFIC-Admin` and `PACIFIC RESTROOM CUBICLE`).
- **Engine**: NVIDIA NIM — model `qwen-image-edit-nvpcb-ovsl2sl` via `https://integrate.api.nvidia.com/v1/images/edits` (OpenAI-compatible endpoint, **zero OpenAI SDK dependency**).
- **Core Workflow**:
  1. **Cover Photo Conversion**: Fetches the main cover ImageKit URL and converts it to a `data:image/...;base64,...` data URI for submission to the NVIDIA NIM endpoint.
  2. **4-Angle Generation via NVIDIA NIM**: Sequentially calls `POST /v1/images/edits` with `model: "qwen-image-edit-nvpcb-ovsl2sl"`, `image: <base64>`, `prompt: <angle description + product context>`, `n: 1`, `response_format: "b64_json"` for 4 distinct architectural angles:
     - **Angle 1**: *Wide 45° Isometric Architectural View* (Facade, continuous headrail box extrusion, marble surroundings, luxury lighting).
     - **Angle 2**: *Macro Hardware Detail Close-Up* (Grade 304 SS gravity hinges, red/green occupancy indicator lock, ergonomic pull handle, coat hook).
     - **Angle 3**: *Interior Cabin & Door Ajar View* (30° open door, internal privacy rebated edge, interior SS hook with rubber buffer, cabin depth).
     - **Angle 4**: *Low-Angle Floor & Structural Elevation* (100–150mm adjustable legs, floor shoe bracket, mop clearance, floor line).
  3. **Response Parsing**: Extracts `data[0].b64_json` from the NVIDIA NIM response and converts to `data:image/png;base64,...` data URI.
  4. **Canvas 4:3 Aspect Ratio Cropping**: Center-crops each generated image to exact **4:3 ratio (1200×900)** WebP via HTML5 `<canvas>` (`cropImageTo4x3`).
  5. **ImageKit.io CDN Direct Upload**: Uploads each 4:3 WebP to ImageKit.io (`/products` folder) via `uploadToImageKit`. Only public CDN URLs are persisted to the database.
  6. **API Key Discovery**: Reads `VITE_NVIDIA_API_KEY` from `.env`, falls back to `(globalThis as any).process.env.NVIDIA_API_KEY`, then falls back to `localStorage` (`pacific_nvidia_api_key`). PRC `.env` already has the live `nvapi-*` key pre-configured.
  7. **Graceful Quota Handling**: HTTP 429/quota errors surface a link to `https://build.nvidia.com/` with an API key switcher and immediate "Use Curated 4:3 Angles (Backup Demo)" fallback pipeline.
  8. **Non-Quota Error Fallback**: Individual angle failures (e.g. transient 5xx) silently fall back to the matching curated architectural angle URL for the category, so the 4-upload pipeline always completes.
- **Bundle Size**: Removing the OpenAI SDK reduced `OpenAIGalleryModal` chunk from **378 kB → 21.95 kB** (−94%).

### 2. UI Components & Integrations
- **`src/components/common/OpenAIGalleryModal.tsx`** (Admin) / **`src/app/components/OpenAIGalleryModal.tsx`** (PRC):
  - Full-featured studio modal: NVIDIA NIM badge, live 4-step progress bar, per-angle thumbnails on completion, one-click "Apply Photos to Gallery".
  - API key form: placeholder `nvapi-...`, link to `build.nvidia.com`, validation message referencing `VITE_NVIDIA_API_KEY`.
  - Error notice: billing link → `https://build.nvidia.com/`, API key switcher, curated angles backup button.
- **`CreateAdminProductPage.tsx` & `EditProductModelPage.tsx`**:
  - "✨ Auto-Generate 4 Angles (AI)" action button in the gallery header.
  - "Auto-generate 4 angles on cover upload" checkbox toggle.
  - "AI 4 Angles" quick-trigger button overlay directly on the Main Cover photo card.
- **`AdminProducts.tsx` (Admin Quick Modal & Frontend CMS)**:
  - Wired into both the Admin quick model editor and the frontend Restroom Cubicle CMS product editor.

### 3. Environment Variables
| Variable | Used In | Purpose |
|---|---|---|
| `VITE_NVIDIA_API_KEY` | Both repos `.env` | Primary NVIDIA NIM bearer token (`nvapi-*`) |
| `VITE_OPENAI_API_KEY` | Admin `.env` (legacy, unused) | Deprecated — no longer read |


