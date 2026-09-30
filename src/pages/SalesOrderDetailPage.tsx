import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowLeft,
  Printer,
  Edit,
  CheckCircle2,
  Clock,
  Layers,
  Phone,
  FileText,
  Building2,
  MapPin,
  Calendar,
  Package,
  Wrench,
  CreditCard,
  Truck,
  ExternalLink,
  RefreshCw,
  Trash2,
  Ban,
  X,
  Sparkles,
  ChevronRight,
  Send,
  AlertCircle,
  Eye,
  Download,
  CheckCircle,
} from 'lucide-react';
import { salesOrdersApi } from '../api/salesOrdersApi';
import { piApi } from '../api/proformaApi';
import { salesQuotationsApi } from '../api/salesQuotationsApi';
import { invoicesApi } from '../api/invoicesApi';
import { packingListsApi } from '../api/packingListsApi';
import { hardwareIssueApi } from '../api/hardwareIssueApi';
import { useAdminAuth } from '../context/AdminAuthContext';
import DocumentFlowTimeline from '../components/common/DocumentFlowTimeline';
import type { SalesOrder, SalesOrderStatus } from '../types/admin';
import { calculateGstSplit, isDelhiState } from '../utils/tax';

function parseItemSpecs(item: any) {
  let mainDesc = item.description || item.itemDescription || 'Pacific Restroom Cubicle Item';
  const specs: { label: string; value: string }[] = [];

  const specsJson = item.specsJson || {};

  const boardType = item.boardType || specsJson.boardType;
  const boardThickness = item.boardThickness || specsJson.boardThickness;
  const boardColor = item.boardColor || specsJson.boardColor;
  const cubicleSize = item.cubicleSize || specsJson.cubicleSize;
  const doorSize = item.doorSize || specsJson.doorSize;
  const overallHeight = item.overallHeight || specsJson.overallHeight;
  const hardwarePackage = item.hardwarePackage || specsJson.hardwarePackage;

  if (boardType) specs.push({ label: 'Board Type', value: boardType });
  if (boardThickness) specs.push({ label: 'Board Thickness', value: boardThickness });
  if (boardColor) specs.push({ label: 'Board Color', value: boardColor });
  if (cubicleSize) specs.push({ label: 'Cubicle Size', value: cubicleSize });
  if (doorSize) specs.push({ label: 'Door Size', value: doorSize });
  if (overallHeight) specs.push({ label: 'Overall Height', value: overallHeight });
  if (hardwarePackage && !hardwarePackage.includes('Golden, Black, SS')) specs.push({ label: 'Hardware Package', value: hardwarePackage });

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

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; step: number }
> = {
  DRAFT: {
    label: 'Draft',
    color: 'text-gray-300',
    bg: 'bg-white/5',
    border: 'border-white/10',
    step: 1,
  },
  PENDING: {
    label: 'Pending Confirmation',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    step: 1,
  },
  PENDING_APPROVAL: {
    label: 'Pending Confirmation',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    step: 1,
  },
  WAITING_FOR_ADVANCE: {
    label: 'Waiting for Advance',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    step: 2,
  },
  APPROVED: {
    label: 'Approved for Fabrication',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    step: 3,
  },
  PI_ISSUED: {
    label: 'Proforma Issued',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    step: 3,
  },
  IN_PRODUCTION: {
    label: 'In Production / Fabrication',
    color: 'text-[#B5F823]',
    bg: 'bg-[#7FB706]/15',
    border: 'border-[#7FB706]/30',
    step: 4,
  },
  PARTIALLY_DISPATCHED: {
    label: 'Partially Dispatched',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    step: 5,
  },
  FULLY_DISPATCHED: {
    label: 'Fully Dispatched / Complete',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    step: 5,
  },
  COMPLETED: {
    label: 'Completed & Installed',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    step: 5,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    step: 0,
  },
};

export default function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAdminAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState<string>('APPROVED');
  const [statusReason, setStatusReason] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    siteName: '',
    siteAddress: '',
    clientPoNumber: '',
    clientPoDate: '',
    notes: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // PDF Preview Modal State
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfHtml, setPdfHtml] = useState<string>('');
  const [pdfTitle, setPdfTitle] = useState('Sales Order Confirmation');
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Generate Invoice State
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // Record Dispatch Modal State
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [recordingDispatch, setRecordingDispatch] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    transporterName: '',
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
    lrNumber: '',
    ewayBillNumber: '',
    totalPackages: 1,
    notes: '',
  });

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await salesOrdersApi.getById(id);
      const data = (res.data as any)?.data || res.data;
      setOrder(data);
      if (data) {
        setSelectedNewStatus(data.status);
        setEditForm({
          siteName: data.siteName || (data.shippingAddressSnapshot as any)?.siteName || '',
          siteAddress: data.siteAddress || (data.shippingAddressSnapshot as any)?.address || '',
          clientPoNumber: data.clientPoNumber || data.customerPoNumber || '',
          clientPoDate: data.clientPoDate
            ? new Date(data.clientPoDate).toISOString().split('T')[0]
            : data.customerPoDate
            ? new Date(data.customerPoDate).toISOString().split('T')[0]
            : '',
          notes: data.notes || data.statusReason || '',
        });
      }
    } catch (err: any) {
      console.error('Failed to load sales order:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleUpdateStatusSubmit = async () => {
    if (!id || !order) return;
    setUpdatingStatus(true);
    try {
      await salesOrdersApi.updateStatus(id, selectedNewStatus, statusReason.trim() || undefined);
      setShowStatusModal(false);
      setStatusReason('');
      fetchOrder();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveEditSubmit = async () => {
    if (!id || !order) return;
    setSavingEdit(true);
    try {
      await salesOrdersApi.update(id, editForm);
      setShowEditModal(false);
      fetchOrder();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update sales order');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!id || !order) return;
    const reason = prompt(`Enter cancellation reason for Order ${order.orderNumber}:`);
    if (!reason) return;
    try {
      await salesOrdersApi.cancel(id, reason);
      fetchOrder();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to cancel order');
    }
  };

  const handleDeleteOrder = async () => {
    if (!id || !order) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete Sales Order ${order.orderNumber}? This action cannot be undone.`
      )
    )
      return;
    try {
      await salesOrdersApi.delete(id);
      alert('Order deleted successfully');
      navigate('/admin/dashboard/sales-orders');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete order');
    }
  };

  const handleOpenPdfFromUrl = async (title: string, url: string) => {
    setPdfTitle(title);
    setShowPdfModal(true);
    setLoadingPdf(true);
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('pacific_access_token')}`,
        },
      });
      const html = await res.text();
      setPdfHtml(html);
    } catch (err) {
      console.error('Failed to load PDF:', err);
      setPdfHtml(
        '<div style="color:#ef4444;padding:40px;text-align:center;font-family:sans-serif;"><h3>Failed to load document vector PDF</h3><p>Please check your connection and try again.</p></div>'
      );
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleOpenOrderPdf = () => {
    if (!id || !order) return;
    handleOpenPdfFromUrl(`Sales Order — ${order.orderNumber}`, salesOrdersApi.getOrderPdfUrl(id));
  };

  const handleGenerateInvoice = async () => {
    if (!id || !order) return;
    if (!confirm(`Generate official GST Tax Invoice from Sales Order ${order.orderNumber}?`)) return;
    setGeneratingInvoice(true);
    try {
      const res = await salesOrdersApi.createInvoiceFromOrder(id);
      const inv = (res.data as any)?.data || res.data;
      const invNum = inv?.invoiceNumber || 'Tax Invoice';
      alert(`Tax Invoice generated successfully: ${invNum}`);
      fetchOrder();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to generate tax invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleRecordDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !order) return;
    setRecordingDispatch(true);
    try {
      const res = await salesOrdersApi.recordDispatch(id, {
        ...dispatchForm,
        totalPackages: Number(dispatchForm.totalPackages) || 1,
      });
      const disp = (res.data as any)?.data || res.data;
      alert(`Dispatch Challan & Gate Pass created successfully: ${disp?.dispatchNumber || 'Dispatched'}`);
      setShowDispatchModal(false);
      setDispatchForm({
        transporterName: '',
        vehicleNumber: '',
        driverName: '',
        driverPhone: '',
        lrNumber: '',
        ewayBillNumber: '',
        totalPackages: 1,
        notes: '',
      });
      fetchOrder();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to record dispatch');
    } finally {
      setRecordingDispatch(false);
    }
  };

  // Derived calculation values
  const totalQty = useMemo(
    () => (order?.items || []).reduce((sum, it) => sum + Number(it.quantity || 0), 0),
    [order?.items]
  );
  const dispQty = useMemo(
    () => (order?.items || []).reduce((sum, it) => sum + Number(it.dispatchedQuantity || 0), 0),
    [order?.items]
  );
  const fulfillmentPct = totalQty > 0 ? Math.min(100, Math.round((dispQty / totalQty) * 100)) : 0;

  // Contact person & phones
  const rawPhone =
    (order?.customer as any)?.contacts?.[0]?.phone ||
    order?.customer?.phone ||
    (order as any)?.siteContactSnapshot?.contactPhone ||
    '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const customerName = order?.customer?.legalName || order?.customer?.tradeName || 'Client';
  const siteInfo =
    order?.siteName ||
    (order as any)?.shippingAddressSnapshot?.siteName ||
    order?.siteAddress ||
    (order as any)?.shippingAddressSnapshot?.address ||
    'Standard Site';

  const isFromProforma =
    order?.source === 'CONVERTED_PROFORMA' ||
    Boolean(order?.proformaInvoiceId) ||
    Boolean(order?.piNumber);

  const isFromQuotation =
    order?.source === 'CONVERTED_QUOTATION' ||
    order?.source === 'FROM_QUOTATION' ||
    Boolean(order?.quotationId) ||
    Boolean(order?.quotationRef);

  const quotationRefNum = order?.quotationRef || order?.quotation?.referenceNumber;
  const piRefNum = order?.piNumber || (order as any)?.proformaInvoice?.piNumber;

  const billTo = useMemo(() => {
    const snap = (order?.billingAddressSnapshot as any) || {};
    const custAddr =
      (order?.customer as any)?.addresses?.find((a: any) => a.addressType === 'BILLING' || a.isDefaultBilling) ||
      (order?.customer as any)?.addresses?.[0];
    const partyName = snap.partyName || order?.customer?.legalName || order?.customer?.tradeName || 'Valued Client';
    const gstin = snap.gstin || order?.customer?.gstin;
    const pan = snap.pan || order?.customer?.pan || (gstin && gstin.length === 15 ? gstin.substring(2, 12) : undefined);
    const addressLine = snap.address || snap.addressLine || custAddr?.addressLine1 || 'Registered Billing Address';
    const state = snap.state || custAddr?.state || order?.placeOfSupply || 'Delhi';
    const stateCode = snap.stateCode || custAddr?.stateCode || order?.placeOfSupplyStateCode || '07';
    const pincode = snap.pincode || snap.postalCode || custAddr?.postalCode;
    const phone = snap.phone || order?.customer?.phone;
    const email = snap.email || order?.customer?.email;
    return { partyName, gstin, pan, addressLine, state, stateCode, pincode, phone, email };
  }, [order]);

  const shipTo = useMemo(() => {
    const snap = (order?.shippingAddressSnapshot as any) || {};
    const custAddr =
      (order?.customer as any)?.addresses?.find((a: any) => a.addressType === 'SHIPPING' || a.isDefaultShipping) ||
      (order?.customer as any)?.addresses?.[0];
    const partyName = snap.partyName || snap.recipient || snap.siteName || order?.siteName || billTo.partyName;
    const gstin = snap.gstin || billTo.gstin;
    const addressLine =
      snap.address || snap.addressLine || snap.siteAddress || order?.siteAddress || custAddr?.addressLine1 || billTo.addressLine;
    const state = snap.state || custAddr?.state || billTo.state;
    const stateCode = snap.stateCode || custAddr?.stateCode || billTo.stateCode;
    const pincode = snap.pincode || snap.postalCode || custAddr?.postalCode || billTo.pincode;
    const phone = snap.phone || (order as any)?.siteContactSnapshot?.contactPhone || billTo.phone;
    return { partyName, gstin, addressLine, state, stateCode, pincode, phone };
  }, [order, billTo]);

  const orderGst = useMemo(() => {
    if (!order) return null;
    const subtotal = Number(order.subtotal || 0);
    const freight = Number(order.freightAmount || 0);
    const taxableTotal = subtotal + freight;

    const activeGstin = billTo.gstin || (order.customer as any)?.gstin || (order.billingAddressSnapshot as any)?.gstin || null;
    return calculateGstSplit(
      taxableTotal,
      order.placeOfSupplyStateCode || billTo.stateCode,
      order.placeOfSupply || billTo.state,
      false,
      18,
      activeGstin,
      billTo.addressLine
    );
  }, [order, billTo]);

  // Follow-up timing badge
  const renderFollowupBadge = () => {
    if (!order) return null;
    if (order.status === 'FULLY_DISPATCHED' || order.status === 'COMPLETED') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Fulfilled & Dispatched
        </span>
      );
    }
    if (!order.nextFollowupDate) {
      return (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">
          Pending Setup
        </span>
      );
    }
    const diffMin = Math.round((new Date(order.nextFollowupDate).getTime() - Date.now()) / (60 * 1000));
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
        {new Date(order.nextFollowupDate).toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
        <div className="w-10 h-10 border-4 border-[#7FB706]/20 border-t-[#7FB706] rounded-full animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Loading Sales Order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-[#121226] border border-red-500/20 rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Order Not Found</h2>
        <p className="text-sm text-gray-400">{error || 'The requested sales order could not be retrieved.'}</p>
        <Link
          to="/admin/dashboard/sales-orders"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Sales Order Hub
        </Link>
      </div>
    );
  }

  const currentStatusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG['PENDING'];

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          to="/admin/dashboard/sales-orders"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sales Order Hub
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOrder()}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            title="Refresh Order Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Order Header & Title Banner */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-2.5 rounded-xl bg-[#7FB706]/10 text-[#7FB706]">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white font-mono">{order.orderNumber}</h1>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${currentStatusConfig.bg} ${currentStatusConfig.color} ${currentStatusConfig.border}`}
                >
                  {currentStatusConfig.label}
                </span>

                {isFromProforma && (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    title="Originating Proforma Invoice"
                  >
                    <CreditCard className="w-3 h-3 text-emerald-400" />
                    Proforma Convert: {piRefNum || 'PI Linked'}
                  </span>
                )}

                {isFromQuotation ? (
                  <Link
                    to={order.quotationId ? `/admin/dashboard/sales-quotations/${order.quotationId}` : '#'}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
                    title="View Linked Quotation 360"
                  >
                    <FileText className="w-3 h-3 text-amber-400" />
                    Quotation: {quotationRefNum || 'View Quote'}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                ) : !isFromProforma ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 text-gray-300">
                    Direct Order
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-gray-300 mt-1 font-medium">
                {customerName} • Site: <strong className="text-white">{siteInfo}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Omnichannel & Lifecycle Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Prominent Status Update Trigger */}
          <button
            onClick={() => setShowStatusModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-[#7FB706]/20 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" /> Update Status
          </button>

          {/* Dedicated Follow-Up Hub Button */}
          <button
            onClick={() => navigate(`/admin/dashboard/sales-orders/${id}/follow-up`)}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold rounded-xl text-sm transition-all cursor-pointer shadow-md"
          >
            <Clock className="w-4 h-4" /> Follow-Up ({order.followupCount || 0})
          </button>

          {/* Order PDF Preview */}
          <button
            onClick={handleOpenOrderPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            title="View vector A4 Sales Order Confirmation PDF with Order T&C"
          >
            <Eye className="w-4 h-4 text-cyan-400" /> Order PDF
          </button>

          {/* Generate Tax Invoice (Stage 4) */}
          <button
            onClick={handleGenerateInvoice}
            disabled={generatingInvoice}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
            title="Generate official GST Tax Invoice from this order"
          >
            <CreditCard className="w-4 h-4 text-purple-400" /> {generatingInvoice ? 'Generating...' : 'Tax Invoice'}
          </button>

          {/* Edit Order */}
          <Link
            to={`/admin/dashboard/sales-orders/${id}/edit`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-white/5 hover:bg-white/10 text-amber-300 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            title="Edit Order line items, technical specifications, addresses, and terms"
          >
            <Edit className="w-4 h-4" /> Edit
          </Link>

          {/* Print Acknowledgement */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print
          </button>

          {/* Cancel Order */}
          {order.status !== 'CANCELLED' && order.status !== 'FULLY_DISPATCHED' && (
            <button
              onClick={handleCancelOrder}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              <Ban className="w-4 h-4" /> Cancel
            </button>
          )}

          {/* Delete Order */}
          <button
            onClick={handleDeleteOrder}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* ── Document Flow Timeline (Stage 03) ───────────────────── */}
      <DocumentFlowTimeline
        currentStage={3}
        documentRef={order.orderNumber}
        currentStatus={order.status}
        linkedDocs={{
          quotationId: order.quotationId,
          quotationRef: quotationRefNum,
          orderId: order.id,
          orderNumber: order.orderNumber,
          piNumber: piRefNum,
        }}
        advanceInfo={{
          grandTotal: Number(order.grandTotal ?? order.totalAmount ?? 0),
          advanceRequired: Number(order.advanceRequiredAmount || 0),
          advanceReceived: Number(order.advanceReceivedAmount || 0),
          advancePaymentStatus: order.advancePaymentStatus,
        }}
      />

      {/* ── Bill To & Ship To 2-Column Grid ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bill To */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#7FB706]" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Billing Party (Customer)</h4>
            </div>
            {order.customer?.id && (
              <Link
                to={`/admin/dashboard/customers`}
                className="text-[11px] text-[#7FB706] hover:underline flex items-center gap-0.5"
              >
                CRM 360 <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            )}
          </div>
          <div className="space-y-1 text-xs">
            <div className="text-base font-bold text-white">{billTo.partyName}</div>
            {billTo.gstin && (
              <div className="text-gray-400">
                GSTIN: <span className="font-mono font-bold text-amber-300">{billTo.gstin}</span>
              </div>
            )}
            {billTo.pan && (
              <div className="text-gray-400">
                PAN: <span className="font-mono font-bold text-gray-200">{billTo.pan}</span>
              </div>
            )}
            <div className="text-gray-300 leading-relaxed pt-1">{billTo.addressLine}</div>
            <div className="text-gray-400">
              State: <span className="text-white">{billTo.state} ({billTo.stateCode})</span>
            </div>
            {billTo.pincode && (
              <div className="text-gray-400">
                Pincode: <span className="text-white font-mono">{billTo.pincode}</span>
              </div>
            )}
            {billTo.phone && <div className="text-gray-400">Phone: <span className="text-white">{billTo.phone}</span></div>}
            {billTo.email && <div className="text-gray-400">Email: <span className="text-white">{billTo.email}</span></div>}
          </div>
        </div>

        {/* Ship To */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Delivery Site / Shipping Party</h4>
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Site Consignee</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="text-base font-bold text-white">{shipTo.partyName}</div>
            {shipTo.gstin && (
              <div className="text-gray-400">
                GSTIN: <span className="font-mono font-bold text-amber-300">{shipTo.gstin}</span>
              </div>
            )}
            <div className="text-gray-300 leading-relaxed pt-1">{shipTo.addressLine}</div>
            <div className="text-gray-400">
              State: <span className="text-white">{shipTo.state} ({shipTo.stateCode})</span>
            </div>
            {shipTo.pincode && (
              <div className="text-gray-400">
                Pincode: <span className="text-white font-mono">{shipTo.pincode}</span>
              </div>
            )}
            {shipTo.phone && (
              <div className="text-gray-400">Site Contact Phone: <span className="text-white">{shipTo.phone}</span></div>
            )}
            {(order.customerPoNumber || order.clientPoNumber) && (
              <div className="text-gray-400 pt-0.5">
                Client PO:{' '}
                <span className="font-mono font-bold text-amber-300">
                  {order.customerPoNumber || order.clientPoNumber}
                </span>
                {(order.customerPoDate || order.clientPoDate) && (
                  <span className="text-gray-500 text-[10px] ml-1">
                    ({new Date(order.customerPoDate || order.clientPoDate || '').toLocaleDateString('en-GB')})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3 Information KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Order Reference & Lifecycle Metadata */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-purple-400" /> Reference & Document ID
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <div className="text-gray-500 text-[11px]">Order Number</div>
              <div className="font-mono font-bold text-white text-sm">{order.orderNumber}</div>
            </div>

            <div>
              <div className="text-gray-500 text-[11px]">Order Date</div>
              <div className="text-gray-300 font-mono">
                {new Date(order.orderDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>

            <div>
              <div className="text-gray-500 text-[11px]">Place of Supply</div>
              <div className="text-gray-300 font-medium">
                {order.placeOfSupply || billTo.state || 'Delhi'} ({order.placeOfSupplyStateCode || billTo.stateCode || '07'})
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Financial Summary */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-400" /> Financial Value
            </span>
            {orderGst && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${orderGst.isDelhi ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                {orderGst.isDelhi ? 'Delhi Supply' : 'Inter-State'}
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold text-white">
                ₹ {Number(order.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {Number(order.freightAmount) > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Freight:</span>
                <span className="font-mono font-semibold text-white">
                  ₹ {Number(order.freightAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {orderGst?.isDelhi ? (
              <>
                <div className="flex justify-between text-blue-400">
                  <span>CGST (9%):</span>
                  <span className="font-mono font-semibold">
                    ₹ {(Number(order.cgstAmount) || orderGst.cgstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-blue-400">
                  <span>SGST (9%):</span>
                  <span className="font-mono font-semibold">
                    ₹ {(Number(order.sgstAmount) || orderGst.sgstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-purple-400">
                <span>IGST (18%):</span>
                <span className="font-mono font-semibold">
                  ₹ {(Number(order.igstAmount) || orderGst?.igstAmount || Number(order.taxAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-white/5 flex justify-between items-baseline">
              <span className="font-bold text-gray-300 text-xs">Grand Total:</span>
              <span className="font-mono font-extrabold text-[#7FB706] text-lg">
                ₹ {Number(order.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-[10px] text-gray-500 text-right">Currency: {order.currency || 'INR'}</div>
          </div>
        </div>

        {/* Card 3: Fulfillment & Follow-Up Pulse */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" /> Fulfillment & Touchpoints
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Dispatch progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-gray-400 text-[11px]">
                <span>Dispatch Progress</span>
                <span className="font-mono font-bold text-white">
                  {dispQty} / {totalQty} Units ({fulfillmentPct}%)
                </span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    fulfillmentPct === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${fulfillmentPct}%` }}
                />
              </div>
            </div>

            {/* Next Touchpoint */}
            <div className="pt-1 flex items-center justify-between">
              <span className="text-gray-500 text-[11px]">Next Touchpoint:</span>
              {renderFollowupBadge()}
            </div>

            <button
              onClick={() => navigate(`/admin/dashboard/sales-orders/${id}/follow-up`)}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity shadow-md shadow-[#7FB706]/20 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Manage & Log Discussion
            </button>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#7FB706]" />
            <h3 className="text-sm font-bold text-white">Order Line Items & Fabrication Specs</h3>
          </div>
          <span className="text-xs font-mono text-gray-400">
            {order.items?.length || 0} line item(s) • Total {totalQty} Units
          </span>
        </div>

        {order.items && order.items.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-gray-300 text-left">
                <thead className="bg-[#0a0a1a] text-xs uppercase text-gray-500 border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4 text-center w-12">#</th>
                    <th className="py-3 px-4">Item & Specifications</th>
                    <th className="py-3 px-4 text-center w-20">Unit</th>
                    <th className="py-3 px-4 text-right w-24">Ordered</th>
                    <th className="py-3 px-4 text-right w-24">Dispatched</th>
                    <th className="py-3 px-4 text-right w-24">Balance</th>
                    <th className="py-3 px-4 text-right w-28">Rate (₹)</th>
                    <th className="py-3 px-4 text-right w-32">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {order.items.map((it, idx) => {
                    const ordered = Number(it.quantity || 0);
                    const dispatched = Number(it.dispatchedQuantity || 0);
                    const balance = Math.max(0, ordered - dispatched);
                    const rate = Number(it.rate || it.unitPrice || 0);
                    const amount = Number(it.amount || it.totalAmount || ordered * rate);
                    const { mainDesc, specs } = parseItemSpecs(it);

                    return (
                      <tr key={it.id || idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-gray-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{mainDesc}</div>
                          {specs.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
                              {specs.map((s, sIdx) => (
                                <span key={sIdx}>
                                  • {s.label}: <strong className="text-gray-300">{s.value}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-400">{it.unit || 'NOS'}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">{ordered}</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400">{dispatched}</td>
                        <td className="py-3 px-4 text-right font-mono text-amber-300">{balance}</td>
                        <td className="py-3 px-4 text-right font-mono">
                          {rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#7FB706]">
                          ₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-white/5">
              {order.items.map((it, idx) => {
                const ordered = Number(it.quantity || 0);
                const dispatched = Number(it.dispatchedQuantity || 0);
                const balance = Math.max(0, ordered - dispatched);
                const rate = Number(it.rate || it.unitPrice || 0);
                const amount = Number(it.amount || it.totalAmount || ordered * rate);
                const { mainDesc, specs } = parseItemSpecs(it);

                return (
                  <div key={it.id || idx} className="p-4 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-semibold text-white text-sm">
                        <span className="font-mono text-gray-500 mr-1.5">#{idx + 1}</span>
                        {mainDesc}
                      </div>
                      <div className="font-mono font-bold text-[#7FB706] text-sm whitespace-nowrap">
                        ₹ {amount.toLocaleString('en-IN')}
                      </div>
                    </div>

                    {specs.length > 0 && (
                      <div className="text-[11px] text-gray-400 space-y-0.5">
                        {specs.map((s, sIdx) => (
                          <div key={sIdx}>
                            • {s.label}: <span className="text-gray-300">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-white/[0.02] text-xs">
                      <div>
                        <span className="text-gray-500 text-[10px] block">Ordered</span>
                        <span className="font-mono font-bold text-white">{ordered} {it.unit || 'NOS'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[10px] block">Dispatched</span>
                        <span className="font-mono font-bold text-emerald-400">{dispatched}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[10px] block">Balance</span>
                        <span className="font-mono font-bold text-amber-300">{balance}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Tax Summary & Financial Breakdown Dock ────────── */}
            <div className="p-5 bg-[#0a0a1a] border-t border-white/5 flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-2 flex-1">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">GST Tax Summary</h5>
                <p className="text-xs text-gray-400">
                  Place of Supply: <strong className="text-white">{order.placeOfSupply || billTo.state || 'Delhi'}</strong> ({order.placeOfSupplyStateCode || billTo.stateCode || '07'}) • {orderGst?.isDelhi ? 'Intra-State GST (CGST 9% + SGST 9%)' : 'Inter-State GST (IGST 18%)'}
                </p>
              </div>

              <div className="w-full md:w-80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-300">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{Number(order.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {Number(order.freightAmount) > 0 && (
                  <div className="flex items-center justify-between text-gray-300">
                    <span>Freight &amp; Handling:</span>
                    <span className="font-mono">₹{Number(order.freightAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {orderGst?.isDelhi ? (
                  <>
                    <div className="flex items-center justify-between text-blue-400">
                      <span>CGST (9%):</span>
                      <span className="font-mono font-semibold">
                        ₹{(Number(order.cgstAmount) || orderGst.cgstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-blue-400">
                      <span>SGST (9%):</span>
                      <span className="font-mono font-semibold">
                        ₹{(Number(order.sgstAmount) || orderGst.sgstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between text-purple-400">
                    <span>IGST (18%):</span>
                    <span className="font-mono font-semibold">
                      ₹{(Number(order.igstAmount) || orderGst?.igstAmount || Number(order.taxAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-base font-bold text-[#7FB706] pt-2 border-t border-white/10">
                  <span>Grand Total:</span>
                  <span className="font-mono">₹{Number(order.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-500 text-sm">No line items recorded for this order.</div>
        )}
      </div>

      {/* ── Standard Inclusions & Hardware Accessories Card ───── */}
      {(() => {
        const content =
          order.accessoriesText ||
          (Array.isArray(order.termsJson)
            ? order.termsJson.find((t: any) =>
                (typeof t === 'string' ? t : t.text || '').toLowerCase().includes('hardware accessories') ||
                (typeof t === 'string' ? t : t.text || '').toLowerCase().includes('standard inclusions')
              )
            : null);
        if (!content) return null;
        const cleanContent =
          typeof content === 'string'
            ? content.replace(/^Standard Inclusions & Hardware Accessories:\s*/i, '').trim()
            : (content.text || '').replace(/^Standard Inclusions & Hardware Accessories:\s*/i, '').trim();
        if (!cleanContent) return null;

        return (
          <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3 shadow-xl">
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
              {cleanContent}
            </div>
          </div>
        );
      })()}

      {/* ── Commercial Terms & Conditions Card ────────────────── */}
      {(() => {
        const termsList = Array.isArray(order.termsJson)
          ? order.termsJson.map((t: any) => (typeof t === 'string' ? t : t.text || String(t)))
          : [];
        const filteredTerms = termsList.filter(
          (t: string) =>
            !t.toLowerCase().includes('hardware accessories') &&
            !t.toLowerCase().includes('standard inclusions')
        );
        if (filteredTerms.length === 0) return null;

        return (
          <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Commercial Terms &amp; Conditions
                </h4>
              </div>
              <span className="text-xs text-gray-400 font-mono">
                {filteredTerms.length} clause(s)
              </span>
            </div>
            <div className="space-y-2 text-xs">
              {filteredTerms.map((term: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#0a0a1a] border border-white/5"
                >
                  <span className="text-gray-500 font-mono font-bold">{idx + 1}.</span>
                  <span className="text-gray-300 leading-relaxed">{term}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Linked Documents & Status History Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Linked Documents (Quotation, PIs, Packing Lists, Hardware Issues) */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#7FB706]" /> Linked Lifecycle Documents
            </h3>
            <button
              onClick={() => navigate(`/admin/dashboard/sales-orders/${id}/timeline`)}
              className="text-xs text-[#7FB706] hover:underline flex items-center gap-1 font-semibold"
            >
              Interactive Timeline <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Stage 1: Quotation */}
            {order.quotationId && (
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-mono font-bold text-white text-xs">
                      {quotationRefNum || 'Sales Quotation'}
                    </div>
                    <div className="text-[11px] text-gray-400">Stage 1 • Originating Client Proposal</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleOpenPdfFromUrl(
                        `Quotation — ${quotationRefNum || 'Proposal'}`,
                        `${(salesOrdersApi as any).client?.defaults?.baseURL || '/api/v1'}/sales/quotations/${order.quotationId}/pdf?token=${encodeURIComponent(
                          localStorage.getItem('pacific_access_token') || ''
                        )}`
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="View Quotation PDF (Proposal T&C)"
                  >
                    <Eye className="w-3 h-3 text-amber-400" /> PDF
                  </button>
                  <Link
                    to={`/admin/dashboard/sales-quotations/${order.quotationId}`}
                    className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    View Quote <ExternalLink className="w-3 h-3" />
                  </Link>
                  <button
                    onClick={async () => {
                      if (!order.quotationId) return;
                      if (!confirm(`Are you sure you want to delete Quotation ${quotationRefNum || ''}?`)) return;
                      try {
                        await salesQuotationsApi.delete(order.quotationId);
                        alert('Quotation deleted successfully');
                        fetchOrder();
                      } catch (err: any) {
                        alert(err.response?.data?.message || err.message || 'Failed to delete quotation');
                      }
                    }}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                    title="Delete Quotation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Stage 2: Proforma Invoices */}
            {order.proformaInvoices && order.proformaInvoices.length > 0 ? (
              order.proformaInvoices.map((pi: any) => (
                <div
                  key={pi.id}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-mono font-bold text-white text-xs">{pi.piNumber}</div>
                      <div className="text-[11px] text-gray-400">
                        Stage 2 • PI • ₹ {Number(pi.grandTotal || 0).toLocaleString('en-IN')}
                        {pi.advancePaymentStatus && (
                          <span
                            className={`ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              pi.advancePaymentStatus === 'FULLY_RECEIVED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : pi.advancePaymentStatus === 'PARTIAL'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            Advance: {pi.advancePaymentStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleOpenPdfFromUrl(
                          `Proforma Invoice — ${pi.piNumber}`,
                          `${(salesOrdersApi as any).client?.defaults?.baseURL || '/api/v1'}/sales/pi/${pi.id}/pdf?token=${encodeURIComponent(
                            localStorage.getItem('pacific_access_token') || ''
                          )}`
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="View PI PDF (Advance Precondition T&C)"
                    >
                      <Eye className="w-3 h-3 text-indigo-400" /> PDF
                    </button>
                    <Link
                      to="/admin/dashboard/proforma-invoices"
                      className="px-3 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      View PIs <ExternalLink className="w-3 h-3" />
                    </Link>
                    <button
                      onClick={async () => {
                        if (!confirm(`Are you sure you want to delete Proforma Invoice ${pi.piNumber}?`)) return;
                        try {
                          await piApi.delete(pi.id);
                          alert('Proforma Invoice deleted successfully');
                          fetchOrder();
                        } catch (err: any) {
                          alert(err.response?.data?.message || err.message || 'Failed to delete Proforma Invoice');
                        }
                      }}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                      title="Delete Proforma Invoice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 rounded-xl bg-white/[0.01] border border-dashed border-white/5 text-xs text-gray-500 text-center">
                No Proforma Invoices issued yet.
              </div>
            )}

            {/* Stage 4: Tax Invoices & Final Bills */}
            {order.invoices && order.invoices.length > 0 ? (
              order.invoices.map((inv: any) => (
                <div
                  key={inv.id}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-mono font-bold text-white text-xs">{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-gray-400">
                        Stage 4 • GST Tax Invoice • ₹ {Number(inv.totalAmount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleOpenPdfFromUrl(
                          `Tax Invoice — ${inv.invoiceNumber}`,
                          salesOrdersApi.getInvoicePdfUrl(inv.id)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="View Tax Invoice PDF (Statutory CGST T&C)"
                    >
                      <Eye className="w-3 h-3 text-purple-400" /> PDF
                    </button>
                    <Link
                      to="/admin/dashboard/invoices"
                      className="px-3 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      Invoices Hub <ExternalLink className="w-3 h-3" />
                    </Link>
                    <button
                      onClick={async () => {
                        if (!confirm(`Are you sure you want to delete Tax Invoice ${inv.invoiceNumber}?`)) return;
                        try {
                          await invoicesApi.delete(inv.id);
                          alert('Tax Invoice deleted successfully');
                          fetchOrder();
                        } catch (err: any) {
                          alert(err.response?.data?.message || err.message || 'Failed to delete Tax Invoice');
                        }
                      }}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                      title="Delete Tax Invoice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : null}

            {/* Stage 5: Packing Lists */}
            {order.packingLists && order.packingLists.length > 0 ? (
              order.packingLists.map((pl: any) => (
                <div
                  key={pl.id}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-mono font-bold text-white text-xs">{pl.packingListNumber}</div>
                      <div className="text-[11px] text-gray-400">
                        Stage 5 • Packing List • {pl.totalQuantity || 0} Packets Dispatched
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleOpenPdfFromUrl(
                          `Packing List — ${pl.packingListNumber}`,
                          `${(salesOrdersApi as any).client?.defaults?.baseURL || '/api/v1'}/logistics/packing-lists/${pl.id}/pdf?token=${encodeURIComponent(
                            localStorage.getItem('pacific_access_token') || ''
                          )}`
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="View Packing List PDF (Receiving Protocol T&C)"
                    >
                      <Eye className="w-3 h-3 text-emerald-400" /> PDF
                    </button>
                    <Link
                      to="/admin/dashboard/packing-lists"
                      className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      View PL <ExternalLink className="w-3 h-3" />
                    </Link>
                    <button
                      onClick={async () => {
                        if (!confirm(`Are you sure you want to delete Packing List ${pl.packingListNumber}?`)) return;
                        try {
                          await packingListsApi.delete(pl.id);
                          alert('Packing List deleted successfully');
                          fetchOrder();
                        } catch (err: any) {
                          alert(err.response?.data?.message || err.message || 'Failed to delete Packing List');
                        }
                      }}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                      title="Delete Packing List"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 rounded-xl bg-white/[0.01] border border-dashed border-white/5 text-xs text-gray-500 text-center">
                No Packing Lists generated yet.
              </div>
            )}

            {/* Stage 6: Dispatch Records & Gate Pass */}
            {order.dispatchRecords && order.dispatchRecords.length > 0 ? (
              order.dispatchRecords.map((disp: any) => (
                <div
                  key={disp.id}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-mono font-bold text-white text-xs">{disp.dispatchNumber}</div>
                      <div className="text-[11px] text-gray-400">
                        Stage 6 • Vehicle: {disp.vehicleNumber || 'Pending'} • Transporter:{' '}
                        {disp.transporterName || 'Self'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleOpenPdfFromUrl(
                          `Dispatch Challan — ${disp.dispatchNumber}`,
                          salesOrdersApi.getDispatchPdfUrl(order.id, disp.id)
                        )
                      }
                      className="px-3 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="View Dispatch Challan & Gate Pass PDF (Carrier & Security T&C)"
                    >
                      <Eye className="w-3 h-3 text-blue-400" /> Gate Pass PDF
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Are you sure you want to delete Dispatch Record ${disp.dispatchNumber}?`)) return;
                        try {
                          await salesOrdersApi.deleteDispatch(order.id, disp.id);
                          alert('Dispatch record deleted successfully');
                          fetchOrder();
                        } catch (err: any) {
                          alert(err.response?.data?.message || err.message || 'Failed to delete dispatch record');
                        }
                      }}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                      title="Delete Dispatch Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : null}

            {/* Stage 7: Hardware Store Issues */}
            {(order as any).hardwareIssues && (order as any).hardwareIssues.length > 0 ? (
              (order as any).hardwareIssues.map((hil: any) => (
                <div
                  key={hil.id}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-mono font-bold text-white text-xs">{hil.issueNumber}</div>
                      <div className="text-[11px] text-gray-400">Stage 7 • Hardware Store Issue List</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleOpenPdfFromUrl(
                          `Hardware Issue — ${hil.issueNumber}`,
                          `${(salesOrdersApi as any).client?.defaults?.baseURL || '/api/v1'}/warehouse/hardware-issues/${hil.id}/pdf?token=${encodeURIComponent(
                            localStorage.getItem('pacific_access_token') || ''
                          )}`
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="View Hardware Issue PDF (Store Custody T&C)"
                    >
                      <Eye className="w-3 h-3 text-cyan-400" /> PDF
                    </button>
                    <Link
                      to="/admin/dashboard/issue-lists"
                      className="px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      Issue Lists <ExternalLink className="w-3 h-3" />
                    </Link>
                    <button
                      onClick={async () => {
                        if (!confirm(`Are you sure you want to delete Hardware Issue ${hil.issueNumber}?`)) return;
                        try {
                          await hardwareIssueApi.deleteIssue(hil.id);
                          alert('Hardware Issue deleted successfully');
                          fetchOrder();
                        } catch (err: any) {
                          alert(err.response?.data?.message || err.message || 'Failed to delete hardware issue');
                        }
                      }}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                      title="Delete Hardware Issue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : null}
          </div>
        </div>

        {/* Status Transition Audit History */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" /> Status Progression History
            </h3>
            <span className="text-xs text-gray-400">
              {order.statusHistory?.length || 0} event(s)
            </span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {order.statusHistory && order.statusHistory.length > 0 ? (
              order.statusHistory.map((sh, idx) => (
                <div
                  key={sh.id || idx}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono font-semibold text-white">
                      <span className="text-gray-400">{sh.fromStatus || 'INIT'}</span>
                      <ChevronRight className="w-3 h-3 text-[#7FB706]" />
                      <span className="text-[#B5F823]">{sh.toStatus}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {new Date(sh.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {sh.comment && <p className="text-gray-300 text-[11px] leading-relaxed">{sh.comment}</p>}
                  {sh.changedBy && (
                    <div className="text-[10px] text-gray-500 font-medium">
                      By: {sh.changedBy.firstName} {sh.changedBy.lastName}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-gray-500">
                No prior status transition logs recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Transition Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#7FB706]" />
                <h3 className="text-base font-bold text-white">Update Order Status</h3>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-300 mb-1.5">Select New Lifecycle Status</label>
                <select
                  value={selectedNewStatus}
                  onChange={(e) => setSelectedNewStatus(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#7FB706] text-sm"
                >
                  <option value="PENDING_APPROVAL">Pending Confirmation (Default)</option>
                  <option value="WAITING_FOR_ADVANCE">Waiting for Advance Payment</option>
                  <option value="APPROVED">Approved for Manufacturing</option>
                  <option value="IN_PRODUCTION">In Production / Factory Fabrication</option>
                  <option value="PARTIALLY_DISPATCHED">Partially Dispatched</option>
                  <option value="FULLY_DISPATCHED">Fully Dispatched / Complete</option>
                  <option value="COMPLETED">Completed & Handed Over</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1.5">
                  Transition Reason / Discussion Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g. 50% advance received via NEFT; cleared for factory CNC cutting."
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateStatusSubmit}
                  disabled={updatingStatus}
                  className="px-5 py-2.5 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold transition-all shadow-md shadow-[#7FB706]/20 cursor-pointer disabled:opacity-50"
                >
                  {updatingStatus ? 'Updating...' : 'Confirm Status Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Edit Sales Order Details</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Site / Project Name</label>
                  <input
                    type="text"
                    value={editForm.siteName}
                    onChange={(e) => setEditForm({ ...editForm, siteName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Client PO Number</label>
                  <input
                    type="text"
                    value={editForm.clientPoNumber}
                    onChange={(e) => setEditForm({ ...editForm, clientPoNumber: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Client PO Date</label>
                <input
                  type="date"
                  value={editForm.clientPoDate}
                  onChange={(e) => setEditForm({ ...editForm, clientPoDate: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Site Delivery Address</label>
                <textarea
                  rows={2}
                  value={editForm.siteAddress}
                  onChange={(e) => setEditForm({ ...editForm, siteAddress: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditSubmit}
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Dispatch Modal (Stage 6) */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Record Vehicle Dispatch & Issue Gate Pass</h3>
              </div>
              <button
                onClick={() => setShowDispatchModal(false)}
                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordDispatchSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Transporter / Logistics Co</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VRL Logistics, SafeXpress"
                    value={dispatchForm.transporterName}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, transporterName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Vehicle / Truck Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DL 01 AB 1234"
                    value={dispatchForm.vehicleNumber}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, vehicleNumber: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Driver Name</label>
                  <input
                    type="text"
                    placeholder="Driver full name"
                    value={dispatchForm.driverName}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, driverName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Driver Mobile Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={dispatchForm.driverPhone}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, driverPhone: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">LR / GR Number</label>
                  <input
                    type="text"
                    placeholder="Bilty number"
                    value={dispatchForm.lrNumber}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, lrNumber: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">E-Way Bill Number</label>
                  <input
                    type="text"
                    placeholder="12-digit E-Way Bill"
                    value={dispatchForm.ewayBillNumber}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, ewayBillNumber: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Total Packages</label>
                  <input
                    type="number"
                    min={1}
                    value={dispatchForm.totalPackages}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, totalPackages: Number(e.target.value) || 1 })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Dispatch Notes / Gate Pass Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Panels secured with corrugated edge protectors, hardware boxed separately."
                  value={dispatchForm.notes}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingDispatch}
                  className="px-5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {recordingDispatch ? 'Recording...' : 'Generate Dispatch Challan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Vector A4 PDF Preview Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0e0e1e]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#7FB706]" />
                <h3 className="text-sm font-bold text-white truncate">{pdfTitle}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const iframe = document.getElementById('order-pdf-iframe') as HTMLIFrameElement;
                    if (iframe && iframe.contentWindow) {
                      iframe.contentWindow.focus();
                      iframe.contentWindow.print();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#0a0a1a] relative overflow-hidden flex items-center justify-center">
              {loadingPdf ? (
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#7FB706] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-gray-400 text-xs">Generating vector A4 document with stage-specific T&C...</p>
                </div>
              ) : (
                <iframe
                  id="order-pdf-iframe"
                  srcDoc={pdfHtml}
                  title="PDF Preview"
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
