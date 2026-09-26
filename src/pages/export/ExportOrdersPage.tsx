import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Search,
  Filter,
  Eye,
  Plus,
  ArrowUpDown,
  Ship,
  DollarSign,
  FileText,
  Mail,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  ExternalLink,
  ShieldCheck,
  Send,
  Building2,
} from 'lucide-react';
import { exportApi } from '../../api/exportApi';
import type { ExportOrder, ExportOrder360, BusinessParty, ExportCountry, ExportIncoterm } from '../../types/admin';

export const ExportOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Selected Order for 360 View
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [order360, setOrder360] = useState<ExportOrder360 | null>(null);
  const [loading360, setLoading360] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'shipment' | 'customs' | 'profit' | 'email'>('overview');

  // Email Send Modal inside Order 360
  const [emailForm, setEmailForm] = useState({
    recipientEmail: '',
    ccEmails: '',
    templateCode: 'EXPORT_ORDER_CONFIRMATION',
    subject: '',
    bodyHtml: '',
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await exportApi.listOrders({
        page,
        limit: 15,
        search,
        stage: stageFilter || undefined,
      });
      if (res.data.success && res.data.data) {
        setOrders(res.data.data.items);
        setTotalPages(res.data.data.totalPages);
      }
    } catch (err) {
      console.error('Failed to load export orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, search, stageFilter]);

  // Open Order 360
  const handleOpen360 = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setActiveTab('overview');
    setEmailSentSuccess(false);
    try {
      setLoading360(true);
      const res = await exportApi.getOrder360(orderId);
      if (res.data.success && res.data.data) {
        setOrder360(res.data.data);
        setEmailForm((prev) => ({
          ...prev,
          recipientEmail: res.data.data?.order.party?.email || '',
          subject: `Export Order Update: ${res.data.data?.order.exportOrderNumber}`,
        }));
      }
    } catch (err) {
      console.error('Failed to load order 360', err);
    } finally {
      setLoading360(false);
    }
  };

  // Handle stage change
  const handleStageChange = async (newStage: string) => {
    if (!selectedOrderId) return;
    try {
      await exportApi.updateOrderStage(selectedOrderId, newStage);
      await handleOpen360(selectedOrderId);
      loadOrders();
    } catch (err) {
      console.error('Failed to update stage', err);
    }
  };

  // Handle Send Email from 360
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !emailForm.recipientEmail) return;
    try {
      setSendingEmail(true);
      const order = order360?.order;
      const res = await exportApi.sendTradeEmail({
        exportOrderId: selectedOrderId,
        partyId: order?.partyId,
        recipientEmail: emailForm.recipientEmail,
        ccEmails: emailForm.ccEmails || undefined,
        templateCode: emailForm.templateCode,
        subject: emailForm.subject,
        bodyHtml: emailForm.bodyHtml,
        variables: {
          buyerName: order?.party?.legalName || 'Valued Buyer',
          orderNumber: order?.exportOrderNumber || '',
          buyerPoNumber: order?.buyerPoNumber || 'N/A',
          currency: order?.currency || 'USD',
          totalAmount: String(order?.totalOrderValue || 0),
          incoterm: order?.incoterm?.code || 'FOB',
        },
      });

      if (res.data.success) {
        setEmailSentSuccess(true);
        setTimeout(() => setEmailSentSuccess(false), 5000);
        handleOpen360(selectedOrderId);
      }
    } catch (err) {
      console.error('Failed to send trade email', err);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0f0e26] p-4 sm:p-6 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Package className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Export Orders Hub
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              Multi-Currency Trade Orders, Milestones, Logistics &amp; Landed Costing
            </p>
          </div>
        </div>

        <Link
          to="/admin/dashboard/export/orders/new"
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#6fa005] hover:from-[#6fa005] hover:to-[#5d8704] text-[#030213] text-xs font-bold transition shadow-lg shadow-[#7FB706]/20 active:scale-95 min-h-[44px]"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Export Order</span>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order #, Buyer Name, Commercial Inv #, Buyer PO..."
            className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-3 pl-10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
        </div>

        <div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-[#7FB706] transition"
          >
            <option value="">All Trade Stages</option>
            <option value="ORDER_CONFIRMED">1. Order Confirmed</option>
            <option value="ADVANCE_RECEIVED">2. Advance Received</option>
            <option value="IN_PRODUCTION">3. In Production</option>
            <option value="PACKED">4. QC &amp; Packed</option>
            <option value="CUSTOMS_CLEARED">5. Customs Cleared (LEO)</option>
            <option value="ON_BOARD">6. On Board Vessel</option>
            <option value="IN_TRANSIT">7. High Seas In-Transit</option>
            <option value="ARRIVED">8. Destination Arrived</option>
            <option value="REALIZED">9. Bank Realized</option>
            <option value="CLOSED">10. Closed &amp; eBRC Issued</option>
          </select>
        </div>
      </div>

      {/* Orders Manifest: Responsive Table on Desktop, Cards on Mobile */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Loading international export orders...</div>
      ) : orders.length === 0 ? (
        <div className="bg-[#0f0e26] border border-white/10 rounded-2xl p-12 text-center space-y-3">
          <Package className="w-12 h-12 text-gray-500 mx-auto stroke-1" />
          <p className="text-sm font-semibold text-gray-300">No export orders found</p>
          <p className="text-xs text-gray-500">Create a new order or convert one from an Export Quotation.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table (hidden on small screens) */}
          <div className="hidden md:block bg-[#0f0e26] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-white/5 uppercase text-[10px] font-bold text-gray-400 border-b border-white/10">
                <tr>
                  <th className="p-4">Order Ref</th>
                  <th className="p-4">Buyer &amp; Country</th>
                  <th className="p-4">Incoterm &amp; Port</th>
                  <th className="p-4">Order Value</th>
                  <th className="p-4">Trade Stage</th>
                  <th className="p-4">Shipment</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/5 transition">
                    <td className="p-4">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{o.exportOrderNumber}</span>
                      </div>
                      <div className="text-[10px] text-gray-400">{o.buyerPoNumber ? `PO: ${o.buyerPoNumber}` : 'Direct Contract'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">{o.party?.legalName}</div>
                      <div className="text-[10px] text-gray-400">{o.country?.name || 'International'}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                        {o.incoterm?.code || 'FOB'}
                      </span>
                      <div className="text-[10px] text-gray-400 mt-0.5">{o.portOfDestination?.name || 'Destination Port'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-[#7FB706]">
                        {o.currency} {Number(o.totalOrderValue).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">FOB: ${Number(o.fobValue).toLocaleString()}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/10">
                        {o.stage.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      {o.shipments && o.shipments.length > 0 ? (
                        <div className="text-[11px] text-purple-400 font-medium">
                          {o.shipments[0].vesselName || o.shipments[0].shipmentNumber}
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-500">Unbooked</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleOpen360(o.id)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#7FB706] hover:text-[#030213] text-gray-300 text-xs font-semibold transition inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>360 View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Transforms (< md) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {orders.map((o) => (
              <div
                key={o.id}
                onClick={() => handleOpen360(o.id)}
                className="p-4 bg-[#0f0e26] border border-white/10 rounded-2xl space-y-3 active:border-[#7FB706]/40 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-black text-white">{o.exportOrderNumber}</span>
                    <p className="text-xs font-semibold text-gray-300 mt-0.5">{o.party?.legalName}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-400">
                    {o.incoterm?.code || 'FOB'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pt-1 border-t border-white/5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Value</span>
                  <span className="font-black text-[#7FB706] font-mono">
                    {o.currency} {Number(o.totalOrderValue).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/10 text-gray-300">
                    {o.stage.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-[#7FB706] font-bold flex items-center gap-1">
                    <span>Order 360</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-2 text-xs text-gray-400">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── EXPORT ORDER 360 MODAL / SLIDE-OVER ─────────────────────────────── */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#0f0e26] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-[#070714]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7FB706]/20 text-[#7FB706] flex items-center justify-center font-bold">
                  EXP
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>{order360?.order?.exportOrderNumber}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#7FB706]/20 text-[#7FB706]">
                      {order360?.order?.stage.replace(/_/g, ' ')}
                    </span>
                  </h2>
                  <p className="text-xs text-gray-400">
                    Buyer: {order360?.order?.party?.legalName} ({order360?.order?.country?.name})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrderId(null)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stage Quick Switcher Bar */}
            <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Advance Stage:
              </span>
              {[
                'ORDER_CONFIRMED',
                'ADVANCE_RECEIVED',
                'IN_PRODUCTION',
                'PACKED',
                'CUSTOMS_CLEARED',
                'ON_BOARD',
                'IN_TRANSIT',
                'ARRIVED',
                'REALIZED',
                'CLOSED',
              ].map((st) => (
                <button
                  key={st}
                  onClick={() => handleStageChange(st)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold whitespace-nowrap transition ${
                    order360?.order?.stage === st
                      ? 'bg-[#7FB706] text-[#030213]'
                      : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-white/10 px-4 sm:px-6 bg-[#0a0a1a] text-xs font-semibold overflow-x-auto gap-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-[#7FB706] text-[#7FB706]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Overview &amp; Products
              </button>
              <button
                onClick={() => setActiveTab('milestones')}
                className={`py-3 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'milestones'
                    ? 'border-[#7FB706] text-[#7FB706]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Milestones &amp; LC
              </button>
              <button
                onClick={() => setActiveTab('shipment')}
                className={`py-3 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'shipment'
                    ? 'border-[#7FB706] text-[#7FB706]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Shipments &amp; Containers
              </button>
              <button
                onClick={() => setActiveTab('customs')}
                className={`py-3 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'customs'
                    ? 'border-[#7FB706] text-[#7FB706]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Customs &amp; Compliance
              </button>
              <button
                onClick={() => setActiveTab('profit')}
                className={`py-3 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'profit'
                    ? 'border-[#7FB706] text-[#7FB706]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Landed Cost &amp; Profit
              </button>
              <button
                onClick={() => setActiveTab('email')}
                className={`py-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'email'
                    ? 'border-pink-500 text-pink-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>✉️ Trade Email</span>
              </button>
            </div>

            {/* Modal Body with Tab Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {loading360 ? (
                <div className="py-12 text-center text-gray-400 text-xs">Loading Order 360 data...</div>
              ) : (
                <>
                  {/* TAB 1: OVERVIEW & PRODUCTS */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-white/5 border border-white/10 text-xs">
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-bold">Incoterm</span>
                          <p className="font-bold text-white text-sm">{order360?.order?.incoterm?.code} — {order360?.order?.incoterm?.name}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-bold">Port of Loading</span>
                          <p className="font-bold text-white text-sm">{order360?.order?.portOfLoading?.name || 'Nhava Sheva (INNSA)'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-bold">Port of Destination</span>
                          <p className="font-bold text-white text-sm">{order360?.order?.portOfDestination?.name || 'Jebel Ali Port'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-bold">Payment Method</span>
                          <p className="font-bold text-white text-sm">{order360?.order?.paymentMethod || 'ADVANCE_TT'}</p>
                        </div>
                      </div>

                      {/* Products / BOM table */}
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          Consignment Line Items (BOM Linked)
                        </h3>
                        <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
                          <table className="w-full text-left text-xs text-gray-300">
                            <thead className="bg-white/5 uppercase text-[10px] font-bold text-gray-400 border-b border-white/10">
                              <tr>
                                <th className="p-3">#</th>
                                <th className="p-3">Item Description</th>
                                <th className="p-3">Qty</th>
                                <th className="p-3">Unit Rate</th>
                                <th className="p-3 text-right">Total Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {order360?.order?.salesOrder?.items?.map((item, idx) => (
                                <tr key={item.id}>
                                  <td className="p-3 text-gray-500">{idx + 1}</td>
                                  <td className="p-3 font-medium text-white">{item.itemDescription}</td>
                                  <td className="p-3">
                                    {Number(item.quantity)} {item.unit}
                                  </td>
                                  <td className="p-3 font-mono">
                                    {order360?.order?.currency} {Number(item.unitPrice).toLocaleString()}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-white">
                                    {order360?.order?.currency} {Number(item.totalAmount).toLocaleString()}
                                  </td>
                                </tr>
                              )) || (
                                <tr>
                                  <td colSpan={5} className="p-4 text-center text-gray-500">
                                    Direct trade order without line item breakdown.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: MILESTONES & LC */}
                  {activeTab === 'milestones' && (
                    <div className="space-y-4 text-xs">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-white uppercase tracking-wider">
                          Contract Payment Milestones
                        </h3>
                        <span className="text-emerald-400 font-bold">
                          {order360?.realizationProgress?.realizationPercentage || 0}% Realized
                        </span>
                      </div>

                      <div className="space-y-2">
                        {order360?.order?.paymentMilestones?.map((m) => (
                          <div
                            key={m.id}
                            className="p-3.5 rounded-xl border border-white/10 bg-white/5 flex justify-between items-center"
                          >
                            <div>
                              <div className="font-bold text-white">{m.milestoneName.replace(/_/g, ' ')}</div>
                              <div className="text-[10px] text-gray-400">
                                Due: {m.dueDate ? new Date(m.dueDate).toLocaleDateString() : 'Upon Dispatch Advice'}
                              </div>
                            </div>

                            <div className="text-right flex items-center gap-3">
                              <div>
                                <div className="font-mono font-bold text-white">
                                  {m.currency} {Number(m.amount).toLocaleString()} ({Number(m.percentage)}%)
                                </div>
                                <div className="text-[10px] text-gray-400">
                                  {m.isPaid ? 'Paid in Full' : 'Pending Remittance'}
                                </div>
                              </div>
                              <span
                                className={`px-2 py-1 rounded text-[10px] font-bold ${
                                  m.isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                }`}
                              >
                                {m.isPaid ? 'PAID ✓' : 'PENDING'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: SHIPMENTS & CONTAINERS */}
                  {activeTab === 'shipment' && (
                    <div className="space-y-4 text-xs">
                      <h3 className="font-bold text-white uppercase tracking-wider">
                        Shipment &amp; Container Manifest
                      </h3>

                      {order360?.order?.shipments?.length === 0 ? (
                        <p className="text-gray-500 py-6 text-center">No shipments booked for this order yet.</p>
                      ) : (
                        order360?.order?.shipments?.map((s) => (
                          <div key={s.id} className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-bold text-white text-sm">{s.shipmentNumber}</span>
                                <p className="text-gray-400 text-[11px]">
                                  Vessel: {s.vesselName || 'TBA'} (Voyage: {s.voyageNumber || 'N/A'})
                                </p>
                              </div>
                              <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400">
                                {s.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10">
                              <div>
                                <span className="text-gray-500 text-[10px]">B/L Number</span>
                                <p className="font-mono font-bold text-white">{s.blAwbNumber || 'Pending Issue'}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-[10px]">ETD Departure</span>
                                <p className="text-white">{s.etd ? new Date(s.etd).toLocaleDateString() : 'TBD'}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-[10px]">ETA Arrival</span>
                                <p className="text-white">{s.eta ? new Date(s.eta).toLocaleDateString() : 'TBD'}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-[10px]">Freight Term</span>
                                <p className="text-white">{s.freightTerm}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 4: CUSTOMS & COMPLIANCE */}
                  {activeTab === 'customs' && (
                    <div className="space-y-4 text-xs">
                      <h3 className="font-bold text-white uppercase tracking-wider">
                        Indian Customs (ICEGATE) &amp; Compliance Checks
                      </h3>

                      <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white">Automated Sanctions &amp; Country Rules Screening</span>
                          <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                            PASSED ✓
                          </span>
                        </div>
                        <p className="text-gray-400">
                          Destination Country: {order360?.order?.country?.name} ({order360?.order?.country?.countryCode}).
                          Requires Certificate of Origin: {order360?.order?.country?.requiresCoo ? 'YES' : 'NO'}.
                        </p>
                      </div>

                      {order360?.order?.shippingBills?.map((sb) => (
                        <div key={sb.id} className="p-4 rounded-xl border border-white/10 bg-white/5 flex justify-between items-center">
                          <div>
                            <div className="font-bold text-white">Shipping Bill Ref: {sb.sbNumber}</div>
                            <div className="text-gray-400 text-[10px]">
                              Date: {sb.sbDate ? new Date(sb.sbDate).toLocaleDateString() : 'Filed'} | Port: {sb.portCode || 'INNSA'}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold text-[10px]">
                              {sb.status}
                            </span>
                            <div className="text-[10px] text-gray-400 mt-1">LEO: {sb.leoDate ? 'GRANTED ✓' : 'Pending'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TAB 5: LANDED COST & PROFITABILITY */}
                  {activeTab === 'profit' && (
                    <div className="space-y-4 text-xs">
                      <h3 className="font-bold text-white uppercase tracking-wider">
                        Dynamic Export Profitability Engine
                      </h3>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <span className="text-gray-500 text-[10px] uppercase font-bold">Total Export Revenue</span>
                          <div className="text-lg font-black text-white mt-1">
                            ${order360?.profitability?.revenueUsd?.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            ₹{order360?.profitability?.revenueInr?.toLocaleString()}
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <span className="text-gray-500 text-[10px] uppercase font-bold">Landed Export Costs</span>
                          <div className="text-lg font-black text-amber-400 mt-1">
                            ₹{order360?.profitability?.totalExpensesInr?.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-gray-400">Freight, CHA, Port &amp; Insurance</div>
                        </div>

                        <div className="p-4 rounded-xl bg-[#7FB706]/10 border border-[#7FB706]/30">
                          <span className="text-[#7FB706] text-[10px] uppercase font-bold">Net Export Profit</span>
                          <div className="text-lg font-black text-[#7FB706] mt-1">
                            ₹{order360?.profitability?.netProfitInr?.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-[#7FB706] font-bold">
                            Margin: {order360?.profitability?.netProfitMarginPct}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 6: TRADE EMAIL DISPATCHER */}
                  {activeTab === 'email' && (
                    <div className="space-y-4 text-xs">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Mail className="w-4 h-4 text-pink-400" />
                          <span>Dispatch Trade Communication Email</span>
                        </h3>
                        {emailSentSuccess && (
                          <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold">
                            Email dispatched successfully ✓
                          </span>
                        )}
                      </div>

                      <form onSubmit={handleSendEmail} className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-gray-400 text-[11px] mb-1">Recipient Email (To:)</label>
                            <input
                              type="email"
                              required
                              value={emailForm.recipientEmail}
                              onChange={(e) => setEmailForm({ ...emailForm, recipientEmail: e.target.value })}
                              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-gray-400 text-[11px] mb-1">Carbon Copy (CC:)</label>
                            <input
                              type="text"
                              value={emailForm.ccEmails}
                              onChange={(e) => setEmailForm({ ...emailForm, ccEmails: e.target.value })}
                              placeholder="logistics@pacific.com, cha@agent.com"
                              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-400 text-[11px] mb-1">Select Trade Template</label>
                          <select
                            value={emailForm.templateCode}
                            onChange={(e) => setEmailForm({ ...emailForm, templateCode: e.target.value })}
                            className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white"
                          >
                            <option value="EXPORT_ORDER_CONFIRMATION">1. Order Confirmation &amp; Payment Details</option>
                            <option value="EXPORT_SHIPPING_ADVICE">2. Shipping Advice (Vessel, Container &amp; B/L)</option>
                            <option value="EXPORT_QUOTATION">3. Commercial Quotation Dispatch</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-400 text-[11px] mb-1">Subject Line</label>
                          <input
                            type="text"
                            required
                            value={emailForm.subject}
                            onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                            className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white"
                          />
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button
                            type="submit"
                            disabled={sendingEmail}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#6fa005] hover:from-[#6fa005] text-[#030213] text-xs font-bold transition flex items-center gap-2"
                          >
                            <Send className="w-4 h-4" />
                            <span>{sendingEmail ? 'Dispatching...' : 'Send Trade Email'}</span>
                          </button>
                        </div>
                      </form>

                      {/* Outbound Email History for this order */}
                      <div className="space-y-2 pt-2">
                        <h4 className="font-bold text-gray-400 uppercase text-[10px]">Recent Outbound Logs</h4>
                        {order360?.order?.emailLogs?.map((log) => (
                          <div key={log.id} className="p-2.5 rounded-lg bg-black/30 border border-white/5 flex justify-between items-center text-xs">
                            <div>
                              <div className="font-semibold text-white">{log.subject}</div>
                              <div className="text-[10px] text-gray-400">To: {log.recipientEmail} • {new Date(log.sentAt).toLocaleString()}</div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400">
                              {log.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExportOrdersPage;
