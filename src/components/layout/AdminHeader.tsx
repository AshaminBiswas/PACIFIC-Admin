import React from 'react';
import { Menu, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { AdminView } from '../../types/admin';

const VIEW_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  'product-categories': 'Product Categories',
  'configurator-leads': 'Configurator Leads',
  quotations: 'Quotations',
  leads: 'Leads',
  projects: 'Commercial Projects',
  invoices: 'Invoices',
  'cms-blogs': 'Blog Posts',
  'cms-gallery': 'Gallery',
  'cms-hero-slides': 'Hero Slides',
  'cms-catalogs': 'Catalogs',
  'cms-faqs': 'FAQs',
  'cms-testimonials': 'Testimonials',
  settings: 'Settings',
};

interface Props {
  currentView: AdminView;
  onMenuToggle: () => void;
}

const AdminHeader: React.FC<Props> = ({ currentView, onMenuToggle }) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu size={20} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">
          {VIEW_TITLES[currentView] || 'Dashboard'}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-7 h-7 rounded-full bg-pacific-100 flex items-center justify-center">
            <User size={14} className="text-pacific-700" />
          </div>
          <span className="hidden sm:block font-medium">
            {user?.firstName} {user?.lastName}
          </span>
          <span className="hidden sm:block text-xs text-gray-400">
            ({user?.role})
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          <LogOut size={14} />
          <span className="hidden sm:block">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;
