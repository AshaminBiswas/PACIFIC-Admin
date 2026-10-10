import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  Search,
  Plus,
  RefreshCw,
  Flame,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MessageCircle,
  Building2,
  MapPin,
  Layers,
  Lock,
  Columns,
  Sparkles,
  Filter,
  DollarSign,
  ChevronRight,
  ExternalLink,
  Trash2,
  Eye,
  Sliders,
  Send,
  Download,
  Calendar,
  ThumbsUp,
} from 'lucide-react';
import { leadManagementApi } from '../../api/leadManagementApi';
import type {
  Lead,
  LeadProductCategory,
  LeadStatus,
  LeadPriority,
  LeadSource,
} from '../../types/admin';
import CreateLeadModal from '../../components/crm/CreateLeadModal';
import GenerateQuotationFromLeadModal from '../../components/crm/GenerateQuotationFromLeadModal';
import LeadFollowupModal from '../../components/crm/LeadFollowupModal';
import LeadDetailDrawer from '../../components/crm/LeadDetailDrawer';

export default function LeadManagementPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  // Filters State
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [dueFilter, setDueFilter] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING'>('ALL');
  const [search, setSearch] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  // Fetch leads and aggregate stats
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [leadsRes, statsRes] = await Promise.all([
        leadManagementApi.list({
          category: categoryFilter,
          status: statusFilter,
          priority: priorityFilter,
          dueFilter,
          search,
          limit: 100,
        }),
        leadManagementApi.getStats(),
      ]);

      if (leadsRes.data?.items) {
        setLeads(leadsRes.data.items);
      }
      if (statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Failed to load lead management records:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, priorityFilter, dueFilter, search]);

  useEffect(() => {
    // Proactively purge any legacy mock data on mount
    leadManagementApi.purgeDummyLeads().finally(() => {
      loadData();
    });
  }, [loadData]);

  // Quick Status change from table
  const handleQuickStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await leadManagementApi.update(leadId, { status: newStatus });
      loadData();

      // If user marks as INTERESTED, automatically prompt quotation generator modal!
      if (newStatus === 'INTERESTED') {
        const lead = leads.find((l) => l.id === leadId);
        if (lead && !lead.quotationNumber) {
          setActiveLead(lead);
          setIsQuotationModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Delete lead
  const handleDelete = async (leadId: string, leadNum: string) => {
    if (!window.confirm(`Permanently delete lead ${leadNum}? This cannot be undone.`)) return;
    try {
      // Immediately remove from React state so UI updates instantly
      setLeads((prev) => prev.filter((l) => l.id !== leadId && l.leadNumber !== leadId && l.leadNumber !== leadNum));
      await leadManagementApi.delete(leadId);
      loadData();
    } catch (err) {
      alert('Failed to delete lead');
    }
  };

  // Clear all leads from local storage
  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to permanently clear all leads? This cannot be undone.')) return;
    try {
      setLeads([]);
      await leadManagementApi.clearAll();
      loadData();
    } catch (err) {
      alert('Failed to clear leads');
    }
  };

  // Export leads to CSV
  const handleExportCSV = () => {
    const headers = [
      'Lead Number',
      'Name',
      'Company',
      'Phone',
      'Email',
      'City',
      'Category',
      'Quantity',
      'Est Value',
      'Status',
      'Priority',
      'Quotation Number',
      'Quotation Amount',
      'Followup Count',
      'Next Followup',
    ];
    const rows = leads.map((l) => [
      l.leadNumber || '',
      `"${l.firstName} ${l.lastName || ''}"`,
      `"${l.company || ''}"`,
      l.phone || '',
      l.email || '',
      `"${l.city || ''}"`,
      l.productCategory || '',
      l.estimatedQuantity || 1,
      l.estimatedValue || 0,
      l.status || '',
      l.priority || '',
      l.quotationNumber || '',
      l.quotationAmount || '',
      l.followupCount || 0,
      l.nextFollowupDate ? new Date(l.nextFollowupDate).toLocaleDateString() : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pacific_commercial_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for Category Icons & Styling
  const getCategoryBadge = (cat?: LeadProductCategory) => {
    switch (cat) {
      case 'RESTROOM_CUBICLE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/30">
            <Layers className="w-3 h-3" /> Cubicle
          </span>
        );
      case 'LOCKER_SYSTEM':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Lock className="w-3 h-3" /> Locker
          </span>
        );
      case 'URINAL_PARTITION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Columns className="w-3 h-3" /> Urinal
          </span>
        );
      case 'COMBO_WASHROOM':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Sparkles className="w-3 h-3" /> Combo
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-gray-300">
            {cat}
          </span>
        );
    }
  };

  // Priority Badge
  const getPriorityBadge = (p?: LeadPriority) => {
    switch (p) {
      case 'HOT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Flame className="w-3 h-3" /> HOT
          </span>
        );
      case 'WARM':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            ⚡ WARM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            ❄️ COLD
          </span>
        );
    }
  };

  // Follow-up status helper
  const getFollowupDueBadge = (dueDate?: string) => {
    if (!dueDate) {
      return <span className="text-[11px] text-gray-500">Not scheduled</span>;
    }
    const dueTime = new Date(dueDate).getTime();
    const now = Date.now();
    const diffHours = Math.round((dueTime - now) / (3600 * 1000));

    if (diffHours < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
          <Clock className="w-3 h-3" /> Overdue {Math.abs(diffHours)}h
        </span>
      );
    }
    if (diffHours <= 24) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Clock className="w-3 h-3" /> Due in {diffHours}h
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-gray-300">
        <Calendar className="w-3 h-3" /> {new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/30">
              <Target className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#7FB706]">
              Commercial Sales CRM
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Leads & Opportunity Management
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Restroom Cubicles, Locker Systems & Urinal Partitions Pipeline • Direct Quotation Linkage
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {leads.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition flex items-center gap-1.5 min-h-[44px]"
              title="Permanently remove all current leads"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition flex items-center gap-1.5 min-h-[44px]"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#7FB706]' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/admin/dashboard/crm-leads/create')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-[#7FB706] to-[#B5F823] hover:from-[#8ecb08] hover:to-[#c4fa3f] transition shadow-lg shadow-[#7FB706]/20 flex items-center gap-1.5 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            New Commercial Lead
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
          <span className="text-[11px] font-medium text-gray-400">Total Inquiries</span>
          <p className="text-xl font-mono font-bold text-white">{stats?.total || leads.length}</p>
          <span className="text-[10px] text-gray-500 block">All categories</span>
        </div>

        <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1">
          <span className="text-[11px] font-medium text-rose-400 flex items-center gap-1">
            <Flame className="w-3 h-3" /> Hot Leads
          </span>
          <p className="text-xl font-mono font-bold text-white">{stats?.hotCount || 0}</p>
          <span className="text-[10px] text-rose-400/70 block">Immediate closing</span>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
          <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Interested Leads
          </span>
          <p className="text-xl font-mono font-bold text-white">{stats?.interestedCount || 0}</p>
          <span className="text-[10px] text-emerald-400/70 block">Ready for quotation</span>
        </div>

        <div className="p-3.5 rounded-xl bg-sky-500/5 border border-sky-500/20 space-y-1">
          <span className="text-[11px] font-medium text-sky-400 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Quotes Dispatched
          </span>
          <p className="text-xl font-mono font-bold text-white">{stats?.quotedCount || 0}</p>
          <span className="text-[10px] text-sky-400/70 block">Linked to PPS/D</span>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
          <span className="text-[11px] font-medium text-amber-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Overdue Follow-ups
          </span>
          <p className="text-xl font-mono font-bold text-white">{stats?.overdueFollowups || 0}</p>
          <span className="text-[10px] text-amber-400/70 block">Requires touchpoint</span>
        </div>

        <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-1">
          <span className="text-[11px] font-medium text-purple-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Won Projects
          </span>
          <p className="text-xl font-mono font-bold text-white">
            ₹{((stats?.wonValue || 0) / 100000).toFixed(1)}L
          </p>
          <span className="text-[10px] text-purple-400/70 block">{stats?.wonCount || 0} orders converted</span>
        </div>
      </div>

      {/* Product Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/10 text-xs">
        {[
          { id: 'ALL', label: 'All Products', count: leads.length },
          { id: 'RESTROOM_CUBICLE', label: 'Toilet Cubicles', count: stats?.byCategory?.cubicle },
          { id: 'LOCKER_SYSTEM', label: 'Locker Systems', count: stats?.byCategory?.locker },
          { id: 'URINAL_PARTITION', label: 'Urinal Partitions', count: stats?.byCategory?.urinal },
          { id: 'COMBO_WASHROOM', label: 'Washroom Combo', count: stats?.byCategory?.combo },
        ].map((tab) => {
          const isActive = categoryFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl font-semibold transition whitespace-nowrap flex items-center gap-2 min-h-[40px] ${
                isActive
                  ? 'bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/40 shadow-md shadow-[#7FB706]/10 font-bold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive ? 'bg-[#7FB706] text-black font-extrabold' : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#121029] border border-white/10 rounded-2xl">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prospect name, company, phone, quotation ref, city..."
            className="w-full pl-9 pr-3.5 py-2.5 bg-[#0d0b21] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-[#0d0b21] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New Enquiry</option>
            <option value="CONTACTED">Contacted</option>
            <option value="REQUIREMENT_GATHERED">Requirement Gathered</option>
            <option value="INTERESTED">⭐ Interested</option>
            <option value="QUOTATION_SENT">📄 Quotation Sent</option>
            <option value="NEGOTIATING">Negotiating</option>
            <option value="WON">🏆 Won / Order Placed</option>
            <option value="LOST">Lost / Dropped</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-[#0d0b21] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="HOT">🔥 HOT</option>
            <option value="WARM">⚡ WARM</option>
            <option value="COLD">❄️ COLD</option>
          </select>

          {/* Due Filter */}
          <select
            value={dueFilter}
            onChange={(e) => setDueFilter(e.target.value as any)}
            className="px-3 py-2.5 bg-[#0d0b21] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
          >
            <option value="ALL">All Follow-ups</option>
            <option value="OVERDUE">⚠️ Overdue Only</option>
            <option value="TODAY">📅 Due Today</option>
            <option value="UPCOMING">Upcoming</option>
          </select>
        </div>
      </div>

      {/* Mobile-Responsive Card List (Visible on Mobile screens < md) */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="py-12 text-center text-gray-400 p-6 rounded-2xl bg-[#121029] border border-white/5">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#7FB706]" />
            Loading commercial leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl bg-[#121029] border border-white/10 space-y-3">
            <Target className="w-8 h-8 text-[#7FB706] mx-auto" />
            <p className="text-sm font-bold text-white">No Commercial Leads Found</p>
            <p className="text-xs text-gray-400">All mock dummy leads have been removed.</p>
            <button
              onClick={() => navigate('/admin/dashboard/crm-leads/create')}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-[#7FB706] to-[#B5F823] transition inline-flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/20 min-h-[44px]"
            >
              <Plus className="w-4 h-4" /> Create First Lead
            </button>
          </div>
        ) : (
          leads.map((l) => {
            const cleanPhone = (l.phone || '').replace(/\D/g, '');
            const whatsAppPhone = cleanPhone.startsWith('91') ? cleanPhone : cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
            const waUrl = `https://wa.me/${whatsAppPhone}?text=${encodeURIComponent(
              `Hello ${l.firstName}, this is regarding your ${l.productCategory?.replace('_', ' ')} enquiry.`
            )}`;

            return (
              <div
                key={l.id}
                onClick={() => navigate(`/admin/dashboard/crm-leads/${l.id}`)}
                className="p-4 rounded-2xl bg-[#121029] border border-white/10 hover:border-[#7FB706]/40 transition space-y-3 cursor-pointer shadow-lg active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm hover:text-[#7FB706]">
                      {l.leadNumber}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getCategoryBadge(l.productCategory)}
                    {getPriorityBadge(l.priority)}
                  </div>
                </div>

                <div>
                  <div className="font-bold text-white text-base">
                    {l.firstName} {l.lastName || ''}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-gray-500" />
                    <span>{l.company || 'Direct Client'}</span>
                    {l.city && <span>• {l.city}</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0d0b21] border border-white/5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Requirement</span>
                    <span className="font-bold text-white font-mono">{l.estimatedQuantity || 1} Units</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Est. Sizing</span>
                    <span className="font-mono font-bold text-[#7FB706]">
                      ₹{Number(l.estimatedValue || l.quotationAmount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={l.status}
                    onChange={(e) => handleQuickStatusChange(l.id, e.target.value as LeadStatus)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#0d0b21] border border-white/10 text-white focus:outline-none focus:border-[#7FB706] min-h-[38px]"
                  >
                    <option value="NEW">🆕 New</option>
                    <option value="CONTACTED">📞 Contacted</option>
                    <option value="REQUIREMENT_GATHERED">📐 Requirements</option>
                    <option value="INTERESTED">⭐ Interested</option>
                    <option value="QUOTATION_SENT">📄 Quote Sent</option>
                    <option value="NEGOTIATING">🤝 Negotiating</option>
                    <option value="WON">🏆 Won</option>
                    <option value="LOST">❌ Lost</option>
                  </select>

                  <div>{getFollowupDueBadge(l.nextFollowupDate)}</div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    {l.phone && (
                      <a
                        href={`tel:${l.phone}`}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold flex items-center gap-1 min-h-[36px]"
                      >
                        <Phone className="w-3.5 h-3.5 text-gray-400" /> Call
                      </a>
                    )}
                    {cleanPhone && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-xs font-semibold flex items-center gap-1 min-h-[36px]"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WA
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => navigate(`/admin/dashboard/crm-leads/${l.id}`)}
                      className="px-3 py-1.5 rounded-lg bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] text-xs font-bold flex items-center gap-1 min-h-[36px]"
                    >
                      <Eye className="w-3.5 h-3.5" /> Open
                    </button>
                    <button
                      onClick={() => handleDelete(l.id, l.leadNumber || l.id)}
                      className="p-2 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Main Leads Table (Desktop screens >= md) */}
      <div className="hidden md:block bg-[#121029] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-gray-400 font-semibold tracking-wider uppercase text-[10px]">
                <th className="py-3 px-4">Ref & Date</th>
                <th className="py-3 px-4">Prospect & Company</th>
                <th className="py-3 px-4">Product Requirement</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Pipeline Status</th>
                <th className="py-3 px-4">Linked Quotation</th>
                <th className="py-3 px-4">Next Follow-Up</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#7FB706]" />
                    Loading commercial lead pipeline...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-500">
                        <Target className="w-6 h-6 text-[#7FB706]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">No Commercial Leads Found</p>
                        <p className="text-xs text-gray-400 mt-1">
                          All mock dummy leads have been removed. Click &quot;New Commercial Lead&quot; to record a new client enquiry for Cubicles, Lockers, or Urinal Partitions.
                        </p>
                      </div>
                      <button
                        onClick={() => navigate('/admin/dashboard/crm-leads/create')}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-[#7FB706] to-[#B5F823] hover:from-[#8ecb08] hover:to-[#c4fa3f] transition inline-flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/20 min-h-[44px]"
                      >
                        <Plus className="w-4 h-4" />
                        Create First Lead
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((l) => {
                  const isInterested = l.status === 'INTERESTED';
                  const hasQuotation = Boolean(l.quotationNumber);

                  return (
                    <tr
                      key={l.id}
                      className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                      onClick={() => navigate(`/admin/dashboard/crm-leads/${l.id}`)}
                    >
                      {/* Ref & Date */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-white group-hover:text-[#7FB706] transition">
                          {l.leadNumber}
                        </span>
                        <span className="text-[10px] text-gray-500 block">
                          {new Date(l.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </td>

                      {/* Prospect & Company */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="font-semibold text-white">
                          {l.firstName} {l.lastName || ''}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate max-w-[180px]">
                          {l.company || 'Direct Client'}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                          {l.phone && <span>{l.phone}</span>}
                          {l.city && <span>• {l.city}</span>}
                        </div>
                      </td>

                      {/* Product Requirement */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          {getCategoryBadge(l.productCategory)}
                          <span className="text-[11px] font-bold text-white font-mono">
                            {l.estimatedQuantity} Units
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 truncate max-w-[200px]">
                          {l.cubicleSpecs
                            ? `${l.cubicleSpecs.boardThickness} ${l.cubicleSpecs.boardType} (${l.cubicleSpecs.hardwarePackage})`
                            : l.lockerSpecs
                            ? `${l.lockerSpecs.lockerTiers} (${l.lockerSpecs.lockType})`
                            : l.urinalSpecs
                            ? `${l.urinalSpecs.screenDimensions} (${l.urinalSpecs.mountingType})`
                            : 'Custom washroom package'}
                        </div>
                        <div className="text-[11px] font-mono font-bold text-emerald-400 mt-0.5">
                          ₹{Number(l.estimatedValue || l.quotationAmount || 0).toLocaleString('en-IN')}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4">{getPriorityBadge(l.priority)}</td>

                      {/* Status Dropdown */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={l.status}
                          onChange={(e) => handleQuickStatusChange(l.id, e.target.value as LeadStatus)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border focus:outline-none ${
                            l.status === 'INTERESTED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : l.status === 'QUOTATION_SENT'
                              ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                              : l.status === 'WON'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                              : l.status === 'LOST'
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-white/5 text-gray-300 border-white/10'
                          }`}
                        >
                          <option value="NEW">NEW</option>
                          <option value="CONTACTED">CONTACTED</option>
                          <option value="REQUIREMENT_GATHERED">REQUIREMENT_GATHERED</option>
                          <option value="INTERESTED">⭐ INTERESTED</option>
                          <option value="QUOTATION_SENT">📄 QUOTATION_SENT</option>
                          <option value="NEGOTIATING">NEGOTIATING</option>
                          <option value="WON">🏆 WON</option>
                          <option value="LOST">LOST</option>
                        </select>
                      </td>

                      {/* Linked Quotation */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        {hasQuotation ? (
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 inline-block">
                              {l.quotationNumber}
                            </span>
                            <div className="text-[10px] text-gray-400">
                              ₹{Number(l.quotationAmount || 0).toLocaleString('en-IN')} • {l.quotationStatus || 'SENT'}
                            </div>
                          </div>
                        ) : isInterested ? (
                          <button
                            onClick={() => {
                              setActiveLead(l);
                              setIsQuotationModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-black bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 transition shadow-md shadow-emerald-500/20 flex items-center gap-1 animate-pulse"
                          >
                            <Sparkles className="w-3 h-3" />
                            Send Quote
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveLead(l);
                              setIsQuotationModalOpen(true);
                            }}
                            className="text-[11px] font-medium text-gray-400 hover:text-white underline"
                          >
                            + Link Quote
                          </button>
                        )}
                      </td>

                      {/* Next Followup */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div>{getFollowupDueBadge(l.nextFollowupDate)}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {l.followupCount || 0} touchpoints logged
                        </div>
                      </td>

                      {/* Action Triggers */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setActiveLead(l);
                              setIsFollowupModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-sky-400 hover:bg-sky-500/10 transition"
                            title="Log Follow-up"
                          >
                            <Clock className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setActiveLead(l);
                              setIsQuotationModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition"
                            title="Quotation Actions"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => navigate(`/admin/dashboard/crm-leads/${l.id}`)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#7FB706] hover:bg-[#7FB706]/10 transition"
                            title="Open Lead Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(l.id, l.leadNumber || l.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals & Slide-over Drawer */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadData}
      />

      <GenerateQuotationFromLeadModal
        isOpen={isQuotationModalOpen}
        onClose={() => {
          setIsQuotationModalOpen(false);
          setActiveLead(null);
        }}
        onSuccess={loadData}
        lead={activeLead}
      />

      <LeadFollowupModal
        isOpen={isFollowupModalOpen}
        onClose={() => {
          setIsFollowupModalOpen(false);
          setActiveLead(null);
        }}
        onSuccess={loadData}
        lead={activeLead}
      />

      <LeadDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setActiveLead(null);
        }}
        lead={activeLead}
        onOpenFollowupModal={() => {
          setIsDetailDrawerOpen(false);
          setIsFollowupModalOpen(true);
        }}
        onOpenQuotationModal={() => {
          setIsDetailDrawerOpen(false);
          setIsQuotationModalOpen(true);
        }}
      />
    </div>
  );
}
