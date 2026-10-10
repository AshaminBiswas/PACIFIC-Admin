import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowUpRight,
  Building2,
  User,
  FileText,
  AlertCircle,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { hardwareInventoryApi } from '../../api/hardwareInventoryApi';
import type {
  HardwareInventoryItem,
  HardwareBranch,
  HardwareIssueInput,
} from '../../types/admin';

interface HardwareIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedItem?: HardwareInventoryItem | null;
  items: HardwareInventoryItem[];
  branches: HardwareBranch[];
}

export default function HardwareIssueModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedItem,
  items,
  branches,
}: HardwareIssueModalProps) {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [warehouse, setWarehouse] = useState<string>('DELHI');
  const [quantity, setQuantity] = useState<string | number>('');
  const [issueReference, setIssueReference] = useState<string>('');
  const [issuedToPerson, setIssuedToPerson] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (preselectedItem) {
        setSelectedItemId(preselectedItem.id);
        setWarehouse(preselectedItem.warehouse);
      } else if (items.length > 0 && !selectedItemId) {
        setSelectedItemId(items[0].id);
        setWarehouse(items[0].warehouse);
      }
    }
  }, [isOpen, preselectedItem, items]);

  const activeItem = items.find((i) => i.id === selectedItemId);

  const handleItemChange = (itemId: string) => {
    setSelectedItemId(itemId);
    const item = items.find((i) => i.id === itemId);
    if (item) setWarehouse(item.warehouse);
  };

  const qtyNum = Number(quantity) || 0;
  const currentStock = activeItem ? Number(activeItem.currentStock) : 0;
  const stockAfter = Math.max(0, currentStock - qtyNum);
  const isOverStock = qtyNum > currentStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedItemId) {
      setError('Please select a hardware item to issue.');
      return;
    }
    if (qtyNum <= 0) {
      setError('Issue quantity must be greater than zero.');
      return;
    }
    if (isOverStock) {
      setError(
        `Insufficient stock! Requested ${qtyNum} ${activeItem?.unit}, but only ${currentStock} ${activeItem?.unit} available.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: HardwareIssueInput = {
        hardwareItemId: selectedItemId,
        quantity: qtyNum,
        warehouse,
        issueReference: issueReference.trim() || undefined,
        issuedToPerson: issuedToPerson.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      await hardwareInventoryApi.issue(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to issue hardware');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#121029] border border-[#7FB706]/30 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#0d0b21]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Issue Hardware to Project / Assembly
              </h2>
              <p className="text-xs text-gray-400">
                Deduct hardware stock for work orders, cubicle packing, or site dispatch
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Item Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
              Select Hardware Item (SKU) <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => handleItemChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs font-medium focus:outline-none"
            >
              <option value="">-- Choose hardware item --</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  [{i.sku}] {i.name} — {i.color} ({i.warehouse}) [Available: {i.currentStock} {i.unit}]
                </option>
              ))}
            </select>

            {/* Selected item KPI preview card */}
            {activeItem && (
              <div className="mt-2 p-3 bg-[#0d0b21] border border-white/10 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Currently in Stock:</span>{' '}
                  <strong className="text-white font-mono text-sm">
                    {activeItem.currentStock} {activeItem.unit}
                  </strong>{' '}
                  <span className="text-gray-400">at {activeItem.warehouse}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Reorder Level:</span>{' '}
                  <span className="text-amber-400 font-mono">
                    {activeItem.reorderLevel} {activeItem.unit}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Warehouse & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                Issuing Branch / Warehouse <span className="text-red-400">*</span>
              </label>
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                Issue Quantity <span className="text-[#B5F823]">({activeItem?.unit || "No's"})</span>{' '}
                <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                max={currentStock || undefined}
                placeholder="Qty to issue"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`w-full px-3 py-2.5 bg-[#030213] border rounded-xl text-white text-sm font-bold focus:outline-none ${
                  isOverStock ? 'border-red-500 ring-1 ring-red-500' : 'border-white/15 focus:border-[#7FB706]'
                }`}
              />
              {isOverStock && (
                <p className="text-[11px] text-red-400 mt-1">
                  Exceeds current available stock ({currentStock} {activeItem?.unit})
                </p>
              )}
            </div>
          </div>

          {/* Stock Before vs After Visualizer */}
          {activeItem && qtyNum > 0 && !isOverStock && (
            <div className="p-3 bg-[#0d0b21] border border-white/10 rounded-xl flex items-center justify-between text-xs">
              <span className="text-gray-400">Stock Impact:</span>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-gray-300">{currentStock}</span>
                <span className="text-amber-400">→ -{qtyNum} →</span>
                <span className="text-emerald-400 font-bold">{stockAfter} {activeItem.unit}</span>
              </div>
            </div>
          )}

          {/* 3. Reference & Issued To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Work Order / Project / Packing List Ref
              </label>
              <input
                type="text"
                placeholder="e.g. PPS/ORD/26-27/102 or DLF CyberCity Phase 3"
                value={issueReference}
                onChange={(e) => setIssueReference(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Issued To (Operator / Installer / Team)
              </label>
              <input
                type="text"
                placeholder="e.g. Ramesh Kumar (Assembly Team Lead)"
                value={issuedToPerson}
                onChange={(e) => setIssuedToPerson(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Notes / Assembly Remarks</label>
            <input
              type="text"
              placeholder="e.g. Issued 14 sets for Urinal Modesty Panel partition installation"
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
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isOverStock}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <ArrowUpRight className="w-4 h-4" />
              {isSubmitting ? 'Recording Issue...' : 'Confirm Stock Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
