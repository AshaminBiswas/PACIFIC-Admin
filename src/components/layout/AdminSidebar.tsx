import React from 'react';
import {
  LayoutDashboard, Package, Settings, FileText, Users,
  Briefcase, Receipt, BookOpen, Image, BookMarked,
  HelpCircle, Star, Cpu, X, ChevronRight
} from 'lucide-react';
import type { AdminView } from '../../types/admin';

interface NavItem {
  id: AdminView;
  label: string;
  icon: React.ComponentType<any>;
  group: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Main' },
  { id: 'products', label: 'Products', icon: Package, group: 'Catalog' },
  { id: 'configurator-leads', label: 'Configurator Leads', icon: Cpu, group: 'Sales' },
  { id: 'quotations', label: 'Quotations', icon: FileText, group: 'Sales' },
  { id: 'leads', label: 'Leads', icon: Users, group: 'Sales' },
  { id: 'projects', label: 'Projects', icon: Briefcase, group: 'Sales' },
  { id: 'invoices', label: 'Invoices', icon: Receipt, group: 'Finance' },
  { id: 'cms-blogs', label: 'Blogs', icon: BookOpen, group: 'CMS' },
  { id: 'cms-gallery', label: 'Gallery', icon: Image, group: 'CMS' },
  { id: 'cms-catalogs', label: 'Catalogs', icon: BookMarked, group: 'CMS' },
  { id: 'cms-faqs', label: 'FAQs', icon: HelpCircle, group: 'CMS' },
  { id: 'cms-testimonials', label: 'Testimonials', icon: Star, group: 'CMS' },
];

interface Props {
  currentView: AdminView;
  onNavigate: (view: AdminView) => void;
  isOpen: boolean;
  onClose: () => void;
}

const AdminSidebar: React.FC<Props> = ({ currentView, onNavigate, isOpen, onClose }) => {
  const groups = [...new Set(ALL_NAV_ITEMS.map((i) => i.group))];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-white border-r border-gray-200
          flex flex-col transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="text-sm font-bold text-pacific-700 uppercase tracking-wider">Pacific</div>
            <div className="text-xs text-gray-500">Restroom Cubicle</div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {groups.map((group) => (
            <div key={group} className="mb-4">
              <p className="px-2 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {group}
              </p>
              {ALL_NAV_ITEMS.filter((i) => i.group === group).map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { onNavigate(item.id); onClose(); }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5
                      text-sm font-medium transition-colors
                      ${isActive
                        ? 'bg-pacific-50 text-pacific-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon size={16} className={isActive ? 'text-pacific-600' : ''} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isActive && <ChevronRight size={14} className="text-pacific-400" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-3 border-t border-gray-100">
          <button
            onClick={() => onNavigate('settings' as AdminView)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            <Settings size={16} />
            Settings
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
