import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, Layers, AlertCircle, CheckCircle2, User, FileText } from 'lucide-react';
import { boardInventoryApi } from '../../api/boardInventoryApi';
import type { BoardInventoryItem } from '../../types/admin';

interface StockIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialBoardId?: string;
  boards: BoardInventoryItem[];
}

export default function StockIssueModal({
  isOpen,
  onClose,
  onSuccess,
  initialBoardId,
  boards,
}: StockIssueModalProps) {
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [issueReference, setIssueReference] = useState('');
  const [issuedToPerson, setIssuedToPerson] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialBoardId) {
      setSelectedBoardId(initialBoardId);
    } else if (boards.length > 0 && !selectedBoardId) {
      setSelectedBoardId(boards[0].id);
    }
  }, [initialBoardId, boards]);

  if (!isOpen) return null;

  const currentBoard = boards.find((b) => b.id === selectedBoardId);
  const availableStock = currentBoard ? Number(currentBoard.currentStock) : 0;
  const reorderLevel = currentBoard ? Number(currentBoard.reorderLevel) : 0;
  const remainingStock = quantity !== '' ? availableStock - Number(quantity) : availableStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoardId) {
      setError('Please select a board SKU to issue.');
      return;
    }
    const qtyNum = Number(quantity);
    if (!qtyNum || qtyNum <= 0) {
      setError('Issue quantity must be at least 1 sheet.');
      return;
    }
    if (qtyNum > availableStock) {
      setError(`Cannot issue ${qtyNum} sheets. Only ${availableStock} sheets currently available in stock.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await boardInventoryApi.issue({
        inventoryItemId: selectedBoardId,
        quantity: qtyNum,
        issueReference: issueReference.trim() || undefined,
        issuedToPerson: issuedToPerson.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to record stock issue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#09071a] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden my-8">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />

        {/* Title Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Manual Stock Issue</h2>
              <p className="text-xs text-gray-400">Issue board sheets for factory fabrication, sampling, or scrap</p>
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
          {/* Board SKU Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" /> Select Board SKU / Design No *
            </label>
            <select
              value={selectedBoardId}
              onChange={(e) => setSelectedBoardId(e.target.value)}
              required
              className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition min-h-[44px]"
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.designNo} {b.designName ? `(${b.designName})` : ''} — {b.thickness} | {b.size} | {b.vendorName} [Stock: {b.currentStock}]
                </option>
              ))}
            </select>
          </div>

          {/* Live SKU Status & Stock Impact Card */}
          {currentBoard && (
            <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-2">
              <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                <span className="text-gray-400">
                  Supplier: <strong className="text-white">{currentBoard.vendorName}</strong>
                </span>
                <span className="text-gray-400">
                  Available Stock: <strong className="text-emerald-400 font-bold">{availableStock} sheets</strong>
                </span>
                <span className="text-gray-400">
                  Reorder Level: <strong className="text-amber-400">{reorderLevel} sheets</strong>
                </span>
              </div>

              {quantity !== '' && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Stock After Issue:</span>
                  <span
                    className={`font-bold ${
                      remainingStock < 0
                        ? 'text-red-400'
                        : remainingStock <= reorderLevel
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {remainingStock} sheets remaining
                    {remainingStock <= reorderLevel && remainingStock >= 0 && ' (Low Stock Alert)'}
                    {remainingStock < 0 && ' (Insufficient Stock!)'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Quantity & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                Quantity to Issue (Sheets) *
              </label>
              <input
                type="number"
                min="1"
                max={availableStock}
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={`Max ${availableStock}`}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 transition min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" /> Work Order / Purpose Ref *
              </label>
              <input
                type="text"
                required
                value={issueReference}
                onChange={(e) => setIssueReference(e.target.value)}
                placeholder="e.g. WO-902 Cubicle Divider Panels"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 transition min-h-[44px]"
              />
            </div>
          </div>

          {/* Issued To Person & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" /> Issued To (Operator / Lead)
              </label>
              <input
                type="text"
                value={issuedToPerson}
                onChange={(e) => setIssuedToPerson(e.target.value)}
                placeholder="e.g. Ramesh Kumar (Fabrication)"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 transition min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Remarks / Cutting Plan Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Cutting 5 doors + 4 mid panels"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 transition min-h-[44px]"
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
              disabled={isSubmitting || (typeof quantity === 'number' && quantity > availableStock)}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-lg shadow-amber-500/20 transition flex items-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Issuing...' : 'Confirm Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
