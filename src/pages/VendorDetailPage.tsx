import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Truck,
  ArrowLeft,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  AlertCircle,
  ExternalLink,
  Plus,
  RefreshCw,
  Clock,
  Users,
  Building,
  Package,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  Search,
  Copy,
  Check,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Boxes,
} from 'lucide-react';
import { vendorsApi } from '../api/services';
import type { BusinessParty, PurchaseOrder, Payment, MaterialSupplyItem } from '../types/admin';

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState<BusinessParty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ORDERS' | 'SUPPLIES' | 'PAYMENTS' | 'CONTACTS'>('OVERVIEW');

  // Search filter for Material Supplies
  const [supplySearch, setSupplySearch] = useState('');

  // Copy-to-clipboard state tracker
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchVendor = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await vendorsApi.getVendorById(id);
      if (res.data?.data) {
        setVendor(res.data.data);
      } else {
        setError('Supplier profile not found.');
      }
    } catch (err: any) {
      console.error('Failed to load supplier:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load supplier profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVendor();
  }, [fetchVendor]);

  const handleDelete = async () => {
    if (!vendor) return;
    const name = vendor.legalName;
    if (!confirm(`Are you sure you want to delete supplier "${name}"? This action cannot be undone.`)) return;

    try {
      await vendorsApi.deleteVendor(vendor.id);
      alert(`Supplier "${name}" was deleted successfully.`);
      navigate('/admin/dashboard/vendors');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete supplier');
    }
  };

  // Parse structured notes (Banking, MSME, Credit Limit, General notes)
  const parsedNotes = useMemo(() => {
    const fallback = {
      msmeNumber: '',
      creditLimit: 0,
      bankDetails: {
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        branchName: '',
        upiId: '',
      },
      generalNotes: '',
    };
    if (!vendor?.notes) return fallback;
    try {
      const obj = JSON.parse(vendor.notes);
      if (typeof obj === 'object' && obj !== null) {
        return {
          ...fallback,
          ...obj,
          bankDetails: { ...fallback.bankDetails, ...(obj.bankDetails || {}) },
        };
      }
    } catch {}
    return { ...fallback, generalNotes: String(vendor.notes) };
  }, [vendor?.notes]);

  // Material supplies filtered by search term
  const filteredSupplies = useMemo(() => {
    const list: MaterialSupplyItem[] = vendor?.materialSupplies || [];
    if (!supplySearch.trim()) return list;
    const q = supplySearch.toLowerCase();
    return list.filter(
      (m) =>
        (m.description || '').toLowerCase().includes(q) ||
        (m.finish || '').toLowerCase().includes(q) ||
        (m.thickness || '').toLowerCase().includes(q) ||
        (m.cuttingSize || '').toLowerCase().includes(q) ||
        (m.poNumbers || []).some((po) => po.toLowerCase().includes(q))
    );
  }, [vendor?.materialSupplies, supplySearch]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-[#7FB706] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading Supplier 360° Profile &amp; Records...</p>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 bg-[#0a0a1a] border border-red-500/20 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Error Loading Supplier</h2>
        <p className="text-sm text-gray-400">{error || 'Supplier details could not be found.'}</p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            to="/admin/dashboard/vendors"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition"
          >
            ← Back to Suppliers
          </Link>
          <button
            onClick={fetchVendor}
            className="px-4 py-2 rounded-xl bg-[#7FB706] text-white text-xs font-bold transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const purchaseOrders: PurchaseOrder[] = (vendor.purchaseOrders as any) || [];
  const payments: Payment[] = vendor.payments || [];
  const materialSupplies: MaterialSupplyItem[] = vendor.materialSupplies || [];

  const summary = vendor.summary || {
    totalPoValue: purchaseOrders.reduce((sum, po) => sum + (Number(po.totalAmount) || 0), 0),
    totalPaidValue: payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    outstandingBalance: Math.max(
      0,
      purchaseOrders.reduce((sum, po) => sum + (Number(po.totalAmount) || 0), 0) -
        payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    ),
    totalPoCount: purchaseOrders.length,
    totalPaymentsCount: payments.length,
    totalMaterialTypesCount: materialSupplies.length,
  };

  const primaryContact = vendor.contacts?.find((c) => c.isPrimary) || vendor.contacts?.[0];
  const billingAddr = vendor.addresses?.find((a) => a.addressType === 'BILLING' || a.isDefaultBilling) || vendor.addresses?.[0];
  const factoryAddr = vendor.addresses?.find((a) => a.addressType === 'FACTORY' || (!a.isDefaultBilling && a.isDefaultShipping));

  const getCategoryLabel = (type?: string) => {
    switch (type) {
      case 'HPL_BOARDS':
        return 'HPL Compact Boards (12mm / 18mm)';
      case 'HDF_BOARDS':
        return 'HDF Panels';
      case 'HARDWARE':
      case 'SS':
        return 'SS 304 / 316 Hardware';
      case 'ALUMINIUM':
        return 'Aluminium Extrusions';
      case 'NYLON':
        return 'Virgin Nylon Hardware';
      case 'RAW_MATERIALS':
        return 'Raw Materials & Fasteners';
      case 'FINISHED_GOODS':
        return 'Finished Goods / Cubicles';
      case 'TOOLS_EQUIPMENT':
        return 'Tools & Machinery';
      default:
        return type || 'Procurement Supplier';
    }
  };

  return (
    <div className="space-y-6 pb-28">
      {/* 1. Top Header Bar */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <Link
              to="/admin/dashboard/vendors"
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]"
              title="Back to Supplier Directory"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/30">
                  {getCategoryLabel(vendor.vendorProfile?.vendorType)}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    vendor.status === 'ACTIVE'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : vendor.status === 'ON_HOLD'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {vendor.status || 'ACTIVE'}
                </span>
                {parsedNotes.msmeNumber && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    MSME: {parsedNotes.msmeNumber}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">
                {vendor.legalName}
              </h1>

              {vendor.tradeName && vendor.tradeName !== vendor.legalName && (
                <p className="text-xs text-gray-400 font-medium">Trade Name: {vendor.tradeName}</p>
              )}

              {/* Fast Coordinates Row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 pt-1">
                {vendor.gstin && (
                  <span className="font-mono">
                    <strong className="text-gray-500 font-normal">GSTIN:</strong> {vendor.gstin}
                  </span>
                )}
                {vendor.pan && (
                  <span className="font-mono">
                    <strong className="text-gray-500 font-normal">PAN:</strong> {vendor.pan}
                  </span>
                )}
                {billingAddr?.stateCode && (
                  <span className="font-mono">
                    <strong className="text-gray-500 font-normal">State Code:</strong> {billingAddr.stateCode} ({billingAddr.state})
                  </span>
                )}
                {billingAddr?.postalCode && (
                  <span className="font-mono">
                    <strong className="text-gray-500 font-normal">Pincode:</strong> {billingAddr.postalCode}
                  </span>
                )}
                {vendor.phone && (
                  <a href={`tel:${vendor.phone}`} className="flex items-center gap-1 hover:text-[#7FB706] transition">
                    <Phone className="w-3.5 h-3.5 text-gray-500" /> {vendor.phone}
                  </a>
                )}
                {vendor.email && (
                  <a href={`mailto:${vendor.email}`} className="flex items-center gap-1 hover:text-[#7FB706] transition">
                    <Mail className="w-3.5 h-3.5 text-gray-500" /> {vendor.email}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Desktop/Tablet Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* Edit Supplier */}
            <button
              onClick={() => navigate(`/admin/dashboard/vendors/${vendor.id}/edit`)}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-extrabold text-xs shadow-lg shadow-[#7FB706]/20 transition flex items-center gap-1.5 min-h-[44px] cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
              Edit Supplier
            </button>

            {/* Quick Action: New PO */}
            <button
              onClick={() => navigate(`/admin/dashboard/purchase-orders/new?vendorId=${vendor.id}`)}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-xs font-semibold transition flex items-center gap-1.5 min-h-[44px] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#7FB706]" />
              New Purchase Order
            </button>

            {/* Refresh */}
            <button
              onClick={fetchVendor}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition min-h-[44px] min-w-[44px] flex items-center justify-center border border-white/10 cursor-pointer"
              title="Refresh Supplier Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Delete Supplier */}
            <button
              onClick={handleDelete}
              className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              title="Delete Supplier"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Hero KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Purchase Orders Value */}
        <div className="p-3.5 sm:p-4 bg-[#121226] border border-white/5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Total POs Issued</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-amber-400 font-mono">
            ₹{Number(summary.totalPoValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">{summary.totalPoCount || 0} Purchase Order(s)</div>
        </div>

        {/* Materials Inwarded Types */}
        <div className="p-3.5 sm:p-4 bg-[#121226] border border-white/5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Supplied Materials</span>
            <Boxes className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-sky-400 font-mono">
            {materialSupplies.length} Material SKU(s)
          </div>
          <div className="mt-1 text-[11px] text-gray-500">Across {purchaseOrders.length} Inward Batch(es)</div>
        </div>

        {/* Total Paid */}
        <div className="p-3.5 sm:p-4 bg-[#121226] border border-white/5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Total Disbursed</span>
            <CreditCard className="w-4 h-4 text-[#7FB706]" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-[#7FB706] font-mono">
            ₹{Number(summary.totalPaidValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">{summary.totalPaymentsCount || 0} Payment Voucher(s)</div>
        </div>

        {/* Outstanding Dues */}
        <div className="p-3.5 sm:p-4 bg-[#121226] border border-white/5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Net Payable Balance</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div
            className={`mt-2 text-lg sm:text-xl font-bold font-mono ${
              Number(summary.outstandingBalance) > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            ₹{Number(summary.outstandingBalance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            {Number(summary.outstandingBalance) > 0 ? 'Pending Settlement' : 'All Clear / Settled'}
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs (Horizontal Scrollable on Mobile) */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { id: 'OVERVIEW', label: '360° Profile & Overview', icon: Building },
          { id: 'ORDERS', label: `Purchase Orders (${purchaseOrders.length})`, icon: FileText },
          { id: 'SUPPLIES', label: `Material Supply Records (${materialSupplies.length})`, icon: Package },
          { id: 'PAYMENTS', label: `Payments & Ledger (${payments.length})`, icon: CreditCard },
          { id: 'CONTACTS', label: `Contacts & Directory (${vendor.contacts?.length || 0})`, icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-xl transition cursor-pointer whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-[#7FB706] text-white shadow-md shadow-[#7FB706]/20'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: 360° PROFILE & OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Statutory & Tax Card */}
          <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <ShieldCheck className="w-4 h-4 text-[#7FB706]" />
              Statutory &amp; Tax Compliance
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-400">GSTIN</span>
                <div className="flex items-center gap-1.5 font-mono text-white">
                  <span>{vendor.gstin || 'Not Provided'}</span>
                  {vendor.gstin && (
                    <button
                      onClick={() => copyToClipboard(vendor.gstin!, 'gstin')}
                      className="text-gray-400 hover:text-white"
                      title="Copy GSTIN"
                    >
                      {copiedKey === 'gstin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-400">PAN Number</span>
                <div className="flex items-center gap-1.5 font-mono text-white">
                  <span>{vendor.pan || 'Not Provided'}</span>
                  {vendor.pan && (
                    <button
                      onClick={() => copyToClipboard(vendor.pan!, 'pan')}
                      className="text-gray-400 hover:text-white"
                      title="Copy PAN"
                    >
                      {copiedKey === 'pan' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">State Code</span>
                <span className="font-mono text-white">
                  {billingAddr?.stateCode ? `${billingAddr.stateCode} (${billingAddr.state})` : '07 (Delhi)'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">MSME / UDYAM</span>
                <span className="font-mono text-white">{parsedNotes.msmeNumber || 'None / Not Registered'}</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-gray-400">Payment Terms</span>
                <span className="font-semibold text-[#7FB706]">
                  {vendor.vendorProfile?.paymentTermsDays || 30} Days Net Credit
                </span>
              </div>
            </div>

            {parsedNotes.generalNotes && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Procurement Notes &amp; Lead Times</span>
                <p className="text-xs text-gray-300 mt-1 italic whitespace-pre-wrap">{parsedNotes.generalNotes}</p>
              </div>
            )}
          </div>

          {/* Dual Addresses Card */}
          <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <MapPin className="w-4 h-4 text-sky-400" />
              Registered Offices &amp; Dispatch Warehouses
            </h3>

            <div className="space-y-3">
              {/* Registered Billing Address */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-400 uppercase text-[10px] tracking-wider">
                    REGISTERED BILLING OFFICE
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-sky-500/10 text-sky-300 border border-sky-500/20">
                    Primary Tax Address
                  </span>
                </div>
                {billingAddr ? (
                  <>
                    <p className="text-white font-medium">{billingAddr.addressLine1}</p>
                    {billingAddr.addressLine2 && <p className="text-gray-400">{billingAddr.addressLine2}</p>}
                    <p className="text-gray-400">
                      {billingAddr.city}, {billingAddr.state} — <strong className="text-white font-mono">{billingAddr.postalCode || 'Pincode N/A'}</strong>
                    </p>
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `${billingAddr.addressLine1}, ${billingAddr.addressLine2 || ''}, ${billingAddr.city}, ${billingAddr.state} - ${billingAddr.postalCode || ''}`,
                            'billAddr'
                          )
                        }
                        className="text-[11px] text-[#7FB706] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'billAddr' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedKey === 'billAddr' ? 'Copied' : 'Copy Address'}
                      </button>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(
                          `${billingAddr.addressLine1}, ${billingAddr.city}, ${billingAddr.state}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Google Maps
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 italic">No registered office address listed.</p>
                )}
              </div>

              {/* Factory / Dispatch Warehouse Address */}
              {factoryAddr && (
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider">
                      DISPATCH WAREHOUSE / FACTORY
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      Material Pickup
                    </span>
                  </div>
                  <p className="text-white font-medium">{factoryAddr.addressLine1}</p>
                  {factoryAddr.addressLine2 && <p className="text-gray-400">{factoryAddr.addressLine2}</p>}
                  <p className="text-gray-400">
                    {factoryAddr.city}, {factoryAddr.state} — <strong className="text-white font-mono">{factoryAddr.postalCode || 'Pincode N/A'}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Banking & Remittance Coordinates */}
          <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Landmark className="w-4 h-4 text-emerald-400" />
              Banking &amp; Remittance Coordinates
            </h3>

            {parsedNotes.bankDetails?.accountNumber || parsedNotes.bankDetails?.bankName ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Bank Name</span>
                  <span className="font-semibold text-white">{parsedNotes.bankDetails.bankName || 'Not Provided'}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-gray-400">Account Number</span>
                  <div className="flex items-center gap-1.5 font-mono text-white">
                    <span>{parsedNotes.bankDetails.accountNumber}</span>
                    <button
                      onClick={() => copyToClipboard(parsedNotes.bankDetails.accountNumber, 'acct')}
                      className="text-gray-400 hover:text-white"
                      title="Copy A/C No"
                    >
                      {copiedKey === 'acct' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-gray-400">IFSC Code</span>
                  <div className="flex items-center gap-1.5 font-mono text-emerald-400">
                    <span>{parsedNotes.bankDetails.ifscCode}</span>
                    <button
                      onClick={() => copyToClipboard(parsedNotes.bankDetails.ifscCode, 'ifsc')}
                      className="text-gray-400 hover:text-white"
                      title="Copy IFSC"
                    >
                      {copiedKey === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Branch Name</span>
                  <span className="text-gray-300">{parsedNotes.bankDetails.branchName || 'Main Branch'}</span>
                </div>

                {parsedNotes.bankDetails.upiId && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-400">UPI ID / VPA</span>
                    <span className="font-mono text-sky-400">{parsedNotes.bankDetails.upiId}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-gray-500 text-xs">
                No bank account details recorded yet. Click "Edit Supplier" to add account &amp; IFSC for RTGS remittances.
              </div>
            )}

            {/* Quick Contacts Preview */}
            {primaryContact && (
              <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5">
                <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Primary POC</span>
                <p className="text-xs font-bold text-white">{primaryContact.name} ({primaryContact.designation || 'Sales'})</p>
                {primaryContact.phone && (
                  <a href={`tel:${primaryContact.phone}`} className="text-xs text-gray-300 flex items-center gap-1.5 hover:text-[#7FB706]">
                    <Phone className="w-3.5 h-3.5 text-[#7FB706]" /> {primaryContact.phone}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASE ORDERS RECORD */}
      {activeTab === 'ORDERS' && (
        <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden shadow-xl space-y-4 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                Purchase Orders Ledger ({purchaseOrders.length})
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                All procurement orders issued to {vendor.legalName}
              </p>
            </div>
            <button
              onClick={() => navigate(`/admin/dashboard/purchase-orders/new?vendorId=${vendor.id}`)}
              className="px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold rounded-xl shadow-md shadow-[#7FB706]/20 flex items-center gap-1.5 min-h-[40px] cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Issue New Purchase Order
            </button>
          </div>

          {purchaseOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400">
                    <th className="py-3 px-3">PO Number</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Subject / Purpose</th>
                    <th className="py-3 px-3 text-center">Items</th>
                    <th className="py-3 px-3 text-right">Subtotal</th>
                    <th className="py-3 px-3 text-right">Total Amount</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {purchaseOrders.map((po) => {
                    const itemCount = (po as any).items?.length || 0;
                    return (
                      <tr key={po.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-3 font-mono font-bold text-[#7FB706]">
                          {po.poNumber}
                        </td>
                        <td className="py-3 px-3 text-gray-300">
                          {po.poDate ? new Date(po.poDate).toLocaleDateString('en-IN') : '-'}
                        </td>
                        <td className="py-3 px-3 text-white max-w-xs truncate">
                          {po.subject || po.description || 'Standard Procurement'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-white/5 font-mono text-gray-300">
                            {itemCount}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-gray-300">
                          ₹{Number(po.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-white">
                          ₹{Number(po.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              po.status === 'RECEIVED'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : po.status === 'APPROVED' || po.status === 'ORDERED'
                                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                : po.status === 'PARTIALLY_RECEIVED'
                                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                                : po.status === 'CANCELLED'
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {po.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            to={`/admin/dashboard/purchase-orders/${po.id}`}
                            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition inline-flex items-center gap-1 text-[11px]"
                          >
                            View PO <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500 space-y-2">
              <FileText className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-sm">No Purchase Orders issued to this supplier yet.</p>
              <button
                onClick={() => navigate(`/admin/dashboard/purchase-orders/new?vendorId=${vendor.id}`)}
                className="mt-2 text-xs font-bold text-[#7FB706] hover:underline"
              >
                + Create the first Purchase Order
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MATERIAL SUPPLY RECORDS */}
      {activeTab === 'SUPPLIES' && (
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-sky-400" />
                Material Supply &amp; Inward Records ({materialSupplies.length} SKUs)
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Itemized catalog of all materials, compact boards, hardware &amp; accessories supplied by {vendor.legalName}
              </p>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search materials, thickness, finish..."
                value={supplySearch}
                onChange={(e) => setSupplySearch(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          </div>

          {filteredSupplies.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400">
                    <th className="py-3 px-3">Material Description</th>
                    <th className="py-3 px-3">Thickness &amp; Dimensions</th>
                    <th className="py-3 px-3">Finish / Specification</th>
                    <th className="py-3 px-3 text-right">Total Inward Qty</th>
                    <th className="py-3 px-3 text-right">Contracted / Last Unit Rate</th>
                    <th className="py-3 px-3">Last Supplied Date</th>
                    <th className="py-3 px-3">Linked POs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredSupplies.map((mat, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-3 font-semibold text-white">
                        {mat.description}
                      </td>
                      <td className="py-3 px-3 text-gray-300 font-mono">
                        {mat.thickness ? `${mat.thickness}` : ''}
                        {mat.cuttingSize ? ` (${mat.cuttingSize})` : ''}
                        {!mat.thickness && !mat.cuttingSize && '—'}
                      </td>
                      <td className="py-3 px-3 text-gray-400">
                        {mat.finish || 'Standard'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-sky-400">
                        {mat.totalQuantity.toLocaleString('en-IN')} {mat.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-[#7FB706]">
                        {mat.lastRate > 0 ? `₹${mat.lastRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-gray-400 text-[11px]">
                        {mat.lastSuppliedDate ? new Date(mat.lastSuppliedDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {mat.poNumbers.slice(0, 3).map((poNum, pIdx) => (
                            <span key={pIdx} className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 font-mono text-gray-300">
                              {poNum}
                            </span>
                          ))}
                          {mat.poNumbers.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-gray-400">
                              +{mat.poNumbers.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500 space-y-2">
              <Package className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-sm">
                {supplySearch ? `No material items matching "${supplySearch}"` : 'No materials recorded yet. Materials are automatically aggregated from issued Purchase Orders.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PAYMENTS & PAYABLE LEDGER */}
      {activeTab === 'PAYMENTS' && (
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#7FB706]" />
                Payment Disbursements &amp; Ledger ({payments.length})
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Audit trail of RTGS, NEFT, Cheques and advance vouchers disbursed to {vendor.legalName}
              </p>
            </div>
          </div>

          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400">
                    <th className="py-3 px-3">Payment Date</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Payment Mode</th>
                    <th className="py-3 px-3">UTR / Reference No</th>
                    <th className="py-3 px-3 text-right">Disbursed Amount</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-3 font-semibold text-white">
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : '-'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/5 text-gray-300">
                          {p.paymentType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-300 font-mono">
                        {p.paymentMethod}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#7FB706]">
                        {p.referenceNumber || '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                        ₹{Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            p.status === 'CONFIRMED'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500 space-y-2">
              <CreditCard className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-sm">No payment vouchers recorded for this supplier yet.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CONTACTS & DIRECTORY */}
      {activeTab === 'CONTACTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendor.contacts && vendor.contacts.length > 0 ? (
            vendor.contacts.map((c, idx) => (
              <div key={c.id || idx} className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{c.name}</h4>
                  {c.isPrimary && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/30">
                      Primary Contact
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-400 font-medium">{c.designation || 'Representative'}</p>

                <div className="space-y-2 pt-2 border-t border-white/5 text-xs">
                  {c.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Phone</span>
                      <a href={`tel:${c.phone}`} className="font-mono text-white hover:text-[#7FB706] flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#7FB706]" /> {c.phone}
                      </a>
                    </div>
                  )}

                  {c.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Email</span>
                      <a href={`mailto:${c.email}`} className="text-gray-300 hover:text-white flex items-center gap-1.5 truncate max-w-[180px]">
                        <Mail className="w-3.5 h-3.5 text-sky-400" /> {c.email}
                      </a>
                    </div>
                  )}
                </div>

                {/* Direct Action Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  {c.phone && (
                    <>
                      <a
                        href={`tel:${c.phone}`}
                        className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition min-h-[40px]"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#7FB706]" /> Call
                      </a>
                      <a
                        href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition min-h-[40px]"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-gray-500 bg-[#121226] border border-white/5 rounded-2xl">
              <Users className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-sm">No representative contacts listed for this supplier.</p>
            </div>
          )}
        </div>
      )}

      {/* 5. Mobile Sticky Action Bar (< 640px) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#121226]/95 backdrop-blur-md border-t border-white/10 p-3 flex items-center gap-2 shadow-2xl">
        {primaryContact?.phone ? (
          <a
            href={`tel:${primaryContact.phone}`}
            className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 min-h-[44px]"
          >
            <Phone className="w-4 h-4 text-[#7FB706]" /> Call
          </a>
        ) : null}

        {primaryContact?.phone ? (
          <a
            href={`https://wa.me/${primaryContact.phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 min-h-[44px]"
          >
            <MessageSquare className="w-4 h-4" /> WhatsApp
          </a>
        ) : null}

        <button
          onClick={() => navigate(`/admin/dashboard/purchase-orders/new?vendorId=${vendor.id}`)}
          className="flex-1 py-2.5 px-3 rounded-xl bg-[#7FB706] text-white font-bold text-xs flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New PO
        </button>

        <button
          onClick={() => navigate(`/admin/dashboard/vendors/${vendor.id}/edit`)}
          className="p-2.5 rounded-xl bg-white/5 text-gray-300 font-semibold min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          title="Edit Profile"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
