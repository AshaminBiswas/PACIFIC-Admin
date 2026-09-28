import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle2,
  CheckCircle,
  AlertTriangle,
  Printer,
  X,
  Eye,
  Trash2,
  Edit,
  ArrowRight,
  ShieldCheck,
  Building2,
  Truck,
  Layers,
  MapPin,
  Calendar,
  DollarSign,
  Send,
  Sparkles,
  Phone,
  MessageCircle,
  AlertCircle,
  ChevronRight,
  HelpCircle,
  Wrench,
} from 'lucide-react';
import { piApi } from '../api/proformaApi';
import type { ProformaInvoice, PIStatus } from '../types/admin';
import DocumentFlowTimeline from '../components/common/DocumentFlowTimeline';
import { calculateGstSplit, isDelhiState } from '../utils/tax';

function parseItemSpecs(item: any) {
  let mainDesc = item.description || item.itemDescription || '—';
  const specs: { label: string; value: string }[] = [];

  // Direct properties
  if (item.cubicleSize) specs.push({ label: 'Size', value: item.cubicleSize });
  if (item.boardColor) specs.push({ label: 'Color', value: item.boardColor });
  if (item.boardThickness) specs.push({ label: 'Thickness', value: item.boardThickness });
  else if (item.boardType) specs.push({ label: 'Board', value: item.boardType });
  if (item.doorSize) specs.push({ label: 'Door', value: item.doorSize });
  if (item.overallHeight) specs.push({ label: 'Height', value: item.overallHeight });
  if (item.hardwarePackage) specs.push({ label: 'Hardware', value: item.hardwarePackage });

  // If specs were serialized into the description string, e.g. "Pacific ...\n(Board: ... | Color: ...)"
  if (specs.length === 0 && mainDesc.includes('(') && mainDesc.includes(')')) {
    const match = mainDesc.match(/^(.*?)(?:\n|\s*)\((.*?)\)$/s);
    if (match) {
      mainDesc = match[1].trim();
      const parts = match[2].split('|').map((s: string) => s.trim());
      for (const part of parts) {
        const colonIdx = part.indexOf(':');
        if (colonIdx > -1) {
          specs.push({
            label: part.substring(0, colonIdx).trim(),
            value: part.substring(colonIdx + 1).trim(),
          });
        }
      }
    }
  }

  return { mainDesc, specs };
}

export default function ProformaInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pi, setPi] = useState<ProformaInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Advance modal state
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'NEFT_RTGS',
    referenceNumber: '',
    notes: '',
  });
  const [recordingAdvance, setRecordingAdvance] = useState(false);

  // Status changer modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<PIStatus>('DRAFT');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // PDF modal state
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfHtml, setPdfHtml] = useState('');
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Action loaders
  const [issuing, setIssuing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadPi = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await piApi.getById(id);
      const data = res.data?.data ?? (res.data as any);
      setPi(data);
      setSelectedStatus(data.status);
      setAdvanceForm((prev) => ({
        ...prev,
        amount: Math.max(0, (Number(data.advanceRequiredAmount) || Math.round(Number(data.grandTotal) * 0.5)) - (Number(data.advanceReceivedAmount) || 0)),
      }));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load Proforma Invoice details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPi();
  }, [loadPi]);

  // Issue PI
  const handleIssuePi = async () => {
    if (!pi || issuing) return;
    if (!confirm(`Are you sure you want to officially issue Proforma Invoice ${pi.piNumber}? This will lock commercial terms.`)) return;
    setIssuing(true);
    try {
      await piApi.issue(pi.id);
      await loadPi();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to issue Proforma Invoice.');
    } finally {
      setIssuing(false);
    }
  };

  // Convert to Sales Order
  const handleConvertToOrder = async () => {
    if (!pi || converting) return;
    const reqAdv = Number(pi.advanceRequiredAmount) || (Number(pi.grandTotal) * 0.5);
    const recvAdv = Number(pi.advanceReceivedAmount) || 0;
    if (recvAdv < reqAdv) {
      if (!confirm(`Warning: Required advance (₹${reqAdv.toLocaleString('en-IN')}) is not yet fully received (Current: ₹${recvAdv.toLocaleString('en-IN')}). Proceed with converting to production Sales Order anyway?`)) {
        return;
      }
    }
    setConverting(true);
    try {
      const res = await piApi.convertToOrder(pi.id);
      const createdOrder = res.data?.data ?? (res.data as any);
      alert(`Success! Sales Order ${createdOrder?.orderNumber || ''} created.`);
      navigate(`/admin/dashboard/sales-orders/${createdOrder?.id}`);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to convert to Sales Order.');
    } finally {
      setConverting(false);
    }
  };

  // Record Advance
  const handleRecordAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pi || recordingAdvance) return;
    setRecordingAdvance(true);
    try {
      await piApi.recordAdvancePayment(pi.id, advanceForm);
      setShowAdvanceModal(false);
      await loadPi();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to record advance payment.');
    } finally {
      setRecordingAdvance(false);
    }
  };

  // Change Status
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pi || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      await piApi.updateStatus(pi.id, selectedStatus, statusNotes);
      setShowStatusModal(false);
      setStatusNotes('');
      await loadPi();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update PI status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Open PDF Preview
  const handleOpenPdf = async () => {
    if (!pi) return;
    setShowPdfModal(true);
    setLoadingPdf(true);
    try {
      const token = localStorage.getItem('pacific_access_token');
      const res = await fetch(piApi.getPdfUrl(pi.id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const html = await res.text();
      setPdfHtml(html);
    } catch (err) {
      setPdfHtml('<p style="color:red;padding:2rem;">Failed to load PDF preview.</p>');
    } finally {
      setLoadingPdf(false);
    }
  };

  // Delete PI
  const handleDeletePi = async () => {
    if (!pi || deleting) return;
    if (!confirm(`Are you sure you want to permanently delete Proforma Invoice ${pi.piNumber}? This action cannot be undone.`)) return;
    setDeleting(true);
    try {
      await piApi.delete(pi.id);
      navigate('/admin/dashboard/proforma-invoices');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete Proforma Invoice.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-[#7FB706] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 font-mono text-sm">Loading Proforma Invoice Details...</p>
      </div>
    );
  }

  if (error || !pi) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-[#121226] border border-red-500/20 rounded-2xl text-center space-y-4 shadow-2xl">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Error Loading Proforma Invoice</h2>
        <p className="text-sm text-gray-400">{error || 'Record could not be found or has been deleted.'}</p>
        <Link
          to="/admin/dashboard/proforma-invoices"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Proforma Invoices
        </Link>
      </div>
    );
  }

  // Calculations & metadata
  const grandTotal = Number(pi.grandTotal) || 0;
  const reqAdv = Number(pi.advanceRequiredAmount) || Math.round(grandTotal * 0.5);
  const recvAdv = Number(pi.advanceReceivedAmount) || 0;
  const balanceAdv = Math.max(0, reqAdv - recvAdv);
  const totalBalanceDue = Math.max(0, grandTotal - recvAdv);
  const advStatus = pi.advancePaymentStatus || (recvAdv >= reqAdv ? 'FULLY_RECEIVED' : recvAdv > 0 ? 'PARTIAL' : 'PENDING');
  const advPct = reqAdv > 0 ? Math.min(100, Math.round((recvAdv / reqAdv) * 100)) : 0;

  const billTo = pi.parties?.find((p) => p.partyRole === 'BILL_TO') || {
    partyName: pi.customer?.legalName || 'Valued Client',
    addressLine: 'Registered Address',
    gstin: pi.customer?.gstin,
    state: pi.placeOfSupply,
    stateCode: pi.placeOfSupplyStateCode,
    phone: pi.customer?.phone,
    email: pi.customer?.email,
  };

  const shipTo = pi.parties?.find((p) => p.partyRole === 'SHIP_TO') || billTo;

  return (
    <div className="space-y-6 pb-20">
      {/* ── Top Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/dashboard/proforma-invoices')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Back to list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-white flex items-center gap-2">
                {pi.status === 'ISSUED' && <ShieldCheck className="w-6 h-6 text-[#7FB706]" />}
                {pi.piNumber}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus(pi.status);
                  setShowStatusModal(true);
                }}
                className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 cursor-pointer hover:ring-2 hover:ring-[#7FB706]/50 transition-all ${
                  pi.status === 'ISSUED'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : pi.status === 'DRAFT'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : pi.status === 'CONVERTED'
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}
                title="Click to Change Status"
              >
                <span>{pi.status}</span>
                <Edit className="w-3 h-3 opacity-60" />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 pl-10">
            Created on {new Date(pi.piDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} • Place of Supply: {pi.placeOfSupply} ({pi.placeOfSupplyStateCode})
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Follow-up Hub */}
          <Link
            to={`/admin/dashboard/proforma-invoices/${pi.id}/follow-up`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/10"
          >
            <Clock className="w-4 h-4" /> Follow-Up Hub
          </Link>

          {/* Record Advance Modal trigger */}
          <button
            onClick={() => setShowAdvanceModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <CreditCard className="w-4 h-4" /> + Advance Payment
          </button>

          {/* Convert to Sales Order */}
          {pi.convertedOrderId ? (
            <Link
              to={`/admin/dashboard/sales-orders/${pi.convertedOrderId}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition-all"
            >
              <ArrowRight className="w-4 h-4" /> View Sales Order
            </Link>
          ) : (
            <button
              onClick={handleConvertToOrder}
              disabled={converting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#7FB706]/20 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {converting ? 'Converting...' : 'Convert to Order (Stage 3)'}
            </button>
          )}

          {/* PDF Preview */}
          <button
            onClick={handleOpenPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#7FB706]" /> PDF Preview
          </button>

          {/* Issue PI */}
          {pi.status === 'DRAFT' && (
            <button
              onClick={handleIssuePi}
              disabled={issuing}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-[#7FB706]/20 hover:bg-[#7FB706]/30 text-[#7FB706] border border-[#7FB706]/40 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {issuing ? 'Issuing...' : 'Issue Officially'}
            </button>
          )}

          {/* Prominent Status Changer Trigger */}
          <button
            onClick={() => {
              setSelectedStatus(pi.status);
              setShowStatusModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] border border-[#7FB706]/40 rounded-xl text-xs font-bold transition-all shadow-md shadow-[#7FB706]/10 cursor-pointer"
            title="Change PI Status"
          >
            <CheckCircle2 className="w-4 h-4" /> Change Status
          </button>

          {/* Edit PI */}
          <Link
            to={`/admin/dashboard/proforma-invoices/${pi.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white/5 hover:bg-white/10 text-amber-300 rounded-xl text-xs font-semibold transition-all"
            title="Edit Proforma Invoice"
          >
            <Edit className="w-4 h-4" /> Edit
          </Link>

          {/* Delete PI */}
          <button
            onClick={handleDeletePi}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            title="Delete Proforma Invoice"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Universal 7-Stage Document Timeline (Stage 2 highlighted) ── */}
      <DocumentFlowTimeline
        currentStage={2}
        documentRef={pi.piNumber}
        currentStatus={pi.status}
        linkedDocs={{
          piId: pi.id,
          piNumber: pi.piNumber,
          quotationId: pi.quotationId || undefined,
          quotationRef: pi.quotationRef || undefined,
          orderId: pi.convertedOrderId || pi.orderId || undefined,
        }}
        advanceInfo={{
          grandTotal,
          advanceRequired: reqAdv,
          advanceReceived: recvAdv,
          advancePaymentStatus: advStatus,
        }}
      />

      {/* ── Originating Quotation Banner ───────────────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase font-semibold">Originating Quotation</div>
            {pi.quotationRef ? (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono font-bold text-white text-base">{pi.quotationRef}</span>
                {pi.quotationId ? (
                  <Link
                    to={`/admin/dashboard/sales-quotations/${pi.quotationId}`}
                    className="text-xs text-blue-400 hover:text-blue-300 underline font-medium flex items-center gap-1"
                  >
                    View Quotation 360 <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : (
                  <span className="text-xs text-gray-500">(Converted from Quote)</span>
                )}
              </div>
            ) : (
              <div className="font-bold text-white text-sm mt-0.5">
                Standalone Proforma Invoice <span className="text-xs text-gray-500 font-normal">(Direct client order)</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pi.linkedPoNumber && (
            <div className="text-xs bg-white/[0.03] border border-white/5 px-3 py-1.5 rounded-xl">
              <span className="text-gray-400">Client PO:</span> <span className="font-mono text-white font-bold">{pi.linkedPoNumber}</span>
              {pi.linkedPoDate && <span className="text-gray-500 text-[11px] ml-1">({new Date(pi.linkedPoDate).toLocaleDateString('en-GB')})</span>}
            </div>
          )}
          {pi.reverseCharge && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Reverse Charge Applicable
            </span>
          )}
        </div>
      </div>

      {/* ── Advance Payment Tracking Hero ──────────────────────── */}
      <div className="bg-gradient-to-br from-[#121226] via-[#101026] to-[#0c0c1e] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Commercial Advance Payment Tracking</h3>
              <p className="text-xs text-gray-400">Required precondition before unlocking factory production and materials reservation.</p>
            </div>
          </div>
          <span
            className={`self-start sm:self-auto text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
              advStatus === 'FULLY_RECEIVED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : advStatus === 'PARTIAL'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}
          >
            {advStatus === 'FULLY_RECEIVED' ? '✓ Advance Cleared (100%)' : advStatus === 'PARTIAL' ? '⚡ Partial Advance' : '⏳ Advance Pending'}
          </span>
        </div>

        {/* 4 KPI Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
            <span className="text-[11px] text-gray-400">Total Proforma Bill</span>
            <div className="text-lg sm:text-xl font-black text-white mt-1">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <span className="text-[10px] text-gray-500 font-mono">100% Bill Value</span>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
            <span className="text-[11px] text-gray-400">Required Advance ({Number(pi.advancePercentage) || 50}%)</span>
            <div className="text-lg sm:text-xl font-black text-amber-400 mt-1">₹ {reqAdv.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <span className="text-[10px] text-gray-500">Prerequisite to fabrication</span>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
            <span className="text-[11px] text-gray-400">Received Advance</span>
            <div className="text-lg sm:text-xl font-black text-emerald-400 mt-1">₹ {recvAdv.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <span className="text-[10px] text-emerald-500 font-semibold">{advPct}% of required</span>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
            <span className="text-[11px] text-gray-400">Balance Total Remaining</span>
            <div className="text-lg sm:text-xl font-black text-rose-400 mt-1">₹ {totalBalanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <span className="text-[10px] text-rose-500 font-semibold">{balanceAdv > 0 ? `₹${balanceAdv.toLocaleString('en-IN')} advance pending` : 'Ready for order conversion'}</span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Advance Clearance Progress:</span>
            <span className="font-mono font-bold text-white">{advPct}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                advStatus === 'FULLY_RECEIVED' ? 'bg-emerald-500' : advStatus === 'PARTIAL' ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${advPct}%` }}
            />
          </div>
        </div>

        {/* Last payment info if available */}
        {pi.advancePaymentDate && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5 text-xs text-gray-400">
            <span>Last Payment Date: <strong className="text-white">{new Date(pi.advancePaymentDate).toLocaleDateString('en-GB')}</strong></span>
            {pi.advancePaymentReference && <span>Ref/UTR: <strong className="text-white font-mono">{pi.advancePaymentReference}</strong></span>}
            {pi.advancePaymentMode && <span>Mode: <strong className="text-white">{pi.advancePaymentMode}</strong></span>}
          </div>
        )}
      </div>

      {/* ── Bill To & Ship To 2-Column Grid ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bill To */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <Building2 className="w-4 h-4 text-[#7FB706]" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Billing Party (Customer)</h4>
          </div>
          <div className="space-y-1 text-xs">
            <div className="text-base font-bold text-white">{billTo.partyName}</div>
            {billTo.gstin && (
              <div className="text-gray-400">GSTIN: <span className="font-mono font-bold text-amber-300">{billTo.gstin}</span></div>
            )}
            {(() => {
              const panFromAddr = billTo.addressLine?.match(/PAN:\s*([A-Z0-9]{10})/i)?.[1];
              const pan = (pi.customer as any)?.pan || (billTo as any).pan || panFromAddr;
              if (!pan) return null;
              return (
                <div className="text-gray-400">
                  PAN: <span className="font-mono font-bold text-gray-200">{pan}</span>
                </div>
              );
            })()}
            <div className="text-gray-300 leading-relaxed pt-1">{billTo.addressLine}</div>
            <div className="text-gray-400">State: <span className="text-white">{billTo.state} ({billTo.stateCode})</span></div>
            {billTo.phone && <div className="text-gray-400">Phone: <span className="text-white">{billTo.phone}</span></div>}
            {billTo.email && <div className="text-gray-400">Email: <span className="text-white">{billTo.email}</span></div>}
          </div>
        </div>

        {/* Ship To */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Delivery Site / Shipping Party</h4>
          </div>
          <div className="space-y-1 text-xs">
            <div className="text-base font-bold text-white">{shipTo.partyName}</div>
            {shipTo.gstin && (
              <div className="text-gray-400">GSTIN: <span className="font-mono font-bold text-amber-300">{shipTo.gstin}</span></div>
            )}
            <div className="text-gray-300 leading-relaxed pt-1">{shipTo.addressLine}</div>
            <div className="text-gray-400">State: <span className="text-white">{shipTo.state} ({shipTo.stateCode})</span></div>
            {shipTo.phone && <div className="text-gray-400">Site Contact Phone: <span className="text-white">{shipTo.phone}</span></div>}
            {pi.modeOfTransport && <div className="text-gray-400">Mode of Transport: <span className="text-white font-medium">{pi.modeOfTransport}</span></div>}
            {pi.vehicleNumber && <div className="text-gray-400">Vehicle No: <span className="text-white font-mono">{pi.vehicleNumber}</span></div>}
            {pi.grLrNumber && <div className="text-gray-400">GR/LR No: <span className="text-white font-mono">{pi.grLrNumber}</span></div>}
          </div>
        </div>
      </div>

      {/* ── Line Items (Matches Quotation UI) ───────────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#7FB706]" />
            <h3 className="text-sm font-bold text-white">Line Items</h3>
          </div>
          <span className="text-xs font-mono text-gray-400">{pi.items?.length || 0} line items</span>
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-gray-300">
            <thead className="bg-[#0a0a1a] text-xs uppercase text-gray-500 border-b border-white/5">
              <tr>
                <th className="py-3 px-4 text-center w-10">S.No</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center w-16">Unit</th>
                <th className="py-3 px-4 text-right w-16">Qty</th>
                <th className="py-3 px-4 text-right w-28">Rate (₹)</th>
                <th className="py-3 px-4 text-right w-28">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pi.items && pi.items.length > 0 ? (
                pi.items.map((it, idx) => {
                  const rate = Number(it.rate ?? 0);
                  const qty = Number(it.quantity ?? 0);
                  const amount = Number(it.taxableAmount ?? (qty * rate));
                  const { mainDesc, specs } = parseItemSpecs(it);
                  return (
                    <tr key={it.id ?? idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-gray-400">{it.serialNumber ?? idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{mainDesc}</div>
                        {specs.length > 0 && (
                          <div className="mt-1 text-[11px] text-gray-500 space-y-0.5">
                            {specs.map((s, sIdx) => (
                              <div key={sIdx}>• {s.label}: {s.value}</div>
                            ))}
                          </div>
                        )}
                        {it.product?.name && it.product.name !== mainDesc && (
                          <div className="text-[11px] text-gray-400 mt-1 font-mono">SKU: {it.product.sku || it.product.name}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-400">{it.unit || 'NOS'}</td>
                      <td className="py-3 px-4 text-right font-mono">{qty}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        {rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-white">
                        {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">No line items recorded on this Proforma Invoice.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-white/5">
            {pi.items?.map((it, idx) => {
              const rate = Number(it.rate ?? 0);
              const qty = Number(it.quantity ?? 0);
              const amount = Number(it.taxableAmount ?? (qty * rate));
              const { mainDesc, specs } = parseItemSpecs(it);
              return (
                <div key={it.id ?? idx} className="p-4 space-y-1">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <span className="text-xs text-gray-500 font-mono">#{it.serialNumber ?? idx + 1}</span>
                      <div className="font-medium text-white text-sm">{mainDesc}</div>
                      {specs.length > 0 && (
                        <div className="mt-1 text-[11px] text-gray-500 space-y-0.5">
                          {specs.map((s, sIdx) => (
                            <div key={sIdx}>• {s.label}: {s.value}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-[#7FB706] font-mono text-sm ml-3">
                      ₹ {amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {qty} {it.unit || 'NOS'} × ₹{rate.toLocaleString('en-IN')}
                  </div>
                </div>
              );
            })}
          </div>

        {/* ── Tax Summary & Financial Breakdown Dock ────────── */}
        <div className="p-5 bg-[#0a0a1a] border-t border-white/5 flex flex-col md:flex-row justify-between gap-6">
          {/* Tax Slabs breakdown */}
          <div className="space-y-2 flex-1">
            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">GST Tax Summary</h5>
            {pi.taxSummary && pi.taxSummary.length > 0 ? (
              <div className="space-y-1 text-xs">
                {pi.taxSummary.map((ts, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 font-mono">
                    <span className="text-gray-300">GST @ {Number(ts.gstRate)}% (Taxable: ₹{Number(ts.taxableAmount).toLocaleString('en-IN')})</span>
                    <span className="text-white font-bold">Tax: ₹{Number(ts.totalTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Consolidated 18% GST applicable.</p>
            )}

            {/* Amount in words */}
            {pi.amountInWords && (
              <div className="pt-2 text-xs text-gray-400">
                <span className="font-semibold text-gray-300">Amount in Words:</span>
                <p className="italic text-gray-300 mt-0.5">{pi.amountInWords}</p>
              </div>
            )}
          </div>

          {/* Financial Totals */}
          <div className="w-full md:w-80 space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-300">
              <span>Subtotal:</span>
              <span className="font-mono">₹{Number(pi.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {Number(pi.freightAmount) > 0 && (
              <div className="flex items-center justify-between text-gray-300">
                <span>Freight &amp; Handling:</span>
                <span className="font-mono">₹{Number(pi.freightAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {(() => {
              const totalTax = Number(pi.totalTaxAmount || (pi as any).taxAmount || 0);
              const subtotalNum = Number(pi.subtotal || (pi as any).taxableAmount || 0);

              const breakdown = calculateGstSplit(
                subtotalNum,
                pi.placeOfSupplyStateCode || billTo.stateCode,
                pi.placeOfSupply || billTo.state,
                false,
                18,
                pi.customer?.gstin || billTo.gstin,
                billTo.addressLine || billTo.state
              );

              const isDelhi = breakdown.isDelhi || isDelhiState(
                pi.placeOfSupplyStateCode || billTo.stateCode,
                pi.placeOfSupply || billTo.state,
                pi.customer?.gstin || billTo.gstin,
                billTo.addressLine
              );

              if (isDelhi) {
                const halfTax = totalTax > 0 ? totalTax / 2 : breakdown.cgstAmount;
                const cgst = Number(pi.cgstAmount || 0) > 0 ? Number(pi.cgstAmount) : halfTax;
                const sgst = Number(pi.sgstAmount || 0) > 0 ? Number(pi.sgstAmount) : halfTax;
                return (
                  <>
                    <div className="flex items-center justify-between text-blue-400">
                      <span>CGST (9%):</span>
                      <span className="font-mono font-semibold">₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center justify-between text-blue-400">
                      <span>SGST (9%):</span>
                      <span className="font-mono font-semibold">₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                );
              }

              const igst = Number(pi.igstAmount || 0) > 0 ? Number(pi.igstAmount) : (totalTax > 0 ? totalTax : breakdown.igstAmount);
              return (
                <div className="flex items-center justify-between text-purple-400">
                  <span>IGST (18%):</span>
                  <span className="font-mono font-semibold">₹{igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              );
            })()}
            {Number(pi.roundingAdjustment) !== 0 && (
              <div className="flex items-center justify-between text-gray-400">
                <span>Rounding Adjustment:</span>
                <span className="font-mono">₹{Number(pi.roundingAdjustment).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-base font-bold text-[#7FB706] pt-2 border-t border-white/10">
              <span>Grand Total:</span>
              <span className="font-mono">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Standard Inclusions & Hardware Accessories Card ───── */}
      {(() => {
        const hardwareTerm = pi.terms?.find(
          (t) =>
            t.text?.toLowerCase().includes('hardware accessories') ||
            t.text?.toLowerCase().includes('standard inclusions')
        );
        if (!hardwareTerm) return null;
        const content = hardwareTerm.text
          .replace(/^Standard Inclusions & Hardware Accessories:\s*/i, '')
          .trim();
        return (
          <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#7FB706]" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Standard Inclusions &amp; Hardware Accessories
                </h4>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#7FB706]/10 text-[#7FB706] font-semibold">
                Factory Specifications
              </span>
            </div>
            <div className="text-xs text-gray-300 whitespace-pre-line leading-relaxed bg-[#0a0a1a] p-4 rounded-xl border border-white/5 font-sans">
              {content}
            </div>
          </div>
        );
      })()}

      {/* ── Terms & Conditions Card ────────────────────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Commercial Terms &amp; Conditions</h4>
          </div>
          <span className="text-xs text-gray-500 font-mono">
            {((pi.terms || []).filter(
              (t) =>
                !t.text?.toLowerCase().includes('hardware accessories') &&
                !t.text?.toLowerCase().includes('standard inclusions')
            )).length} Clauses
          </span>
        </div>

        <div className="space-y-1.5 text-xs text-gray-300">
          {(() => {
            const standardTerms = (pi.terms || []).filter(
              (t) =>
                !t.text?.toLowerCase().includes('hardware accessories') &&
                !t.text?.toLowerCase().includes('standard inclusions')
            );
            return standardTerms.length > 0 ? (
              standardTerms.map((t, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="font-mono text-gray-500 shrink-0">{idx + 1}.</span>
                  <p className="leading-relaxed">{t.text}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic">
                Standard statutory terms apply (Goods once sold will not be returned; 18% p.a. interest on overdue; Subject to Delhi jurisdiction).
              </p>
            );
          })()}
        </div>
      </div>

      {/* ── Status History & Follow-ups Timeline ───────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-bold text-white">Document History &amp; Audit Trail</h4>
          </div>
          <Link
            to={`/admin/dashboard/proforma-invoices/${pi.id}/follow-up`}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
          >
            Open Full Follow-Up Hub <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="space-y-3">
          {pi.statusHistory && pi.statusHistory.length > 0 ? (
            pi.statusHistory.map((sh, idx) => (
              <div key={sh.id || idx} className="flex items-start gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-[#7FB706] mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{sh.toStatus}</span>
                    <span className="text-gray-500 font-mono">{new Date(sh.createdAt).toLocaleString('en-GB')}</span>
                  </div>
                  {sh.comment && <p className="text-gray-400 mt-0.5">{sh.comment}</p>}
                  {sh.changedBy && (
                    <span className="text-[11px] text-gray-500">By: {sh.changedBy.firstName || 'Staff'} {sh.changedBy.lastName || ''}</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 italic">No status history logged yet.</p>
          )}
        </div>
      </div>

      {/* ── MODAL: Record Advance Payment ──────────────────────── */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0e0e1e]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Record Advance Payment</h3>
              </div>
              <button
                onClick={() => setShowAdvanceModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordAdvance} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs space-y-1">
                <div className="text-gray-400 font-mono">PI: <span className="text-white font-bold">{pi.piNumber}</span></div>
                <div className="text-gray-400">Total Bill: <span className="text-white font-bold">₹{grandTotal.toLocaleString('en-IN')}</span></div>
                <div className="text-gray-400">Required Advance: <span className="text-amber-400 font-bold">₹{reqAdv.toLocaleString('en-IN')}</span></div>
                <div className="text-gray-400">Already Received: <span className="text-emerald-400 font-bold">₹{recvAdv.toLocaleString('en-IN')}</span></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: Number(e.target.value) })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white font-bold text-lg focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Payment Mode</label>
                  <select
                    value={advanceForm.paymentMode}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, paymentMode: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs"
                  >
                    <option value="NEFT_RTGS">NEFT / RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={advanceForm.paymentDate}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, paymentDate: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">UTR / Cheque / Txn Ref *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR123891041 or CHQ-00129"
                  value={advanceForm.referenceNumber}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, referenceNumber: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Remittance bank, branch, or verified by..."
                  value={advanceForm.notes}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingAdvance}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {recordingAdvance ? 'Recording...' : 'Confirm Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Status Changer ──────────────────────────────── */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0e0e1e]">
              <h3 className="font-bold text-white text-base">Update PI Status</h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">Select New Status</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { id: 'DRAFT', label: 'Draft', color: 'border-amber-500/40 text-amber-300 bg-amber-500/10' },
                    { id: 'ISSUED', label: 'Issued', color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' },
                    { id: 'CONVERTED', label: 'Converted', color: 'border-blue-500/40 text-blue-300 bg-blue-500/10' },
                    { id: 'CANCELLED', label: 'Cancelled', color: 'border-rose-500/40 text-rose-300 bg-rose-500/10' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStatus(st.id as PIStatus)}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                        selectedStatus === st.id
                          ? `${st.color} ring-2 ring-[#7FB706]`
                          : 'border-white/5 bg-[#0a0a1a] text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="font-mono text-[10px] opacity-75">{st.id}</div>
                      <div>{st.label}</div>
                    </button>
                  ))}
                </div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as PIStatus)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-bold"
                >
                  <option value="DRAFT">DRAFT — In Progress / Estimate Draft</option>
                  <option value="ISSUED">ISSUED — Official Commercial Precondition</option>
                  <option value="CONVERTED">CONVERTED — Locked into Sales Order</option>
                  <option value="CANCELLED">CANCELLED — Voided</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Reason / Change Comment</label>
                <textarea
                  rows={3}
                  placeholder="Reason for status change..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer shadow-lg shadow-[#7FB706]/20"
                >
                  {updatingStatus ? 'Updating...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: A4 PDF Preview ──────────────────────────────── */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#0e0e1e]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#7FB706]" />
                <span className="font-bold text-white text-sm sm:text-base">Proforma Invoice A4 Preview ({pi.piNumber})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const iframe = document.getElementById('pi-detail-pdf-iframe') as HTMLIFrameElement;
                    if (iframe && iframe.contentWindow) {
                      iframe.contentWindow.focus();
                      iframe.contentWindow.print();
                      return;
                    }
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.open();
                      printWindow.document.write(pdfHtml);
                      printWindow.document.close();
                      printWindow.focus();
                      setTimeout(() => {
                        printWindow.print();
                      }, 500);
                    }
                  }}
                  className="px-3 py-1.5 bg-[#7FB706] text-[#030213] text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#7FB706]/20"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-white overflow-auto p-4 flex justify-center">
              {loadingPdf ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2 text-gray-800">
                  <div className="w-8 h-8 border-4 border-[#7FB706] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-mono">Generating Vector A4 PDF...</p>
                </div>
              ) : (
                <iframe
                  id="pi-detail-pdf-iframe"
                  title="PDF Preview"
                  srcDoc={pdfHtml}
                  className="w-full h-full border-0 shadow-lg max-w-[210mm] min-h-[297mm]"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
