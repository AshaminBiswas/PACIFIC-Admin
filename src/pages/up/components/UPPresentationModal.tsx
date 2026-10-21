import React, { useRef } from "react";
import {
  Printer,
  Download,
  X,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  Building2,
  Sparkles,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { UPDashboardData } from "../../../types/admin";

interface UPPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardData: UPDashboardData | null;
  periodLabel: string;
  adminName?: string;
  onExportExcel?: () => void;
  onDownloadCategoryPdf?: () => void;
}

const formatInr = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return "0";
  return Number(val).toLocaleString("en-IN");
};

export function UPPresentationModal({
  isOpen,
  onClose,
  dashboardData,
  periodLabel,
  adminName,
  onExportExcel,
  onDownloadCategoryPdf,
}: UPPresentationModalProps) {
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !dashboardData) return null;

  const kpis = dashboardData.kpis || ({} as any);
  const totalSpend = Number(kpis.rangeTotal || 0);
  const verifiedTotal = Number(kpis.verifiedTotal || 0);
  const unverifiedTotal = Number(kpis.unverifiedTotal || 0);
  const verifiedPct = totalSpend > 0 ? ((verifiedTotal / totalSpend) * 100).toFixed(1) : "0";
  const peakAmount = Number(kpis.highestExpense || 0);
  const topCategory = kpis.topCategory || "General";
  const dailyAverage = Number(kpis.averageDailyExpense || 0);
  const totalTxCount = Number(kpis.transactionCount || 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadStandaloneHtml = () => {
    const timestamp = new Date().toLocaleString("en-IN");
    const safeTitle = `UP_Expense_Presentation_${periodLabel.replace(/[^a-zA-Z0-9]/g, "_")}`;

    const catRowsHtml = (dashboardData.categoryBreakdown || [])
      .map(
        (c) => `
      <div style="margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #f1f5f9;">
          <span>${c.name}</span>
          <span style="color: #B5F823;">₹${formatInr(c.total)} <span style="color: #94a3b8; font-size: 11px;">(${c.percentage}%)</span></span>
        </div>
        <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden;">
          <div style="width: ${c.percentage}%; height: 100%; background: linear-gradient(90deg, #7FB706, #B5F823); border-radius: 999px;"></div>
        </div>
      </div>
    `
      )
      .join("");

    const topExpRowsHtml = (dashboardData.topExpenses || [])
      .map(
        (e, i) => `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
        <td style="padding: 12px 10px; font-weight: 700; color: #7FB706;">#${i + 1}</td>
        <td style="padding: 12px 10px; color: #cbd5e1;">${e.expenseDate}</td>
        <td style="padding: 12px 10px; font-weight: 700; color: #ffffff;">${e.paidTo}</td>
        <td style="padding: 12px 10px; color: #94a3b8;">${e.categoryName}</td>
        <td style="padding: 12px 10px; font-weight: 800; color: #B5F823; text-align: right; font-family: monospace;">₹${formatInr(e.amount)}</td>
        <td style="padding: 12px 10px; text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; ${
            e.verified ? "background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3);" : "background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3);"
          }">${e.verified ? "VERIFIED" : "PENDING"}</span>
        </td>
      </tr>
    `
      )
      .join("");

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #030213; color: #f8fafc; margin: 0; padding: 28px; }
    .card { background: #0f0e26; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); margin-bottom: 24px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi-box { background: #121226; border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 18px; }
    .kpi-title { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.05em; }
    .kpi-val { font-size: 26px; font-weight: 900; color: #ffffff; margin-top: 6px; font-family: monospace; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 12px 10px; background: #030213; color: #7FB706; font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; border-bottom: 2px solid #7FB706; }
    .badge-super { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; background: rgba(127,183,6,0.2); color: #B5F823; border: 1px solid rgba(127,183,6,0.4); text-transform: uppercase; margin-left: 8px; }
  </style>
</head>
<body>
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 16px;">
    <div>
      <h1 style="margin: 0; font-size: 22px; color: #ffffff; display: flex; align-items: center;">
        Pacific Products & Solutions — UP Daily Expense Audit
        <span class="badge-super">Super Admin Only</span>
      </h1>
      <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">Executive Review Period: <strong style="color: #B5F823;">${periodLabel}</strong> &bull; Generated: ${timestamp}</p>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-title">Total Spend</div>
      <div class="kpi-val" style="color: #ffffff;">₹${formatInr(totalSpend)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">Super Admin Verified</div>
      <div class="kpi-val" style="color: #34d399;">₹${formatInr(verifiedTotal)} <span style="font-size: 13px; color: #34d399;">(${verifiedPct}%)</span></div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">Pending Verification</div>
      <div class="kpi-val" style="color: #fbbf24;">₹${formatInr(unverifiedTotal)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">Daily Average</div>
      <div class="kpi-val" style="color: #B5F823;">₹${formatInr(dailyAverage)}</div>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top: 0; font-size: 15px; font-weight: 800; color: #ffffff; margin-bottom: 18px; text-transform: uppercase; letter-spacing: 0.05em;">
      Category Breakdown
    </h3>
    ${catRowsHtml}
  </div>

  <div class="card">
    <h3 style="margin-top: 0; font-size: 15px; font-weight: 800; color: #ffffff; margin-bottom: 18px; text-transform: uppercase; letter-spacing: 0.05em;">
      Top High-Value Expenditures
    </h3>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Date</th>
          <th>Paid To</th>
          <th>Category</th>
          <th style="text-align: right;">Amount</th>
          <th style="text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${topExpRowsHtml}
      </tbody>
    </table>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeTitle}.html`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#030213] border border-white/10 rounded-2xl w-full max-w-5xl my-auto shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#B5F823]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Executive Presentation
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7FB706]/20 text-[#B5F823] border border-[#7FB706]/30 uppercase tracking-widest">
                  Super Admin
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Period: <strong className="text-white">{periodLabel}</strong> &bull; Total Transactions: {totalTxCount}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
              title="Print Voucher"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={handleDownloadStandaloneHtml}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
              title="Save HTML"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">HTML</span>
            </button>
            {onExportExcel && (
              <button
                onClick={onExportExcel}
                className="p-2 rounded-xl bg-[#7FB706]/20 hover:bg-[#7FB706]/30 text-[#B5F823] border border-[#7FB706]/40 transition flex items-center gap-1.5 text-xs font-bold"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Excel</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div ref={printableRef} className="p-6 overflow-y-auto space-y-6 text-white">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Spend</span>
              <div className="text-2xl font-black text-white mt-1">₹{formatInr(totalSpend)}</div>
              <span className="text-[11px] text-gray-400 mt-1 block">In {periodLabel}</span>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Verified ({verifiedPct}%)</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">₹{formatInr(verifiedTotal)}</div>
              <span className="text-[11px] text-emerald-300/70 mt-1 block">Super Admin Approved</span>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Pending Verification</span>
              <div className="text-2xl font-black text-amber-400 mt-1">₹{formatInr(unverifiedTotal)}</div>
              <span className="text-[11px] text-amber-300/70 mt-1 block">Awaiting Review</span>
            </div>

            <div className="bg-[#7FB706]/10 border border-[#7FB706]/20 rounded-2xl p-4">
              <span className="text-[10px] font-bold text-[#B5F823] uppercase tracking-widest">Daily Average</span>
              <div className="text-2xl font-black text-[#B5F823] mt-1">₹{formatInr(dailyAverage)}</div>
              <span className="text-[11px] text-gray-300 mt-1 block">Top: {topCategory}</span>
            </div>
          </div>

          {/* Trend Chart */}
          {dashboardData.trend && dashboardData.trend.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#7FB706]" />
                  Spending Velocity Timeline
                </h3>
                <span className="text-xs text-gray-400 font-mono">Daily Total Trend</span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardData.trend}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7FB706" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#7FB706" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${v}`} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#030213", borderColor: "#7FB706", borderRadius: 12 }}
                      formatter={(val: any) => [`₹${formatInr(val)}`, "Expense"]}
                    />
                    <Area type="monotone" dataKey="total" stroke="#7FB706" strokeWidth={2.5} fill="url(#areaGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 2-Column: Category Distribution + Top Expenditures */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#B5F823]" />
                Category Distribution
              </h3>
              <div className="space-y-3">
                {(dashboardData.categoryBreakdown || []).map((cat) => (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-200">{cat.name}</span>
                      <span className="font-bold text-white font-mono">
                        ₹{formatInr(cat.total)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#7FB706] to-[#B5F823] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, cat.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 Expenditures */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-amber-400" />
                Top Expenditure Items
              </h3>
              <div className="space-y-2">
                {(dashboardData.topExpenses || []).map((exp, idx) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-gray-500 w-5">#{idx + 1}</span>
                      <div>
                        <div className="text-xs font-bold text-white">{exp.paidTo}</div>
                        <div className="text-[10px] text-gray-400">
                          {exp.categoryName} &bull; {exp.expenseDate}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-white font-mono">₹{formatInr(exp.amount)}</div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          exp.verified ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {exp.verified ? "Verified" : "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
