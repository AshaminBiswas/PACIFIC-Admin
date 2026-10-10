import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { hardwareInventoryApi } from '../../api/hardwareInventoryApi';
import type {
  HardwareAnalyticsSummary,
  HardwareInventoryItem,
  HardwareBranch,
} from '../../types/admin';

interface HardwareReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: HardwareBranch[];
  items: HardwareInventoryItem[];
}

export default function HardwareReportsModal({
  isOpen,
  onClose,
  branches,
  items,
}: HardwareReportsModalProps) {
  const [analytics, setAnalytics] = useState<HardwareAnalyticsSummary | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

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

  const lowStockItems = items.filter(
    (i) =>
      i.currentStock <= i.reorderLevel &&
      (selectedBranch === 'ALL' || i.warehouse === selectedBranch)
  );

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#121029] border border-[#7FB706]/30 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#0d0b21]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#7FB706]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Hardware Inventory Analytics & Reports
              </h2>
              <p className="text-xs text-gray-400">
                Multi-branch valuation, material breakdown, and replenishment alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Report
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Branch Filter Selector */}
        <div className="px-4 sm:px-6 py-3 bg-[#0d0b21]/70 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Filter Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-1.5 bg-[#030213] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Consolidated Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.code}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <span className="text-[11px] text-gray-400">
            As of: <strong>{new Date().toLocaleDateString('en-IN')}</strong>
          </span>
        </div>

        {/* Report Content */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {loading || !analytics ? (
            <div className="p-12 text-center text-gray-400 text-sm">Generating report...</div>
          ) : (
            <>
              {/* KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-[#0d0b21] border border-white/10 rounded-xl">
                  <div className="text-[11px] text-gray-400 uppercase font-semibold">Total Hardware SKUs</div>
                  <div className="text-2xl font-bold text-white mt-1 font-mono">
                    {analytics.totalSkus}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">Active registered parts</div>
                </div>

                <div className="p-4 bg-[#0d0b21] border border-white/10 rounded-xl">
                  <div className="text-[11px] text-gray-400 uppercase font-semibold">Total Units in Stock</div>
                  <div className="text-2xl font-bold text-[#B5F823] mt-1 font-mono">
                    {analytics.totalUnits.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">Across all warehouses</div>
                </div>

                <div className="p-4 bg-[#0d0b21] border border-white/10 rounded-xl">
                  <div className="text-[11px] text-gray-400 uppercase font-semibold">Total Stock Valuation</div>
                  <div className="text-2xl font-bold text-[#7FB706] mt-1 font-mono">
                    ₹{analytics.totalValuation.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">At average purchase cost</div>
                </div>

                <div className="p-4 bg-[#0d0b21] border border-amber-500/30 rounded-xl">
                  <div className="text-[11px] text-amber-400 uppercase font-semibold">Low Stock Alerts</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">
                    {analytics.lowStockCount}
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
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Urgent Reorder Required ({lowStockItems.length} SKUs)
                  </h3>
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
        <div className="p-4 border-t border-white/10 bg-[#0d0b21] flex justify-end">
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
