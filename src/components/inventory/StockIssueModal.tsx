import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowUpRight,
  Layers,
  AlertCircle,
  CheckCircle2,
  User,
  FileText,
  Plus,
  Trash2,
  Search,
  Building2,
  Calendar,
  PackageMinus,
  RefreshCw,
} from 'lucide-react';
import { boardInventoryApi } from '../../api/boardInventoryApi';
import type { BoardInventoryItem, BoardSupplier } from '../../types/admin';

interface StockIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialBoardId?: string;
  boards?: BoardInventoryItem[];
}

interface IssueRowItem {
  id: string;
  inventoryItemId: string;
  quantity: string | number;
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

export default function StockIssueModal({
  isOpen,
  onClose,
  onSuccess,
  initialBoardId,
  boards: initialBoards = [],
}: StockIssueModalProps) {
  // Full catalog boards to issue from (unlimited)
  const [catalogBoards, setCatalogBoards] = useState<BoardInventoryItem[]>(initialBoards);
  const [suppliers, setSuppliers] = useState<BoardSupplier[]>(
    () => boardInventoryApi.getCachedSuppliersSync() || []
  );
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  // Filters within modal
  const [filterWarehouse, setFilterWarehouse] = useState<string>('ALL');
  const [filterSupplierId, setFilterSupplierId] = useState<string>('ALL');
  const [filterSize, setFilterSize] = useState<string>('ALL');
  const [filterThickness, setFilterThickness] = useState<string>('ALL');
  const [filterSearch, setFilterSearch] = useState<string>('');

  // Issue Header Details
  const [issueReference, setIssueReference] = useState('');
  const [issuedToPerson, setIssuedToPerson] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [commonNotes, setCommonNotes] = useState('');

  // Multi-item rows
  const [rows, setRows] = useState<IssueRowItem[]>([
    {
      id: 'issue-row-1',
      inventoryItemId: '',
      quantity: '',
      notes: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch complete catalog and suppliers when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        setIsLoadingCatalog(true);
        const [boardsRes, suppliersRes] = await Promise.all([
          boardInventoryApi.list({ limit: 1000 }),
          boardInventoryApi.listSuppliers(),
        ]);
        if (isMounted) {
          if (boardsRes.data?.data?.items) {
            setCatalogBoards(boardsRes.data.data.items);
          }
          if (suppliersRes.data?.data) {
            setSuppliers(suppliersRes.data.data);
          }
        }
      } catch (err) {
        console.warn('Could not fetch full catalog for issue modal:', err);
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
          id: `issue-row-${Date.now()}`,
          inventoryItemId: initialBoardId,
          quantity: '',
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
          id: `issue-row-${Date.now()}`,
          inventoryItemId: catalogBoards[0]?.id || '',
          quantity: '',
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

  // Filtered boards for selection
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
        id: `issue-row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        inventoryItemId: defaultBoard?.id || '',
        quantity: '',
        notes: '',
      },
    ]);
  };

  const handleAddMultipleRows = (count: number) => {
    const defaultBoard = filteredBoards[0] || catalogBoards[0];
    const newItems: IssueRowItem[] = [];
    for (let i = 0; i < count; i++) {
      newItems.push({
        id: `issue-row-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        inventoryItemId: defaultBoard?.id || '',
        quantity: '',
        notes: '',
      });
    }
    setRows((prev) => [...prev, ...newItems]);
  };

  const handleRemoveRow = (rowId: string) => {
    if (rows.length <= 1) {
      setRows([
        {
          id: `issue-row-${Date.now()}`,
          inventoryItemId: filteredBoards[0]?.id || '',
          quantity: '',
          notes: '',
        },
      ]);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleRowChange = (
    rowId: string,
    field: keyof IssueRowItem,
    value: any
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r))
    );
  };

  // Stock Validation Check across all rows
  const rowValidationErrors = useMemo(() => {
    const errors: { rowId: string; message: string }[] = [];
    rows.forEach((r, idx) => {
      if (!r.inventoryItemId) {
        errors.push({ rowId: r.id, message: `Row ${idx + 1}: Board SKU is required` });
        return;
      }
      const board = catalogBoards.find((b) => b.id === r.inventoryItemId);
      const qtyNum = Number(r.quantity);
      if (r.quantity !== '' && (!qtyNum || qtyNum <= 0)) {
        errors.push({ rowId: r.id, message: `Row ${idx + 1}: Quantity must be greater than 0` });
      }
      if (board) {
        const available = Number(board.currentStock);
        if (qtyNum > available) {
          errors.push({
            rowId: r.id,
            message: `Row ${idx + 1}: Cannot issue ${qtyNum} sheets of ${board.designNo}. Only ${available} available in stock.`,
          });
        }
      }
    });
    return errors;
  }, [rows, catalogBoards]);

  const hasStockError = rowValidationErrors.some((e) => e.message.includes('Only'));
  const totalSheetsToIssue = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!issueReference.trim()) {
      setError('Work Order or Issue Reference is required.');
      return;
    }

    if (rows.length === 0) {
      setError('Please add at least one board item to issue.');
      return;
    }

    if (rowValidationErrors.length > 0) {
      setError(rowValidationErrors[0].message);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = rows.map((r) => ({
        inventoryItemId: r.inventoryItemId,
        quantity: Number(r.quantity),
        issueReference: issueReference.trim(),
        issuedToPerson: issuedToPerson.trim() || undefined,
        notes: r.notes.trim() || commonNotes.trim() || undefined,
      }));

      await boardInventoryApi.bulkIssue(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to issue stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#09071a] border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden my-4 sm:my-8 max-h-[92vh] flex flex-col">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />

        {/* Title Bar */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>Manual Stock Issue</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Bulk Issue
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-400">
                Issue board sheets for factory fabrication, sampling, or scrap with live stock validation
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
            {/* 1. Issue Header Details */}
            <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
              <div className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Issue Purpose & Requestor Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    Work Order / Purpose Ref *
                  </label>
                  <input
                    type="text"
                    required
                    value={issueReference}
                    onChange={(e) => setIssueReference(e.target.value)}
                    placeholder="e.g. WO-902 Cubicle Divider Panels"
                    className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 min-h-[38px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    Issued To (Operator / Lead)
                  </label>
                  <input
                    type="text"
                    value={issuedToPerson}
                    onChange={(e) => setIssuedToPerson(e.target.value)}
                    placeholder="e.g. Ramesh Kumar (Fabrication)"
                    className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 min-h-[38px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 min-h-[38px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    General Cutting Remarks
                  </label>
                  <input
                    type="text"
                    value={commonNotes}
                    onChange={(e) => setCommonNotes(e.target.value)}
                    placeholder="e.g. Cutting 5 doors + 4 mid panels"
                    className="w-full bg-[#121029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 min-h-[38px]"
                  />
                </div>
              </div>
            </div>

            {/* 2. Board Selection Filter Toolbar */}
            <div className="p-3 bg-[#100e28] border border-white/10 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Filter Boards to Issue</span>
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
                  className="bg-[#121029] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 min-h-[36px]"
                >
                  <option value="ALL">All Warehouses</option>
                  <option value="DELHI">Delhi Depot</option>
                  <option value="KOLKATA">Kolkata Depot</option>
                </select>

                {/* Supplier Filter */}
                <select
                  value={filterSupplierId}
                  onChange={(e) => setFilterSupplierId(e.target.value)}
                  className="bg-[#121029] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 min-h-[36px]"
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
                  className="bg-[#121029] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 min-h-[36px]"
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
                  className="bg-[#121029] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 min-h-[36px]"
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
                    className="w-full bg-[#121029] border border-white/10 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 min-h-[36px]"
                  />
                </div>
              </div>
            </div>

            {/* 3. Multi-Row Issue Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <PackageMinus className="w-4 h-4 text-amber-400" />
                  <span>Items to Issue ({rows.length} {rows.length === 1 ? 'item' : 'items'})</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1"
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
                      <th className="py-2.5 px-3 min-w-[300px]">Board SKU / Design *</th>
                      <th className="py-2.5 px-3 w-36 text-center">Available Stock</th>
                      <th className="py-2.5 px-3 w-36">Issue Qty (Sheets) *</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Cutting Plan Notes</th>
                      <th className="py-2.5 px-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rows.map((row, idx) => {
                      const selectedBoard = catalogBoards.find((b) => b.id === row.inventoryItemId);
                      const available = selectedBoard ? Number(selectedBoard.currentStock) : 0;
                      const issueQty = Number(row.quantity) || 0;
                      const isOver = row.quantity !== '' && issueQty > available;
                      const remaining = available - issueQty;

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
                              className="w-full bg-[#161435] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
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
                                <span>Supplier: <strong className="text-white">{selectedBoard.vendorName}</strong></span>
                                <span>•</span>
                                <span>Type: <strong className="text-[#B5F823]">{selectedBoard.boardType}</strong></span>
                              </div>
                            )}
                          </td>

                          {/* Available Stock Pill */}
                          <td className="py-2 px-3 text-center">
                            {selectedBoard ? (
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full font-mono text-xs font-bold ${
                                  available === 0
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : available <= Number(selectedBoard.reorderLevel)
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}
                              >
                                {available} sheets
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>

                          {/* Quantity to Issue */}
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              max={available}
                              required
                              value={row.quantity}
                              onChange={(e) => handleRowChange(row.id, 'quantity', e.target.value)}
                              placeholder={`Max ${available}`}
                              className={`w-full bg-[#161435] border rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none ${
                                isOver
                                  ? 'border-rose-500 text-rose-300'
                                  : 'border-white/10 focus:border-amber-400'
                              }`}
                            />
                            {selectedBoard && row.quantity !== '' && (
                              <div className="mt-1 text-[10px]">
                                {isOver ? (
                                  <span className="text-rose-400 font-bold">
                                    Exceeds stock by {(issueQty - available).toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">
                                    Remaining: <strong className="text-emerald-400">{remaining.toFixed(2)}</strong>
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Notes */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.notes}
                              onChange={(e) => handleRowChange(row.id, 'notes', e.target.value)}
                              placeholder="Divider panels"
                              className="w-full bg-[#161435] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
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

            {/* 4. Issue Summary Card */}
            <div
              className={`p-3 border rounded-xl flex flex-wrap items-center justify-between text-xs gap-3 ${
                hasStockError
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20 text-white'
              }`}
            >
              <div className="flex items-center gap-4">
                <span>
                  Total SKUs: <strong className="font-bold">{rows.filter((r) => r.inventoryItemId).length}</strong>
                </span>
                <span>
                  Total Sheets to Issue: <strong className="font-bold">{totalSheetsToIssue.toFixed(2)} sheets</strong>
                </span>
                {hasStockError && (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Insufficient stock in one or more items!
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-400">
                Live floor deduction audit
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
              <Plus className="w-4 h-4 text-amber-400" />
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
                disabled={isSubmitting || hasStockError || rows.length === 0}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-lg shadow-amber-500/20 transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Issuing Stock...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm Issue ({totalSheetsToIssue.toFixed(2)} Sheets)
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
