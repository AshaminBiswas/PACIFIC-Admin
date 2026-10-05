import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
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
  RotateCcw,
  Edit2,
  Loader2,
} from 'lucide-react';

import { boardInventoryApi, isActionTesaVendor } from '../../api/boardInventoryApi';
import type { BoardSupplier, BoardInventoryItem } from '../../types/admin';

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

export default function EditBoardSkuPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Loading states
  const [loadingItem, setLoadingItem] = useState(true);
  const [boardItem, setBoardItem] = useState<BoardInventoryItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Lookups (instantly pre-populated from browser localStorage cache)
  const [suppliers, setSuppliers] = useState<BoardSupplier[]>(() => {
    return boardInventoryApi.getCachedSuppliersSync() || [];
  });
  const [loadingLookups, setLoadingLookups] = useState(() => {
    const cached = boardInventoryApi.getCachedSuppliersSync();
    return !cached || cached.length === 0;
  });
  const [isRefreshingSuppliers, setIsRefreshingSuppliers] = useState(false);

  // Form State
  const [category, setCategory] = useState('RESTROOM_CUBICLE');
  const [warehouse, setWarehouse] = useState<'DELHI' | 'KOLKATA' | 'CUSTOM'>('DELHI');
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
  const [openingStock, setOpeningStock] = useState<string | number>(0);
  const [currentStock, setCurrentStock] = useState<string | number>(0);
  const [reorderLevel, setReorderLevel] = useState<string | number>(10);
  const [unitCost, setUnitCost] = useState<string | number>('');
  const [locationRack, setLocationRack] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch approved suppliers with caching
  const loadSuppliers = async (force = false) => {
    try {
      if (force) {
        setIsRefreshingSuppliers(true);
      } else if (suppliers.length === 0) {
        setLoadingLookups(true);
      }
      const res = await boardInventoryApi.listSuppliers(force);
      const supplierList = res.data?.data;
      if (supplierList && supplierList.length > 0) {
        setSuppliers(supplierList);
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoadingLookups(false);
      setIsRefreshingSuppliers(false);
    }
  };

  useEffect(() => {
    if (suppliers.length === 0) {
      loadSuppliers(false);
    }
  }, []);

  // Fetch board item by ID
  useEffect(() => {
    async function fetchBoardItem() {
      if (!id) {
        setLoadError('No Board SKU ID provided');
        setLoadingItem(false);
        return;
      }
      try {
        setLoadingItem(true);
        setLoadError(null);
        const res = await boardInventoryApi.getById(id);
        const item = res.data?.data;
        if (!item) {
          setLoadError('Board SKU not found or deleted');
          return;
        }

        setBoardItem(item);

        // Prepopulate form state
        setCategory(item.category || 'RESTROOM_CUBICLE');

        const upperWh = (item.warehouse || 'DELHI').toUpperCase();
        if (upperWh === 'DELHI' || upperWh === 'KOLKATA') {
          setWarehouse(upperWh);
        } else {
          setWarehouse('CUSTOM');
          setCustomWarehouse(item.warehouse || '');
        }

        setVendorId(item.vendorId || '');
        setDesignNo(item.designNo || '');
        setDesignName(item.designName || '');

        // Match or set size
        const matchedSize = STANDARD_SIZES.find(
          (s) => s.label === item.size || s.key === item.size
        );
        if (matchedSize) {
          setSizeKey(matchedSize.key);
        } else {
          setSizeKey('CUSTOM');
          // Parse possible "length x width mm"
          const match = item.size?.match(/(\d+)\s*[xX*]\s*(\d+)/);
          if (match) {
            setCustomLengthMm(match[1]);
            setCustomWidthMm(match[2]);
          } else {
            setCustomLengthMm(item.size || '');
          }
        }

        // Match thickness
        if (STANDARD_THICKNESSES.includes(item.thickness)) {
          setThickness(item.thickness);
        } else {
          setThickness('CUSTOM');
          setCustomThickness(item.thickness || '');
        }

        // Match board type
        if (BOARD_TYPES.includes(item.boardType)) {
          setBoardType(item.boardType);
        } else {
          setBoardType('CUSTOM');
          setCustomBoardType(item.boardType || '');
        }

        setOpeningStock(item.openingStock !== undefined ? item.openingStock : 0);
        setCurrentStock(item.currentStock !== undefined ? item.currentStock : 0);
        setReorderLevel(item.reorderLevel !== undefined ? item.reorderLevel : 10);
        setUnitCost(item.unitCost !== null && item.unitCost !== undefined ? item.unitCost : '');
        setLocationRack(item.locationRack || '');
        setNotes(item.notes || '');
        setStatus(item.status || 'ACTIVE');
      } catch (err: any) {
        console.error('Failed to load board item:', err);
        setLoadError(err.response?.data?.message || err.message || 'Failed to load board item');
      } finally {
        setLoadingItem(false);
      }
    }
    fetchBoardItem();
  }, [id]);

  // Helper to handle vendor change and auto-set boardType default for Balaji Action Tesa
  const handleVendorChange = (newVendorId: string) => {
    setVendorId(newVendorId);
    const targetSup = suppliers.find((s) => s.id === newVendorId);
    if (isActionTesaVendor(targetSup)) {
      setBoardType('HDF');
    } else if (boardType === 'HDF') {
      setBoardType('HPL');
    }
  };

  // Compute final dimensions string
  const resolvedSize =
    sizeKey === 'CUSTOM'
      ? customLengthMm && customWidthMm
        ? `${customLengthMm} x ${customWidthMm} mm (Custom)`
        : customLengthMm || ''
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
  const supplierPrefix = (selectedSupplier?.name || boardItem?.vendorName || 'SUP').slice(0, 3).toUpperCase();
  const cleanDesign = designNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'XXX';
  const cleanThick = resolvedThickness.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || '12MM';
  const previewSkuCode = `BRD-${resolvedWarehouse.slice(0, 3)}-${supplierPrefix}-${cleanDesign}-${cleanThick}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

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
      setSuccessMessage(null);

      await boardInventoryApi.update(id, {
        category,
        warehouse: resolvedWarehouse,
        vendorId,
        vendorName: selectedSupplier?.name || boardItem?.vendorName || undefined,
        designNo: designNo.trim(),
        designName: designName.trim() || undefined,
        size: resolvedSize,
        thickness: resolvedThickness,
        boardType: resolvedBoardType,
        openingStock: openingStock !== '' ? Number(openingStock) : 0,
        currentStock: currentStock !== '' ? Number(currentStock) : 0,
        reorderLevel: reorderLevel !== '' ? Number(reorderLevel) : 10,
        unitCost: unitCost !== '' ? Number(unitCost) : undefined,
        locationRack: locationRack.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
      });

      setSuccessMessage(`Board SKU "${designNo}" updated successfully!`);

      // Determine return route based on category
      const returnUrl =
        category === 'LOCKER_BOARD'
          ? '/admin/dashboard/inventory/lockers'
          : category === 'URINAL_PARTITION_UMP'
          ? '/admin/dashboard/inventory/ump'
          : category === 'STORE_HARDWARE'
          ? '/admin/dashboard/inventory/store'
          : '/admin/dashboard/inventory/boards';

      setTimeout(() => {
        navigate(returnUrl);
      }, 1200);
    } catch (err: any) {
      console.error('Failed to update board SKU:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update board SKU');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingItem) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-[#7FB706] animate-spin" />
        <p className="text-sm text-gray-400">Loading board SKU details from database...</p>
      </div>
    );
  }

  if (loadError || !boardItem) {
    return (
      <div className="p-6 max-w-2xl mx-auto my-12 bg-[#09071a] border border-red-500/20 rounded-2xl p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Board SKU Not Found</h2>
        <p className="text-sm text-gray-400">{loadError || 'The requested board item could not be found.'}</p>
        <Link
          to="/admin/dashboard/inventory/boards"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7FB706] text-white font-bold text-xs hover:bg-[#8ecb08] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Inventory Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            to={
              category === 'LOCKER_BOARD'
                ? '/admin/dashboard/inventory/lockers'
                : category === 'URINAL_PARTITION_UMP'
                ? '/admin/dashboard/inventory/ump'
                : category === 'STORE_HARDWARE'
                ? '/admin/dashboard/inventory/store'
                : '/admin/dashboard/inventory/boards'
            }
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Return to inventory"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Edit Board SKU Master
              </h1>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                {boardItem.itemCode || boardItem.designNo}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Update board material specifications, warehouse depot & real-time stock balances
            </p>
          </div>
        </div>

        {/* Quick SKU Code Pill */}
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Live Item Code</span>
          <span className="text-xs font-mono font-bold text-[#7FB706] bg-[#7FB706]/10 px-3 py-1 rounded-lg border border-[#7FB706]/20">
            {previewSkuCode}
          </span>
        </div>
      </div>

      {/* Error / Success Notifications */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-xs sm:text-sm text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-xs sm:text-sm text-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="flex-1">{successMessage}</span>
        </div>
      )}

      {/* Main Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Warehouse Depot & Inventory Category */}
        <div className="p-4 sm:p-5 bg-[#09071a] border border-white/10 rounded-2xl space-y-4">
          <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <MapPin className="w-4 h-4 text-[#7FB706]" /> 1. Destination Warehouse Depot & Module
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Warehouse Facility */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Destination Warehouse Facility *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWarehouse('DELHI')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition border min-h-[44px] flex items-center justify-center gap-2 ${
                    warehouse === 'DELHI'
                      ? 'bg-[#7FB706] border-[#7FB706] text-white shadow-md'
                      : 'bg-[#121029] border-white/10 text-gray-300 hover:border-white/20'
                  }`}
                >
                  🏢 Delhi Depot
                </button>
                <button
                  type="button"
                  onClick={() => setWarehouse('KOLKATA')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition border min-h-[44px] flex items-center justify-center gap-2 ${
                    warehouse === 'KOLKATA'
                      ? 'bg-[#7FB706] border-[#7FB706] text-white shadow-md'
                      : 'bg-[#121029] border-white/10 text-gray-300 hover:border-white/20'
                  }`}
                >
                  🏭 Kolkata Depot
                </button>
              </div>

              {warehouse === 'CUSTOM' && (
                <input
                  type="text"
                  required
                  placeholder="Specify Custom Warehouse / Depot Name"
                  value={customWarehouse}
                  onChange={(e) => setCustomWarehouse(e.target.value)}
                  className="mt-2.5 w-full bg-[#121029] border border-[#7FB706]/40 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                />
              )}
            </div>

            {/* Inventory Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Product System / Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              >
                {INVENTORY_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label} ({cat.desc})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Supplier & Design Identification */}
        <div className="p-4 sm:p-5 bg-[#09071a] border border-white/10 rounded-2xl space-y-4">
          <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <Building2 className="w-4 h-4 text-[#7FB706]" /> 2. Supplier & Design Identification
          </h2>

          {/* Vendor Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <label className="block text-xs font-semibold text-gray-300">
                  Approved Supplier / Manufacturer * (Vendor & Supplier Master)
                </label>
                {suppliers.length > 0 && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium inline-flex items-center gap-1.5"
                    title="Vendors loaded from local storage cache to minimize server database queries"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Local Cache ({suppliers.length})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => loadSuppliers(true)}
                  disabled={isRefreshingSuppliers}
                  className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 min-h-[28px]"
                  title="Force refresh vendor list from database and update local storage"
                >
                  <RotateCcw className={`w-3 h-3 ${isRefreshingSuppliers ? 'animate-spin text-[#7FB706]' : ''}`} />
                  <span>{isRefreshingSuppliers ? 'Refreshing...' : 'Sync from DB'}</span>
                </button>
                <Link
                  to="/admin/dashboard/vendors"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#7FB706] hover:underline flex items-center gap-1 font-semibold"
                >
                  Manage in Vendor Master ↗
                </Link>
              </div>
            </div>
            <select
              value={vendorId}
              onChange={(e) => handleVendorChange(e.target.value)}
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
            {selectedSupplier && (
              <div className="mt-2 p-2.5 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between text-xs text-gray-400 flex-wrap gap-2">
                <span className="truncate">
                  <span className="text-gray-300 font-medium">{selectedSupplier.name}</span>
                  {selectedSupplier.vendorType && ` • ${selectedSupplier.vendorType.replace(/_/g, ' ')}`}
                </span>
                <span className="shrink-0 text-[11px] text-gray-500">
                  {selectedSupplier.totalSkus || 0} existing SKUs in Master
                </span>
              </div>
            )}
          </div>

          {/* Design No & Finish */}
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

        {/* Section 3: Material, Dimensions & Thickness */}
        <div className="p-4 sm:p-5 bg-[#09071a] border border-white/10 rounded-2xl space-y-4">
          <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <Layers className="w-4 h-4 text-[#7FB706]" /> 3. Material, Dimensions & Thickness
          </h2>

          {/* Board Type: HPL, HDF, Custom */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <label className="block text-xs font-semibold text-gray-300">
                Board Type * (HPL, HDF, or Custom)
              </label>
              {isActionTesaVendor(selectedSupplier) && boardType === 'HDF' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium inline-flex items-center gap-1">
                  ⚡ Auto-defaulted to HDF for Balaji Action Tesa
                </span>
              )}
            </div>
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

          {/* Standard Sizes */}
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
                  className={`py-2.5 px-3 rounded-xl text-left transition border min-h-[48px] flex flex-col justify-center ${
                    sizeKey === sz.key
                      ? 'bg-[#7FB706] border-[#7FB706] text-white shadow-md'
                      : 'bg-[#121029] border-white/10 text-gray-300 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-bold">{sz.ft}</span>
                  <span
                    className={`text-[10px] ${
                      sizeKey === sz.key ? 'text-white/80' : 'text-gray-400'
                    }`}
                  >
                    {sz.mm}
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => setSizeKey('CUSTOM')}
                className={`py-2.5 px-3 rounded-xl text-left transition border min-h-[48px] flex flex-col justify-center ${
                  sizeKey === 'CUSTOM'
                    ? 'bg-[#7FB706] border-[#7FB706] text-white shadow-md'
                    : 'bg-[#121029] border-white/10 text-gray-300 hover:border-white/20'
                }`}
              >
                <span className="text-xs font-bold">Custom Size</span>
                <span
                  className={`text-[10px] ${
                    sizeKey === 'CUSTOM' ? 'text-white/80' : 'text-gray-400'
                  }`}
                >
                  Specify in mm
                </span>
              </button>
            </div>

            {sizeKey === 'CUSTOM' && (
              <div className="mt-3 grid grid-cols-2 gap-3 p-3 bg-white/[0.02] border border-[#7FB706]/40 rounded-xl">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Length (mm) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 1830"
                    value={customLengthMm}
                    onChange={(e) => setCustomLengthMm(e.target.value)}
                    className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Width (mm) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 1220"
                    value={customWidthMm}
                    onChange={(e) => setCustomWidthMm(e.target.value)}
                    className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[40px]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Thickness */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Thickness * (Compact Standard or Custom)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {STANDARD_THICKNESSES.map((th) => (
                <button
                  key={th}
                  type="button"
                  onClick={() => setThickness(th)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition border min-h-[44px] ${
                    thickness === th
                      ? 'bg-[#7FB706] border-[#7FB706] text-white shadow-md'
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
                    ? 'bg-[#7FB706] border-[#7FB706] text-white shadow-md'
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
                placeholder="Specify custom thickness (e.g. 13mm, 25mm, 6mm)"
                value={customThickness}
                onChange={(e) => setCustomThickness(e.target.value)}
                className="mt-2.5 w-full bg-[#121029] border border-[#7FB706]/40 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            )}
          </div>
        </div>

        {/* Section 4: Stock Levels & Financials (Supports Decimals e.g. 4.5) */}
        <div className="p-4 sm:p-5 bg-[#09071a] border border-white/10 rounded-2xl space-y-4">
          <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <Boxes className="w-4 h-4 text-[#7FB706]" /> 4. Stock Levels & Financials
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Opening Stock */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Opening Stock (Sheets) *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={openingStock}
                onChange={(e) => setOpeningStock(e.target.value)}
                placeholder="e.g. 4.5 or 10"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Supports decimal sheets (e.g. 4.5 for cut pieces).
              </span>
            </div>

            {/* Current Stock */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Current Stock (Sheets) *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                placeholder="e.g. 4.5 or 10"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Current active balance on floor.
              </span>
            </div>

            {/* Minimum Reorder Level */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="block text-xs font-semibold text-gray-300">
                  Minimum Reorder Alert Level (Sheets) *
                </label>
                <span className="text-[10px] text-amber-400/90 font-mono">
                  (Mailing Paused)
                </span>
              </div>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                placeholder="e.g. 10"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Triggers visual warning badges on floor.
              </span>
            </div>

            {/* Unit Purchase Cost */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Unit Cost / Purchase Rate (₹ per sheet)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="e.g. 4850"
                  className="w-full bg-[#121029] border border-white/10 rounded-xl pl-8 pr-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                />
              </div>
            </div>

            {/* Stock Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Stock Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              >
                <option value="ACTIVE">ACTIVE (Healthy Stock)</option>
                <option value="LOW_STOCK">LOW STOCK</option>
                <option value="OUT_OF_STOCK">OUT OF STOCK</option>
              </select>
            </div>

            {/* Location / Rack */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Depot Location / Rack / Bin Reference
              </label>
              <input
                type="text"
                value={locationRack}
                onChange={(e) => setLocationRack(e.target.value)}
                placeholder="e.g. Rack A-04, Bay 2, Shelf 3"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Internal Remarks / Notes */}
        <div className="p-4 sm:p-5 bg-[#09071a] border border-white/10 rounded-2xl space-y-3">
          <label className="block text-xs font-semibold text-gray-300">
            Internal Remarks / Technical Specification Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Exterior grade compact laminate with UV resistance, anti-bacterial coating..."
            className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
          />
        </div>

        {/* Section 6: Live SKU Code & Stock Summary Preview card */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#121029] to-[#0a081e] border border-[#7FB706]/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#7FB706]/10 text-[#7FB706] rounded-xl border border-[#7FB706]/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">
                Updated Item Code Preview
              </span>
              <div className="text-sm sm:text-base font-black text-white font-mono tracking-wide">
                {previewSkuCode}
              </div>
              <div className="text-[11px] text-gray-400">
                {resolvedWarehouse} • {selectedSupplier?.name || boardItem.vendorName || 'SUP'} • {designNo || 'XXX'} • {resolvedSize} • {resolvedThickness}
              </div>
            </div>
          </div>

          <div className="text-right sm:text-right flex items-center justify-between sm:flex-col sm:items-end">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">
              Floor Balance
            </span>
            <div className="text-base sm:text-xl font-black text-[#7FB706] font-mono">
              {currentStock} sheets
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-white/10 text-xs sm:text-sm font-bold text-gray-300 hover:text-white hover:bg-white/5 transition min-h-[44px]"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#7FB706] hover:bg-[#8ecb08] text-white font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-[#7FB706]/20 disabled:opacity-50 min-h-[44px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Board SKU Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
