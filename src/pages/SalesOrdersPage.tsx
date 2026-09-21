import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag, Search, Plus, Filter, CheckCircle2,
  Clock, Truck, AlertCircle, Eye, ChevronRight, X,
  FileText, Package, Wrench, CreditCard, RefreshCw,
  ExternalLink, Layers, ArrowRight, Ban, Send
} from 'lucide-react';
import { salesOrdersApi, crmApi, companiesApi, packingListsApi, hardwareIssueApi } from '../api/services';
import type {
  SalesOrder, BusinessParty, CompanyProfile,
  SalesOrderStatus, OrderDocumentTimelineItem
} from '../types/admin';

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Entities & Customers lookups
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);

  // Modals & Drawers
  const [showDirectOrderModal, setShowDirectOrderModal] = useState(false);
  const [selectedOrderTimeline, setSelectedOrderTimeline] = useState<{
    order: SalesOrder;
    timeline: OrderDocumentTimelineItem[];
  } | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Global Cross-Document Search Results
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<any | null>(null);
  const [searchingGlobal, setSearchingGlobal] = useState(false);

  // Direct Order Form
  const [directForm, setDirectForm] = useState({
    customerId: '',
    companyProfileId: '',
    clientPoNumber: '',
    clientPoDate: '',
    siteName: '',
    siteAddress: '',
    items: [
      {
        serialNumber: 1,
        itemDescription: 'Pacific HPL Toilet Cubicles - Model Standard (12mm)',
        quantity: 5,
        unit: 'Cubicle',
        unitPrice: 19500,
        gstRate: 18,
      },
    ],
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15, search };
      if (statusFilter !== 'ALL') params.status = statusFilter;
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
  }, [page, search, statusFilter]);

  const loadLookups = useCallback(async () => {
    try {
      const [custRes, compRes] = await Promise.all([
        crmApi.listCustomers({ limit: 100 }),
        companiesApi.list(),
      ]);
      if (custRes.data?.data?.items) setCustomers(custRes.data.data.items);
      const companyList = compRes.data?.data;
      if (companyList && companyList.length > 0) {
        setCompanies(companyList);
        if (!directForm.companyProfileId) {
          setDirectForm((prev) => ({ ...prev, companyProfileId: companyList[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load lookups:', err);
    }
  }, [directForm.companyProfileId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

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

  // Open Document Timeline
  const handleOpenTimeline = async (order: SalesOrder) => {
    setLoadingTimeline(true);
    try {
      const res = await salesOrdersApi.getTimeline(order.id);
      if (res.data?.data) {
        setSelectedOrderTimeline({
          order,
          timeline: res.data.data,
        });
      }
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
    } finally {
      setLoadingTimeline(false);
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

  // Cancel Order
  const handleCancelOrder = async (orderId: string) => {
    const reason = prompt('Please enter cancellation reason:');
    if (!reason) return;
    try {
      await salesOrdersApi.cancel(orderId, reason);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Cancellation failed');
    }
  };

  // Direct Order Math & Actions
  const handleDirectItemChange = (idx: number, field: string, val: any) => {
    setDirectForm((prev) => {
      const updated = [...prev.items];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, items: updated };
    });
  };

  const addDirectItemRow = () => {
    setDirectForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          serialNumber: prev.items.length + 1,
          itemDescription: 'HPL Urinal Partition Screen (12mm)',
          quantity: 2,
          unit: 'Screen',
          unitPrice: 5500,
          gstRate: 18,
        },
      ],
    }));
  };

  const handleCreateDirectOrder = async () => {
    try {
      if (!directForm.customerId) {
        alert('Please select a customer');
        return;
      }
      await salesOrdersApi.createDirect(directForm);
      setShowDirectOrderModal(false);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to create direct order');
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

        <button
          onClick={() => setShowDirectOrderModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Create Direct Order
        </button>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Total Active Orders</div>
          <div className="text-2xl font-bold text-white mt-1">{orders.length}</div>
          <div className="text-[11px] text-[#7FB706] mt-1 font-mono">PPS/ORD/2026-27/...</div>
        </div>
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Pending Approval</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {orders.filter((o) => o.status === 'PENDING').length}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Awaiting manager sign-off</div>
        </div>
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Partially Dispatched</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {orders.filter((o) => o.status === 'PARTIALLY_DISPATCHED').length}
          </div>
          <div className="text-[11px] text-blue-500/80 mt-1">Balance pending in plant</div>
        </div>
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Fully Dispatched</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {orders.filter((o) => o.status === 'FULLY_DISPATCHED').length}
          </div>
          <div className="text-[11px] text-emerald-500/80 mt-1">Fulfillment completed</div>
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
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
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

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'PENDING', 'APPROVED', 'PARTIALLY_DISPATCHED', 'FULLY_DISPATCHED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap min-h-[44px] ${
                statusFilter === st
                  ? 'bg-[#7FB706] text-white shadow-md shadow-[#7FB706]/20'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {st}
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
        ) : orders.length === 0 ? (
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
                    <th className="py-3 px-4">Order Number</th>
                    <th className="py-3 px-4">Customer & Site</th>
                    <th className="py-3 px-4">Source & Date</th>
                    <th className="py-3 px-4">Dispatch Progress</th>
                    <th className="py-3 px-4">Grand Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map((o) => {
                    const totalQty = o.items.reduce((s, it) => s + Number(it.quantity), 0);
                    const dispQty = o.items.reduce((s, it) => s + Number(it.dispatchedQuantity || 0), 0);
                    const pct = totalQty > 0 ? Math.min(100, Math.round((dispQty / totalQty) * 100)) : 0;

                    return (
                      <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-mono font-semibold text-white">{o.orderNumber}</div>
                          {o.clientPoNumber && (
                            <div className="text-[11px] text-gray-500">PO: {o.clientPoNumber}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-white">{o.customer?.legalName || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{o.siteName || 'Standard Site'}</div>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div>{new Date(o.orderDate).toLocaleDateString('en-GB')}</div>
                          <span className="text-[10px] font-semibold text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
                            {o.source === 'FROM_QUOTATION' ? 'Quotation Convert' : 'Direct Order'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>{dispQty} / {totalQty} Units</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="w-28 bg-white/10 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#7FB706]">
                          ₹ {Number(o.grandTotal).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              o.status === 'FULLY_DISPATCHED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : o.status === 'PARTIALLY_DISPATCHED'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : o.status === 'APPROVED'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : o.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Document Timeline Button */}
                            <button
                              onClick={() => handleOpenTimeline(o)}
                              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                              title="View Document Timeline (Quotation -> Order -> PI -> PL -> HIL)"
                            >
                              <Layers className="w-4 h-4 text-[#7FB706]" />
                            </button>

                            {o.status === 'PENDING' && (
                              <button
                                onClick={() => handleApproveOrder(o.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-semibold text-xs cursor-pointer flex items-center gap-1 min-h-[38px]"
                                title="Approve Order"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                              </button>
                            )}

                            {o.status !== 'CANCELLED' && o.status !== 'FULLY_DISPATCHED' && (
                              <button
                                onClick={() => handleCancelOrder(o.id)}
                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                                title="Cancel Order"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< md) */}
            <div className="md:hidden divide-y divide-white/5">
              {orders.map((o) => {
                const totalQty = o.items.reduce((s, it) => s + Number(it.quantity), 0);
                const dispQty = o.items.reduce((s, it) => s + Number(it.dispatchedQuantity || 0), 0);
                const pct = totalQty > 0 ? Math.min(100, Math.round((dispQty / totalQty) * 100)) : 0;

                return (
                  <div key={o.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-mono font-bold text-white">{o.orderNumber}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{o.customer?.legalName}</div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          o.status === 'FULLY_DISPATCHED'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : o.status === 'PARTIALLY_DISPATCHED'
                            ? 'bg-blue-500/10 text-blue-400'
                            : o.status === 'APPROVED'
                            ? 'bg-purple-500/10 text-purple-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {o.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Dispatch Progress: {dispQty} / {totalQty} Units</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div>{new Date(o.orderDate).toLocaleDateString('en-GB')}</div>
                      <div className="text-base font-bold text-[#7FB706]">
                        ₹ {Number(o.grandTotal).toLocaleString()}
                      </div>
                    </div>

                    {/* Touch Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleOpenTimeline(o)}
                        className="min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white rounded-xl"
                      >
                        <Layers className="w-4 h-4 text-[#7FB706]" /> Document Flow
                      </button>

                      {o.status === 'PENDING' ? (
                        <button
                          onClick={() => handleApproveOrder(o.id)}
                          className="min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Approve
                        </button>
                      ) : (
                        <div className="min-h-[44px] flex items-center justify-center text-xs text-gray-400">
                          Ready for Dispatch
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Cross-Document Visual Timeline Drawer / Modal */}
      {selectedOrderTimeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#7FB706]" />
                  Document Flow & Fulfillment Timeline
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  Order: {selectedOrderTimeline.order.orderNumber} ({selectedOrderTimeline.order.customer?.legalName})
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderTimeline(null)}
                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visual Connected Timeline */}
            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
              {selectedOrderTimeline.timeline.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs">
                  No linked documents found yet.
                </div>
              ) : (
                selectedOrderTimeline.timeline.map((item, idx) => {
                  let badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                  let Icon = FileText;

                  if (item.type === 'QUOTATION') {
                    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                    Icon = FileText;
                  } else if (item.type === 'ORDER') {
                    badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                    Icon = ShoppingBag;
                  } else if (item.type === 'PI') {
                    badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                    Icon = FileText;
                  } else if (item.type === 'PACKING_LIST') {
                    badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                    Icon = Package;
                  } else if (item.type === 'HARDWARE_ISSUE') {
                    badgeColor = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
                    Icon = Wrench;
                  } else if (item.type === 'PAYMENT') {
                    badgeColor = 'bg-[#7FB706]/10 text-[#7FB706] border-[#7FB706]/20';
                    Icon = CreditCard;
                  }

                  return (
                    <div key={idx} className="relative group">
                      {/* Node Dot */}
                      <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-[#121226] border-2 border-[#7FB706] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#7FB706]" />
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#0a0a1a] border border-white/10 hover:border-white/20 transition-all space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColor} flex items-center gap-1`}>
                            <Icon className="w-3 h-3" /> {item.type}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {new Date(item.date).toLocaleDateString('en-GB')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-mono font-bold text-white text-sm">
                              {item.referenceNumber}
                            </div>
                            <div className="text-xs text-gray-400">{item.title}</div>
                          </div>
                          {item.amount != null && (
                            <div className="font-bold text-sm text-[#7FB706]">
                              ₹ {Number(item.amount).toLocaleString()}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <span className="text-gray-500 font-semibold">Status: {item.status}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Direct Order Creation Modal */}
      {showDirectOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-3xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#7FB706]" /> Create Direct Sales Order
              </h3>
              <button
                onClick={() => setShowDirectOrderModal(false)}
                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Customer *</label>
                  <select
                    value={directForm.customerId}
                    onChange={(e) => setDirectForm({ ...directForm, customerId: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#7FB706] min-h-[44px]"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.legalName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Company Profile</label>
                  <select
                    value={directForm.companyProfileId}
                    onChange={(e) => setDirectForm({ ...directForm, companyProfileId: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#7FB706] min-h-[44px]"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.legalName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Client PO Number</label>
                  <input
                    type="text"
                    placeholder="e.g. PO/DLF/2026/09"
                    value={directForm.clientPoNumber}
                    onChange={(e) => setDirectForm({ ...directForm, clientPoNumber: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Site / Project Name</label>
                  <input
                    type="text"
                    placeholder="e.g. DLF Tower C Restroom Fit-out"
                    value={directForm.siteName}
                    onChange={(e) => setDirectForm({ ...directForm, siteName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white min-h-[44px]"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Ordered Products</span>
                {directForm.items.map((it, idx) => (
                  <div key={idx} className="p-3 bg-[#0a0a1a] border border-white/10 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-[#7FB706]">Item #{it.serialNumber}</span>
                      {directForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setDirectForm({
                            ...directForm,
                            items: directForm.items.filter((_, i) => i !== idx).map((x, n) => ({ ...x, serialNumber: n + 1 })),
                          })}
                          className="text-xs text-red-400 p-1"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={it.itemDescription}
                      onChange={(e) => handleDirectItemChange(idx, 'itemDescription', e.target.value)}
                      placeholder="Product Description"
                      className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                    />
                    <div className="grid grid-cols-4 gap-2">
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleDirectItemChange(idx, 'quantity', Number(e.target.value))}
                        placeholder="Qty"
                        className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                      />
                      <input
                        type="text"
                        value={it.unit}
                        onChange={(e) => handleDirectItemChange(idx, 'unit', e.target.value)}
                        placeholder="Unit"
                        className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                      />
                      <input
                        type="number"
                        min="0"
                        value={it.unitPrice}
                        onChange={(e) => handleDirectItemChange(idx, 'unitPrice', Number(e.target.value))}
                        placeholder="Unit Price"
                        className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                      />
                      <input
                        type="number"
                        value={it.gstRate}
                        onChange={(e) => handleDirectItemChange(idx, 'gstRate', Number(e.target.value))}
                        placeholder="GST %"
                        className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addDirectItemRow}
                  className="w-full py-2 border-2 border-dashed border-white/10 hover:border-[#7FB706]/40 text-gray-400 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowDirectOrderModal(false)}
                  className="px-4 py-2 bg-white/5 text-gray-300 rounded-xl text-xs min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateDirectOrder}
                  className="px-6 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-xs min-h-[44px]"
                >
                  Save Direct Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
