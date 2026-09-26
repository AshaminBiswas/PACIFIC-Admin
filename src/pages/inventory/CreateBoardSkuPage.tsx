import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Building2,
  Layers,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Hash,
  Boxes,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { boardInventoryApi } from '../../api/boardInventoryApi';
import type { BoardSupplier } from '../../types/admin';

// Preset standard sheet sizes with both feet & metric mm notation
const STANDARD_SIZES = [
  { key: '4/4', label: '4/4 (1220 x 1220 mm)', ft: "4' x 4'", mm: '1220 x 1220 mm' },
  { key: '6/6', label: '6/6 (1830 x 1830 mm)', ft: "6' x 6'", mm: '1830 x 1830 mm' },
  { key: '6/7', label: '6/7 (1830 x 2135 mm)', ft: "6' x 7'", mm: '1830 x 2135 mm' },
  { key: '6/8', label: '6/8 (1830 x 2440 mm)', ft: "6' x 8'", mm: '1830 x 2440 mm' },
  { key: '10/4', label: '10/4 (3050 x 1220 mm)', ft: "10' x 4'", mm: '3050 x 1220 mm' },
];

const STANDARD_THICKNESSES = ['12mm', '18mm', '9mm', '3mm'];

const BOARD_TYPES = ['HPL', 'HDF'];

const INVENTORY_CATEGORIES = [
  { id: 'RESTROOM_CUBICLE', label: 'Restroom Cubicle Board', desc: 'Standard partition, door, & divider panels' },
  { id: 'LOCKER_BOARD', label: 'Locker Board', desc: 'Compact locker carcasses & tier shelves' },
  { id: 'URINAL_PARTITION_UMP', label: 'Urinal Modesty Panel (UMP)', desc: 'Wall-hung divider screens' },
  { id: 'STORE_HARDWARE', label: 'Store Item / Accessory', desc: 'General hardware, fasteners, & channel stock' },
];

export default function CreateBoardSkuPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const paramCategory = searchParams.get('category');
  const paramWarehouse = searchParams.get('warehouse')?.toUpperCase();

  // Lookups
  const [suppliers, setSuppliers] = useState<BoardSupplier[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // Form State
  const [category, setCategory] = useState(
    paramCategory === 'URINAL_PARTITION' ? 'URINAL_PARTITION_UMP' : paramCategory || 'RESTROOM_CUBICLE'
  );
  const [warehouse, setWarehouse] = useState<'DELHI' | 'KOLKATA' | 'CUSTOM'>(
    paramWarehouse === 'KOLKATA' ? 'KOLKATA' : 'DELHI'
  );
  const [customWarehouse, setCustomWarehouse] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [designNo, setDesignNo] = useState('');
  const [designName, setDesignName] = useState('');

  // Board Type
  const [boardType, setBoardType] = useState('HPL');
  const [customBoardType, setCustomBoardType] = useState('');

  // Size
  const [sizeKey, setSizeKey] = useState('6/8');
  const [customLengthMm, setCustomLengthMm] = useState('');
  const [customWidthMm, setCustomWidthMm] = useState('');

  // Thickness
  const [thickness, setThickness] = useState('12mm');
  const [customThickness, setCustomThickness] = useState('');

  // Stock & Financials
  const [openingStock, setOpeningStock] = useState<number | ''>(0);
  const [reorderLevel, setReorderLevel] = useState<number | ''>(10);
  const [unitCost, setUnitCost] = useState<number | ''>('');
  const [locationRack, setLocationRack] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch approved suppliers
  useEffect(() => {
    async function loadSuppliers() {
      try {
        setLoadingLookups(true);
        const res = await boardInventoryApi.listSuppliers();
        if (res.data?.data) {
          setSuppliers(res.data.data);
          if (res.data.data.length > 0) {
            setVendorId(res.data.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load suppliers:', err);
      } finally {
        setLoadingLookups(false);
      }
    }
    loadSuppliers();
  }, []);

  // Compute final dimensions string
  const resolvedSize =
    sizeKey === 'CUSTOM'
      ? customLengthMm && customWidthMm
        ? `${customLengthMm} x ${customWidthMm} mm (Custom)`
        : ''
      : STANDARD_SIZES.find((s) => s.key === sizeKey)?.label || sizeKey;

  // Compute final thickness
  const resolvedThickness =
    thickness === 'CUSTOM' ? (customThickness ? `${customThickness.trim()}` : '') : thickness;

  // Compute final board type
  const resolvedBoardType =
    boardType === 'CUSTOM' ? (customBoardType ? customBoardType.trim() : '') : boardType;

  // Compute final warehouse
  const resolvedWarehouse = warehouse === 'CUSTOM' ? customWarehouse.trim().toUpperCase() : warehouse;

  // Auto-generate preview SKU Code
  const selectedSupplier = suppliers.find((s) => s.id === vendorId);
  const supplierPrefix = (selectedSupplier?.name || 'SUP').slice(0, 3).toUpperCase();
  const cleanDesign = designNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'XXX';
  const cleanThick = resolvedThickness.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || '12MM';
  const previewSkuCode = `BRD-${resolvedWarehouse.slice(0, 3)}-${supplierPrefix}-${cleanDesign}-${cleanThick}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      setError('Please select a supplier from Vendor & Supplier Master.');
      return;
    }
    if (!designNo.trim()) {
      setError('Design / Shade No is required.');
      return;
    }
    if (!resolvedSize) {
      setError('Please specify sheet dimensions.');
      return;
    }
    if (!resolvedThickness) {
      setError('Please specify board thickness.');
      return;
    }
    if (!resolvedBoardType) {
      setError('Please select or specify the board type.');
      return;
    }
    if (!resolvedWarehouse) {
      setError('Please specify the destination warehouse.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await boardInventoryApi.create({
        category,
        warehouse: resolvedWarehouse,
        vendorId,
        vendorName: selectedSupplier?.name,
        designNo: designNo.trim(),
        designName: designName.trim() || undefined,
        size: resolvedSize,
        thickness: resolvedThickness,
        boardType: resolvedBoardType,
        openingStock: openingStock !== '' ? Number(openingStock) : 0,
        reorderLevel: reorderLevel !== '' ? Number(reorderLevel) : 10,
        unitCost: unitCost !== '' ? Number(unitCost) : undefined,
        locationRack: locationRack.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // Navigate back to the corresponding inventory view
      if (category === 'LOCKER_BOARD') {
        navigate('/admin/dashboard/inventory/lockers');
      } else if (category === 'URINAL_PARTITION' || category === 'URINAL_PARTITION_UMP') {
        navigate('/admin/dashboard/inventory/ump');
      } else if (category === 'STORE_HARDWARE' || category === 'STORE') {
        navigate('/admin/dashboard/inventory/store');
      } else {
        navigate('/admin/dashboard/inventory/boards');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create board SKU');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-16 px-2 sm:px-4">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/dashboard/inventory/boards"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#7FB706]">
                Procurement &bull; Warehouse Stock Master
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white tracking-wide">
              Create New Board SKU
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Link
            to="/admin/dashboard/inventory/boards"
            className="px-3 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition min-h-[44px] flex items-center justify-center"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 sm:px-6 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#7FB706]/20 transition flex items-center gap-1.5 min-h-[44px] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Registering...' : 'Save Board SKU'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Grid */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column: Core Specs (2 cols wide) */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Section 1: Destination Warehouse & Category */}
          <div className="p-4 sm:p-5 bg-[#09071a] border border-white/10 rounded-2xl space-y-4">
            <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
              <MapPin className="w-4 h-4 text-[#7FB706]" /> 1. Warehouse Facility & Inventory Subsystem
            </h2>

            {/* Two Warehouses Managed Separately */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                Destination Warehouse * (Managed Separately)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setWarehouse('DELHI')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between min-h-[56px] ${
                    warehouse === 'DELHI'
                      ? 'bg-[#7FB706]/15 border-[#7FB706] text-white shadow-md shadow-[#7FB706]/20'
                      : 'bg-[#121029] border-white/10 text-gray-300 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    🏢 Delhi Warehouse
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1">Central Mandoli Depot</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWarehouse('KOLKATA')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between min-h-[56px] ${
                    warehouse === 'KOLKATA'
                      ? 'bg-[#7FB706]/15 border-[#7FB706] text-white shadow-md shadow-[#7FB706]/20'
                      : 'bg-[#121029] border-white/10 text-gray-300 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    🏭 Kolkata Warehouse
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1">East India Depot</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWarehouse('CUSTOM')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between min-h-[56px] ${
                    warehouse === 'CUSTOM'
                      ? 'bg-sky-500/15 border-sky-500 text-white shadow-md shadow-sky-500/20'
                      : 'bg-[#121029] border-white/10 text-gray-300 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">Custom Site...</span>
                  <span className="text-[10px] text-gray-400 mt-1">Client site / Transit depot</span>
                </button>
              </div>

              {warehouse === 'CUSTOM' && (
                <input
                  type="text"
                  required
                  placeholder="Specify custom warehouse / site location (e.g. Mumbai Yard, Site A)"
                  value={customWarehouse}
                  onChange={(e) => setCustomWarehouse(e.target.value)}
                  className="mt-2.5 w-full bg-[#121029] border border-sky-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400 min-h-[44px]"
                />
              )}
            </div>

            {/* Inventory Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                Inventory Category *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INVENTORY_CATEGORIES.map((cat) => (
                  <label
                    key={cat.id}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                      category === cat.id
                        ? 'bg-white/10 border-[#7FB706] text-white'
                        : 'bg-[#121029] border-white/10 text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="inventoryCategory"
                      value={cat.id}
                      checked={category === cat.id}
                      onChange={() => setCategory(cat.id)}
                      className="mt-0.5 accent-[#7FB706]"
                    />
                    <div>
                      <div className="text-xs font-bold text-gray-200">{cat.label}</div>
                      <div className="text-[10px] text-gray-400">{cat.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Supplier, Design No & Finish */}
          <div className="p-4 sm:p-5 bg-[#09071a] border border-white/10 rounded-2xl space-y-4">
            <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
              <Building2 className="w-4 h-4 text-[#7FB706]" /> 2. Supplier & Design Identification
            </h2>

            {/* Vendor & Supplier Master */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-300">
                  Approved Supplier / Manufacturer * (Vendor & Supplier Master)
                </label>
                <Link
                  to="/admin/dashboard/vendors"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#7FB706] hover:underline flex items-center gap-1 font-semibold"
                >
                  Manage in Vendor Master ↗
                </Link>
              </div>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                required
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              >
                <option value="">
                  {loadingLookups
                    ? '-- Loading Suppliers from Vendor Master... --'
                    : `-- Select Supplier from Vendor Master (${suppliers.length} Available) --`}
                </option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.legalName && s.legalName !== s.name ? `(${s.legalName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Design / Shade No & Finish */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Design / Shade No *
                </label>
                <input
                  type="text"
                  required
                  value={designNo}
                  onChange={(e) => setDesignNo(e.target.value)}
                  placeholder="e.g. 21091, 1120 SD, 4402, RC-101"
                  className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
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
                  placeholder="e.g. Frosty White Suede, Slate Grey"
                  className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Board Type, Standard Sizes (ft & mm) & Thickness */}
          <div className="p-4 sm:p-5 bg-[#09071a] border border-white/10 rounded-2xl space-y-4">
            <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
              <Layers className="w-4 h-4 text-[#7FB706]" /> 3. Material, Dimensions & Thickness
            </h2>

            {/* Board Type: HPL, HDF, Custom */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Board Type * (HPL, HDF, or Custom)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {BOARD_TYPES.map((bt) => (
                  <button
                    key={bt}
                    type="button"
                    onClick={() => setBoardType(bt)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition border min-h-[44px] ${
                      boardType === bt
                        ? 'bg-[#7FB706] border-[#7FB706] text-white shadow-md'
                        : 'bg-[#121029] border-white/10 text-gray-300 hover:border-white/20'
                    }`}
                  >
                    {bt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setBoardType('CUSTOM')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition border min-h-[44px] ${
                    boardType === 'CUSTOM'
                      ? 'bg-[#7FB706] border-[#7FB706] text-white shadow-md'
                      : 'bg-[#121029] border-white/10 text-gray-300 hover:border-white/20'
                  }`}
                >
                  Custom Type...
                </button>
              </div>

              {boardType === 'CUSTOM' && (
                <input
                  type="text"
                  required
                  placeholder="Specify custom board material (e.g. Moisture Guard HDHMR, PVC Foam)"
                  value={customBoardType}
                  onChange={(e) => setCustomBoardType(e.target.value)}
                  className="mt-2.5 w-full bg-[#121029] border border-[#7FB706]/40 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                />
              )}
            </div>

            {/* Standard Sizes: 4/4, 6/6, 6/7, 6/8, 10/4 (Mention in mm also & Custom) */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Sheet Size / Dimensions * (Mentioned in ft & mm)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STANDARD_SIZES.map((sz) => (
                  <button
                    key={sz.key}
                    type="button"
                    onClick={() => setSizeKey(sz.key)}
                    className={`p-2.5 rounded-xl border text-left transition min-h-[48px] ${
                      sizeKey === sz.key
                        ? 'bg-[#7FB706]/15 border-[#7FB706] text-white shadow-sm'
                        : 'bg-[#121029] border-white/10 text-gray-300 hover:border-white/20'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{sz.key} ({sz.ft})</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{sz.mm}</div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSizeKey('CUSTOM')}
                  className={`p-2.5 rounded-xl border text-left transition min-h-[48px] ${
                    sizeKey === 'CUSTOM'
                      ? 'bg-sky-500/15 border-sky-500 text-white shadow-sm'
                      : 'bg-[#121029] border-white/10 text-gray-300 hover:border-white/20'
                  }`}
                >
                  <div className="text-xs font-bold text-sky-400">Custom Size...</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Specify L x W mm</div>
                </button>
              </div>

              {sizeKey === 'CUSTOM' && (
                <div className="mt-2.5 grid grid-cols-2 gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Length (mm)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 1830"
                      value={customLengthMm}
                      onChange={(e) => setCustomLengthMm(e.target.value)}
                      className="w-full bg-[#121029] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Width (mm)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 3660"
                      value={customWidthMm}
                      onChange={(e) => setCustomWidthMm(e.target.value)}
                      className="w-full bg-[#121029] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Thickness: 12mm, 18mm, 9mm, 3mm, Custom */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Board Thickness * (12mm, 18mm, 9mm, 3mm, or Custom)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {STANDARD_THICKNESSES.map((th) => (
                  <button
                    key={th}
                    type="button"
                    onClick={() => setThickness(th)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition border min-h-[44px] ${
                      thickness === th
                        ? 'bg-[#7FB706] border-[#7FB706] text-white shadow-sm'
                        : 'bg-[#121029] border-white/10 text-gray-300 hover:border-white/20'
                    }`}
                  >
                    {th}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setThickness('CUSTOM')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition border min-h-[44px] ${
                    thickness === 'CUSTOM'
                      ? 'bg-[#7FB706] border-[#7FB706] text-white shadow-sm'
                      : 'bg-[#121029] border-white/10 text-gray-300 hover:border-white/20'
                  }`}
                >
                  Custom...
                </button>
              </div>

              {thickness === 'CUSTOM' && (
                <input
                  type="text"
                  required
                  placeholder="Specify custom thickness (e.g. 6mm, 13mm, 25mm)"
                  value={customThickness}
                  onChange={(e) => setCustomThickness(e.target.value)}
                  className="mt-2.5 w-full bg-[#121029] border border-[#7FB706]/40 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Inventory Balances, Storage Rack & Live SKU Preview */}
        <div className="space-y-4 sm:space-y-6">
          {/* Section 4: Initial Stock & Thresholds */}
          <div className="p-4 sm:p-5 bg-[#09071a] border border-white/10 rounded-2xl space-y-4">
            <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
              <Hash className="w-4 h-4 text-[#7FB706]" /> 4. Stock & Costing
            </h2>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Opening Stock (Sheets)
              </label>
              <input
                type="number"
                min="0"
                value={openingStock}
                onChange={(e) => setOpeningStock(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                Initial count loaded into warehouse inventory
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Reorder Threshold Level * (Record Level)
              </label>
              <input
                type="number"
                min="1"
                required
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
              <span className="text-[10px] text-amber-400 mt-1 block flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Auto-emails alert to 5 recipients when stock hits this level
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Estimated Unit Cost (₹ / Sheet)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 3850.00"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Warehouse Rack / Bay Location
              </label>
              <input
                type="text"
                value={locationRack}
                onChange={(e) => setLocationRack(e.target.value)}
                placeholder="e.g. Rack K-01, Delhi Bay 4"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Remarks / Grade</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional specifications or shade notes"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          </div>

          {/* Live SKU Preview Card */}
          <div className="p-4 sm:p-5 bg-gradient-to-br from-[#121029] to-[#0a081e] border border-white/10 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs text-[#7FB706] font-bold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Live SKU Specification
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-white font-mono">
                {resolvedWarehouse}
              </span>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-2">
              <div className="text-[11px] font-mono text-gray-400">Generated Item Code:</div>
              <div className="text-sm font-bold font-mono text-[#B5F823] break-all">
                {previewSkuCode}
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-400">Warehouse:</span>
                <span className="font-semibold text-white">{resolvedWarehouse}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Category:</span>
                <span className="font-semibold text-white">{category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Supplier:</span>
                <span className="font-semibold text-white">{selectedSupplier?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Design No:</span>
                <span className="font-semibold text-white">{designNo || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Size:</span>
                <span className="font-semibold text-white">{resolvedSize || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Thickness:</span>
                <span className="font-semibold text-white">{resolvedThickness || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Board Type:</span>
                <span className="font-semibold text-[#B5F823]">{resolvedBoardType || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Opening Stock:</span>
                <span className="font-bold text-emerald-400">{openingStock || 0} sheets</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Reorder Alert Level:</span>
                <span className="font-bold text-amber-400">{reorderLevel || 10} sheets</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#7FB706]/20 transition flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50 mt-4"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Registering SKU...' : 'Confirm & Save SKU'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
