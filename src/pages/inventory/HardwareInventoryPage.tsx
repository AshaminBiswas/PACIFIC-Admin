import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Wrench,
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
  Truck,
  Sliders,
  Sparkles,
  Layers,
  Hash,
  ClipboardList,
  FileSpreadsheet,
  Download,
  Filter,
} from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { hardwareInventoryApi } from '../../api/hardwareInventoryApi';
import { exportComprehensiveHardwareReport } from '../../utils/hardwareExcelExport';
import type {
  HardwareInventoryItem,
  HardwareBranch,
  HardwareVendor,
  HardwareAnalyticsSummary,
  HardwareStockMovement,
} from '../../types/admin';
import CreateHardwareModal from '../../components/hardware/CreateHardwareModal';
import HardwareInwardModal from '../../components/hardware/HardwareInwardModal';
import HardwareIssueModal from '../../components/hardware/HardwareIssueModal';
import HardwareAdjustModal from '../../components/hardware/HardwareAdjustModal';
import HardwareLedgerModal from '../../components/hardware/HardwareLedgerModal';
import HardwareReportsModal from '../../components/hardware/HardwareReportsModal';
import HardwareVendorsModal from '../../components/hardware/HardwareVendorsModal';
import BranchManagerModal from '../../components/hardware/BranchManagerModal';
import EditHardwareModal from '../../components/hardware/EditHardwareModal';
import HardwareIssueHistoryModal from '../../components/hardware/HardwareIssueHistoryModal';
import HardwareInwardHistoryModal from '../../components/hardware/HardwareInwardHistoryModal';

export default function HardwareInventoryPage() {
  const navigate = useNavigate();

  // Master Data State
  const [items, setItems] = useState<HardwareInventoryItem[]>([]);
  const [branches, setBranches] = useState<HardwareBranch[]>([]);
  const [vendors, setVendors] = useState<HardwareVendor[]>([]);
  const [analytics, setAnalytics] = useState<HardwareAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter State
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('ALL');
  const [selectedColor, setSelectedColor] = useState<string>('ALL');
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDia, setSelectedDia] = useState<string>('ALL');
  const [selectedLength, setSelectedLength] = useState<string>('ALL');
  const [selectedWidth, setSelectedWidth] = useState<string>('ALL');
  const [dimensionOptions, setDimensionOptions] = useState<{
    dias: string[];
    lengths: string[];
    widths: string[];
  }>({ dias: [], lengths: [], widths: [] });

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isVendorsModalOpen, setIsVendorsModalOpen] = useState(false);
  const [isBranchesModalOpen, setIsBranchesModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isIssueHistoryModalOpen, setIsIssueHistoryModalOpen] = useState(false);
  const [selectedHistorySkuId, setSelectedHistorySkuId] = useState<string | null>(null);
  const [isInwardHistoryModalOpen, setIsInwardHistoryModalOpen] = useState(false);
  const [selectedInwardHistorySkuId, setSelectedInwardHistorySkuId] = useState<string | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Active item for targeted modals
  const [activeItem, setActiveItem] = useState<HardwareInventoryItem | null>(null);

  const activeFilters = useMemo(
    () => ({
      branch: selectedBranch,
      material: selectedMaterial,
      color: selectedColor,
      unit: selectedUnit,
      vendorId: selectedVendorId,
      vendorName:
        selectedVendorId !== 'ALL'
          ? vendors.find((v) => v.id === selectedVendorId)?.name
          : undefined,
      status: selectedStatus,
      search: debouncedSearch.trim() || undefined,
      dia: selectedDia,
      length: selectedLength,
      width: selectedWidth,
    }),
    [
      selectedBranch,
      selectedMaterial,
      selectedColor,
      selectedUnit,
      selectedVendorId,
      selectedStatus,
      debouncedSearch,
      selectedDia,
      selectedLength,
      selectedWidth,
      vendors,
    ]
  );

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() ||
    selectedBranch !== 'ALL' ||
    selectedMaterial !== 'ALL' ||
    selectedColor !== 'ALL' ||
    selectedUnit !== 'ALL' ||
    selectedVendorId !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedDia !== 'ALL' ||
    selectedLength !== 'ALL' ||
    selectedWidth !== 'ALL'
  );

  const handleExportExcel = async (mode: 'FILTERED' | 'ALL' = 'FILTERED') => {
    try {
      setIsExportingExcel(true);
      setShowExportMenu(false);

      if (mode === 'FILTERED' && hasActiveFilters) {
        // Fetch matching items with current active filter (up to 5000)
        const [filteredRes, movRes] = await Promise.all([
          hardwareInventoryApi.list({
            page: 1,
            limit: 5000,
            search: debouncedSearch.trim() || undefined,
            warehouse: selectedBranch !== 'ALL' ? selectedBranch : undefined,
            material: selectedMaterial !== 'ALL' ? selectedMaterial : undefined,
            color: selectedColor !== 'ALL' ? selectedColor : undefined,
            unit: selectedUnit !== 'ALL' ? selectedUnit : undefined,
            vendorId: selectedVendorId !== 'ALL' ? selectedVendorId : undefined,
            status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
            dia: selectedDia !== 'ALL' ? selectedDia : undefined,
            length: selectedLength !== 'ALL' ? selectedLength : undefined,
            width: selectedWidth !== 'ALL' ? selectedWidth : undefined,
          }),
          hardwareInventoryApi.getMovements({
            warehouse: selectedBranch !== 'ALL' ? selectedBranch : undefined,
            limit: 5000,
          }),
        ]);

        const exportItems = filteredRes.data?.data?.items || items;
        const exportMovements = movRes.data?.data || [];

        exportComprehensiveHardwareReport({
          items: exportItems,
          branches,
          vendors,
          movements: exportMovements,
          activeFilters,
          selectedBranch,
        });
      } else {
        // Full Consolidated Database
        const [allInventoryRes, movRes] = await Promise.all([
          hardwareInventoryApi.list({ limit: 5000 }),
          hardwareInventoryApi.getMovements({ limit: 5000 }),
        ]);

        const exportItems = allInventoryRes.data?.data?.items || items;
        const exportMovements = movRes.data?.data || [];

        exportComprehensiveHardwareReport({
          items: exportItems,
          branches,
          vendors,
          movements: exportMovements,
          selectedBranch: 'ALL',
        });
      }
    } catch (err) {
      console.error('Failed to export hardware Excel report:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Reset pagination on filter change
  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    selectedBranch,
    selectedMaterial,
    selectedColor,
    selectedUnit,
    selectedVendorId,
    selectedStatus,
    selectedDia,
    selectedLength,
    selectedWidth,
  ]);

  // Load static reference metadata (branches, vendors, dimension options)
  const loadMetadata = useCallback(async () => {
    try {
      const [branchesRes, vendorsRes, dimRes] = await Promise.all([
        hardwareInventoryApi.listBranches(),
        hardwareInventoryApi.listVendors(),
        hardwareInventoryApi.getDistinctDimensions(),
      ]);
      if (branchesRes.data?.data) {
        setBranches(branchesRes.data.data);
      }
      if (vendorsRes.data?.data) {
        setVendors(vendorsRes.data.data);
      }
      if (dimRes?.data?.data) {
        setDimensionOptions(dimRes.data.data);
      }
    } catch (err) {
      console.warn('Failed to load static hardware metadata:', err);
    }
  }, []);

  // Load hardware inventory data (items only) — egress-optimized
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const itemsRes = await hardwareInventoryApi.list({
        page,
        limit: pageSize,
        search: debouncedSearch.trim() || undefined,
        warehouse: selectedBranch !== 'ALL' ? selectedBranch : undefined,
        material: selectedMaterial !== 'ALL' ? selectedMaterial : undefined,
        color: selectedColor !== 'ALL' ? selectedColor : undefined,
        unit: selectedUnit !== 'ALL' ? selectedUnit : undefined,
        vendorId: selectedVendorId !== 'ALL' ? selectedVendorId : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        dia: selectedDia !== 'ALL' ? selectedDia : undefined,
        length: selectedLength !== 'ALL' ? selectedLength : undefined,
        width: selectedWidth !== 'ALL' ? selectedWidth : undefined,
      });

      if (itemsRes.data?.data) {
        setItems(itemsRes.data.data.items || []);
        setTotalRecords(itemsRes.data.data.total || 0);
        setTotalPages(itemsRes.data.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load hardware inventory data:', err);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    debouncedSearch,
    selectedBranch,
    selectedMaterial,
    selectedColor,
    selectedUnit,
    selectedVendorId,
    selectedStatus,
    selectedDia,
    selectedLength,
    selectedWidth,
  ]);

  // Load hardware analytics — only runs when branch changes or after mutations
  const loadAnalytics = useCallback(async () => {
    try {
      const analyticsRes = await hardwareInventoryApi.getAnalytics({
        warehouse: selectedBranch !== 'ALL' ? selectedBranch : undefined,
      });
      if (analyticsRes.data?.data) {
        setAnalytics(analyticsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load hardware analytics:', err);
    }
  }, [selectedBranch]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    // Automatically purge any dummy demo items from browser storage on mount
    hardwareInventoryApi.purgeDummyData().finally(() => {
      loadData();
    });
  }, [loadData]);


  const handleDeleteItem = async (id: string, sku: string, name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete hardware SKU [${sku}] ${name}? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await hardwareInventoryApi.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete hardware item');
    }
  };

  const handleOpenInwardForItem = (item: HardwareInventoryItem) => {
    setActiveItem(item);
    setIsInwardModalOpen(true);
  };

  const handleOpenIssueForItem = (item: HardwareInventoryItem) => {
    setActiveItem(item);
    setIsIssueModalOpen(true);
  };

  const handleOpenAdjustForItem = (item: HardwareInventoryItem) => {
    setActiveItem(item);
    setIsAdjustModalOpen(true);
  };

  const handleOpenEditForItem = (item: HardwareInventoryItem) => {
    setActiveItem(item);
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#7FB706]">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                Hardware Inventory Master
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Multi-branch stock tracking for SS, Aluminium, and Nylon cubicle fittings
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh */}
          <button
            type="button"
            onClick={loadData}
            title="Refresh inventory"
            className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/10 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#7FB706]' : ''}`} />
          </button>

          {/* Vendors */}
          <button
            type="button"
            onClick={() => setIsVendorsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold rounded-xl border border-white/10 transition-colors cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5 text-[#B5F823]" />
            Vendors ({vendors.length})
          </button>

          {/* Branches */}
          <button
            type="button"
            onClick={() => setIsBranchesModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold rounded-xl border border-white/10 transition-colors cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-[#7FB706]" />
            Branches ({branches.length})
          </button>

          {/* Reports */}
          <button
            type="button"
            onClick={() => setIsReportsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold rounded-xl border border-white/10 transition-colors cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
            Reports
          </button>

          {/* Export Excel Reports (Filter-Wise & Consolidated Master) */}
          <div className="relative">
            <div className="inline-flex items-center rounded-xl overflow-hidden shadow-sm shadow-[#7FB706]/20 border border-[#7FB706]">
              {/* Primary Download Button */}
              <button
                type="button"
                disabled={isExportingExcel}
                onClick={() => handleExportExcel(hasActiveFilters ? 'FILTERED' : 'ALL')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                title={
                  hasActiveFilters
                    ? `Download filtered Excel report (${totalRecords} matching SKUs)`
                    : 'Download consolidated master Excel report (.xlsx)'
                }
              >
                {isExportingExcel ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                )}
                <span>
                  {hasActiveFilters ? `Export Filtered (${totalRecords})` : 'Export Excel'}
                </span>
              </button>

              {/* Dropdown Options Toggle */}
              <button
                type="button"
                disabled={isExportingExcel}
                onClick={() => setShowExportMenu((prev) => !prev)}
                className="px-2 py-2 bg-[#75a805] hover:bg-[#689604] text-[#030213] border-l border-[#689604] transition-colors cursor-pointer disabled:opacity-50"
                title="Choose export scope (Filtered vs Full Database)"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    showExportMenu ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {/* Dropdown Menu */}
            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-[#121029] border border-white/15 rounded-xl shadow-2xl z-40 p-2 text-xs">
                  <div className="px-3 py-2 border-b border-white/10">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-[#7FB706]" />
                      <span>Hardware Excel (.xlsx) Reports</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      {hasActiveFilters ? (
                        <span className="text-[#B5F823]">
                          Filters: {[
                            selectedBranch !== 'ALL' ? `Branch: ${selectedBranch}` : null,
                            selectedMaterial !== 'ALL' ? `Material: ${selectedMaterial}` : null,
                            selectedStatus !== 'ALL' ? `Status: ${selectedStatus}` : null,
                            selectedColor !== 'ALL' ? `Color: ${selectedColor}` : null,
                            debouncedSearch ? `Search: "${debouncedSearch}"` : null,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      ) : (
                        <span>Full consolidated database (all branches & items)</span>
                      )}
                    </div>
                  </div>

                  <div className="py-1 space-y-1">
                    {/* Option 1: Filtered Export */}
                    <button
                      type="button"
                      onClick={() => handleExportExcel('FILTERED')}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg flex items-center justify-between text-gray-200 hover:text-white transition-colors cursor-pointer group"
                    >
                      <div>
                        <div className="font-semibold flex items-center gap-1.5 text-white">
                          <Filter className="w-3.5 h-3.5 text-[#B5F823]" />
                          <span>Download Filtered SKUs</span>
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {totalRecords} SKUs matching your active filters
                        </div>
                      </div>
                      <Download className="w-4 h-4 text-gray-400 group-hover:text-[#B5F823] transition-colors" />
                    </button>

                    {/* Option 2: Full Consolidated Database */}
                    <button
                      type="button"
                      onClick={() => handleExportExcel('ALL')}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg flex items-center justify-between text-gray-200 hover:text-white transition-colors cursor-pointer group"
                    >
                      <div>
                        <div className="font-semibold flex items-center gap-1.5 text-white">
                          <Building2 className="w-3.5 h-3.5 text-blue-400" />
                          <span>Download Full Master Database</span>
                        </div>
                        <div className="text-[10px] text-gray-400">
                          All 5 sheets across all branches & suppliers
                        </div>
                      </div>
                      <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" />
                    </button>

                    {/* Option 3: Reports Studio Modal */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowExportMenu(false);
                        setIsReportsModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg flex items-center justify-between text-gray-200 hover:text-white transition-colors cursor-pointer group border-t border-white/5 pt-2"
                    >
                      <div>
                        <div className="font-semibold flex items-center gap-1.5 text-gray-300">
                          <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                          <span>Open Reports Studio</span>
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Visual breakdown, print sheets & modular exports
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Ledger */}
          <button
            type="button"
            onClick={() => setIsLedgerModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold rounded-xl border border-white/10 transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            Ledger
          </button>

          {/* Stock Inward */}
          <button
            type="button"
            onClick={() => {
              setActiveItem(null);
              setIsInwardModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 transition-colors cursor-pointer"
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            Stock Inward
          </button>

          {/* Inward History (All SKUs) */}
          <button
            type="button"
            onClick={() => {
              setSelectedInwardHistorySkuId(null);
              setIsInwardHistoryModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#B5F823] text-xs font-bold rounded-xl border border-emerald-500/30 transition-colors cursor-pointer"
          >
            <ArrowDownRight className="w-3.5 h-3.5 text-[#B5F823]" />
            Inward History (All SKUs)
          </button>

          {/* Issue Hardware */}
          <button
            type="button"
            onClick={() => {
              setActiveItem(null);
              setIsIssueModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Issue Stock
          </button>

          {/* Issue Details & History (All SKUs) */}
          <button
            type="button"
            onClick={() => {
              setSelectedHistorySkuId(null);
              setIsIssueHistoryModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 transition-colors cursor-pointer"
          >
            <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
            Issue Details (All SKUs)
          </button>


          {/* New Hardware SKU */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            New Hardware SKU
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-[#121029] border border-white/10 rounded-xl">
          <div className="text-[10px] sm:text-xs font-semibold uppercase text-gray-400">Total SKUs</div>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono mt-1">
            {analytics?.totalSkus || totalRecords}
          </div>
          <div className="text-[10px] text-gray-500">Across catalog</div>
        </div>

        <div className="p-3.5 bg-[#121029] border border-white/10 rounded-xl">
          <div className="text-[10px] sm:text-xs font-semibold uppercase text-gray-400">Units in Stock</div>
          <div className="text-xl sm:text-2xl font-bold text-[#B5F823] font-mono mt-1">
            {analytics?.totalUnits.toLocaleString('en-IN') || 0}
          </div>
          <div className="text-[10px] text-gray-500">Available count</div>
        </div>

        <div className="p-3.5 bg-[#121029] border border-white/10 rounded-xl">
          <div className="text-[10px] sm:text-xs font-semibold uppercase text-gray-400">Stock Valuation</div>
          <div className="text-xl sm:text-2xl font-bold text-[#7FB706] font-mono mt-1">
            ₹{analytics?.totalValuation.toLocaleString('en-IN') || 0}
          </div>
          <div className="text-[10px] text-gray-500">Inventory value</div>
        </div>

        <div className="p-3.5 bg-[#121029] border border-amber-500/20 rounded-xl">
          <div className="text-[10px] sm:text-xs font-semibold uppercase text-amber-400">Low Stock</div>
          <div className="text-xl sm:text-2xl font-bold text-amber-400 font-mono mt-1">
            {analytics?.lowStockCount || 0}
          </div>
          <div className="text-[10px] text-amber-400/70">Needs reorder</div>
        </div>

        <div className="p-3.5 bg-[#121029] border border-red-500/20 rounded-xl">
          <div className="text-[10px] sm:text-xs font-semibold uppercase text-red-400">Out of Stock</div>
          <div className="text-xl sm:text-2xl font-bold text-red-400 font-mono mt-1">
            {analytics?.outOfStockCount || 0}
          </div>
          <div className="text-[10px] text-red-400/70">Zero inventory</div>
        </div>

        <div className="p-3.5 bg-[#121029] border border-white/10 rounded-xl">
          <div className="text-[10px] sm:text-xs font-semibold uppercase text-gray-400">Active Branches</div>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono mt-1">
            {branches.length}
          </div>
          <div className="text-[10px] text-gray-500">Regional hubs</div>
        </div>
      </div>

      {/* Multi-Filter Bar */}
      <div className="p-4 bg-[#121029] border border-white/10 rounded-2xl space-y-3">
        {/* Branch Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-white/5">
          <span className="text-xs font-semibold text-gray-400 mr-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-[#7FB706]" />
            Branch:
          </span>
          <button
            type="button"
            onClick={() => setSelectedBranch('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedBranch === 'ALL'
                ? 'bg-[#7FB706] text-white shadow-md shadow-[#7FB706]/20'
                : 'bg-white/5 text-gray-300 hover:text-white'
            }`}
          >
            All Branches
          </button>
          {branches.map((b) => {
            const isSelected = selectedBranch.toUpperCase() === b.code.toUpperCase();
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBranch(b.code)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#7FB706] text-white shadow-md shadow-[#7FB706]/20'
                    : 'bg-white/5 text-gray-300 hover:text-white'
                }`}
              >
                {b.name.split(' ')[0]} ({b.code})
              </button>
            );
          })}
        </div>

        {/* Secondary Filters row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5">
          {/* Search */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search SKU, name, HSN, vendor, rack..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#030213] border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white focus:outline-none"
            />
          </div>

          {/* Material */}
          <select
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value)}
            className="px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs text-gray-300 focus:outline-none"
          >
            <option value="ALL">All Materials</option>
            <option value="STAINLESS_STEEL">Stainless Steel (SS)</option>
            <option value="ALUMINIUM">Aluminium</option>
            <option value="NYLON">Nylon</option>
            <option value="CUSTOM">Custom Material</option>
          </select>

          {/* Colour */}
          <select
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs text-gray-300 focus:outline-none"
          >
            <option value="ALL">All Colours</option>
            <option value="Black">Black</option>
            <option value="Golden">Golden</option>
            <option value="Stainless Steel">Stainless Steel</option>
            <option value="Aluminium colour">Aluminium colour</option>
          </select>

          {/* Unit */}
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs text-gray-300 focus:outline-none"
          >
            <option value="ALL">All Units</option>
            <option value="No's">No's</option>
            <option value="Meters">Meters</option>
            <option value="Set's">Set's</option>
          </select>

          {/* Stock Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs text-gray-300 focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active (In Stock)</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>

        {/* Dimension Filters Strip (Dia, Length, Width) */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
            <Sliders className="w-3.5 h-3.5 text-[#B5F823]" />
            <span>Dimension Filters:</span>
          </div>

          {/* Dia (Diameter) Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-gray-400 font-medium">Dia:</label>
            <select
              value={selectedDia}
              onChange={(e) => setSelectedDia(e.target.value)}
              className="px-2.5 py-1.5 bg-[#030213] border border-white/10 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-[#7FB706]"
            >
              <option value="ALL">All Dia</option>
              {dimensionOptions.dias.map((d) => (
                <option key={d} value={d}>
                  Ø {d}
                </option>
              ))}
            </select>
          </div>

          {/* Length Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-gray-400 font-medium">Length:</label>
            <select
              value={selectedLength}
              onChange={(e) => setSelectedLength(e.target.value)}
              className="px-2.5 py-1.5 bg-[#030213] border border-white/10 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-[#7FB706]"
            >
              <option value="ALL">All Lengths</option>
              {dimensionOptions.lengths.map((l) => (
                <option key={l} value={l}>
                  L: {l}
                </option>
              ))}
            </select>
          </div>

          {/* Width Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-gray-400 font-medium">Width:</label>
            <select
              value={selectedWidth}
              onChange={(e) => setSelectedWidth(e.target.value)}
              className="px-2.5 py-1.5 bg-[#030213] border border-white/10 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-[#7FB706]"
            >
              <option value="ALL">All Widths</option>
              {dimensionOptions.widths.map((w) => (
                <option key={w} value={w}>
                  W: {w}
                </option>
              ))}
            </select>
          </div>

          {/* Active Dimension Badges & Quick Clear */}
          {(selectedDia !== 'ALL' || selectedLength !== 'ALL' || selectedWidth !== 'ALL') && (
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedDia('ALL');
                  setSelectedLength('ALL');
                  setSelectedWidth('ALL');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg border border-red-500/20 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                Clear Dimensions
              </button>
            </div>
          )}
        </div>

        {/* Filter-Wise Summary & Quick Download Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-white/5 bg-white/[0.02] -mx-4 -mb-4 px-4 py-2.5 rounded-b-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#7FB706] animate-pulse" />
              <span className="text-xs text-gray-300">
                Active Filter:{' '}
                <span className="text-white font-semibold">
                  {totalRecords} SKU{totalRecords === 1 ? '' : 's'} matching
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isExportingExcel}
                onClick={() => handleExportExcel('FILTERED')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#B5F823] text-xs font-bold rounded-lg border border-[#7FB706]/30 transition-colors cursor-pointer disabled:opacity-50"
                title="Download Excel report with these exact filters applied"
              >
                {isExportingExcel ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                )}
                <span>Download Filtered Excel ({totalRecords})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedBranch('ALL');
                  setSelectedMaterial('ALL');
                  setSelectedColor('ALL');
                  setSelectedUnit('ALL');
                  setSelectedVendorId('ALL');
                  setSelectedStatus('ALL');
                  setSelectedDia('ALL');
                  setSelectedLength('ALL');
                  setSelectedWidth('ALL');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-gray-400 hover:text-white text-xs font-medium rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                title="Clear all filters and show full catalog"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Inventory Content */}
      <div className="bg-[#121029] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center text-gray-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#7FB706]" />
            <p className="text-sm">Loading hardware items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center text-gray-400 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-gray-500">
              <Wrench className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No Hardware Items Found</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                Try adjusting your search filters or click "New Hardware SKU" to register a new cubicle fitting.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Register First Hardware SKU
            </button>
          </div>
        ) : (
          <>
            {/* 1. Desktop Data Table (hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider bg-[#0d0b21]/70">
                    <th className="py-3 px-4 font-semibold">SKU & Item Name</th>
                    <th className="py-3 px-3 font-semibold">Material & Finish</th>
                    <th className="py-3 px-3 font-semibold">Branch & Rack</th>
                    <th className="py-3 px-3 font-semibold">HSN</th>
                    <th className="py-3 px-3 font-semibold text-right">Available Stock</th>
                    <th className="py-3 px-3 font-semibold text-right">Reorder</th>
                    <th className="py-3 px-3 font-semibold text-right">Unit Cost</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {items.map((item) => {
                    const isLow = item.currentStock <= item.reorderLevel && item.currentStock > 0;
                    const isOut = item.currentStock <= 0;
                    return (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors">
                        {/* SKU & Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2.5">
                            {item.imageUrl && (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-9 h-9 rounded-lg object-cover border border-[#7FB706]/40 flex-shrink-0 mt-0.5 bg-black/40"
                              />
                            )}
                            <div className="min-w-0">
                              <span className="font-mono text-[#B5F823] font-bold text-xs block">
                                {item.sku}
                              </span>
                              <span className="text-white font-medium text-xs block mt-0.5">
                                {item.name}
                              </span>
                              {(item.dia || item.length || item.width) && (
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {item.dia && (
                                    <span className="px-1.5 py-0.5 bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded text-[10px] font-mono">
                                      Ø {item.dia}
                                    </span>
                                  )}
                                  {item.length && (
                                    <span className="px-1.5 py-0.5 bg-purple-500/15 border border-purple-500/30 text-purple-300 rounded text-[10px] font-mono">
                                      L: {item.length}
                                    </span>
                                  )}
                                  {item.width && (
                                    <span className="px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded text-[10px] font-mono">
                                      W: {item.width}
                                    </span>
                                  )}
                                </div>
                              )}
                              {item.vendorName && (
                                <span className="text-[10px] text-gray-400 block mt-0.5 truncate max-w-[180px]">
                                  {item.vendorName}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Material & Finish */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-gray-300 rounded text-[10px] font-medium inline-block">
                              {item.material === 'STAINLESS_STEEL'
                                ? 'Stainless Steel'
                                : item.material === 'ALUMINIUM'
                                ? 'Aluminium'
                                : item.material === 'NYLON'
                                ? 'Nylon'
                                : item.material}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-gray-300">
                              <span
                                className={`w-2 h-2 rounded-full border border-white/20 ${
                                  item.color.toLowerCase().includes('black')
                                    ? 'bg-black'
                                    : item.color.toLowerCase().includes('gold')
                                    ? 'bg-amber-400'
                                    : item.color.toLowerCase().includes('steel')
                                    ? 'bg-slate-300'
                                    : item.color.toLowerCase().includes('alu')
                                    ? 'bg-slate-200'
                                    : 'bg-gray-400'
                                }`}
                              />
                              <span className="text-[11px]">{item.color}</span>
                            </div>
                          </div>
                        </td>

                        {/* Branch & Rack */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 bg-[#7FB706]/15 border border-[#7FB706]/30 text-[#B5F823] rounded text-[10px] font-mono font-bold inline-block">
                              {item.warehouse}
                            </span>
                            {item.locationRack && (
                              <div className="text-[10px] text-gray-400 font-mono">
                                {item.locationRack}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* HSN Code */}
                        <td className="py-3.5 px-3 font-mono text-gray-400 text-xs">
                          {item.hsnCode || '8302'}
                        </td>

                        {/* Stock */}
                        <td className="py-3.5 px-3 text-right">
                          <span
                            className={`font-mono text-sm font-bold ${
                              isOut
                                ? 'text-red-400'
                                : isLow
                                ? 'text-amber-400'
                                : 'text-white'
                            }`}
                          >
                            {item.currentStock.toLocaleString('en-IN')}
                          </span>{' '}
                          <span className="text-[10px] text-gray-400">{item.unit}</span>
                        </td>

                        {/* Reorder */}
                        <td className="py-3.5 px-3 text-right font-mono text-gray-400 text-xs">
                          {item.reorderLevel} {item.unit}
                        </td>

                        {/* Unit Cost & Total Value */}
                        <td className="py-3.5 px-3 text-right">
                          <div className="font-mono text-xs text-gray-300">
                            ₹{(item.unitCost || 0).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            Tot: ₹{((item.unitCost || 0) * item.currentStock).toLocaleString('en-IN')}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isOut
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : isLow
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'ACTIVE'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Inward Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenInwardForItem(item)}
                              title="Inward stock"
                              className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 rounded-lg transition-colors cursor-pointer"
                            >
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            </button>

                            {/* Inward History for this SKU */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInwardHistorySkuId(item.id);
                                setIsInwardHistoryModalOpen(true);
                              }}
                              title={`View Inward History & GRN Slips for ${item.sku}`}
                              className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 text-[#B5F823] rounded-lg transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#B5F823]" />
                            </button>

                            {/* Issue Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenIssueForItem(item)}
                              title="Issue stock"
                              className="p-1.5 bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 rounded-lg transition-colors cursor-pointer"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>

                            {/* Issue History for this SKU */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedHistorySkuId(item.id);
                                setIsIssueHistoryModalOpen(true);
                              }}
                              title={`View Issue History & Details for ${item.sku}`}
                              className="p-1.5 bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 rounded-lg transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            {/* Adjust Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenAdjustForItem(item)}
                              title="Adjust stock"
                              className="p-1.5 bg-purple-500/10 hover:bg-purple-500/25 text-purple-400 rounded-lg transition-colors cursor-pointer"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditForItem(item)}
                              title="Edit item details"
                              className="p-1.5 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id, item.sku, item.name)}
                              title="Delete SKU"
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/25 text-red-400 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. Mobile Responsive Card View (block on < md, hidden on md+) */}
            <div className="block md:hidden divide-y divide-white/5">
              {items.map((item) => {
                const isLow = item.currentStock <= item.reorderLevel && item.currentStock > 0;
                const isOut = item.currentStock <= 0;
                return (
                  <div key={item.id} className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#B5F823] font-bold text-xs">
                            {item.sku}
                          </span>
                          <span className="px-2 py-0.5 bg-[#7FB706]/15 border border-[#7FB706]/30 text-[#B5F823] rounded text-[10px] font-mono font-bold">
                            {item.warehouse}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-white mt-1">{item.name}</h4>
                      </div>

                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          isOut
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : isLow
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'ACTIVE'}
                      </span>
                    </div>

                    {/* Meta Specs */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-[#0d0b21] p-3 rounded-xl border border-white/5">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase block">Material & Finish</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.color.toLowerCase().includes('black')
                                ? 'bg-black'
                                : item.color.toLowerCase().includes('gold')
                                ? 'bg-amber-400'
                                : 'bg-slate-300'
                            }`}
                          />
                          <span className="text-gray-200 text-xs">
                            {item.color} ({item.material === 'STAINLESS_STEEL' ? 'SS' : item.material})
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-500 uppercase block">Stock & Unit</span>
                        <div className="mt-0.5 font-mono">
                          <strong className="text-white text-sm">{item.currentStock}</strong>{' '}
                          <span className="text-gray-400 text-xs">{item.unit}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-500 uppercase block">HSN Code</span>
                        <span className="text-gray-300 font-mono text-xs">{item.hsnCode || '8302'}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-500 uppercase block">Unit Cost / Valuation</span>
                        <span className="text-[#B5F823] font-mono text-xs font-semibold">
                          ₹{item.unitCost || 0} / ₹{((item.unitCost || 0) * item.currentStock).toLocaleString('en-IN')}
                        </span>
                      </div>

                      {(item.dia || item.length || item.width) && (
                        <div className="col-span-2 pt-1.5 border-t border-white/5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-gray-500 uppercase font-semibold">Dimensions:</span>
                          {item.dia && (
                            <span className="px-1.5 py-0.5 bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded text-[10px] font-mono">
                              Ø {item.dia}
                            </span>
                          )}
                          {item.length && (
                            <span className="px-1.5 py-0.5 bg-purple-500/15 border border-purple-500/30 text-purple-300 rounded text-[10px] font-mono">
                              L: {item.length}
                            </span>
                          )}
                          {item.width && (
                            <span className="px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded text-[10px] font-mono">
                              W: {item.width}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Touch Action Buttons (targets >= 44px) */}
                    <div className="grid grid-cols-6 gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenInwardForItem(item)}
                        className="min-h-[44px] flex flex-col items-center justify-center bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                      >
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        Inward
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInwardHistorySkuId(item.id);
                          setIsInwardHistoryModalOpen(true);
                        }}
                        className="min-h-[44px] flex flex-col items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 text-[#B5F823] border border-emerald-500/20 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Inw Log
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenIssueForItem(item)}
                        className="min-h-[44px] flex flex-col items-center justify-center bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        Issue
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHistorySkuId(item.id);
                          setIsIssueHistoryModalOpen(true);
                        }}
                        className="min-h-[44px] flex flex-col items-center justify-center bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 border border-amber-500/20 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        Iss Log
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenAdjustForItem(item)}
                        className="min-h-[44px] flex flex-col items-center justify-center bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        Adjust
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditForItem(item)}
                        className="min-h-[44px] flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Strip */}
            <div className="p-4 border-t border-white/10 bg-[#0d0b21]/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
              <div>
                Showing{' '}
                <strong className="text-white">
                  {totalRecords === 0 ? 0 : (page - 1) * pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-white">
                  {Math.min(page * pageSize, totalRecords)}
                </strong>{' '}
                of <strong className="text-white">{totalRecords}</strong> hardware items
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span>Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="py-1 px-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value={25} className="bg-[#0a091e] text-white">25</option>
                    <option value={50} className="bg-[#0a091e] text-white">50</option>
                    <option value={100} className="bg-[#0a091e] text-white">100</option>
                    <option value={250} className="bg-[#0a091e] text-white">All ({totalRecords})</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white rounded-lg border border-white/10 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>

                  <span className="px-2 text-gray-300 font-mono">
                    {page} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white rounded-lg border border-white/10 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals Subsystem */}
      <CreateHardwareModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadData();
          loadAnalytics();
        }}
        branches={branches}
        vendors={vendors}
        items={items}
        onOpenVendorModal={() => setIsVendorsModalOpen(true)}
        onOpenBranchModal={() => setIsBranchesModalOpen(true)}
      />

      <HardwareInwardModal
        isOpen={isInwardModalOpen}
        onClose={() => setIsInwardModalOpen(false)}
        onSuccess={() => {
          loadData();
          loadAnalytics();
        }}
        preselectedItem={activeItem}
        items={items}
        branches={branches}
        vendors={vendors}
        onOpenVendorModal={() => setIsVendorsModalOpen(true)}
      />

      <HardwareIssueModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSuccess={() => {
          loadData();
          loadAnalytics();
        }}
        preselectedItem={activeItem}
        items={items}
        branches={branches}
      />

      <HardwareAdjustModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        onSuccess={() => {
          loadData();
          loadAnalytics();
        }}
        item={activeItem}
      />

      <HardwareLedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        branches={branches}
        initialItemId={activeItem?.id}
      />

      <HardwareReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        branches={branches}
        items={items}
        vendors={vendors}
        initialBranch={selectedBranch}
        initialMaterial={selectedMaterial}
        initialStatus={selectedStatus}
      />

      <HardwareVendorsModal
        isOpen={isVendorsModalOpen}
        onClose={() => setIsVendorsModalOpen(false)}
        onVendorsUpdated={() => {
          loadMetadata();
          loadData();
          loadAnalytics();
        }}
      />

      <BranchManagerModal
        isOpen={isBranchesModalOpen}
        onClose={() => setIsBranchesModalOpen(false)}
        onBranchesUpdated={() => {
          loadMetadata();
          loadData();
          loadAnalytics();
        }}
      />

      <EditHardwareModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          loadData();
          loadAnalytics();
        }}
        item={activeItem}
        branches={branches}
        vendors={vendors}
      />

      <HardwareIssueHistoryModal
        isOpen={isIssueHistoryModalOpen}
        onClose={() => setIsIssueHistoryModalOpen(false)}
        items={items}
        branches={branches}
        initialSkuId={selectedHistorySkuId}
        onOpenNewIssue={(item) => {
          setActiveItem(item || null);
          setIsIssueModalOpen(true);
        }}
      />

      <HardwareInwardHistoryModal
        isOpen={isInwardHistoryModalOpen}
        onClose={() => setIsInwardHistoryModalOpen(false)}
        items={items}
        branches={branches}
        initialSkuId={selectedInwardHistorySkuId}
        onOpenNewInward={(item) => {
          setActiveItem(item || null);
          setIsInwardModalOpen(true);
        }}
      />
    </div>
  );
}
