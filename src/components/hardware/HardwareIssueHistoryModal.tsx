import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  History,
  Search,
  ArrowUpRight,
  Filter,
  Calendar,
  Building2,
  Download,
  FileText,
  Printer,
  Boxes,
  User,
  CheckCircle2,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { hardwareInventoryApi } from '../../api/hardwareInventoryApi';
import type {
  HardwareStockMovement,
  HardwareInventoryItem,
  HardwareBranch,
} from '../../types/admin';

interface HardwareIssueHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: HardwareInventoryItem[];
  branches: HardwareBranch[];
  initialSkuId?: string | null;
  onOpenNewIssue?: (item?: HardwareInventoryItem | null) => void;
}

export default function HardwareIssueHistoryModal({
  isOpen,
  onClose,
  items,
  branches,
  initialSkuId,
  onOpenNewIssue,
}: HardwareIssueHistoryModalProps) {
  const [issues, setIssues] = useState<HardwareStockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSkuId, setSelectedSkuId] = useState<string>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('ALL'); // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH'

  // Summary Metrics
  const [summary, setSummary] = useState({
    totalUnitsIssued: 0,
    totalIssueValuation: 0,
    totalTransactions: 0,
    uniqueSkusCount: 0,
  });

  // Selected Issue Voucher for printable preview
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

  // Load Issue History from API
  const loadIssueHistory = async () => {
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

      const res = await hardwareInventoryApi.getIssueHistory({
        hardwareItemId: selectedSkuId !== 'ALL' ? selectedSkuId : undefined,
        warehouse: selectedBranch !== 'ALL' ? selectedBranch : undefined,
        search: search.trim() || undefined,
        startDate,
      });

      if (res.data?.data) {
        setIssues(res.data.data.issues || []);
        setSummary({
          totalUnitsIssued: res.data.data.totalUnitsIssued || 0,
          totalIssueValuation: res.data.data.totalIssueValuation || 0,
          totalTransactions: res.data.data.totalTransactions || 0,
          uniqueSkusCount: res.data.data.uniqueSkusCount || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load hardware issue history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadIssueHistory();
    }
  }, [isOpen, selectedSkuId, selectedBranch, selectedDateRange, search]);

  const activeSkuItem = useMemo(() => {
    if (selectedSkuId === 'ALL') return null;
    return items.find((i) => i.id === selectedSkuId) || null;
  }, [selectedSkuId, items]);

  // Export filtered issue records to CSV
  const handleExportCsv = () => {
    const headers = [
      'Issue Slip No',
      'Date',
      'SKU',
      'Item Name',
      'Diameter',
      'Length',
      'Width',
      'Branch',
      'Quantity Issued',
      'Unit',
      'Stock Before',
      'Stock After',
      'Work Order / Project Ref',
      'Issued To Person',
      'Unit Cost (INR)',
      'Total Value (INR)',
      'Notes / Purpose',
    ];

    const rows = issues.map((m) => [
      m.movementNumber,
      m.movementDate,
      m.sku,
      `"${(m.hardwareName || '').replace(/"/g, '""')}"`,
      m.dia || '',
      m.length || '',
      m.width || '',
      m.warehouse,
      m.quantity,
      m.unit,
      m.stockBefore,
      m.stockAfter,
      `"${(m.issueReference || '').replace(/"/g, '""')}"`,
      `"${(m.issuedToPerson || '').replace(/"/g, '""')}"`,
      m.unitCost || 0,
      m.totalValue || 0,
      `"${(m.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `hardware_issue_history_${selectedSkuId !== 'ALL' ? activeSkuItem?.sku || 'sku' : 'all_skus'}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-[#121029] border border-[#7FB706]/30 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#0d0b21] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {activeSkuItem
                    ? `Issue History — [${activeSkuItem.sku}] ${activeSkuItem.name}`
                    : "Issue Details & History — All SKU's"}
                </h2>
                {activeSkuItem && (
                  <button
                    type="button"
                    onClick={() => setSelectedSkuId('ALL')}
                    className="text-[11px] px-2 py-0.5 bg-white/10 hover:bg-white/20 text-[#B5F823] rounded-md transition-colors cursor-pointer"
                  >
                    View All SKUs
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Complete historical dispatch log: tracks work orders, site teams, and stock reductions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenNewIssue && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNewIssue(activeSkuItem);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-md transition-colors cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Issue Stock
              </button>
            )}

            {issues.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-xs font-medium border border-white/10 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#B5F823]" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#0d0b21] border border-amber-500/20 rounded-xl">
              <div className="text-[10px] font-semibold uppercase text-amber-400">Total Units Issued</div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono mt-0.5">
                {summary.totalUnitsIssued.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-gray-400">Dispatched from stores</div>
            </div>

            <div className="p-3 bg-[#0d0b21] border border-[#7FB706]/20 rounded-xl">
              <div className="text-[10px] font-semibold uppercase text-[#7FB706]">Total Issued Valuation</div>
              <div className="text-xl sm:text-2xl font-bold text-[#B5F823] font-mono mt-0.5">
                ₹{summary.totalIssueValuation.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-gray-400">Material value</div>
            </div>

            <div className="p-3 bg-[#0d0b21] border border-blue-500/20 rounded-xl">
              <div className="text-[10px] font-semibold uppercase text-blue-400">Issue Transactions</div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono mt-0.5">
                {summary.totalTransactions}
              </div>
              <div className="text-[10px] text-gray-400">Store requisition slips</div>
            </div>

            <div className="p-3 bg-[#0d0b21] border border-purple-500/20 rounded-xl">
              <div className="text-[10px] font-semibold uppercase text-purple-400">Unique SKUs Issued</div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono mt-0.5">
                {summary.uniqueSkusCount}
              </div>
              <div className="text-[10px] text-gray-400">Distinct fitting types</div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="p-3 bg-[#0d0b21] border border-white/10 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
              {/* Free Search */}
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search issue #, SKU, project ref, recipient..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#030213] border border-white/10 focus:border-[#7FB706] rounded-lg text-xs text-white focus:outline-none"
                />
              </div>

              {/* SKU Filter */}
              <select
                value={selectedSkuId}
                onChange={(e) => setSelectedSkuId(e.target.value)}
                className="px-3 py-2 bg-[#030213] border border-white/10 rounded-lg text-xs text-gray-300 focus:outline-none"
              >
                <option value="ALL">All SKUs ({items.length})</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    [{i.sku}] {i.name}
                  </option>
                ))}
              </select>

              {/* Branch Filter */}
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-2 bg-[#030213] border border-white/10 rounded-lg text-xs text-gray-300 focus:outline-none"
              >
                <option value="ALL">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.name.split(' ')[0]} ({b.code})
                  </option>
                ))}
              </select>

              {/* Date Preset */}
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="px-3 py-2 bg-[#030213] border border-white/10 rounded-lg text-xs text-gray-300 focus:outline-none"
              >
                <option value="ALL">All Time History</option>
                <option value="TODAY">Today's Issues</option>
                <option value="WEEK">Last 7 Days</option>
                <option value="MONTH">Last 30 Days</option>
              </select>
            </div>

            {/* Active Filters Pill Bar */}
            {(selectedSkuId !== 'ALL' || selectedBranch !== 'ALL' || selectedDateRange !== 'ALL' || search) && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5 text-xs text-gray-400">
                <span>Active filters:</span>
                {selectedSkuId !== 'ALL' && (
                  <span className="px-2 py-0.5 bg-[#7FB706]/15 border border-[#7FB706]/30 text-[#B5F823] rounded-md font-mono text-[11px] flex items-center gap-1">
                    SKU: {activeSkuItem?.sku || selectedSkuId}
                    <button type="button" onClick={() => setSelectedSkuId('ALL')} className="hover:text-white">×</button>
                  </span>
                )}
                {selectedBranch !== 'ALL' && (
                  <span className="px-2 py-0.5 bg-white/10 text-gray-300 rounded-md font-mono text-[11px] flex items-center gap-1">
                    Branch: {selectedBranch}
                    <button type="button" onClick={() => setSelectedBranch('ALL')} className="hover:text-white">×</button>
                  </span>
                )}
                {selectedDateRange !== 'ALL' && (
                  <span className="px-2 py-0.5 bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded-md text-[11px] flex items-center gap-1">
                    {selectedDateRange}
                    <button type="button" onClick={() => setSelectedDateRange('ALL')} className="hover:text-white">×</button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSkuId('ALL');
                    setSelectedBranch('ALL');
                    setSelectedDateRange('ALL');
                    setSearch('');
                  }}
                  className="text-red-400 hover:text-red-300 underline text-[11px] ml-auto cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Table / List Container */}
          <div className="bg-[#0d0b21] border border-white/10 rounded-xl overflow-hidden shadow-inner">
            {loading ? (
              <div className="p-12 text-center text-gray-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#7FB706]" />
                <p className="text-xs">Loading stock issue history...</p>
              </div>
            ) : issues.length === 0 ? (
              <div className="p-12 text-center text-gray-400 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-gray-500">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">No Stock Issue Records Found</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                    {search || selectedSkuId !== 'ALL' || selectedBranch !== 'ALL'
                      ? 'No issues match the applied filters. Try clearing filters or searching for another term.'
                      : 'No hardware stock has been issued yet. Click "Issue Stock" to record the first issue.'}
                  </p>
                </div>
                {onOpenNewIssue && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenNewIssue(activeSkuItem);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-md transition-colors cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Issue Stock Now
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* 1. Desktop Table (hidden on mobile) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider bg-black/30">
                        <th className="py-3 px-3 font-semibold">Slip # & Date</th>
                        <th className="py-3 px-3 font-semibold">SKU & Item Name</th>
                        <th className="py-3 px-2 font-semibold">Branch</th>
                        <th className="py-3 px-3 font-semibold text-right">Qty Issued</th>
                        <th className="py-3 px-3 font-semibold text-center">Stock Flow</th>
                        <th className="py-3 px-3 font-semibold">Work Order / Ref</th>
                        <th className="py-3 px-3 font-semibold">Issued To</th>
                        <th className="py-3 px-3 font-semibold text-right">Valuation</th>
                        <th className="py-3 px-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-sans">
                      {issues.map((m) => (
                        <tr key={m.id} className="hover:bg-white/5 transition-colors">
                          {/* Slip & Date */}
                          <td className="py-3 px-3">
                            <span className="font-mono text-amber-400 font-bold block">
                              {m.movementNumber}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                              {m.movementDate}
                            </span>
                          </td>

                          {/* SKU & Name with Dimensions */}
                          <td className="py-3 px-3">
                            <span className="font-mono text-[#B5F823] font-bold block text-xs">
                              {m.sku}
                            </span>
                            <span className="text-white font-medium text-xs block">
                              {m.hardwareName}
                            </span>
                            {(m.dia || m.length || m.width) && (
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                {m.dia && (
                                  <span className="px-1.5 py-0.2 bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded text-[10px] font-mono">
                                    Ø {m.dia}
                                  </span>
                                )}
                                {m.length && (
                                  <span className="px-1.5 py-0.2 bg-purple-500/15 border border-purple-500/30 text-purple-300 rounded text-[10px] font-mono">
                                    L: {m.length}
                                  </span>
                                )}
                                {m.width && (
                                  <span className="px-1.5 py-0.2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded text-[10px] font-mono">
                                    W: {m.width}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Branch */}
                          <td className="py-3 px-2">
                            <span className="px-2 py-0.5 bg-[#7FB706]/15 border border-[#7FB706]/30 text-[#B5F823] rounded text-[10px] font-mono font-bold">
                              {m.warehouse}
                            </span>
                          </td>

                          {/* Qty Issued */}
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono text-amber-400 font-bold text-sm">
                              -{m.quantity}
                            </span>{' '}
                            <span className="text-[10px] text-gray-400">{m.unit}</span>
                          </td>

                          {/* Stock Flow: Before -> After */}
                          <td className="py-3 px-3 text-center">
                            <div className="font-mono text-[11px] text-gray-300">
                              <span>{m.stockBefore}</span>
                              <span className="text-amber-400 mx-1">→</span>
                              <span className="text-emerald-400 font-bold">{m.stockAfter}</span>
                            </div>
                            <span className="text-[9px] text-gray-500">before → after</span>
                          </td>

                          {/* Work Order / Reference */}
                          <td className="py-3 px-3">
                            {m.issueReference ? (
                              <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-gray-200 rounded text-[11px] font-mono block truncate max-w-[170px]" title={m.issueReference}>
                                {m.issueReference}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-500 italic">No Ref</span>
                            )}
                            {m.notes && (
                              <span className="text-[10px] text-gray-400 block mt-0.5 truncate max-w-[170px]" title={m.notes}>
                                {m.notes}
                              </span>
                            )}
                          </td>

                          {/* Issued To */}
                          <td className="py-3 px-3">
                            {m.issuedToPerson ? (
                              <div className="flex items-center gap-1.5 text-xs text-gray-300">
                                <User className="w-3 h-3 text-gray-400 shrink-0" />
                                <span className="truncate max-w-[140px]" title={m.issuedToPerson}>
                                  {m.issuedToPerson}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-gray-500 italic">Unassigned</span>
                            )}
                          </td>

                          {/* Valuation */}
                          <td className="py-3 px-3 text-right font-mono">
                            <div className="text-xs text-white font-medium">
                              ₹{(m.totalValue || 0).toLocaleString('en-IN')}
                            </div>
                            {m.unitCost ? (
                              <div className="text-[10px] text-gray-500">
                                @ ₹{m.unitCost}
                              </div>
                            ) : null}
                          </td>

                          {/* Action: View Slip */}
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedVoucher(m)}
                              title="View and print issue slip voucher"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white rounded-lg text-[11px] font-medium border border-white/10 transition-colors cursor-pointer"
                            >
                              <FileText className="w-3 h-3 text-amber-400" />
                              Slip
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 2. Mobile Responsive Card List (hidden on md+) */}
                <div className="block md:hidden divide-y divide-white/5">
                  {issues.map((m) => (
                    <div key={m.id} className="p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-amber-400 font-bold text-xs">
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
                              {m.dia && <span className="text-[10px] font-mono text-blue-300">Ø {m.dia}</span>}
                              {m.length && <span className="text-[10px] font-mono text-purple-300">L: {m.length}</span>}
                              {m.width && <span className="text-[10px] font-mono text-emerald-300">W: {m.width}</span>}
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-amber-400 font-bold text-sm">
                            -{m.quantity}
                          </span>{' '}
                          <span className="text-[10px] text-gray-400">{m.unit}</span>
                          <div className="text-[10px] text-gray-500 font-mono">{m.movementDate}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-black/30 p-2.5 rounded-lg border border-white/5">
                        <div>
                          <span className="text-[9px] text-gray-500 uppercase block">Work Order / Ref</span>
                          <span className="text-gray-200 font-mono text-xs truncate block">
                            {m.issueReference || 'N/A'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] text-gray-500 uppercase block">Issued To</span>
                          <span className="text-gray-200 text-xs truncate block">
                            {m.issuedToPerson || 'Unassigned'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] text-gray-500 uppercase block">Stock Flow</span>
                          <span className="text-gray-300 font-mono text-xs">
                            {m.stockBefore} → <strong className="text-emerald-400">{m.stockAfter}</strong>
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] text-gray-500 uppercase block">Total Value</span>
                          <span className="text-[#B5F823] font-mono text-xs font-semibold">
                            ₹{(m.totalValue || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-gray-400 truncate max-w-[200px]">
                          {m.notes || 'No remarks'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedVoucher(m)}
                          className="px-2.5 py-1 bg-white/5 hover:bg-white/15 text-gray-200 rounded text-xs font-medium border border-white/10 flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3 h-3 text-amber-400" />
                          View Slip
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0d0b21] flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-400">
            Showing <strong className="text-white">{issues.length}</strong> issue records across all SKUs
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white/10 hover:bg-white/15 text-gray-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close History
          </button>
        </div>
      </div>

      {/* Sub-Modal: Printable Issue Voucher Slip */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white text-gray-900 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 my-auto print:m-0 print:p-0 print:shadow-none print:w-full">
            {/* Voucher Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <h3 className="text-xl font-black tracking-tight text-gray-900 uppercase">
                  Pacific Products &amp; Solutions
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Hardware Stores Requisition &amp; Material Issue Voucher
                </p>
                <div className="text-xs text-gray-600 mt-1 font-mono">
                  Branch: <strong>{selectedVoucher.warehouse}</strong> | Date: <strong>{selectedVoucher.movementDate}</strong>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold px-2 py-1 bg-amber-100 text-amber-900 rounded border border-amber-300 inline-block">
                  {selectedVoucher.movementNumber}
                </span>
                <p className="text-[10px] text-gray-400 mt-1">STOCK DISPATCH SLIP</p>
              </div>
            </div>

            {/* Voucher Detail Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-gray-500 uppercase text-[10px] font-bold block">SKU &amp; Fitting Name</span>
                <div className="font-mono font-bold text-gray-900 text-sm">[{selectedVoucher.sku}]</div>
                <div className="text-gray-800 font-semibold">{selectedVoucher.hardwareName}</div>
                {(selectedVoucher.dia || selectedVoucher.length || selectedVoucher.width) && (
                  <div className="text-[11px] text-gray-600 font-mono mt-0.5">
                    Dimensions: {selectedVoucher.dia && `Dia: ${selectedVoucher.dia}`}
                    {selectedVoucher.length && ` | L: ${selectedVoucher.length}`}
                    {selectedVoucher.width && ` | W: ${selectedVoucher.width}`}
                  </div>
                )}
              </div>

              <div className="space-y-1 text-right">
                <span className="text-gray-500 uppercase text-[10px] font-bold block">Quantity Issued</span>
                <div className="text-2xl font-black font-mono text-gray-900">
                  {selectedVoucher.quantity} {selectedVoucher.unit}
                </div>
                <div className="text-[11px] text-gray-600">
                  Store Balance: {selectedVoucher.stockAfter} {selectedVoucher.unit}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-gray-500 uppercase text-[10px] font-bold block">Project / Work Order Ref</span>
                <div className="font-semibold text-gray-900 font-mono">
                  {selectedVoucher.issueReference || 'General Assembly / Over-the-counter'}
                </div>
              </div>

              <div className="space-y-1 text-right">
                <span className="text-gray-500 uppercase text-[10px] font-bold block">Issued To (Recipient)</span>
                <div className="font-semibold text-gray-900">
                  {selectedVoucher.issuedToPerson || 'Authorized Site Personnel'}
                </div>
              </div>

              {selectedVoucher.notes && (
                <div className="col-span-2 pt-2 border-t">
                  <span className="text-gray-500 uppercase text-[10px] font-bold block">Remarks &amp; Purpose</span>
                  <p className="text-xs text-gray-700 italic">{selectedVoucher.notes}</p>
                </div>
              )}
            </div>

            {/* Signature Block */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-dashed">
              <div className="text-center">
                <div className="border-b border-gray-400 w-36 mx-auto mb-1"></div>
                <span className="text-[10px] uppercase font-bold text-gray-500">Store Incharge Signature</span>
              </div>
              <div className="text-center">
                <div className="border-b border-gray-400 w-36 mx-auto mb-1"></div>
                <span className="text-[10px] uppercase font-bold text-gray-500">Receiver / Installer Signature</span>
              </div>
            </div>

            {/* Modal Controls */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t print:hidden">
              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Close Voucher
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
