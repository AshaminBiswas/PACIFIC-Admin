import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Receipt, ArrowLeft, Printer, Download, Eye, Edit, Trash2,
  CheckCircle2, Clock, AlertCircle, XCircle, CreditCard,
  Plus, Calendar, Truck, User, Building2, MapPin,
  ExternalLink, Layers, DollarSign, ShieldCheck, X, RefreshCw,
  FileText, Check, ChevronRight
} from 'lucide-react';
import { invoicesApi } from '../api/invoicesApi';
import type { Invoice, InvoiceStatus } from '../types/admin';
import DocumentFlowTimeline from '../components/common/DocumentFlowTimeline';
import { isKolkataBranch } from '../utils/branchHelper';

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  DRAFT:          { label: 'Draft',          cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20',         icon: <Clock className="w-3.5 h-3.5" /> },
  SENT:           { label: 'Sent',           cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',          icon: <ChevronRight className="w-3.5 h-3.5" /> },
  VIEWED:         { label: 'Viewed',         cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20',    icon: <Eye className="w-3.5 h-3.5" /> },
  PARTIALLY_PAID: { label: 'Partially Paid', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',       icon: <Clock className="w-3.5 h-3.5" /> },
  PAID:           { label: 'Fully Paid',     cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  OVERDUE:        { label: 'Overdue',        cls: 'bg-red-500/10 text-red-400 border-red-500/20',             icon: <AlertCircle className="w-3.5 h-3.5" /> },
  CANCELLED:      { label: 'Cancelled',      cls: 'bg-gray-500/10 text-gray-500 border-gray-600/20',          icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PDF Preview State
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfHtml, setPdfHtml] = useState<string>('');
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Record Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'NEFT_RTGS',
    referenceNumber: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Status Change State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus>('DRAFT');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Quick Transport Edit Modal State
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [savingTransport, setSavingTransport] = useState(false);
  const [transportForm, setTransportForm] = useState({
    vehicleNumber: '',
    modeOfTransport: 'By Road',
    grLrNumber: '',
    placeOfSupply: '',
  });

  const handleOpenTransportModal = () => {
    const tr = (invoice as any)?.transport || {};
    setTransportForm({
      vehicleNumber: tr.vehicleNumber || '',
      modeOfTransport: tr.modeOfTransport || 'By Road',
      grLrNumber: tr.grLrNumber || '',
      placeOfSupply: tr.placeOfSupply || (invoice as any)?.billTo?.state || 'West Bengal',
    });
    setShowTransportModal(true);
  };

  const handleSaveTransport = async () => {
    if (!id) return;
    setSavingTransport(true);
    try {
      await invoicesApi.update(id, {
        transport: {
          ...((invoice as any)?.transport || {}),
          vehicleNumber: transportForm.vehicleNumber.trim(),
          modeOfTransport: transportForm.modeOfTransport.trim(),
          grLrNumber: transportForm.grLrNumber.trim(),
          placeOfSupply: transportForm.placeOfSupply.trim(),
        },
        vehicleNumber: transportForm.vehicleNumber.trim(),
        modeOfTransport: transportForm.modeOfTransport.trim(),
        grLrNumber: transportForm.grLrNumber.trim(),
        placeOfSupply: transportForm.placeOfSupply.trim(),
      });
      setShowTransportModal(false);
      await fetchInvoice();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update transport details');
    } finally {
      setSavingTransport(false);
    }
  };

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await invoicesApi.getById(id);
      const data = res.data?.data || (res.data as any);
      setInvoice(data);
      if (data?.status) setSelectedStatus(data.status);
    } catch (err: any) {
      console.error('Failed to load invoice:', err);
      setError(err?.response?.data?.message || err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // Handle PDF Preview
  const handleOpenPdf = async () => {
    if (!invoice) return;
    setShowPdfModal(true);
    setLoadingPdf(true);
    try {
      const res = await invoicesApi.getPdfHtml(invoice.id);
      const html = typeof res.data === 'string' ? res.data : (res as any).data?.data || '';
      setPdfHtml(html);
    } catch (err) {
      console.error('Failed to render PDF preview:', err);
      alert('Failed to load PDF preview.');
      setShowPdfModal(false);
    } finally {
      setLoadingPdf(false);
    }
  };

  const handlePrintPdf = () => {
    if (!pdfHtml) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(pdfHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // Handle Payment Record
  const handleOpenPaymentModal = () => {
    if (!invoice) return;
    const balance = Number(invoice.balanceDue !== undefined ? invoice.balanceDue : invoice.totalAmount);
    setPaymentForm({
      amount: balance > 0 ? String(balance) : '',
      paymentMethod: 'NEFT_RTGS',
      referenceNumber: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: `Payment for Bill ${invoice.invoiceNumber}`,
    });
    setShowPaymentModal(true);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || submittingPayment) return;
    const amt = Number(paymentForm.amount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setSubmittingPayment(true);
    try {
      await invoicesApi.recordPayment(invoice.id, {
        amount: amt,
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber,
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes,
      });
      alert('Payment recorded successfully!');
      setShowPaymentModal(false);
      await fetchInvoice();
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Handle Status Update
  const handleUpdateStatus = async () => {
    if (!invoice || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      await invoicesApi.update(invoice.id, { status: selectedStatus });
      setShowStatusModal(false);
      await fetchInvoice();
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!invoice) return;
    if (!window.confirm(`Are you sure you want to delete Tax Invoice ${invoice.invoiceNumber}? This action cannot be undone.`)) {
      return;
    }
    try {
      await invoicesApi.delete(invoice.id);
      alert('Tax Invoice deleted successfully.');
      navigate('/admin/dashboard/invoices');
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to delete invoice');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin w-10 h-10 border-3 border-[#7FB706] border-t-transparent rounded-full" />
        <p className="text-gray-400 text-sm">Loading Tax Invoice details...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-8 text-center space-y-4 max-w-lg mx-auto bg-[#121226] border border-white/5 rounded-2xl my-12">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Invoice Not Found</h2>
        <p className="text-sm text-gray-400">{error || 'The requested Tax Invoice could not be located.'}</p>
        <Link
          to="/admin/dashboard/invoices"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>
      </div>
    );
  }

  const isKolkata = isKolkataBranch(invoice) || (invoice.invoiceNumber || '').startsWith('PPSK/');
  const currentStatus = invoice.effectiveStatus || invoice.status;
  const statusMeta = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.DRAFT;

  const totalBill = Number(invoice.totalAmount || 0);
  const advanceRecv = Number(invoice.advanceReceived || 0);
  const balanceOutstanding = Number(invoice.balanceDue !== undefined ? invoice.balanceDue : Math.max(0, totalBill - advanceRecv));
  const paidPercent = totalBill > 0 ? Math.min(100, Math.round((advanceRecv / totalBill) * 100)) : 0;

  const billTo = invoice.billTo || {};
  const shipTo = invoice.shipTo || billTo;
  const transport = invoice.transport || {};
  const items = invoice.items || [];
  const allocations = invoice.paymentAllocations || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 px-2 sm:px-4">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/dashboard/invoices')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Back to Invoices"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                {invoice.invoiceNumber}
              </span>
              {isKolkata ? (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Kolkata Branch
                </span>
              ) : (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Main (Delhi)
                </span>
              )}
              <button
                onClick={() => setShowStatusModal(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${statusMeta.cls} hover:opacity-80`}
                title="Click to update status"
              >
                {statusMeta.icon}
                <span>{statusMeta.label}</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Issued on {new Date(invoice.issueDate).toLocaleDateString('en-GB')}
              {invoice.dueDate && ` • Due ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={handleOpenPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm min-h-[42px]"
          >
            <Eye className="w-4 h-4 text-[#7FB706]" />
            <span>Preview &amp; Print</span>
          </button>

          <button
            onClick={handleOpenPaymentModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-lg shadow-emerald-600/20 min-h-[42px]"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>

          <Link
            to={`/admin/dashboard/invoices/${invoice.id}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-[#7FB706]/20 min-h-[42px]"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Bill</span>
          </Link>

          <button
            onClick={handleDelete}
            className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer transition-colors min-h-[42px] min-w-[42px] flex items-center justify-center"
            title="Delete Invoice"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Document Flow Pipeline Stage Indicator */}
      <DocumentFlowTimeline
        currentStage={3}
        linkedDocs={{
          quotationId: invoice.quotationId,
          piId: invoice.proformaInvoiceId,
          piNumber: invoice.linkedPi?.piNumber,
          orderId: invoice.orderId,
          orderNumber: (invoice.order as any)?.orderNumber,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        }}
        advanceInfo={{
          grandTotal: totalBill,
          advanceReceived: advanceRecv,
          advancePaymentStatus: currentStatus,
        }}
      />

      {/* Linked Proforma Invoice Notification Banner */}
      {invoice.linkedPi && (
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-blue-300 font-semibold uppercase tracking-wider">Converted from Proforma Invoice</div>
              <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                <span className="font-mono">{invoice.linkedPi.piNumber}</span>
                <span className="text-xs font-normal text-gray-400">
                  (PI Total: ₹{Number(invoice.linkedPi.grandTotal || 0).toLocaleString('en-IN')})
                </span>
              </div>
            </div>
          </div>
          <Link
            to={`/admin/dashboard/proforma-invoices/${invoice.linkedPi.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-xl text-xs font-semibold transition-colors self-start sm:self-auto"
          >
            <span>View Proforma Invoice</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Commercial Advance & Payment Reconciliation Hero / KPI Cards */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#7FB706]/10 text-[#7FB706]">
              <DollarSign className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Commercial Payment &amp; Advance Tracking
            </h2>
          </div>
          <span className="text-xs text-gray-400">
            Reconciles advance from linked PI &amp; direct payments
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Bill Value */}
          <div className="bg-[#0a0a1a] border border-white/5 rounded-xl p-4">
            <div className="text-xs text-gray-400 font-medium">Total Bill Value</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              ₹{totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Inclusive of GST &amp; Freight</div>
          </div>

          {/* Card 2: Advance Received */}
          <div className="bg-[#0a0a1a] border border-white/5 rounded-xl p-4">
            <div className="text-xs text-gray-400 font-medium">Total Received (Advance)</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              ₹{advanceRecv.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-emerald-500 mt-1">
              {paidPercent}% collected {invoice.linkedPi ? '(includes PI advance)' : ''}
            </div>
          </div>

          {/* Card 3: Balance Outstanding */}
          <div className="bg-[#0a0a1a] border border-white/5 rounded-xl p-4">
            <div className="text-xs text-gray-400 font-medium">Balance Outstanding</div>
            <div className={`text-2xl font-bold font-mono mt-1 ${balanceOutstanding <= 0 ? 'text-gray-400' : 'text-amber-400'}`}>
              ₹{balanceOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-amber-500/80 mt-1">
              {balanceOutstanding <= 0 ? 'Fully settled' : 'Pending payment'}
            </div>
          </div>

          {/* Card 4: Settlement Progress */}
          <div className="bg-[#0a0a1a] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Settlement Status</span>
                <span className="font-bold text-white">{paidPercent}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${paidPercent >= 100 ? 'bg-emerald-500' : 'bg-[#7FB706]'}`}
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
            </div>
            <button
              onClick={handleOpenPaymentModal}
              className="mt-3 w-full py-1.5 px-3 rounded-lg bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record More Advance</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two-Column Party & Transport Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bill to Party */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#7FB706]" />
              <span>Bill to Party</span>
            </div>
            <Link
              to={`/admin/dashboard/invoices/${invoice.id}/edit`}
              className="text-[11px] text-[#7FB706] hover:text-[#90cf08] hover:underline font-semibold flex items-center gap-1 cursor-pointer transition lowercase tracking-normal"
            >
              <Edit className="w-3 h-3" /> Edit
            </Link>
          </div>
          <div className="space-y-1.5 text-xs text-gray-300">
            <div className="text-sm font-bold text-white">{billTo.partyName || 'M/s.'}</div>
            <div className="text-gray-400">{billTo.address || 'Address not specified'}</div>
            <div className="pt-1">
              <span className="text-gray-500">GSTIN: </span>
              <span className="font-mono font-semibold text-white">{billTo.gstin || 'Unregistered / UR'}</span>
            </div>
            <div>
              <span className="text-gray-500">State: </span>
              <span className="text-gray-200">{billTo.state || 'West Bengal'}</span>
              <span className="text-gray-500 ml-3">Code: </span>
              <span className="font-mono text-gray-200">{billTo.stateCode || '19'}</span>
            </div>
          </div>
        </div>

        {/* Ship to Party */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-400" />
              <span>Ship to Party</span>
            </div>
            <Link
              to={`/admin/dashboard/invoices/${invoice.id}/edit`}
              className="text-[11px] text-[#7FB706] hover:text-[#90cf08] hover:underline font-semibold flex items-center gap-1 cursor-pointer transition lowercase tracking-normal"
            >
              <Edit className="w-3 h-3" /> Edit
            </Link>
          </div>
          <div className="space-y-1.5 text-xs text-gray-300">
            <div className="text-sm font-bold text-white">{shipTo.partyName || billTo.partyName || 'M/s.'}</div>
            <div className="text-gray-400">{shipTo.address || billTo.address || 'Same as billing address'}</div>
            <div className="pt-1">
              <span className="text-gray-500">GSTIN: </span>
              <span className="font-mono font-semibold text-white">{shipTo.gstin || billTo.gstin || 'Unregistered / UR'}</span>
            </div>
            <div>
              <span className="text-gray-500">State: </span>
              <span className="text-gray-200">{shipTo.state || billTo.state || 'West Bengal'}</span>
              <span className="text-gray-500 ml-3">Code: </span>
              <span className="font-mono text-gray-200">{shipTo.stateCode || billTo.stateCode || '19'}</span>
            </div>
          </div>
        </div>

        {/* Dispatch & Transport Details */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-400" />
              <span>Dispatch &amp; Transport</span>
            </div>
            <button
              onClick={handleOpenTransportModal}
              className="text-[11px] text-[#7FB706] hover:text-[#90cf08] hover:underline font-semibold flex items-center gap-1 cursor-pointer transition lowercase tracking-normal"
            >
              <Edit className="w-3 h-3" /> Edit
            </button>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Mode of Transport:</span>
              <span className="font-semibold text-white">{transport.modeOfTransport || 'By Road'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Vehicle No:</span>
              <span className="font-mono font-semibold text-white">{transport.vehicleNumber || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">GR / LR / RR No:</span>
              <span className="font-mono text-gray-300">{transport.grLrNumber || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Place of Supply:</span>
              <span className="text-gray-200">{transport.placeOfSupply || billTo.state || 'West Bengal'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Reverse Charge:</span>
              <span className="text-gray-200">{transport.reverseCharge ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table Card */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#7FB706]" />
            <h3 className="text-sm font-bold text-white">Line Items (Goods &amp; Services)</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-mono">{items.length} items</span>
            <Link
              to={`/admin/dashboard/invoices/${invoice.id}/edit`}
              className="text-xs text-[#7FB706] hover:text-[#90cf08] hover:underline font-semibold flex items-center gap-1 cursor-pointer transition"
            >
              <Edit className="w-3 h-3" /> Edit Items &amp; Rates
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#0a0a1a] text-gray-500 uppercase border-b border-white/5 font-semibold">
              <tr>
                <th className="py-3 px-3 text-center w-12">S.L.</th>
                <th className="py-3 px-4">Description of Goods</th>
                <th className="py-3 px-3 text-center">HSN/SAC</th>
                <th className="py-3 px-3 text-right">Qty.</th>
                <th className="py-3 px-3 text-center">Unit</th>
                <th className="py-3 px-4 text-right">Rate</th>
                <th className="py-3 px-4 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((it: any, idx: number) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 text-center font-mono text-gray-500">
                    {String(it.serialNumber || idx + 1).padStart(2, '0')}
                  </td>
                  <td className="py-3 px-4 font-medium text-white">
                    {it.description}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-gray-400">
                    {it.hsnSac || '48239019'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-gray-200">
                    {Number(it.quantity || 1).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-center text-gray-400">
                    {it.unit || "No's"}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-300">
                    ₹{Number(it.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-white">
                    ₹{Number(it.amount || (Number(it.quantity || 1) * Number(it.rate || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Totals Footer */}
        <div className="bg-[#0a0a1a] p-4 border-t border-white/5">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="text-xs text-gray-400 max-w-md space-y-2">
              <div>
                <span className="font-semibold text-gray-300">Statutory Notice:</span> Printed Tax Invoice reflects clean statutory format without advance deduction, strictly matching official tax regulations.
              </div>
              {invoice.notes && !invoice.notes.startsWith('{') && (
                <div className="text-gray-500 italic">
                  Note: {invoice.notes}
                </div>
              )}
            </div>

            <div className="w-full sm:w-80 space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5 text-gray-400">
                <span>Subtotal (Basic Value):</span>
                <span className="font-mono text-white">₹{Number(invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {Number(invoice.freightAmount || 0) > 0 ? (
                <div className="flex justify-between py-1 border-b border-white/5 text-gray-400">
                  <span>Add : Freight Charges:</span>
                  <span className="font-mono text-white">₹{Number(invoice.freightAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ) : (invoice as any).freightTerms ? (
                <div className="flex justify-between py-1 border-b border-white/5 text-gray-400">
                  <span>Freight Terms:</span>
                  <span className="text-gray-300 text-xs font-semibold">{(invoice as any).freightTerms}</span>
                </div>
              ) : null}
              <div className="flex justify-between py-1 border-b border-white/5 text-gray-400">
                <span>GST Tax Amount (18%):</span>
                <span className="font-mono text-white">₹{Number(invoice.taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {Number(invoice.roundingAdjustment || 0) !== 0 && (
                <div className="flex justify-between py-1 border-b border-white/5 text-gray-400">
                  <span>Rounding Adjustment:</span>
                  <span className="font-mono text-white">₹{Number(invoice.roundingAdjustment).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t-2 border-white/10 font-bold text-sm">
                <span className="text-white">Grand Total:</span>
                <span className="font-mono text-[#7FB706]">₹{Number(invoice.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Allocation History Card */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Payments &amp; Advance Allocations History
            </h3>
          </div>
          <button
            onClick={handleOpenPaymentModal}
            className="text-xs font-semibold text-[#7FB706] hover:underline cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Record Payment
          </button>
        </div>

        {allocations.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-xs">
            No payments or advances have been allocated to this invoice yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#0a0a1a] text-gray-500 uppercase border-b border-white/5">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Reference / UTR</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-right font-bold">Allocated Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {allocations.map((alloc: any, idx: number) => {
                  const p = alloc.payment || {};
                  const isPiAlloc = alloc.documentType === 'PI' || Boolean(alloc.proformaInvoiceId);
                  const pDate = p.paymentDate || alloc.createdAt;
                  return (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-mono text-gray-400">
                        {pDate ? new Date(pDate).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-gray-300 font-mono text-[11px]">
                          {p.paymentMethod || 'NEFT_RTGS'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-300">
                        {p.referenceNumber || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        {isPiAlloc ? (
                          <span className="text-[11px] font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            Linked PI Advance
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Direct Bill Payment
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-gray-400">
                        {p.notes || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        ₹{Number(alloc.allocatedAmount || p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Record Payment on Bill</h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Payment Amount (₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 25000"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-[#7FB706]"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Outstanding balance: ₹{balanceOutstanding.toLocaleString('en-IN')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                  >
                    <option value="NEFT_RTGS">NEFT / RTGS</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Reference / UTR / Cheque No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR12345678 or Chq #4492"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional notes or remarks..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingPayment ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Change Invoice Status</h3>
              <button onClick={() => setShowStatusModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                {(['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'] as InvoiceStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStatus(st)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                      selectedStatus === st
                        ? 'border-[#7FB706] bg-[#7FB706]/10 text-white'
                        : 'border-white/5 bg-white/[0.02] text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>{st}</span>
                    {selectedStatus === st && <Check className="w-4 h-4 text-[#7FB706]" />}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={updatingStatus}
                  className="px-5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {updatingStatus ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Transport Edit Modal */}
      {showTransportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#181830] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#121226]">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#7FB706]" />
                <h3 className="text-sm font-bold text-white">Update Dispatch & Transport</h3>
              </div>
              <button
                onClick={() => setShowTransportModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Vehicle Number</label>
                <input
                  type="text"
                  value={transportForm.vehicleNumber}
                  onChange={(e) => setTransportForm({ ...transportForm, vehicleNumber: e.target.value })}
                  placeholder="e.g. DL1LAV0507 or WB 25K 4361"
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Mode of Transport</label>
                <input
                  type="text"
                  value={transportForm.modeOfTransport}
                  onChange={(e) => setTransportForm({ ...transportForm, modeOfTransport: e.target.value })}
                  placeholder="e.g. By Road"
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">GR / LR / RR Number</label>
                <input
                  type="text"
                  value={transportForm.grLrNumber}
                  onChange={(e) => setTransportForm({ ...transportForm, grLrNumber: e.target.value })}
                  placeholder="e.g. LR-98432"
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Place of Supply</label>
                <input
                  type="text"
                  value={transportForm.placeOfSupply}
                  onChange={(e) => setTransportForm({ ...transportForm, placeOfSupply: e.target.value })}
                  placeholder="e.g. West Bengal or Delhi"
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransportModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTransport}
                  disabled={savingTransport}
                  className="px-5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {savingTransport ? 'Saving...' : 'Save Transport'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1e1e38] border border-white/10 rounded-2xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between bg-[#121226]">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#7FB706]" />
                <h3 className="text-sm font-bold text-white">
                  Statutory Tax Invoice Preview — {invoice.invoiceNumber}
                </h3>
                <span className="text-[10px] text-gray-400 hidden sm:inline">(Clean Tax Invoice • No QR code)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPdf}
                  className="px-3 py-1.5 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Iframe */}
            <div className="flex-1 bg-gray-200 overflow-hidden relative">
              {loadingPdf ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 bg-gray-900/40">
                  <RefreshCw className="w-8 h-8 text-[#7FB706] animate-spin" />
                  <p className="text-white text-xs font-semibold">Generating document...</p>
                </div>
              ) : (
                <iframe
                  title="Tax Invoice PDF Preview"
                  srcDoc={pdfHtml}
                  className="w-full h-full border-0 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
