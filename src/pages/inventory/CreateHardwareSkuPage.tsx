import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Wrench,
  Plus,
  Save,
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
import BranchManagerModal from '../../components/hardware/BranchManagerModal';
import HardwareVendorsModal from '../../components/hardware/HardwareVendorsModal';

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

export default function CreateHardwareSkuPage() {
  const navigate = useNavigate();

  // Lookups
  const [branches, setBranches] = useState<HardwareBranch[]>([]);
  const [vendors, setVendors] = useState<HardwareVendor[]>([]);
  const [isBranchesModalOpen, setIsBranchesModalOpen] = useState(false);
  const [isVendorsModalOpen, setIsVendorsModalOpen] = useState(false);

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

  // Load branches and vendors
  const loadLookups = async () => {
    try {
      const [brRes, vRes] = await Promise.all([
        hardwareInventoryApi.listBranches(),
        hardwareInventoryApi.listVendors(),
      ]);
      if (brRes.data?.data) {
        setBranches(brRes.data.data);
        if (brRes.data.data.length > 0 && !warehouse) {
          setWarehouse(brRes.data.data[0].code);
        }
      }
      if (vRes.data?.data) {
        setVendors(vRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load lookups:', err);
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  // Update color and HSN on material change
  useEffect(() => {
    const allowed = getAllowedColorsForMaterial(material);
    if (!allowed.includes(color)) {
      setColor(allowed[0] || 'Black');
    }
    setIsCustomColorActive(false);

    const matched = MATERIAL_OPTIONS.find((m) => m.id === material);
    if (matched && matched.defaultHsn) {
      setHsnCode(matched.defaultHsn);
    }
  }, [material]);

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
      setError('Hardware Item Name is required.');
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
      navigate('/admin/dashboard/inventory/hardware');
    } catch (err: any) {
      setError(err.message || 'Failed to create hardware SKU');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allowedColors = getAllowedColorsForMaterial(material);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard/inventory/hardware')}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#B5F823] transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Hardware Inventory
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-[#7FB706]" />
            Register New Hardware Item Master
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Create cubicle fitting SKU with material constraints, manual SKU, and regional branch allocation
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Wizard Card */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 bg-[#121029] border border-[#7FB706]/30 rounded-2xl shadow-xl space-y-6">
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
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#7FB706]/20 border-[#7FB706] shadow-md shadow-[#7FB706]/20'
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
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[#B5F823]" />}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{m.desc}</p>
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
                  className={`px-4 py-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-2 min-h-[44px] ${
                    isSelected
                      ? 'bg-[#7FB706]/20 border-[#7FB706] text-[#B5F823]'
                      : 'bg-[#0d0b21] border-white/10 text-gray-300 hover:text-white'
                  }`}
                >
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

            <button
              type="button"
              onClick={() => setIsCustomColorActive(true)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer min-h-[44px] ${
                isCustomColorActive
                  ? 'bg-[#7FB706]/20 border-[#7FB706] text-[#B5F823]'
                  : 'bg-[#0d0b21] border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              + Custom Colour
            </button>
          </div>

          {isCustomColorActive && (
            <div className="pt-2">
              <input
                type="text"
                placeholder="Type custom colour / finish name..."
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
                3. SKU Code (Manual Entry) <span className="text-red-400">*</span>
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
              placeholder="e.g. SS-HNG-BLK-01"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              className="w-full px-3 py-2.5 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs font-mono font-bold tracking-wider focus:outline-none"
            />
            <p className="text-[10px] text-gray-500 mt-1">Manual SKU entry as requested.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
              Hardware Item Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Gravity Hinge, Indicator Thumbturn Lock"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
            />
          </div>
        </div>

        {/* 4. Units & HSN Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
              Unit of Measurement <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
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
                placeholder="Custom unit (e.g. Pairs, Pcs)"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                className="w-full mt-2 px-3 py-1.5 bg-[#030213] border border-white/15 rounded-lg text-xs text-white focus:outline-none"
              />
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                HSN Code
              </label>
              <div className="flex gap-1">
                {['8302', '7610', '3926'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setHsnCode(code)}
                    className="px-1.5 py-0.5 bg-white/5 text-[10px] text-gray-400 hover:text-[#B5F823] font-mono rounded cursor-pointer"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={hsnCode}
              onChange={(e) => setHsnCode(e.target.value)}
              className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs font-mono focus:outline-none"
            />
          </div>
        </div>

        {/* 5. Branch & Vendor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                Branch / Warehouse <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsBranchesModalOpen(true)}
                className="text-[11px] text-[#B5F823] hover:underline cursor-pointer"
              >
                + Manage Branches
              </button>
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

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                Vendor / Supplier
              </label>
              <button
                type="button"
                onClick={() => setIsVendorsModalOpen(true)}
                className="text-[11px] text-[#B5F823] hover:underline cursor-pointer"
              >
                + Add Vendor
              </button>
            </div>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
            >
              <option value="">-- Choose Vendor --</option>
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
              className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs font-semibold focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Reorder Level</label>
            <input
              type="number"
              min="0"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs font-semibold focus:outline-none font-mono"
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
              className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs font-semibold focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Bin / Rack Location</label>
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
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none resize-none"
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard/inventory/hardware')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Registering...' : 'Save & Register SKU'}
          </button>
        </div>
      </form>

      {/* Sub-modals for inline branch & vendor management */}
      <BranchManagerModal
        isOpen={isBranchesModalOpen}
        onClose={() => setIsBranchesModalOpen(false)}
        onBranchesUpdated={loadLookups}
      />

      <HardwareVendorsModal
        isOpen={isVendorsModalOpen}
        onClose={() => setIsVendorsModalOpen(false)}
        onVendorsUpdated={loadLookups}
      />
    </div>
  );
}
