import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  History,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  Sliders,
  Filter,
  Calendar,
  Building2,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { hardwareInventoryApi } from '../../api/hardwareInventoryApi';
import type { HardwareStockMovement, HardwareBranch } from '../../types/admin';

interface HardwareLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: HardwareBranch[];
  initialItemId?: string;
}

export default function HardwareLedgerModal({
  isOpen,
  onClose,
  branches,
  initialItemId,
}: HardwareLedgerModalProps) {
  const [movements, setMovements] = useState<HardwareStockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const loadMovements = async () => {
    setLoading(true);
    try {
      const res = await hardwareInventoryApi.getMovements({
        hardwareItemId: initialItemId,
        warehouse: selectedBranch !== 'ALL' ? selectedBranch : undefined,
        movementType: selectedType !== 'ALL' ? selectedType : undefined,
      });
      if (res.data?.data) {
        setMovements(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load hardware movements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMovements();
    }
  }, [isOpen, initialItemId, selectedBranch, selectedType]);

  const filtered = useMemo(() => {
    if (!search.trim()) return movements;
    const q = search.toLowerCase().trim();
    return movements.filter(
      (m) =>
        m.sku.toLowerCase().includes(q) ||
        m.hardwareName.toLowerCase().includes(q) ||
        m.movementNumber.toLowerCase().includes(q) ||
        (m.supplierInvoiceNo && m.supplierInvoiceNo.toLowerCase().includes(q)) ||
        (m.issueReference && m.issueReference.toLowerCase().includes(q)) ||
        (m.issuedToPerson && m.issuedToPerson.toLowerCase().includes(q))
    );
  }, [movements, search]);

  const handleExportCsv = () => {
    const headers = [
      'Movement No',
      'Date',
      'Type',
      'SKU',
      'Item Name',
      'Branch',
      'Quantity',
      'Stock Before',
      'Stock After',
      'Reference / Invoice',
      'Notes',
    ];
    const rows = filtered.map((m) => [
      m.movementNumber,
      m.movementDate,
      m.movementType,
      m.sku,
      `"${m.hardwareName.replace(/"/g, '""')}"`,
      m.warehouse,
      m.quantity,
      m.stockBefore,
      m.stockAfter,
      `"${(m.supplierInvoiceNo || m.issueReference || '').replace(/"/g, '""')}"`,
      `"${(m.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `hardware_movement_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#121029] border border-[#7FB706]/30 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#0d0b21]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#7FB706]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Hardware Movement Audit Ledger
              </h2>
              <p className="text-xs text-gray-400">
                Complete traceability of stock receipts, project dispatches, and adjustments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 bg-[#0d0b21]/70 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search SKU, item, invoice, ref, user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#030213] border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-1.5 bg-[#030213] border border-white/10 rounded-xl text-xs text-gray-300 focus:outline-none"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.code}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1.5 bg-[#030213] border border-white/10 rounded-xl text-xs text-gray-300 focus:outline-none"
            >
              <option value="ALL">All Movement Types</option>
              <option value="INWARD">Stock Inward (+)</option>
              <option value="ISSUE">Stock Issue (-)</option>
              <option value="ADJUSTMENT_ADD">Adjustment Add (+)</option>
              <option value="ADJUSTMENT_SUB">Adjustment Deduct (-)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-gray-200 text-xs font-medium rounded-xl border border-white/10 transition-colors cursor-pointer whitespace-nowrap self-end sm:self-center"
          >
            <Download className="w-3.5 h-3.5 text-[#B5F823]" />
            Export CSV
          </button>
        </div>

        {/* Ledger Table */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading movement history...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm border border-dashed border-white/10 rounded-xl">
              No stock movements recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider bg-[#0d0b21]/50">
                    <th className="py-2.5 px-3 font-semibold">Movement #</th>
                    <th className="py-2.5 px-3 font-semibold">Date</th>
                    <th className="py-2.5 px-3 font-semibold">Type</th>
                    <th className="py-2.5 px-3 font-semibold">SKU & Item</th>
                    <th className="py-2.5 px-3 font-semibold">Branch</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Quantity</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Stock Impact</th>
                    <th className="py-2.5 px-3 font-semibold">Ref / Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {filtered.map((m) => {
                    const isInward = m.movementType === 'INWARD' || m.movementType === 'ADJUSTMENT_ADD';
                    return (
                      <tr key={m.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 font-mono font-semibold text-gray-300">
                          {m.movementNumber}
                        </td>
                        <td className="py-3 px-3 text-gray-400 whitespace-nowrap">
                          {m.movementDate}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isInward
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {isInward ? (
                              <ArrowDownRight className="w-3 h-3" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            {m.movementType}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-[#B5F823] font-bold block">{m.sku}</span>
                          <span className="text-gray-300 text-[11px] block truncate max-w-[200px]">
                            {m.hardwareName}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-gray-300">
                            {m.warehouse}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          <span className={isInward ? 'text-emerald-400' : 'text-amber-400'}>
                            {isInward ? `+${m.quantity}` : `-${m.quantity}`} {m.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-gray-400">
                          <span className="text-gray-500">{m.stockBefore}</span>
                          <span className="mx-1 text-gray-600">→</span>
                          <span className="text-white font-semibold">{m.stockAfter}</span>
                        </td>
                        <td className="py-3 px-3 text-gray-300">
                          {m.supplierInvoiceNo && (
                            <div className="font-mono text-[11px]">Inv: {m.supplierInvoiceNo}</div>
                          )}
                          {m.issueReference && (
                            <div className="text-[11px] text-gray-300">Ref: {m.issueReference}</div>
                          )}
                          {m.issuedToPerson && (
                            <div className="text-[10px] text-gray-500">To: {m.issuedToPerson}</div>
                          )}
                          {m.notes && <div className="text-[10px] text-gray-500 truncate max-w-[150px]">{m.notes}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0d0b21] flex justify-between items-center text-xs text-gray-400">
          <span>Showing {filtered.length} movement log entries</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
