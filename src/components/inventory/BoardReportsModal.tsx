import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  FileSpreadsheet,
  Printer,
  Calendar,
  Layers,
  Building2,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  BarChart3,
  PieChart,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { boardInventoryApi } from '../../api/boardInventoryApi';
import type {
  BoardInventoryItem,
  BoardSupplier,
  BoardAnalyticsSummary,
  BoardStockMovement,
} from '../../types/admin';

interface BoardReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: BoardInventoryItem[];
  suppliers: BoardSupplier[];
}

type TimeframeType = 'day' | 'week' | 'month' | 'year' | 'custom';

export default function BoardReportsModal({
  isOpen,
  onClose,
  boards,
  suppliers,
}: BoardReportsModalProps) {
  const [timeframe, setTimeframe] = useState<TimeframeType>('month');
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [analytics, setAnalytics] = useState<BoardAnalyticsSummary | null>(null);
  const [movements, setMovements] = useState<BoardStockMovement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, movementsRes] = await Promise.all([
        boardInventoryApi.getAnalytics({
          timeframe,
          startDate: timeframe === 'custom' ? startDate : undefined,
          endDate: timeframe === 'custom' ? endDate : undefined,
        }),
        boardInventoryApi.getMovements({
          timeframe,
          startDate: timeframe === 'custom' ? startDate : undefined,
          endDate: timeframe === 'custom' ? endDate : undefined,
          limit: 300,
        }),
      ]);

      if (analyticsRes.data?.data) {
        setAnalytics(analyticsRes.data.data);
      }
      if (movementsRes.data?.data) {
        setMovements(movementsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReportData();
    }
  }, [isOpen, timeframe, startDate, endDate]);

  if (!isOpen) return null;

  // Timeframe labels
  const getTimeframeLabel = () => {
    switch (timeframe) {
      case 'day':
        return "Today's Daily Movement & Stock Status";
      case 'week':
        return 'Past 7 Days Weekly Report';
      case 'month':
        return 'Monthly Inventory Audit Report';
      case 'year':
        return 'Financial Year (FY) Comprehensive Audit';
      case 'custom':
        return `Custom Range: ${startDate} to ${endDate}`;
    }
  };

  // 1. Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Master Inventory Register
    const inventoryData = boards.map((b, idx) => ({
      'Sl No': idx + 1,
      'Item Code': b.itemCode,
      'Supplier / Vendor': b.vendorName || '—',
      'Design No': b.designNo,
      'Design Name': b.designName || '',
      'Sheet Size': b.size,
      'Thickness': b.thickness,
      'Board Type': b.boardType,
      'Opening Stock': Number(b.openingStock),
      'Total Inward': Number(b.totalInward),
      'Total Issued': Number(b.totalIssued),
      'Closing Stock': Number(b.currentStock),
      'Reorder Level': Number(b.reorderLevel),
      'Unit Cost (INR)': b.unitCost ? Number(b.unitCost) : 0,
      'Stock Value (INR)': Number(b.currentStock) * (b.unitCost ? Number(b.unitCost) : 0),
      'Rack Location': b.locationRack || '—',
      'Status': b.status,
    }));

    const wsInventory = XLSX.utils.json_to_sheet(inventoryData);
    XLSX.utils.book_append_sheet(wb, wsInventory, 'Board Inventory Register');

    // Sheet 2: Period Movements Ledger
    const movementsData = movements.map((m, idx) => ({
      'Sl No': idx + 1,
      'Movement Date': new Date(m.movementDate).toLocaleDateString('en-IN'),
      'Movement Number': m.movementNumber,
      'Type': m.movementType,
      'Design No': m.inventoryItem?.designNo || '—',
      'Supplier': m.inventoryItem?.vendorName || '—',
      'Thickness': m.inventoryItem?.thickness || '—',
      'Reference / Invoice / Issue List':
        m.supplierInvoiceNo || m.issueListNumber || m.issueReference || '—',
      'Before Stock': m.stockBefore,
      'Quantity': m.movementType === 'INWARD' ? `+${m.quantity}` : `-${m.quantity}`,
      'After Stock': m.stockAfter,
      'Handled By / Operator': m.issuedToPerson || '—',
      'Remarks': m.notes || '',
    }));

    const wsMovements = XLSX.utils.json_to_sheet(movementsData);
    XLSX.utils.book_append_sheet(wb, wsMovements, 'Stock Movement Ledger');

    // Write file
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Pacific_Board_Inventory_Report_${timeframe}_${dateStr}.xlsx`);
  };

  // 2. Print / PDF Generation
  const handlePrintPDF = () => {
    window.print();
  };

  // Summary counts
  const totalSheets = analytics?.totalSheets ?? boards.reduce((s, b) => s + Number(b.currentStock), 0);
  const totalValuation =
    analytics?.totalValuation ??
    boards.reduce((s, b) => s + Number(b.currentStock) * (Number(b.unitCost) || 0), 0);
  const inwardQty = analytics?.periodInward ?? 0;
  const issuedQty = analytics?.periodIssued ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:bg-white print:p-0 print:static print:z-auto">
      <div className="relative w-full max-w-5xl bg-[#09071a] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden my-8 flex flex-col max-h-[92vh] print:max-h-none print:h-auto print:border-none print:shadow-none print:bg-white print:text-black print:my-0">
        {/* Glow Header Accent (Hidden on Print) */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#7FB706] to-[#B5F823] print:hidden" />

        {/* Modal Header & Quick Action Buttons */}
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-white/10 shrink-0 gap-3 print:border-b-2 print:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20 print:hidden">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="hidden print:block mb-1">
                <h1 className="text-xl font-black text-gray-900 tracking-tight">
                  PACIFIC RESTROOM CUBICLE SYSTEMS
                </h1>
                <p className="text-xs text-gray-600">
                  Raw Material Board Inventory Register & Audit Report
                </p>
              </div>
              <h2 className="text-lg font-bold text-white tracking-wide print:text-gray-900">
                Visual Inventory Report & Analytics
              </h2>
              <p className="text-xs text-gray-400 print:text-gray-600">
                {getTimeframeLabel()} • Generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel (.xlsx)
            </button>
            <button
              onClick={handlePrintPDF}
              className="px-4 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/20"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Timeframe Filter Tabs (Hidden on Print) */}
        <div className="py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-1 bg-[#121029] p-1 rounded-xl border border-white/10">
            {(
              [
                { id: 'day', label: 'Day-wise' },
                { id: 'week', label: 'Week-wise' },
                { id: 'month', label: 'Month-wise' },
                { id: 'year', label: 'Financial Year' },
                { id: 'custom', label: 'Custom Range' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  timeframe === t.id
                    ? 'bg-[#7FB706] text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {timeframe === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#121029] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FB706]"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#121029] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          )}

          <button
            onClick={fetchReportData}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg border border-white/10 text-xs flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Scrollable Report Body */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-6 pr-1 print:overflow-visible print:pr-0">
          {/* Visual KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:text-black">
            <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 print:border-gray-300 print:bg-gray-50">
              <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider print:text-gray-600">
                Total Stock In Hand
              </span>
              <div className="text-xl font-bold text-white mt-1 font-mono print:text-gray-900">
                {totalSheets.toLocaleString('en-IN')}{' '}
                <span className="text-xs font-normal text-gray-400 print:text-gray-600">Sheets</span>
              </div>
              <span className="text-[10px] text-[#7FB706] font-semibold mt-0.5 block">
                {boards.length} Active Board SKUs
              </span>
            </div>

            <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 print:border-gray-300 print:bg-gray-50">
              <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider print:text-gray-600">
                Period Inward (+)
              </span>
              <div className="text-xl font-bold text-emerald-400 mt-1 font-mono print:text-emerald-700">
                +{inwardQty.toLocaleString('en-IN')}{' '}
                <span className="text-xs font-normal text-gray-400 print:text-gray-600">Sheets</span>
              </div>
              <span className="text-[10px] text-gray-400 print:text-gray-600 mt-0.5 block">
                Received from 4 suppliers
              </span>
            </div>

            <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 print:border-gray-300 print:bg-gray-50">
              <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider print:text-gray-600">
                Period Dispatched (-)
              </span>
              <div className="text-xl font-bold text-rose-400 mt-1 font-mono print:text-rose-700">
                -{issuedQty.toLocaleString('en-IN')}{' '}
                <span className="text-xs font-normal text-gray-400 print:text-gray-600">Sheets</span>
              </div>
              <span className="text-[10px] text-gray-400 print:text-gray-600 mt-0.5 block">
                Packing lists & factory issues
              </span>
            </div>

            <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 print:border-gray-300 print:bg-gray-50">
              <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider print:text-gray-600">
                Stock Valuation
              </span>
              <div className="text-xl font-bold text-[#B5F823] mt-1 font-mono print:text-gray-900">
                ₹{totalValuation.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-gray-400 print:text-gray-600 mt-0.5 block">
                Raw material book value
              </span>
            </div>
          </div>

          {/* Visual Charts: Supplier Share & Thickness Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Visual 1: Supplier Share (The 4 Suppliers) */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3 print:border-gray-300 print:bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 print:text-gray-900">
                  <Building2 className="w-3.5 h-3.5 text-[#7FB706]" /> Supplier Stock Distribution (4
                  Vendors)
                </h3>
              </div>

              <div className="space-y-2.5">
                {suppliers.map((sup, idx) => {
                  const share = totalSheets > 0 ? (sup.totalSheets / totalSheets) * 100 : 0;
                  const barColors = [
                    'bg-[#7FB706]',
                    'bg-sky-500',
                    'bg-purple-500',
                    'bg-amber-500',
                  ];
                  const color = barColors[idx % barColors.length];

                  return (
                    <div key={sup.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-200 print:text-gray-800">
                          {sup.name}
                        </span>
                        <span className="text-gray-400 font-mono text-[11px] print:text-gray-700">
                          {sup.totalSheets} sheets ({share.toFixed(1)}%) • {sup.totalSkus} SKUs
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden print:bg-gray-200">
                        <div
                          className={`h-full ${color} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max(2, share)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visual 2: Board Thickness & Types */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3 print:border-gray-300 print:bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 print:text-gray-900">
                  <Layers className="w-3.5 h-3.5 text-[#B5F823]" /> Board Thickness Breakdown
                </h3>
              </div>

              <div className="space-y-2.5">
                {analytics?.thicknessDistribution ? (
                  Object.entries(analytics.thicknessDistribution).map(([thick, count]) => {
                    const pct = totalSheets > 0 ? (count / totalSheets) * 100 : 0;
                    return (
                      <div key={thick} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-200 print:text-gray-800">
                            {thick}
                          </span>
                          <span className="text-gray-400 font-mono text-[11px] print:text-gray-700">
                            {count} sheets ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden print:bg-gray-200">
                          <div
                            className="h-full bg-[#B5F823] rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(2, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-400">Loading distribution charts...</p>
                )}
              </div>
            </div>
          </div>

          {/* Master Board Inventory Register Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider print:text-gray-900">
              Live Stock Status Register
            </h3>
            <div className="border border-white/10 rounded-xl overflow-hidden print:border-gray-300">
              <table className="w-full text-left text-xs print:text-[10px]">
                <thead className="bg-[#0f0c29] border-b border-white/10 text-gray-400 uppercase font-semibold print:bg-gray-100 print:text-gray-800">
                  <tr>
                    <th className="py-2.5 px-3">Sl No</th>
                    <th className="py-2.5 px-3">Design No</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3">Size & Thick</th>
                    <th className="py-2.5 px-3 text-center">Opening</th>
                    <th className="py-2.5 px-3 text-center">Inward</th>
                    <th className="py-2.5 px-3 text-center">Issued</th>
                    <th className="py-2.5 px-3 text-center">Closing</th>
                    <th className="py-2.5 px-3 text-center">Reorder</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-gray-200">
                  {boards.map((b, idx) => (
                    <tr
                      key={b.id}
                      className="hover:bg-white/[0.02] print:text-black print:hover:bg-transparent"
                    >
                      <td className="py-2.5 px-3 font-mono text-gray-400 print:text-gray-700">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-white print:text-black">{b.designNo}</span>
                        {b.designName && (
                          <span className="block text-[10px] text-gray-400 print:text-gray-600">
                            {b.designName}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-gray-300 print:text-black">{b.vendorName}</td>
                      <td className="py-2.5 px-3 text-gray-300 print:text-black">
                        {b.thickness} | {b.size}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-gray-400 print:text-black">
                        {b.openingStock}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-emerald-400 font-semibold print:text-emerald-700">
                        +{b.totalInward}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-rose-400 font-semibold print:text-rose-700">
                        -{b.totalIssued}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-white print:text-black">
                        {b.currentStock}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-gray-400 print:text-black">
                        {b.reorderLevel}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'OUT_OF_STOCK'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 print:text-rose-700'
                              : b.status === 'LOW_STOCK'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 print:text-amber-700'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:text-emerald-700'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden on Print) */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 shrink-0 print:hidden">
          <span>Ready for high-speed reporting & PDF/Excel distribution</span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
