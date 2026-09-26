import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { vendorsApi } from '../api/services';
import type { BusinessParty, PurchaseOrder, Payment } from '../types/admin';

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState<BusinessParty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ORDERS' | 'PAYMENTS' | 'CONTACTS'>('OVERVIEW');

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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-[#7FB706] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading Supplier profile & history...</p>
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
  };

  const getCategoryLabel = (type?: string) => {
    switch (type) {
      case 'HPL_BOARDS':
        return 'HPL Compact Boards';
      case 'HDF_BOARDS':
        return 'HDF Boards';
      case 'HARDWARE':
        return 'SS & Nylon Hardware';
      case 'ALUMINIUM':
        return 'Aluminium Extrusions';
      case 'SS':
        return 'Stainless Steel Hardware';
      case 'NYLON':
        return 'High-Impact Nylon Hardware';
      case 'RAW_MATERIALS':
        return 'Raw Materials';
      default:
        return type || 'Procurement Supplier';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Top Header Bar */}
      <div className="bg-[#09071a] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl">
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
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {vendor.status || 'ACTIVE'}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">
                {vendor.legalName}
              </h1>

              {vendor.tradeName && vendor.tradeName !== vendor.legalName && (
                <p className="text-xs text-gray-400 font-medium">{vendor.tradeName}</p>
              )}

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
                {vendor.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gray-500" /> {vendor.phone}
                  </span>
                )}
                {vendor.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-500" /> {vendor.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* Edit Supplier */}
            <button
              onClick={() => navigate(`/admin/dashboard/vendors/${vendor.id}/edit`)}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-extrabold text-xs shadow-lg shadow-[#7FB706]/20 transition flex items-center gap-1.5 min-h-[44px]"
            >
              <Edit2 className="w-4 h-4" />
              Edit Supplier
            </button>

            {/* Quick Action: New PO */}
            <button
              onClick={() => navigate(`/admin/dashboard/purchase-orders/new?vendorId=${vendor.id}`)}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-xs font-semibold transition flex items-center gap-1.5 min-h-[44px]"
            >
              <Plus className="w-4 h-4 text-[#7FB706]" />
              New Purchase Order
            </button>

            {/* Refresh */}
            <button
              onClick={fetchVendor}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition min-h-[44px] min-w-[44px] flex items-center justify-center border border-white/10"
              title="Refresh Supplier Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Delete Supplier */}
            <button
              onClick={handleDelete}
              className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Delete Supplier"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Hero KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Purchase Orders Value */}
        <div className="p-3.5 sm:p-4 bg-[#09071a] border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Total POs Issued</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-amber-400 font-mono">
            ₹{Number(summary.totalPoValue || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">{summary.totalPoCount || 0} Purchase Order(s)</div>
        </div>

        {/* Total Paid */}
        <div className="p-3.5 sm:p-4 bg-[#09071a] border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Total Payments Made</span>
            <CreditCard className="w-4 h-4 text-[#7FB706]" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-[#7FB706] font-mono">
            ₹{Number(summary.totalPaidValue || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">{summary.totalPaymentsCount || 0} Payment(s)</div>
        </div>

        {/* Outstanding Dues */}
        <div className="p-3.5 sm:p-4 bg-[#09071a] border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Payable Dues</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div
            className={`mt-2 text-lg sm:text-xl font-bold font-mono ${
              Number(summary.outstandingBalance) > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            ₹{Number(summary.outstandingBalance || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">Unsettled Balance</div>
        </div>

        {/* Terms & Classification */}
        <div className="p-3.5 sm:p-4 bg-[#09071a] border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Payment Terms</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-white font-mono">
            {vendor.vendorProfile?.paymentTermsDays || 30} Days Net
          </div>
          <div className="mt-1 text-[11px] text-sky-400 font-medium">
            Category: {vendor.vendorProfile?.vendorType || 'RAW_MATERIALS'}
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="bg-[#09071a] border border-white/10 rounded-2xl p-2 flex items-center gap-1.5 overflow-x-auto">
        {[
          { id: 'OVERVIEW', label: 'Overview & Profile' },
          { id: 'ORDERS', label: `Purchase Orders (${purchaseOrders.length})` },
          { id: 'PAYMENTS', label: `Payments (${payments.length})` },
          { id: 'CONTACTS', label: `Contacts & Addresses (${(vendor.contacts?.length || 0) + (vendor.addresses?.length || 0)})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition cursor-pointer whitespace-nowrap min-h-[40px] ${
              activeTab === tab.id
                ? 'bg-[#7FB706] text-white shadow-md shadow-[#7FB706]/20'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Commercial & Contract Terms */}
          <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <CreditCard className="w-4 h-4 text-[#7FB706]" />
              Commercial Profile & Terms
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Supplier Type</span>
                <span className="font-semibold text-white">
                  {getCategoryLabel(vendor.vendorProfile?.vendorType)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Payment Terms</span>
                <span className="font-semibold text-white">
                  {vendor.vendorProfile?.paymentTermsDays || 30} Days Net
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Account Status</span>
                <span className="font-semibold text-emerald-400">{vendor.status || 'ACTIVE'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Supplier Code</span>
                <span className="font-mono text-gray-300">{vendor.id.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>

            {vendor.notes && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <span className="text-[11px] text-gray-500 font-semibold uppercase">Internal Notes & Lead Times</span>
                <p className="text-xs text-gray-300 mt-1 italic">{vendor.notes}</p>
              </div>
            )}
          </div>

          {/* Primary Office / Factory Address */}
          <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <MapPin className="w-4 h-4 text-sky-400" />
              Registered Offices & Warehouses
            </h3>
            {vendor.addresses && vendor.addresses.length > 0 ? (
              <div className="space-y-3">
                {vendor.addresses.map((addr, idx) => (
                  <div key={addr.id || idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white uppercase text-[10px] tracking-wider text-sky-400">
                        {addr.addressType} ADDRESS
                      </span>
                      {addr.isDefaultBilling && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-sky-500/10 text-sky-300 border border-sky-500/20">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300">{addr.addressLine1}</p>
                    {addr.addressLine2 && <p className="text-gray-400">{addr.addressLine2}</p>}
                    <p className="text-gray-400">
                      {addr.city}, {addr.state} {addr.postalCode ? `- ${addr.postalCode}` : ''}
                    </p>
                    {addr.gstin && (
                      <p className="text-gray-400 font-mono text-[11px]">GSTIN: {addr.gstin}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic py-4 text-center">No addresses registered yet.</p>
            )}
          </div>

          {/* Key Contacts */}
          <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Users className="w-4 h-4 text-purple-400" />
              Supplier Representatives
            </h3>
            {vendor.contacts && vendor.contacts.length > 0 ? (
              <div className="space-y-3">
                {vendor.contacts.map((c, idx) => (
                  <div key={c.id || idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{c.name}</span>
                      {c.isPrimary && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          Primary Contact
                        </span>
                      )}
                    </div>
                    {c.designation && <p className="text-[11px] text-gray-400">{c.designation}</p>}
                    {c.phone && (
                      <p className="text-gray-300 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-gray-500" /> {c.phone}
                      </p>
                    )}
                    {c.email && (
                      <p className="text-gray-300 flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-gray-500" /> {c.email}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic py-4 text-center">No contact representatives listed.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASE ORDERS */}
      {activeTab === 'ORDERS' && (
        <div className="bg-[#09071a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              Purchase Orders ({purchaseOrders.length})
            </h3>
            <button
              onClick={() => navigate(`/admin/dashboard/purchase-orders/new?vendorId=${vendor.id}`)}
              className="text-xs font-semibold text-[#7FB706] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> New PO
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e0e1e] text-gray-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No Purchase Orders recorded for this supplier.
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po: any) => (
                    <tr key={po.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-4 font-mono font-bold text-white">{po.poNumber}</td>
                      <td className="py-3 px-4 text-gray-400">
                        {po.poDate ? new Date(po.poDate).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#7FB706]">
                        ₹{Number(po.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to="/admin/dashboard/purchase-orders"
                          className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold"
                        >
                          View in POs <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENTS */}
      {activeTab === 'PAYMENTS' && (
        <div className="bg-[#09071a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#7FB706]" />
              Payments Recorded ({payments.length})
            </h3>
            <button
              onClick={() => navigate(`/admin/dashboard/payments/new?partyId=${vendor.id}`)}
              className="text-xs font-semibold text-[#7FB706] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Record Payment
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e0e1e] text-gray-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Reference / UTR</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No payments recorded for this supplier.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-4 font-mono font-bold text-white">{p.referenceNumber || 'N/A'}</td>
                      <td className="py-3 px-4 text-gray-400">
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-300">{p.paymentMethod}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#7FB706]">
                        ₹{Number(p.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CONTACTS & ADDRESSES */}
      {activeTab === 'CONTACTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contacts */}
          <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Contact Persons
              </h3>
              <button
                onClick={() => navigate(`/admin/dashboard/vendors/${vendor.id}/edit`)}
                className="text-xs text-[#7FB706] hover:underline font-semibold"
              >
                + Manage Contacts
              </button>
            </div>
            {vendor.contacts && vendor.contacts.length > 0 ? (
              <div className="space-y-3">
                {vendor.contacts.map((c, idx) => (
                  <div key={c.id || idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{c.name}</span>
                      {c.isPrimary && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          Primary Contact
                        </span>
                      )}
                    </div>
                    {c.designation && <p className="text-gray-400 font-medium">{c.designation}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-white/5">
                      {c.phone && (
                        <span className="text-gray-300 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-gray-500" /> {c.phone}
                        </span>
                      )}
                      {c.email && (
                        <span className="text-gray-300 flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 text-gray-500" /> {c.email}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic py-8 text-center">No contacts listed.</p>
            )}
          </div>

          {/* Addresses */}
          <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-400" />
                Factory & Billing Locations
              </h3>
              <button
                onClick={() => navigate(`/admin/dashboard/vendors/${vendor.id}/edit`)}
                className="text-xs text-[#7FB706] hover:underline font-semibold"
              >
                + Manage Addresses
              </button>
            </div>
            {vendor.addresses && vendor.addresses.length > 0 ? (
              <div className="space-y-3">
                {vendor.addresses.map((a, idx) => (
                  <div key={a.id || idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-400 uppercase text-[10px] tracking-wider">
                        {a.addressType} ADDRESS
                      </span>
                      {a.isDefaultBilling && (
                        <span className="px-2 py-0.5 rounded text-[9px] bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          Primary Location
                        </span>
                      )}
                    </div>
                    <p className="text-white font-medium">{a.addressLine1}</p>
                    {a.addressLine2 && <p className="text-gray-400">{a.addressLine2}</p>}
                    <p className="text-gray-300">
                      {a.city}, {a.state} {a.postalCode ? `- ${a.postalCode}` : ''}
                    </p>
                    {a.gstin && (
                      <p className="text-gray-400 font-mono text-[11px] pt-1 border-t border-white/5">
                        GSTIN: {a.gstin}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic py-8 text-center">No addresses registered.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
