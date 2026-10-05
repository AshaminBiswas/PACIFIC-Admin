import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Search, Plus, Filter, Printer, CheckCircle2,
  Clock, Truck, AlertTriangle, Eye, ChevronRight, X,
  FileText, QrCode, RefreshCw, Layers, ShieldCheck, MapPin, Phone, Edit, Trash2, Building2
} from 'lucide-react';
import { packingListsApi, salesOrdersApi, crmApi, companiesApi } from '../api/services';
import { useAdminAuth } from '../context/AdminAuthContext';
import DocumentFlowTimelineModal from '../components/common/DocumentFlowTimelineModal';
import type {
  PackingList, SalesOrder, BusinessParty, CompanyProfile
} from '../types/admin';

export default function PackingListsPage() {
  const { user } = useAdminAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [packingLists, setPackingLists] = useState<PackingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [receiptFilter, setReceiptFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<'ALL' | 'MAIN' | 'KOLKATA'>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPlForTimeline, setSelectedPlForTimeline] = useState<PackingList | null>(null);

  // Edit State
  const [editingPackingList, setEditingPackingList] = useState<PackingList | null>(null);
  const [editPlForm, setEditPlForm] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Lookups
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [packetTypes, setPacketTypes] = useState<any[]>([]);

  // Modals
  const [previewList, setPreviewList] = useState<PackingList | null>(null);
  const [pdfHtml, setPdfHtml] = useState<string>('');
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);

  const handleOpenPreview = async (pl: PackingList) => {
    setPreviewList(pl);
    setLoadingPdf(true);
    try {
      const token = localStorage.getItem('pacific_access_token');
      const res = await fetch(packingListsApi.getPdfUrl(pl.id), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const html = await res.text();
        setPdfHtml(html);
      } else {
        setPdfHtml('<div style="color:red;padding:20px;font-family:sans-serif;">Failed to load Packing List preview</div>');
      }
    } catch (e) {
      console.error('Error loading PDF preview:', e);
      setPdfHtml('<div style="color:red;padding:20px;font-family:sans-serif;">Error connecting to preview service</div>');
    } finally {
      setLoadingPdf(false);
    }
  };

  const fetchPackingLists = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15, search };
      if (receiptFilter !== 'ALL') params.receiptStatus = receiptFilter;
      if (branchFilter !== 'ALL') params.branch = branchFilter;
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
  }, [page, search, receiptFilter, branchFilter]);

  const displayedPackingLists = packingLists.filter((pl) => {
    if (branchFilter === 'KOLKATA') return pl.packingListNumber?.startsWith('PPSK/');
    if (branchFilter === 'MAIN') return !pl.packingListNumber?.startsWith('PPSK/');
    return true;
  });

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

  const handleStartEdit = (pl: PackingList) => {
    setEditingPackingList(pl);
    setEditPlForm({
      consignorName: pl.consignorName || '',
      consignorAddress: pl.consignorAddress || '',
      shipToName: pl.shipToName || '',
      shipToAddress: pl.shipToAddress || '',
      siteContactName: pl.siteContactName || '',
      siteContactPhone: pl.siteContactPhone || '',
      totalPackages: pl.totalPackages || 1,
      isPartialDispatch: Boolean(pl.isPartialDispatch),
      checkedByName: pl.checkedByName || '',
      authorisedSignatoryName: pl.authorisedSignatoryName || '',
      notes: pl.notes || '',
      items: pl.items ? pl.items.map((it: any) => ({
        id: it.id,
        description: it.description || '',
        size: it.size || '',
        designNo: it.designNo || '',
        quantity: Number(it.quantity) || 1,
        noOfPackets: it.noOfPackets != null ? Number(it.noOfPackets) : 1,
        natureOfPacket: it.natureOfPacket || '',
      })) : [],
    });
  };

  const handleSaveEdit = async () => {
    if (!editingPackingList) return;
    setSavingEdit(true);
    try {
      await packingListsApi.update(editingPackingList.id, editPlForm);
      setEditingPackingList(null);
      fetchPackingLists();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update Packing List');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string, num: string) => {
    if (!confirm(`Are you sure you want to permanently delete Packing List ${num}? This action cannot be undone.`)) return;
    try {
      await packingListsApi.delete(id);
      fetchPackingLists();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete Packing List');
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

        <Link
          to="/admin/dashboard/packing-lists/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Generate Packing List
        </Link>
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
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
        {/* Search & Branch */}
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by packing list ref (PPS/PL/..., PPSK/PL/...), ship-to client, or site contact..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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
            onClick={() => fetchPackingLists()}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shrink-0"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'DISPATCHED', 'DELIVERED', 'ACKNOWLEDGED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setReceiptFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap min-h-[36px] ${
                receiptFilter === st
                  ? 'bg-[#7FB706] text-white shadow-md shadow-[#7FB706]/20'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Packing Lists Table / Cards */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading packing lists...</div>
        ) : displayedPackingLists.length === 0 ? (
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
                    <th className="py-3 px-4 text-center w-12">#</th>
                    <th className="py-3 px-4">Packing List Ref</th>
                    <th className="py-3 px-4">Linked Order</th>
                    <th className="py-3 px-4">Ship-to Client & Site</th>
                    <th className="py-3 px-4">Components & Packets</th>
                    <th className="py-3 px-4">Receipt Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayedPackingLists.map((pl, idx) => (
                    <tr
                      key={pl.id}
                      onClick={() => setSelectedPlForTimeline(pl)}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 text-center font-mono text-gray-400 text-xs">
                        {(page - 1) * 15 + idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-white flex items-center gap-1.5">
                          {pl.packingListNumber}
                          {pl.packingListNumber?.startsWith('PPSK/') ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Kolkata
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-white/5 text-gray-400">
                              Main
                            </span>
                          )}
                        </div>
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
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedPlForTimeline(pl)}
                            className="p-2 rounded-lg bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#B5F823] border border-[#7FB706]/30 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors shadow-sm"
                            title="View Document Flow Timeline (Status & Next Steps)"
                          >
                            <Layers className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenPreview(pl)}
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

                          <button
                            onClick={() => handleStartEdit(pl)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                            title="Edit Packing List"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(pl.id, pl.packingListNumber)}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                            title="Delete Packing List"
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

            {/* Mobile Cards View (< md) */}
            <div className="md:hidden divide-y divide-white/5">
              {displayedPackingLists.map((pl, idx) => (
                <div key={pl.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">#{(page - 1) * 15 + idx + 1}</span>
                        <div className="font-mono font-bold text-white flex items-center gap-1.5">
                          {pl.packingListNumber}
                          {pl.packingListNumber?.startsWith('PPSK/') ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Kolkata
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-white/5 text-gray-400">
                              Main
                            </span>
                          )}
                        </div>
                      </div>
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

                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/5">
                    <button
                      onClick={() => setSelectedPlForTimeline(pl)}
                      className="min-h-[44px] flex items-center justify-center gap-1 text-xs font-semibold bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30 rounded-xl"
                    >
                      <Layers className="w-3.5 h-3.5" /> Flow
                    </button>
                    <button
                      onClick={() => handleOpenPreview(pl)}
                      className="min-h-[44px] flex items-center justify-center gap-1 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white rounded-xl"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                    <a
                      href={packingListsApi.getPdfUrl(pl.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] flex items-center justify-center gap-1 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white rounded-xl"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print
                    </a>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleStartEdit(pl)}
                      className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-amber-300 rounded-xl cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(pl.id, pl.packingListNumber)}
                      className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 text-xs font-semibold bg-red-500/10 text-red-400 rounded-xl cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

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
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow && pdfHtml) {
                      printWindow.document.write(pdfHtml);
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                    } else {
                      window.open(packingListsApi.getPdfUrl(previewList.id), '_blank');
                    }
                  }}
                  className="px-3 py-1.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 min-h-[40px] cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print / PDF
                </button>
                <button
                  onClick={() => {
                    setPreviewList(null);
                    setPdfHtml('');
                  }}
                  className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gray-900 p-2 sm:p-4 overflow-hidden flex items-center justify-center">
              {loadingPdf ? (
                <div className="text-gray-400 text-sm animate-pulse">Loading packing list preview...</div>
              ) : (
                <iframe
                  srcDoc={pdfHtml}
                  title="Packing List Preview"
                  className="w-full h-full bg-white rounded-lg shadow-2xl border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Packing List Modal */}
      {editingPackingList && editPlForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0a0a1a]">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#7FB706]" />
                <span className="font-mono font-bold text-white">
                  Edit Packing List {editingPackingList.packingListNumber}
                </span>
              </div>
              <button onClick={() => setEditingPackingList(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Consignor Name</label>
                  <input
                    type="text"
                    value={editPlForm.consignorName}
                    onChange={(e) => setEditPlForm({ ...editPlForm, consignorName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Ship-to Name</label>
                  <input
                    type="text"
                    value={editPlForm.shipToName}
                    onChange={(e) => setEditPlForm({ ...editPlForm, shipToName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Site Contact Name</label>
                  <input
                    type="text"
                    value={editPlForm.siteContactName}
                    onChange={(e) => setEditPlForm({ ...editPlForm, siteContactName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Site Contact Phone</label>
                  <input
                    type="text"
                    value={editPlForm.siteContactPhone}
                    onChange={(e) => setEditPlForm({ ...editPlForm, siteContactPhone: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Total Packages</label>
                  <input
                    type="number"
                    value={editPlForm.totalPackages}
                    onChange={(e) => setEditPlForm({ ...editPlForm, totalPackages: Number(e.target.value) || 1 })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="editPartialDispatch"
                    checked={editPlForm.isPartialDispatch}
                    onChange={(e) => setEditPlForm({ ...editPlForm, isPartialDispatch: e.target.checked })}
                    className="w-4 h-4 rounded text-[#7FB706]"
                  />
                  <label htmlFor="editPartialDispatch" className="font-semibold text-gray-300 cursor-pointer">
                    Is Partial Dispatch
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Ship-to Address</label>
                <input
                  type="text"
                  value={editPlForm.shipToAddress}
                  onChange={(e) => setEditPlForm({ ...editPlForm, shipToAddress: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-gray-300">Components / Packets</label>
                  <button
                    type="button"
                    onClick={() => setEditPlForm({
                      ...editPlForm,
                      items: [...editPlForm.items, { description: '', size: '', designNo: '', quantity: 1, noOfPackets: 1, natureOfPacket: '' }],
                    })}
                    className="text-[#7FB706] hover:underline font-semibold cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editPlForm.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 bg-white/5 p-2 rounded-xl">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...editPlForm.items];
                          updated[idx].description = e.target.value;
                          setEditPlForm({ ...editPlForm, items: updated });
                        }}
                        className="flex-1 bg-[#0a0a1a] border border-white/10 rounded-lg p-2 text-white text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Size"
                        value={item.size}
                        onChange={(e) => {
                          const updated = [...editPlForm.items];
                          updated[idx].size = e.target.value;
                          setEditPlForm({ ...editPlForm, items: updated });
                        }}
                        className="w-20 bg-[#0a0a1a] border border-white/10 rounded-lg p-2 text-white text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...editPlForm.items];
                          updated[idx].quantity = Number(e.target.value) || 1;
                          setEditPlForm({ ...editPlForm, items: updated });
                        }}
                        className="w-16 bg-[#0a0a1a] border border-white/10 rounded-lg p-2 text-white text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Pkts"
                        value={item.noOfPackets}
                        onChange={(e) => {
                          const updated = [...editPlForm.items];
                          updated[idx].noOfPackets = Number(e.target.value) || 1;
                          setEditPlForm({ ...editPlForm, items: updated });
                        }}
                        className="w-16 bg-[#0a0a1a] border border-white/10 rounded-lg p-2 text-white text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editPlForm.items.filter((_: any, i: number) => i !== idx);
                          setEditPlForm({ ...editPlForm, items: updated });
                        }}
                        className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Checked By Name</label>
                  <input
                    type="text"
                    value={editPlForm.checkedByName}
                    onChange={(e) => setEditPlForm({ ...editPlForm, checkedByName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Authorised Signatory Name</label>
                  <input
                    type="text"
                    value={editPlForm.authorisedSignatoryName}
                    onChange={(e) => setEditPlForm({ ...editPlForm, authorisedSignatoryName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={editPlForm.notes}
                  onChange={(e) => setEditPlForm({ ...editPlForm, notes: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-white/10 bg-[#0a0a1a]">
              <button
                type="button"
                onClick={() => setEditingPackingList(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Flow Timeline Modal for Individual Packing Lists */}
      {selectedPlForTimeline && (
        <DocumentFlowTimelineModal
          isOpen={!!selectedPlForTimeline}
          onClose={() => setSelectedPlForTimeline(null)}
          title="Consignment Packing List"
          stage={5}
          documentRef={selectedPlForTimeline.packingListNumber}
          currentStatus={selectedPlForTimeline.receiptStatus}
          statusDescription="BOM piece-by-piece packing list for warehouse verification & site consignee receipt."
          linkedDocs={{
            packingListId: selectedPlForTimeline.id,
            plNumber: selectedPlForTimeline.packingListNumber,
            orderId: selectedPlForTimeline.order?.id,
            orderNumber: selectedPlForTimeline.order?.orderNumber,
          }}
          primaryDetailUrl={
            selectedPlForTimeline.order?.id
              ? `/admin/dashboard/sales-orders/${selectedPlForTimeline.order.id}`
              : undefined
          }
        />
      )}
    </div>
  );
}
