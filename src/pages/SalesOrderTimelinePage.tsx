import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Layers,
  FileText,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
  MapPin,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  Package,
  Wrench,
  CreditCard,
  Truck,
  Plus,
  Printer,
  X,
  AlertCircle,
  Eye,
  CheckCircle,
  DollarSign,
  ArrowRight,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { salesOrdersApi } from '../api/salesOrdersApi';
import { piApi } from '../api/proformaApi';
import { salesQuotationsApi } from '../api/salesQuotationsApi';
import { invoicesApi } from '../api/invoicesApi';
import { packingListsApi } from '../api/packingListsApi';
import { hardwareIssueApi } from '../api/hardwareIssueApi';
import type { SalesOrder, OrderDocumentTimelineItem } from '../types/admin';

// ─── 7-STAGE CONFIGURATION & STYLING ─────────────────────────────────────────

interface StageMeta {
  stage: number;
  label: string;
  shortLabel: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  routePrefix: string;
  description: string;
}

const STAGE_CONFIG: Record<string, StageMeta> = {
  QUOTATION: {
    stage: 1,
    label: 'Sales Quotation',
    shortLabel: 'Quotation',
    icon: FileText,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    routePrefix: '/admin/dashboard/sales-quotations',
    description: 'Initial proposal & drawing specs. Can be placed as standalone proposal or converted to PI.',
  },
  PI: {
    stage: 2,
    label: 'Proforma Invoice (PI)',
    shortLabel: 'Proforma Inv',
    icon: CreditCard,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    routePrefix: '/admin/dashboard/proforma-invoices',
    description: 'Precondition commercial invoice with Advance Payment Tracking before fabrication starts.',
  },
  ORDER: {
    stage: 3,
    label: 'Sales Order Hub',
    shortLabel: 'Sales Order',
    icon: Layers,
    color: 'text-[#B5F823]',
    bg: 'bg-[#7FB706]/15',
    border: 'border-[#7FB706]/30',
    routePrefix: '/admin/dashboard/sales-orders',
    description: 'Confirmed production order against client PO with manufacturing fabrication terms.',
  },
  INVOICE: {
    stage: 4,
    label: 'Tax Invoice & Bill',
    shortLabel: 'Bill & Invoice',
    icon: CreditCard,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    routePrefix: '/admin/dashboard/invoices',
    description: 'Statutory GST Tax Invoice under CGST Act 2017 with legal jurisdictional terms.',
  },
  PACKING_LIST: {
    stage: 5,
    label: 'Packing List (PL)',
    shortLabel: 'Packing List',
    icon: Package,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    routePrefix: '/admin/dashboard/packing-lists',
    description: 'Packet breakdown, BOM verification & site consignee physical check protocol.',
  },
  DISPATCH: {
    stage: 6,
    label: 'Dispatch Challan & Gate Pass',
    shortLabel: 'Dispatch',
    icon: Truck,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    routePrefix: '/admin/dashboard/sales-orders',
    description: 'Transporter custody transfer, vehicle number, LR/GR, E-way bill & factory security stamp.',
  },
  HARDWARE_ISSUE: {
    stage: 7,
    label: 'Hardware Issue List',
    shortLabel: 'Issue List',
    icon: Wrench,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    routePrefix: '/admin/dashboard/issue-lists',
    description: 'Hardware store picklist with sequential 4-role installer sign-off protocol.',
  },
};

const PIPELINE_STEPS = [
  { stage: 1, type: 'QUOTATION', title: 'Quotation', subtitle: 'PPS/D/...' },
  { stage: 2, type: 'PI', title: 'Proforma Inv', subtitle: 'Advance Track' },
  { stage: 3, type: 'ORDER', title: 'Sales Order', subtitle: 'PPS/ORD/...' },
  { stage: 4, type: 'INVOICE', title: 'Bill & Invoice', subtitle: 'Tax Invoice' },
  { stage: 5, type: 'PACKING_LIST', title: 'Packing List', subtitle: 'PPS/PL/...' },
  { stage: 6, type: 'DISPATCH', title: 'Dispatch', subtitle: 'Gate Pass' },
  { stage: 7, type: 'HARDWARE_ISSUE', title: 'Issue List', subtitle: 'PPS/HIL/...' },
];

export default function SalesOrderTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [timeline, setTimeline] = useState<OrderDocumentTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PDF Preview Modal State
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfHtml, setPdfHtml] = useState<string>('');
  const [pdfTitle, setPdfTitle] = useState('Document Preview');
  const [pdfLoading, setPdfLoading] = useState(false);

  // Advance Payment Modal State (Stage 2)
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advancePiItem, setAdvancePiItem] = useState<OrderDocumentTimelineItem | null>(null);
  const [recordingAdvance, setRecordingAdvance] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: 'NEFT_RTGS',
    referenceNumber: '',
    notes: '',
  });

  // Dispatch Modal State (Stage 6)
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

  // Invoice Generation State (Stage 4)
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // Load Order & Timeline
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [orderRes, timelineRes] = await Promise.all([
        salesOrdersApi.getById(id),
        salesOrdersApi.getTimeline(id),
      ]);

      const ord = (orderRes.data?.data as any) || orderRes.data;
      setOrder(ord);

      const timelinePayload = (timelineRes.data as any)?.data || timelineRes.data;
      const items = Array.isArray(timelinePayload)
        ? timelinePayload
        : (timelinePayload?.timeline || []);
      setTimeline(Array.isArray(items) ? items : []);
    } catch (err: any) {
      console.error('Failed to load order timeline:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch document timeline');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived stage detection
  const quotationItem = useMemo(() => timeline.find((t) => t.type === 'QUOTATION'), [timeline]);
  const piItem = useMemo(() => timeline.find((t) => t.type === 'PI'), [timeline]);
  const orderItem = useMemo(() => timeline.find((t) => t.type === 'ORDER'), [timeline]);
  const invoiceItems = useMemo(() => timeline.filter((t) => t.type === 'INVOICE'), [timeline]);
  const packingListItems = useMemo(() => timeline.filter((t) => t.type === 'PACKING_LIST'), [timeline]);
  const dispatchItems = useMemo(() => timeline.filter((t) => t.type === 'DISPATCH'), [timeline]);
  const hardwareItems = useMemo(() => timeline.filter((t) => t.type === 'HARDWARE_ISSUE'), [timeline]);

  // Advance tracking computation for Stage 2
  const advanceMetadata = useMemo(() => {
    if (!piItem) return null;
    const meta = piItem.metadata || {};
    const total = Number(piItem.amount || order?.grandTotal || 0);
    const required = Number(meta.advanceRequiredAmount) || Math.round(total * 0.5);
    const received = Number(meta.advanceReceivedAmount) || 0;
    const remaining = Math.max(0, required - received);
    const percentage = required > 0 ? Math.min(100, Math.round((received / required) * 100)) : 0;
    const status = meta.advancePaymentStatus || (received >= required ? 'FULLY_RECEIVED' : received > 0 ? 'PARTIAL' : 'PENDING');

    return {
      total,
      required,
      received,
      remaining,
      percentage,
      status,
      date: meta.advancePaymentDate,
      mode: meta.advancePaymentMode,
      ref: meta.advancePaymentReference,
    };
  }, [piItem, order?.grandTotal]);

  // Universal Vector A4 PDF Viewer Trigger
  const handleOpenPdf = async (title: string, fetchUrl: string) => {
    setPdfTitle(title);
    setShowPdfModal(true);
    setPdfLoading(true);
    try {
      const res = await fetch(fetchUrl, {
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
      setPdfLoading(false);
    }
  };

  // 1-Click Trigger: Generate Tax Invoice (Stage 4)
  const handleGenerateInvoice = async () => {
    if (!id || !order) return;
    if (!confirm(`Generate official GST Tax Invoice from Sales Order ${order.orderNumber}?`)) return;
    setGeneratingInvoice(true);
    try {
      const res = await salesOrdersApi.createInvoiceFromOrder(id);
      const inv = (res.data as any)?.data || res.data;
      alert(`Tax Invoice generated successfully: ${inv?.invoiceNumber || 'Invoice'}`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to generate tax invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  // Open Record Advance Modal
  const handleOpenAdvanceModal = () => {
    if (!piItem) return;
    setAdvancePiItem(piItem);
    const remaining = advanceMetadata?.remaining || Math.round(Number(piItem.amount || order?.grandTotal || 0) * 0.5);
    setAdvanceForm({
      amount: remaining,
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMode: 'NEFT_RTGS',
      referenceNumber: `UTR-${Date.now().toString().slice(-6)}`,
      notes: `Advance payment for Proforma ${piItem.referenceNumber}`,
    });
    setShowAdvanceModal(true);
  };

  // Save Advance Payment Submit
  const handleSaveAdvancePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advancePiItem) return;
    if (Number(advanceForm.amount) <= 0) {
      alert('Please enter a valid advance payment amount.');
      return;
    }
    setRecordingAdvance(true);
    try {
      await piApi.recordAdvancePayment(advancePiItem.id, {
        ...advanceForm,
        amount: Number(advanceForm.amount),
      });
      alert(`Advance payment of ₹${Number(advanceForm.amount).toLocaleString('en-IN')} recorded successfully!`);
      setShowAdvanceModal(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to record advance payment');
    } finally {
      setRecordingAdvance(false);
    }
  };

  // Save Record Dispatch Submit (Stage 6)
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
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to record dispatch');
    } finally {
      setRecordingDispatch(false);
    }
  };

  const handleDeleteDocument = async (item: OrderDocumentTimelineItem) => {
    const label = STAGE_CONFIG[item.type]?.label || item.type;
    if (!window.confirm(`Are you sure you want to permanently delete ${label} (${item.referenceNumber})? This action cannot be undone.`)) {
      return;
    }
    try {
      if (item.type === 'QUOTATION') {
        await salesQuotationsApi.delete(item.id);
      } else if (item.type === 'PI') {
        await piApi.delete(item.id);
      } else if (item.type === 'ORDER') {
        await salesOrdersApi.delete(item.id);
        alert('Sales Order deleted successfully.');
        navigate('/admin/dashboard/sales-orders');
        return;
      } else if (item.type === 'INVOICE') {
        await invoicesApi.delete(item.id);
      } else if (item.type === 'PACKING_LIST') {
        await packingListsApi.delete(item.id);
      } else if (item.type === 'DISPATCH') {
        if (order?.id) {
          await salesOrdersApi.deleteDispatch(order.id, item.id);
        }
      } else if (item.type === 'HARDWARE_ISSUE') {
        await hardwareIssueApi.deleteIssue(item.id);
      }
      alert(`${label} (${item.referenceNumber}) deleted successfully.`);
      loadData();
    } catch (err: any) {
      console.error('Failed to delete document:', err);
      alert(err?.response?.data?.message || err?.message || 'Failed to delete document');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#7FB706] animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading 7-Stage Commercial Lifecycle Pipeline...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-md bg-[#121226] border border-white/5 rounded-2xl p-6">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Document Timeline Error</h2>
          <p className="text-red-400 text-sm">{error || 'Sales Order not found'}</p>
          <Link
            to="/admin/dashboard/sales-orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-200 rounded-xl text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sales Orders
          </Link>
        </div>
      </div>
    );
  }

  const customerName = order.customer?.legalName || order.customer?.tradeName || 'Client';
  const siteInfo =
    (order as any)?.shippingAddressSnapshot?.siteName ||
    order.siteName ||
    (order as any)?.shippingAddressSnapshot?.address ||
    order.siteAddress ||
    'Standard Site';

  const formattedTotal = `₹ ${Number(order.grandTotal || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  })}`;

  // Count active stages completed
  const completedStagesCount = [
    Boolean(quotationItem),
    Boolean(piItem),
    Boolean(orderItem),
    invoiceItems.length > 0,
    packingListItems.length > 0,
    dispatchItems.length > 0,
    hardwareItems.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
          <Link to="/admin/dashboard/sales-orders" className="hover:text-white transition-colors">
            Sales Orders
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-600" />
          <Link to={`/admin/dashboard/sales-orders/${id}`} className="font-mono text-white hover:underline">
            {order.orderNumber}
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-600" />
          <span className="text-[#B5F823] font-semibold">7-Stage Lifecycle Pipeline</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenPdf(`Sales Order — ${order.orderNumber}`, salesOrdersApi.getOrderPdfUrl(order.id))}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-colors cursor-pointer"
            title="View Order PDF (Order Confirmation T&C)"
          >
            <Eye className="w-3.5 h-3.5" /> Order PDF
          </button>
          <Link
            to={`/admin/dashboard/sales-orders/${id}/follow-up`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors shadow-md"
          >
            <Clock className="w-3.5 h-3.5" /> Order Follow-Up Hub
          </Link>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Main Order Header Summary */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-[#7FB706]/10 text-[#7FB706]">
                <Layers className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white font-mono">{order.orderNumber}</h1>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  order.status === 'FULLY_DISPATCHED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : order.status === 'PARTIALLY_DISPATCHED'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : order.status === 'APPROVED'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : order.status === 'WAITING_FOR_ADVANCE'
                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
              >
                {order.status}
              </span>

              {order.source === 'CONVERTED_PROFORMA' ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> Proforma Convert
                </span>
              ) : order.source === 'CONVERTED_QUOTATION' ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Quotation Convert
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-300 font-mono">
                  Direct Order
                </span>
              )}
            </div>

            <p className="text-sm text-gray-300 font-medium">
              {customerName}
              {siteInfo && <span className="text-gray-400"> • Site: <strong className="text-white">{siteInfo}</strong></span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 min-w-[130px]">
              <div className="text-gray-400 text-[11px]">Order Value</div>
              <div className="text-base font-bold text-[#7FB706] font-mono">{formattedTotal}</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 min-w-[130px]">
              <div className="text-gray-400 text-[11px]">Order Date</div>
              <div className="text-xs font-bold text-white font-mono mt-1">
                {new Date(order.orderDate).toLocaleDateString('en-GB')}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 min-w-[140px]">
              <div className="text-gray-400 text-[11px]">Stages Completed</div>
              <div className="text-base font-bold text-cyan-400 font-mono">
                {completedStagesCount} of 7 Stages
              </div>
            </div>
          </div>
        </div>

        {/* PO & Location Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-white/5 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="truncate">Customer: <strong className="text-white">{customerName}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="truncate">
              Client PO: <strong className="text-amber-300">{order.clientPoNumber || order.customerPoNumber || 'Direct PO'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="truncate">Site Location: <strong className="text-white">{siteInfo}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span>Next Follow-Up: <strong className="text-amber-300">{order.nextFollowupDate ? new Date(order.nextFollowupDate).toLocaleDateString('en-IN') : 'Scheduled'}</strong></span>
          </div>
        </div>
      </div>

      {/* 7-Stage Interactive Pipeline Stepper */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#7FB706]" /> 7-Stage Lifecycle Pipeline (Bi-Directionally Linked)
          </h2>
          <span className="font-mono text-cyan-400 text-[11px]">
            {completedStagesCount}/7 Stages Completed
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {PIPELINE_STEPS.map((step) => {
            const hasDoc = timeline.some((t) => t.type === step.type);
            const doc = timeline.find((t) => t.type === step.type);
            const cfg = STAGE_CONFIG[step.type] || STAGE_CONFIG['ORDER'];
            const Icon = cfg.icon;

            return (
              <div
                key={step.stage}
                className={`p-3 rounded-xl border flex flex-col justify-between min-h-[92px] transition-all ${
                  hasDoc
                    ? `${cfg.bg} ${cfg.border} text-white shadow-md`
                    : 'bg-white/[0.01] border-white/5 text-gray-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold">0{step.stage}</span>
                  {hasDoc ? (
                    <CheckCircle2 className={`w-3.5 h-3.5 ${cfg.color}`} />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-white/10" />
                  )}
                </div>

                <div className="space-y-0.5 mt-2">
                  <div className="font-bold text-xs truncate flex items-center gap-1">
                    <Icon className="w-3 h-3 flex-shrink-0" />
                    <span>{step.title}</span>
                  </div>
                  <div className="text-[10px] font-mono truncate text-gray-400">
                    {hasDoc ? doc?.referenceNumber || 'Generated' : 'Pending'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage 2 Advance Payment Tracker (if PI exists or was issued) */}
      {piItem && advanceMetadata && (
        <div className="bg-[#121226] border border-indigo-500/20 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white">Stage 2: Advance Payment Tracking System</h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      advanceMetadata.status === 'FULLY_RECEIVED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : advanceMetadata.status === 'PARTIAL'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {advanceMetadata.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Linked PI: <strong className="text-white font-mono">{piItem.referenceNumber}</strong> • Precondition for production fabrication
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAdvanceModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Record Advance
              </button>
              <button
                onClick={() => handleOpenPdf(`Proforma Invoice — ${piItem.referenceNumber}`, piApi.getPdfUrl(piItem.id))}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold rounded-xl border border-white/5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-400" /> PI PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-gray-400 text-[11px]">Total PI Amount</span>
              <div className="text-sm font-bold text-white font-mono">
                ₹ {advanceMetadata.total.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-gray-400 text-[11px]">Advance Required</span>
              <div className="text-sm font-bold text-amber-300 font-mono">
                ₹ {advanceMetadata.required.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-gray-400 text-[11px]">Advance Received</span>
              <div className="text-sm font-bold text-emerald-400 font-mono">
                ₹ {advanceMetadata.received.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-gray-400 text-[11px]">Advance Remaining</span>
              <div className="text-sm font-bold text-rose-400 font-mono">
                ₹ {advanceMetadata.remaining.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Advance Clearance Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Advance Clearance Progress</span>
              <span className="font-mono font-bold text-white">
                {advanceMetadata.percentage}% Cleared
              </span>
            </div>
            <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  advanceMetadata.percentage === 100
                    ? 'bg-emerald-400'
                    : advanceMetadata.percentage > 0
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${advanceMetadata.percentage}%` }}
              />
            </div>
          </div>

          {advanceMetadata.ref && (
            <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 text-[11px] text-gray-400 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>Ref / UTR: <strong className="text-white font-mono">{advanceMetadata.ref}</strong></span>
              {advanceMetadata.mode && <span>Mode: <strong className="text-white">{advanceMetadata.mode}</strong></span>}
              {advanceMetadata.date && (
                <span>
                  Date: <strong className="text-white">{new Date(advanceMetadata.date).toLocaleDateString('en-GB')}</strong>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Complete Chronological Document Cards */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#B5F823]" /> Commercial Documents & Stage Artifacts
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Each document stage generates a vector A4 PDF with distinct Terms & Conditions ("alag T&C").
            </p>
          </div>
        </div>

        {timeline.length === 0 ? (
          <div className="py-12 text-center bg-white/[0.02] rounded-2xl border border-white/5 p-6">
            <Layers className="w-10 h-10 text-gray-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-white">No Linked Documents Found</p>
            <p className="text-xs text-gray-400 mt-1">This order was entered directly. You can generate downstream stages below.</p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-3 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
            {timeline.map((item, idx) => {
              const cfg = STAGE_CONFIG[item.type] || {
                stage: item.stageNumber || 0,
                label: item.type,
                shortLabel: item.type,
                icon: FileText,
                color: 'text-gray-300',
                bg: 'bg-white/5',
                border: 'border-white/10',
                routePrefix: '/admin/dashboard/sales-orders',
                description: 'Commercial record',
              };
              const IconComp = cfg.icon;

              // Compute stage-specific PDF URL
              const getPdfUrl = () => {
                if (item.type === 'QUOTATION') return salesQuotationsApi.getPdfUrl(item.id);
                if (item.type === 'PI') return piApi.getPdfUrl(item.id);
                if (item.type === 'ORDER') return salesOrdersApi.getOrderPdfUrl(item.id);
                if (item.type === 'INVOICE') return salesOrdersApi.getInvoicePdfUrl(item.id);
                if (item.type === 'PACKING_LIST') return packingListsApi.getPdfUrl(item.id);
                if (item.type === 'DISPATCH') return salesOrdersApi.getDispatchPdfUrl(order.id, item.id);
                if (item.type === 'HARDWARE_ISSUE') return hardwareIssueApi.getPdfUrl(item.id);
                return '';
              };

              return (
                <div key={`${item.id}-${idx}`} className="relative group">
                  {/* Timeline bullet */}
                  <div className="absolute -left-6 sm:-left-8 top-3 w-6 h-6 rounded-full bg-[#030213] border-2 border-[#7FB706] flex items-center justify-center shadow-md">
                    <span className="text-[10px] font-bold text-[#B5F823]">{cfg.stage || idx + 1}</span>
                  </div>

                  {/* Document Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all space-y-3">
                    <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${cfg.bg} ${cfg.color} ${cfg.border}`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                          <span>Stage {cfg.stage}: {cfg.label}</span>
                        </span>
                        <span className="font-mono text-sm sm:text-base font-bold text-white">
                          {item.referenceNumber}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-gray-300 border border-white/10">
                          {item.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
                        <span>{new Date(item.date).toLocaleDateString('en-GB')}</span>
                        {item.amount !== undefined && (
                          <span className="font-bold text-[#7FB706] text-sm">
                            ₹ {Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-300">{item.title}</p>
                    <p className="text-[11px] text-gray-500 italic">{cfg.description}</p>

                    {/* Metadata display */}
                    {item.metadata && (
                      <div className="flex flex-wrap gap-2 text-[11px] text-gray-400 pt-1">
                        {item.type === 'PI' && item.metadata.advancePaymentStatus && (
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            Advance: {item.metadata.advancePaymentStatus} (₹{Number(item.metadata.advanceReceivedAmount || 0).toLocaleString('en-IN')} / ₹{Number(item.metadata.advanceRequiredAmount || 0).toLocaleString('en-IN')})
                          </span>
                        )}
                        {item.type === 'DISPATCH' && item.metadata.vehicleNumber && (
                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            Vehicle: {item.metadata.vehicleNumber} • Transporter: {item.metadata.transporterName || 'Self'}
                          </span>
                        )}
                        {item.type === 'PACKING_LIST' && item.metadata.totalPackages && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            Packages: {item.metadata.totalPackages}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                      <div className="text-[11px] text-gray-500 font-mono">Stage {cfg.stage} of 7</div>
                      <div className="flex items-center gap-2">
                        {/* Universal PDF trigger */}
                        <button
                          onClick={() => handleOpenPdf(`${cfg.label} — ${item.referenceNumber}`, getPdfUrl())}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 hover:text-cyan-200 font-semibold transition-colors cursor-pointer border border-cyan-500/20"
                          title={`View vector A4 PDF with distinct ${cfg.label} Terms & Conditions`}
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" /> View A4 PDF
                        </button>

                        {/* View document page */}
                        {item.type === 'QUOTATION' && (
                          <Link
                            to={`/admin/dashboard/sales-quotations/${item.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> View Quote
                          </Link>
                        )}
                        {item.type === 'PI' && (
                          <Link
                            to="/admin/dashboard/proforma-invoices"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-semibold transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> Proforma Hub
                          </Link>
                        )}
                        {item.type === 'ORDER' && (
                          <Link
                            to={`/admin/dashboard/sales-orders/${item.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#B5F823] font-semibold transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> Order 360
                          </Link>
                        )}
                        {item.type === 'INVOICE' && (
                          <Link
                            to="/admin/dashboard/invoices"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-semibold transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> Invoices Hub
                          </Link>
                        )}
                        {item.type === 'PACKING_LIST' && (
                          <Link
                            to="/admin/dashboard/packing-lists"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-semibold transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> Packing Lists
                          </Link>
                        )}
                        {item.type === 'HARDWARE_ISSUE' && (
                          <Link
                            to="/admin/dashboard/issue-lists"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-semibold transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> Hardware Issues
                          </Link>
                        )}

                        {/* Delete Document Button across all 7 stages */}
                        <button
                          onClick={() => handleDeleteDocument(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold transition-colors cursor-pointer border border-rose-500/20"
                          title={`Delete ${cfg.label} (${item.referenceNumber})`}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Downstream Actions: Generate Missing Stages */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#7FB706]" /> Downstream Stage Generation Triggers
        </h3>
        <p className="text-xs text-gray-400">
          Execute downstream operations or generate standalone commercial documents linked to this order.
        </p>

        <div className="flex items-center gap-3 flex-wrap pt-2">
          {/* Stage 4: Generate Tax Invoice */}
          {invoiceItems.length === 0 ? (
            <button
              onClick={handleGenerateInvoice}
              disabled={generatingInvoice}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              {generatingInvoice ? 'Generating Invoice...' : '+ Generate Tax Invoice (Stage 4)'}
            </button>
          ) : (
            <Link
              to="/admin/dashboard/invoices"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-semibold"
            >
              <CheckCircle className="w-4 h-4" /> Tax Invoice Issued
            </Link>
          )}

          {/* Stage 5: Create Packing List */}
          <Link
            to="/admin/dashboard/packing-lists/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
          >
            <Package className="w-4 h-4" /> + Create Packing List (Stage 5)
          </Link>

          {/* Stage 6: Record Dispatch */}
          <button
            onClick={() => setShowDispatchModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Truck className="w-4 h-4" /> + Record Dispatch (Stage 6)
          </button>

          {/* Stage 7: Create Hardware Issue */}
          <Link
            to="/admin/dashboard/issue-lists/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md"
          >
            <Wrench className="w-4 h-4" /> + Create Hardware Issue (Stage 7)
          </Link>
        </div>
      </div>

      {/* Record Advance Payment Modal (Stage 2) */}
      {showAdvanceModal && advancePiItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Record Advance Payment (Stage 2)</h3>
              </div>
              <button
                onClick={() => setShowAdvanceModal(false)}
                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdvancePayment} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-gray-300 space-y-1">
                <div className="font-semibold text-white">PI Reference: {advancePiItem.referenceNumber}</div>
                <div>
                  Required: ₹{advanceMetadata?.required.toLocaleString('en-IN')} • Remaining: ₹{advanceMetadata?.remaining.toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Payment Amount Received (₹)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: Number(e.target.value) })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-white font-mono text-base font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={advanceForm.paymentDate}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, paymentDate: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Payment Mode</label>
                  <select
                    value={advanceForm.paymentMode}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, paymentMode: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  >
                    <option value="NEFT_RTGS">NEFT / RTGS / IMPS</option>
                    <option value="UPI">UPI / QR Transfer</option>
                    <option value="CHEQUE">Cheque / Demand Draft</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">UTR / Transaction Reference</label>
                <input
                  type="text"
                  placeholder="e.g. UTR12345678"
                  value={advanceForm.referenceNumber}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, referenceNumber: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Payment Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 50% advance confirmed by accounts; ready for factory cutting."
                  value={advanceForm.notes}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingAdvance}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {recordingAdvance ? 'Recording...' : 'Confirm Advance Payment'}
                </button>
              </div>
            </form>
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
                  placeholder="e.g. Panels secured with edge protectors, hardware boxed separately."
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
                    const iframe = document.getElementById('timeline-pdf-iframe') as HTMLIFrameElement;
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
              {pdfLoading ? (
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#7FB706] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-gray-400 text-xs">Generating vector A4 document with stage-specific T&C...</p>
                </div>
              ) : (
                <iframe
                  id="timeline-pdf-iframe"
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
