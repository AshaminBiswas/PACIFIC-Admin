import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Search, Plus, Filter, CheckCircle2,
  Clock, Eye, ChevronRight, X, RefreshCw,
  Edit, Trash2, Calendar, Building2
} from 'lucide-react';
import { salesOrdersApi } from '../api/services';
import { useAdminAuth } from '../context/AdminAuthContext';
import type { SalesOrder } from '../types/admin';
import { isKolkataBranch, filterByBranch } from '../utils/branchHelper';

export default function SalesOrdersPage() {
  const navigate = useNavigate();
  const { user } = useAdminAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [branchFilter, setBranchFilter] = useState<'ALL' | 'MAIN' | 'KOLKATA'>('ALL');

  const renderFollowupBadge = (o: SalesOrder) => {
    if (o.status === 'FULLY_DISPATCHED') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Fulfilled & Dispatched
        </span>
      );
    }
    if (!o.nextFollowupDate) {
      return (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">
          Pending Setup
        </span>
      );
    }
    const diffMin = Math.round((new Date(o.nextFollowupDate).getTime() - Date.now()) / (60 * 1000));
    if (diffMin < 0) {
      const hours = Math.abs(Math.round(diffMin / 60));
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
          Overdue {hours > 0 ? `${hours}h` : `${Math.abs(diffMin)}m`}
        </span>
      );
    }
    if (diffMin <= 180) {
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          Due in {hours > 0 ? `${hours}h ` : ''}{mins}m
        </span>
      );
    }
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
        <Calendar className="w-2.5 h-2.5" />
        {new Date(o.nextFollowupDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </span>
    );
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'FULLY_DISPATCHED':
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'PARTIALLY_DISPATCHED':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'IN_PRODUCTION':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'APPROVED':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'WAITING_FOR_ADVANCE':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'PENDING':
      case 'PENDING_APPROVAL':
      case 'DRAFT':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'CANCELLED':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default:
        return 'bg-white/5 text-gray-300 border border-white/10';
    }
  };

  const formatStatusLabel = (status: string) => {
    if (status === 'PENDING_APPROVAL') return 'PENDING';
    return status.replace(/_/g, ' ');
  };
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Edit State
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [editOrderForm, setEditOrderForm] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Global Cross-Document Search Results
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<any | null>(null);
  const [searchingGlobal, setSearchingGlobal] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15, search };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (branchFilter !== 'ALL') params.branch = branchFilter;
      const res = await salesOrdersApi.list(params);
      if (res.data?.data) {
        setOrders(res.data.data.items || []);
        setTotalPages(res.data.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load sales orders:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, branchFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const displayedOrders = filterByBranch(orders, branchFilter);

  // Global Cross-Document Search
  const handleGlobalSearch = async () => {
    if (!globalQuery.trim()) return;
    setSearchingGlobal(true);
    try {
      const res = await salesOrdersApi.globalSearch(globalQuery.trim());
      if (res.data?.data) {
        setGlobalResults(res.data.data);
      }
    } catch (err) {
      console.error('Global search failed:', err);
    } finally {
      setSearchingGlobal(false);
    }
  };

  // Approve Order
  const handleApproveOrder = async (orderId: string) => {
    if (!confirm('Approve this Sales Order for manufacturing & dispatch scheduling?')) return;
    try {
      await salesOrdersApi.approve(orderId);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Approval failed');
    }
  };

  const handleStartEditOrder = (order: SalesOrder) => {
    setEditingOrder(order);
    setEditOrderForm({
      siteName: order.siteName || '',
      siteAddress: order.siteAddress || '',
      clientPoNumber: order.clientPoNumber || '',
      clientPoDate: order.clientPoDate ? new Date(order.clientPoDate).toISOString().split('T')[0] : '',
      notes: order.notes || '',
      termsAndConditions: order.termsAndConditions || '',
      items: order.items ? order.items.map((it: any) => ({
        id: it.id,
        productId: it.productId,
        description: it.description,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
      })) : [],
    });
  };

  const handleSaveOrderEdit = async () => {
    if (!editingOrder) return;
    setSavingEdit(true);
    try {
      await salesOrdersApi.update(editingOrder.id, editOrderForm);
      setEditingOrder(null);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update order');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteOrder = async (orderId: string, num: string) => {
    if (!confirm(`Are you sure you want to permanently delete Sales Order ${num}? This action cannot be undone.`)) return;
    try {
      await salesOrdersApi.delete(orderId);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete order');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#7FB706]/10 text-[#7FB706]">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Central Sales Order Hub</h1>
              <p className="text-xs sm:text-sm text-gray-400">
                End-to-end order orchestration, partial dispatch reconciliation & cross-document flow tracking
              </p>
            </div>
          </div>
        </div>

        <Link
          to="/admin/dashboard/sales-orders/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Create Direct Order
        </Link>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-3 sm:p-4">
          <div className="text-[11px] sm:text-xs text-gray-400">Total Active Orders</div>
          <div className="text-xl sm:text-2xl font-bold text-white mt-0.5 sm:mt-1">{orders.length}</div>
          <div className="text-[10px] sm:text-[11px] text-[#7FB706] mt-0.5 sm:mt-1 font-mono">PPS/ORD/2026-27/...</div>
        </div>
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-3 sm:p-4">
          <div className="text-[11px] sm:text-xs text-gray-400">Pending Approval</div>
          <div className="text-xl sm:text-2xl font-bold text-amber-400 mt-0.5 sm:mt-1">
            {orders.filter((o) => o.status === 'PENDING' || o.status === 'PENDING_APPROVAL' || o.status === 'WAITING_FOR_ADVANCE').length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5 sm:mt-1">Awaiting advance / sign-off</div>
        </div>
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-3 sm:p-4">
          <div className="text-[11px] sm:text-xs text-gray-400">Partially Dispatched</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-400 mt-0.5 sm:mt-1">
            {orders.filter((o) => o.status === 'PARTIALLY_DISPATCHED').length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-blue-500/80 mt-0.5 sm:mt-1">Balance pending in plant</div>
        </div>
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-3 sm:p-4">
          <div className="text-[11px] sm:text-xs text-gray-400">Fully Dispatched</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-0.5 sm:mt-1">
            {orders.filter((o) => o.status === 'FULLY_DISPATCHED').length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-emerald-500/80 mt-0.5 sm:mt-1">Fulfillment completed</div>
        </div>
      </div>

      {/* Cross-Document Universal Global Search Bar */}
      <div className="bg-[#121226] border border-[#7FB706]/20 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Search className="w-4 h-4 text-[#7FB706]" /> Universal Document Search
          </span>
          <span className="text-[11px] text-gray-500">
            Search across Quotations, Orders, PIs, Packing Lists & Hardware Issues
          </span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search reference (e.g. PPS/D/26-27/817, PPS/ORD/..., PI-..., PPS/PL/..., PPS/HIL/...)..."
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
            />
          </div>
          <button
            onClick={handleGlobalSearch}
            disabled={searchingGlobal}
            className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold rounded-xl min-h-[44px] flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {searchingGlobal ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Global Search
          </button>
        </div>

        {/* Global Search Results Popup */}
        {globalResults && (
          <div className="p-3 bg-[#0a0a1a] border border-white/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
              <span>Matching Documents ({Object.values(globalResults).flat().length} items found)</span>
              <button
                onClick={() => setGlobalResults(null)}
                className="text-gray-400 hover:text-white text-xs"
              >
                Clear
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {globalResults.orders?.map((o: any) => (
                <div key={o.id} className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">ORDER</span>
                  <div className="font-mono font-semibold text-white">{o.orderNumber}</div>
                  <div className="text-gray-400 truncate">{o.customer?.legalName}</div>
                </div>
              ))}

              {globalResults.quotations?.map((q: any) => (
                <div key={q.id} className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">QUOTATION</span>
                  <div className="font-mono font-semibold text-white">{q.quotationNumber}</div>
                  <div className="text-gray-400 truncate">{q.customer?.legalName}</div>
                </div>
              ))}

              {globalResults.packingLists?.map((pl: any) => (
                <div key={pl.id} className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">PACKING LIST</span>
                  <div className="font-mono font-semibold text-white">{pl.packingListNumber}</div>
                  <div className="text-gray-400 truncate">{pl.shipToName}</div>
                </div>
              ))}

              {globalResults.hardwareIssues?.map((hi: any) => (
                <div key={hi.id} className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">HARDWARE ISSUE</span>
                  <div className="font-mono font-semibold text-white">{hi.issueNumber}</div>
                  <div className="text-gray-400 truncate">{hi.buyerName}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Orders Filter Tabs */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter orders by order number, customer, PO number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
          />
        </div>

        {/* Branch Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#0a0a1a] p-1 rounded-xl border border-white/10 shrink-0 overflow-x-auto">
          <Building2 className="w-3.5 h-3.5 text-gray-500 ml-1.5 hidden sm:block shrink-0" />
          {[
            { id: 'ALL', label: 'All Branches' },
            { id: 'MAIN', label: 'Main (Delhi)' },
            { id: 'KOLKATA', label: 'Kolkata' },
          ].map((b) => (
            <button
              key={b.id}
              onClick={() => {
                setBranchFilter(b.id as any);
                setPage(1);
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap min-h-[36px] ${
                branchFilter === b.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'WAITING_FOR_ADVANCE', label: 'Waiting Advance' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'IN_PRODUCTION', label: 'In Production' },
            { id: 'PARTIALLY_DISPATCHED', label: 'Partially Dispatched' },
            { id: 'FULLY_DISPATCHED', label: 'Dispatched' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap min-h-[44px] ${
                statusFilter === tab.id
                  ? 'bg-[#7FB706] text-white shadow-md shadow-[#7FB706]/20'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => fetchOrders()}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Orders List: Desktop Table vs Mobile Card */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading sales orders...</div>
        ) : displayedOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-2">
            <ShoppingBag className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm">No sales orders found matching criteria</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-[#0a0a1a] text-xs uppercase text-gray-500 border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4 text-center w-12">#</th>
                    <th className="py-3 px-4">Order Number</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Grand Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Follow-Up</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayedOrders.map((o, idx) => (
                    <tr
                      key={o.id}
                      onClick={() => navigate(`/admin/dashboard/sales-orders/${o.id}`)}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 text-center font-mono text-gray-400 text-xs">
                        {(page - 1) * 15 + idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-white group-hover:text-[#7FB706] transition-colors flex items-center gap-1.5 flex-wrap">
                          <span>{o.orderNumber}</span>
                          {isKolkataBranch(o) ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Kolkata
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-white/5 text-gray-400">
                              Main
                            </span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {o.clientPoNumber && (
                          <div className="text-[11px] text-gray-500">PO: {o.clientPoNumber}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{o.customer?.legalName || 'N/A'}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-300 font-medium whitespace-nowrap">
                        {new Date(o.orderDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#7FB706] whitespace-nowrap">
                        ₹ {Number(o.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${getStatusBadgeClass(o.status)}`}
                        >
                          {formatStatusLabel(o.status)}
                        </span>
                      </td>
                      <td
                        className="py-3 px-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/dashboard/sales-orders/${o.id}/follow-up`);
                        }}
                      >
                        <div className="flex flex-col gap-1 cursor-pointer">
                          {renderFollowupBadge(o)}
                          {o.followupStatus && o.followupStatus !== 'PENDING' && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              {o.followupStatus.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* View Order Detail 360 */}
                          <button
                            onClick={() => navigate(`/admin/dashboard/sales-orders/${o.id}`)}
                            className="p-2 rounded-lg bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                            title="View Order 360 Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {(o.status === 'PENDING' || o.status === 'PENDING_APPROVAL') && (
                            <button
                              onClick={() => handleApproveOrder(o.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-semibold text-xs cursor-pointer flex items-center gap-1 min-h-[36px]"
                              title="Approve Order"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                          )}

                          <button
                            onClick={() => handleStartEditOrder(o)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                            title="Edit Sales Order"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteOrder(o.id, o.orderNumber)}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                            title="Delete Sales Order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< md) */}
            <div className="md:hidden divide-y divide-white/5">
              {displayedOrders.map((o, idx) => (
                <div
                  key={o.id}
                  onClick={() => navigate(`/admin/dashboard/sales-orders/${o.id}`)}
                  className="p-3 sm:p-3.5 space-y-2.5 hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono font-bold text-white text-sm flex items-center gap-1.5 hover:text-[#7FB706] flex-wrap">
                        <span className="text-gray-500 font-mono text-xs">#{(page - 1) * 15 + idx + 1}</span>
                        <span className="truncate">{o.orderNumber}</span>
                        {isKolkataBranch(o) ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Kolkata
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-white/5 text-gray-400">
                            Main
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      </div>
                      <div className="text-xs text-gray-300 font-medium truncate mt-0.5">
                        {o.customer?.legalName || 'N/A'}
                      </div>
                      {o.clientPoNumber && (
                        <div className="text-[11px] text-gray-500">PO: {o.clientPoNumber}</div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadgeClass(o.status)}`}>
                        {formatStatusLabel(o.status)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div>{new Date(o.orderDate).toLocaleDateString('en-GB')}</div>
                    <div className="text-sm font-bold text-[#7FB706]">
                      ₹ {Number(o.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Follow-up Status Strip */}
                  <div
                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/dashboard/sales-orders/${o.id}/follow-up`);
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-gray-400 font-medium">Follow-Up:</span>
                      {renderFollowupBadge(o)}
                    </div>
                    {o.followupCount !== undefined && o.followupCount > 0 && (
                      <span className="text-[10px] text-cyan-400 font-medium">
                        {o.followupCount} {o.followupCount === 1 ? 'touchpoint' : 'touchpoints'}
                      </span>
                    )}
                  </div>

                  {/* Compact Action Buttons */}
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/dashboard/sales-orders/${o.id}`);
                      }}
                      className="flex-1 min-h-[34px] py-1.5 px-2 flex items-center justify-center gap-1 text-xs font-semibold bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] border border-[#7FB706]/30 rounded-lg transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    {(o.status === 'PENDING' || o.status === 'PENDING_APPROVAL') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveOrder(o.id);
                        }}
                        className="flex-1 min-h-[34px] py-1.5 px-2 flex items-center justify-center gap-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg cursor-pointer transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEditOrder(o);
                      }}
                      className="flex-1 min-h-[34px] py-1.5 px-2 flex items-center justify-center gap-1 text-xs font-semibold bg-white/5 hover:bg-white/10 text-amber-300 rounded-lg cursor-pointer transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOrder(o.id, o.orderNumber);
                      }}
                      className="flex-1 min-h-[34px] py-1.5 px-2 flex items-center justify-center gap-1 text-xs font-semibold bg-red-500/10 text-red-400 rounded-lg cursor-pointer transition-colors"
                      title="Delete Sales Order"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Order Modal */}
      {editingOrder && editOrderForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0a0a1a]">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#7FB706]" />
                <span className="font-mono font-bold text-white">
                  Edit Sales Order {editingOrder.orderNumber}
                </span>
              </div>
              <button onClick={() => setEditingOrder(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Site Name</label>
                  <input
                    type="text"
                    value={editOrderForm.siteName}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, siteName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Client PO Number</label>
                  <input
                    type="text"
                    value={editOrderForm.clientPoNumber}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, clientPoNumber: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Site Address</label>
                  <input
                    type="text"
                    value={editOrderForm.siteAddress}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, siteAddress: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Client PO Date</label>
                  <input
                    type="date"
                    value={editOrderForm.clientPoDate}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, clientPoDate: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-gray-300">Line Items</label>
                  <button
                    type="button"
                    onClick={() => setEditOrderForm({
                      ...editOrderForm,
                      items: [...editOrderForm.items, { description: '', quantity: 1, unitPrice: 0 }],
                    })}
                    className="text-[#7FB706] hover:underline font-semibold cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editOrderForm.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 bg-white/5 p-2 rounded-xl">
                      <input
                        type="text"
                        placeholder="Item Description"
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...editOrderForm.items];
                          updated[idx].description = e.target.value;
                          setEditOrderForm({ ...editOrderForm, items: updated });
                        }}
                        className="flex-1 bg-[#0a0a1a] border border-white/10 rounded-lg p-2 text-white text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...editOrderForm.items];
                          updated[idx].quantity = Number(e.target.value) || 1;
                          setEditOrderForm({ ...editOrderForm, items: updated });
                        }}
                        className="w-16 bg-[#0a0a1a] border border-white/10 rounded-lg p-2 text-white text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Rate"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const updated = [...editOrderForm.items];
                          updated[idx].unitPrice = Number(e.target.value) || 0;
                          setEditOrderForm({ ...editOrderForm, items: updated });
                        }}
                        className="w-24 bg-[#0a0a1a] border border-white/10 rounded-lg p-2 text-white text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editOrderForm.items.filter((_: any, i: number) => i !== idx);
                          setEditOrderForm({ ...editOrderForm, items: updated });
                        }}
                        className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={editOrderForm.termsAndConditions}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, termsAndConditions: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={editOrderForm.notes}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, notes: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-white/10 bg-[#0a0a1a]">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOrderEdit}
                disabled={savingEdit}
                className="px-5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
