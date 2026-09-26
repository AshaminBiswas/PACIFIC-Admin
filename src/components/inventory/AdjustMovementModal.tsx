import React, { useState, useEffect } from 'react';
import { X, Sliders, AlertCircle, CheckCircle2, History, RotateCcw } from 'lucide-react';
import { boardInventoryApi } from '../../api/boardInventoryApi';
import type { BoardStockMovement } from '../../types/admin';

interface AdjustMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  movement: BoardStockMovement | null;
}

export default function AdjustMovementModal({
  isOpen,
  onClose,
  onSuccess,
  movement,
}: AdjustMovementModalProps) {
  const [newQuantity, setNewQuantity] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (movement) {
      setNewQuantity(Number(movement.quantity));
      setReason('');
      setError(null);
    }
  }, [movement]);

  if (!isOpen || !movement) return null;

  const oldQty = Number(movement.quantity);
  const currentDiff = newQuantity !== '' ? Number(newQuantity) - oldQty : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = Number(newQuantity);
    if (qtyNum < 0) {
      setError('Quantity cannot be negative.');
      return;
    }
    if (qtyNum === oldQty) {
      onClose();
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await boardInventoryApi.adjustMovement(movement.id, {
        newQuantity: qtyNum,
        reason: reason.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to adjust stock movement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#09071a] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden my-8">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-indigo-500" />

        {/* Title Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Adjust Stock Deduction</h2>
              <p className="text-xs text-gray-400">Edit issue quantity & reconcile warehouse balance</p>
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
          {/* Movement Details Header */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-sky-400 font-bold">{movement.movementNumber}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-medium">
                {movement.movementType}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Design SKU: </span>
                <span className="text-white font-semibold">
                  {movement.inventoryItem?.designNo || 'Board SKU'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Thickness / Size: </span>
                <span className="text-white">
                  {movement.inventoryItem?.thickness} | {movement.inventoryItem?.size}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Issue List / Ref: </span>
                <span className="text-white font-mono">
                  {movement.issueListNumber || movement.issueReference || 'Auto Deduct'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Date: </span>
                <span className="text-gray-300">
                  {new Date(movement.movementDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Quantity Comparison & Adjustment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                Current Deducted Qty
              </label>
              <div className="bg-[#121029] border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-gray-300 font-mono">
                {oldQty} sheets
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                New Quantity (Sheets) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-[#121029] border border-sky-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sky-400 transition min-h-[44px]"
              />
            </div>
          </div>

          {/* Stock Balance Impact Explanation */}
          {newQuantity !== '' && currentDiff !== 0 && (
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between font-medium">
                <span className="text-gray-300">Net Inventory Impact:</span>
                <span className={currentDiff > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {currentDiff > 0
                    ? `Deducting ${currentDiff} additional sheet(s) from current stock`
                    : `Restoring ${Math.abs(currentDiff)} sheet(s) back to inventory`}
                </span>
              </div>
            </div>
          )}

          {/* Reason for Adjustment */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Reason for Adjustment *
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Packing list updated, 2 panels returned to warehouse"
              className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-400 transition min-h-[44px]"
            />
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
              disabled={isSubmitting || newQuantity === '' || Number(newQuantity) === oldQty}
              className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold shadow-lg shadow-sky-500/20 transition flex items-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Adjusting...' : 'Save Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
