import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  History,
  FileText,
  BarChart3,
  Building2,
  AlertTriangle,
  RefreshCw,
  MoreVertical,
  Trash2,
  MapPin,
  Columns,
  Info,
  Edit2,
} from 'lucide-react';
import { boardInventoryApi } from '../../api/boardInventoryApi';
import type {
  BoardInventoryItem,
  BoardSupplier,
  BoardAnalyticsSummary,
  BoardStockMovement,
} from '../../types/admin';
import StockInwardModal from '../../components/inventory/StockInwardModal';
import StockIssueModal from '../../components/inventory/StockIssueModal';
import AdjustMovementModal from '../../components/inventory/AdjustMovementModal';
import BoardLedgerModal from '../../components/inventory/BoardLedgerModal';
import BoardReportsModal from '../../components/inventory/BoardReportsModal';
import EditBoardModal from '../../components/inventory/EditBoardModal';

export default function UmpInventoryPage() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<BoardInventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<BoardSupplier[]>([]);
  const [analytics, setAnalytics] = useState<BoardAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Dual Warehouse Filter: Delhi vs Kolkata
  const [selectedWarehouse, setSelectedWarehouse] = useState<'ALL' | 'DELHI' | 'KOLKATA'>('ALL');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>('ALL');
  const [selectedThickness, setSelectedThickness] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals state
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Active items
  const [activeBoardItem, setActiveBoardItem] = useState<BoardInventoryItem | null>(null);
  const [activeEditBoard, setActiveEditBoard] = useState<BoardInventoryItem | null>(null);
  const [activeMovement, setActiveMovement] = useState<BoardStockMovement | null>(null);

  // Load UMP data scoped to URINAL_PARTITION_UMP (also URINAL_PARTITION)
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const warehouseParam = selectedWarehouse !== 'ALL' ? selectedWarehouse : undefined;
      const [boardsRes, suppliersRes, analyticsRes] = await Promise.all([
        boardInventoryApi.list({ limit: 100, warehouse: warehouseParam, category: 'URINAL_PARTITION_UMP' }),
        boardInventoryApi.listSuppliers(),
        boardInventoryApi.getAnalytics({ warehouse: warehouseParam, category: 'URINAL_PARTITION_UMP' }),
      ]);

      if (boardsRes.data?.data?.items) {
        setBoards(boardsRes.data.data.items);
      }
      if (suppliersRes.data?.data) {
        setSuppliers(suppliersRes.data.data);
      }
      if (analyticsRes.data?.data) {
        setAnalytics(analyticsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load UMP partition inventory data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fast client-side memoized filter
  const filteredBoards = useMemo(() => {
    return boards.filter((b) => {
      // 0. Warehouse filter
      if (selectedWarehouse !== 'ALL') {
        const itemWarehouse = (b.warehouse || 'DELHI').toUpperCase();
        if (itemWarehouse !== selectedWarehouse) return false;
      }

      // 1. Supplier filter
      if (selectedSupplierName !== 'ALL') {
        const matchesSupplier =
          b.vendorName?.toLowerCase().includes(selectedSupplierName.toLowerCase()) ||
          b.vendor?.party?.tradeName?.toLowerCase().includes(selectedSupplierName.toLowerCase()) ||
          b.vendor?.party?.legalName?.toLowerCase().includes(selectedSupplierName.toLowerCase());
        if (!matchesSupplier) return false;
      }

      // 2. Thickness filter
      if (selectedThickness !== 'ALL') {
        if (b.thickness !== selectedThickness) return false;
      }

      // 3. Status filter
      if (selectedStatus !== 'ALL') {
        if (b.status !== selectedStatus) return false;
      }

      // 4. Search query (matches D.No, Remarks, Finish, Size)
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          b.designNo.toLowerCase().includes(q) ||
          (b.designName && b.designName.toLowerCase().includes(q)) ||
          b.itemCode.toLowerCase().includes(q) ||
          (b.notes && b.notes.toLowerCase().includes(q)) ||
          (b.locationRack && b.locationRack.toLowerCase().includes(q)) ||
          b.size.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [
    boards,
    selectedWarehouse,
    selectedSupplierName,
    selectedThickness,
    selectedStatus,
    search,
  ]);

  const availableThicknesses = useMemo(() => {
    const set = new Set<string>();
    boards.forEach((b) => b.thickness && set.add(b.thickness));
    return Array.from(set).sort();
  }, [boards]);

  const handleDeleteBoard = async (id: string, designNo: string) => {
    if (!window.confirm(`Are you sure you want to remove UMP Partition SKU ${designNo}?`)) return;
    try {
      await boardInventoryApi.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete UMP partition SKU');
    }
  };

  const totalSheetsCount =
    analytics?.totalSheets ?? boards.reduce((acc, b) => acc + Number(b.currentStock), 0);
  const totalValuation =
    analytics?.totalValuation ??
    boards.reduce((acc, b) => acc + Number(b.currentStock) * (Number(b.unitCost) || 0), 0);
  const lowStockCount =
    analytics?.lowStockCount ?? boards.filter((b) => b.status === 'LOW_STOCK').length;
  const outOfStockCount =
    analytics?.outOfStockCount ?? boards.filter((b) => b.status === 'OUT_OF_STOCK').length;

  return (
    <div className="space-y-4 sm:space-y-6 pb-16 px-1 sm:px-0">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Columns className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Urinal Modesty Panel (UMP) Inventory
              </h1>
              <p className="text-[11px] sm:text-xs text-gray-400">
                Urinal Partition Screen & Divider Stock Register (D.No, Opening, Record, Issue & Closing Stock)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Action: Inward Stock */}
          <button
            onClick={() => {
              setActiveBoardItem(null);
              setIsInwardModalOpen(true);
            }}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold shadow-lg shadow-[#7FB706]/20 transition flex items-center gap-1.5 min-h-[44px]"
          >
            <ArrowDownRight className="w-4 h-4" />
            + Inward Stock
          </button>

          {/* Quick Action: Issue Stock */}
          <button
            onClick={() => {
              setActiveBoardItem(null);
              setIsIssueModalOpen(true);
            }}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 min-h-[44px]"
          >
            <ArrowUpRight className="w-4 h-4" />
            Issue Stock
          </button>

          {/* Action: Visual Reports */}
          <button
            onClick={() => setIsReportsModalOpen(true)}
            className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-xs font-semibold transition flex items-center gap-1.5 min-h-[44px]"
          >
            <BarChart3 className="w-4 h-4 text-teal-400" />
            Reports & Export
          </button>

          {/* Action: Audit Ledger */}
          <button
            onClick={() => {
              setActiveBoardItem(null);
              setIsLedgerModalOpen(true);
            }}
            className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-xs font-semibold transition flex items-center gap-1.5 min-h-[44px]"
            title="Complete Movement Audit Trail"
          >
            <History className="w-4 h-4 text-sky-400" />
            Ledger
          </button>

          {/* Action: Add UMP SKU */}
          <button
            onClick={() =>
              navigate(
                `/admin/dashboard/inventory/boards/new?category=URINAL_PARTITION_UMP&warehouse=${
                  selectedWarehouse !== 'ALL' ? selectedWarehouse : 'DELHI'
                }`
              )
            }
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-teal-500/20 transition flex items-center gap-1.5 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            + New UMP SKU
          </button>
        </div>
      </div>

      {/* 2. Stat KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Panels In Hand */}
        <div className="p-3 sm:p-4 bg-[#09071a] border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-gray-400">
            <span>UMP Panels In Hand</span>
            <Columns className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-white font-mono">
            {totalSheetsCount.toLocaleString('en-IN')}{' '}
            <span className="text-[11px] sm:text-xs font-normal text-gray-400">Panels</span>
          </div>
          <div className="mt-1 text-[10px] sm:text-[11px] text-teal-400 font-medium flex items-center gap-1 truncate">
            <span>{boards.length} Total UMP SKUs</span>
          </div>
        </div>

        {/* Valuation */}
        <div className="p-3 sm:p-4 bg-[#09071a] border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-gray-400">
            <span>Valuation</span>
            <span className="text-xs font-bold text-[#B5F823]">INR</span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-[#B5F823] font-mono">
            ₹{totalValuation.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[10px] sm:text-[11px] text-gray-400 truncate">
            Urinal partition asset value
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="p-3 sm:p-4 bg-[#09071a] border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-gray-400">
            <span>Low Stock Warning</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-amber-400 font-mono">
            {lowStockCount}{' '}
            <span className="text-[11px] sm:text-xs font-normal text-gray-400">SKUs</span>
          </div>
          <div className="mt-1 text-[10px] sm:text-[11px] text-amber-400/80 truncate">
            Record level breached
          </div>
        </div>

        {/* Out of Stock */}
        <div className="p-3 sm:p-4 bg-[#09071a] border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-gray-400">
            <span>Out of Stock</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-rose-400 font-mono">
            {outOfStockCount}{' '}
            <span className="text-[11px] sm:text-xs font-normal text-gray-400">SKUs</span>
          </div>
          <div className="mt-1 text-[10px] sm:text-[11px] text-rose-400/80 truncate">
            Immediate dispatch blocked
          </div>
        </div>
      </div>

      {/* 2.5 Dual Warehouse Management Tabs */}
      <div className="bg-[#09071a] border border-white/10 rounded-2xl p-2 sm:p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-400 font-semibold uppercase tracking-wider shrink-0">
          <MapPin className="w-4 h-4 text-teal-400" />
          <span>Warehouse Depot:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          <button
            onClick={() => setSelectedWarehouse('ALL')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[40px] ${
              selectedWarehouse === 'ALL'
                ? 'bg-teal-600 text-white font-extrabold shadow-md shadow-teal-600/20'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
            }`}
          >
            <span>All Depots</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">
              {boards.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedWarehouse('DELHI')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[40px] ${
              selectedWarehouse === 'DELHI'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-300" />
            <span>Delhi Depot (Central)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/10 font-mono">
              {boards.filter((b) => (b.warehouse || 'DELHI').toUpperCase() === 'DELHI').length}
            </span>
          </button>

          <button
            onClick={() => setSelectedWarehouse('KOLKATA')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[40px] ${
              selectedWarehouse === 'KOLKATA'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-300" />
            <span>Kolkata Depot (East)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/10 font-mono">
              {boards.filter((b) => (b.warehouse || '').toUpperCase() === 'KOLKATA').length}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Search and Secondary Filters Toolbar */}
      <div className="bg-[#09071a] border border-white/10 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search UMP: D.No (Design), Size, Remarks, Rack..."
            className="w-full bg-[#121029] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-400 min-h-[40px]"
          />
        </div>

        {/* Thickness Filter */}
        <select
          value={selectedThickness}
          onChange={(e) => setSelectedThickness(e.target.value)}
          className="bg-[#121029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400 min-h-[40px]"
        >
          <option value="ALL">All Thicknesses</option>
          {availableThicknesses.map((th) => (
            <option key={th} value={th}>
              {th}
            </option>
          ))}
        </select>

        {/* Stock Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-[#121029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400 min-h-[40px]"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Healthy Stock</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
        </select>

        {/* Reset / Refresh */}
        <button
          onClick={loadData}
          className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-white/10 transition"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 4. Requested UMP Partition Master Table:
          Fields: "S.No, D.No, Opening Stock, Record, Issue, ClosingStock, Remarks"
      */}
      <div className="bg-[#09071a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0f0c29] border-b border-white/10 text-gray-400 uppercase font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-3 sm:py-3.5 sm:px-4 w-12">S.No</th>
                <th className="py-3 px-3 sm:py-3.5 sm:px-4">D.No</th>
                <th className="py-3 px-3 sm:py-3.5 sm:px-4">Size & Thk</th>
                <th className="py-3 px-3 sm:py-3.5 sm:px-4 text-center">Opening Stock</th>
                <th className="py-3 px-3 sm:py-3.5 sm:px-4 text-center">Record</th>
                <th className="py-3 px-3 sm:py-3.5 sm:px-4 text-center">Issue</th>
                <th className="py-3 px-3 sm:py-3.5 sm:px-4 text-center">ClosingStock</th>
                <th className="py-3 px-3 sm:py-3.5 sm:px-4">Remarks</th>
                <th className="py-3 px-3 sm:py-3.5 sm:px-4 text-center">Warehouse</th>
                <th className="py-3 px-3 sm:py-3.5 sm:px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-400" />
                    Loading Urinal Partition records...
                  </td>
                </tr>
              ) : filteredBoards.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Columns className="w-8 h-8 text-gray-600 mb-1" />
                      <p className="font-semibold text-gray-300">No UMP partition SKUs found</p>
                      <p className="text-xs text-gray-500">
                        Create a new Urinal Modesty Panel SKU to manage opening, record level, and issues
                      </p>
                      <button
                        onClick={() =>
                          navigate(
                            `/admin/dashboard/inventory/boards/new?category=URINAL_PARTITION_UMP&warehouse=${
                              selectedWarehouse !== 'ALL' ? selectedWarehouse : 'DELHI'
                            }`
                          )
                        }
                        className="mt-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition"
                      >
                        + Add First UMP SKU
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBoards.map((b, idx) => {
                  const currStock = Number(b.currentStock);
                  const reorder = Number(b.reorderLevel);
                  const isLow = currStock <= reorder && currStock > 0;
                  const isOut = currStock === 0;

                  return (
                    <tr key={b.id} className="hover:bg-white/[0.03] transition-colors group">
                      {/* S.No */}
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 font-mono text-gray-400 font-semibold">
                        {idx + 1}
                      </td>

                      {/* D.No */}
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-xs sm:text-sm tracking-wide">
                            {b.designNo}
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-gray-400">
                            {b.designName || b.itemCode}
                          </span>
                        </div>
                      </td>

                      {/* Size & Thk */}
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-gray-300">
                        <div className="font-medium text-white">{b.size}</div>
                        <div className="text-[10px] text-gray-400">{b.thickness} - {b.boardType}</div>
                      </td>

                      {/* Opening Stock */}
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-center font-mono text-gray-300">
                        {b.openingStock ?? 0}
                      </td>

                      {/* Record (Reorder Level) */}
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-center font-mono">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs">
                          {reorder}
                        </span>
                      </td>

                      {/* Issue */}
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-center">
                        <button
                          onClick={() => {
                            setActiveBoardItem(b);
                            setIsLedgerModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-sky-400 border border-sky-400/20 text-[11px] font-semibold transition"
                        >
                          View Issue Log
                        </button>
                      </td>

                      {/* ClosingStock */}
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-center font-mono">
                        <span
                          className={`text-sm font-bold ${
                            isOut ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {currStock}
                        </span>
                      </td>

                      {/* Remarks */}
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-gray-300">
                        <span className="text-[11px] text-gray-400">
                          {b.notes || (b.locationRack ? `Rack: ${b.locationRack}` : '—')}
                        </span>
                      </td>

                      {/* Warehouse */}
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
                            (b.warehouse || 'DELHI').toUpperCase() === 'KOLKATA'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                          }`}
                        >
                          {(b.warehouse || 'DELHI').toUpperCase()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit SKU & Stock */}
                          <button
                            onClick={() => {
                              setActiveEditBoard(b);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 transition min-w-[32px] min-h-[32px] flex items-center justify-center"
                            title="Edit SKU & Stock"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Inward */}
                          <button
                            onClick={() => {
                              setActiveBoardItem(b);
                              setIsInwardModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition min-w-[32px] min-h-[32px] flex items-center justify-center"
                            title="Inward Stock"
                          >
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          </button>

                          {/* Issue */}
                          <button
                            onClick={() => {
                              setActiveBoardItem(b);
                              setIsIssueModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition min-w-[32px] min-h-[32px] flex items-center justify-center"
                            title="Issue Stock"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteBoard(b.id, b.designNo)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition min-w-[32px] min-h-[32px] flex items-center justify-center"
                            title="Delete SKU Master"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <StockInwardModal
        isOpen={isInwardModalOpen}
        onClose={() => {
          setIsInwardModalOpen(false);
          setActiveBoardItem(null);
        }}
        onSuccess={loadData}
        initialBoardId={activeBoardItem?.id}
        suppliers={suppliers}
        boards={boards}
      />

      <StockIssueModal
        isOpen={isIssueModalOpen}
        onClose={() => {
          setIsIssueModalOpen(false);
          setActiveBoardItem(null);
        }}
        onSuccess={loadData}
        initialBoardId={activeBoardItem?.id}
        boards={boards}
      />

      <BoardLedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => {
          setIsLedgerModalOpen(false);
          setActiveBoardItem(null);
        }}
        selectedBoard={activeBoardItem}
        onOpenAdjust={(movement: BoardStockMovement) => {
          setActiveMovement(movement);
          setIsAdjustModalOpen(true);
        }}
      />

      <AdjustMovementModal
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setActiveMovement(null);
        }}
        onSuccess={loadData}
        movement={activeMovement}
      />

      {/* Edit Board SKU Modal */}
      <EditBoardModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setActiveEditBoard(null);
        }}
        onSuccess={loadData}
        boardItem={activeEditBoard}
        suppliers={suppliers}
      />

      <BoardReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        boards={boards}
        suppliers={suppliers}
      />
    </div>
  );
}
