import React, { useState, useEffect } from 'react';
import { X, Edit2, Building2, Layers, AlertCircle, Save, MapPin } from 'lucide-react';
import { boardInventoryApi } from '../../api/boardInventoryApi';
import type { BoardInventoryItem, BoardSupplier } from '../../types/admin';

interface EditBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  boardItem: BoardInventoryItem | null;
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

export default function EditBoardModal({
  isOpen,
  onClose,
  onSuccess,
  boardItem,
  suppliers,
}: EditBoardModalProps) {
  const [vendorId, setVendorId] = useState('');
  const [warehouse, setWarehouse] = useState<'DELHI' | 'KOLKATA'>('DELHI');
  const [designNo, setDesignNo] = useState('');
  const [designName, setDesignName] = useState('');
  const [size, setSize] = useState('1220x2440mm (4x8ft)');
  const [thickness, setThickness] = useState('12mm');
  const [boardType, setBoardType] = useState('Compact HPL (Phenolic)');
  const [openingStock, setOpeningStock] = useState<string | number>(0);
  const [currentStock, setCurrentStock] = useState<string | number>(0);
  const [reorderLevel, setReorderLevel] = useState<string | number>(10);
  const [unitCost, setUnitCost] = useState<string | number>('');
  const [locationRack, setLocationRack] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (boardItem) {
      setVendorId(boardItem.vendorId || '');
      setWarehouse((boardItem.warehouse?.toUpperCase() === 'KOLKATA' ? 'KOLKATA' : 'DELHI'));
      setDesignNo(boardItem.designNo || '');
      setDesignName(boardItem.designName || '');
      setSize(boardItem.size || '1220x2440mm (4x8ft)');
      setThickness(boardItem.thickness || '12mm');
      setBoardType(boardItem.boardType || 'Compact HPL (Phenolic)');
      setOpeningStock(boardItem.openingStock !== undefined ? boardItem.openingStock : 0);
      setCurrentStock(boardItem.currentStock !== undefined ? boardItem.currentStock : 0);
      setReorderLevel(boardItem.reorderLevel !== undefined ? boardItem.reorderLevel : 10);
      setUnitCost(boardItem.unitCost !== null && boardItem.unitCost !== undefined ? boardItem.unitCost : '');
      setLocationRack(boardItem.locationRack || '');
      setNotes(boardItem.notes || '');
      setError(null);
    }
  }, [boardItem, isOpen]);

  if (!isOpen || !boardItem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designNo.trim()) {
      setError('Design number is required.');
      return;
    }
    if (!size.trim()) {
      setError('Please specify dimensions/size.');
      return;
    }
    if (!thickness.trim()) {
      setError('Please specify thickness.');
      return;
    }

    const selectedVendor = suppliers.find((s) => s.id === vendorId);

    try {
      setIsSubmitting(true);
      setError(null);
      await boardInventoryApi.update(boardItem.id, {
        vendorId: vendorId || undefined,
        vendorName: selectedVendor?.name || boardItem.vendorName || undefined,
        warehouse,
        designNo: designNo.trim(),
        designName: designName.trim() || undefined,
        size: size.trim(),
        thickness: thickness.trim(),
        boardType: boardType.trim(),
        openingStock: openingStock !== '' ? Number(openingStock) : 0,
        currentStock: currentStock !== '' ? Number(currentStock) : undefined,
        reorderLevel: reorderLevel !== '' ? Number(reorderLevel) : 10,
        unitCost: unitCost !== '' ? Number(unitCost) : undefined,
        locationRack: locationRack.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update board SKU');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#09071a] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden my-8">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-[#7FB706] to-sky-400" />

        {/* Title Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Edit Board SKU</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-gray-300">
                  {boardItem.itemCode || boardItem.designNo}
                </span>
              </div>
              <p className="text-xs text-gray-400">Update specifications, warehouse depot & stock balances</p>
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
          {/* Warehouse Facility */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#7FB706]" /> Destination Warehouse Facility
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWarehouse('DELHI')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  warehouse === 'DELHI'
                    ? 'bg-[#7FB706]/20 border-[#7FB706] text-white shadow-sm'
                    : 'bg-[#121029] border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                🏢 Delhi Depot (Mandoli)
              </button>
              <button
                type="button"
                onClick={() => setWarehouse('KOLKATA')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  warehouse === 'KOLKATA'
                    ? 'bg-sky-500/20 border-sky-400 text-white shadow-sm'
                    : 'bg-[#121029] border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                🏭 Kolkata Depot (Eastern Hub)
              </button>
            </div>
          </div>

          {/* Supplier Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#7FB706]" /> Supplier / Manufacturer (Vendor Master)
            </label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
            >
              <option value="">-- Keep Current Supplier ({boardItem.vendorName || 'Default'}) --</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name} ({sup.totalSkus} SKUs in catalog)
                </option>
              ))}
            </select>
          </div>

          {/* Design No & Finish Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Design / Shade No *
              </label>
              <input
                type="text"
                required
                value={designNo}
                onChange={(e) => setDesignNo(e.target.value)}
                placeholder="e.g. 21091"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] font-mono font-bold min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Design Name / Texture Finish
              </label>
              <input
                type="text"
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                placeholder="e.g. Suede Finish / Frosty White"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>
          </div>

          {/* Size & Thickness */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Board Dimensions / Size *
              </label>
              <input
                type="text"
                required
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. 1220x2440mm (4x8ft)"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {COMMON_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSize(sz)}
                    className="text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition"
                  >
                    {sz.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Board Thickness *
              </label>
              <input
                type="text"
                required
                value={thickness}
                onChange={(e) => setThickness(e.target.value)}
                placeholder="e.g. 12mm"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {COMMON_THICKNESSES.map((th) => (
                  <button
                    key={th}
                    type="button"
                    onClick={() => setThickness(th)}
                    className="text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition"
                  >
                    {th}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Board Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#7FB706]" /> Board Material / Substrate Type
            </label>
            <input
              type="text"
              required
              value={boardType}
              onChange={(e) => setBoardType(e.target.value)}
              placeholder="e.g. Compact HPL (Phenolic)"
              className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {BOARD_TYPES.map((bt) => (
                <button
                  key={bt}
                  type="button"
                  onClick={() => setBoardType(bt)}
                  className="text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition"
                >
                  {bt}
                </button>
              ))}
            </div>
          </div>

          {/* Stock Quantities & Accounting (Fraction Support: 4.5) */}
          <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>📊</span> Stock Quantities & Decimal Fractions
              </span>
              <span className="text-[10px] text-[#7FB706] font-mono">
                Supports decimal numbers (e.g. 4.5 sheets)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Opening Stock (Sheets) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={openingStock}
                  onChange={(e) => setOpeningStock(e.target.value)}
                  placeholder="e.g. 4.5"
                  className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Initial warehouse stock
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Current Stock (Sheets) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  placeholder="e.g. 4.5"
                  className="w-full bg-[#121029] border border-emerald-500/30 rounded-xl px-3 py-2.5 text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-400 min-h-[44px]"
                />
                <span className="text-[10px] text-emerald-400/80 mt-0.5 block">
                  Live physical count
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Reorder Alert Level *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                />
                <span className="text-[10px] text-amber-400/80 mt-0.5 block">
                  Low stock notification
                </span>
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
                  className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Purchase cost per sheet
                </span>
              </div>
            </div>
          </div>

          {/* Location Rack & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Warehouse Rack / Bay Location
              </label>
              <input
                type="text"
                value={locationRack}
                onChange={(e) => setLocationRack(e.target.value)}
                placeholder="e.g. Rack B-04 / Mandoli Bay 2"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Notes / Special Specifications
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Special fire-rated core, batch 2026"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold shadow-lg shadow-[#7FB706]/20 transition flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
