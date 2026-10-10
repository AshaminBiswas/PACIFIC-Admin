import React, { useState, useEffect } from 'react';
import {
  X,
  Wrench,
  Plus,
  Building2,
  Truck,
  Sparkles,
  Layers,
  AlertCircle,
  CheckCircle2,
  Hash,
  Boxes,
  HelpCircle,
} from 'lucide-react';
import {
  hardwareInventoryApi,
  getAllowedColorsForMaterial,
  suggestHardwareSku,
} from '../../api/hardwareInventoryApi';
import type {
  HardwareBranch,
  HardwareVendor,
  CreateHardwareItemInput,
} from '../../types/admin';

interface CreateHardwareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenVendorModal?: () => void;
  onOpenBranchModal?: () => void;
  branches: HardwareBranch[];
  vendors: HardwareVendor[];
}

const MATERIAL_OPTIONS = [
  {
    id: 'STAINLESS_STEEL',
    label: 'Stainless Steel (SS)',
    desc: 'Grade 304 / 316 architectural hardware',
    colors: ['Black', 'Golden', 'Stainless Steel'],
    defaultHsn: '8302',
  },
  {
    id: 'ALUMINIUM',
    label: 'Aluminium',
    desc: 'Extruded alloy 6063-T6 channels & rails',
    colors: ['Black', 'Aluminium colour'],
    defaultHsn: '7610',
  },
  {
    id: 'NYLON',
    label: 'Nylon',
    desc: 'Engineering polyamide antibacterial grade',
    colors: ['Black'],
    defaultHsn: '3926',
  },
  {
    id: 'CUSTOM',
    label: 'Other / Custom Material',
    desc: 'Brass, Zinc alloy, or special composite',
    colors: ['Black', 'Silver', 'Grey'],
    defaultHsn: '8302',
  },
];

const STANDARD_UNITS = ["No's", 'Meters', "Set's"];

export default function CreateHardwareModal({
  isOpen,
  onClose,
  onSuccess,
  onOpenVendorModal,
  onOpenBranchModal,
  branches,
  vendors,
}: CreateHardwareModalProps) {
  // Form fields
  const [material, setMaterial] = useState<string>('STAINLESS_STEEL');
  const [color, setColor] = useState<string>('Stainless Steel');
  const [customColor, setCustomColor] = useState<string>('');
  const [isCustomColorActive, setIsCustomColorActive] = useState<boolean>(false);

  const [sku, setSku] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [unit, setUnit] = useState<string>("No's");
  const [customUnit, setCustomUnit] = useState<string>('');
  const [hsnCode, setHsnCode] = useState<string>('8302');

  const [warehouse, setWarehouse] = useState<string>('DELHI');
  const [vendorId, setVendorId] = useState<string>('');
  const [openingStock, setOpeningStock] = useState<string | number>(0);
  const [reorderLevel, setReorderLevel] = useState<string | number>(20);
  const [unitCost, setUnitCost] = useState<string | number>('');
  const [locationRack, setLocationRack] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When material changes, update allowed colors and default HSN
  useEffect(() => {
    const allowed = getAllowedColorsForMaterial(material);
    if (!allowed.includes(color)) {
      setColor(allowed[0] || 'Black');
    }
    setIsCustomColorActive(false);

    // Auto update HSN default according to material
    const matched = MATERIAL_OPTIONS.find((m) => m.id === material);
    if (matched && matched.defaultHsn) {
      setHsnCode(matched.defaultHsn);
    }
  }, [material]);

  // Set default branch and vendor on open
  useEffect(() => {
    if (isOpen) {
      if (branches.length > 0 && !warehouse) {
        setWarehouse(branches[0].code);
      }
      if (vendors.length > 0 && !vendorId) {
        setVendorId(vendors[0].id);
      }
      setError(null);
    }
  }, [isOpen, branches, vendors]);

  const handleSuggestSku = () => {
    const activeColor = isCustomColorActive ? customColor || 'Custom' : color;
    const suggestion = suggestHardwareSku(material, name || 'FITTING', activeColor, warehouse);
    setSku(suggestion);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sku.trim()) {
      setError('Please enter a SKU / Part Number manually.');
      return;
    }
    if (!name.trim()) {
      setError('Hardware Item Name is required (e.g. SS Gravity Hinge).');
      return;
    }

    const activeColor = isCustomColorActive ? customColor.trim() : color;
    if (!activeColor) {
      setError('Please specify a colour / finish for this hardware item.');
      return;
    }

    const activeUnit = unit === 'CUSTOM' ? customUnit.trim() : unit;
    if (!activeUnit) {
      setError('Please specify a unit of measurement.');
      return;
    }

    const selectedVendor = vendors.find((v) => v.id === vendorId);

    try {
      setIsSubmitting(true);
      const payload: CreateHardwareItemInput = {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        material,
        color: activeColor,
        unit: activeUnit,
        hsnCode: hsnCode.trim() || '8302',
        warehouse: (warehouse || 'DELHI').toUpperCase(),
        vendorId: vendorId || undefined,
        vendorName: selectedVendor ? selectedVendor.name : undefined,
        openingStock: Number(openingStock) || 0,
        reorderLevel: Number(reorderLevel) || 10,
        unitCost: unitCost ? Number(unitCost) : undefined,
        locationRack: locationRack.trim(),
        notes: notes.trim(),
      };

      await hardwareInventoryApi.create(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create hardware SKU');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const allowedColors = getAllowedColorsForMaterial(material);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#121029] border border-[#7FB706]/30 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#0d0b21]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#7FB706]">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                New Hardware Item Master (SKU)
              </h2>
              <p className="text-xs text-gray-400">
                Register cubicle fitting, track multi-branch inventory, and assign HSN
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Material Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
              1. Hardware Material Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {MATERIAL_OPTIONS.map((m) => {
                const isSelected = material === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMaterial(m.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#7FB706]/15 border-[#7FB706] shadow-sm shadow-[#7FB706]/20'
                        : 'bg-[#0d0b21] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${
                          isSelected ? 'text-[#B5F823]' : 'text-gray-200'
                        }`}
                      >
                        {m.label}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#B5F823]" />}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{m.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Color / Finish Selection (Strictly based on material rules) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                2. Colour / Finish Option <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] text-gray-400">
                {material === 'STAINLESS_STEEL' && 'SS Options: Black, Golden, Stainless Steel'}
                {material === 'ALUMINIUM' && 'Aluminium Options: Black, Aluminium colour'}
                {material === 'NYLON' && 'Nylon Options: Black ONLY'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {allowedColors.map((colName) => {
                const isSelected = !isCustomColorActive && color === colName;
                return (
                  <button
                    key={colName}
                    type="button"
                    onClick={() => {
                      setColor(colName);
                      setIsCustomColorActive(false);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? 'bg-[#7FB706]/20 border-[#7FB706] text-[#B5F823]'
                        : 'bg-[#0d0b21] border-white/10 text-gray-300 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {/* Color dot */}
                    <span
                      className={`w-3 h-3 rounded-full border border-white/20 ${
                        colName.toLowerCase().includes('black')
                          ? 'bg-black'
                          : colName.toLowerCase().includes('gold')
                          ? 'bg-amber-400'
                          : colName.toLowerCase().includes('steel')
                          ? 'bg-slate-300'
                          : colName.toLowerCase().includes('alu')
                          ? 'bg-slate-200'
                          : 'bg-gray-400'
                      }`}
                    />
                    {colName}
                  </button>
                );
              })}

              {/* Custom Color Toggle */}
              <button
                type="button"
                onClick={() => setIsCustomColorActive(true)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                  isCustomColorActive
                    ? 'bg-[#7FB706]/20 border-[#7FB706] text-[#B5F823]'
                    : 'bg-[#0d0b21] border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                + Custom Colour
              </button>
            </div>

            {isCustomColorActive && (
              <div className="pt-2 animate-in fade-in duration-150">
                <input
                  type="text"
                  placeholder="Type custom colour / coating name (e.g. Rose Gold, Antique Bronze, Anthracite Grey)"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* 3. SKU Manual Entry & Item Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                  3. SKU / Part No. (Manual Entry) <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleSuggestSku}
                  className="text-[11px] text-[#B5F823] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Suggest SKU
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="e.g. SS-HNG-BLK-01, AL-TR-SLV-02"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="w-full px-3 py-2.5 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs font-mono font-bold tracking-wider focus:outline-none"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Type your desired custom SKU manually, or click Suggest SKU.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                Hardware Item Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Gravity Hinge (Pair), Indicator Lock, Headrail"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* 4. Units & HSN Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Units */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                Unit of Measurement <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {STANDARD_UNITS.map((u) => {
                  const isSelected = unit === u;
                  return (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#7FB706]/20 border-[#7FB706] text-[#B5F823]'
                          : 'bg-[#0d0b21] border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {u}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setUnit('CUSTOM')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    unit === 'CUSTOM'
                      ? 'bg-[#7FB706]/20 border-[#7FB706] text-[#B5F823]'
                      : 'bg-[#0d0b21] border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  Custom
                </button>
              </div>
              {unit === 'CUSTOM' && (
                <input
                  type="text"
                  placeholder="e.g. Pairs, Pcs, Kg, Rolls"
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  className="w-full mt-1.5 px-3 py-1.5 bg-[#030213] border border-white/15 rounded-lg text-xs text-white focus:outline-none"
                />
              )}
            </div>

            {/* HSN Code */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                  HSN Code
                </label>
                <div className="flex items-center gap-1">
                  {['8302', '7610', '3926'].map((codePreset) => (
                    <button
                      key={codePreset}
                      type="button"
                      onClick={() => setHsnCode(codePreset)}
                      className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-[10px] text-gray-400 hover:text-[#B5F823] font-mono rounded cursor-pointer"
                    >
                      {codePreset}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                placeholder="e.g. 8302, 7610, 3926"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs font-mono focus:outline-none"
              />
              <p className="text-[10px] text-gray-500 mt-0.5">
                8302 (Fittings & Hinges), 7610 (Aluminium profiles), 3926 (Nylon/Plastics)
              </p>
            </div>
          </div>

          {/* 5. Branch / Warehouse & Hardware Vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Branch */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                  Branch / Warehouse Location <span className="text-red-400">*</span>
                </label>
                {onOpenBranchModal && (
                  <button
                    type="button"
                    onClick={onOpenBranchModal}
                    className="text-[11px] text-[#B5F823] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    + Manage Branches
                  </button>
                )}
              </div>
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.name} ({b.code}) — {b.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendor */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                  Hardware Vendor / Supplier
                </label>
                {onOpenVendorModal && (
                  <button
                    type="button"
                    onClick={onOpenVendorModal}
                    className="text-[11px] text-[#B5F823] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    + Add Vendor
                  </button>
                )}
              </div>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              >
                <option value="">-- Select Hardware Supplier --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.city || 'Vendor'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 6. Stock Levels & Financials */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#0d0b21] border border-white/5 rounded-xl">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Opening Stock</label>
              <input
                type="number"
                min="0"
                value={openingStock}
                onChange={(e) => setOpeningStock(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Reorder Level</label>
              <input
                type="number"
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Unit Cost (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="₹ Cost"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Bin / Rack No.</label>
              <input
                type="text"
                placeholder="e.g. RACK-SS-01"
                value={locationRack}
                onChange={(e) => setLocationRack(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Technical Notes / Specs</label>
            <textarea
              rows={2}
              placeholder="e.g. Grade 304 satin brush, suitable for 12mm and 18mm compact boards..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
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
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Creating SKU...' : 'Save & Register Hardware SKU'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
