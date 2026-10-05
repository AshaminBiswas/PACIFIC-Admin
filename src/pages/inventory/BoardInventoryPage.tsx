import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Layers,
  Search,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  History,
  FileText,
  BarChart3,
  Building2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  MoreVertical,
  Edit2,
  Trash2,
  PackageCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  RotateCcw,
  X,
} from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
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
import CreateBoardModal from '../../components/inventory/CreateBoardModal';
import EditBoardModal from '../../components/inventory/EditBoardModal';
import BoardLedgerModal from '../../components/inventory/BoardLedgerModal';
import BoardReportsModal from '../../components/inventory/BoardReportsModal';

const COMMON_SIZES = [
  '1220x2440mm (4x8ft)',
  '1830x3660mm (6x12ft)',
  '1525x3660mm (5x12ft)',
  '1220x1830mm (4x6ft)',
  '1525x1830mm (5x6ft)',
];

const COMMON_THICKNESSES = ['12mm', '18mm', '13mm', '9mm', '6mm', '3mm', '25mm'];

export default function BoardInventoryPage() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<BoardInventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<BoardSupplier[]>(() => boardInventoryApi.getCachedSuppliersSync() || []);
  const [analytics, setAnalytics] = useState<BoardAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters State
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>('ALL');
  const [selectedSize, setSelectedSize] = useState<string>('ALL');
  const [selectedThickness, setSelectedThickness] = useState<string>('ALL');
  const [selectedBoardType, setSelectedBoardType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals state
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Selected item for specific modals
  const [activeBoardItem, setActiveBoardItem] = useState<BoardInventoryItem | null>(null);
  const [activeEditBoard, setActiveEditBoard] = useState<BoardInventoryItem | null>(null);
  const [activeMovement, setActiveMovement] = useState<BoardStockMovement | null>(null);

  // Reset pagination to page 1 whenever any filter or search changes
  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    selectedWarehouse,
    selectedSupplierName,
    selectedSize,
    selectedThickness,
    selectedBoardType,
    selectedStatus,
  ]);

  // Load all data with server-side pagination and filters
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const warehouseParam = selectedWarehouse !== 'ALL' ? selectedWarehouse : undefined;
      const vendorNameParam = selectedSupplierName !== 'ALL' ? selectedSupplierName : undefined;
      const sizeParam = selectedSize !== 'ALL' ? selectedSize : undefined;
      const thicknessParam = selectedThickness !== 'ALL' ? selectedThickness : undefined;
      const boardTypeParam = selectedBoardType !== 'ALL' ? selectedBoardType : undefined;
      const statusParam = selectedStatus !== 'ALL' ? selectedStatus : undefined;
      const searchParam = debouncedSearch.trim() || undefined;

      const [boardsRes, suppliersRes, analyticsRes] = await Promise.all([
        boardInventoryApi.list({
          page,
          limit: pageSize,
          warehouse: warehouseParam,
          vendorName: vendorNameParam,
          size: sizeParam,
          thickness: thicknessParam,
          boardType: boardTypeParam,
          status: statusParam,
          search: searchParam,
          category: 'RESTROOM_CUBICLE',
        }),
        boardInventoryApi.listSuppliers(),
        boardInventoryApi.getAnalytics({ warehouse: warehouseParam, category: 'RESTROOM_CUBICLE' }),
      ]);

      if (boardsRes.data?.data) {
        const resp = boardsRes.data.data;
        const items = resp.items || [];
        setBoards(items);
        const total = resp.total ?? (resp as any).pagination?.total ?? items.length;
        setTotalRecords(total);
        const pages = resp.totalPages ?? (resp as any).pagination?.totalPages ?? Math.max(1, Math.ceil(total / pageSize));
        setTotalPages(pages);
      }
      if (suppliersRes.data?.data) {
        setSuppliers(suppliersRes.data.data);
      }
      if (analyticsRes.data?.data) {
        setAnalytics(analyticsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load board inventory data:', err);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    debouncedSearch,
    selectedWarehouse,
    selectedSupplierName,
    selectedSize,
    selectedThickness,
    selectedBoardType,
    selectedStatus,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dynamic dropdown values
  const availableSizes = useMemo(() => {
    const set = new Set<string>(COMMON_SIZES);
    boards.forEach((b) => b.size && set.add(b.size));
    return Array.from(set).sort();
  }, [boards]);

  const availableThicknesses = useMemo(() => {
    const set = new Set<string>(COMMON_THICKNESSES);
    boards.forEach((b) => b.thickness && set.add(b.thickness));
    return Array.from(set).sort();
  }, [boards]);

  const availableBoardTypes = useMemo(() => {
    const set = new Set<string>();
    boards.forEach((b) => b.boardType && set.add(b.boardType));
    return Array.from(set).sort();
  }, [boards]);

  const handleClearFilters = () => {
    setSearch('');
    setSelectedWarehouse('ALL');
    setSelectedSupplierName('ALL');
    setSelectedSize('ALL');
    setSelectedThickness('ALL');
    setSelectedBoardType('ALL');
    setSelectedStatus('ALL');
    setPage(1);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);
      if (page <= 2) end = 4;
      if (page >= totalPages - 1) start = totalPages - 3;
      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  // Delete Board SKU
  const handleDeleteBoard = async (id: string, designNo: string) => {
    if (!window.confirm(`Are you sure you want to remove Board SKU ${designNo}?`)) return;
    try {
      await boardInventoryApi.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete board');
    }
  };

  // KPIs
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
            <div className="p-2 rounded-xl bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Restroom Board Inventory
              </h1>
              <p className="text-[11px] sm:text-xs text-gray-400">
                Raw Material & Compact Board Stock Register (Royal Crown, Stylam, Merino, Action Tesa)
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

          {/* Quick Action: Manual Issue */}
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
            <BarChart3 className="w-4 h-4 text-[#B5F823]" />
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

          {/* Action: Add SKU Master (Dedicated Full Page) */}
          <button
            onClick={() =>
              navigate(
                `/admin/dashboard/inventory/boards/new?category=RESTROOM_CUBICLE&warehouse=${
                  selectedWarehouse !== 'ALL' ? selectedWarehouse : 'DELHI'
                }`
              )
            }
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-extrabold text-xs shadow-lg shadow-[#7FB706]/20 transition flex items-center gap-1.5 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            + New SKU Page
          </button>
        </div>
      </div>

      {/* 2. Stat KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Sheets In Hand */}
        <div className="p-3 sm:p-4 bg-[#09071a] border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-gray-400">
            <span>Stock In Hand</span>
            <Layers className="w-4 h-4 text-[#7FB706]" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-white font-mono">
            {totalSheetsCount.toLocaleString('en-IN')}{' '}
            <span className="text-[11px] sm:text-xs font-normal text-gray-400">Sheets</span>
          </div>
          <div className="mt-1 text-[10px] sm:text-[11px] text-[#7FB706] font-medium flex items-center gap-1 truncate">
            <span>{boards.length} Total SKUs across {suppliers.length} Master Suppliers</span>
          </div>
        </div>

        {/* Total Valuation */}
        <div className="p-3 sm:p-4 bg-[#09071a] border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-gray-400">
            <span>Inventory Valuation</span>
            <span className="text-xs font-bold text-[#B5F823]">INR</span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-[#B5F823] font-mono">
            ₹{totalValuation.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[10px] sm:text-[11px] text-gray-400 truncate">
            Raw material asset valuation
          </div>
        </div>

        {/* Low Stock Alerts */}
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
            Stock below reorder threshold
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
            Immediate procurement needed
          </div>
        </div>
      </div>

      {/* 3. Unified Clean Horizontal Filters Toolbar (Desktop 1-Row / Mobile Responsive) */}
      <div className="bg-[#09071a] border border-white/10 rounded-2xl p-3 sm:p-4 shadow-lg">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 sm:gap-3">
          {/* Filter 1: Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Design No, Finish, SKU, Batch, Rack..."
              className="w-full h-10 bg-[#121029] border border-white/10 rounded-xl pl-9 pr-8 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter 2: Warehouse / Depot */}
          <div className="w-full sm:w-auto min-w-[150px]">
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full h-10 bg-[#121029] border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-[#7FB706] transition cursor-pointer"
            >
              <option value="ALL">All Warehouses / Depots</option>
              <option value="DELHI">Delhi Depot (Central)</option>
              <option value="KOLKATA">Kolkata Depot (East)</option>
            </select>
          </div>

          {/* Filter 3: Supplier */}
          <div className="w-full sm:w-auto min-w-[160px]">
            <select
              value={selectedSupplierName}
              onChange={(e) => setSelectedSupplierName(e.target.value)}
              className="w-full h-10 bg-[#121029] border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-[#7FB706] transition cursor-pointer"
            >
              <option value="ALL">All Suppliers</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.name}>
                  {sup.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 4: Size */}
          <div className="w-full sm:w-auto min-w-[140px]">
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              className="w-full h-10 bg-[#121029] border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-[#7FB706] transition cursor-pointer"
            >
              <option value="ALL">All Sizes</option>
              {availableSizes.map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 5: Thickness */}
          <div className="w-full sm:w-auto min-w-[130px]">
            <select
              value={selectedThickness}
              onChange={(e) => setSelectedThickness(e.target.value)}
              className="w-full h-10 bg-[#121029] border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-[#7FB706] transition cursor-pointer"
            >
              <option value="ALL">All Thicknesses</option>
              {availableThicknesses.map((th) => (
                <option key={th} value={th}>
                  {th}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 6: Status */}
          <div className="w-full sm:w-auto min-w-[130px]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-10 bg-[#121029] border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-[#7FB706] transition cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Healthy Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>

          {/* Actions: Clear Filters & Refresh */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleClearFilters}
              className="h-10 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition flex items-center justify-center gap-1.5 whitespace-nowrap"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>

            <button
              onClick={loadData}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition shrink-0"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Master Data Table */}
      <div className="bg-[#09071a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0f0c29] border-b border-white/10 text-gray-400 uppercase font-semibold tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-12">Sl No</th>
                <th className="py-3.5 px-4">Design No & Finish</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Size & Thickness</th>
                <th className="py-3.5 px-4">Board Type</th>
                <th className="py-3.5 px-4 text-center">Opening</th>
                <th className="py-3.5 px-4 text-center">Closing Stock</th>
                <th className="py-3.5 px-4 text-center">Issue Details</th>
                <th className="py-3.5 px-4 text-center">Reorder</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#7FB706]" />
                    Loading board inventory records...
                  </td>
                </tr>
              ) : boards.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-gray-400">
                    No board SKUs match the selected criteria.
                  </td>
                </tr>
              ) : (
                boards.map((b, idx) => {
                  const currStock = Number(b.currentStock);
                  const reorder = Number(b.reorderLevel);
                  const stockHealthPct = Math.min(100, Math.round((currStock / (reorder * 3)) * 100));

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-white/[0.03] transition-colors group"
                    >
                      {/* Sl No */}
                      <td className="py-3.5 px-4 font-mono text-gray-400 font-semibold">
                        {(page - 1) * pageSize + idx + 1}
                      </td>

                      {/* Design No & Finish */}
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs sm:text-sm tracking-wide">
                              {b.designNo}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${
                                (b.warehouse || 'DELHI').toUpperCase() === 'KOLKATA'
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                  : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                              }`}
                            >
                              {(b.warehouse || 'DELHI').toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-[11px] text-gray-400">
                            {b.designName || b.itemCode}
                          </span>
                          {b.locationRack && (
                            <span className="text-[10px] text-sky-400 mt-0.5">
                              Rack: {b.locationRack}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 text-gray-200 border border-white/10">
                          <Building2 className="w-3 h-3 text-[#7FB706]" />
                          {b.vendorName || b.vendor?.party?.tradeName || 'Supplier'}
                        </span>
                      </td>

                      {/* Size & Thickness */}
                      <td className="py-3.5 px-4 text-gray-300">
                        <div className="font-medium text-white">{b.thickness}</div>
                        <div className="text-[11px] text-gray-400">{b.size}</div>
                      </td>

                      {/* Board Type */}
                      <td className="py-3.5 px-4">
                        <span className="text-gray-300 font-medium">{b.boardType}</span>
                      </td>

                      {/* Opening Stock */}
                      <td className="py-3.5 px-4 text-center font-mono text-gray-400">
                        {b.openingStock}
                      </td>

                      {/* Closing Stock */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`font-mono text-sm font-black ${
                              currStock === 0
                                ? 'text-rose-400'
                                : currStock <= reorder
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {currStock} sheets
                          </span>
                          {/* Mini visual indicator */}
                          <div className="w-16 h-1.5 rounded-full bg-white/10 mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                currStock === 0
                                ? 'bg-rose-500'
                                : currStock <= reorder
                                ? 'bg-amber-400'
                                : 'bg-[#7FB706]'
                              }`}
                              style={{ width: `${Math.max(5, stockHealthPct)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Issue Details */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            setActiveBoardItem(b);
                            setIsLedgerModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-1 rounded-lg transition"
                          title="Click to view full issue history & edit deductions"
                        >
                          <History className="w-3 h-3" />
                          {b.totalIssued} issued
                        </button>
                      </td>

                      {/* Reorder Level */}
                      <td className="py-3.5 px-4 text-center font-mono text-gray-300">
                        {b.reorderLevel}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${
                            b.status === 'OUT_OF_STOCK'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : b.status === 'LOW_STOCK'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {b.status === 'ACTIVE' ? 'HEALTHY' : b.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit SKU & Stock (Dedicated New Page) */}
                          <Link
                            to={`/admin/dashboard/inventory/boards/${b.id}/edit`}
                            className="p-1.5 text-sky-400 hover:text-white hover:bg-sky-500/20 rounded-lg transition inline-flex items-center justify-center min-w-[32px] min-h-[32px]"
                            title="Edit SKU specifications & stock (opens new page)"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>

                          {/* Quick Inward */}
                          <button
                            onClick={() => {
                              setActiveBoardItem(b);
                              setIsInwardModalOpen(true);
                            }}
                            className="p-1.5 text-emerald-400 hover:text-white hover:bg-emerald-500/20 rounded-lg transition"
                            title="Add stock inward"
                          >
                            <ArrowDownRight className="w-4 h-4" />
                          </button>

                          {/* Quick Issue */}
                          <button
                            onClick={() => {
                              setActiveBoardItem(b);
                              setIsIssueModalOpen(true);
                            }}
                            className="p-1.5 text-amber-400 hover:text-white hover:bg-amber-500/20 rounded-lg transition"
                            title="Issue stock"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>

                          {/* Audit Ledger */}
                          <button
                            onClick={() => {
                              setActiveBoardItem(b);
                              setIsLedgerModalOpen(true);
                            }}
                            className="p-1.5 text-sky-400 hover:text-white hover:bg-sky-500/20 rounded-lg transition"
                            title="Audit history"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteBoard(b.id, b.designNo)}
                            className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-lg transition"
                            title="Delete SKU"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Server-Side Pagination Controls */}
        <div className="p-3.5 sm:p-4 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-400 bg-[#0c0a22]/50">
          {/* Left: Records per page & Total count */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-[#121029] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#7FB706] cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
            </div>

            <span className="text-[11px]">
              Showing <strong className="text-white">{totalRecords > 0 ? (page - 1) * pageSize + 1 : 0}</strong>–
              <strong className="text-white">{Math.min(page * pageSize, totalRecords)}</strong> of{' '}
              <strong className="text-white">{totalRecords}</strong> board SKUs
            </span>
          </div>

          {/* Right: Pagination Navigation Controls */}
          <div className="flex items-center gap-1.5 w-full md:w-auto justify-center md:justify-end">
            {/* Previous */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold transition flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((pNum, idx) =>
                pNum === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1.5 text-gray-500 select-none">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${pNum}`}
                    onClick={() => setPage(Number(pNum))}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                      page === pNum
                        ? 'bg-[#7FB706] text-white shadow-md shadow-[#7FB706]/30'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                    }`}
                  >
                    {pNum}
                  </button>
                )
              )}
            </div>

            {/* Next */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold transition flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Modals */}
      {/* Stock Inward Modal */}
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

      {/* Stock Issue Modal */}
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

      {/* Create Board Modal */}
      <CreateBoardModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadData}
        suppliers={suppliers}
      />

      {/* Audit Ledger Modal */}
      <BoardLedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => {
          setIsLedgerModalOpen(false);
          setActiveBoardItem(null);
        }}
        selectedBoard={activeBoardItem}
        onOpenAdjust={(movement) => {
          setActiveMovement(movement);
          setIsAdjustModalOpen(true);
        }}
      />

      {/* Adjust Movement Modal (Editable auto-deductions) */}
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

      {/* Visual Reports & Excel/PDF Modal */}
      <BoardReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        boards={boards}
        suppliers={suppliers}
      />
    </div>
  );
}
