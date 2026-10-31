import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  RotateCw,
  SlidersHorizontal,
  ChevronDown,
  ArrowRight,
  Download,
  CalendarDays,
  FileSpreadsheet,
} from 'lucide-react';
import { useReportingPeriod } from '../../context/ReportingPeriodContext';
import { ReportingPeriodType } from '../../types/admin';
import {
  formatDateInKolkata,
  getCurrentIndianFiscalYear,
  getCurrentCalendarYear,
} from '../../utils/reportingPeriods';

interface ReportingPeriodBarProps {
  onOpenExportModal?: () => void;
  className?: string;
  showExportButton?: boolean;
}

const PERIOD_TABS: Array<{ type: ReportingPeriodType; label: string; shortLabel: string }> = [
  { type: 'DAILY', label: 'Daily', shortLabel: 'Day' },
  { type: 'WEEKLY', label: 'Weekly', shortLabel: 'Week' },
  { type: 'MONTHLY', label: 'Monthly', shortLabel: 'Month' },
  { type: 'QUARTERLY', label: 'Quarterly', shortLabel: 'Qtr' },
  { type: 'HALF_YEARLY', label: 'Half-Yearly', shortLabel: 'Half' },
  { type: 'YEARLY', label: 'Yearly', shortLabel: 'Year' },
  { type: 'FINANCIAL_YEAR', label: 'Financial Year', shortLabel: 'FY' },
  { type: 'CUSTOM', label: 'Custom Range', shortLabel: 'Custom' },
];

export const ReportingPeriodBar: React.FC<ReportingPeriodBarProps> = ({
  onOpenExportModal,
  className = '',
  showExportButton = true,
}) => {
  const {
    selection,
    resolvedPeriod,
    isRefreshing,
    setPeriodType,
    setDailyDate,
    setWeeklyWeek,
    setMonthlyMonth,
    setQuarter,
    setHalfYear,
    setYear,
    setFinancialYear,
    setCustomRange,
    setComparisonMode,
    triggerRefresh,
  } = useReportingPeriod();

  const [showSubPickers, setShowSubPickers] = useState<boolean>(false);

  // Derived current dates
  const todayIso = new Date().toISOString().slice(0, 10);
  const curFy = getCurrentIndianFiscalYear();
  const curYear = getCurrentCalendarYear();

  return (
    <div className={`bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-xl ${className}`}>
      {/* Top Row: Period Mode Selector Pills & Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Period Selector Horizontal Scrollable Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0 scrollbar-thin scrollbar-thumb-slate-700">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1 mr-1 flex items-center gap-1 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-lime-400" />
            Period:
          </span>
          {PERIOD_TABS.map((tab) => {
            const isActive = selection.type === tab.type;
            return (
              <button
                key={tab.type}
                type="button"
                onClick={() => {
                  setPeriodType(tab.type);
                  setShowSubPickers(true);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-lime-500 text-slate-950 font-bold shadow-md shadow-lime-500/20 ring-1 ring-lime-400'
                    : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60'
                }`}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-2 self-end xl:self-auto shrink-0">
          {/* Comparison Mode Selector */}
          <div className="relative inline-flex items-center">
            <label className="text-[11px] text-slate-400 font-medium mr-1.5 hidden md:inline">Compare:</label>
            <select
              value={selection.comparisonMode || 'PREVIOUS_PERIOD'}
              onChange={(e) => setComparisonMode(e.target.value as any)}
              className="bg-slate-800/90 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-lime-400 focus:outline-none"
            >
              <option value="PREVIOUS_PERIOD">Previous Period (Auto)</option>
              <option value="CUSTOM_PREVIOUS">Manual Prior Period</option>
              <option value="NONE">Off (Current Only)</option>
            </select>
          </div>

          {/* Sub-picker toggle button */}
          <button
            type="button"
            onClick={() => setShowSubPickers((prev) => !prev)}
            className={`p-1.5 rounded-lg text-xs border transition-colors flex items-center gap-1 ${
              showSubPickers
                ? 'bg-lime-950/40 text-lime-400 border-lime-500/30'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
            title="Toggle Detailed Period Pickers"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <ChevronDown className={`w-3 h-3 transition-transform ${showSubPickers ? 'rotate-180' : ''}`} />
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={triggerRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Refresh Analytics & Clear Cache"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-lime-400' : ''}`} />
          </button>

          {/* Export Report Trigger */}
          {showExportButton && onOpenExportModal && (
            <button
              type="button"
              onClick={onOpenExportModal}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-900/30 border border-emerald-500/30 flex items-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Pickers Drawer (Contextual options per selected Period) */}
      {showSubPickers && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950/40 p-3 rounded-lg">
          {/* DAILY Sub-picker */}
          {selection.type === 'DAILY' && (
            <>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Quick Day Selection</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDailyDate(todayIso)}
                    className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 rounded border border-slate-700"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      setDailyDate(d.toISOString().slice(0, 10));
                    }}
                    className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 rounded border border-slate-700"
                  >
                    Yesterday
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Select Exact Date</label>
                <input
                  type="date"
                  value={selection.date || todayIso}
                  onChange={(e) => setDailyDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1 w-full focus:ring-1 focus:ring-lime-400"
                />
              </div>
            </>
          )}

          {/* WEEKLY Sub-picker */}
          {selection.type === 'WEEKLY' && (
            <>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Quick Week</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWeeklyWeek('')}
                    className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 rounded border border-slate-700"
                  >
                    Current Week
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Select Week (YYYY-Www)</label>
                <input
                  type="week"
                  value={selection.week || ''}
                  onChange={(e) => setWeeklyWeek(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1 w-full focus:ring-1 focus:ring-lime-400"
                />
              </div>
            </>
          )}

          {/* MONTHLY Sub-picker */}
          {selection.type === 'MONTHLY' && (
            <>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Quick Month</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMonthlyMonth(todayIso.slice(0, 7))}
                    className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 rounded border border-slate-700"
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() - 1);
                      setMonthlyMonth(d.toISOString().slice(0, 7));
                    }}
                    className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 rounded border border-slate-700"
                  >
                    Last Month
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Select Month (YYYY-MM)</label>
                <input
                  type="month"
                  value={selection.month || todayIso.slice(0, 7)}
                  onChange={(e) => setMonthlyMonth(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1 w-full focus:ring-1 focus:ring-lime-400"
                />
              </div>
            </>
          )}

          {/* QUARTERLY Sub-picker */}
          {selection.type === 'QUARTERLY' && (
            <>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Quarter</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuarter(q, selection.quarterYear || curYear, selection.quarterType || 'FY')}
                      className={`py-1 text-xs rounded border text-center font-medium ${
                        selection.quarter === q
                          ? 'bg-lime-500 text-slate-950 border-lime-400 font-bold'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Fiscal / Calendar</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQuarter(selection.quarter || 'Q1', selection.quarterYear || curYear, 'FY')}
                    className={`px-2.5 py-1 text-xs rounded border ${
                      selection.quarterType !== 'CALENDAR'
                        ? 'bg-slate-700 text-white border-lime-500/50'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    Indian FY (Apr–Mar)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuarter(selection.quarter || 'Q1', selection.quarterYear || curYear, 'CALENDAR')}
                    className={`px-2.5 py-1 text-xs rounded border ${
                      selection.quarterType === 'CALENDAR'
                        ? 'bg-slate-700 text-white border-lime-500/50'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    Calendar (Jan–Dec)
                  </button>
                </div>
              </div>
            </>
          )}

          {/* HALF-YEARLY Sub-picker */}
          {selection.type === 'HALF_YEARLY' && (
            <>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Fiscal Half</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHalfYear('H1', selection.halfYearFiscalYear || curFy)}
                    className={`px-3 py-1 text-xs rounded border font-medium ${
                      selection.halfYear !== 'H2'
                        ? 'bg-lime-500 text-slate-950 border-lime-400 font-bold'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    H1 (Apr – Sep)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHalfYear('H2', selection.halfYearFiscalYear || curFy)}
                    className={`px-3 py-1 text-xs rounded border font-medium ${
                      selection.halfYear === 'H2'
                        ? 'bg-lime-500 text-slate-950 border-lime-400 font-bold'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    H2 (Oct – Mar)
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Financial Year</label>
                <select
                  value={selection.halfYearFiscalYear || curFy}
                  onChange={(e) => setHalfYear(selection.halfYear || 'H1', e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1 w-full"
                >
                  <option value="2026-27">FY 2026-27</option>
                  <option value="2025-26">FY 2025-26</option>
                  <option value="2024-25">FY 2024-25</option>
                </select>
              </div>
            </>
          )}

          {/* YEARLY Sub-picker */}
          {selection.type === 'YEARLY' && (
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Calendar Year</label>
              <select
                value={selection.year || curYear}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1 w-full"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
                <option value={2023}>2023</option>
              </select>
            </div>
          )}

          {/* FINANCIAL YEAR Sub-picker */}
          {selection.type === 'FINANCIAL_YEAR' && (
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Indian Financial Year (1 Apr – 31 Mar)</label>
              <select
                value={selection.financialYear || curFy}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1 w-full"
              >
                <option value="2026-27">FY 2026-27 (Current)</option>
                <option value="2025-26">FY 2025-26</option>
                <option value="2024-25">FY 2024-25</option>
                <option value="2023-24">FY 2023-24</option>
              </select>
            </div>
          )}

          {/* CUSTOM Date Range Sub-picker */}
          {selection.type === 'CUSTOM' && (
            <>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={selection.customStart || todayIso}
                  onChange={(e) => setCustomRange(e.target.value, selection.customEnd || todayIso)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1 w-full focus:ring-1 focus:ring-lime-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">End Date</label>
                <input
                  type="date"
                  value={selection.customEnd || todayIso}
                  onChange={(e) => setCustomRange(selection.customStart || todayIso, e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1 w-full focus:ring-1 focus:ring-lime-400"
                />
              </div>
            </>
          )}

          {/* Manual Prior Comparison Dates (if CUSTOM_PREVIOUS selected) */}
          {selection.comparisonMode === 'CUSTOM_PREVIOUS' && (
            <>
              <div>
                <label className="text-[11px] font-medium text-amber-400 block mb-1">Prior Period Start</label>
                <input
                  type="date"
                  value={selection.compareCustomStart || ''}
                  onChange={(e) => setComparisonMode('CUSTOM_PREVIOUS', e.target.value, selection.compareCustomEnd)}
                  className="bg-slate-800 border border-amber-500/40 text-slate-200 text-xs rounded px-2.5 py-1 w-full focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-amber-400 block mb-1">Prior Period End</label>
                <input
                  type="date"
                  value={selection.compareCustomEnd || ''}
                  onChange={(e) => setComparisonMode('CUSTOM_PREVIOUS', selection.compareCustomStart, e.target.value)}
                  className="bg-slate-800 border border-amber-500/40 text-slate-200 text-xs rounded px-2.5 py-1 w-full focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Bottom Summary Bar: Active Date Boundaries & Timezone Confirmation */}
      <div className="mt-2.5 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-lime-950/40 border border-lime-500/30 text-lime-400 font-medium">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Active: {resolvedPeriod.label}</span>
          </span>

          <span className="text-slate-300 font-semibold">
            {resolvedPeriod.startDateLocal} <span className="text-slate-400 font-normal">to</span> {resolvedPeriod.endDateLocal}
          </span>

          {resolvedPeriod.previousStartDateLocal && selection.comparisonMode !== 'NONE' && (
            <span className="inline-flex items-center gap-1 text-slate-400 pl-1 border-l border-slate-700">
              <span className="text-slate-400">vs</span>
              <span className="text-slate-300 font-medium">{resolvedPeriod.comparisonLabel || 'Prior Period'}</span>
              <span className="text-[11px] text-slate-400">
                ({resolvedPeriod.previousStartDateLocal} – {resolvedPeriod.previousEndDateLocal})
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>Strict Business Timezone: <strong className="text-slate-300">Asia/Kolkata (IST = UTC+05:30)</strong></span>
        </div>
      </div>
    </div>
  );
};
