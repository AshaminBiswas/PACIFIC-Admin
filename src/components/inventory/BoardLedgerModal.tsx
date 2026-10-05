import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  ArrowDownRight,
  ArrowUpRight,
  Sliders,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { boardInventoryApi } from '../../api/boardInventoryApi';
import type { BoardStockMovement, BoardInventoryItem } from '../../types/admin';

interface BoardLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBoard: BoardInventoryItem | null;
  onOpenAdjust: (movement: BoardStockMovement) => void;
}

export default function BoardLedgerModal({
  isOpen,
  onClose,
  selectedBoard,
  onOpenAdjust,
}: BoardLedgerModalProps) {
  const [movements, setMovements] = useState<BoardStockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const res = await boardInventoryApi.getMovements({
        inventoryItemId: selectedBoard ? selectedBoard.id : undefined,
        movementType: typeFilter !== 'ALL' ? typeFilter : undefined,
        limit: 500,
      });
      if (res.data?.data) {
        setMovements(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load ledger movements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMovements();
    }
  }, [isOpen, selectedBoard, typeFilter]);

  if (!isOpen) return null;

  const filtered = movements.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.movementNumber.toLowerCase().includes(q) ||
      (m.supplierInvoiceNo && m.supplierInvoiceNo.toLowerCase().includes(q)) ||
      (m.issueListNumber && m.issueListNumber.toLowerCase().includes(q)) ||
      (m.issueReference && m.issueReference.toLowerCase().includes(q)) ||
      (m.inventoryItem?.designNo && m.inventoryItem.designNo.toLowerCase().includes(q)) ||
      (m.issuedToPerson && m.issuedToPerson.toLowerCase().includes(q))
    );
  });

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'INWARD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ArrowDownRight className="w-3 h-3" /> Inward (+)
          </span>
        );
      case 'ISSUE_AUTO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Sliders className="w-3 h-3" /> Auto Deduct (-)
          </span>
        );
      case 'ISSUE_MANUAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ArrowUpRight className="w-3 h-3" /> Manual Issue (-)
          </span>
        );
      case 'ADJUSTMENT_ADD':
      case 'ADJUSTMENT_SUB':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Sliders className="w-3 h-3" /> Adjustment
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-gray-300">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#09071a] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-[#7FB706] to-[#B5F823]" />

        {/* Title Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/5 text-white border border-white/10">
              <History className="w-5 h-5 text-[#7FB706]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {selectedBoard
                  ? `Stock Ledger: Design ${selectedBoard.designNo} (${selectedBoard.vendorName})`
                  : 'Universal Stock Movement Ledger'}
              </h2>
              <p className="text-xs text-gray-400">
                Complete audit history of all inwards, dispatches, manual issues, and auto-deductions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="py-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search movement #, invoice, issue list, design..."
                className="w-full bg-[#121029] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#121029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706]"
            >
              <option value="ALL">All Types</option>
              <option value="INWARD">Inward (+)</option>
              <option value="ISSUE_AUTO">Auto Deduct (-)</option>
              <option value="ISSUE_MANUAL">Manual Issue (-)</option>
            </select>

            <button
              onClick={fetchMovements}
              className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-white/10 transition"
              title="Refresh Ledger"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Movements Table */}
        <div className="flex-1 overflow-y-auto mt-4 border border-white/5 rounded-xl bg-white/[0.02]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#0f0c29] border-b border-white/10 text-gray-400 uppercase font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Movement #</th>
                <th className="py-3 px-4">Type</th>
                {!selectedBoard && <th className="py-3 px-4">SKU / Design</th>}
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4 text-center">Before</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-center">After</th>
                <th className="py-3 px-4">Remarks / Operator</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#7FB706]" />
                    Loading audit movements...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    No stock movements found matching the criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const isInward = m.movementType === 'INWARD';
                  const isDeductible =
                    m.movementType === 'ISSUE_AUTO' || m.movementType === 'ISSUE_MANUAL';

                  return (
                    <tr key={m.id} className="hover:bg-white/[0.04] transition">
                      <td className="py-3 px-4 whitespace-nowrap text-gray-300">
                        {new Date(m.movementDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-gray-200 whitespace-nowrap">
                        {m.movementNumber}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{getMovementBadge(m.movementType)}</td>
                      {!selectedBoard && (
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white">
                            {m.inventoryItem?.designNo || '—'}
                          </span>{' '}
                          <span className="text-[10px] text-gray-400">
                            ({m.inventoryItem?.vendorName})
                          </span>
                        </td>
                      )}
                      <td className="py-3 px-4 font-mono text-gray-300">
                        {m.supplierInvoiceNo ? (
                          <span title={`Invoice Date: ${m.supplierInvoiceDate || ''}`}>
                            Inv: {m.supplierInvoiceNo}
                          </span>
                        ) : m.issueListNumber ? (
                          <span className="text-sky-400">Issue: {m.issueListNumber}</span>
                        ) : (
                          m.issueReference || '—'
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-gray-400">
                        {m.stockBefore}
                      </td>
                      <td
                        className={`py-3 px-4 text-center font-mono font-bold whitespace-nowrap ${
                          isInward ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isInward ? `+${m.quantity}` : `-${m.quantity}`}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-white">
                        {m.stockAfter}
                      </td>
                      <td className="py-3 px-4 text-gray-300 max-w-[200px] truncate" title={m.notes || ''}>
                        {m.issuedToPerson && (
                          <span className="text-[#B5F823] mr-1">[{m.issuedToPerson}]</span>
                        )}
                        {m.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isDeductible && (
                          <button
                            onClick={() => {
                              onOpenAdjust(m);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-[11px] font-semibold transition"
                            title="Edit or adjust this deduction"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 shrink-0">
          <span>Showing {filtered.length} movement records</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
