import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, Building2, Calendar, Hash, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { boardInventoryApi } from '../../api/boardInventoryApi';
import type { BoardInventoryItem, BoardSupplier } from '../../types/admin';

interface StockInwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialBoardId?: string;
  suppliers: BoardSupplier[];
  boards: BoardInventoryItem[];
}

export default function StockInwardModal({
  isOpen,
  onClose,
  onSuccess,
  initialBoardId,
  suppliers,
  boards,
}: StockInwardModalProps) {
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [quantity, setQuantity] = useState<string | number>('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [batchLotNo, setBatchLotNo] = useState('');
  const [unitCost, setUnitCost] = useState<string | number>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialBoardId) {
      setSelectedBoardId(initialBoardId);
      const b = boards.find((item) => item.id === initialBoardId);
      if (b) {
        setSelectedSupplierId(b.vendorId);
        if (b.unitCost) setUnitCost(Number(b.unitCost));
      }
    } else if (boards.length > 0 && !selectedBoardId) {
      setSelectedBoardId(boards[0].id);
      setSelectedSupplierId(boards[0].vendorId);
      if (boards[0].unitCost) setUnitCost(Number(boards[0].unitCost));
    }
  }, [initialBoardId, boards]);

  if (!isOpen) return null;

  const currentBoard = boards.find((b) => b.id === selectedBoardId);

  const filteredBoards = selectedSupplierId
    ? boards.filter((b) => b.vendorId === selectedSupplierId)
    : boards;

  const handleSupplierChange = (supId: string) => {
    setSelectedSupplierId(supId);
    const matchingBoards = boards.filter((b) => b.vendorId === supId);
    if (matchingBoards.length > 0) {
      setSelectedBoardId(matchingBoards[0].id);
      if (matchingBoards[0].unitCost) setUnitCost(Number(matchingBoards[0].unitCost));
    } else {
      setSelectedBoardId('');
    }
  };

  const handleBoardChange = (boardId: string) => {
    setSelectedBoardId(boardId);
    const b = boards.find((item) => item.id === boardId);
    if (b) {
      setSelectedSupplierId(b.vendorId);
      if (b.unitCost) setUnitCost(Number(b.unitCost));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoardId) {
      setError('Please select a board SKU to add stock.');
      return;
    }
    const qtyNum = Number(quantity);
    if (!qtyNum || qtyNum <= 0) {
      setError('Inward quantity must be at least 1 sheet.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await boardInventoryApi.inward({
        inventoryItemId: selectedBoardId,
        quantity: qtyNum,
        supplierInvoiceNo: supplierInvoiceNo.trim() || undefined,
        supplierInvoiceDate: supplierInvoiceDate || undefined,
        batchLotNo: batchLotNo.trim() || undefined,
        unitCost: unitCost !== '' ? Number(unitCost) : undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to record stock inward');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#09071a] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden my-8">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#7FB706] to-[#B5F823]" />

        {/* Title Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Record Stock Inward</h2>
              <p className="text-xs text-gray-400">Receive board shipments into warehouse inventory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Supplier Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#7FB706]" /> Supplier / Manufacturer *
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => handleSupplierChange(e.target.value)}
              className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
            >
              <option value="">-- All 4 Suppliers --</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name} ({sup.totalSkus} SKUs in catalog)
                </option>
              ))}
            </select>
          </div>

          {/* Board SKU Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#7FB706]" /> Select Board SKU / Design No *
            </label>
            <select
              value={selectedBoardId}
              onChange={(e) => handleBoardChange(e.target.value)}
              required
              className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
            >
              {filteredBoards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.designNo} {b.designName ? `(${b.designName})` : ''} — {b.thickness} | {b.size} | {b.vendorName} [Stock: {b.currentStock}]
                </option>
              ))}
            </select>
          </div>

          {/* Live SKU Details Badge */}
          {currentBoard && (
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-wrap items-center justify-between text-xs gap-2">
              <span className="text-gray-400">
                Design: <strong className="text-white">{currentBoard.designNo}</strong>
              </span>
              <span className="text-gray-400">
                Type: <strong className="text-[#B5F823]">{currentBoard.boardType}</strong>
              </span>
              <span className="text-gray-400">
                Current Stock: <strong className="text-emerald-400">{currentBoard.currentStock} sheets</strong>
              </span>
              <span className="text-gray-400">
                Reorder Level: <strong className="text-amber-400">{currentBoard.reorderLevel}</strong>
              </span>
            </div>
          )}

          {/* Quantity & Unit Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-[#7FB706]" /> Inward Quantity (Sheets) *
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 4.5"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Unit Cost (₹ / Sheet)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="e.g. 4200.00"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
              />
            </div>
          </div>

          {/* Supplier Invoice / Challan & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Supplier Invoice / Challan No
              </label>
              <input
                type="text"
                value={supplierInvoiceNo}
                onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                placeholder="e.g. INV-STYL-2026-991"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#7FB706]" /> Invoice / Inward Date *
              </label>
              <input
                type="date"
                required
                value={supplierInvoiceDate}
                onChange={(e) => setSupplierInvoiceDate(e.target.value)}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
              />
            </div>
          </div>

          {/* Batch / Lot & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Batch / Heat / Lot No
              </label>
              <input
                type="text"
                value={batchLotNo}
                onChange={(e) => setBatchLotNo(e.target.value)}
                placeholder="e.g. LOT-26B-04"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Remarks / Storage Rack
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Received at Rack B-02"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold text-gray-300 transition min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-sm font-bold shadow-lg shadow-[#7FB706]/20 transition flex items-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Recording...' : 'Add to Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
