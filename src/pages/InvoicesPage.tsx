import React, { useEffect, useState, useCallback } from 'react';
import {
  Receipt, Search, Plus, RefreshCw, Eye, Trash2, Printer,
  ChevronRight, FileText, Package, Wrench, ShoppingBag,
  CheckCircle2, Clock, AlertCircle, XCircle, CreditCard,
  ArrowRight, Filter, X, ExternalLink, Layers, Building2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { invoicesApi } from '../api/services';
import DocumentFlowTimelineModal from '../components/common/DocumentFlowTimelineModal';
import type { Invoice, InvoiceStatus } from '../types/admin';

/* ─── Status helpers ──────────────────────────────────────────────────────── */

const STATUS_META: Record<InvoiceStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  DRAFT:          { label: 'Draft',          cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20',         icon: <FileText className="w-3 h-3" /> },
  SENT:           { label: 'Sent',           cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',          icon: <ArrowRight className="w-3 h-3" /> },
  VIEWED:         { label: 'Viewed',         cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20',    icon: <Eye className="w-3 h-3" /> },
  PARTIALLY_PAID: { label: 'Part. Paid',     cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',       icon: <Clock className="w-3 h-3" /> },
  PAID:           { label: 'Paid',           cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle2 className="w-3 h-3" /> },
  OVERDUE:        { label: 'Overdue',        cls: 'bg-red-500/10 text-red-400 border-red-500/20',             icon: <AlertCircle className="w-3 h-3" /> },
  CANCELLED:      { label: 'Cancelled',      cls: 'bg-gray-500/10 text-gray-500 border-gray-600/20',          icon: <XCircle className="w-3 h-3" /> },
};

const StatusBadge: React.FC<{ status: InvoiceStatus }> = ({ status }) => {
  const meta = STATUS_META[status] ?? { label: status, cls: 'bg-white/5 text-gray-400 border-white/10', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${meta.cls}`}>
      {meta.icon}{meta.label}
    </span>
  );
};

/* ─── Main Component ──────────────────────────────────────────────────────── */

const STATUS_TABS: Array<{ id: string; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'SENT', label: 'Sent' },
  { id: 'PARTIALLY_PAID', label: 'Part. Paid' },
  { id: 'PAID', label: 'Paid' },
  { id: 'OVERDUE', label: 'Overdue' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

const InvoicesPage: React.FC = () => {
  const navigate = useNavigate();

  const [invoices, setInvoices]         = useState<Invoice[]>([]);
  const [total, setTotal]               = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [page, setPage]                 = useState(1);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState<'ALL' | 'MAIN' | 'KOLKATA'>('ALL');
  const [isLoading, setIsLoading]       = useState(true);

  // PDF modal
  const [pdfHtml, setPdfHtml]           = useState('');
  const [showPdf, setShowPdf]           = useState(false);
  const [loadingPdf, setLoadingPdf]     = useState(false);
  const [pdfInvoice, setPdfInvoice]     = useState<Invoice | null>(null);
  const [selectedInvoiceForTimeline, setSelectedInvoiceForTimeline] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 20 };
      if (search.trim())              params.search = search.trim();
      if (statusFilter !== 'ALL')     params.status = statusFilter;
      if (branchFilter !== 'ALL')     params.branch = branchFilter;
      const { data } = await invoicesApi.list(params);
      setInvoices(data.data?.items ?? []);
      setTotal(data.data?.total ?? 0);
      setTotalPages(data.data?.totalPages ?? 1);
    } catch {
      /* silent */
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, branchFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const displayedInvoices = invoices.filter((inv) => {
    if (branchFilter === 'KOLKATA') return inv.invoiceNumber?.startsWith('PPSK/');
    if (branchFilter === 'MAIN') return !inv.invoiceNumber?.startsWith('PPSK/');
    return true;
  });

  const handleDelete = async (inv: Invoice) => {
    if (!confirm(`Delete Invoice ${inv.invoiceNumber}? This action cannot be undone.`)) return;
    try {
      await invoicesApi.delete(inv.id);
      fetchInvoices();
    } catch {
      alert('Failed to delete invoice.');
    }
  };

  const handleOpenPdf = async (inv: Invoice) => {
    setPdfInvoice(inv);
    setShowPdf(true);
    setLoadingPdf(true);
    try {
      const res = await fetch(invoicesApi.getPdfUrl(inv.id), {
        headers: { Authorization: `Bearer ${localStorage.getItem('pacific_access_token')}` },
      });
      setPdfHtml(await res.text());
    } catch {
      setPdfHtml('<p style="color:red;padding:2rem">Failed to load invoice PDF.</p>');
    } finally {
      setLoadingPdf(false);
    }
  };

  /* ── KPI counters ───────────────────────────────────────────────────────── */

  const kpiPaid         = invoices.filter(i => i.status === 'PAID').length;
  const kpiOverdue      = invoices.filter(i => i.status === 'OVERDUE').length;
  const kpiPartPaid     = invoices.filter(i => i.status === 'PARTIALLY_PAID').length;
  const kpiDraft        = invoices.filter(i => i.status === 'DRAFT').length;
  const totalRevenue    = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + Number(i.totalAmount), 0);
  const totalOutstanding = invoices.filter(i => ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status)).reduce((s, i) => s + Number(i.totalAmount), 0);

  /* ── Helpers ────────────────────────────────────────────────────────────── */

  const fmt = (n: number) => '₹ ' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const serial = (idx: number) => (page - 1) * 20 + idx + 1;

  const isDue = (inv: Invoice) => {
    if (!inv.dueDate) return false;
    return new Date(inv.dueDate) < new Date() && inv.status !== 'PAID' && inv.status !== 'CANCELLED';
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-[#7FB706]/10 text-[#7FB706]">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Bill &amp; Tax Invoices</h1>
              <p className="text-xs text-gray-400">Stage 04 — GST tax invoices, payment tracking &amp; receivables</p>
            </div>
          </div>
        </div>

        <Link
          to="/admin/dashboard/invoices/new"
          className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </Link>
      </div>


      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Total Invoices</div>
          <div className="text-2xl font-bold text-white mt-1">{total}</div>
          <div className="text-[11px] text-[#7FB706] mt-1 font-mono">This page: {invoices.length}</div>
        </div>
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Revenue Collected</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{fmt(totalRevenue)}</div>
          <div className="text-[11px] text-emerald-600 mt-1">{kpiPaid} paid invoices</div>
        </div>
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Outstanding</div>
          <div className="text-xl font-bold text-amber-400 mt-1">{fmt(totalOutstanding)}</div>
          <div className="text-[11px] text-amber-600 mt-1">{kpiPartPaid} partly paid</div>
        </div>
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Overdue / Draft</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{kpiOverdue} <span className="text-base text-gray-500">/ {kpiDraft}</span></div>
          <div className="text-[11px] text-rose-600 mt-1">Need attention</div>
        </div>
      </div>

      {/* ── Quick Pipeline Links ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Sales Orders',  path: '/admin/dashboard/sales-orders',    icon: ShoppingBag, color: 'text-blue-400',   bg: 'bg-blue-500/10' },
          { label: 'Packing Lists', path: '/admin/dashboard/packing-lists',   icon: Package,    color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Issue Lists',   path: '/admin/dashboard/issue-lists',     icon: Wrench,     color: 'text-purple-400',  bg: 'bg-purple-500/10' },
          { label: 'Payments',      path: '/admin/dashboard/payments',        icon: CreditCard, color: 'text-amber-400',   bg: 'bg-amber-500/10' },
        ].map(l => (
          <Link
            key={l.path}
            to={l.path}
            className="flex items-center gap-2.5 px-3 py-2.5 bg-[#121226] border border-white/5 rounded-xl hover:border-white/10 hover:bg-white/[0.03] transition-all group"
          >
            <div className={`p-1.5 rounded-lg ${l.bg} ${l.color}`}><l.icon className="w-3.5 h-3.5" /></div>
            <span className="text-xs font-semibold text-gray-400 group-hover:text-white transition-colors">{l.label}</span>
            <ExternalLink className="w-3 h-3 text-gray-600 ml-auto group-hover:text-gray-400" />
          </Link>
        ))}
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
        {/* Search & Branch */}
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice number, customer, order…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
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

          <button
            onClick={fetchInvoices}
            className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shrink-0"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          {STATUS_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setStatusFilter(tab.id); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer shrink-0 min-h-[36px] ${
                statusFilter === tab.id
                  ? 'bg-[#7FB706] text-white shadow-md shadow-[#7FB706]/20'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Invoice Table / Cards ────────────────────────────────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#7FB706] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading invoices…</p>
          </div>
        ) : displayedInvoices.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Receipt className="w-12 h-12 mx-auto text-gray-700" />
            <p className="text-white font-semibold">No invoices found</p>
            <p className="text-xs text-gray-500">Create a new invoice or generate one from a Sales Order.</p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Link
                to="/admin/dashboard/invoices/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/30 rounded-xl text-xs font-semibold hover:bg-[#7FB706]/25"
              >
                <Plus className="w-3.5 h-3.5" /> New Invoice
              </Link>
              <Link
                to="/admin/dashboard/sales-orders"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 text-gray-300 border border-white/10 rounded-xl text-xs font-semibold hover:bg-white/10"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> From Sales Order
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* ── Desktop Table ──────────────────────────────────────── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-[#0a0a1a] text-xs uppercase text-gray-500 border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4 text-center w-10">#</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer / Project</th>
                    <th className="py-3 px-4">Linked Order</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Subtotal</th>
                    <th className="py-3 px-4">Tax</th>
                    <th className="py-3 px-4 font-bold">Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayedInvoices.map((inv, idx) => (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoiceForTimeline(inv)}
                      className={`hover:bg-white/[0.025] transition-colors group cursor-pointer ${isDue(inv) ? 'border-l-2 border-l-red-500/40' : ''}`}
                    >
                      {/* # */}
                      <td className="py-3 px-4 text-center font-mono text-gray-500 text-xs">{serial(idx)}</td>

                      {/* Invoice number */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-white group-hover:text-[#7FB706] transition-colors flex items-center gap-1.5">
                          {inv.invoiceNumber}
                          {inv.invoiceNumber?.startsWith('PPSK/') ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Kolkata
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-white/5 text-gray-400">
                              Main
                            </span>
                          )}
                          {isDue(inv) && <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/10 text-red-400 font-bold">OVERDUE</span>}
                        </div>
                        {inv.paidAt && (
                          <div className="text-[10px] text-emerald-500 mt-0.5 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Paid {new Date(inv.paidAt).toLocaleDateString('en-GB')}
                          </div>
                        )}
                      </td>

                      {/* Customer / project */}
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-200 font-medium">
                          {(inv as any).customer?.legalName || (inv as any).party?.legalName || '—'}
                        </div>
                        {inv.projectId && (
                          <div className="text-[11px] text-gray-500 font-mono">Project linked</div>
                        )}
                      </td>

                      {/* Linked order */}
                      <td className="py-3 px-4">
                        {(inv as any).salesOrderId ? (
                          <Link
                            to={`/admin/dashboard/sales-orders/${(inv as any).salesOrderId}`}
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-400 hover:text-blue-300 px-2 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20"
                          >
                            <ShoppingBag className="w-3 h-3" />
                            {(inv as any).orderNumber || 'Order'}
                          </Link>
                        ) : (inv as any).quotationId ? (
                          <Link
                            to={`/admin/dashboard/quotations`}
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:text-amber-300 px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20"
                          >
                            <FileText className="w-3 h-3" />
                            {(inv as any).quotationRef || 'Quotation'}
                          </Link>
                        ) : (
                          <span className="text-[11px] text-gray-600 italic">Standalone</span>
                        )}
                      </td>

                      {/* Issue date */}
                      <td className="py-3 px-4 text-xs text-gray-400">
                        {new Date(inv.issueDate).toLocaleDateString('en-GB')}
                      </td>

                      {/* Due date */}
                      <td className="py-3 px-4 text-xs">
                        {inv.dueDate ? (
                          <span className={isDue(inv) ? 'text-red-400 font-semibold' : 'text-gray-400'}>
                            {new Date(inv.dueDate).toLocaleDateString('en-GB')}
                          </span>
                        ) : <span className="text-gray-600">—</span>}
                      </td>

                      {/* Subtotal */}
                      <td className="py-3 px-4 text-xs text-gray-400">
                        ₹{Number(inv.subtotal).toLocaleString('en-IN')}
                      </td>

                      {/* Tax */}
                      <td className="py-3 px-4 text-xs text-gray-400">
                        ₹{Number(inv.taxAmount).toLocaleString('en-IN')}
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 font-bold text-[#7FB706]">
                        ₹{Number(inv.totalAmount).toLocaleString('en-IN')}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={inv.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* PDF Preview */}
                          <button
                            onClick={() => handleOpenPdf(inv)}
                            className="p-2 rounded-lg bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                            title="Preview PDF"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Document Flow Timeline */}
                          <button
                            onClick={() => setSelectedInvoiceForTimeline(inv)}
                            className="p-2 rounded-lg bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#B5F823] border border-[#7FB706]/30 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors shadow-sm"
                            title="View Document Flow Timeline (Status & Next Steps)"
                          >
                            <Layers className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(inv)}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                            title="Delete Invoice"
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

            {/* ── Mobile Cards ───────────────────────────────────────── */}
            <div className="md:hidden divide-y divide-white/5">
              {displayedInvoices.map((inv, idx) => (
                <div key={inv.id} className={`p-4 space-y-3 ${isDue(inv) ? 'border-l-2 border-l-red-500/40' : ''}`}>
                  {/* Header row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">#{serial(idx)}</span>
                        <span className="font-mono font-bold text-white text-sm">{inv.invoiceNumber}</span>
                        {inv.invoiceNumber?.startsWith('PPSK/') ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Kolkata
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-white/5 text-gray-400">
                            Main
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {(inv as any).customer?.legalName || '—'}
                      </div>
                    </div>
                    <StatusBadge status={inv.status} />
                  </div>

                  {/* Amounts */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-white/[0.02] rounded-xl p-2 text-center">
                      <div className="text-gray-500">Subtotal</div>
                      <div className="font-semibold text-gray-300 mt-0.5">₹{Number(inv.subtotal).toLocaleString('en-IN')}</div>
                    </div>
                    <div className="bg-white/[0.02] rounded-xl p-2 text-center">
                      <div className="text-gray-500">GST</div>
                      <div className="font-semibold text-gray-300 mt-0.5">₹{Number(inv.taxAmount).toLocaleString('en-IN')}</div>
                    </div>
                    <div className="bg-[#7FB706]/5 border border-[#7FB706]/10 rounded-xl p-2 text-center">
                      <div className="text-gray-500">Total</div>
                      <div className="font-bold text-[#7FB706] mt-0.5">₹{Number(inv.totalAmount).toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  {/* Dates row */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Issued: {new Date(inv.issueDate).toLocaleDateString('en-GB')}</span>
                    {inv.dueDate && (
                      <span className={isDue(inv) ? 'text-red-400 font-semibold' : ''}>
                        Due: {new Date(inv.dueDate).toLocaleDateString('en-GB')}
                      </span>
                    )}
                  </div>

                  {/* Linked doc */}
                  {(inv as any).salesOrderId && (
                    <Link
                      to={`/admin/dashboard/sales-orders/${(inv as any).salesOrderId}`}
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono text-blue-400 px-2.5 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      {(inv as any).orderNumber || 'Linked Sales Order'}
                    </Link>
                  )}

                  {/* Action buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      onClick={() => handleOpenPdf(inv)}
                      className="min-h-[40px] flex items-center justify-center gap-1.5 text-xs font-semibold bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20 rounded-xl"
                    >
                      <Eye className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button
                      onClick={() => setSelectedInvoiceForTimeline(inv)}
                      className="min-h-[40px] flex items-center justify-center gap-1.5 text-xs font-semibold bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30 rounded-xl"
                    >
                      <Layers className="w-3.5 h-3.5" /> Flow
                    </button>
                    <button
                      onClick={() => handleDelete(inv)}
                      className="min-h-[40px] flex items-center justify-center gap-1.5 text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Del
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Pagination ─────────────────────────────────────────── */}
            <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
              <span>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} invoices</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-default min-h-[32px]"
                >
                  ← Prev
                </button>
                <span className="font-mono text-gray-400">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-default min-h-[32px]"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── PDF Preview Modal ────────────────────────────────────────────── */}
      {showPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#0e0e1e] shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#7FB706]" />
                <div>
                  <span className="font-bold text-white text-sm">Invoice Preview</span>
                  {pdfInvoice && (
                    <span className="ml-2 text-xs font-mono text-gray-400">{pdfInvoice.invoiceNumber}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pdfHtml && (
                  <button
                    onClick={() => {
                      const w = window.open('', '_blank');
                      if (w) { w.document.write(pdfHtml); w.document.close(); w.focus(); w.print(); }
                    }}
                    className="px-3 py-1.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                  </button>
                )}
                <button
                  onClick={() => { setShowPdf(false); setPdfHtml(''); setPdfInvoice(null); }}
                  className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PDF content */}
            <div className="flex-1 overflow-hidden bg-[#0a0a14]">
              {loadingPdf ? (
                <div className="flex items-center justify-center h-full gap-3 text-gray-400">
                  <div className="animate-spin w-6 h-6 border-2 border-[#7FB706] border-t-transparent rounded-full" />
                  <span className="text-sm">Loading PDF…</span>
                </div>
              ) : (
                <iframe
                  srcDoc={pdfHtml}
                  className="w-full h-full border-none"
                  title={`Invoice ${pdfInvoice?.invoiceNumber}`}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Flow Timeline Modal for Individual Invoices */}
      {selectedInvoiceForTimeline && (
        <DocumentFlowTimelineModal
          isOpen={!!selectedInvoiceForTimeline}
          onClose={() => setSelectedInvoiceForTimeline(null)}
          title="Bill & Tax Invoice"
          stage={4}
          documentRef={selectedInvoiceForTimeline.invoiceNumber}
          currentStatus={selectedInvoiceForTimeline.status}
          statusDescription="Statutory GST Tax Invoice under CGST Act with itemized GST breakdown."
          linkedDocs={{
            invoiceId: selectedInvoiceForTimeline.id,
            invoiceNumber: selectedInvoiceForTimeline.invoiceNumber,
            orderId: (selectedInvoiceForTimeline as any).salesOrderId,
            orderNumber: (selectedInvoiceForTimeline as any).orderNumber,
            quotationId: (selectedInvoiceForTimeline as any).quotationId,
            quotationRef: (selectedInvoiceForTimeline as any).quotationRef,
          }}
          primaryDetailUrl={
            (selectedInvoiceForTimeline as any).salesOrderId
              ? `/admin/dashboard/sales-orders/${(selectedInvoiceForTimeline as any).salesOrderId}`
              : undefined
          }
        />
      )}
    </div>
  );
};

export default InvoicesPage;
