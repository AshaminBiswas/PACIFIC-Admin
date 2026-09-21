import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy-loaded Admin Pages ported from PACIFIC RESTROOM CUBICLE
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminBlogs = lazy(() => import('./pages/admin/AdminBlogs'));
const AdminSolutions = lazy(() => import('./pages/admin/AdminSolutions'));
const AdminGallery = lazy(() => import('./pages/admin/AdminGallery'));
const AdminHero = lazy(() => import('./pages/admin/AdminHero'));
const AdminCoreServices = lazy(() => import('./pages/admin/AdminCoreServices'));
const AdminPageBanners = lazy(() => import('./pages/admin/AdminPageBanners'));
const AdminCatalogs = lazy(() => import('./pages/admin/AdminCatalogs'));
const AdminContactQueries = lazy(() => import('./pages/admin/AdminContactQueries'));
const AdminFeedback = lazy(() => import('./pages/admin/AdminFeedback'));
const AdminFAQ = lazy(() => import('./pages/admin/AdminFAQ'));
const AdminLeads = lazy(() => import('./pages/admin/AdminLeads'));

// Enterprise ERP & Operations Pages
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const VendorsPage = lazy(() => import('./pages/VendorsPage'));
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrdersPage'));
const ProformaInvoicesPage = lazy(() => import('./pages/ProformaInvoicesPage'));
const SalesQuotationsPage = lazy(() => import('./pages/SalesQuotationsPage'));
const SalesOrdersPage = lazy(() => import('./pages/SalesOrdersPage'));
const PackingListsPage = lazy(() => import('./pages/PackingListsPage'));
const HardwareIssuePage = lazy(() => import('./pages/HardwareIssuePage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const ProductsMasterPage = lazy(() => import('./pages/ProductsMasterPage'));
const QrCenterPage = lazy(() => import('./pages/QrCenterPage'));
const CompanySettingsPage = lazy(() => import('./pages/CompanySettingsPage'));

// Public Document Verification Page
const PublicVerifyPage = lazy(() => import('./pages/PublicVerifyPage'));
const ConsigneeAckPage = lazy(() => import('./pages/ConsigneeAckPage'));

// Legacy Sales & Commercial Pages
const ConfiguratorLeadsPage = lazy(() => import('./pages/ConfiguratorLeadsPage'));
const QuotationsPage = lazy(() => import('./pages/QuotationsPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7FB706]" />
    </div>
  );
}

export default function App() {
  return (
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
              path="vendors"
              element={
                <Suspense fallback={<PageLoader />}>
                  <VendorsPage />
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
              path="sales-orders"
              element={
                <Suspense fallback={<PageLoader />}>
                  <SalesOrdersPage />
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
              path="packing-lists"
              element={
                <Suspense fallback={<PageLoader />}>
                  <PackingListsPage />
                </Suspense>
              }
            />
            <Route
              path="hardware-issues"
              element={
                <Suspense fallback={<PageLoader />}>
                  <HardwareIssuePage />
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
              path="products-master"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProductsMasterPage />
                </Suspense>
              }
            />
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
              path="blogs"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminBlogs />
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
              path="gallery"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminGallery />
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
              path="contact-queries"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminContactQueries />
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
              path="projects"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProjectsPage />
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
          </Route>
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
