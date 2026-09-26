import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  TrendingUp,
  Package,
  DollarSign,
  AlertTriangle,
  Ship,
  Mail,
  ArrowUpRight,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react';
import { exportApi } from '../../api/exportApi';
import type { ExportDashboardStats } from '../../types/admin';

export const ExportDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<ExportDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await exportApi.getDashboard();
      if (res.data.success && res.data.data) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load export dashboard stats', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      setSearching(true);
      const res = await exportApi.globalSearch(searchQuery);
      if (res.data.success) {
        setSearchResults(res.data.data);
      }
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-[#0f0e26] via-[#070714] to-[#0f0e26] p-4 sm:p-6 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#7FB706] to-[#B5F823] flex items-center justify-center text-[#030213] shadow-lg shadow-[#7FB706]/30">
            <Globe className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Export &amp; Global Trade Hub
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              International Trade Management, Customs, Logistics &amp; Forex Realization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#7FB706]' : ''}`} />
            <span>Sync Live</span>
          </button>

          <Link
            to="/admin/dashboard/export/orders"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#6fa005] hover:from-[#6fa005] hover:to-[#5d8704] text-[#030213] text-xs font-bold transition shadow-lg shadow-[#7FB706]/20 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Export Order</span>
          </Link>
        </div>
      </div>

      {/* Global Omni-Search */}
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Global Omni-Search: Search by Export Order #, Buyer, Vessel, B/L #, Container #, Seal #..."
          className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-3 pl-11 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition"
        />
        <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSearchResults(null);
            }}
            className="absolute right-3.5 top-3 text-xs text-gray-400 hover:text-white bg-white/10 px-2 py-1 rounded"
          >
            Clear
          </button>
        )}
      </form>

      {/* Search Results Dropdown/Box if any */}
      {searchResults && (
        <div className="bg-[#0f0e26] border border-[#7FB706]/30 rounded-xl p-4 space-y-4 shadow-2xl">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <span className="text-xs font-bold text-[#7FB706] uppercase tracking-wider">
              Omni-Search Results
            </span>
            <span className="text-xs text-gray-400">
              {searching ? 'Searching...' : 'Matched Entities'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="font-semibold text-gray-400 mb-1">Buyers ({searchResults.customers?.length || 0})</p>
              {searchResults.customers?.map((c: any) => (
                <Link
                  key={c.id}
                  to={`/admin/dashboard/export/customers`}
                  className="block p-2 bg-white/5 rounded-lg hover:bg-white/10 mb-1 text-white font-medium"
                >
                  {c.legalName}
                </Link>
              ))}
            </div>

            <div>
              <p className="font-semibold text-gray-400 mb-1">Export Orders ({searchResults.orders?.length || 0})</p>
              {searchResults.orders?.map((o: any) => (
                <Link
                  key={o.id}
                  to={`/admin/dashboard/export/orders`}
                  className="block p-2 bg-white/5 rounded-lg hover:bg-white/10 mb-1 text-white font-medium"
                >
                  {o.exportOrderNumber} — {o.party?.legalName}
                </Link>
              ))}
            </div>

            <div>
              <p className="font-semibold text-gray-400 mb-1">Shipments ({searchResults.shipments?.length || 0})</p>
              {searchResults.shipments?.map((s: any) => (
                <Link
                  key={s.id}
                  to={`/admin/dashboard/export/shipments`}
                  className="block p-2 bg-white/5 rounded-lg hover:bg-white/10 mb-1 text-white font-medium"
                >
                  {s.shipmentNumber} (BL: {s.blAwbNumber || 'Pending'})
                </Link>
              ))}
            </div>

            <div>
              <p className="font-semibold text-gray-400 mb-1">Containers ({searchResults.containers?.length || 0})</p>
              {searchResults.containers?.map((cnt: any) => (
                <Link
                  key={cnt.id}
                  to={`/admin/dashboard/export/shipments`}
                  className="block p-2 bg-white/5 rounded-lg hover:bg-white/10 mb-1 text-white font-medium"
                >
                  {cnt.containerNumber} (Seal: {cnt.sealNumber || 'N/A'})
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-[#0f0e26] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-gray-400 uppercase">Export Orders</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-white">
              {stats?.totalOrders || 0}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {stats?.activeOrders || 0} Active Shipments
            </div>
          </div>
        </div>

        <div className="bg-[#0f0e26] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-gray-400 uppercase">FOB Value (USD)</span>
            <span className="p-1.5 rounded-lg bg-[#7FB706]/10 text-[#7FB706]">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-[#7FB706]">
              ${Number(stats?.fobValueUsd || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              Total Export Revenue
            </div>
          </div>
        </div>

        <div className="bg-[#0f0e26] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-gray-400 uppercase">Realized Forex</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              ${Number(stats?.realizedAmountUsd || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              ₹{Number(stats?.realizedAmountInr || 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-[#0f0e26] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-gray-400 uppercase">In-Transit Cargo</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Ship className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-purple-400">
              {stats?.inTransitShipments || 0}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {stats?.totalContainers || 0} Containers Stuffed
            </div>
          </div>
        </div>

        <div className="bg-[#0f0e26] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-gray-400 uppercase">Export Markets</span>
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Globe className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-cyan-400">
              {stats?.countriesCount || 10}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              UAE, KSA, Qatar, Oman &amp; USA
            </div>
          </div>
        </div>

        <div className="bg-[#0f0e26] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-gray-400 uppercase">Pending SLA</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-amber-400">
              {stats?.pendingTasks || 0}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              Compliance &amp; Doc Actions
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Action Hub */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <Link
          to="/admin/dashboard/export/orders"
          className="p-3 bg-[#0f0e26] border border-white/10 hover:border-[#7FB706]/40 rounded-xl transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#7FB706]/10 text-[#7FB706] flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <Package className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-white">Orders 360</span>
          <span className="text-[10px] text-gray-400">Master Orders Hub</span>
        </Link>

        <Link
          to="/admin/dashboard/export/shipments"
          className="p-3 bg-[#0f0e26] border border-white/10 hover:border-[#7FB706]/40 rounded-xl transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <Ship className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-white">Shipments</span>
          <span className="text-[10px] text-gray-400">Containers &amp; B/L</span>
        </Link>

        <Link
          to="/admin/dashboard/export/customers"
          className="p-3 bg-[#0f0e26] border border-white/10 hover:border-[#7FB706]/40 rounded-xl transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <Globe className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-white">Buyers 360</span>
          <span className="text-[10px] text-gray-400">Overseas Parties</span>
        </Link>

        <Link
          to="/admin/dashboard/export/quotations"
          className="p-3 bg-[#0f0e26] border border-white/10 hover:border-[#7FB706]/40 rounded-xl transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-white">RFQs &amp; Quotes</span>
          <span className="text-[10px] text-gray-400">Multi-Currency</span>
        </Link>

        <Link
          to="/admin/dashboard/export/realizations"
          className="p-3 bg-[#0f0e26] border border-white/10 hover:border-[#7FB706]/40 rounded-xl transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <DollarSign className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-white">Bank &amp; eBRC</span>
          <span className="text-[10px] text-gray-400">Forex Realization</span>
        </Link>

        <Link
          to="/admin/dashboard/export/emails"
          className="p-3 bg-[#0f0e26] border border-white/10 hover:border-[#7FB706]/40 rounded-xl transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <Mail className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-white">Trade Email</span>
          <span className="text-[10px] text-gray-400">Dispatch &amp; Logs</span>
        </Link>
      </div>

      {/* Two Column Layout: Stage Pipeline & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: International Trade Workflow Stages */}
        <div className="lg:col-span-2 bg-[#0f0e26] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#7FB706]" />
              <span>International Trade Workflow Pipeline</span>
            </h2>
            <Link
              to="/admin/dashboard/export/orders"
              className="text-xs text-[#7FB706] hover:underline flex items-center gap-1 font-semibold"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { stage: 'ORDER_CONFIRMED', label: '1. Confirmed', color: 'border-blue-500/40 bg-blue-500/5' },
              { stage: 'ADVANCE_RECEIVED', label: '2. Advance Paid', color: 'border-emerald-500/40 bg-emerald-500/5' },
              { stage: 'IN_PRODUCTION', label: '3. Production', color: 'border-amber-500/40 bg-amber-500/5' },
              { stage: 'PACKED', label: '4. QC & Packed', color: 'border-indigo-500/40 bg-indigo-500/5' },
              { stage: 'CUSTOMS_CLEARED', label: '5. LEO Granted', color: 'border-cyan-500/40 bg-cyan-500/5' },
              { stage: 'ON_BOARD', label: '6. On Board', color: 'border-purple-500/40 bg-purple-500/5' },
              { stage: 'IN_TRANSIT', label: '7. In Transit', color: 'border-blue-400/40 bg-blue-400/5' },
              { stage: 'ARRIVED', label: '8. Port Arrival', color: 'border-teal-500/40 bg-teal-500/5' },
              { stage: 'REALIZED', label: '9. Forex Settled', color: 'border-[#7FB706]/40 bg-[#7FB706]/5' },
            ].map((item) => {
              const matched = stats?.ordersByStage?.find((s) => s.stage === item.stage);
              const count = matched?._count?.id || 0;
              const sum = Number(matched?._sum?.totalOrderValue || 0);

              return (
                <div key={item.stage} className={`p-3.5 rounded-xl border ${item.color} flex flex-col justify-between`}>
                  <div className="text-[11px] font-bold text-gray-300">{item.label}</div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-lg font-black text-white">{count}</span>
                    <span className="text-[10px] text-gray-400 font-mono">${sum.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Recent Forex Realizations & Emails */}
        <div className="space-y-6">
          {/* Recent Realizations */}
          <div className="bg-[#0f0e26] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Forex Realizations</span>
              </h2>
              <Link to="/admin/dashboard/export/realizations" className="text-xs text-[#7FB706] hover:underline font-semibold">
                Manage
              </Link>
            </div>

            {stats?.recentRealizations?.length === 0 ? (
              <p className="text-xs text-gray-500 py-3 text-center">No realizations recorded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {stats?.recentRealizations?.map((rz) => (
                  <div key={rz.id} className="p-2.5 bg-white/5 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-white">
                        {rz.exportOrder?.exportOrderNumber || 'EXP-ORD'}
                      </div>
                      <div className="text-[10px] text-gray-400">{rz.adBankName || 'AD Bank'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-400">${Number(rz.realizedAmount).toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400">{rz.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Outbound Emails */}
          <div className="bg-[#0f0e26] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-pink-400" />
                <span>Recent Outbound Emails</span>
              </h2>
              <Link to="/admin/dashboard/export/emails" className="text-xs text-[#7FB706] hover:underline font-semibold">
                Logs
              </Link>
            </div>

            {stats?.recentEmails?.length === 0 ? (
              <p className="text-xs text-gray-500 py-3 text-center">No trade emails sent yet.</p>
            ) : (
              <div className="space-y-2.5">
                {stats?.recentEmails?.map((em) => (
                  <div key={em.id} className="p-2.5 bg-white/5 rounded-xl flex justify-between items-center text-xs">
                    <div className="truncate pr-2 max-w-[180px]">
                      <div className="font-semibold text-white truncate">{em.subject}</div>
                      <div className="text-[10px] text-gray-400 truncate">{em.recipientEmail}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        em.status === 'SENT' || em.status === 'DELIVERED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {em.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportDashboardPage;
