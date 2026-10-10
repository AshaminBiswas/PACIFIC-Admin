import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownRight,
  Truck,
  Building2,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { hardwareInventoryApi } from '../../api/hardwareInventoryApi';
import type {
  HardwareInventoryItem,
  HardwareBranch,
  HardwareVendor,
  HardwareInwardInput,
} from '../../types/admin';

interface HardwareInwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedItem?: HardwareInventoryItem | null;
  items: HardwareInventoryItem[];
  branches: HardwareBranch[];
  vendors: HardwareVendor[];
  onOpenVendorModal?: () => void;
}

export default function HardwareInwardModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedItem,
  items,
  branches,
  vendors,
  onOpenVendorModal,
}: HardwareInwardModalProps) {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [warehouse, setWarehouse] = useState<string>('DELHI');
  const [vendorId, setVendorId] = useState<string>('');
  const [quantity, setQuantity] = useState<string | number>('');
  const [unitCost, setUnitCost] = useState<string | number>('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState<string>('');
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [batchLotNo, setBatchLotNo] = useState<string>('');
  const [locationRack, setLocationRack] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set initial item when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (preselectedItem) {
        setSelectedItemId(preselectedItem.id);
        setWarehouse(preselectedItem.warehouse);
        setVendorId(preselectedItem.vendorId || '');
        setUnitCost(preselectedItem.unitCost || '');
        setLocationRack(preselectedItem.locationRack || '');
      } else if (items.length > 0 && !selectedItemId) {
        setSelectedItemId(items[0].id);
        setWarehouse(items[0].warehouse);
        setVendorId(items[0].vendorId || '');
        setUnitCost(items[0].unitCost || '');
      }
    }
  }, [isOpen, preselectedItem, items]);

  const activeItem = items.find((i) => i.id === selectedItemId);

  // Update item defaults on selection change
  const handleItemChange = (itemId: string) => {
    setSelectedItemId(itemId);
    const item = items.find((i) => i.id === itemId);
    if (item) {
      setWarehouse(item.warehouse);
      if (item.vendorId) setVendorId(item.vendorId);
      if (item.unitCost) setUnitCost(item.unitCost);
      if (item.locationRack) setLocationRack(item.locationRack);
    }
  };

  const qtyNum = Number(quantity) || 0;
  const costNum = Number(unitCost) || 0;
  const totalValuation = qtyNum * costNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedItemId) {
      setError('Please select a hardware item to receive.');
      return;
    }
    if (qtyNum <= 0) {
      setError('Inward quantity must be greater than zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedVendor = vendors.find((v) => v.id === vendorId);

      const payload: HardwareInwardInput = {
        hardwareItemId: selectedItemId,
        quantity: qtyNum,
        warehouse,
        vendorId: vendorId || undefined,
        vendorName: selectedVendor ? selectedVendor.name : undefined,
        supplierInvoiceNo: supplierInvoiceNo.trim() || undefined,
        supplierInvoiceDate: supplierInvoiceDate || undefined,
        batchLotNo: batchLotNo.trim() || undefined,
        unitCost: costNum || undefined,
        locationRack: locationRack.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      await hardwareInventoryApi.inward(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record stock inward');
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
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Hardware Stock Inward
              </h2>
              <p className="text-xs text-gray-400">
                Receive hardware shipment from vendor & increase available inventory
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
                  [{i.sku}] {i.name} — {i.color} ({i.material}) [Stock: {i.currentStock} {i.unit}]
                </option>
              ))}
            </select>

            {/* Selected item KPI preview card */}
            {activeItem && (
              <div className="mt-2 p-3 bg-[#0d0b21] border border-white/10 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Current Stock:</span>{' '}
                  <strong className="text-white font-mono">
                    {activeItem.currentStock} {activeItem.unit}
                  </strong>{' '}
                  <span className="text-gray-500">({activeItem.warehouse})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">HSN:</span>{' '}
                  <span className="px-1.5 py-0.5 bg-white/5 text-[#B5F823] font-mono rounded">
                    {activeItem.hsnCode}
                  </span>
                  <span className="text-gray-400">Finish:</span>{' '}
                  <span className="text-gray-200">{activeItem.color}</span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Branch & Vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                Receiving Branch / Warehouse <span className="text-red-400">*</span>
              </label>
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                  Supplier / Vendor
                </label>
                {onOpenVendorModal && (
                  <button
                    type="button"
                    onClick={onOpenVendorModal}
                    className="text-[11px] text-[#B5F823] hover:underline cursor-pointer"
                  >
                    + New Vendor
                  </button>
                )}
              </div>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              >
                <option value="">-- Choose Vendor --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Invoice & Batch */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Invoice / Challan No.</label>
              <input
                type="text"
                placeholder="e.g. INV-2026-904"
                value={supplierInvoiceNo}
                onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Invoice Date</label>
              <input
                type="date"
                value={supplierInvoiceDate}
                onChange={(e) => setSupplierInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Batch / Lot No.</label>
              <input
                type="text"
                placeholder="e.g. LOT-FEB-01"
                value={batchLotNo}
                onChange={(e) => setBatchLotNo(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* 4. Inward Quantity & Unit Cost */}
          <div className="p-4 bg-[#0d0b21] border border-[#7FB706]/20 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  Inward Quantity <span className="text-[#B5F823]">({activeItem?.unit || "No's"})</span>{' '}
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Quantity received"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-sm font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Unit Cost (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="₹ Cost per unit"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-sm font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Bin / Rack Location</label>
                <input
                  type="text"
                  placeholder="e.g. RACK-SS-02"
                  value={locationRack}
                  onChange={(e) => setLocationRack(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Total Valuation Live calculation */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
              <span className="text-gray-400">Total Inward Valuation:</span>
              <span className="text-sm font-bold text-[#B5F823]">
                ₹{totalValuation.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Remarks / Inward Note</label>
            <input
              type="text"
              placeholder="e.g. Received in good condition, QC inspected by store team"
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
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <ArrowDownRight className="w-4 h-4" />
              {isSubmitting ? 'Recording Inward...' : 'Confirm Stock Inward'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
