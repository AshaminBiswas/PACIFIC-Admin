import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../api/services';
import type { DashboardStats } from '../types/admin';
import {
  Package, Users, FileText, Briefcase, Receipt, Cpu,
  TrendingUp, Clock, CheckCircle
} from 'lucide-react';

const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ComponentType<any>;
  color: string;
  sub?: string;
}> = ({ label, value, icon: Icon, color, sub }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
  </div>
);

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStats()
      .then(({ data }) => setStats(data.data ?? null))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-5 animate-pulse h-28 border border-gray-100" />
        ))}
      </div>
    );
  }

  if (!stats) return <div className="text-gray-500">Failed to load dashboard stats.</div>;

  const { overview, revenue, recentLeads } = stats;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={overview.totalProducts} icon={Package} color="bg-blue-500" />
        <StatCard label="Total Leads" value={overview.totalLeads} icon={Users} color="bg-green-500" sub={`${overview.newLeads} new`} />
        <StatCard label="Quotations" value={overview.totalQuotations} icon={FileText} color="bg-yellow-500" sub={`${overview.pendingQuotations} pending`} />
        <StatCard label="Projects" value={overview.totalProjects} icon={Briefcase} color="bg-purple-500" sub={`${overview.activeProjects} active`} />
        <StatCard label="Invoices" value={overview.totalInvoices} icon={Receipt} color="bg-red-500" sub={`${overview.paidInvoices} paid`} />
        <StatCard label="Configurator Leads" value={overview.configuratorDesigns} icon={Cpu} color="bg-pacific-600" />
        <StatCard label="Revenue (Paid)" value={formatCurrency(revenue.paid)} icon={TrendingUp} color="bg-emerald-600" />
        <StatCard label="Pending Revenue" value={formatCurrency(revenue.pending)} icon={Clock} color="bg-orange-500" />
      </div>

      {/* Recent Leads */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Leads</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {recentLeads.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No leads yet</div>
          ) : (
            recentLeads.map((lead) => (
              <div key={lead.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm text-gray-900">
                    {lead.firstName} {lead.lastName}
                  </div>
                  <div className="text-xs text-gray-400">{lead.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    lead.status === 'NEW' ? 'bg-blue-50 text-blue-700' :
                    lead.status === 'WON' ? 'bg-green-50 text-green-700' :
                    lead.status === 'LOST' ? 'bg-red-50 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {lead.status}
                  </span>
                  <span className="text-xs text-gray-400">{lead.source}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
