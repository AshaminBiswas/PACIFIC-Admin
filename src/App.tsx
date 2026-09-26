import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { PageLoader } from './components/common/PageLoader';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { lazyWithRetry } from './utils/lazyWithRetry';

// Lazy-loaded Admin Pages ported from PACIFIC RESTROOM CUBICLE with auto-retry
const AdminLogin = lazyWithRetry(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazyWithRetry(() => import('./pages/admin/AdminDashboard'));
const AdminOverview = lazyWithRetry(() => import('./pages/admin/AdminOverview'));
const AdminProducts = lazyWithRetry(() => import('./pages/admin/AdminProducts'));
const AdminBlogs = lazyWithRetry(() => import('./pages/admin/AdminBlogs'));
const AdminSolutions = lazyWithRetry(() => import('./pages/admin/AdminSolutions'));
const AdminGallery = lazyWithRetry(() => import('./pages/admin/AdminGallery'));
const AdminHero = lazyWithRetry(() => import('./pages/admin/AdminHero'));
const AdminCoreServices = lazyWithRetry(() => import('./pages/admin/AdminCoreServices'));
const AdminPageBanners = lazyWithRetry(() => import('./pages/admin/AdminPageBanners'));
const AdminCatalogs = lazyWithRetry(() => import('./pages/admin/AdminCatalogs'));
const AdminContactQueries = lazyWithRetry(() => import('./pages/admin/AdminContactQueries'));
const AdminFeedback = lazyWithRetry(() => import('./pages/admin/AdminFeedback'));
const AdminFAQ = lazyWithRetry(() => import('./pages/admin/AdminFAQ'));
const AdminLeads = lazyWithRetry(() => import('./pages/admin/AdminLeads'));
const CreateAdminProductPage = lazyWithRetry(() => import('./pages/admin/CreateAdminProductPage'));
const ProductModelDetailPage = lazyWithRetry(() => import('./pages/admin/ProductModelDetailPage'));
const EditProductModelPage = lazyWithRetry(() => import('./pages/admin/EditProductModelPage'));
const CreateBlogPage = lazyWithRetry(() => import('./pages/admin/CreateBlogPage'));
const CreateSolutionPage = lazyWithRetry(() => import('./pages/admin/CreateSolutionPage'));
const CreateGalleryPage = lazyWithRetry(() => import('./pages/admin/CreateGalleryPage'));
const CreateCatalogPage = lazyWithRetry(() => import('./pages/admin/CreateCatalogPage'));
const CreateContactQueryPage = lazyWithRetry(() => import('./pages/admin/CreateContactQueryPage'));

// Enterprise ERP & Operations Pages
const CustomersPage = lazyWithRetry(() => import('./pages/CustomersPage'));
const CustomerDetailPage = lazyWithRetry(() => import('./pages/CustomerDetailPage'));
const EditCustomerPage = lazyWithRetry(() => import('./pages/EditCustomerPage'));
const CustomerFollowupPage = lazyWithRetry(() => import('./pages/CustomerFollowupPage'));
const VendorsPage = lazyWithRetry(() => import('./pages/VendorsPage'));
const VendorDetailPage = lazyWithRetry(() => import('./pages/VendorDetailPage'));
const EditVendorPage = lazyWithRetry(() => import('./pages/EditVendorPage'));
const PurchaseOrdersPage = lazyWithRetry(() => import('./pages/PurchaseOrdersPage'));
const ProformaInvoicesPage = lazyWithRetry(() => import('./pages/ProformaInvoicesPage'));
const ProformaInvoiceDetailPage = lazyWithRetry(() => import('./pages/ProformaInvoiceDetailPage'));
const EditProformaInvoicePage = lazyWithRetry(() => import('./pages/EditProformaInvoicePage'));
const ProformaInvoiceFollowupPage = lazyWithRetry(() => import('./pages/ProformaInvoiceFollowupPage'));
const SalesQuotationsPage = lazyWithRetry(() => import('./pages/SalesQuotationsPage'));
const SalesQuotationDetailPage = lazyWithRetry(() => import('./pages/SalesQuotationDetailPage'));
const EditSalesQuotationPage = lazyWithRetry(() => import('./pages/EditSalesQuotationPage'));
const QuotationFollowupPage = lazyWithRetry(() => import('./pages/QuotationFollowupPage'));
const DraftQuotationPage = lazyWithRetry(() => import('./pages/DraftQuotationPage'));
const SalesOrdersPage = lazyWithRetry(() => import('./pages/SalesOrdersPage'));
const SalesOrderDetailPage = lazyWithRetry(() => import('./pages/SalesOrderDetailPage'));
const SalesOrderTimelinePage = lazyWithRetry(() => import('./pages/SalesOrderTimelinePage'));
const SalesOrderFollowupPage = lazyWithRetry(() => import('./pages/SalesOrderFollowupPage'));
const PackingListsPage = lazyWithRetry(() => import('./pages/PackingListsPage'));
const DispatchStatusPage = lazyWithRetry(() => import('./pages/DispatchStatusPage'));
const HardwareIssuePage = lazyWithRetry(() => import('./pages/HardwareIssuePage'));
const CreateProformaPage = lazyWithRetry(() => import('./pages/CreateProformaPage'));
const CreateHardwareIssuePage = lazyWithRetry(() => import('./pages/CreateHardwareIssuePage'));
const CreateSalesOrderPage = lazyWithRetry(() => import('./pages/CreateSalesOrderPage'));
const CreatePackingListPage = lazyWithRetry(() => import('./pages/CreatePackingListPage'));
const CreatePurchaseOrderPage = lazyWithRetry(() => import('./pages/CreatePurchaseOrderPage'));
const CreateCustomerPage = lazyWithRetry(() => import('./pages/CreateCustomerPage'));
const CreateVendorPage = lazyWithRetry(() => import('./pages/CreateVendorPage'));
const CreatePaymentPage = lazyWithRetry(() => import('./pages/CreatePaymentPage'));
const PaymentsPage = lazyWithRetry(() => import('./pages/PaymentsPage'));
const QrCenterPage = lazyWithRetry(() => import('./pages/QrCenterPage'));
const CompanySettingsPage = lazyWithRetry(() => import('./pages/CompanySettingsPage'));
const AdminManagementPage = lazyWithRetry(() => import('./pages/AdminManagementPage'));
const BoardInventoryPage = lazyWithRetry(() => import('./pages/inventory/BoardInventoryPage'));
const CreateBoardSkuPage = lazyWithRetry(() => import('./pages/inventory/CreateBoardSkuPage'));
const LockerInventoryPage = lazyWithRetry(() => import('./pages/inventory/LockerInventoryPage'));
const UmpInventoryPage = lazyWithRetry(() => import('./pages/inventory/UmpInventoryPage'));
const StoreInventoryPage = lazyWithRetry(() => import('./pages/inventory/StoreInventoryPage'));

// Export & Global Trade Management Pages
const ExportDashboardPage = lazyWithRetry(() => import('./pages/export/ExportDashboardPage'));
const ExportOrdersPage = lazyWithRetry(() => import('./pages/export/ExportOrdersPage'));
const ExportShipmentsPage = lazyWithRetry(() => import('./pages/export/ExportShipmentsPage'));
const ExportCustomersPage = lazyWithRetry(() => import('./pages/export/ExportCustomersPage'));
const ExportQuotationsPage = lazyWithRetry(() => import('./pages/export/ExportQuotationsPage'));
const ExportRealizationPage = lazyWithRetry(() => import('./pages/export/ExportRealizationPage'));
const ExportEmailHubPage = lazyWithRetry(() => import('./pages/export/ExportEmailHubPage'));
const CreateExportOrderPage = lazyWithRetry(() => import('./pages/export/CreateExportOrderPage'));
const CreateExportShipmentPage = lazyWithRetry(() => import('./pages/export/CreateExportShipmentPage'));
const CreateExportCustomerPage = lazyWithRetry(() => import('./pages/export/CreateExportCustomerPage'));
const CreateExportQuotationPage = lazyWithRetry(() => import('./pages/export/CreateExportQuotationPage'));
const CreateExportRealizationPage = lazyWithRetry(() => import('./pages/export/CreateExportRealizationPage'));
const ComposeExportEmailPage = lazyWithRetry(() => import('./pages/export/ComposeExportEmailPage'));

// Public Document Verification Page
const PublicVerifyPage = lazyWithRetry(() => import('./pages/PublicVerifyPage'));
const ConsigneeAckPage = lazyWithRetry(() => import('./pages/ConsigneeAckPage'));

// Legacy Sales & Commercial Pages
const ConfiguratorLeadsPage = lazyWithRetry(() => import('./pages/ConfiguratorLeadsPage'));
const QuotationsPage = lazyWithRetry(() => import('./pages/QuotationsPage'));
const ProjectsPage = lazyWithRetry(() => import('./pages/ProjectsPage'));
const InvoicesPage = lazyWithRetry(() => import('./pages/InvoicesPage'));
const CreateLegacyQuotationPage = lazyWithRetry(() => import('./pages/CreateLegacyQuotationPage'));
const CreateProjectPage = lazyWithRetry(() => import('./pages/CreateProjectPage'));
const CreateInvoicePage = lazyWithRetry(() => import('./pages/CreateInvoicePage'));

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root redirects to dashboard */}
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

        {/* Public Document Verification (Scanned via smartphone camera from invoices/POs) */}
        <Route
          path="/verify/:token"
          element={
            <Suspense fallback={<PageLoader />}>
              <PublicVerifyPage />
            </Suspense>
          }
        />

        {/* Public Consignee Digital Delivery Acknowledgment */}
        <Route
          path="/acknowledge-receipt/:token"
          element={
            <Suspense fallback={<PageLoader />}>
              <ConsigneeAckPage />
            </Suspense>
          }
        />

        {/* Public Login Routes */}
        <Route
          path="/admin"
          element={
            <Suspense fallback={<PageLoader />}>
              <AdminLogin />
            </Suspense>
          }
        />
        <Route
          path="/login"
          element={
            <Suspense fallback={<PageLoader />}>
              <AdminLogin />
            </Suspense>
          }
        />

        {/* Protected Admin Routes */}
        <Route path="/admin/dashboard" element={<ProtectedRoute />}>
          <Route
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard />
              </Suspense>
            }
          >
            {/* Overview */}
            <Route
              index
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminOverview />
                </Suspense>
              }
            />

            {/* ERP & Operations Routes */}
            <Route
              path="customers"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CustomersPage />
                </Suspense>
              }
            />
            <Route
              path="customers/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateCustomerPage />
                </Suspense>
              }
            />
            <Route
              path="customers/:id"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CustomerDetailPage />
                </Suspense>
              }
            />
            <Route
              path="customers/:id/edit"
              element={
                <Suspense fallback={<PageLoader />}>
                  <EditCustomerPage />
                </Suspense>
              }
            />
            <Route
              path="customers/:id/follow-up"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CustomerFollowupPage />
                </Suspense>
              }
            />
            <Route
              path="vendors"
              element={
                <Suspense fallback={<PageLoader />}>
                  <VendorsPage />
                </Suspense>
              }
            />
            <Route
              path="vendors/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateVendorPage />
                </Suspense>
              }
            />
            <Route
              path="vendors/:id"
              element={
                <Suspense fallback={<PageLoader />}>
                  <VendorDetailPage />
                </Suspense>
              }
            />
            <Route
              path="vendors/:id/edit"
              element={
                <Suspense fallback={<PageLoader />}>
                  <EditVendorPage />
                </Suspense>
              }
            />
            <Route
              path="purchase-orders"
              element={
                <Suspense fallback={<PageLoader />}>
                  <PurchaseOrdersPage />
                </Suspense>
              }
            />
            <Route
              path="sales-quotations"
              element={
                <Suspense fallback={<PageLoader />}>
                  <SalesQuotationsPage />
                </Suspense>
              }
            />
            <Route
              path="sales-quotations/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <DraftQuotationPage />
                </Suspense>
              }
            />
            <Route
              path="sales-quotations/:id"
              element={
                <Suspense fallback={<PageLoader />}>
                  <SalesQuotationDetailPage />
                </Suspense>
              }
            />
            <Route
              path="sales-quotations/:id/edit"
              element={
                <Suspense fallback={<PageLoader />}>
                  <EditSalesQuotationPage />
                </Suspense>
              }
            />
            <Route
              path="sales-quotations/:id/follow-up"
              element={
                <Suspense fallback={<PageLoader />}>
                  <QuotationFollowupPage />
                </Suspense>
              }
            />
            <Route
              path="sales-orders"
              element={
                <Suspense fallback={<PageLoader />}>
                  <SalesOrdersPage />
                </Suspense>
              }
            />
            <Route
              path="sales-orders/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateSalesOrderPage />
                </Suspense>
              }
            />
            <Route
              path="sales-orders/:id"
              element={
                <Suspense fallback={<PageLoader />}>
                  <SalesOrderDetailPage />
                </Suspense>
              }
            />
            <Route
              path="sales-orders/:id/timeline"
              element={
                <Suspense fallback={<PageLoader />}>
                  <SalesOrderTimelinePage />
                </Suspense>
              }
            />
            <Route
              path="sales-orders/:id/follow-up"
              element={
                <Suspense fallback={<PageLoader />}>
                  <SalesOrderFollowupPage />
                </Suspense>
              }
            />
            <Route
              path="purchase-orders"
              element={
                <Suspense fallback={<PageLoader />}>
                  <PurchaseOrdersPage />
                </Suspense>
              }
            />
            <Route
              path="purchase-orders/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreatePurchaseOrderPage />
                </Suspense>
              }
            />
            <Route
              path="proforma-invoices"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProformaInvoicesPage />
                </Suspense>
              }
            />
            <Route
              path="proforma-invoices/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateProformaPage />
                </Suspense>
              }
            />
            <Route
              path="proforma-invoices/:id"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProformaInvoiceDetailPage />
                </Suspense>
              }
            />
            <Route
              path="proforma-invoices/:id/edit"
              element={
                <Suspense fallback={<PageLoader />}>
                  <EditProformaInvoicePage />
                </Suspense>
              }
            />
            <Route
              path="proforma-invoices/:id/follow-up"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProformaInvoiceFollowupPage />
                </Suspense>
              }
            />
            <Route
              path="packing-lists"
              element={
                <Suspense fallback={<PageLoader />}>
                  <PackingListsPage />
                </Suspense>
              }
            />
            <Route
              path="packing-lists/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreatePackingListPage />
                </Suspense>
              }
            />
            <Route
              path="dispatches"
              element={
                <Suspense fallback={<PageLoader />}>
                  <DispatchStatusPage />
                </Suspense>
              }
            />
            <Route
              path="issue-lists"
              element={
                <Suspense fallback={<PageLoader />}>
                  <HardwareIssuePage />
                </Suspense>
              }
            />
            <Route
              path="issue-lists/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateHardwareIssuePage />
                </Suspense>
              }
            />
            <Route
              path="inventory/boards"
              element={
                <Suspense fallback={<PageLoader />}>
                  <BoardInventoryPage />
                </Suspense>
              }
            />
            <Route
              path="inventory/boards/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateBoardSkuPage />
                </Suspense>
              }
            />
            <Route
              path="inventory/lockers"
              element={
                <Suspense fallback={<PageLoader />}>
                  <LockerInventoryPage />
                </Suspense>
              }
            />
            <Route
              path="inventory/ump"
              element={
                <Suspense fallback={<PageLoader />}>
                  <UmpInventoryPage />
                </Suspense>
              }
            />
            <Route
              path="inventory/store"
              element={
                <Suspense fallback={<PageLoader />}>
                  <StoreInventoryPage />
                </Suspense>
              }
            />
            <Route
              path="board-inventory"
              element={
                <Suspense fallback={<PageLoader />}>
                  <BoardInventoryPage />
                </Suspense>
              }
            />
            <Route
              path="payments"
              element={
                <Suspense fallback={<PageLoader />}>
                  <PaymentsPage />
                </Suspense>
              }
            />
            <Route
              path="payments/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreatePaymentPage />
                </Suspense>
              }
            />
            <Route path="products-master" element={<Navigate to="/admin/dashboard/products" replace />} />
            <Route path="products-master/*" element={<Navigate to="/admin/dashboard/products" replace />} />
            <Route
              path="qr-center"
              element={
                <Suspense fallback={<PageLoader />}>
                  <QrCenterPage />
                </Suspense>
              }
            />
            <Route
              path="company-settings"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CompanySettingsPage />
                </Suspense>
              }
            />
            <Route
              path="admin-management"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminManagementPage />
                </Suspense>
              }
            />

            {/* Export & Global Trade Management Routes */}
            <Route
              path="export"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ExportDashboardPage />
                </Suspense>
              }
            />
            <Route
              path="export/orders"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ExportOrdersPage />
                </Suspense>
              }
            />
            <Route
              path="export/orders/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateExportOrderPage />
                </Suspense>
              }
            />
            <Route
              path="export/shipments"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ExportShipmentsPage />
                </Suspense>
              }
            />
            <Route
              path="export/shipments/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateExportShipmentPage />
                </Suspense>
              }
            />
            <Route
              path="export/customers"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ExportCustomersPage />
                </Suspense>
              }
            />
            <Route
              path="export/customers/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateExportCustomerPage />
                </Suspense>
              }
            />
            <Route
              path="export/quotations"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ExportQuotationsPage />
                </Suspense>
              }
            />
            <Route
              path="export/quotations/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateExportQuotationPage />
                </Suspense>
              }
            />
            <Route
              path="export/realization"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ExportRealizationPage />
                </Suspense>
              }
            />
            <Route
              path="export/realization/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateExportRealizationPage />
                </Suspense>
              }
            />
            <Route
              path="export/emails"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ExportEmailHubPage />
                </Suspense>
              }
            />
            <Route
              path="export/emails/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ComposeExportEmailPage />
                </Suspense>
              }
            />

            {/* Legacy & Website CMS Routes */}
            <Route
              path="products"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminProducts />
                </Suspense>
              }
            />
            <Route
              path="products/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateAdminProductPage />
                </Suspense>
              }
            />
            <Route
              path="products/:id"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProductModelDetailPage />
                </Suspense>
              }
            />
            <Route
              path="products/:id/edit"
              element={
                <Suspense fallback={<PageLoader />}>
                  <EditProductModelPage />
                </Suspense>
              }
            />
            <Route
              path="blogs"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminBlogs />
                </Suspense>
              }
            />
            <Route
              path="blogs/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateBlogPage />
                </Suspense>
              }
            />
            <Route
              path="solutions"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminSolutions />
                </Suspense>
              }
            />
            <Route
              path="solutions/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateSolutionPage />
                </Suspense>
              }
            />
            <Route
              path="gallery"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminGallery />
                </Suspense>
              }
            />
            <Route
              path="gallery/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateGalleryPage />
                </Suspense>
              }
            />
            <Route
              path="hero"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminHero />
                </Suspense>
              }
            />
            <Route
              path="core-services"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminCoreServices />
                </Suspense>
              }
            />
            <Route
              path="page-banners"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminPageBanners />
                </Suspense>
              }
            />
            <Route
              path="catalogs"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminCatalogs />
                </Suspense>
              }
            />
            <Route
              path="catalogs/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateCatalogPage />
                </Suspense>
              }
            />
            <Route
              path="contact-queries"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminContactQueries />
                </Suspense>
              }
            />
            <Route
              path="contact-queries/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateContactQueryPage />
                </Suspense>
              }
            />
            <Route
              path="feedback"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminFeedback />
                </Suspense>
              }
            />
            <Route
              path="faq"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminFAQ />
                </Suspense>
              }
            />
            <Route
              path="leads"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminLeads />
                </Suspense>
              }
            />
            <Route
              path="configurator-leads"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ConfiguratorLeadsPage />
                </Suspense>
              }
            />
            <Route
              path="quotations"
              element={
                <Suspense fallback={<PageLoader />}>
                  <QuotationsPage />
                </Suspense>
              }
            />
            <Route
              path="quotations/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateLegacyQuotationPage />
                </Suspense>
              }
            />
            <Route
              path="projects"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProjectsPage />
                </Suspense>
              }
            />
            <Route
              path="projects/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateProjectPage />
                </Suspense>
              }
            />
            <Route
              path="invoices"
              element={
                <Suspense fallback={<PageLoader />}>
                  <InvoicesPage />
                </Suspense>
              }
            />
            <Route
              path="invoices/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CreateInvoicePage />
                </Suspense>
              }
            />
          </Route>
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  </AdminAuthProvider>
  );
}
