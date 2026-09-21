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
├── src/
│   ├── main.tsx                      # React entry point
│   ├── App.tsx                       # Router config: Protected Admin Routes + Public /verify/:token
│   ├── index.css                     # Tailwind base styles & custom scrollbars
│   ├── image/logo/                   # Brand vector/webp assets (logo.webp)
│   ├── api/
│   │   ├── client.ts                 # Axios client with JWT auto-injection & error handling
│   │   └── services.ts               # Enterprise API endpoints: CRM, Vendors, PO, PI, Finance, QR, Companies
│   ├── types/
│   │   └── admin.ts                  # TypeScript interfaces for all ERP, CRM, Tax, QR, and CMS models
│   ├── lib/
│   │   ├── supabase.ts               # Supabase client & storage utilities
│   │   ├── database.types.ts         # Supabase table definitions
│   │   └── hooks.ts                  # Custom data fetching hooks
│   ├── components/
│   │   └── ProtectedRoute.tsx        # Supabase auth session guard
│   └── pages/
│       ├── SalesQuotationsPage.tsx   # Formal Sales Quotation Letter (PPS/D/<FY>/<seq>), narrative specs, SEZ validator, 1-click order convert
│       ├── SalesOrdersPage.tsx       # Central Sales Order Hub (PPS/ORD/<FY>/<seq>), cross-document universal search & timeline
│       ├── ProformaInvoicesPage.tsx  # Multi-step PI wizard with server GST engine, issue, duplicate, cancel
│       ├── PackingListsPage.tsx      # Packing List Generation (PPS/PL/<FY>/<seq>), BOM auto-explosion, packet nature classification
│       ├── HardwareIssuePage.tsx     # Hardware Store Issue (PPS/HIL/<FY>/<seq>), 44-item catalog, sequential 4-role sign-off
│       ├── CustomersPage.tsx         # B2B CRM: Customer 360, contacts, addresses, credit limits, deduplication, Customer Merge Tool
│       ├── VendorsPage.tsx           # Supplier Master: HPL boards, hardware, aluminium extrusions
│       ├── PurchaseOrdersPage.tsx    # Multi-step PO wizard, approval workflow, vector A4 PDF preview
│       ├── PaymentsPage.tsx          # Payment recording, PI invoice allocation, receivables/payables ledger
│       ├── ProductsMasterPage.tsx    # Cubicle catalog: materials, finishes, units, barcode/HSN/SAC
│       ├── QrCenterPage.tsx          # Mobile camera scanner, targeting brackets, laser beam, QR generator
│       ├── CompanySettingsPage.tsx   # Multi-entity switcher (India GST / UAE VAT), bank accounts, signatories, sequences
│       ├── PublicVerifyPage.tsx      # Public-safe document certificate verification (/verify/:token)
│       ├── ConsigneeAckPage.tsx      # Public consignee digital delivery acknowledgment & signature canvas (/acknowledge-receipt/:token)
│       ├── ConfiguratorLeadsPage.tsx # 3D configurator design leads
│       ├── QuotationsPage.tsx        # Legacy B2B price estimates
│       ├── ProjectsPage.tsx          # Commercial installation projects
│       ├── InvoicesPage.tsx          # Legacy invoices
│       └── admin/                    # Admin CMS Suite:
│           ├── AdminLogin.tsx        # Branded dark login page
│           ├── AdminDashboard.tsx    # App Shell: Inactivity timer, grouped nav, Mobile Bottom Nav Bar
│           ├── AdminOverview.tsx     # Operations KPI cards
│           ├── AdminProducts.tsx     # Rich-text services CMS
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
| `/admin/dashboard/sales-orders` | `SalesOrdersPage` | Protected | Central Sales Order Hub (`PPS/ORD/2026-27/...`), cross-document universal search & timeline |
| `/admin/dashboard/proforma-invoices` | `ProformaInvoicesPage`| Protected | Sales PI wizard with Place of Supply GST, official issuance |
| `/admin/dashboard/packing-lists` | `PackingListsPage` | Protected | Packing List Generation (`PPS/PL/2026-27/...`), BOM explosion, packet nature classification, partial dispatch tracking |
| `/admin/dashboard/hardware-issues` | `HardwareIssuePage` | Protected | Hardware Issue Lists (`PPS/HIL/2026-27/...`), 44-item hardware catalog, 4-role sequential sign-off |
| `/admin/dashboard/purchase-orders` | `PurchaseOrdersPage` | Protected | Procurement PO wizard (finish, thickness, sizes), PDF preview |
| `/admin/dashboard/customers` | `CustomersPage` | Protected | B2B CRM, Customer 360 KPIs, real-time deduplication check, Customer Merge Tool, unified timeline |
| `/admin/dashboard/vendors` | `VendorsPage` | Protected | Supplier registry (HPL boards, SS/Nylon hardware, extrusions) |
| `/admin/dashboard/payments` | `PaymentsPage` | Protected | Payment allocation, Receivables & Payables ledgers, Dues recovery |
| `/admin/dashboard/products-master` | `ProductsMasterPage` | Protected | Catalog master (categories, subcategories, finishes, units) |
| `/admin/dashboard/qr-center` | `QrCenterPage` | Protected | Camera viewfinder QR scanner, code generator, audit logs |
| `/admin/dashboard/company-settings`| `CompanySettingsPage`| Protected | Multi-entity manager (IN/AE), bank accounts, signatories, sequences |
| `/admin/dashboard/products` | `AdminProducts` | Protected | Services CMS editor |
| `/admin/dashboard/blogs` | `AdminBlogs` | Protected | Blog management |
| `/admin/dashboard/solutions` | `AdminSolutions` | Protected | Solutions CMS |
| `/admin/dashboard/gallery` | `AdminGallery` | Protected | Installation photo gallery |
| `/admin/dashboard/hero` | `AdminHero` | Protected | Homepage hero slides |
| `/admin/dashboard/core-services` | `AdminCoreServices` | Protected | Core services |
| `/admin/dashboard/page-banners` | `AdminPageBanners` | Protected | Header banners |
| `/admin/dashboard/catalogs` | `AdminCatalogs` | Protected | Downloadable PDF brochures |
| `/admin/dashboard/contact-queries` | `AdminContactQueries` | Protected | Contact form leads |
| `/admin/dashboard/feedback` | `AdminFeedback` | Protected | Customer testimonials |
| `/admin/dashboard/faq` | `AdminFAQ` | Protected | FAQ editor |
| `/admin/dashboard/leads` | `AdminLeads` | Protected | Visitor inquiries |
| `/admin/dashboard/configurator-leads` | `ConfiguratorLeadsPage` | Protected | 3D Configurator design submissions |
| `/admin/dashboard/quotations` | `QuotationsPage` | Protected | Quotation estimates |
| `/admin/dashboard/projects` | `ProjectsPage` | Protected | Commercial projects |
| `/admin/dashboard/invoices` | `InvoicesPage` | Protected | Commercial invoices |

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

- **Automatic Inactivity Logout**: Session monitored for 10 minutes of inactivity. A warning toast with live countdown appears 60 seconds before termination with a "Stay Logged In" button.
- **Cryptographically Signed QR Tokens**: Generated with HMAC-SHA256. Public endpoint `/verify/:token` never exposes primary keys or confidential profit margins.
- **Strict TypeScript & Build Verification**:
  - Zero TypeScript errors: `npx tsc --noEmit`
  - Zero-error Vite bundle build: `npm run build`
