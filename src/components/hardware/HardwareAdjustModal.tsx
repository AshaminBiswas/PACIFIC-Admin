import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';
import { hardwareInventoryApi } from '../../api/hardwareInventoryApi';
import type { HardwareInventoryItem, HardwareAdjustInput } from '../../types/admin';

interface HardwareAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: HardwareInventoryItem | null;
}

export default function HardwareAdjustModal({
  isOpen,
  onClose,
  onSuccess,
  item,
}: HardwareAdjustModalProps) {
  const [adjustType, setAdjustType] = useState<'ADD' | 'SUB'>('ADD');
  const [adjustedQuantity, setAdjustedQuantity] = useState<string | number>('');
  const [reason, setReason] = useState<string>('PHYSICAL_AUDIT');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setAdjustedQuantity('');
      setNotes('');
      setAdjustType('ADD');
      setReason('PHYSICAL_AUDIT');
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const currentStock = Number(item.currentStock) || 0;
  const qty = Number(adjustedQuantity) || 0;
  const stockAfter =
    adjustType === 'ADD' ? currentStock + qty : Math.max(0, currentStock - qty);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (qty <= 0) {
      setError('Adjustment quantity must be greater than zero.');
      return;
    }
    if (adjustType === 'SUB' && qty > currentStock) {
      setError(`Cannot deduct ${qty} from available stock (${currentStock} ${item.unit}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: HardwareAdjustInput = {
        hardwareItemId: item.id,
        adjustedQuantity: qty,
        type: adjustType,
        reason:
          reason === 'PHYSICAL_AUDIT'
            ? 'Physical Audit Reconciliation'
            : reason === 'DAMAGED'
            ? 'Damaged / Quality Rejection'
            : reason === 'SCRAP'
            ? 'Scrapped / Defective'
            : reason === 'RETURN'
            ? 'Return from Site / Surplus'
            : reason,
        notes: notes.trim() || undefined,
      };

      await hardwareInventoryApi.adjust(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#121029] border border-[#7FB706]/30 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#0d0b21]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Stock Adjustment & Reconciliation</h2>
              <p className="text-xs text-gray-400 font-mono">[{item.sku}] {item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Stock Banner */}
          <div className="p-3 bg-[#0d0b21] border border-white/10 rounded-xl flex items-center justify-between text-xs">
            <span className="text-gray-400">Current Warehouse Stock:</span>
            <span className="text-sm font-bold text-white font-mono">
              {currentStock} {item.unit} ({item.warehouse})
            </span>
          </div>

          {/* Adjustment Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
              Adjustment Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdjustType('ADD')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                  adjustType === 'ADD'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-[#0d0b21] border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                Add Stock (+ Stock In)
              </button>

              <button
                type="button"
                onClick={() => setAdjustType('SUB')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                  adjustType === 'SUB'
                    ? 'bg-red-500/20 border-red-500 text-red-400'
                    : 'bg-[#0d0b21] border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <MinusCircle className="w-4 h-4" />
                Deduct Stock (- Stock Out)
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
              Quantity to Adjust ({item.unit}) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              placeholder="e.g. 5"
              value={adjustedQuantity}
              onChange={(e) => setAdjustedQuantity(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-sm font-bold focus:outline-none font-mono"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
              Adjustment Reason <span className="text-red-400">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
            >
              <option value="PHYSICAL_AUDIT">Physical Stock Audit Reconciliation</option>
              <option value="DAMAGED">Damaged in Transit / Storage</option>
              <option value="SCRAP">Scrapped / Quality Defect</option>
              <option value="RETURN">Returned from Site Installation (Surplus)</option>
              <option value="OTHER">Other Management Correction</option>
            </select>
          </div>

          {/* Impact Preview */}
          {qty > 0 && (
            <div className="p-3 bg-[#0d0b21] border border-white/10 rounded-xl flex items-center justify-between text-xs">
              <span className="text-gray-400">Stock Result:</span>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-gray-300">{currentStock}</span>
                <span className={adjustType === 'ADD' ? 'text-emerald-400' : 'text-red-400'}>
                  {adjustType === 'ADD' ? `+${qty}` : `-${qty}`}
                </span>
                <span className="text-white font-bold">→ {stockAfter} {item.unit}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Audit Notes / Explanation</label>
            <input
              type="text"
              placeholder="e.g. Audit counted 14 sets instead of 10 during quarterly physical inventory check"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Apply Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
