import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  History,
  Search,
  ArrowDownRight,
  Filter,
  Calendar,
  Building2,
  Download,
  FileText,
  Printer,
  Boxes,
  Truck,
  CheckCircle2,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Plus,
  Receipt,
  Hash,
} from 'lucide-react';
import { hardwareInventoryApi } from '../../api/hardwareInventoryApi';
import type {
  HardwareStockMovement,
  HardwareInventoryItem,
  HardwareBranch,
} from '../../types/admin';

interface HardwareInwardHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: HardwareInventoryItem[];
  branches: HardwareBranch[];
  initialSkuId?: string | null;
  onOpenNewInward?: (item?: HardwareInventoryItem | null) => void;
}

export default function HardwareInwardHistoryModal({
  isOpen,
  onClose,
  items,
  branches,
  initialSkuId,
  onOpenNewInward,
}: HardwareInwardHistoryModalProps) {
  const [inwards, setInwards] = useState<HardwareStockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSkuId, setSelectedSkuId] = useState<string>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('ALL'); // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH'

  // Summary Metrics
  const [summary, setSummary] = useState({
    totalUnitsInward: 0,
    totalInwardValuation: 0,
    totalTransactions: 0,
    uniqueSkusCount: 0,
  });

  // Selected Inward Voucher for printable preview
  const [selectedVoucher, setSelectedVoucher] = useState<HardwareStockMovement | null>(null);

  // Set initial SKU filter on modal open
  useEffect(() => {
    if (isOpen) {
      if (initialSkuId) {
        setSelectedSkuId(initialSkuId);
      } else {
        setSelectedSkuId('ALL');
      }
      setSearch('');
      setSelectedBranch('ALL');
      setSelectedDateRange('ALL');
    }
  }, [isOpen, initialSkuId]);

  // Load Inward History from API
  const loadInwardHistory = async () => {
    setLoading(true);
    try {
      let startDate: string | undefined = undefined;
      const now = new Date();

      if (selectedDateRange === 'TODAY') {
        startDate = now.toISOString().slice(0, 10);
      } else if (selectedDateRange === 'WEEK') {
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = lastWeek.toISOString().slice(0, 10);
      } else if (selectedDateRange === 'MONTH') {
        const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = lastMonth.toISOString().slice(0, 10);
      }

      const res = await hardwareInventoryApi.getInwardHistory({
        hardwareItemId: selectedSkuId !== 'ALL' ? selectedSkuId : undefined,
        warehouse: selectedBranch !== 'ALL' ? selectedBranch : undefined,
        search: search.trim() || undefined,
        startDate,
        limit: 300,
      });

      if (res.data?.success && res.data.data) {
        setInwards(res.data.data.inwards);
        setSummary({
          totalUnitsInward: res.data.data.totalUnitsInward,
          totalInwardValuation: res.data.data.totalInwardValuation,
          totalTransactions: res.data.data.totalTransactions,
          uniqueSkusCount: res.data.data.uniqueSkusCount,
        });
      }
    } catch (err) {
      console.error('[HardwareInwardHistoryModal] Failed to load inward history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadInwardHistory();
    }
  }, [isOpen, selectedSkuId, selectedBranch, selectedDateRange, search]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!inwards.length) return;

    const headers = [
      'Movement Number',
      'Movement Date',
      'SKU',
      'Hardware Name',
      'Material',
      'Warehouse',
      'Inward Qty',
      'Unit',
      'Unit Cost (INR)',
      'Total Value (INR)',
      'Stock Before',
      'Stock After',
      'Supplier Invoice No',
      'Supplier Invoice Date',
      'Batch Lot No',
      'Notes',
    ];

    const rows = inwards.map((m) => [
      `"${m.movementNumber}"`,
      `"${m.movementDate}"`,
      `"${m.sku}"`,
      `"${(m.hardwareName || '').replace(/"/g, '""')}"`,
      `"${m.material || ''}"`,
      `"${m.warehouse}"`,
      m.quantity,
      `"${m.unit || "No's"}"`,
      m.unitCost || 0,
      m.totalValue || 0,
      m.stockBefore || 0,
      m.stockAfter || 0,
      `"${(m.supplierInvoiceNo || '').replace(/"/g, '""')}"`,
      `"${m.supplierInvoiceDate || ''}"`,
      `"${(m.batchLotNo || '').replace(/"/g, '""')}"`,
      `"${(m.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Pacific_Hardware_Inward_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print GRN Handler
  const handlePrintVoucher = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-[#0a091e] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Strip */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <ArrowDownRight className="w-5 h-5 text-[#B5F823]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Stock Inward Register & History
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Receipts & GRN
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Vendor invoices, batch receipts, unit valuations and stock inward increments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenNewInward && (
              <button
                type="button"
                onClick={() => {
                  const targetItem = selectedSkuId !== 'ALL' ? items.find((i) => i.id === selectedSkuId) : null;
                  onOpenNewInward(targetItem);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7FB706] hover:bg-[#B5F823] text-black text-xs font-bold rounded-xl transition-all shadow-lg hover:shadow-lime-500/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New Inward
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 p-4 bg-[#070617] border-b border-white/5 shrink-0">
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <div className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase">Total Inward Units</div>
            <div className="text-lg sm:text-2xl font-bold font-mono text-emerald-400 mt-0.5">
              +{summary.totalUnitsInward.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-gray-500">Cumulative added stock</div>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <div className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase">Inward Valuation</div>
            <div className="text-lg sm:text-2xl font-bold font-mono text-white mt-0.5">
              ₹{Math.round(summary.totalInwardValuation).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-gray-500">Purchase order receipts</div>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <div className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase">Inward Receipts</div>
            <div className="text-lg sm:text-2xl font-bold font-mono text-cyan-400 mt-0.5">
              {summary.totalTransactions}
            </div>
            <div className="text-[10px] text-gray-500">GRN log count</div>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <div className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase">Unique SKUs Inwarded</div>
            <div className="text-lg sm:text-2xl font-bold font-mono text-[#B5F823] mt-0.5">
              {summary.uniqueSkusCount}
            </div>
            <div className="text-[10px] text-gray-500">Distinct catalog items</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3.5 sm:p-4 bg-[#0a091e] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoice, SKU, batch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* SKU Filter */}
            <select
              value={selectedSkuId}
              onChange={(e) => setSelectedSkuId(e.target.value)}
              className="py-1.5 px-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL" className="bg-[#0a091e] text-white">All Hardware SKUs</option>
              {items.map((i) => (
                <option key={i.id} value={i.id} className="bg-[#0a091e] text-white">
                  {i.sku} — {i.name}
                </option>
              ))}
            </select>

            {/* Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="py-1.5 px-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL" className="bg-[#0a091e] text-white">All Warehouses</option>
              {branches.map((b) => (
                <option key={b.id} value={b.code} className="bg-[#0a091e] text-white">
                  {b.name} ({b.code})
                </option>
              ))}
            </select>

            {/* Date Range Filter */}
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="py-1.5 px-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL" className="bg-[#0a091e] text-white">All Time</option>
              <option value="TODAY" className="bg-[#0a091e] text-white">Today</option>
              <option value="WEEK" className="bg-[#0a091e] text-white">Last 7 Days</option>
              <option value="MONTH" className="bg-[#0a091e] text-white">Last 30 Days</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadInwardHistory}
              title="Refresh register"
              className="p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={inwards.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold rounded-xl border border-white/10 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-xs">Loading stock inward register...</p>
            </div>
          ) : inwards.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400 text-center px-4">
              <Boxes className="w-12 h-12 text-gray-600 stroke-[1.5]" />
              <div>
                <p className="text-sm font-semibold text-gray-300">No stock inward receipts found</p>
                <p className="text-xs text-gray-500 mt-1">
                  Adjust filters or record a new stock inward movement to populate this register.
                </p>
              </div>
              {onOpenNewInward && (
                <button
                  type="button"
                  onClick={() => {
                    const targetItem = selectedSkuId !== 'ALL' ? items.find((i) => i.id === selectedSkuId) : null;
                    onOpenNewInward(targetItem);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7FB706] hover:bg-[#B5F823] text-black text-xs font-bold rounded-xl transition-all cursor-pointer mt-2"
                >
                  <Plus className="w-4 h-4" />
                  Record Stock Inward Now
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-3.5">Movement # / Date</th>
                      <th className="py-3 px-3">Item / SKU</th>
                      <th className="py-3 px-3">Warehouse</th>
                      <th className="py-3 px-3">Supplier Invoice</th>
                      <th className="py-3 px-3">Batch / Lot</th>
                      <th className="py-3 px-3 text-center">Inward Qty</th>
                      <th className="py-3 px-3 text-center">Stock Progression</th>
                      <th className="py-3 px-3 text-right">Unit Cost & Value</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                    {inwards.map((m) => (
                      <tr key={m.id} className="hover:bg-white/[0.03] transition-colors">
                        {/* Movement No & Date */}
                        <td className="py-3 px-3.5 font-mono">
                          <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                            <ArrowDownRight className="w-3.5 h-3.5 text-[#B5F823] shrink-0" />
                            {m.movementNumber}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">{m.movementDate}</div>
                        </td>

                        {/* Item / SKU */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white">{m.hardwareName}</div>
                          <div className="font-mono text-[11px] text-gray-400 mt-0.5">{m.sku}</div>
                          {(m.dia || m.length || m.width) && (
                            <div className="flex items-center gap-1 mt-1">
                              {m.dia && <span className="text-[9px] font-mono px-1 bg-white/5 rounded text-blue-300">Ø {m.dia}</span>}
                              {m.length && <span className="text-[9px] font-mono px-1 bg-white/5 rounded text-purple-300">L: {m.length}</span>}
                              {m.width && <span className="text-[9px] font-mono px-1 bg-white/5 rounded text-emerald-300">W: {m.width}</span>}
                            </div>
                          )}
                        </td>

                        {/* Warehouse Hub */}
                        <td className="py-3 px-3 font-mono">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30">
                            {m.warehouse}
                          </span>
                        </td>

                        {/* Supplier Invoice */}
                        <td className="py-3 px-3">
                          {m.supplierInvoiceNo ? (
                            <div>
                              <div className="font-mono text-white font-medium flex items-center gap-1">
                                <Receipt className="w-3 h-3 text-emerald-400" />
                                {m.supplierInvoiceNo}
                              </div>
                              {m.supplierInvoiceDate && (
                                <div className="text-[10px] text-gray-500 font-mono">
                                  Dt: {m.supplierInvoiceDate}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-500 italic">Direct / Opening</span>
                          )}
                        </td>

                        {/* Batch / Lot */}
                        <td className="py-3 px-3 font-mono">
                          {m.batchLotNo ? (
                            <span className="px-1.5 py-0.5 bg-white/5 rounded text-[11px] text-gray-300 border border-white/10">
                              {m.batchLotNo}
                            </span>
                          ) : (
                            <span className="text-gray-500 italic text-[11px]">N/A</span>
                          )}
                        </td>

                        {/* Inward Qty */}
                        <td className="py-3 px-3 text-center font-mono">
                          <span className="text-sm font-bold text-emerald-400">
                            +{m.quantity}
                          </span>{' '}
                          <span className="text-[10px] text-gray-400">{m.unit || "No's"}</span>
                        </td>

                        {/* Stock Progression */}
                        <td className="py-3 px-3 text-center font-mono text-[11px]">
                          <span className="text-gray-500">{m.stockBefore}</span>
                          <span className="mx-1 text-gray-600">→</span>
                          <span className="text-[#B5F823] font-bold">{m.stockAfter}</span>
                        </td>

                        {/* Unit Cost & Total Value */}
                        <td className="py-3 px-3 text-right font-mono">
                          <div className="text-xs text-white font-semibold">
                            ₹{(m.totalValue || 0).toLocaleString('en-IN')}
                          </div>
                          {m.unitCost ? (
                            <div className="text-[10px] text-gray-400">@ ₹{m.unitCost} / unit</div>
                          ) : null}
                        </td>

                        {/* Action: GRN Slip */}
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedVoucher(m)}
                            title="View Goods Receipt Note (GRN)"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 rounded-lg text-[11px] font-medium border border-emerald-500/25 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3 h-3 text-[#B5F823]" />
                            GRN Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Responsive Cards */}
              <div className="block md:hidden divide-y divide-white/5">
                {inwards.map((m) => (
                  <div key={m.id} className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-400 font-bold text-xs flex items-center gap-1">
                            <ArrowDownRight className="w-3 h-3 text-[#B5F823]" />
                            {m.movementNumber}
                          </span>
                          <span className="px-1.5 py-0.5 bg-[#7FB706]/15 text-[#B5F823] rounded text-[9px] font-mono font-bold">
                            {m.warehouse}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-white mt-0.5">
                          [{m.sku}] {m.hardwareName}
                        </h4>
                        {(m.dia || m.length || m.width) && (
                          <div className="flex items-center gap-1 mt-1">
                            {m.dia && <span className="text-[9px] font-mono text-blue-300">Ø {m.dia}</span>}
                            {m.length && <span className="text-[9px] font-mono text-purple-300">L: {m.length}</span>}
                            {m.width && <span className="text-[9px] font-mono text-emerald-300">W: {m.width}</span>}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-emerald-400 font-bold text-sm">
                          +{m.quantity}
                        </span>{' '}
                        <span className="text-[10px] text-gray-400">{m.unit || "No's"}</span>
                        <div className="text-[10px] text-gray-500 font-mono">{m.movementDate}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-black/30 p-2.5 rounded-lg border border-white/5">
                      <div>
                        <span className="text-[10px] text-gray-500 block">Supplier Invoice</span>
                        <span className="text-white font-mono font-medium">
                          {m.supplierInvoiceNo || 'N/A'}
                        </span>
                        {m.supplierInvoiceDate && (
                          <span className="text-[9px] text-gray-500 block">Dt: {m.supplierInvoiceDate}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">Batch / Lot</span>
                        <span className="text-white font-mono">{m.batchLotNo || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">Stock Progression</span>
                        <span className="font-mono text-[11px] text-gray-400">
                          {m.stockBefore} → <strong className="text-emerald-400">{m.stockAfter}</strong>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">Valuation</span>
                        <span className="font-mono font-bold text-white">
                          ₹{(m.totalValue || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {m.notes && (
                      <p className="text-[11px] text-gray-400 bg-white/5 px-2.5 py-1.5 rounded-md italic">
                        "{m.notes}"
                      </p>
                    )}

                    <div className="flex items-center justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedVoucher(m)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-medium border border-emerald-500/25"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        View GRN Voucher
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-white/10 bg-white/5 flex items-center justify-between text-xs text-gray-400 shrink-0">
          <div>
            Showing <strong className="text-white">{inwards.length}</strong> stock inward records
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* ── GRN Voucher Modal / Printable View ──────────────── */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white text-gray-900 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col gap-5 print:p-0 print:m-0 print:max-w-none print:shadow-none">
            {/* Action Bar (hidden on print) */}
            <div className="flex items-center justify-between border-b pb-4 border-gray-200 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-gray-900">
                  Goods Receipt Note (GRN) — Voucher
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintVoucher}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print GRN
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVoucher(null)}
                  className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Voucher Body */}
            <div className="space-y-6">
              {/* Company Header */}
              <div className="flex items-start justify-between border-b-2 border-emerald-600 pb-4">
                <div>
                  <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                    Pacific Restroom Cubicle
                  </h1>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Central Warehousing & Hardware Inventory Store
                  </p>
                  <p className="text-[11px] text-gray-500 font-mono">
                    Warehouse: {selectedVoucher.warehouse} Hub
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded font-mono font-bold text-xs uppercase">
                    Goods Receipt Note
                  </div>
                  <div className="text-xs font-mono font-bold text-gray-900 mt-2">
                    GRN No: {selectedVoucher.movementNumber}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono">
                    Receipt Date: {selectedVoucher.movementDate}
                  </div>
                </div>
              </div>

              {/* Invoice & Vendor Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">
                    Supplier Invoice No
                  </span>
                  <span className="font-mono text-sm font-bold text-gray-900">
                    {selectedVoucher.supplierInvoiceNo || 'Direct / Warehouse Transfer'}
                  </span>
                  {selectedVoucher.supplierInvoiceDate && (
                    <span className="text-[11px] text-gray-600 block mt-0.5">
                      Invoice Date: {selectedVoucher.supplierInvoiceDate}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">
                    Batch / Lot Reference
                  </span>
                  <span className="font-mono text-sm font-bold text-gray-900">
                    {selectedVoucher.batchLotNo || 'Standard Commercial Batch'}
                  </span>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Item Details & SKU</th>
                      <th className="py-2.5 px-3">Specs / Material</th>
                      <th className="py-2.5 px-3 text-center">Inward Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-900">{selectedVoucher.hardwareName}</div>
                        <div className="font-mono text-[11px] text-gray-500">{selectedVoucher.sku}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-gray-800">{selectedVoucher.material}</div>
                        {(selectedVoucher.dia || selectedVoucher.length || selectedVoucher.width) && (
                          <div className="text-[10px] font-mono text-gray-500 mt-0.5">
                            {[
                              selectedVoucher.dia ? `Ø ${selectedVoucher.dia}` : '',
                              selectedVoucher.length ? `L: ${selectedVoucher.length}` : '',
                              selectedVoucher.width ? `W: ${selectedVoucher.width}` : '',
                            ].filter(Boolean).join(' | ')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-sm text-emerald-700">
                        +{selectedVoucher.quantity} {selectedVoucher.unit || "No's"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        ₹{selectedVoucher.unitCost || 0}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-sm text-gray-900">
                        ₹{(selectedVoucher.totalValue || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Stock Progression Summary */}
              <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs font-mono">
                <span className="text-gray-600">
                  Pre-Inward Stock: <strong className="text-gray-900">{selectedVoucher.stockBefore}</strong>
                </span>
                <span className="text-emerald-700 font-bold">
                  + {selectedVoucher.quantity} Inward Received
                </span>
                <span className="text-gray-900 font-bold">
                  Updated Store Balance: <strong className="text-emerald-800 text-sm">{selectedVoucher.stockAfter}</strong> {selectedVoucher.unit || "No's"}
                </span>
              </div>

              {selectedVoucher.notes && (
                <div className="text-xs bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Notes & Inspection</span>
                  <p className="text-gray-700 mt-0.5">{selectedVoucher.notes}</p>
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-200 text-xs">
                <div>
                  <div className="h-12 border-b border-dashed border-gray-400"></div>
                  <p className="font-bold text-gray-900 mt-1">Received & Verified By</p>
                  <p className="text-[10px] text-gray-500">Warehouse Store Incharge</p>
                </div>
                <div className="text-right">
                  <div className="h-12 border-b border-dashed border-gray-400"></div>
                  <p className="font-bold text-gray-900 mt-1">Authorized Inspection Stamp</p>
                  <p className="text-[10px] text-gray-500">Pacific Quality Control</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
