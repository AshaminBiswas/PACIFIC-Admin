import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Building2,
  Layers,
  AlertCircle,
  CheckCircle2,
  Trash2,
  MapPin,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { boardInventoryApi, isActionTesaVendor } from '../../api/boardInventoryApi';
import type { BoardSupplier, CreateBoardItemInput } from '../../types/admin';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  suppliers: BoardSupplier[];
}

interface BulkBoardRow {
  id: string;
  designNo: string;
  designName: string;
  size: string;
  thickness: string;
  boardType: string;
  openingStock: string | number;
  reorderLevel: string | number;
  unitCost: string | number;
  locationRack: string;
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

  // Tab mode: 'single' vs 'bulk'
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  // Single Form State
  const [warehouse, setWarehouse] = useState<'DELHI' | 'KOLKATA'>('DELHI');
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

  // Bulk Mode Defaults & Rows
  const [bulkWarehouse, setBulkWarehouse] = useState<'DELHI' | 'KOLKATA'>('DELHI');
  const [bulkVendorId, setBulkVendorId] = useState('');
  const [bulkDefaultSize, setBulkDefaultSize] = useState('1220x2440mm (4x8ft)');
  const [bulkDefaultThickness, setBulkDefaultThickness] = useState('12mm');
  const [bulkDefaultBoardType, setBulkDefaultBoardType] = useState('Compact HPL (Phenolic)');

  const [bulkRows, setBulkRows] = useState<BulkBoardRow[]>([
    {
      id: 'bulk-row-1',
      designNo: '',
      designName: '',
      size: '1220x2440mm (4x8ft)',
      thickness: '12mm',
      boardType: 'Compact HPL (Phenolic)',
      openingStock: 0,
      reorderLevel: 10,
      unitCost: '',
      locationRack: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedVendor = suppliers.find((s) => s.id === vendorId);
  const selectedBulkVendor = suppliers.find((s) => s.id === bulkVendorId);

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

  const handleBulkVendorChange = (newVendorId: string) => {
    setBulkVendorId(newVendorId);
    const targetSup = suppliers.find((s) => s.id === newVendorId);
    const newBoardType = isActionTesaVendor(targetSup) ? 'HDF Board' : 'Compact HPL (Phenolic)';
    setBulkDefaultBoardType(newBoardType);
    setBulkRows((prev) =>
      prev.map((r) => ({
        ...r,
        boardType: r.boardType === 'HDF Board' || r.boardType === 'Compact HPL (Phenolic)' ? newBoardType : r.boardType,
      }))
    );
  };

  // Auto-default boardType to HDF Board if Balaji Action Tesa is selected
  useEffect(() => {
    if (vendorId && suppliers.length > 0) {
      const targetSup = suppliers.find((s) => s.id === vendorId);
      if (isActionTesaVendor(targetSup) && boardType === 'Compact HPL (Phenolic)') {
        setBoardType('HDF Board');
      }
    }
  }, [vendorId, suppliers]);

  if (!isOpen) return null;

  // Bulk Rows Manipulations
  const handleAddBulkRow = () => {
    setBulkRows((prev) => [
      ...prev,
      {
        id: `bulk-row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        designNo: '',
        designName: '',
        size: bulkDefaultSize,
        thickness: bulkDefaultThickness,
        boardType: bulkDefaultBoardType,
        openingStock: 0,
        reorderLevel: 10,
        unitCost: '',
        locationRack: '',
      },
    ]);
  };

  const handleAddBulkMultiple = (count: number) => {
    const newRows: BulkBoardRow[] = [];
    for (let i = 0; i < count; i++) {
      newRows.push({
        id: `bulk-row-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        designNo: '',
        designName: '',
        size: bulkDefaultSize,
        thickness: bulkDefaultThickness,
        boardType: bulkDefaultBoardType,
        openingStock: 0,
        reorderLevel: 10,
        unitCost: '',
        locationRack: '',
      });
    }
    setBulkRows((prev) => [...prev, ...newRows]);
  };

  const handleRemoveBulkRow = (rowId: string) => {
    if (bulkRows.length <= 1) {
      setBulkRows([
        {
          id: `bulk-row-${Date.now()}`,
          designNo: '',
          designName: '',
          size: bulkDefaultSize,
          thickness: bulkDefaultThickness,
          boardType: bulkDefaultBoardType,
          openingStock: 0,
          reorderLevel: 10,
          unitCost: '',
          locationRack: '',
        },
      ]);
      return;
    }
    setBulkRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleBulkRowChange = (
    rowId: string,
    field: keyof BulkBoardRow,
    value: any
  ) => {
    setBulkRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r))
    );
  };

  // Submit Single Form
  const handleSubmitSingle = async (e: React.FormEvent) => {
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

    try {
      setIsSubmitting(true);
      setError(null);
      await boardInventoryApi.create({
        warehouse,
        category: 'RESTROOM_CUBICLE',
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

  // Submit Bulk Form
  const handleSubmitBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!bulkVendorId) {
      setError('Please select a supplier for bulk board creation.');
      return;
    }

    if (bulkRows.length === 0) {
      setError('Please add at least one board SKU.');
      return;
    }

    // Validate rows
    for (let i = 0; i < bulkRows.length; i++) {
      const r = bulkRows[i];
      if (!r.designNo.trim()) {
        setError(`Row ${i + 1}: Design / Shade No is required.`);
        return;
      }
      if (!r.size.trim()) {
        setError(`Row ${i + 1}: Sheet size is required.`);
        return;
      }
      if (!r.thickness.trim()) {
        setError(`Row ${i + 1}: Thickness is required.`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const items: CreateBoardItemInput[] = bulkRows.map((r) => ({
        warehouse: bulkWarehouse,
        category: 'RESTROOM_CUBICLE',
        vendorId: bulkVendorId,
        vendorName: selectedBulkVendor?.name,
        designNo: r.designNo.trim(),
        designName: r.designName.trim() || undefined,
        size: r.size.trim(),
        thickness: r.thickness.trim(),
        boardType: r.boardType.trim(),
        openingStock: r.openingStock !== '' ? Number(r.openingStock) : 0,
        reorderLevel: r.reorderLevel !== '' ? Number(r.reorderLevel) : 10,
        unitCost: r.unitCost !== '' ? Number(r.unitCost) : undefined,
        locationRack: r.locationRack.trim() || undefined,
      }));

      await boardInventoryApi.createBulk(items);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to bulk create board SKUs');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div
        className={`relative w-full ${
          mode === 'bulk' ? 'max-w-5xl' : 'max-w-xl'
        } bg-[#09071a] border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden my-4 sm:my-8 max-h-[92vh] flex flex-col transition-all duration-300`}
      >
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#7FB706] to-sky-400" />

        {/* Title Bar & Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-white/10 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                {mode === 'single' ? 'Add New Board SKU' : 'Bulk Create Board SKUs'}
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-400">
                Register compact board or panel raw material catalog
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="bg-[#121029] p-1 rounded-xl border border-white/10 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  mode === 'single'
                    ? 'bg-[#7FB706] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Single SKU
              </button>
              <button
                type="button"
                onClick={() => setMode('bulk')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  mode === 'bulk'
                    ? 'bg-[#7FB706] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3 text-[#B5F823]" />
                Bulk Add
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-xs text-red-400 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ─── SINGLE SKU FORM ─── */}
        {mode === 'single' ? (
          <form onSubmit={handleSubmitSingle} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Warehouse Depot */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#7FB706]" /> Warehouse Depot *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWarehouse('DELHI')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    warehouse === 'DELHI'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'
                  }`}
                >
                  Delhi Depot (Central)
                </button>
                <button
                  type="button"
                  onClick={() => setWarehouse('KOLKATA')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    warehouse === 'KOLKATA'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'
                  }`}
                >
                  Kolkata Depot (East)
                </button>
              </div>
            </div>

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
            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
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
                className="px-6 py-2.5 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-sm font-bold shadow-lg shadow-[#7FB706]/20 transition flex items-center gap-2 min-h-[44px] disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Save Board SKU
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* ─── BULK ADD BOARDS FORM ─── */
          <form onSubmit={handleSubmitBulk} className="mt-4 flex flex-col flex-1 overflow-hidden space-y-4">
            <div className="overflow-y-auto pr-1 space-y-4 flex-1">
              {/* Bulk Header Defaults */}
              <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
                <div className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#7FB706]" />
                  <span>Batch Parameters (Applied to Added Rows)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                      Warehouse Depot *
                    </label>
                    <select
                      value={bulkWarehouse}
                      onChange={(e) => setBulkWarehouse(e.target.value as any)}
                      className="w-full bg-[#121029] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[38px]"
                    >
                      <option value="DELHI">Delhi Depot (Central)</option>
                      <option value="KOLKATA">Kolkata Depot (East)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                      Supplier *
                    </label>
                    <select
                      required
                      value={bulkVendorId}
                      onChange={(e) => handleBulkVendorChange(e.target.value)}
                      className="w-full bg-[#121029] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[38px]"
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                      Default Sheet Size
                    </label>
                    <select
                      value={bulkDefaultSize}
                      onChange={(e) => {
                        setBulkDefaultSize(e.target.value);
                        setBulkRows((prev) => prev.map((r) => ({ ...r, size: e.target.value })));
                      }}
                      className="w-full bg-[#121029] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[38px]"
                    >
                      {COMMON_SIZES.map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                      Default Thickness
                    </label>
                    <select
                      value={bulkDefaultThickness}
                      onChange={(e) => {
                        setBulkDefaultThickness(e.target.value);
                        setBulkRows((prev) => prev.map((r) => ({ ...r, thickness: e.target.value })));
                      }}
                      className="w-full bg-[#121029] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[38px]"
                    >
                      {COMMON_THICKNESSES.map((th) => (
                        <option key={th} value={th}>
                          {th}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                      Default Board Type
                    </label>
                    <select
                      value={bulkDefaultBoardType}
                      onChange={(e) => {
                        setBulkDefaultBoardType(e.target.value);
                        setBulkRows((prev) => prev.map((r) => ({ ...r, boardType: e.target.value })));
                      }}
                      className="w-full bg-[#121029] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[38px]"
                    >
                      {BOARD_TYPES.map((bt) => (
                        <option key={bt} value={bt}>
                          {bt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Rows List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#7FB706]" />
                    <span>Board Master Records ({bulkRows.length} {bulkRows.length === 1 ? 'row' : 'rows'})</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddBulkRow}
                      className="px-3 py-1.5 rounded-xl bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/30 text-xs font-bold transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Add Row
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBulkMultiple(5)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-semibold transition"
                    >
                      +5 Rows
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBulkMultiple(10)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-semibold transition"
                    >
                      +10 Rows
                    </button>
                  </div>
                </div>

                <div className="border border-white/10 rounded-xl overflow-x-auto bg-[#0c0a20]">
                  <table className="w-full text-left text-xs min-w-[760px]">
                    <thead className="bg-[#121029] text-gray-400 uppercase font-semibold text-[10px] border-b border-white/10">
                      <tr>
                        <th className="py-2.5 px-3 w-10">#</th>
                        <th className="py-2.5 px-3 min-w-[150px]">Design / Shade No *</th>
                        <th className="py-2.5 px-3 min-w-[160px]">Finish / Name</th>
                        <th className="py-2.5 px-3 w-28">Opening (Sheets)</th>
                        <th className="py-2.5 px-3 w-28">Unit Cost (₹)</th>
                        <th className="py-2.5 px-3 w-28">Rack Location</th>
                        <th className="py-2.5 px-3 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {bulkRows.map((r, idx) => (
                        <tr key={r.id} className="hover:bg-white/[0.02] transition">
                          <td className="py-2 px-3 font-mono text-gray-400 text-center font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              required
                              value={r.designNo}
                              onChange={(e) => handleBulkRowChange(r.id, 'designNo', e.target.value)}
                              placeholder="e.g. 21091"
                              className="w-full bg-[#161435] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={r.designName}
                              onChange={(e) => handleBulkRowChange(r.id, 'designName', e.target.value)}
                              placeholder="e.g. Frosty White"
                              className="w-full bg-[#161435] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={r.openingStock}
                              onChange={(e) => handleBulkRowChange(r.id, 'openingStock', e.target.value)}
                              placeholder="0"
                              className="w-full bg-[#161435] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#7FB706]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={r.unitCost}
                              onChange={(e) => handleBulkRowChange(r.id, 'unitCost', e.target.value)}
                              placeholder="4200"
                              className="w-full bg-[#161435] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={r.locationRack}
                              onChange={(e) => handleBulkRowChange(r.id, 'locationRack', e.target.value)}
                              placeholder="Rack A-01"
                              className="w-full bg-[#161435] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveBulkRow(r.id)}
                              className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-lg transition"
                              title="Remove row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Bulk Form Actions */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-gray-400">
                Ready to create <strong className="text-white">{bulkRows.length}</strong> new board SKUs in {bulkWarehouse} Depot
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || bulkRows.length === 0}
                  className="px-5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold shadow-lg shadow-[#7FB706]/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Creating {bulkRows.length} SKUs...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Create {bulkRows.length} Board SKUs
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
