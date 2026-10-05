import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowDownRight,
  Building2,
  Calendar,
  Hash,
  Layers,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Search,
  MapPin,
  DollarSign,
  PackagePlus,
  RefreshCw,
} from 'lucide-react';
import { boardInventoryApi } from '../../api/boardInventoryApi';
import type { BoardInventoryItem, BoardSupplier } from '../../types/admin';

interface StockInwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialBoardId?: string;
  suppliers: BoardSupplier[];
  boards?: BoardInventoryItem[];
}

interface InwardRowItem {
  id: string;
  inventoryItemId: string;
  quantity: string | number;
  unitCost: string | number;
  batchLotNo: string;
  notes: string;
}

const COMMON_SIZES = [
  '1220x2440mm (4x8ft)',
  '1830x3660mm (6x12ft)',
  '1525x3660mm (5x12ft)',
  '1220x1830mm (4x6ft)',
  '1525x1830mm (5x6ft)',
];

const COMMON_THICKNESSES = ['12mm', '18mm', '13mm', '9mm', '6mm', '3mm', '25mm'];

export default function StockInwardModal({
  isOpen,
  onClose,
  onSuccess,
  initialBoardId,
  suppliers: propSuppliers,
  boards: initialBoards = [],
}: StockInwardModalProps) {
  const suppliers =
    propSuppliers && propSuppliers.length > 0
      ? propSuppliers
      : boardInventoryApi.getCachedSuppliersSync() || [];

  // Complete catalog state for picking boards across all pages (unlimited)
  const [catalogBoards, setCatalogBoards] = useState<BoardInventoryItem[]>(initialBoards);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  // Modal Filters (Warehouse, Supplier, Size, Thickness, Search)
  const [filterWarehouse, setFilterWarehouse] = useState<string>('ALL');
  const [filterSupplierId, setFilterSupplierId] = useState<string>('ALL');
  const [filterSize, setFilterSize] = useState<string>('ALL');
  const [filterThickness, setFilterThickness] = useState<string>('ALL');
  const [filterSearch, setFilterSearch] = useState<string>('');

  // Consignment Header Info
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [commonBatchLotNo, setCommonBatchLotNo] = useState('');
  const [commonNotes, setCommonNotes] = useState('');

  // Multi-item rows
  const [rows, setRows] = useState<InwardRowItem[]>([
    {
      id: 'row-1',
      inventoryItemId: '',
      quantity: '',
      unitCost: '',
      batchLotNo: '',
      notes: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load complete catalog when modal opens to remove 100-board limitation
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        setIsLoadingCatalog(true);
        const res = await boardInventoryApi.list({ limit: 1000 });
        if (isMounted && res.data?.data?.items) {
          setCatalogBoards(res.data.data.items);
        }
      } catch (err) {
        console.warn('Could not fetch full catalog for inward modal, falling back to props:', err);
      } finally {
        if (isMounted) setIsLoadingCatalog(false);
      }
    };

    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle initial board selection
  useEffect(() => {
    if (isOpen && initialBoardId) {
      const match = catalogBoards.find((b) => b.id === initialBoardId);
      setRows([
        {
          id: `row-${Date.now()}`,
          inventoryItemId: initialBoardId,
          quantity: '',
          unitCost: match?.unitCost ? Number(match.unitCost) : '',
          batchLotNo: '',
          notes: '',
        },
      ]);
      if (match) {
        setFilterSupplierId(match.vendorId);
        if (match.warehouse) setFilterWarehouse(match.warehouse.toUpperCase());
      }
    } else if (isOpen && rows.length === 0) {
      setRows([
        {
          id: `row-${Date.now()}`,
          inventoryItemId: catalogBoards[0]?.id || '',
          quantity: '',
          unitCost: catalogBoards[0]?.unitCost ? Number(catalogBoards[0].unitCost) : '',
          batchLotNo: '',
          notes: '',
        },
      ]);
    }
  }, [isOpen, initialBoardId, catalogBoards]);

  // Unique sizes and thicknesses available in catalog
  const availableSizes = useMemo(() => {
    const set = new Set<string>(COMMON_SIZES);
    catalogBoards.forEach((b) => b.size && set.add(b.size));
    return Array.from(set).sort();
  }, [catalogBoards]);

  const availableThicknesses = useMemo(() => {
    const set = new Set<string>(COMMON_THICKNESSES);
    catalogBoards.forEach((b) => b.thickness && set.add(b.thickness));
    return Array.from(set).sort();
  }, [catalogBoards]);

  // Filtered boards based on modal filter selections
  const filteredBoards = useMemo(() => {
    return catalogBoards.filter((b) => {
      if (filterWarehouse !== 'ALL') {
        const itemWarehouse = (b.warehouse || 'DELHI').toUpperCase();
        if (itemWarehouse !== filterWarehouse) return false;
      }
      if (filterSupplierId !== 'ALL') {
        if (b.vendorId !== filterSupplierId) return false;
      }
      if (filterSize !== 'ALL') {
        if (b.size !== filterSize) return false;
      }
      if (filterThickness !== 'ALL') {
        if (b.thickness !== filterThickness) return false;
      }
      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase();
        const matches =
          b.designNo.toLowerCase().includes(q) ||
          (b.designName && b.designName.toLowerCase().includes(q)) ||
          b.itemCode.toLowerCase().includes(q) ||
          (b.vendorName && b.vendorName.toLowerCase().includes(q)) ||
          b.boardType.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [catalogBoards, filterWarehouse, filterSupplierId, filterSize, filterThickness, filterSearch]);

  if (!isOpen) return null;

  // Row Manipulation Handlers
  const handleAddRow = () => {
    const defaultBoard = filteredBoards[0] || catalogBoards[0];
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        inventoryItemId: defaultBoard?.id || '',
        quantity: '',
        unitCost: defaultBoard?.unitCost ? Number(defaultBoard.unitCost) : '',
        batchLotNo: commonBatchLotNo,
        notes: '',
      },
    ]);
  };

  const handleAddMultipleRows = (count: number) => {
    const defaultBoard = filteredBoards[0] || catalogBoards[0];
    const newItems: InwardRowItem[] = [];
    for (let i = 0; i < count; i++) {
      newItems.push({
        id: `row-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        inventoryItemId: defaultBoard?.id || '',
        quantity: '',
        unitCost: defaultBoard?.unitCost ? Number(defaultBoard.unitCost) : '',
        batchLotNo: commonBatchLotNo,
        notes: '',
      });
    }
    setRows((prev) => [...prev, ...newItems]);
  };

  const handleRemoveRow = (rowId: string) => {
    if (rows.length <= 1) {
      // Keep at least 1 row, just reset it
      setRows([
        {
          id: `row-${Date.now()}`,
          inventoryItemId: filteredBoards[0]?.id || '',
          quantity: '',
          unitCost: '',
          batchLotNo: '',
          notes: '',
        },
      ]);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleRowChange = (
    rowId: string,
    field: keyof InwardRowItem,
    value: any
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r, [field]: value };
        // Auto-fill unitCost if board item changed
        if (field === 'inventoryItemId') {
          const match = catalogBoards.find((b) => b.id === value);
          if (match && match.unitCost && (r.unitCost === '' || !r.unitCost)) {
            updated.unitCost = Number(match.unitCost);
          }
        }
        return updated;
      })
    );
  };

  // Consignment Totals
  const totalSheets = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  const totalValue = rows.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitCost) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate rows
    if (rows.length === 0) {
      setError('Please add at least one board item to record inward stock.');
      return;
    }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.inventoryItemId) {
        setError(`Row ${i + 1}: Please select a Board SKU.`);
        return;
      }
      const qtyNum = Number(r.quantity);
      if (!qtyNum || qtyNum <= 0) {
        setError(`Row ${i + 1}: Inward quantity must be greater than 0.`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload = rows.map((r) => ({
        inventoryItemId: r.inventoryItemId,
        quantity: Number(r.quantity),
        supplierInvoiceNo: supplierInvoiceNo.trim() || undefined,
        supplierInvoiceDate: supplierInvoiceDate || undefined,
        batchLotNo: r.batchLotNo.trim() || commonBatchLotNo.trim() || undefined,
        unitCost: r.unitCost !== '' ? Number(r.unitCost) : undefined,
        notes: r.notes.trim() || commonNotes.trim() || undefined,
      }));

      await boardInventoryApi.bulkInward(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to record bulk stock inward');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#09071a] border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden my-4 sm:my-8 max-h-[92vh] flex flex-col">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#7FB706] to-[#B5F823]" />

        {/* Title Bar */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>Record Stock Inward</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/30">
                  Bulk Multi-Item Inward
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-400">
                Receive single or multiple board shipments into warehouse inventory
              </p>
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
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-xs text-red-400 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-3 sm:mt-4 flex flex-col flex-1 overflow-hidden space-y-4">
          {/* Scrollable Form Content */}
          <div className="overflow-y-auto pr-1 space-y-4 flex-1">
            {/* 1. Consignment Details Header */}
            <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
              <div className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#7FB706]" />
                <span>Consignment & Invoice Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    Supplier Invoice / Challan No
                  </label>
                  <input
                    type="text"
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    placeholder="e.g. INV-STYL-2026-991"
                    className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[38px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    Invoice / Receipt Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={supplierInvoiceDate}
                    onChange={(e) => setSupplierInvoiceDate(e.target.value)}
                    className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[38px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    Common Batch / Lot No
                  </label>
                  <input
                    type="text"
                    value={commonBatchLotNo}
                    onChange={(e) => setCommonBatchLotNo(e.target.value)}
                    placeholder="e.g. LOT-26B-04"
                    className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[38px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    Storage Rack / Remarks
                  </label>
                  <input
                    type="text"
                    value={commonNotes}
                    onChange={(e) => setCommonNotes(e.target.value)}
                    placeholder="e.g. Received at Central Depot"
                    className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[38px]"
                  />
                </div>
              </div>
            </div>

            {/* 2. Board Selection Filter Toolbar */}
            <div className="p-3 bg-[#100e28] border border-white/10 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#7FB706]" />
                  <span>Filter Available Board SKUs</span>
                </span>
                <span className="text-[11px] text-gray-400">
                  Showing <strong>{filteredBoards.length}</strong> of{' '}
                  <strong>{catalogBoards.length}</strong> catalog items
                  {isLoadingCatalog && ' (Loading...)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                {/* Warehouse Filter */}
                <select
                  value={filterWarehouse}
                  onChange={(e) => setFilterWarehouse(e.target.value)}
                  className="bg-[#121029] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[36px]"
                >
                  <option value="ALL">All Warehouses</option>
                  <option value="DELHI">Delhi Depot</option>
                  <option value="KOLKATA">Kolkata Depot</option>
                </select>

                {/* Supplier Filter */}
                <select
                  value={filterSupplierId}
                  onChange={(e) => setFilterSupplierId(e.target.value)}
                  className="bg-[#121029] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[36px]"
                >
                  <option value="ALL">All Suppliers</option>
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name}
                    </option>
                  ))}
                </select>

                {/* Size Filter */}
                <select
                  value={filterSize}
                  onChange={(e) => setFilterSize(e.target.value)}
                  className="bg-[#121029] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[36px]"
                >
                  <option value="ALL">All Sizes</option>
                  {availableSizes.map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>

                {/* Thickness Filter */}
                <select
                  value={filterThickness}
                  onChange={(e) => setFilterThickness(e.target.value)}
                  className="bg-[#121029] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[36px]"
                >
                  <option value="ALL">All Thicknesses</option>
                  {availableThicknesses.map((th) => (
                    <option key={th} value={th}>
                      {th}
                    </option>
                  ))}
                </select>

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="Search design / finish..."
                    className="w-full bg-[#121029] border border-white/10 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[36px]"
                  />
                </div>
              </div>
            </div>

            {/* 3. Multi-Row Inward Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <PackagePlus className="w-4 h-4 text-[#7FB706]" />
                  <span>Inward Items List ({rows.length} {rows.length === 1 ? 'item' : 'items'})</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="px-3 py-1.5 rounded-xl bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/30 text-xs font-bold transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add Row
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddMultipleRows(5)}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-semibold transition"
                    title="Add 5 empty rows"
                  >
                    +5 Rows
                  </button>
                </div>
              </div>

              {/* Table Container */}
              <div className="border border-white/10 rounded-xl overflow-x-auto bg-[#0c0a20]">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-[#121029] text-gray-400 uppercase font-semibold text-[10px] border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-3 w-10">#</th>
                      <th className="py-2.5 px-3 min-w-[280px]">Board SKU / Design *</th>
                      <th className="py-2.5 px-3 w-36">Inward Qty (Sheets) *</th>
                      <th className="py-2.5 px-3 w-32">Unit Cost (₹)</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Rack / Remarks</th>
                      <th className="py-2.5 px-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rows.map((row, idx) => {
                      const selectedBoard = catalogBoards.find((b) => b.id === row.inventoryItemId);
                      return (
                        <tr key={row.id} className="hover:bg-white/[0.02] transition">
                          {/* Row Index */}
                          <td className="py-2 px-3 font-mono text-gray-400 text-center font-bold">
                            {idx + 1}
                          </td>

                          {/* Board SKU Selector */}
                          <td className="py-2 px-3">
                            <select
                              required
                              value={row.inventoryItemId}
                              onChange={(e) =>
                                handleRowChange(row.id, 'inventoryItemId', e.target.value)
                              }
                              className="w-full bg-[#161435] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FB706]"
                            >
                              <option value="">-- Select Board SKU --</option>
                              {filteredBoards.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.designNo} {b.designName ? `(${b.designName})` : ''} — {b.thickness} | {b.size} | {b.vendorName} [Stock: {b.currentStock}]
                                </option>
                              ))}
                            </select>
                            {selectedBoard && (
                              <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                                <span>Warehouse: <strong className="text-sky-300">{(selectedBoard.warehouse || 'DELHI').toUpperCase()}</strong></span>
                                <span>•</span>
                                <span>Current: <strong className="text-emerald-400">{selectedBoard.currentStock} sheets</strong></span>
                                <span>•</span>
                                <span>Type: <strong className="text-[#B5F823]">{selectedBoard.boardType}</strong></span>
                              </div>
                            )}
                          </td>

                          {/* Quantity (Supports fractional e.g. 4.5 sheets) */}
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              required
                              value={row.quantity}
                              onChange={(e) => handleRowChange(row.id, 'quantity', e.target.value)}
                              placeholder="e.g. 4.5"
                              className="w-full bg-[#161435] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                            />
                          </td>

                          {/* Unit Cost */}
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.unitCost}
                              onChange={(e) => handleRowChange(row.id, 'unitCost', e.target.value)}
                              placeholder="e.g. 4200"
                              className="w-full bg-[#161435] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                            />
                          </td>

                          {/* Rack / Notes */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.notes}
                              onChange={(e) => handleRowChange(row.id, 'notes', e.target.value)}
                              placeholder="Rack A-01"
                              className="w-full bg-[#161435] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                            />
                          </td>

                          {/* Action (Remove) */}
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(row.id)}
                              className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-lg transition"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Inward Consignment Summary Card */}
            <div className="p-3 bg-gradient-to-r from-emerald-500/10 to-[#7FB706]/10 border border-[#7FB706]/20 rounded-xl flex flex-wrap items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-4">
                <span>
                  Total SKUs: <strong className="text-white font-bold">{rows.filter((r) => r.inventoryItemId).length}</strong>
                </span>
                <span>
                  Total Sheets: <strong className="text-emerald-400 font-bold">{totalSheets.toFixed(2)} sheets</strong>
                </span>
                {totalValue > 0 && (
                  <span>
                    Est. Value: <strong className="text-[#B5F823] font-bold">₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-400">
                Single transaction atomic commit
              </span>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={handleAddRow}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-[#7FB706]" />
              Add Another Board
            </button>

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
                disabled={isSubmitting || rows.length === 0}
                className="px-5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold shadow-lg shadow-[#7FB706]/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Recording Bulk Inward...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Add {rows.length} {rows.length === 1 ? 'Board' : 'Boards'} to Stock
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
