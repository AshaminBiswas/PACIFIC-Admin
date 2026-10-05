import React, { useState, useEffect } from 'react';
import { X, Plus, Building2, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { boardInventoryApi, isActionTesaVendor } from '../../api/boardInventoryApi';

import type { BoardSupplier } from '../../types/admin';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  suppliers: BoardSupplier[];
}

const COMMON_SIZES = [
  '1220x2440mm (4x8ft)',
  '1830x3660mm (6x12ft)',
  '1525x3660mm (5x12ft)',
  '1220x1830mm (4x6ft)',
  '1525x1830mm (5x6ft)',
];

const COMMON_THICKNESSES = ['12mm', '18mm', '13mm', '9mm', '6mm', '25mm'];

const BOARD_TYPES = [
  'Compact HPL (Phenolic)',
  'Boilo / HDHMR',
  'HDF Board',
  'Compact Merino',
  'Compact Laminate',
  'Moisture Resistant Board',
];

export default function CreateBoardModal({
  isOpen,
  onClose,
  onSuccess,
  suppliers: propSuppliers,
}: CreateBoardModalProps) {
  const suppliers =
    propSuppliers && propSuppliers.length > 0
      ? propSuppliers
      : boardInventoryApi.getCachedSuppliersSync() || [];
  const [vendorId, setVendorId] = useState('');
  const [designNo, setDesignNo] = useState('');
  const [designName, setDesignName] = useState('');
  const [size, setSize] = useState('1220x2440mm (4x8ft)');
  const [customSize, setCustomSize] = useState('');
  const [thickness, setThickness] = useState('12mm');
  const [customThickness, setCustomThickness] = useState('');
  const [boardType, setBoardType] = useState('Compact HPL (Phenolic)');
  const [openingStock, setOpeningStock] = useState<string | number>(0);
  const [reorderLevel, setReorderLevel] = useState<string | number>(10);
  const [unitCost, setUnitCost] = useState<string | number>('');
  const [locationRack, setLocationRack] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedVendor = suppliers.find((s) => s.id === vendorId);

  // Helper to handle vendor change with auto-default HDF for Balaji Action Tesa
  const handleVendorChange = (newVendorId: string) => {
    setVendorId(newVendorId);
    const targetSup = suppliers.find((s) => s.id === newVendorId);
    if (isActionTesaVendor(targetSup)) {
      setBoardType('HDF Board');
    } else if (boardType === 'HDF Board') {
      setBoardType('Compact HPL (Phenolic)');
    }
  };

  // Auto-default boardType to HDF Board if the active supplier is Balaji Action Tesa
  useEffect(() => {
    if (vendorId && suppliers.length > 0) {
      const targetSup = suppliers.find((s) => s.id === vendorId);
      if (isActionTesaVendor(targetSup) && boardType === 'Compact HPL (Phenolic)') {
        setBoardType('HDF Board');
      }
    }
  }, [vendorId, suppliers]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      setError('Please select a supplier from Vendor & Supplier Master.');
      return;
    }
    if (!designNo.trim()) {
      setError('Design number is required.');
      return;
    }

    const finalSize = size === 'OTHER' ? customSize.trim() : size;
    const finalThickness = thickness === 'OTHER' ? customThickness.trim() : thickness;

    if (!finalSize) {
      setError('Please specify the board dimensions/size.');
      return;
    }
    if (!finalThickness) {
      setError('Please specify the board thickness.');
      return;
    }

    const selectedVendor = suppliers.find((s) => s.id === vendorId);

    try {
      setIsSubmitting(true);
      setError(null);
      await boardInventoryApi.create({
        vendorId,
        vendorName: selectedVendor?.name,
        designNo: designNo.trim(),
        designName: designName.trim() || undefined,
        size: finalSize,
        thickness: finalThickness,
        boardType,
        openingStock: openingStock !== '' ? Number(openingStock) : 0,
        reorderLevel: reorderLevel !== '' ? Number(reorderLevel) : 10,
        unitCost: unitCost !== '' ? Number(unitCost) : undefined,
        locationRack: locationRack.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create board SKU');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#09071a] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden my-8">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#7FB706] to-sky-400" />

        {/* Title Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Add New Board SKU</h2>
              <p className="text-xs text-gray-400">Register compact board or panel raw material catalog</p>
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#7FB706]" /> Supplier / Manufacturer * (Vendor Master)
              </label>
              <a
                href="/admin/dashboard/vendors"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#7FB706] hover:underline"
              >
                Vendor Master ↗
              </a>
            </div>
            <select
              value={vendorId}
              onChange={(e) => handleVendorChange(e.target.value)}
              required
              className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
            >
              <option value="">-- Select Supplier from Vendor Master ({suppliers.length} Available) --</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name} {sup.legalName && sup.legalName !== sup.name ? `(${sup.legalName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Design No & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Design / Shade No *
              </label>
              <input
                type="text"
                required
                value={designNo}
                onChange={(e) => setDesignNo(e.target.value)}
                placeholder="e.g. 21091, 1120 SD, RC-101"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Design / Finish Name
              </label>
              <input
                type="text"
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                placeholder="e.g. Frosty White, Slate Grey"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
              />
            </div>
          </div>

          {/* Board Type */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#7FB706]" /> Board Type *
              </label>
              {isActionTesaVendor(selectedVendor) && (boardType === 'HDF Board' || boardType === 'Boilo / HDHMR') && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium inline-flex items-center gap-1">
                  ⚡ Auto-defaulted to HDF for Balaji Action Tesa
                </span>
              )}
            </div>
            <select
              value={boardType}
              onChange={(e) => setBoardType(e.target.value)}
              className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
            >
              {BOARD_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ))}
            </select>
          </div>

          {/* Size & Thickness */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Sheet Size *</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
              >
                {COMMON_SIZES.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
                <option value="OTHER">Custom Size...</option>
              </select>
              {size === 'OTHER' && (
                <input
                  type="text"
                  placeholder="Specify dimensions (e.g. 1525x3050mm)"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  className="mt-2 w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706]"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Thickness *</label>
              <select
                value={thickness}
                onChange={(e) => setThickness(e.target.value)}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
              >
                {COMMON_THICKNESSES.map((th) => (
                  <option key={th} value={th}>
                    {th}
                  </option>
                ))}
                <option value="OTHER">Custom Thickness...</option>
              </select>
              {thickness === 'OTHER' && (
                <input
                  type="text"
                  placeholder="e.g. 10mm"
                  value={customThickness}
                  onChange={(e) => setCustomThickness(e.target.value)}
                  className="mt-2 w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706]"
                />
              )}
            </div>
          </div>

          {/* Opening Stock, Reorder Level, Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Opening Stock (Sheets)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={openingStock}
                onChange={(e) => setOpeningStock(e.target.value)}
                placeholder="e.g. 4.5"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Reorder Level (Alert)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
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
                placeholder="4200.00"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>
          </div>

          {/* Rack Location & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Warehouse Rack / Location
              </label>
              <input
                type="text"
                value={locationRack}
                onChange={(e) => setLocationRack(e.target.value)}
                placeholder="e.g. Rack A-01, Bay 2"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Remarks</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special specifications or grade"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
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
              {isSubmitting ? 'Creating...' : 'Save Board SKU'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
