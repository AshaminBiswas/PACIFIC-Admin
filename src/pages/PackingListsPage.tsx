import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Search, Plus, Filter, Printer, CheckCircle2,
  Clock, Truck, AlertTriangle, Eye, ChevronRight, X,
  FileText, QrCode, RefreshCw, Layers, ShieldCheck, MapPin, Phone
} from 'lucide-react';
import { packingListsApi, salesOrdersApi, crmApi, companiesApi } from '../api/services';
import type {
  PackingList, SalesOrder, BusinessParty, CompanyProfile
} from '../types/admin';

export default function PackingListsPage() {
  const [packingLists, setPackingLists] = useState<PackingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [receiptFilter, setReceiptFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Lookups
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [packetTypes, setPacketTypes] = useState<any[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewList, setPreviewList] = useState<PackingList | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    orderId: '',
    customerId: '',
    companyProfileId: '',
    isStandalone: false,
    autoExplodeBom: true,
    consignorName: 'M/s. Pacific Products & Solutions',
    consignorAddress: 'H-3, JR Complex, Mela Ram Farm, Mandoli, New Delhi-110093',
    shipToName: '',
    shipToAddress: '',
    siteContactName: '',
    siteContactPhone: '',
    checkedByName: 'Warehouse Dispatch Team',
    authorisedSignatoryName: 'Pacific Authorised Signatory',
    items: [
      {
        serialNumber: 1,
        description: 'Door Panel',
        size: '600x1785mm',
        designNo: '1120 SD',
        quantity: 5,
        noOfPackets: 3,
        natureOfPacket: 'Board',
      },
      {
        serialNumber: 2,
        description: 'Divider Panel',
        size: '1500x1800mm',
        designNo: '1120 SD',
        quantity: 5,
        noOfPackets: 3,
        natureOfPacket: 'Board',
      },
      {
        serialNumber: 3,
        description: 'Mid / End Panel',
        size: '150x1995mm',
        designNo: '1120 SD',
        quantity: 10,
        noOfPackets: 5,
        natureOfPacket: 'Board',
      },
      {
        serialNumber: 4,
        description: 'Black U Channel',
        size: '(L)',
        designNo: 'Black',
        quantity: 15,
        noOfPackets: 1,
        natureOfPacket: 'Channel',
      },
      {
        serialNumber: 5,
        description: 'Nylon Black Hardware Set',
        size: 'Set',
        designNo: 'Black',
        quantity: 5,
        noOfPackets: 1,
        natureOfPacket: 'Corrugated Box',
      },
    ],
  });

  const fetchPackingLists = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15, search };
      if (receiptFilter !== 'ALL') params.receiptStatus = receiptFilter;
      const res = await packingListsApi.list(params);
      if (res.data?.data) {
        setPackingLists(res.data.data.items || []);
        setTotalPages(res.data.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load packing lists:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, receiptFilter]);

  const loadLookups = useCallback(async () => {
    try {
      const [ordRes, custRes, pktRes] = await Promise.all([
        salesOrdersApi.list({ limit: 100 }),
        crmApi.listCustomers({ limit: 100 }),
        packingListsApi.listPacketTypes(),
      ]);
      if (ordRes.data?.data?.items) setOrders(ordRes.data.data.items);
      if (custRes.data?.data?.items) setCustomers(custRes.data.data.items);
      if (pktRes.data?.data) setPacketTypes(pktRes.data.data);
    } catch (err) {
      console.error('Failed to load lookups:', err);
    }
  }, []);

  useEffect(() => {
    fetchPackingLists();
  }, [fetchPackingLists]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // Order selection auto-fills consignor, shipto, and customer
  const handleOrderSelect = (ordId: string) => {
    const ord = orders.find((o) => o.id === ordId);
    if (ord) {
      setFormData((prev) => ({
        ...prev,
        orderId: ord.id,
        customerId: ord.customerId,
        companyProfileId: ord.companyProfileId,
        shipToName: ord.customer?.legalName || '',
        shipToAddress: ord.siteAddress || ord.customer?.addresses?.[0]?.addressLine1 || '',
        siteContactName: ord.customer?.contacts?.[0]?.name || '',
        siteContactPhone: ord.customer?.contacts?.[0]?.phone || '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, orderId: ordId }));
    }
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, items: updated };
    });
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          serialNumber: prev.items.length + 1,
          description: 'Accessory / Hardware Kit',
          size: 'Standard',
          designNo: 'Black',
          quantity: 1,
          noOfPackets: 1,
          natureOfPacket: 'Corrugated Box',
        },
      ],
    }));
  };

  const removeItemRow = (idx: number) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx).map((it, n) => ({ ...it, serialNumber: n + 1 })),
    }));
  };

  const handleCreatePackingList = async () => {
    try {
      if (!formData.orderId && !formData.isStandalone) {
        alert('Please select a linked Sales Order. If this is a standalone dispatch (sample/replacement), please check "Standalone Dispatch".');
        return;
      }
      if (!formData.customerId) {
        alert('Please select a customer.');
        return;
      }

      await packingListsApi.create(formData);
      setShowCreateModal(false);
      fetchPackingLists();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to generate packing list');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#7FB706]/10 text-[#7FB706]">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Packing Lists & Dispatch</h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Component BOM explosion, packet nature classification, partial dispatch tracking & digital receipt acknowledgment
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Generate Packing List
        </button>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Total Dispatches</div>
          <div className="text-2xl font-bold text-white mt-1">{packingLists.length}</div>
          <div className="text-[11px] text-[#7FB706] mt-1 font-mono">PPS/PL/2026-27/...</div>
        </div>
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Partial Dispatches</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {packingLists.filter((pl) => pl.isPartialDispatch).length}
          </div>
          <div className="text-[11px] text-blue-500/80 mt-1">Split consignment</div>
        </div>
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-gray-400">In Transit</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {packingLists.filter((pl) => pl.receiptStatus === 'DISPATCHED').length}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">En route to jobsite</div>
        </div>
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Acknowledged Receipts</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {packingLists.filter((pl) => pl.receiptStatus === 'ACKNOWLEDGED').length}
          </div>
          <div className="text-[11px] text-emerald-500/80 mt-1">Signed by site receiver</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by packing list ref (PPS/PL/...), ship-to client, or site contact..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'DISPATCHED', 'DELIVERED', 'ACKNOWLEDGED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setReceiptFilter(st);
                setPage(1);
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap min-h-[44px] ${
                receiptFilter === st
                  ? 'bg-[#7FB706] text-white shadow-md shadow-[#7FB706]/20'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {st}
            </button>
          ))}
          <button
            onClick={() => fetchPackingLists()}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Packing Lists Table / Cards */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading packing lists...</div>
        ) : packingLists.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-2">
            <Package className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm">No packing lists found matching criteria</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-[#0a0a1a] text-xs uppercase text-gray-500 border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4">Packing List Ref</th>
                    <th className="py-3 px-4">Linked Order</th>
                    <th className="py-3 px-4">Ship-to Client & Site</th>
                    <th className="py-3 px-4">Components & Packets</th>
                    <th className="py-3 px-4">Receipt Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {packingLists.map((pl) => (
                    <tr key={pl.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-white">{pl.packingListNumber}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(pl.date).toLocaleDateString('en-GB')}
                        </div>
                        {pl.isPartialDispatch && (
                          <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                            Partial Dispatch
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono">
                        {pl.order ? (
                          <span className="text-gray-200">{pl.order.orderNumber}</span>
                        ) : (
                          <span className="text-gray-500 italic">Standalone</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{pl.shipToName}</div>
                        {pl.siteContactName && (
                          <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-[#7FB706]" />
                            {pl.siteContactName} {pl.siteContactPhone ? `(${pl.siteContactPhone})` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="text-white font-semibold">
                          {pl.totalQuantity} Total Pieces
                        </div>
                        <div className="text-gray-400 text-[11px]">
                          {pl.totalPackages || 0} Packages
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            pl.receiptStatus === 'ACKNOWLEDGED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : pl.receiptStatus === 'DELIVERED'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {pl.receiptStatus}
                        </span>
                        {pl.receivedByName && (
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            By {pl.receivedByName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewList(pl)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                            title="Preview Packing List"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <a
                            href={packingListsApi.getPdfUrl(pl.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                            title="Print Layout"
                          >
                            <Printer className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< md) */}
            <div className="md:hidden divide-y divide-white/5">
              {packingLists.map((pl) => (
                <div key={pl.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono font-bold text-white">{pl.packingListNumber}</div>
                      <div className="text-xs text-gray-400">{pl.shipToName}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        pl.receiptStatus === 'ACKNOWLEDGED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {pl.receiptStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div>{pl.totalQuantity} Pieces ({pl.totalPackages || 0} Pkts)</div>
                    <div className="font-mono">{pl.order?.orderNumber || 'Standalone'}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => setPreviewList(pl)}
                      className="min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white rounded-xl"
                    >
                      <Eye className="w-4 h-4" /> Preview
                    </button>
                    <a
                      href={packingListsApi.getPdfUrl(pl.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white rounded-xl"
                    >
                      <Printer className="w-4 h-4" /> Print PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Generate Packing List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-4xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-[#7FB706]" /> Generate Packing List (PPS/PL/...)
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Order Selection & Standalone Toggle */}
              <div className="p-4 rounded-xl bg-[#0a0a1a] border border-white/10 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Linked Sales Order *
                    </label>
                    <select
                      value={formData.orderId}
                      disabled={formData.isStandalone}
                      onChange={(e) => handleOrderSelect(e.target.value)}
                      className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#7FB706] disabled:opacity-40 min-h-[44px]"
                    >
                      <option value="">-- Select Sales Order --</option>
                      {orders.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.orderNumber} - {o.customer?.legalName} ({o.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Recipient Customer *
                    </label>
                    <select
                      value={formData.customerId}
                      onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                      className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white min-h-[44px]"
                    >
                      <option value="">-- Select Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.legalName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-gray-400">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isStandalone}
                      onChange={(e) => setFormData({ ...formData, isStandalone: e.target.checked })}
                      className="rounded border-white/20 text-[#7FB706]"
                    />
                    <span>Standalone Dispatch (Sample / Replacement without PO)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoExplodeBom}
                      onChange={(e) => setFormData({ ...formData, autoExplodeBom: e.target.checked })}
                      className="rounded border-white/20 text-[#7FB706]"
                    />
                    <span>Auto-explode Standard Cubicle BOM</span>
                  </label>
                </div>
              </div>

              {/* Consignor and Ship To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Ship-To Name / Consignee</label>
                  <input
                    type="text"
                    value={formData.shipToName}
                    onChange={(e) => setFormData({ ...formData, shipToName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Ship-To Delivery Address</label>
                  <input
                    type="text"
                    value={formData.shipToAddress}
                    onChange={(e) => setFormData({ ...formData, shipToAddress: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Site Contact Person</label>
                  <input
                    type="text"
                    value={formData.siteContactName}
                    onChange={(e) => setFormData({ ...formData, siteContactName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Site Contact Mobile</label>
                  <input
                    type="text"
                    value={formData.siteContactPhone}
                    onChange={(e) => setFormData({ ...formData, siteContactPhone: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                  />
                </div>
              </div>

              {/* Component Items & Packet Classification */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Dispatched Components & Packet Types
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Total: {formData.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)} pcs
                  </span>
                </div>

                <div className="space-y-2">
                  {formData.items.map((it, idx) => (
                    <div key={idx} className="p-3 bg-[#0a0a1a] border border-white/10 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-[#7FB706]">Item #{it.serialNumber}</span>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="text-xs text-red-400 p-1"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="Description (e.g. Door Panel)"
                          className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                        />
                        <input
                          type="text"
                          value={it.size}
                          onChange={(e) => handleItemChange(idx, 'size', e.target.value)}
                          placeholder="Size (e.g. 600x1785mm)"
                          className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                        />
                        <input
                          type="text"
                          value={it.designNo}
                          onChange={(e) => handleItemChange(idx, 'designNo', e.target.value)}
                          placeholder="Design No / Color (e.g. 1120 SD)"
                          className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-0.5">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                            className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-0.5">No. of Packets</label>
                          <input
                            type="number"
                            min="1"
                            value={it.noOfPackets || ''}
                            onChange={(e) => handleItemChange(idx, 'noOfPackets', Number(e.target.value))}
                            className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-0.5">Packet Nature</label>
                          <select
                            value={it.natureOfPacket}
                            onChange={(e) => handleItemChange(idx, 'natureOfPacket', e.target.value)}
                            className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                          >
                            <option value="Board">Board</option>
                            <option value="Channel">Channel</option>
                            <option value="Corrugated Box">Corrugated Box</option>
                            <option value="Bundle">Bundle</option>
                            <option value="Wooden Crate">Wooden Crate</option>
                            <option value="Loose Packet">Loose Packet</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addItemRow}
                    className="w-full py-2 border-2 border-dashed border-white/10 hover:border-[#7FB706]/40 text-gray-400 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <Plus className="w-4 h-4" /> Add Component Line Item
                  </button>
                </div>
              </div>

              {/* Checked by & Signatory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Dispatch Checked By *</label>
                  <input
                    type="text"
                    value={formData.checkedByName}
                    onChange={(e) => setFormData({ ...formData, checkedByName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Authorised Signatory *</label>
                  <input
                    type="text"
                    value={formData.authorisedSignatoryName}
                    onChange={(e) => setFormData({ ...formData, authorisedSignatoryName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-white/5 text-gray-300 rounded-xl text-xs min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreatePackingList}
                  className="px-6 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-xs min-h-[44px]"
                >
                  Create Packing List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vector A4 Printable Preview Modal */}
      {previewList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0a0a1a]">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#7FB706]" />
                <span className="font-mono font-bold text-white">
                  {previewList.packingListNumber}
                </span>
                <span className="text-xs text-gray-400">
                  ({previewList.shipToName})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={packingListsApi.getPdfUrl(previewList.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 min-h-[40px]"
                >
                  <Printer className="w-4 h-4" /> Print / PDF
                </a>
                <button
                  onClick={() => setPreviewList(null)}
                  className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gray-900 p-2 sm:p-4 overflow-hidden">
              <iframe
                src={packingListsApi.getPdfUrl(previewList.id)}
                title="Packing List Preview"
                className="w-full h-full bg-white rounded-lg shadow-2xl border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
