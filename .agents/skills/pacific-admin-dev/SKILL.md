---
name: pacific-admin-dev
description: >-
  Use this skill when adding or updating views, components, data tables, or API integrations
  in the Pacific Restroom Cubicle Admin Console (D:\PACIFIC-Admin).
---

# Pacific Admin Console Development Guide

## Project Location
`D:\PACIFIC-Admin\` — Port **5176**, connects to backend at `http://localhost:5001/api/v1`

## Architecture Overview (`src/`)

- `pages/`:
  - `SalesQuotationsPage.tsx`: Formal sales quotation letter wizard (`PPS/D/<FY>/<seq>`), narrative specs, boilerplate selector, SEZ LUT validator (0% IGST), vector A4 PDF letter preview, and 1-click conversion to Sales Order.
  - `SalesOrdersPage.tsx`: Central Sales Order Hub (`PPS/ORD/<FY>/<seq>`), universal cross-document search, dispatch status tracker, and complete document timeline drawer (`Quotation -> Order -> PI -> PL -> HIL -> Dues`).
  - `PackingListsPage.tsx`: Packing List Generation (`PPS/PL/<FY>/<seq>`), 1-click cubicle BOM auto-explosion, packet nature classification (`Board`, `Channel`, `Box`, `Bundle`, `Crate`), and dual signature layout.
  - `HardwareIssuePage.tsx`: Hardware Store Issue (`PPS/HIL/<FY>/<seq>`), 44-item master catalog manager tab, sequential 4-role sign-off dialog (Store Keeper $\to$ Packed by $\to$ Checked by $\to$ Store Incharge).
  - `CustomersPage.tsx`: B2B CRM with real-time Customer 360 KPIs, contact/address hierarchy, real-time debounced deduplication warning alert, and the Customer Merge Tool.
  - `ConsigneeAckPage.tsx`: Mobile-first consignee digital delivery acknowledgment interface with interactive HTML5 signature canvas (`/acknowledge-receipt/:token`).
  - `VendorsPage.tsx`: Supplier master for cubicle hardware, HPL boards, aluminium, SS, and nylon.
  - `PurchaseOrdersPage.tsx`: Multi-step PO wizard (finishes, thickness, cutting sizes), approvals, and A4 PDF preview.
  - `ProformaInvoicesPage.tsx`: Multi-step PI wizard with Place of Supply GST, official issuance, duplicate, and cancel.
  - `PaymentsPage.tsx`: Payment recording, PI allocation, receivables/payables ledger, and recovery dashboard.
  - `ProductsMasterPage.tsx`: Catalog master with materials, finishes, units, barcodes, and HSN/SAC codes.
  - `QrCenterPage.tsx`: Mobile camera QR scanner, BarcodeDetector API, targeting brackets, laser beam, and QR generator.
  - `CompanySettingsPage.tsx`: Multi-entity manager (India GST / UAE VAT), bank accounts, signatories, sequences, and audit logs.
  - `PublicVerifyPage.tsx`: Public certificate verification route for document QR scans (`/verify/:token`).
- `pages/admin/`:
  - `AdminDashboard.tsx`: Dashboard shell with 10-minute inactivity auto-logout, grouped navigation, and Mobile Bottom Nav Bar.
  - `AdminOverview.tsx`: Operations dashboard with KPI metrics and quick actions.
  - `AdminProducts.tsx`, `AdminBlogs.tsx`, `AdminSolutions.tsx`, `AdminGallery.tsx`, `AdminHero.tsx`, etc.: CMS modules.
- `api/services.ts`: Axios API client functions mapped to PACIFIC-Backend routes (`salesQuotationsApi`, `salesOrdersApi`, `packingListsApi`, `hardwareIssueApi`, `crmApi`, `publicAckApi`).
- `types/admin.ts`: Strict TypeScript type definitions for all entities and ERP models.
- `lib/supabase.ts`: Supabase client for authentication and cloud storage uploads.

## Mandatory Directives Before Finishing Any Task

1. **Read `PROJECT_CONTEXT.md` first** before any modification.
2. **Update `PROJECT_CONTEXT.md`** whenever views, services, or types change.
3. **Zero TypeScript errors** — run `npx tsc --noEmit` before finishing any task.
4. **Cross-stack sync**: Any new API endpoint must be added to `src/api/services.ts` and `src/types/admin.ts`.
5. **Build must pass**: Run `npm run build` and ensure it exits 0.

## Adding a New View

1. Add view definition to `AdminView` in `src/types/admin.ts`.
2. Implement view component in `src/pages/` with responsive table-to-card transformations and touch targets $\ge 44\text{px}$.
3. Register route in `src/App.tsx` with `React.lazy()` and `<Suspense fallback={<PageLoader />}>`.
4. Add link to `erpNavItems` or `cmsNavItems` in `src/pages/admin/AdminDashboard.tsx`.
5. Run `npx tsc --noEmit` and `npm run build` to ensure 0 errors.
