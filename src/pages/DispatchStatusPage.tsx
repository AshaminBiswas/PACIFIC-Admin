import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Truck,
  FileText,
  Package,
  Layers,
  Receipt,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  Printer,
  Eye,
  RefreshCw,
  X,
  ExternalLink,
  Phone,
  MapPin,
  User,
  Copy,
  Check,
  AlertCircle,
  FileCheck,
  ArrowRight,
  Filter,
} from 'lucide-react';
import DocumentFlowTimelineModal from '../components/common/DocumentFlowTimelineModal';
import { salesOrdersApi, packingListsApi, crmApi } from '../api/services';
import type { SalesOrder, PackingList, BusinessParty } from '../types/admin';

export interface DispatchRowItem {
  id: string;
  dispatchNumber: string;
  dispatchDate: string;
  vehicleNumber?: string;
  transporterName?: string;
  driverName?: string;
  driverPhone?: string;
  lrNumber?: string;
  lrDate?: string;
  ewayBillNumber?: string;
  totalPackages?: number;
  totalQuantity?: number;
  status: 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'ACKNOWLEDGED';
  isPartialDispatch?: boolean;
  notes?: string;

  // 4 Upstream Linked Documents
  quotationId?: string;
  quotationRef?: string;
  piId?: string;
  piNumber?: string;
  orderId?: string;
  orderNumber?: string;
  packingListId?: string;
  packingListNumber?: string;

  // Client & Site
  customerId?: string;
  customerName?: string;
  shipToName?: string;
  shipToAddress?: string;
  siteContactName?: string;
  siteContactPhone?: string;

  // Digital Delivery Acknowledgment
  digitalAckToken?: string;
  receivedByName?: string;
  receivedByPhone?: string;
  receivedAt?: string;
}

export default function DispatchStatusPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plIdFilter = searchParams.get('plId');

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'ACKNOWLEDGED'>('ALL');

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [packingLists, setPackingLists] = useState<PackingList[]>([]);
  const [customers, setCustomers] = useState<BusinessParty[]>([]);

  // Modals
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordingDispatch, setRecordingDispatch] = useState(false);
  const [recordForm, setRecordForm] = useState({
    selectedOrderId: '',
    selectedPackingListId: '',
    transporterName: '',
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
    lrNumber: '',
    ewayBillNumber: '',
    totalPackages: 1,
    notes: '',
  });

  // Status Change Modal
  const [statusModalItem, setStatusModalItem] = useState<DispatchRowItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'ACKNOWLEDGED'>('DELIVERED');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Gate Pass Vector A4 Modal
  const [gatePassItem, setGatePassItem] = useState<DispatchRowItem | null>(null);
  const [selectedDispatchForTimeline, setSelectedDispatchForTimeline] = useState<DispatchRowItem | null>(null);

  // Packing List Preview Modal
  const [previewPlUrl, setPreviewPlUrl] = useState<string | null>(null);
  const [previewPlNumber, setPreviewPlNumber] = useState<string>('');

  // Copy Feedback
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Load all logistics data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordRes, plRes, custRes] = await Promise.all([
        salesOrdersApi.list({ limit: 100 }),
        packingListsApi.list({ limit: 100 }),
        crmApi.listCustomers({ limit: 100 }),
      ]);

      if (ordRes.data?.data?.items) setOrders(ordRes.data.data.items);
      if (plRes.data?.data?.items) setPackingLists(plRes.data.data.items);
      if (custRes.data?.data?.items) setCustomers(custRes.data.data.items);
    } catch (err) {
      console.error('Failed to load dispatch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Consolidate dispatches from Packing Lists and Sales Order records
  const dispatchItems: DispatchRowItem[] = useMemo(() => {
    const rows: DispatchRowItem[] = [];
    const seenKeys = new Set<string>();

    // 1. Process from Packing Lists
    for (const pl of packingLists) {
      const ord = orders.find((o) => o.id === pl.orderId || o.id === pl.order?.id);
      const cust = pl.customer || ord?.customer || (pl.customerId ? customers.find((c) => c.id === pl.customerId) : undefined);

      const dspNum = pl.packingListNumber ? `DSP/${pl.packingListNumber.replace(/^PPS\/?PL\/?/i, '').replace(/^PL\/?/i, '')}` : `DSP-${pl.id.slice(-6).toUpperCase()}`;

      const item: DispatchRowItem = {
        id: pl.id,
        dispatchNumber: dspNum,
        dispatchDate: pl.date || pl.createdAt,
        vehicleNumber: (pl as any).vehicleNumber || (ord as any)?.dispatchRecords?.[0]?.vehicleNumber || undefined,
        transporterName: (pl as any).transporterName || (ord as any)?.dispatchRecords?.[0]?.transporterName || 'Direct Pacific Transport',
        driverName: (pl as any).driverName || (ord as any)?.dispatchRecords?.[0]?.driverName || undefined,
        driverPhone: (pl as any).driverPhone || (ord as any)?.dispatchRecords?.[0]?.driverPhone || undefined,
        lrNumber: (pl as any).lrNumber || (ord as any)?.dispatchRecords?.[0]?.lrNumber || undefined,
        lrDate: (pl as any).lrDate || undefined,
        ewayBillNumber: (pl as any).ewayBillNumber || (ord as any)?.dispatchRecords?.[0]?.ewayBillNumber || undefined,
        totalPackages: pl.totalPackages || 1,
        totalQuantity: Number(pl.totalQuantity) || (pl.items?.length ?? 1),
        status: (pl.receiptStatus as any) || 'DISPATCHED',
        isPartialDispatch: Boolean(pl.isPartialDispatch),
        notes: pl.notes || undefined,

        // Linked 4 Docs
        quotationId: (ord as any)?.quotationId || (ord as any)?.quotation?.id || undefined,
        quotationRef: (ord as any)?.quotation?.quotationNumber || (ord as any)?.quotationNumber || undefined,
        piId: pl.proformaInvoiceId || (ord as any)?.proformaInvoiceId || undefined,
        piNumber: pl.proformaInvoice?.piNumber || (ord as any)?.piNumber || (ord as any)?.proformaInvoice?.piNumber || undefined,
        orderId: pl.orderId || ord?.id || undefined,
        orderNumber: ord?.orderNumber || (pl.order as any)?.orderNumber || undefined,
        packingListId: pl.id,
        packingListNumber: pl.packingListNumber,

        // Customer & Site
        customerId: pl.customerId,
        customerName: cust?.tradeName || cust?.legalName || pl.shipToName || 'B2B Client',
        shipToName: pl.shipToName,
        shipToAddress: pl.shipToAddress,
        siteContactName: pl.siteContactName,
        siteContactPhone: pl.siteContactPhone,

        // Digital Ack
        digitalAckToken: pl.digitalAckToken,
        receivedByName: pl.receivedByName,
        receivedByPhone: pl.receivedByPhone,
        receivedAt: pl.receivedAt,
      };

      seenKeys.add(pl.id);
      rows.push(item);
    }

    // 2. Also incorporate direct Sales Order dispatchRecords that may not be linked to a PL yet
    for (const ord of orders) {
      if (ord.dispatchRecords && ord.dispatchRecords.length > 0) {
        for (const dr of ord.dispatchRecords) {
          if (dr.packingListId && seenKeys.has(dr.packingListId)) {
            // Already incorporated via packing list, enrich fields
            const existing = rows.find((r) => r.packingListId === dr.packingListId);
            if (existing) {
              if (dr.vehicleNumber) existing.vehicleNumber = dr.vehicleNumber;
              if (dr.transporterName) existing.transporterName = dr.transporterName;
              if (dr.driverName) existing.driverName = dr.driverName;
              if (dr.driverPhone) existing.driverPhone = dr.driverPhone;
              if (dr.lrNumber) existing.lrNumber = dr.lrNumber;
              if (dr.ewayBillNumber) existing.ewayBillNumber = dr.ewayBillNumber;
            }
          } else {
            // Standalone dispatch entry
            rows.push({
              id: dr.id,
              dispatchNumber: dr.dispatchNumber || `DSP/${dr.id.slice(-6).toUpperCase()}`,
              dispatchDate: dr.dispatchDate || dr.createdAt || new Date().toISOString(),
              vehicleNumber: dr.vehicleNumber || undefined,
              transporterName: dr.transporterName || 'Express Logistics',
              driverName: dr.driverName || undefined,
              driverPhone: dr.driverPhone || undefined,
              lrNumber: dr.lrNumber || undefined,
              ewayBillNumber: dr.ewayBillNumber || undefined,
              totalPackages: dr.totalPackages || 1,
              totalQuantity: 1,
              status: (dr.status as any) || 'DISPATCHED',
              isPartialDispatch: false,
              notes: dr.notes || undefined,

              quotationId: (ord as any).quotationId || (ord as any).quotation?.id || undefined,
              quotationRef: (ord as any).quotation?.quotationNumber || (ord as any).quotationNumber || undefined,
              piId: (ord as any).proformaInvoiceId || undefined,
              piNumber: (ord as any).piNumber || undefined,
              orderId: ord.id,
              orderNumber: ord.orderNumber,
              packingListId: dr.packingListId || undefined,
              packingListNumber: dr.packingList?.packingListNumber || undefined,

              customerId: ord.customerId,
              customerName: ord.customer?.tradeName || ord.customer?.legalName || ord.siteName || 'B2B Client',
              shipToName: ord.siteName || ord.customer?.legalName,
              shipToAddress: ord.siteAddress,
            });
          }
        }
      }
    }

    return rows.sort((a, b) => new Date(b.dispatchDate).getTime() - new Date(a.dispatchDate).getTime());
  }, [packingLists, orders, customers]);

  // Filtered Dispatches
  const filteredDispatches = useMemo(() => {
    return dispatchItems.filter((item) => {
      // PL ID filter from URL query
      if (plIdFilter && item.packingListId !== plIdFilter && item.id !== plIdFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchDispatch = item.dispatchNumber.toLowerCase().includes(q);
        const matchQuote = item.quotationRef?.toLowerCase().includes(q);
        const matchPi = item.piNumber?.toLowerCase().includes(q);
        const matchOrder = item.orderNumber?.toLowerCase().includes(q);
        const matchPl = item.packingListNumber?.toLowerCase().includes(q);
        const matchCustomer = item.customerName?.toLowerCase().includes(q) || item.shipToName?.toLowerCase().includes(q);
        const matchVehicle = item.vehicleNumber?.toLowerCase().includes(q);
        const matchTransporter = item.transporterName?.toLowerCase().includes(q);
        const matchLr = item.lrNumber?.toLowerCase().includes(q) || item.ewayBillNumber?.toLowerCase().includes(q);

        return (
          matchDispatch ||
          matchQuote ||
          matchPi ||
          matchOrder ||
          matchPl ||
          matchCustomer ||
          matchVehicle ||
          matchTransporter ||
          matchLr
        );
      }

      return true;
    });
  }, [dispatchItems, statusFilter, search, plIdFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = dispatchItems.length;
    const dispatched = dispatchItems.filter((d) => d.status === 'DISPATCHED').length;
    const inTransit = dispatchItems.filter((d) => d.status === 'IN_TRANSIT').length;
    const delivered = dispatchItems.filter((d) => d.status === 'DELIVERED').length;
    const acknowledged = dispatchItems.filter((d) => d.status === 'ACKNOWLEDGED').length;
    const totalPackages = dispatchItems.reduce((acc, d) => acc + (d.totalPackages || 0), 0);

    return { total, dispatched, inTransit, delivered, acknowledged, totalPackages };
  }, [dispatchItems]);

  // Record Dispatch Submit
  const handleRecordDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordForm.selectedOrderId) {
      alert('Please select a Sales Order to dispatch.');
      return;
    }

    setRecordingDispatch(true);
    try {
      await salesOrdersApi.recordDispatch(recordForm.selectedOrderId, {
        packingListId: recordForm.selectedPackingListId || undefined,
        transporterName: recordForm.transporterName,
        vehicleNumber: recordForm.vehicleNumber,
        driverName: recordForm.driverName,
        driverPhone: recordForm.driverPhone,
        lrNumber: recordForm.lrNumber,
        ewayBillNumber: recordForm.ewayBillNumber,
        totalPackages: Number(recordForm.totalPackages) || 1,
        notes: recordForm.notes,
      });

      alert('Dispatch Challan & Gate Pass created successfully!');
      setShowRecordModal(false);
      setRecordForm({
        selectedOrderId: '',
        selectedPackingListId: '',
        transporterName: '',
        vehicleNumber: '',
        driverName: '',
        driverPhone: '',
        lrNumber: '',
        ewayBillNumber: '',
        totalPackages: 1,
        notes: '',
      });
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to record dispatch');
    } finally {
      setRecordingDispatch(false);
    }
  };

  // Open Status Modal
  const handleOpenStatusModal = (item: DispatchRowItem) => {
    setStatusModalItem(item);
    setTargetStatus(item.status);
    setReceiverName(item.receivedByName || '');
    setReceiverPhone(item.receivedByPhone || '');
    setStatusNotes(item.notes || '');
  };

  // Save Status Update
  const handleSaveStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalItem || updatingStatus) return;

    setUpdatingStatus(true);
    try {
      if (statusModalItem.packingListId) {
        if (targetStatus === 'ACKNOWLEDGED') {
          await packingListsApi.acknowledge(statusModalItem.packingListId, {
            receivedByName: receiverName || 'Site Representative',
            receivedByPhone: receiverPhone || 'N/A',
            notes: statusNotes,
          });
        } else {
          await packingListsApi.update(statusModalItem.packingListId, {
            receiptStatus: targetStatus,
            receivedByName: receiverName || undefined,
            receivedByPhone: receiverPhone || undefined,
            notes: statusNotes || undefined,
          });
        }
      }

      alert(`Dispatch ${statusModalItem.dispatchNumber} status updated to ${targetStatus}`);
      setStatusModalItem(null);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to update dispatch status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Copy Digital Ack Link
  const handleCopyAckLink = (token?: string) => {
    if (!token) return;
    const url = `${window.location.origin}/acknowledge-receipt/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // Open Gate Pass Print Modal
  const handleOpenGatePass = (item: DispatchRowItem) => {
    setGatePassItem(item);
  };

  // Open Packing List PDF Modal
  const handleOpenPlPdf = (packingListId: string, plNumber: string) => {
    setPreviewPlUrl(packingListsApi.getPdfUrl(packingListId));
    setPreviewPlNumber(plNumber);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/30">
              STAGE 06
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Truck className="w-6 h-6 text-[#7FB706]" />
              Dispatch &amp; Gate Pass Hub
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Complete logistics pipeline cross-reconciling Quotations, PIs, Sales Orders, and Packing Lists with gate passes &amp; tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer border border-white/5"
            title="Refresh Consignments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#7FB706]' : ''}`} />
          </button>
          <button
            onClick={() => setShowRecordModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] text-sm font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            Record Gate Pass
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-3.5">
          <div className="text-xs text-gray-400 font-medium">Total Shipments</div>
          <div className="text-xl sm:text-2xl font-black text-white mt-1">{stats.total}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">All outward dispatches</div>
        </div>

        <div className="bg-[#121226] border border-white/5 rounded-2xl p-3.5">
          <div className="text-xs text-amber-400 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> Dispatched
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{stats.dispatched}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Departed warehouse</div>
        </div>

        <div className="bg-[#121226] border border-white/5 rounded-2xl p-3.5">
          <div className="text-xs text-blue-400 font-medium flex items-center gap-1">
            <Truck className="w-3 h-3" /> In Transit
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-400 mt-1">{stats.inTransit}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">On route to client site</div>
        </div>

        <div className="bg-[#121226] border border-white/5 rounded-2xl p-3.5">
          <div className="text-xs text-purple-400 font-medium flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Site Delivered
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-400 mt-1">{stats.delivered}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Arrived at destination</div>
        </div>

        <div className="bg-[#121226] border border-white/5 rounded-2xl p-3.5">
          <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Acknowledged
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{stats.acknowledged}</div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5">Signed by site receiver</div>
        </div>

        <div className="bg-[#121226] border border-white/5 rounded-2xl p-3.5">
          <div className="text-xs text-[#7FB706] font-medium flex items-center gap-1">
            <Package className="w-3 h-3" /> Cargo Packages
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#7FB706] mt-1">{stats.totalPackages}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Total crates &amp; bundles</div>
        </div>
      </div>

      {/* ── Search & Filters Bar ───────────────────────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Quotation (PPS/D/...), PI (PPS/PI/...), Order (PPS/ORD/...), PL (PPS/PL/...), Vehicle, or Client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
          {(['ALL', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'ACKNOWLEDGED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap min-h-[40px] ${
                statusFilter === st
                  ? 'bg-[#7FB706] text-[#030213] shadow-md shadow-[#7FB706]/20'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Data View (Desktop Table + Mobile Cards) ──────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-[#7FB706] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm font-medium text-white">Loading Logistics &amp; Dispatch Hub...</p>
            <p className="text-xs text-gray-500 mt-1">Reconciling Quotations, PIs, Orders, and Packing Lists</p>
          </div>
        ) : filteredDispatches.length === 0 ? (
          <div className="p-16 text-center text-gray-400 space-y-3">
            <Truck className="w-12 h-12 text-gray-600 mx-auto" />
            <p className="text-base font-bold text-white">No Dispatch Records Found</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              {search || statusFilter !== 'ALL'
                ? 'Try refining your omni-search query or switching filter tabs.'
                : 'Generate a Packing List in Stage 05 or click "Record Gate Pass" to dispatch cubicle consignments.'}
            </p>
          </div>
        ) : (
          <>
            {/* ── Desktop Table ─────────────────────────────────── */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-[#0a0a1a] text-[11px] uppercase tracking-wider text-gray-400 border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4 text-center w-12">#</th>
                    <th className="py-3 px-4">Gate Pass &amp; Transport</th>
                    <th className="py-3 px-4 min-w-[280px]">
                      <div className="flex items-center gap-1.5 text-[#7FB706]">
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>All 4 Linked Pipeline Docs</span>
                      </div>
                    </th>
                    <th className="py-3 px-4">Customer &amp; Destination Site</th>
                    <th className="py-3 px-4 text-center">Packages</th>
                    <th className="py-3 px-4">Receipt Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredDispatches.map((item, idx) => (
                    <tr
                      key={item.id + idx}
                      onClick={() => setSelectedDispatchForTimeline(item)}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                      {/* Index */}
                      <td className="py-3 px-4 text-center font-mono text-gray-500 text-xs">
                        {idx + 1}
                      </td>

                      {/* Gate Pass & Transport */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-white flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-[#7FB706]" />
                          <span>{item.dispatchNumber}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(item.dispatchDate).toLocaleDateString('en-GB')}
                        </div>
                        <div className="text-[11px] text-gray-300 mt-1 flex items-center gap-1.5">
                          <span className="font-semibold text-white">{item.transporterName}</span>
                          {item.vehicleNumber && (
                            <span className="font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 text-[10px]">
                              {item.vehicleNumber}
                            </span>
                          )}
                        </div>
                        {item.lrNumber && (
                          <div className="text-[10px] font-mono text-gray-500">
                            LR/GR: {item.lrNumber}
                          </div>
                        )}
                      </td>

                      {/* 4 Linked Documents Matrix */}
                      <td className="py-3 px-4">
                        <div className="grid grid-cols-2 gap-1.5">
                          {/* 01 Quotation */}
                          <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                            <span className="text-[10px] text-gray-500 font-bold uppercase">01 Quote</span>
                            {item.quotationId ? (
                              <Link
                                to={`/admin/dashboard/sales-quotations/${item.quotationId}`}
                                className="font-mono text-[11px] font-semibold text-blue-400 hover:underline truncate max-w-[120px]"
                                title={`Quotation: ${item.quotationRef}`}
                              >
                                {item.quotationRef || 'View Quote'}
                              </Link>
                            ) : item.quotationRef ? (
                              <span className="font-mono text-[11px] text-gray-300 truncate max-w-[120px]">
                                {item.quotationRef}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-600 italic">Direct Order</span>
                            )}
                          </div>

                          {/* 02 Proforma Invoice */}
                          <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                            <span className="text-[10px] text-gray-500 font-bold uppercase">02 PI</span>
                            {item.piId ? (
                              <Link
                                to={`/admin/dashboard/proforma-invoices/${item.piId}`}
                                className="font-mono text-[11px] font-semibold text-emerald-400 hover:underline truncate max-w-[120px]"
                                title={`Proforma Invoice: ${item.piNumber}`}
                              >
                                {item.piNumber || 'View PI'}
                              </Link>
                            ) : item.piNumber ? (
                              <span className="font-mono text-[11px] text-gray-300 truncate max-w-[120px]">
                                {item.piNumber}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-600 italic">No PI Ref</span>
                            )}
                          </div>

                          {/* 03 Sales Order */}
                          <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                            <span className="text-[10px] text-gray-500 font-bold uppercase">03 Order</span>
                            {item.orderId ? (
                              <Link
                                to={`/admin/dashboard/sales-orders/${item.orderId}`}
                                className="font-mono text-[11px] font-semibold text-amber-400 hover:underline truncate max-w-[120px]"
                                title={`Sales Order: ${item.orderNumber}`}
                              >
                                {item.orderNumber || 'View Order'}
                              </Link>
                            ) : (
                              <span className="text-[10px] text-gray-600 italic">Direct Dispatch</span>
                            )}
                          </div>

                          {/* 05 Packing List */}
                          <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                            <span className="text-[10px] text-gray-500 font-bold uppercase">05 PL</span>
                            {item.packingListId ? (
                              <Link
                                to={`/admin/dashboard/packing-lists`}
                                className="font-mono text-[11px] font-semibold text-purple-400 hover:underline truncate max-w-[120px]"
                                title={`Packing List: ${item.packingListNumber}`}
                              >
                                {item.packingListNumber || 'View PL'}
                              </Link>
                            ) : (
                              <span className="text-[10px] text-gray-600 italic">Manual Dispatch</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Customer & Destination Site */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-xs sm:text-sm">
                          {item.customerName}
                        </div>
                        {item.shipToAddress && (
                          <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 line-clamp-1">
                            <MapPin className="w-3 h-3 text-[#7FB706] shrink-0" />
                            <span className="truncate">{item.shipToAddress}</span>
                          </div>
                        )}
                        {item.siteContactName && (
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 shrink-0" />
                            <span>{item.siteContactName}</span>
                            {item.siteContactPhone && (
                              <a
                                href={`tel:${item.siteContactPhone}`}
                                className="text-[#7FB706] hover:underline ml-1 font-mono"
                              >
                                {item.siteContactPhone}
                              </a>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Packages */}
                      <td className="py-3 px-4 text-center">
                        <div className="text-sm font-bold text-white">
                          {item.totalPackages || 1} Packages
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {item.totalQuantity || 1} Items
                        </div>
                        {item.isPartialDispatch && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-block mt-0.5">
                            PARTIAL
                          </span>
                        )}
                      </td>

                      {/* Receipt Status */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(item)}
                          className={`group inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer hover:ring-2 hover:ring-[#7FB706]/40 ${
                            item.status === 'ACKNOWLEDGED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : item.status === 'DELIVERED'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20'
                              : item.status === 'IN_TRANSIT'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                          }`}
                          title="Click to update status"
                        >
                          {item.status === 'ACKNOWLEDGED' && <CheckCircle2 className="w-3 h-3" />}
                          {item.status === 'IN_TRANSIT' && <Truck className="w-3 h-3" />}
                          {item.status === 'DELIVERED' && <MapPin className="w-3 h-3" />}
                          {item.status === 'DISPATCHED' && <Clock className="w-3 h-3" />}
                          <span>{item.status}</span>
                        </button>

                        {item.receivedByName && (
                          <div className="text-[10px] text-gray-500 mt-1 font-mono">
                            Signed: {item.receivedByName}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {/* Flow Timeline */}
                        <button
                          onClick={() => setSelectedDispatchForTimeline(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#B5F823] text-xs font-semibold rounded-lg border border-[#7FB706]/30 cursor-pointer shadow-sm"
                          title="View Document Flow Timeline (Status & Next Steps)"
                        >
                          <Layers className="w-3.5 h-3.5" /> Flow
                        </button>

                        {/* Gate Pass Print */}
                        <button
                          onClick={() => handleOpenGatePass(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] text-xs font-semibold rounded-lg border border-[#7FB706]/30 cursor-pointer"
                          title="View Official Gate Pass & Challan"
                        >
                          <Printer className="w-3.5 h-3.5" /> Gate Pass
                        </button>

                        {/* Packing List PDF */}
                        {item.packingListId && (
                          <button
                            onClick={() => handleOpenPlPdf(item.packingListId!, item.packingListNumber || '')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium rounded-lg border border-white/5 cursor-pointer"
                            title="View Packing List PDF"
                          >
                            <Eye className="w-3.5 h-3.5" /> PL PDF
                          </button>
                        )}

                        {/* Digital Ack Token Copy */}
                        {item.digitalAckToken && (
                          <button
                            onClick={() => handleCopyAckLink(item.digitalAckToken)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs rounded-lg cursor-pointer"
                            title="Copy Public Delivery Acknowledgment Link"
                          >
                            {copiedToken === item.digitalAckToken ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile / Tablet Card View ──────────────────────── */}
            <div className="xl:hidden p-4 space-y-4">
              {filteredDispatches.map((item, idx) => (
                <div
                  key={item.id + idx}
                  className="bg-[#0e0e1e] border border-white/5 rounded-2xl p-4 space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#7FB706] flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5" />
                          {item.dispatchNumber}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(item.dispatchDate).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-base mt-1">{item.customerName}</h3>
                      {item.shipToAddress && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#7FB706] shrink-0" />
                          <span className="line-clamp-1">{item.shipToAddress}</span>
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenStatusModal(item)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-full inline-flex items-center gap-1 cursor-pointer shrink-0 ${
                        item.status === 'ACKNOWLEDGED'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : item.status === 'DELIVERED'
                          ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                          : item.status === 'IN_TRANSIT'
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      <span>{item.status}</span>
                    </button>
                  </div>

                  {/* 4 Pipeline Linked Documents */}
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                      <FileCheck className="w-3 h-3 text-[#7FB706]" />
                      <span>Linked Pipeline Documents</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      {/* Quote */}
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0a0a1a]">
                        <span className="text-[10px] text-gray-500">Quote:</span>
                        {item.quotationId ? (
                          <Link
                            to={`/admin/dashboard/sales-quotations/${item.quotationId}`}
                            className="font-mono text-[11px] font-semibold text-blue-400 truncate max-w-[100px]"
                          >
                            {item.quotationRef || 'Quote'}
                          </Link>
                        ) : (
                          <span className="text-[10px] text-gray-500">Direct</span>
                        )}
                      </div>

                      {/* PI */}
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0a0a1a]">
                        <span className="text-[10px] text-gray-500">PI:</span>
                        {item.piId ? (
                          <Link
                            to={`/admin/dashboard/proforma-invoices/${item.piId}`}
                            className="font-mono text-[11px] font-semibold text-emerald-400 truncate max-w-[100px]"
                          >
                            {item.piNumber || 'PI'}
                          </Link>
                        ) : (
                          <span className="text-[10px] text-gray-500">None</span>
                        )}
                      </div>

                      {/* Order */}
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0a0a1a]">
                        <span className="text-[10px] text-gray-500">Order:</span>
                        {item.orderId ? (
                          <Link
                            to={`/admin/dashboard/sales-orders/${item.orderId}`}
                            className="font-mono text-[11px] font-semibold text-amber-400 truncate max-w-[100px]"
                          >
                            {item.orderNumber || 'Order'}
                          </Link>
                        ) : (
                          <span className="text-[10px] text-gray-500">Direct</span>
                        )}
                      </div>

                      {/* PL */}
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0a0a1a]">
                        <span className="text-[10px] text-gray-500">PL:</span>
                        {item.packingListId ? (
                          <Link
                            to={`/admin/dashboard/packing-lists`}
                            className="font-mono text-[11px] font-semibold text-purple-400 truncate max-w-[100px]"
                          >
                            {item.packingListNumber || 'PL'}
                          </Link>
                        ) : (
                          <span className="text-[10px] text-gray-500">Manual</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Transporter & Cargo details */}
                  <div className="flex items-center justify-between text-xs text-gray-300 pt-1">
                    <div>
                      <span className="font-semibold text-white">{item.transporterName}</span>
                      {item.vehicleNumber && (
                        <span className="ml-1.5 font-mono text-[11px] text-amber-300">({item.vehicleNumber})</span>
                      )}
                    </div>
                    <div className="font-bold text-[#7FB706]">
                      {item.totalPackages || 1} Packages ({item.totalQuantity || 1} Pcs)
                    </div>
                  </div>

                  {/* Action buttons (>= 44px touch targets) */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      onClick={() => setSelectedDispatchForTimeline(item)}
                      className="min-h-[44px] py-2 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#B5F823] text-xs font-bold rounded-xl border border-[#7FB706]/30 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" /> Flow
                    </button>

                    <button
                      onClick={() => handleOpenGatePass(item)}
                      className="min-h-[44px] py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/5 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Gate Pass
                    </button>

                    <button
                      onClick={() => handleOpenStatusModal(item)}
                      className="min-h-[44px] py-2 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-bold rounded-xl border border-white/5 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" /> Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── MODAL: Record Gate Pass & Dispatch ──────────────────── */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0e0e1e]">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#7FB706]" />
                <h3 className="font-bold text-white text-base">Record Dispatch &amp; Gate Pass</h3>
              </div>
              <button
                onClick={() => setShowRecordModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordDispatchSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Sales Order Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Select Sales Order (Stage 03) *
                </label>
                <select
                  required
                  value={recordForm.selectedOrderId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const selOrd = orders.find((o) => o.id === selId);
                    const selPl = packingLists.find((p) => p.orderId === selId);
                    setRecordForm({
                      ...recordForm,
                      selectedOrderId: selId,
                      selectedPackingListId: selPl ? selPl.id : '',
                    });
                  }}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-semibold focus:border-[#7FB706] focus:outline-none"
                >
                  <option value="">-- Choose Confirmed Sales Order --</option>
                  {orders.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      {ord.orderNumber} — {ord.customer?.legalName || 'Client'} (₹{Number(ord.grandTotal).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Linked Packing List */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Linked Packing List (Stage 05)
                </label>
                <select
                  value={recordForm.selectedPackingListId}
                  onChange={(e) => setRecordForm({ ...recordForm, selectedPackingListId: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-semibold focus:border-[#7FB706] focus:outline-none"
                >
                  <option value="">-- Optional: Link Packing List --</option>
                  {packingLists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.packingListNumber} — {pl.shipToName} ({pl.totalPackages || 1} pkgs)
                    </option>
                  ))}
                </select>
              </div>

              {/* Transporter & Vehicle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Transporter / Carrier *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VRL Logistics, SafeXpress, Self"
                    value={recordForm.transporterName}
                    onChange={(e) => setRecordForm({ ...recordForm, transporterName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Vehicle Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH-04-AB-1234"
                    value={recordForm.vehicleNumber}
                    onChange={(e) => setRecordForm({ ...recordForm, vehicleNumber: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* Driver Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Driver Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Suresh Kumar"
                    value={recordForm.driverName}
                    onChange={(e) => setRecordForm({ ...recordForm, driverName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Driver Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={recordForm.driverPhone}
                    onChange={(e) => setRecordForm({ ...recordForm, driverPhone: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-mono"
                  />
                </div>
              </div>

              {/* LR & E-Way Bill */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">LR / GR Docket Number</label>
                  <input
                    type="text"
                    placeholder="e.g. LR-908123"
                    value={recordForm.lrNumber}
                    onChange={(e) => setRecordForm({ ...recordForm, lrNumber: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">E-Way Bill Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 12189201928"
                    value={recordForm.ewayBillNumber}
                    onChange={(e) => setRecordForm({ ...recordForm, ewayBillNumber: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-mono"
                  />
                </div>
              </div>

              {/* Total Packages */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Total Packages / Crates *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={recordForm.totalPackages}
                  onChange={(e) => setRecordForm({ ...recordForm, totalPackages: Number(e.target.value) })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-bold"
                />
              </div>

              {/* Dispatch Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Dispatch / Gate Pass Notes</label>
                <textarea
                  rows={2}
                  placeholder="Security gate remarks, seal numbers, handling instructions..."
                  value={recordForm.notes}
                  onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingDispatch}
                  className="px-5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer shadow-lg shadow-[#7FB706]/20"
                >
                  {recordingDispatch ? 'Generating...' : 'Save & Issue Gate Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Update Receipt Status ───────────────────────── */}
      {statusModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0e0e1e]">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Update Dispatch Status</h3>
                  <p className="text-xs text-gray-400 font-mono">{statusModalItem.dispatchNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setStatusModalItem(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStatusUpdate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">Transit &amp; Delivery Stage</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'DISPATCHED', label: 'Dispatched', color: 'border-amber-500/40 text-amber-300 bg-amber-500/10' },
                    { id: 'IN_TRANSIT', label: 'In Transit', color: 'border-blue-500/40 text-blue-300 bg-blue-500/10' },
                    { id: 'DELIVERED', label: 'Delivered', color: 'border-purple-500/40 text-purple-300 bg-purple-500/10' },
                    { id: 'ACKNOWLEDGED', label: 'Acknowledged', color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setTargetStatus(st.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                        targetStatus === st.id
                          ? `${st.color} ring-2 ring-[#7FB706]`
                          : 'border-white/5 bg-[#0a0a1a] text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="font-mono text-[10px] opacity-75">{st.id}</div>
                      <div>{st.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {(targetStatus === 'DELIVERED' || targetStatus === 'ACKNOWLEDGED') && (
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Received By Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Singh (Site Engineer)"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Receiver Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={receiverPhone}
                      onChange={(e) => setReceiverPhone(e.target.value)}
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Remarks / Note</label>
                <textarea
                  rows={2}
                  placeholder="Delivery observations, site gate entry note..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setStatusModalItem(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer shadow-lg shadow-[#7FB706]/20"
                >
                  {updatingStatus ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Vector A4 Gate Pass & Dispatch Challan ──────── */}
      {gatePassItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0e0e1e] shrink-0">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#7FB706]" />
                <span className="font-bold text-white text-sm sm:text-base">
                  Gate Pass &amp; Material Outward Challan ({gatePassItem.dispatchNumber})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-[#7FB706] text-[#030213] text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#7FB706]/20"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Gate Pass
                </button>
                <button
                  onClick={() => setGatePassItem(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Printable Body */}
            <div className="flex-1 bg-white text-gray-900 overflow-y-auto p-6 sm:p-8 font-sans">
              <div className="max-w-[210mm] mx-auto border-2 border-gray-900 p-6 space-y-4">
                {/* Letterhead */}
                <div className="border-b-2 border-gray-900 pb-3 flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-wider">
                      PACIFIC PRODUCTS &amp; SOLUTIONS
                    </h2>
                    <p className="text-xs text-gray-600 font-medium">
                      Commercial Restroom Cubicles &amp; Locker Systems Division
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Regd. Office: Sector 62, Noida, NCR, India | GSTIN: 07AAAAA0000A1Z5
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-gray-900 text-white font-black text-xs uppercase tracking-widest">
                      GATE PASS / OUTWARD CHALLAN
                    </span>
                    <div className="font-mono text-xs font-bold mt-1 text-gray-900">
                      NO: {gatePassItem.dispatchNumber}
                    </div>
                    <div className="text-xs text-gray-600">
                      Date: {new Date(gatePassItem.dispatchDate).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                </div>

                {/* 4 Pipeline Links Banner */}
                <div className="bg-gray-100 border border-gray-300 p-3 rounded text-xs grid grid-cols-4 gap-2 font-mono">
                  <div>
                    <div className="text-[9px] uppercase text-gray-500 font-bold">01 Quotation</div>
                    <div className="font-bold text-gray-900">{gatePassItem.quotationRef || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-gray-500 font-bold">02 Proforma PI</div>
                    <div className="font-bold text-gray-900">{gatePassItem.piNumber || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-gray-500 font-bold">03 Sales Order</div>
                    <div className="font-bold text-gray-900">{gatePassItem.orderNumber || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-gray-500 font-bold">05 Packing List</div>
                    <div className="font-bold text-gray-900">{gatePassItem.packingListNumber || 'N/A'}</div>
                  </div>
                </div>

                {/* Consignee & Carrier Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="border border-gray-300 p-3 rounded space-y-1">
                    <div className="font-bold uppercase tracking-wider text-gray-500 text-[10px]">
                      CONSIGNEE &amp; DESTINATION SITE
                    </div>
                    <div className="font-bold text-sm text-gray-900">{gatePassItem.customerName}</div>
                    <div className="text-gray-700">{gatePassItem.shipToAddress || 'Job Site Location'}</div>
                    {gatePassItem.siteContactName && (
                      <div className="text-gray-600 pt-1 border-t border-gray-200 mt-1">
                        Site Contact: <span className="font-semibold">{gatePassItem.siteContactName}</span> ({gatePassItem.siteContactPhone || 'N/A'})
                      </div>
                    )}
                  </div>

                  <div className="border border-gray-300 p-3 rounded space-y-1 font-mono">
                    <div className="font-bold uppercase tracking-wider text-gray-500 text-[10px]">
                      CARRIER &amp; VEHICLE PARTICULARS
                    </div>
                    <div>Transporter: <span className="font-bold text-gray-900">{gatePassItem.transporterName || 'Direct'}</span></div>
                    <div>Vehicle No: <span className="font-bold text-gray-900">{gatePassItem.vehicleNumber || 'N/A'}</span></div>
                    <div>Driver: <span className="font-semibold">{gatePassItem.driverName || 'N/A'}</span> ({gatePassItem.driverPhone || 'N/A'})</div>
                    <div>LR / GR No: <span className="font-semibold">{gatePassItem.lrNumber || 'N/A'}</span></div>
                    <div>E-Way Bill: <span className="font-semibold">{gatePassItem.ewayBillNumber || 'N/A'}</span></div>
                  </div>
                </div>

                {/* Cargo Details */}
                <div className="border border-gray-300 rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 font-bold text-gray-700 border-b border-gray-300">
                      <tr>
                        <th className="p-2 w-12 text-center">S.No</th>
                        <th className="p-2">Description of Material</th>
                        <th className="p-2 text-center w-28">Total Packages</th>
                        <th className="p-2 text-center w-28">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="p-2 text-center font-mono">1</td>
                        <td className="p-2">
                          <div className="font-bold">Restroom Cubicle Panels, Hardware &amp; Aluminium Profiles</div>
                          <div className="text-gray-500 text-[11px]">As per approved Packing List #{gatePassItem.packingListNumber || 'Consignment'}</div>
                        </td>
                        <td className="p-2 text-center font-bold text-gray-900">
                          {gatePassItem.totalPackages || 1} Crates / Bundles
                        </td>
                        <td className="p-2 text-center font-bold text-gray-900">
                          {gatePassItem.totalQuantity || 1} Sets
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-4 pt-10 text-center text-xs">
                  <div className="border-t border-gray-900 pt-1">
                    <p className="font-bold text-gray-900">Prepared / Store In-Charge</p>
                    <p className="text-[10px] text-gray-500">Pacific Cubicles Plant</p>
                  </div>
                  <div className="border-t border-gray-900 pt-1">
                    <p className="font-bold text-gray-900">Driver Signature</p>
                    <p className="text-[10px] text-gray-500">Material Received in Good Condition</p>
                  </div>
                  <div className="border-t border-gray-900 pt-1">
                    <p className="font-bold text-gray-900">Security Gate Outward</p>
                    <p className="text-[10px] text-gray-500">Checked &amp; Time Out Stamp</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Packing List Vector A4 Preview ───────────────── */}
      {previewPlUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0e0e1e] shrink-0">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#7FB706]" />
                <span className="font-bold text-white text-sm sm:text-base">
                  Packing List Preview ({previewPlNumber})
                </span>
              </div>
              <button
                onClick={() => setPreviewPlUrl(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-white overflow-hidden">
              <iframe
                title="Packing List PDF"
                src={previewPlUrl}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Document Flow Timeline Modal for Individual Dispatches */}
      {selectedDispatchForTimeline && (
        <DocumentFlowTimelineModal
          isOpen={!!selectedDispatchForTimeline}
          onClose={() => setSelectedDispatchForTimeline(null)}
          title="Dispatch Challan & Gate Pass"
          stage={6}
          documentRef={selectedDispatchForTimeline.dispatchNumber}
          currentStatus={selectedDispatchForTimeline.status}
          statusDescription="Outward gate pass under carrier custody with vehicle and transporter records."
          linkedDocs={{
            quotationId: selectedDispatchForTimeline.quotationId,
            quotationRef: selectedDispatchForTimeline.quotationRef,
            piId: selectedDispatchForTimeline.piId,
            piNumber: selectedDispatchForTimeline.piNumber,
            orderId: selectedDispatchForTimeline.orderId,
            orderNumber: selectedDispatchForTimeline.orderNumber,
            packingListId: selectedDispatchForTimeline.packingListId,
            plNumber: selectedDispatchForTimeline.packingListNumber,
          }}
          primaryDetailUrl={
            selectedDispatchForTimeline.orderId
              ? `/admin/dashboard/sales-orders/${selectedDispatchForTimeline.orderId}`
              : undefined
          }
        />
      )}
    </div>
  );
}
