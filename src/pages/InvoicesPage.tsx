import React, { useEffect, useState, useCallback } from 'react';
import {
  Receipt, Search, Plus, RefreshCw, Eye, Trash2, Printer,
  ChevronRight, FileText, Package, Wrench, ShoppingBag,
  CheckCircle2, Clock, AlertCircle, XCircle, CreditCard,
  ArrowRight, Filter, X, ExternalLink, Layers, Building2, Edit,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { invoicesApi } from '../api/invoicesApi';
import DocumentFlowTimelineModal from '../components/common/DocumentFlowTimelineModal';
import type { Invoice, InvoiceStatus } from '../types/admin';
import { isKolkataBranch, filterByBranch } from '../utils/branchHelper';
import { useAdminAuth } from '../context/AdminAuthContext';

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
  const { user } = useAdminAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || (user as any)?.roleSlug?.toLowerCase().includes('super') || (user as any)?.isSuperAdmin === true;

  const [invoices, setInvoices]         = useState<Invoice[]>([]);
  const [total, setTotal]               = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [page, setPage]                 = useState(1);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState<'ALL' | 'MAIN' | 'KOLKATA'>('ALL');
  const [isLoading, setIsLoading]       = useState(true);

  // Deletion Request States (Non-superadmin request / Super Admin review)
  const [selectedInvoiceForDelete, setSelectedInvoiceForDelete] = useState<Invoice | null>(null);
  const [showRequestDeleteModal, setShowRequestDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [submittingDeleteRequest, setSubmittingDeleteRequest] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingRejection, setSubmittingRejection] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);

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
      const rawItems = Array.isArray(data.data?.items)
        ? data.data.items
        : Array.isArray(data.data)
        ? data.data
        : Array.isArray((data as any)?.items)
        ? (data as any).items
        : Array.isArray(data)
        ? data
        : [];
      setInvoices(rawItems);
      setTotal(data.data?.total ?? rawItems.length);
      setTotalPages(data.data?.totalPages ?? 1);
    } catch {
      /* silent */
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, branchFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const displayedInvoices = filterByBranch(invoices, branchFilter);

  const handleDelete = async (inv: Invoice) => {
    const isPending = (inv as any)?.metadata?.deleteRequest?.status === 'PENDING';
    setSelectedInvoiceForDelete(inv);

    if (isPending) {
      if (isSuperAdmin) {
        setRejectionReason('');
        setShowReviewModal(true);
      } else {
        if (confirm(`A deletion request for Bill ${inv.invoiceNumber} is currently pending Super Admin review.\n\nWould you like to cancel/withdraw this request?`)) {
          try {
            await invoicesApi.cancelDeletion(inv.id);
            alert('Deletion request cancelled.');
            fetchInvoices();
          } catch (err: any) {
            alert(err?.response?.data?.message || err.message || 'Failed to cancel deletion request');
          }
        }
      }
      return;
    }

    if (!isSuperAdmin) {
      setDeleteReason('');
      setShowRequestDeleteModal(true);
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete Tax Invoice ${inv.invoiceNumber}? This action cannot be undone.`)) return;
    try {
      await invoicesApi.delete(inv.id);
      fetchInvoices();
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to delete invoice.');
    }
  };

  const handleSendDeletionRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedInvoiceForDelete) return;
    if (!deleteReason.trim()) {
      alert('Please specify a reason for the deletion request.');
      return;
    }
    setSubmittingDeleteRequest(true);
    try {
      await invoicesApi.requestDeletion(selectedInvoiceForDelete.id, deleteReason.trim());
      alert('Deletion request submitted to Super Admin successfully.');
      setShowRequestDeleteModal(false);
      setDeleteReason('');
      fetchInvoices();
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to submit deletion request');
    } finally {
      setSubmittingDeleteRequest(false);
    }
  };

  const handleApproveDeletion = async () => {
    if (!selectedInvoiceForDelete) return;
    if (!confirm(`Approve deletion request and permanently delete Tax Invoice ${selectedInvoiceForDelete.invoiceNumber}? This action cannot be undone.`)) return;
    setSubmittingApproval(true);
    try {
      await invoicesApi.delete(selectedInvoiceForDelete.id);
      alert('Invoice deleted successfully.');
      setShowReviewModal(false);
      fetchInvoices();
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to delete invoice');
    } finally {
      setSubmittingApproval(false);
    }
  };

  const handleRejectDeletion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedInvoiceForDelete) return;
    setSubmittingRejection(true);
    try {
      await invoicesApi.rejectDeletion(selectedInvoiceForDelete.id, rejectionReason.trim());
      alert('Deletion request rejected.');
      setShowReviewModal(false);
      setRejectionReason('');
      fetchInvoices();
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to reject deletion request');
    } finally {
      setSubmittingRejection(false);
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
              <p className="text-xs text-gray-400">Stage 03 — GST tax invoices, payment tracking &amp; receivables</p>
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
          { label: 'Proforma Invoices', path: '/admin/dashboard/proforma-invoices', icon: Receipt, color: 'text-amber-400',   bg: 'bg-amber-500/10' },
          { label: 'Packing Lists', path: '/admin/dashboard/packing-lists',   icon: Package,    color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Issue Lists',   path: '/admin/dashboard/issue-lists',     icon: Wrench,     color: 'text-purple-400',  bg: 'bg-purple-500/10' },
          { label: 'Payments',      path: '/admin/dashboard/payments',        icon: CreditCard, color: 'text-blue-400',   bg: 'bg-blue-500/10' },
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
            <p className="text-xs text-gray-500">Create a new invoice or generate one directly from a Proforma Invoice.</p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Link
                to="/admin/dashboard/invoices/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/30 rounded-xl text-xs font-semibold hover:bg-[#7FB706]/25"
              >
                <Plus className="w-3.5 h-3.5" /> New Invoice
              </Link>
              <Link
                to="/admin/dashboard/proforma-invoices"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 text-gray-300 border border-white/10 rounded-xl text-xs font-semibold hover:bg-white/10"
              >
                <Receipt className="w-3.5 h-3.5" /> From Proforma Invoice
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
                    <th className="py-3 px-4">Linked Document</th>
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
                      onClick={() => navigate(`/admin/dashboard/invoices/${inv.id}`)}
                      className={`hover:bg-white/[0.025] transition-colors group cursor-pointer ${isDue(inv) ? 'border-l-2 border-l-red-500/40' : ''}`}
                    >
                      {/* # */}
                      <td className="py-3 px-4 text-center font-mono text-gray-500 text-xs">{serial(idx)}</td>

                      {/* Invoice number */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-white group-hover:text-[#7FB706] transition-colors flex items-center gap-1.5">
                          {inv.invoiceNumber}
                          {isKolkataBranch(inv) ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Kolkata
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-white/5 text-gray-400">
                              Main
                            </span>
                          )}
                          {isDue(inv) && <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/10 text-red-400 font-bold">OVERDUE</span>}
                          {(inv as any)?.metadata?.deleteRequest?.status === 'PENDING' && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                              title={`Deletion requested: ${(inv as any)?.metadata?.deleteRequest?.reason || ''}`}
                            >
                              <AlertCircle className="w-2.5 h-2.5 text-amber-400" />
                              Deletion Requested
                            </span>
                          )}
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
                          {(inv as any).customer?.legalName || (inv as any).party?.legalName || (inv as any).metadata?.billTo?.partyName || (inv as any).metadata?.shipTo?.partyName || 'Valued Customer'}
                        </div>
                        {inv.projectId && (
                          <div className="text-[11px] text-gray-500 font-mono">Project linked</div>
                        )}
                      </td>

                      {/* Linked doc */}
                      <td className="py-3 px-4">
                        {(inv as any).proformaInvoiceId || (inv as any).linkedPi?.id ? (
                          <Link
                            to={`/admin/dashboard/proforma-invoices/${(inv as any).proformaInvoiceId || (inv as any).linkedPi?.id}`}
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:text-amber-300 px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20"
                          >
                            <FileText className="w-3 h-3" />
                            {(inv as any).linkedPi?.piNumber || 'Proforma Invoice'}
                          </Link>
                        ) : (inv as any).quotationId ? (
                          <Link
                            to={`/admin/dashboard/sales-quotations/${(inv as any).quotationId}`}
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-purple-400 hover:text-purple-300 px-2 py-1 bg-purple-500/10 rounded-lg border border-purple-500/20"
                          >
                            <FileText className="w-3 h-3" />
                            {(inv as any).quotationRef || 'Quotation'}
                          </Link>
                        ) : (inv as any).salesOrderId ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-400 px-2 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            {(inv as any).orderNumber || 'Order'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-600 italic">Direct Bill</span>
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
                          {/* Edit Bill */}
                          <Link
                            to={`/admin/dashboard/invoices/${inv.id}/edit`}
                            className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                            title="Edit Bill Details"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

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

                          {/* Delete / Request Deletion */}
                          <button
                            onClick={() => handleDelete(inv)}
                            className={`p-2 rounded-lg cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors ${
                              (inv as any)?.metadata?.deleteRequest?.status === 'PENDING'
                                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30'
                                : 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                            }`}
                            title={
                              (inv as any)?.metadata?.deleteRequest?.status === 'PENDING'
                                ? isSuperAdmin
                                  ? 'Review Deletion Request (Super Admin)'
                                  : 'Deletion Request Pending'
                                : isSuperAdmin
                                ? 'Delete Invoice (Super Admin)'
                                : 'Request Deletion to Super Admin'
                            }
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
                        {isKolkataBranch(inv) ? (
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
                        {(inv as any).customer?.legalName || (inv as any).party?.legalName || (inv as any).metadata?.billTo?.partyName || (inv as any).metadata?.shipTo?.partyName || 'Valued Customer'}
                      </div>
                      {(inv as any)?.metadata?.deleteRequest?.status === 'PENDING' && (
                        <div className="mt-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-400" />
                            Deletion Requested
                          </span>
                        </div>
                      )}
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
                  {((inv as any).proformaInvoiceId || (inv as any).linkedPi?.id) ? (
                    <Link
                      to={`/admin/dashboard/proforma-invoices/${(inv as any).proformaInvoiceId || (inv as any).linkedPi?.id}`}
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono text-amber-400 px-2.5 py-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20"
                    >
                      <Receipt className="w-3 h-3" />
                      {(inv as any).linkedPi?.piNumber || 'Linked Proforma Invoice'}
                    </Link>
                  ) : (inv as any).quotationId ? (
                    <Link
                      to={`/admin/dashboard/sales-quotations/${(inv as any).quotationId}`}
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono text-purple-400 px-2.5 py-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20"
                    >
                      <FileText className="w-3 h-3" />
                      {(inv as any).quotationRef || 'Linked Quotation'}
                    </Link>
                  ) : null}

                  {/* Action buttons */}
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    <Link
                      to={`/admin/dashboard/invoices/${inv.id}`}
                      className="min-h-[40px] flex items-center justify-center gap-1 text-xs font-semibold bg-white/10 text-white rounded-xl"
                    >
                      <Receipt className="w-3.5 h-3.5 text-[#7FB706]" /> View
                    </Link>
                    <Link
                      to={`/admin/dashboard/invoices/${inv.id}/edit`}
                      className="min-h-[40px] flex items-center justify-center gap-1 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </Link>
                    <button
                      onClick={() => handleOpenPdf(inv)}
                      className="min-h-[40px] flex items-center justify-center gap-1 text-xs font-semibold bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20 rounded-xl"
                    >
                      <Eye className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button
                      onClick={() => setSelectedInvoiceForTimeline(inv)}
                      className="min-h-[40px] flex items-center justify-center gap-1 text-xs font-semibold bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30 rounded-xl"
                    >
                      <Layers className="w-3.5 h-3.5" /> Flow
                    </button>
                    <button
                      onClick={() => handleDelete(inv)}
                      className={`min-h-[40px] flex items-center justify-center gap-1 text-xs font-semibold rounded-xl border ${
                        (inv as any)?.metadata?.deleteRequest?.status === 'PENDING'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {(inv as any)?.metadata?.deleteRequest?.status === 'PENDING'
                        ? isSuperAdmin ? 'Review' : 'Pending'
                        : isSuperAdmin ? 'Del' : 'Req'}
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
          stage={3}
          documentRef={selectedInvoiceForTimeline.invoiceNumber}
          currentStatus={selectedInvoiceForTimeline.status}
          statusDescription="Statutory GST Tax Invoice under CGST Act with itemized GST breakdown."
          linkedDocs={{
            invoiceId: selectedInvoiceForTimeline.id,
            invoiceNumber: selectedInvoiceForTimeline.invoiceNumber,
            piId: (selectedInvoiceForTimeline as any).proformaInvoiceId,
            quotationId: (selectedInvoiceForTimeline as any).quotationId,
            quotationRef: (selectedInvoiceForTimeline as any).quotationRef,
          }}
          primaryDetailUrl={`/admin/dashboard/invoices/${selectedInvoiceForTimeline.id}`}
        />
      )}

      {/* Request Bill Deletion Modal (for non-superadmins) */}
      {showRequestDeleteModal && selectedInvoiceForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#1e1e38] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#121226]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Request Deletion • {selectedInvoiceForDelete.invoiceNumber}
                </h3>
              </div>
              <button
                onClick={() => setShowRequestDeleteModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendDeletionRequest} className="p-5 space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300">
                Only Super Admins can directly delete GST Tax Invoices. Submitting this request will flag the invoice and notify Super Admins for review.
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Reason for Deletion <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Duplicated invoice, wrong tax rate, client cancelled order, etc."
                  rows={4}
                  required
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#7FB706] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestDeleteModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDeleteRequest || !deleteReason.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-amber-600/20 transition cursor-pointer"
                >
                  {submittingDeleteRequest ? 'Submitting...' : 'Send Request to Super Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Review Pending Deletion Request Modal */}
      {showReviewModal && selectedInvoiceForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#1e1e38] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#121226]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Review Bill Deletion Request</h3>
                  <p className="text-[11px] text-gray-400 font-mono">{selectedInvoiceForDelete.invoiceNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-[#0a0a1a] border border-white/10 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-400">
                  <span>Requested By:</span>
                  <span className="font-semibold text-white">
                    {(selectedInvoiceForDelete as any).metadata?.deleteRequest?.requestedByName || (selectedInvoiceForDelete as any).metadata?.deleteRequest?.requestedByEmail || 'User'}
                  </span>
                </div>
                {(selectedInvoiceForDelete as any).metadata?.deleteRequest?.requestedAt && (
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Requested Date:</span>
                    <span className="text-gray-200">
                      {new Date((selectedInvoiceForDelete as any).metadata.deleteRequest.requestedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/5">
                  <span className="text-gray-400 font-semibold block mb-1">Reason provided:</span>
                  <p className="text-amber-200/90 italic bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                    "{(selectedInvoiceForDelete as any).metadata?.deleteRequest?.reason || 'No reason specified'}"
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Rejection Note (Optional, only if rejecting)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Optional reason for rejecting the deletion request..."
                  rows={2}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#7FB706] resize-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold transition"
                >
                  Close
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRejectDeletion}
                    disabled={submittingRejection}
                    className="px-4 py-2 bg-white/10 hover:bg-white/15 text-gray-200 rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    {submittingRejection ? 'Rejecting...' : 'Reject Request'}
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveDeletion}
                    disabled={submittingApproval}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-rose-600/20 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {submittingApproval ? 'Deleting...' : 'Approve & Delete Bill'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
