import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import type { AdminView } from '../../types/admin';

// Lazy-loaded pages
const DashboardPage = React.lazy(() => import('../../pages/DashboardPage'));
const ProductsPage = React.lazy(() => import('../../pages/ProductsPage'));
const ConfiguratorLeadsPage = React.lazy(() => import('../../pages/ConfiguratorLeadsPage'));
const QuotationsPage = React.lazy(() => import('../../pages/QuotationsPage'));
const LeadsPage = React.lazy(() => import('../../pages/LeadsPage'));
const ProjectsPage = React.lazy(() => import('../../pages/ProjectsPage'));
const InvoicesPage = React.lazy(() => import('../../pages/InvoicesPage'));
const BlogsPage = React.lazy(() => import('../../pages/cms/BlogsPage'));
const GalleryPage = React.lazy(() => import('../../pages/cms/GalleryPage'));
const CatalogsPage = React.lazy(() => import('../../pages/cms/CatalogsPage'));
const FaqsPage = React.lazy(() => import('../../pages/cms/FaqsPage'));
const TestimonialsPage = React.lazy(() => import('../../pages/cms/TestimonialsPage'));

const renderPage = (view: AdminView) => {
  switch (view) {
    case 'dashboard': return <DashboardPage />;
    case 'products': return <ProductsPage />;
    case 'configurator-leads': return <ConfiguratorLeadsPage />;
    case 'quotations': return <QuotationsPage />;
    case 'leads': return <LeadsPage />;
    case 'projects': return <ProjectsPage />;
    case 'invoices': return <InvoicesPage />;
    case 'cms-blogs': return <BlogsPage />;
    case 'cms-gallery': return <GalleryPage />;
    case 'cms-catalogs': return <CatalogsPage />;
    case 'cms-faqs': return <FaqsPage />;
    case 'cms-testimonials': return <TestimonialsPage />;
    default: return <DashboardPage />;
  }
};

const AdminLayout: React.FC = () => {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader
          currentView={currentView}
          onMenuToggle={() => setSidebarOpen((o) => !o)}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pacific-600" />
              </div>
            }
          >
            {renderPage(currentView)}
          </React.Suspense>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
