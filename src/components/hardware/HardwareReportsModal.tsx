import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  BarChart3,
  Printer,
  Download,
  Building2,
  Layers,
  AlertTriangle,
  Package,
  TrendingUp,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  History,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { hardwareInventoryApi } from '../../api/hardwareInventoryApi';
import type {
  HardwareAnalyticsSummary,
  HardwareInventoryItem,
  HardwareBranch,
  HardwareVendor,
  HardwareStockMovement,
} from '../../types/admin';
import { exportComprehensiveHardwareReport } from '../../utils/hardwareExcelExport';

interface HardwareReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: HardwareBranch[];
  items: HardwareInventoryItem[];
  vendors?: HardwareVendor[];
  initialBranch?: string;
  initialMaterial?: string;
  initialStatus?: string;
}

export default function HardwareReportsModal({
  isOpen,
  onClose,
  branches,
  items,
  vendors: propVendors,
  initialBranch = 'ALL',
  initialMaterial = 'ALL',
  initialStatus = 'ALL',
}: HardwareReportsModalProps) {
  const [analytics, setAnalytics] = useState<HardwareAnalyticsSummary | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch);
  const [selectedMaterial, setSelectedMaterial] = useState<string>(initialMaterial);
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [loading, setLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportType, setExportType] = useState<string | null>(null);

  // Sync initial props on open
  useEffect(() => {
    if (isOpen) {
      if (initialBranch) setSelectedBranch(initialBranch);
      if (initialMaterial) setSelectedMaterial(initialMaterial);
      if (initialStatus) setSelectedStatus(initialStatus);
    }
  }, [isOpen, initialBranch, initialMaterial, initialStatus]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await hardwareInventoryApi.getAnalytics({
        warehouse: selectedBranch !== 'ALL' ? selectedBranch : undefined,
      });
      if (res.data?.data) {
        setAnalytics(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load hardware analytics report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadReport();
    }
  }, [isOpen, selectedBranch]);

  // Dynamic filter application across items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (
        selectedBranch !== 'ALL' &&
        (item.warehouse || '').toUpperCase() !== selectedBranch.toUpperCase()
      ) {
        return false;
      }
      if (
        selectedMaterial !== 'ALL' &&
        (item.material || '').toUpperCase() !== selectedMaterial.toUpperCase()
      ) {
        return false;
      }
      if (selectedStatus !== 'ALL') {
        const itemStatus =
          item.status ||
          (item.currentStock <= 0
            ? 'OUT_OF_STOCK'
            : item.currentStock <= item.reorderLevel
            ? 'LOW_STOCK'
            : 'ACTIVE');
        if (itemStatus !== selectedStatus) return false;
      }
      return true;
    });
  }, [items, selectedBranch, selectedMaterial, selectedStatus]);

  const lowStockItems = useMemo(() => {
    return filteredItems.filter((i) => i.currentStock <= i.reorderLevel);
  }, [filteredItems]);

  const hasActiveFilters =
    selectedBranch !== 'ALL' || selectedMaterial !== 'ALL' || selectedStatus !== 'ALL';

  const resetFilters = () => {
    setSelectedBranch('ALL');
    setSelectedMaterial('ALL');
    setSelectedStatus('ALL');
  };

  const handlePrint = () => {
    window.print();
  };

  /**
   * Universal Filter-Wise Excel Exporter
   */
  const handleExportExcel = async (type: 'ALL' | 'MASTER' | 'MOVEMENTS' | 'ALERTS' = 'ALL') => {
    setExportingExcel(true);
    setExportType(type);
    try {
      // Fetch movements & vendors in parallel for complete report
      const [movRes, vendRes] = await Promise.allSettled([
        hardwareInventoryApi.getMovements({
          warehouse: selectedBranch !== 'ALL' ? selectedBranch : undefined,
          limit: 5000,
        }),
        propVendors && propVendors.length > 0
          ? Promise.resolve({ data: { success: true, data: propVendors } })
          : hardwareInventoryApi.listVendors(),
      ]);

      const movements: HardwareStockMovement[] =
        movRes.status === 'fulfilled' && movRes.value?.data?.data
          ? movRes.value.data.data
          : [];

      const vendors: HardwareVendor[] =
        vendRes.status === 'fulfilled' && vendRes.value?.data?.data
          ? vendRes.value.data.data
          : propVendors || [];

      const branchCode = selectedBranch === 'ALL' ? 'Consolidated' : selectedBranch;
      const dateTag = new Date().toISOString().split('T')[0];

      const activeFilters = {
        branch: selectedBranch,
        material: selectedMaterial,
        status: selectedStatus,
      };

      if (type === 'MOVEMENTS') {
        exportComprehensiveHardwareReport({
          items: [],
          branches,
          vendors: [],
          movements,
          analytics,
          selectedBranch,
          activeFilters,
          customFilename: `Pacific_Hardware_Movement_Ledger_${branchCode}_${dateTag}.xlsx`,
        });
      } else if (type === 'ALERTS') {
        exportComprehensiveHardwareReport({
          items: lowStockItems,
          branches,
          vendors,
          movements: [],
          analytics,
          selectedBranch,
          activeFilters,
          customFilename: `Pacific_Hardware_Low_Stock_Alerts_${branchCode}_${dateTag}.xlsx`,
        });
      } else if (type === 'MASTER') {
        exportComprehensiveHardwareReport({
          items: filteredItems,
          branches,
          vendors,
          movements: [],
          analytics,
          selectedBranch,
          activeFilters,
          customFilename: `Pacific_Hardware_Master_Register_${branchCode}_${dateTag}.xlsx`,
        });
      } else {
        // Complete 5-Sheet Workbook reflecting active filters
        exportComprehensiveHardwareReport({
          items: filteredItems,
          branches,
          vendors,
          movements,
          analytics,
          selectedBranch,
          activeFilters,
          customFilename: `Pacific_Hardware_Report_${branchCode}_${hasActiveFilters ? 'Filtered_' : ''}${dateTag}.xlsx`,
        });
      }
    } catch (err) {
      console.error('Failed to export hardware inventory Excel report:', err);
    } finally {
      setExportingExcel(false);
      setExportType(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#121029] border border-[#7FB706]/30 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#0d0b21] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#7FB706]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Hardware Inventory Analytics & Reports
              </h2>
              <p className="text-xs text-gray-400">
                Multi-branch valuation, material breakdown, and filter-wise export
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Primary Excel Export Button */}
            <button
              type="button"
              disabled={exportingExcel}
              onClick={() => handleExportExcel('ALL')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] text-xs font-bold rounded-lg transition shadow-md shadow-[#7FB706]/20 cursor-pointer disabled:opacity-50"
              title="Download Excel report with current filters"
            >
              {exportingExcel && exportType === 'ALL' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              <span>Export {hasActiveFilters ? 'Filtered' : 'All'} Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Granular Filter Toolbar */}
        <div className="px-4 sm:px-6 py-3 bg-[#0d0b21]/70 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Branch Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-gray-400">Branch:</span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-2.5 py-1 bg-[#030213] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#7FB706]"
              >
                <option value="ALL">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Material Category */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-gray-400">Material:</span>
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="px-2.5 py-1 bg-[#030213] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#7FB706]"
              >
                <option value="ALL">All Materials</option>
                <option value="STAINLESS_STEEL">Stainless Steel (SS)</option>
                <option value="ALUMINIUM">Aluminium</option>
                <option value="NYLON">Nylon</option>
              </select>
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-gray-400">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1 bg-[#030213] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#7FB706]"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active (In Stock)</option>
                <option value="LOW_STOCK">Low Stock Alert</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition border border-amber-500/20 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#B5F823] font-mono font-bold bg-[#7FB706]/10 px-2.5 py-0.5 rounded-full border border-[#7FB706]/30">
              {filteredItems.length} SKUs in Filter
            </span>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Quick Excel Downloads Strip */}
          <div className="p-4 bg-gradient-to-r from-[#0d0b21] to-[#121029] border border-[#7FB706]/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#B5F823]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Hardware Excel Exports Center {hasActiveFilters && '(Filter-Wise)'}
                </h3>
              </div>
              <span className="text-[10px] text-[#B5F823] font-mono font-bold bg-[#7FB706]/10 px-2 py-0.5 rounded border border-[#7FB706]/30">
                {hasActiveFilters ? 'Filtered Scope' : 'Consolidated Scope'}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {hasActiveFilters
                ? `Currently filtered by: ${selectedBranch !== 'ALL' ? `Branch: ${selectedBranch} ` : ''}${selectedMaterial !== 'ALL' ? `Material: ${selectedMaterial} ` : ''}${selectedStatus !== 'ALL' ? `Status: ${selectedStatus}` : ''}. Downloads reflect this selection.`
                : 'Download professionally formatted, multi-tab Microsoft Excel reports containing complete item catalogs, valuation breakdowns, and transactional ledgers.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Comprehensive Package */}
              <button
                type="button"
                disabled={exportingExcel}
                onClick={() => handleExportExcel('ALL')}
                className="p-3 bg-black/40 hover:bg-black/60 border border-[#7FB706]/30 hover:border-[#7FB706] rounded-xl text-left transition flex items-center justify-between group cursor-pointer disabled:opacity-50"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-[#B5F823] transition-colors flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#7FB706]" />
                    {hasActiveFilters ? 'Filtered Package' : 'Complete Package'}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {filteredItems.length} SKUs across 5 sheets
                  </div>
                </div>
                {exportingExcel && exportType === 'ALL' ? (
                  <Loader2 className="w-4 h-4 text-[#B5F823] animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-[#7FB706] group-hover:scale-110 transition-transform" />
                )}
              </button>

              {/* Movement Ledger */}
              <button
                type="button"
                disabled={exportingExcel}
                onClick={() => handleExportExcel('MOVEMENTS')}
                className="p-3 bg-black/40 hover:bg-black/60 border border-purple-500/30 hover:border-purple-400 rounded-xl text-left transition flex items-center justify-between group cursor-pointer disabled:opacity-50"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-purple-400" />
                    Movement Ledger
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Audit trail for {selectedBranch === 'ALL' ? 'all branches' : selectedBranch}
                  </div>
                </div>
                {exportingExcel && exportType === 'MOVEMENTS' ? (
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                )}
              </button>

              {/* Low Stock Alerts */}
              <button
                type="button"
                disabled={exportingExcel}
                onClick={() => handleExportExcel('ALERTS')}
                className="p-3 bg-black/40 hover:bg-black/60 border border-amber-500/30 hover:border-amber-400 rounded-xl text-left transition flex items-center justify-between group cursor-pointer disabled:opacity-50"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Restock Alerts
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {lowStockItems.length} SKUs below threshold
                  </div>
                </div>
                {exportingExcel && exportType === 'ALERTS' ? (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                )}
              </button>
            </div>
          </div>

          {loading || !analytics ? (
            <div className="p-12 text-center text-gray-400 text-sm">Generating report...</div>
          ) : (
            <>
              {/* KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-[#0d0b21] border border-white/10 rounded-xl">
                  <div className="text-[11px] text-gray-400 uppercase font-semibold">Total Hardware SKUs</div>
                  <div className="text-2xl font-bold text-white mt-1 font-mono">
                    {filteredItems.length}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">In current filter scope</div>
                </div>

                <div className="p-4 bg-[#0d0b21] border border-white/10 rounded-xl">
                  <div className="text-[11px] text-gray-400 uppercase font-semibold">Total Units in Stock</div>
                  <div className="text-2xl font-bold text-[#B5F823] mt-1 font-mono">
                    {filteredItems
                      .reduce((acc, i) => acc + (Number(i.currentStock) || 0), 0)
                      .toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">Units available</div>
                </div>

                <div className="p-4 bg-[#0d0b21] border border-white/10 rounded-xl">
                  <div className="text-[11px] text-gray-400 uppercase font-semibold">Stock Valuation</div>
                  <div className="text-2xl font-bold text-[#7FB706] mt-1 font-mono">
                    ₹
                    {filteredItems
                      .reduce(
                        (acc, i) =>
                          acc + (Number(i.currentStock) || 0) * (Number(i.unitCost) || 0),
                        0
                      )
                      .toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">At average purchase cost</div>
                </div>

                <div className="p-4 bg-[#0d0b21] border border-amber-500/30 rounded-xl">
                  <div className="text-[11px] text-amber-400 uppercase font-semibold">Low Stock Alerts</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">
                    {lowStockItems.length}
                  </div>
                  <div className="text-[10px] text-amber-400/70 mt-1">Below safety reorder mark</div>
                </div>
              </div>

              {/* Material Breakdown */}
              <div className="p-4 bg-[#0d0b21] border border-white/10 rounded-xl space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#7FB706]" />
                  Material Distribution & Stock Valuation
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.entries(analytics.materialDistribution).map(([mat, data]) => (
                    <div key={mat} className="p-3 bg-[#030213] border border-white/5 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          {mat === 'STAINLESS_STEEL'
                            ? 'Stainless Steel (SS)'
                            : mat === 'ALUMINIUM'
                            ? 'Aluminium'
                            : mat === 'NYLON'
                            ? 'Nylon'
                            : mat}
                        </span>
                        <span className="text-[10px] text-gray-400">{data.skus} SKUs</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-gray-400 font-mono">{data.units} Units</span>
                        <span className="text-[#B5F823] font-mono font-bold">
                          ₹{data.valuation.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Multi-Branch Distribution */}
              <div className="p-4 bg-[#0d0b21] border border-white/10 rounded-xl space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#7FB706]" />
                  Branch Location Inventory Distribution
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(analytics.branchDistribution).map(([branchCode, data]) => (
                    <div key={branchCode} className="p-3 bg-[#030213] border border-white/5 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#B5F823] font-mono">{branchCode}</span>
                        <span className="text-[10px] text-gray-400">{data.skus} SKUs stocked</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-gray-400 font-mono">{data.units} Total Units</span>
                        <span className="text-white font-mono font-bold">
                          ₹{data.valuation.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Low Stock Replenishment Table */}
              {lowStockItems.length > 0 && (
                <div className="p-4 bg-[#0d0b21] border border-amber-500/20 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Urgent Reorder Required ({lowStockItems.length} SKUs)
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleExportExcel('ALERTS')}
                      className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      Export Restock List (.xlsx)
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400 uppercase text-[10px]">
                          <th className="py-2 px-2">SKU</th>
                          <th className="py-2 px-2">Item Name</th>
                          <th className="py-2 px-2">Branch</th>
                          <th className="py-2 px-2 text-right">Current Stock</th>
                          <th className="py-2 px-2 text-right">Reorder Level</th>
                          <th className="py-2 px-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {lowStockItems.map((item) => (
                          <tr key={item.id} className="text-gray-300">
                            <td className="py-2 px-2 font-mono text-[#B5F823]">{item.sku}</td>
                            <td className="py-2 px-2 font-medium">{item.name}</td>
                            <td className="py-2 px-2 font-mono text-gray-400">{item.warehouse}</td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-red-400">
                              {item.currentStock} {item.unit}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-gray-400">
                              {item.reorderLevel} {item.unit}
                            </td>
                            <td className="py-2 px-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
                                {item.currentStock <= 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0d0b21] flex items-center justify-between">
          <button
            type="button"
            disabled={exportingExcel}
            onClick={() => handleExportExcel('ALL')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 border border-[#7FB706]/40 text-[#B5F823] text-xs font-bold rounded-lg transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {hasActiveFilters ? 'Filtered' : 'All'} Excel Reports (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
