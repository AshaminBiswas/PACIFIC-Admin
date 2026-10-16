import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calculator,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Save,
  Check,
  TrendingUp,
  Clock,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { employeeService } from '../../api/employeeService';
import type {
  Employee,
  EmployeePayrollRun,
  SalaryCalculationBreakdown,
  SalaryCalculationStepHistory,
  SimulateSalaryCalculationPayload,
} from '../../types/employee';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function computeFixedPayableDays(month: number, year: number): number {
  const totalDays = new Date(year, month, 0).getDate();
  let sundays = 0;
  for (let d = 1; d <= totalDays; d++) {
    if (new Date(year, month - 1, d).getDay() === 0) {
      sundays++;
    }
  }
  return totalDays - sundays;
}

interface DynamicSalaryCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  selectedMonth: number;
  selectedYear: number;
  payrollRuns?: EmployeePayrollRun[];
  initialData?: Partial<SimulateSalaryCalculationPayload> | null;
  onSaveSuccess?: () => void;
}

export const DynamicSalaryCalculatorModal: React.FC<DynamicSalaryCalculatorModalProps> = ({
  isOpen,
  onClose,
  employees,
  selectedMonth: initialMonth,
  selectedYear: initialYear,
  payrollRuns = [],
  initialData,
  onSaveSuccess,
}) => {
  const defaultMonth = initialData?.month || initialMonth || 10;
  const defaultYear = initialData?.year || initialYear || 2026;
  const initialFixedDivisor = computeFixedPayableDays(defaultMonth, defaultYear);

  // ─── Input State ────────────────────────────────────────────────────────────
  const [selectedEmpId, setSelectedEmpId] = useState<string>(initialData?.employeeId || '');
  const [employeeName, setEmployeeName] = useState<string>(initialData?.employeeName || '');
  const [month, setMonth] = useState<number>(defaultMonth);
  const [year, setYear] = useState<number>(defaultYear);

  // Form Inputs with Default Rules as per Specification
  const [monthlyCtc, setMonthlyCtc] = useState<number>(initialData?.monthlyCtc ?? 23500);
  const [standardPayableDays, setStandardPayableDays] = useState<number>(
    initialData?.standardPayableDays ?? initialFixedDivisor
  );
  const [standardWorkingHours, setStandardWorkingHours] = useState<number>(initialData?.standardWorkingHours ?? 8);
  const [regularPayableDays, setRegularPayableDays] = useState<number>(initialData?.regularPayableDays ?? initialFixedDivisor);
  const [additionalSundayDutyCredits, setAdditionalSundayDutyCredits] = useState<number>(
    initialData?.additionalSundayDutyCredits ?? 0
  );
  const [additionalDoubleDutyCredits, setAdditionalDoubleDutyCredits] = useState<number>(
    initialData?.additionalDoubleDutyCredits ?? 0
  );
  const [approvedOvertimeHours, setApprovedOvertimeHours] = useState<number>(
    initialData?.approvedOvertimeHours ?? 0
  );
  const [overtimeMultiplier, setOvertimeMultiplier] = useState<number>(initialData?.overtimeMultiplier ?? 1.0);
  const [partialDeductions, setPartialDeductions] = useState<number>(initialData?.partialDeductions ?? 0);
  const [additionalAllowances, setAdditionalAllowances] = useState<number>(initialData?.additionalAllowances ?? 0);

  // UI state
  const [showHistory, setShowHistory] = useState<boolean>(true);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState<boolean>(false);
  const [employeePendingAdvance, setEmployeePendingAdvance] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Sync state when modal opens or props change
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      if (initialData.employeeId !== undefined) setSelectedEmpId(initialData.employeeId || '');
      if (initialData.employeeName !== undefined) setEmployeeName(initialData.employeeName || '');
      const targetMonth = initialData.month ?? initialMonth ?? 10;
      const targetYear = initialData.year ?? initialYear ?? 2026;
      setMonth(targetMonth);
      setYear(targetYear);
      if (initialData.monthlyCtc !== undefined) setMonthlyCtc(initialData.monthlyCtc);
      setStandardPayableDays(
        initialData.standardPayableDays ?? computeFixedPayableDays(targetMonth, targetYear)
      );
      if (initialData.standardWorkingHours !== undefined) setStandardWorkingHours(initialData.standardWorkingHours);
      if (initialData.regularPayableDays !== undefined) setRegularPayableDays(initialData.regularPayableDays);
      if (initialData.additionalSundayDutyCredits !== undefined)
        setAdditionalSundayDutyCredits(initialData.additionalSundayDutyCredits);
      if (initialData.additionalDoubleDutyCredits !== undefined)
        setAdditionalDoubleDutyCredits(initialData.additionalDoubleDutyCredits);
      if (initialData.approvedOvertimeHours !== undefined)
        setApprovedOvertimeHours(initialData.approvedOvertimeHours);
      if (initialData.overtimeMultiplier !== undefined) setOvertimeMultiplier(initialData.overtimeMultiplier);
      if (initialData.partialDeductions !== undefined) setPartialDeductions(initialData.partialDeductions);
      if (initialData.additionalAllowances !== undefined) setAdditionalAllowances(initialData.additionalAllowances);
    } else {
      const targetMonth = initialMonth || 10;
      const targetYear = initialYear || 2026;
      setMonth(targetMonth);
      setYear(targetYear);
      const fixedDivisor = computeFixedPayableDays(targetMonth, targetYear);
      setStandardPayableDays(fixedDivisor);

      // Auto-sync with first employee in current payroll runs if present
      const monthRuns = payrollRuns.filter((r) => r.month === targetMonth && r.year === targetYear);
      if (monthRuns.length > 0) {
        handleEmployeeSelect(monthRuns[0].employeeId, targetMonth, targetYear);
      }
    }
  }, [isOpen, initialData, initialMonth, initialYear]);

  // Load defaults when user selects an employee, syncing directly with current month's payroll data
  const handleEmployeeSelect = async (empId: string, targetMonth = month, targetYear = year) => {
    setSelectedEmpId(empId);
    if (!empId) {
      setEmployeeName('');
      setEmployeePendingAdvance(0);
      return;
    }
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      setEmployeeName(emp.name);
      if (emp.monthlyCtc && Number(emp.monthlyCtc) > 0) {
        setMonthlyCtc(Number(emp.monthlyCtc));
      }
    }

    const fixedDivisor = computeFixedPayableDays(targetMonth, targetYear);
    setStandardPayableDays(fixedDivisor);

    // 1. Immediately sync from current month's loaded payrollRuns table (0ms, 100% accurate)
    const existingRun = payrollRuns.find(
      (r) => r.employeeId === empId && r.month === targetMonth && r.year === targetYear
    );
    if (existingRun) {
      const presentPart = Number(existingRun.presentDays || 0);
      const clPart = Number(existingRun.clDays || 0);
      const elPart = Number(existingRun.elDays || 0);
      const holPart = Number(existingRun.holidayDays || 0);
      const halfPart = 0.5 * Number(existingRun.halfDays || 0);
      const ddPart = Number(existingRun.doubleDutyDays || 0);
      const runPayableDays = Number(existingRun.payableDays) || fixedDivisor;

      setMonthlyCtc(Number(existingRun.monthlyCtc || emp?.monthlyCtc || 23500));
      setStandardPayableDays(runPayableDays);
      setStandardWorkingHours(Number(existingRun.workingHoursPerDay || 8));
      setRegularPayableDays(presentPart + clPart + elPart + holPart + halfPart + ddPart);
      setAdditionalSundayDutyCredits(Number(existingRun.approvedSundays || 0));
      setAdditionalDoubleDutyCredits(ddPart);
      setApprovedOvertimeHours(Number(existingRun.overtimeHours || 0));
      setOvertimeMultiplier(Number(existingRun.overtimeMultiplier || 1.0));
      setPartialDeductions(Number(existingRun.advanceDeduction || 0) + Number(existingRun.otherDeductions || 0));
      setAdditionalAllowances(Number(existingRun.additionalAllowances || 0));
      showToast('success', `Synced current ${MONTH_NAMES[targetMonth - 1] || 'month'} payroll data for ${emp?.name || 'Employee'}`);
    }

    // 2. Fetch server-side defaults & total pending advances in background
    try {
      setIsLoadingDefaults(true);
      const defaults = await employeeService.getEmployeeSalaryDefaults(empId, targetMonth, targetYear);
      if (defaults) {
        if (!existingRun) {
          setMonthlyCtc(defaults.monthlyCtc || 23500);
          setStandardPayableDays(defaults.standardPayableDays || fixedDivisor);
          setStandardWorkingHours(defaults.standardWorkingHours || 8);
          setRegularPayableDays(defaults.regularPayableDays || 0);
          setAdditionalSundayDutyCredits(defaults.additionalSundayDutyCredits || 0);
          setAdditionalDoubleDutyCredits(defaults.additionalDoubleDutyCredits || 0);
          setApprovedOvertimeHours(defaults.approvedOvertimeHours || 0);
          setOvertimeMultiplier(defaults.overtimeMultiplier || 1.0);
          setPartialDeductions(defaults.partialDeductions || 0);
          setAdditionalAllowances(defaults.additionalAllowances || 0);
          showToast('success', `Loaded recorded payroll inputs for ${defaults.employeeName}`);
        }
        if (defaults.totalPendingAdvance !== undefined) {
          setEmployeePendingAdvance(defaults.totalPendingAdvance);
        }
      }
    } catch {
      // Gracefully silent if server defaults endpoint is unavailable
    } finally {
      setIsLoadingDefaults(false);
    }
  };

  // ─── Instant Pure JavaScript Mathematical Calculation (0ms) ────────────────
  const calculation: SalaryCalculationBreakdown = useMemo(() => {
    // Formula A: Per-day salary = Monthly Salary Base ÷ Standard Payable Days
    const safeStandardDays = Math.max(1, standardPayableDays);
    const perDaySalaryRaw = monthlyCtc / safeStandardDays;

    // Formula B: Per-hour salary = Per-Day Salary ÷ Standard Working Hours
    const safeWorkingHours = Math.max(1, standardWorkingHours);
    const perHourSalaryRaw = perDaySalaryRaw / safeWorkingHours;

    // Total Payable Day Equivalents = Regular Payable Days + Additional Sunday Duty Credits + Additional Double-Duty Credits
    const totalPayableDayEquivalents =
      regularPayableDays + additionalSundayDutyCredits + additionalDoubleDutyCredits;

    // Base Payable Salary = Total Payable Day Equivalents × Per-Day Salary
    const basePayableSalaryRaw = totalPayableDayEquivalents * perDaySalaryRaw;

    // Overtime Pay = Approved Overtime Hours × Per-Hour Salary × Overtime Multiplier
    const safeMultiplier = Math.max(0, overtimeMultiplier);
    const overtimePayRaw = approvedOvertimeHours * perHourSalaryRaw * safeMultiplier;

    // Gross Salary = Base Payable Salary + Overtime Pay + Additional Allowances
    const grossEarningsRaw = basePayableSalaryRaw + overtimePayRaw + additionalAllowances;

    // Final Payable Salary = Max(0, Gross Salary − Total Deductions)
    const finalPayableSalaryRaw = Math.max(0, grossEarningsRaw - partialDeductions);

    // Rounded outputs for display matching payslip line items
    const perDaySalary = Number(perDaySalaryRaw.toFixed(2));
    const perHourSalary = Number(perHourSalaryRaw.toFixed(2));
    const basePayableSalary = Number(basePayableSalaryRaw.toFixed(2));
    const overtimePay = Number(overtimePayRaw.toFixed(2));
    const grossEarnings = Number((basePayableSalary + overtimePay + additionalAllowances).toFixed(2));
    const finalPayableSalary = Math.max(0, Number((grossEarnings - partialDeductions).toFixed(2)));

    const calculationHistory: SalaryCalculationStepHistory[] = [
      {
        step: 1,
        title: 'Per-Day Salary (Formula A)',
        formula: 'Monthly Salary Base ÷ Payable Days (Fixed)',
        calculation: `₹${monthlyCtc.toLocaleString('en-IN')} ÷ ${safeStandardDays} = ₹${perDaySalaryRaw.toFixed(4)}`,
        result: `₹${perDaySalary.toFixed(2)} / day`,
        explanation:
          `Monthly salary divided by fixed payable capacity divisor (${safeStandardDays} days excluding statutory Sundays). Sunday work and double duty shifts do not modify this fixed divisor.`,
      },
      {
        step: 2,
        title: 'Per-Hour Salary (Formula B)',
        formula: 'Per-Day Salary ÷ Standard Working Hours',
        calculation: `₹${perDaySalaryRaw.toFixed(4)} ÷ ${safeWorkingHours} hrs = ₹${perHourSalaryRaw.toFixed(4)}`,
        result: `₹${perHourSalary.toFixed(2)} / hr`,
        explanation: `Hourly wage rate based on standard ${safeWorkingHours}-hour working shift.`,
      },
      {
        step: 3,
        title: 'Paid Days / Present Day Equivalents',
        formula: 'Regular Present Days + Sunday Duty Credits + Double-Duty Credits',
        calculation: `${regularPayableDays} + ${additionalSundayDutyCredits} + ${additionalDoubleDutyCredits} = ${totalPayableDayEquivalents}`,
        result: `${totalPayableDayEquivalents} days`,
        explanation:
          'Total attendance units eligible for wage compensation. Extra Sunday shifts and double-duty shifts credit directly here.',
      },
      {
        step: 4,
        title: 'Base Payable Salary',
        formula: 'Paid Days (Total Present) × Per-Day Salary',
        calculation: `${totalPayableDayEquivalents} × ₹${perDaySalaryRaw.toFixed(4)} = ₹${basePayableSalaryRaw.toFixed(2)}`,
        result: `₹${basePayableSalary.toFixed(2)}`,
        explanation: 'Base wages earned for attendance day equivalents prior to overtime and allowances.',
      },
      {
        step: 5,
        title: 'Approved Overtime Compensation',
        formula: 'Approved Overtime Hours × Per-Hour Salary × Overtime Multiplier',
        calculation: `${approvedOvertimeHours} hrs × ₹${perHourSalaryRaw.toFixed(4)} × ${safeMultiplier} = ₹${overtimePayRaw.toFixed(2)}`,
        result: `₹${overtimePay.toFixed(2)}`,
        explanation: `Overtime pay for ${approvedOvertimeHours} approved hours at ${safeMultiplier}x standard hourly rate.`,
      },
      {
        step: 6,
        title: 'Gross Earnings',
        formula: 'Base Payable Salary + Overtime Pay + Additional Allowances',
        calculation: `₹${basePayableSalaryRaw.toFixed(2)} + ₹${overtimePayRaw.toFixed(2)} + ₹${additionalAllowances.toFixed(2)} = ₹${grossEarningsRaw.toFixed(2)}`,
        result: `₹${grossEarnings.toFixed(2)}`,
        explanation: 'Total gross salary prior to statutory and advance deductions.',
      },
      {
        step: 7,
        title: 'Final Payable Salary (Take-Home)',
        formula: 'Gross Earnings − Partial Deductions & Advances',
        calculation: `₹${grossEarningsRaw.toFixed(2)} − ₹${partialDeductions.toFixed(2)} = ₹${finalPayableSalaryRaw.toFixed(2)}`,
        result: `₹${finalPayableSalary.toFixed(2)}`,
        explanation: 'Final take-home salary after deducting partial salary advance recoveries and other deductions.',
      },
    ];

    return {
      monthlySalaryBase: monthlyCtc,
      standardPayableDays: safeStandardDays,
      perDaySalary,
      perHourSalary,
      regularPayableAttendance: regularPayableDays,
      additionalSundayDutyCredit: additionalSundayDutyCredits,
      additionalDoubleDutyCredit: additionalDoubleDutyCredits,
      totalPayableDayEquivalents,
      basePayableSalary,
      approvedOvertimeHours,
      overtimeMultiplier: safeMultiplier,
      overtimePay,
      additionalEarnings: additionalAllowances,
      partialDeductions,
      grossEarnings,
      finalPayableSalary,
      raw: {
        perDaySalary: perDaySalaryRaw,
        perHourSalary: perHourSalaryRaw,
        basePayableSalary: basePayableSalaryRaw,
        overtimePay: overtimePayRaw,
        grossEarnings: grossEarningsRaw,
        finalPayableSalary: finalPayableSalaryRaw,
      },
      calculationHistory,
    };
  }, [
    monthlyCtc,
    standardPayableDays,
    standardWorkingHours,
    regularPayableDays,
    additionalSundayDutyCredits,
    additionalDoubleDutyCredits,
    approvedOvertimeHours,
    overtimeMultiplier,
    partialDeductions,
    additionalAllowances,
  ]);

  // ─── Acceptance Test Quick Preset Handlers ─────────────────────────────────
  const applyPreset1 = () => {
    setSelectedEmpId('');
    setEmployeeName('Standard Acceptance Staff');
    setMonth(9);
    setYear(2026);
    setMonthlyCtc(23500);
    setStandardPayableDays(26);
    setStandardWorkingHours(8);
    setRegularPayableDays(26);
    setAdditionalSundayDutyCredits(1);
    setAdditionalDoubleDutyCredits(1);
    setApprovedOvertimeHours(0);
    setOvertimeMultiplier(1.0);
    setPartialDeductions(0);
    setAdditionalAllowances(0);
    showToast('success', 'Applied Acceptance Test 1 (Expected Final: ₹25,307.69)');
  };

  const applyPreset2 = () => {
    setSelectedEmpId('');
    setEmployeeName('Standard Acceptance Staff (+OT & Deductions)');
    setMonth(9);
    setYear(2026);
    setMonthlyCtc(23500);
    setStandardPayableDays(26);
    setStandardWorkingHours(8);
    setRegularPayableDays(26);
    setAdditionalSundayDutyCredits(1);
    setAdditionalDoubleDutyCredits(1);
    setApprovedOvertimeHours(4);
    setOvertimeMultiplier(1.0);
    setPartialDeductions(500);
    setAdditionalAllowances(0);
    showToast('success', 'Applied Acceptance Test 2 (4h OT & ₹500 Ded -> Expected Final: ₹25,259.61)');
  };

  const handleSaveToPayroll = async () => {
    if (!selectedEmpId) {
      showToast('error', 'Please select an employee first to save this calculation to payroll');
      return;
    }

    try {
      setIsSaving(true);
      await employeeService.simulateSalaryCalculation({
        employeeId: selectedEmpId,
        employeeName,
        month,
        year,
        monthlyCtc,
        standardPayableDays,
        standardWorkingHours,
        regularPayableDays,
        additionalSundayDutyCredits,
        additionalDoubleDutyCredits,
        approvedOvertimeHours,
        overtimeMultiplier,
        partialDeductions,
        additionalAllowances,
        saveToPayroll: true,
      });

      showToast('success', 'Successfully saved dynamic calculation to monthly payroll run!');
      if (onSaveSuccess) onSaveSuccess();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to save calculation to payroll');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm animate-in slide-in-from-top-4 ${
            feedback.type === 'success'
              ? 'bg-[#0f172a] text-emerald-400 border-emerald-500/30'
              : 'bg-[#18181b] text-rose-400 border-rose-500/30'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="bg-[#121214] border border-[#27272A] w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* ── Modal Header ─────────────────────────────────────────────────── */}
        <div className="px-6 py-4.5 bg-[#18181B] border-b border-[#27272A] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Calculator size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#FAFAFA]">
                  Dynamic Salary, Attendance & Overtime Calculator
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  REAL-TIME FORMULA ENGINE
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Full-precision wage arithmetic with configurable payable capacity, overtime rates, and partial deductions.
              </p>
            </div>
          </div>

          {/* Quick Presets & Close */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={applyPreset1}
              className="px-2.5 py-1.5 bg-[#27272A]/70 hover:bg-[#27272A] text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-lg transition"
              title="Test Case 1: 23,500 CTC, 26d, 1 Sun, 1 DD -> ₹25,307.69"
            >
              Test Case 1 (₹25,307.69)
            </button>
            <button
              type="button"
              onClick={applyPreset2}
              className="px-2.5 py-1.5 bg-[#27272A]/70 hover:bg-[#27272A] text-emerald-300 border border-emerald-500/30 text-xs font-semibold rounded-lg transition"
              title="Test Case 2: +4h OT, ₹500 Deduction -> ₹25,259.61"
            >
              Test Case 2 (₹25,259.61)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A] rounded-xl transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Modal Body (Scrollable Grid) ─────────────────────────────────── */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Live Result Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-[#18181B] to-amber-950/30 border border-emerald-500/20">
            <div className="md:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/90 flex items-center gap-1.5">
                <Sparkles size={14} /> Final Take-Home Payable Salary
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 mt-1">
                ₹{calculation.finalPayableSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-[#A1A1AA] mt-1 flex flex-wrap items-center gap-3">
                <span>Gross: ₹{calculation.grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                <span>•</span>
                <span>Deductions: -₹{calculation.partialDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#18181B]/80 border border-[#27272A]">
              <div className="text-[11px] font-medium text-[#A1A1AA]">Per-Day Salary (Formula A)</div>
              <div className="text-xl font-bold text-[#FAFAFA] mt-0.5">
                ₹{calculation.perDaySalary.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#71717A] mt-0.5">₹{monthlyCtc} ÷ {standardPayableDays} days</div>
            </div>

            <div className="p-3 rounded-lg bg-[#18181B]/80 border border-[#27272A]">
              <div className="text-[11px] font-medium text-[#A1A1AA]">Per-Hour Salary (Formula B)</div>
              <div className="text-xl font-bold text-[#FAFAFA] mt-0.5">
                ₹{calculation.perHourSalary.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#71717A] mt-0.5">Per-Day ÷ {standardWorkingHours} hrs</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ── Left Column: Configurable Inputs (5 Cols) ────────────────── */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
                <h3 className="text-sm font-bold text-[#FAFAFA] uppercase tracking-wider flex items-center gap-2">
                  <Calculator size={15} className="text-amber-400" />
                  1. Calculation Inputs
                </h3>
                <span className="text-[11px] text-[#71717A]">Recalculates instantly</span>
              </div>

              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
                  Select Employee (Optional for Simulation)
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedEmpId}
                    onChange={(e) => handleEmployeeSelect(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] text-sm text-[#FAFAFA] rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Generic Staff / Custom Simulation --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeId}) - {emp.designation} (CTC: ₹{Number(emp.monthlyCtc || 0)})
                      </option>
                    ))}
                  </select>
                  {selectedEmpId && (
                    <button
                      type="button"
                      disabled={isLoadingDefaults}
                      onClick={() => handleEmployeeSelect(selectedEmpId)}
                      className="px-3 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-xs font-semibold text-[#FAFAFA] rounded-xl transition"
                      title="Reload recorded monthly attendance defaults"
                    >
                      {isLoadingDefaults ? 'Loading...' : 'Sync'}
                    </button>
                  )}
                </div>
              </div>

              {/* Month & Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">Payroll Month</label>
                  <select
                    value={month}
                    onChange={(e) => {
                      const newMonth = Number(e.target.value);
                      setMonth(newMonth);
                      const newDivisor = computeFixedPayableDays(newMonth, year);
                      setStandardPayableDays(newDivisor);
                      if (selectedEmpId) {
                        handleEmployeeSelect(selectedEmpId, newMonth, year);
                      }
                    }}
                    className="w-full bg-[#18181B] border border-[#27272A] text-sm text-[#FAFAFA] rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                  >
                    {[
                      { value: 1, label: 'January' },
                      { value: 2, label: 'February' },
                      { value: 3, label: 'March' },
                      { value: 4, label: 'April' },
                      { value: 5, label: 'May' },
                      { value: 6, label: 'June' },
                      { value: 7, label: 'July' },
                      { value: 8, label: 'August' },
                      { value: 9, label: 'September' },
                      { value: 10, label: 'October' },
                      { value: 11, label: 'November' },
                      { value: 12, label: 'December' },
                    ].map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">Payroll Year</label>
                  <select
                    value={year}
                    onChange={(e) => {
                      const newYear = Number(e.target.value);
                      setYear(newYear);
                      const newDivisor = computeFixedPayableDays(month, newYear);
                      setStandardPayableDays(newDivisor);
                      if (selectedEmpId) {
                        handleEmployeeSelect(selectedEmpId, month, newYear);
                      }
                    }}
                    className="w-full bg-[#18181B] border border-[#27272A] text-sm text-[#FAFAFA] rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Base Monthly CTC */}
              <div>
                <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
                  Monthly CTC / Salary Base (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-[#71717A]">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={monthlyCtc}
                    onChange={(e) => setMonthlyCtc(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full pl-8 pr-3 py-2 bg-[#18181B] border border-[#27272A] text-sm text-[#FAFAFA] font-semibold rounded-xl focus:outline-none focus:border-emerald-500"
                    placeholder="23500"
                  />
                </div>
              </div>

              {/* Standard Payable Days & Standard Working Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
                    Payable Days (Fixed Divisor)
                    <span className="text-[#71717A] font-normal block text-[10px]">Fixed month capacity (Days in Month - Sundays, e.g. 26 in Sep)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={standardPayableDays}
                    onChange={(e) => setStandardPayableDays(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] text-sm text-[#FAFAFA] font-semibold rounded-xl focus:outline-none focus:border-emerald-500"
                    placeholder="26"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
                    Working Hours / Day
                    <span className="text-[#71717A] font-normal block text-[10px]">Standard Shift Length</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={standardWorkingHours}
                    onChange={(e) => setStandardWorkingHours(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] text-sm text-[#FAFAFA] font-semibold rounded-xl focus:outline-none focus:border-emerald-500"
                    placeholder="8"
                  />
                </div>
              </div>

              {/* Regular Payable Days */}
              <div>
                <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
                  Regular Payable Attendance Days
                  <span className="text-[#71717A] font-normal block text-[10px]">
                    Weekday Present days (CL/EL/Holidays included)
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="31"
                  step="0.5"
                  value={regularPayableDays}
                  onChange={(e) => setRegularPayableDays(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] text-sm text-[#FAFAFA] font-semibold rounded-xl focus:outline-none focus:border-emerald-500"
                  placeholder="26"
                />
              </div>

              {/* Sunday Duty & Double Duty Credits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
                    Sunday Duty Credits
                    <span className="text-[#71717A] font-normal block text-[10px]">+1 Extra Day Equivalent</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={additionalSundayDutyCredits}
                    onChange={(e) => setAdditionalSundayDutyCredits(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] text-sm text-[#FAFAFA] font-semibold rounded-xl focus:outline-none focus:border-emerald-500"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
                    Double-Duty Credits
                    <span className="text-[#71717A] font-normal block text-[10px]">+1 Extra Day Equivalent</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={additionalDoubleDutyCredits}
                    onChange={(e) => setAdditionalDoubleDutyCredits(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] text-sm text-[#FAFAFA] font-semibold rounded-xl focus:outline-none focus:border-emerald-500"
                    placeholder="1"
                  />
                </div>
              </div>

              {/* Overtime Hours & Multiplier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
                    Approved Overtime Hours
                    <span className="text-[#71717A] font-normal block text-[10px]">Total extra hours</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={approvedOvertimeHours}
                    onChange={(e) => setApprovedOvertimeHours(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] text-sm text-[#FAFAFA] font-semibold rounded-xl focus:outline-none focus:border-emerald-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
                    Overtime Multiplier
                    <span className="text-[#71717A] font-normal block text-[10px]">Standard 1.0x (or 1.5x / 2.0x)</span>
                  </label>
                  <select
                    value={overtimeMultiplier}
                    onChange={(e) => setOvertimeMultiplier(Number(e.target.value))}
                    className="w-full bg-[#18181B] border border-[#27272A] text-sm text-[#FAFAFA] font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                  >
                    <option value={1.0}>1.0x (Standard 1 hr rate)</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x (Time-and-a-half)</option>
                    <option value={2.0}>2.0x (Double rate)</option>
                  </select>
                </div>
              </div>

              {/* Partial Deductions & Additional Allowances */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#D4D4D8]">
                      Partial Deductions (₹)
                    </label>
                    {employeePendingAdvance > 0 && (
                      <span className="text-[10px] font-bold text-amber-400 font-mono">
                        Pending: ₹{employeePendingAdvance.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-[#71717A]">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={partialDeductions}
                      onChange={(e) => setPartialDeductions(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full pl-8 pr-3 py-2 bg-[#18181B] border border-[#27272A] text-sm text-rose-300 font-semibold rounded-xl focus:outline-none focus:border-rose-500"
                      placeholder="0"
                    />
                  </div>
                  {employeePendingAdvance > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setPartialDeductions(employeePendingAdvance)}
                        className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-semibold transition"
                        title={`Full Recovery: Deduct all ₹${employeePendingAdvance} pending advances`}
                      >
                        Full: ₹{employeePendingAdvance.toLocaleString('en-IN')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPartialDeductions(Math.round(employeePendingAdvance / 2))}
                        className="px-1.5 py-0.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#A1A1AA] hover:text-[#FAFAFA] rounded text-[10px] transition"
                        title="Customize: 50% recovery"
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={() => setPartialDeductions(0)}
                        className="px-1.5 py-0.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#71717A] hover:text-[#FAFAFA] rounded text-[10px] transition"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
                    Other Allowances (₹)
                    <span className="text-[#71717A] font-normal block text-[10px]">Bonus / food / travel</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-[#71717A]">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={additionalAllowances}
                      onChange={(e) => setAdditionalAllowances(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full pl-8 pr-3 py-2 bg-[#18181B] border border-[#27272A] text-sm text-emerald-300 font-semibold rounded-xl focus:outline-none focus:border-emerald-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right Column: 14 Itemized Outputs (7 Cols) ────────────────── */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
                <h3 className="text-sm font-bold text-[#FAFAFA] uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp size={15} className="text-emerald-400" />
                  2. Official 14-Item Payroll Breakdown
                </h3>
                <span className="text-[11px] text-emerald-400 font-semibold">Matched to Statutory Rules</span>
              </div>

              {/* 14 Rows Itemized Grid */}
              <div className="bg-[#18181B] border border-[#27272A] rounded-xl overflow-hidden divide-y divide-[#27272A] text-xs">
                {/* 1 */}
                <div className="p-2.5 flex items-center justify-between hover:bg-[#27272A]/30">
                  <span className="text-[#A1A1AA] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#27272A] text-[10px] font-bold flex items-center justify-center text-[#FAFAFA]">
                      1
                    </span>
                    Monthly Salary Base / CTC
                  </span>
                  <span className="font-bold text-[#FAFAFA]">
                    ₹{calculation.monthlySalaryBase.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 2 */}
                <div className="p-2.5 flex items-center justify-between hover:bg-[#27272A]/30">
                  <span className="text-[#A1A1AA] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#27272A] text-[10px] font-bold flex items-center justify-center text-[#FAFAFA]">
                      2
                    </span>
                    Standard Paid Days (Fixed)
                  </span>
                  <span className="font-bold text-[#FAFAFA]">{calculation.standardPayableDays} days</span>
                </div>

                {/* 3 */}
                <div className="p-2.5 flex items-center justify-between bg-amber-500/5 hover:bg-amber-500/10">
                  <span className="text-amber-300 font-medium flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-[10px] font-bold flex items-center justify-center text-amber-300">
                      3
                    </span>
                    Per-Day Salary (Formula A: Base ÷ Days)
                  </span>
                  <span className="font-extrabold text-amber-300">
                    ₹{calculation.perDaySalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / day
                  </span>
                </div>

                {/* 4 */}
                <div className="p-2.5 flex items-center justify-between bg-amber-500/5 hover:bg-amber-500/10">
                  <span className="text-amber-300 font-medium flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-[10px] font-bold flex items-center justify-center text-amber-300">
                      4
                    </span>
                    Per-Hour Salary (Formula B: Per-Day ÷ Hours)
                  </span>
                  <span className="font-extrabold text-amber-300">
                    ₹{calculation.perHourSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / hr
                  </span>
                </div>

                {/* 5 */}
                <div className="p-2.5 flex items-center justify-between hover:bg-[#27272A]/30">
                  <span className="text-[#A1A1AA] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#27272A] text-[10px] font-bold flex items-center justify-center text-[#FAFAFA]">
                      5
                    </span>
                    Regular Payable Attendance
                  </span>
                  <span className="font-semibold text-[#FAFAFA]">{calculation.regularPayableAttendance} days</span>
                </div>

                {/* 6 */}
                <div className="p-2.5 flex items-center justify-between hover:bg-[#27272A]/30">
                  <span className="text-[#A1A1AA] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#27272A] text-[10px] font-bold flex items-center justify-center text-[#FAFAFA]">
                      6
                    </span>
                    Additional Sunday Duty Credit
                  </span>
                  <span className="font-semibold text-emerald-400">+{calculation.additionalSundayDutyCredit} day</span>
                </div>

                {/* 7 */}
                <div className="p-2.5 flex items-center justify-between hover:bg-[#27272A]/30">
                  <span className="text-[#A1A1AA] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#27272A] text-[10px] font-bold flex items-center justify-center text-[#FAFAFA]">
                      7
                    </span>
                    Additional Double-Duty Credit
                  </span>
                  <span className="font-semibold text-emerald-400">+{calculation.additionalDoubleDutyCredit} day</span>
                </div>

                {/* 8 */}
                <div className="p-2.5 flex items-center justify-between bg-[#27272A]/40">
                  <span className="text-[#FAFAFA] font-bold flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-[10px] font-bold flex items-center justify-center text-emerald-400">
                      8
                    </span>
                    Total Payable Days (Total Present Equivalents)
                  </span>
                  <span className="font-extrabold text-emerald-400 text-sm">
                    {calculation.totalPayableDayEquivalents} days
                  </span>
                </div>

                {/* 9 */}
                <div className="p-2.5 flex items-center justify-between hover:bg-[#27272A]/30">
                  <span className="text-[#A1A1AA] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#27272A] text-[10px] font-bold flex items-center justify-center text-[#FAFAFA]">
                      9
                    </span>
                    Base Payable Salary (Equivalents × Per-Day)
                  </span>
                  <span className="font-bold text-[#FAFAFA]">
                    ₹{calculation.basePayableSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 10 */}
                <div className="p-2.5 flex items-center justify-between hover:bg-[#27272A]/30">
                  <span className="text-[#A1A1AA] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#27272A] text-[10px] font-bold flex items-center justify-center text-[#FAFAFA]">
                      10
                    </span>
                    Approved Overtime ({calculation.approvedOvertimeHours} hrs @ {calculation.overtimeMultiplier}x)
                  </span>
                  <span className="font-bold text-amber-300">
                    +₹{calculation.overtimePay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 11 */}
                <div className="p-2.5 flex items-center justify-between hover:bg-[#27272A]/30">
                  <span className="text-[#A1A1AA] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#27272A] text-[10px] font-bold flex items-center justify-center text-[#FAFAFA]">
                      11
                    </span>
                    Additional Earnings & Allowances
                  </span>
                  <span className="font-semibold text-emerald-400">
                    +₹{calculation.additionalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 12 */}
                <div className="p-2.5 flex items-center justify-between bg-rose-500/5 hover:bg-rose-500/10">
                  <span className="text-rose-300 font-medium flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-500/20 text-[10px] font-bold flex items-center justify-center text-rose-300">
                      12
                    </span>
                    Partial Deductions (Advances / Penalties)
                  </span>
                  <span className="font-extrabold text-rose-300">
                    -₹{calculation.partialDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 13 */}
                <div className="p-2.5 flex items-center justify-between bg-[#27272A]/20">
                  <span className="text-[#FAFAFA] font-bold flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#3F3F46] text-[10px] font-bold flex items-center justify-center text-[#FAFAFA]">
                      13
                    </span>
                    Gross Earnings (Base + OT + Allowances)
                  </span>
                  <span className="font-extrabold text-[#FAFAFA] text-sm">
                    ₹{calculation.grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 14 */}
                <div className="p-3 flex items-center justify-between bg-emerald-500/10 border-t-2 border-emerald-500/40">
                  <span className="text-emerald-300 font-bold flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/30 text-xs font-extrabold flex items-center justify-center text-emerald-300">
                      14
                    </span>
                    FINAL PAYABLE SALARY (Take-Home Net)
                  </span>
                  <span className="font-black text-emerald-400 text-base sm:text-lg">
                    ₹{calculation.finalPayableSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Toggle Step-by-Step Formula Audit Trail */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#18181B] border border-[#27272A] text-xs font-semibold text-[#D4D4D8] hover:text-[#FAFAFA] transition"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle size={15} className="text-amber-400" />
                    Step-by-Step Formula Walkthrough & Audit Trail
                  </span>
                  {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showHistory && (
                  <div className="mt-3 space-y-2.5 animate-in fade-in duration-200">
                    {calculation.calculationHistory.map((step) => (
                      <div
                        key={step.step}
                        className="p-3 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#FAFAFA]">
                            Step {step.step}: {step.title}
                          </span>
                          <span className="font-extrabold text-emerald-400">{step.result}</span>
                        </div>
                        <div className="text-[#A1A1AA] font-mono text-[11px] bg-[#121214] p-1.5 rounded border border-[#27272A]">
                          {step.formula} ➔ {step.calculation}
                        </div>
                        <div className="text-[11px] text-[#71717A] italic">{step.explanation}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal Footer ─────────────────────────────────────────────────── */}
        <div className="px-6 py-4 bg-[#18181B] border-t border-[#27272A] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#71717A] flex items-center gap-2">
            <span>Formula standard: 26 payable days divisor (Sept 2026), 8h shift.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={applyPreset1}
              className="px-3 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-[#D4D4D8] text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
            >
              <RotateCcw size={14} />
              Reset to Acceptance 1
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] text-xs font-semibold rounded-xl transition"
            >
              Close Studio
            </button>

            <button
              type="button"
              disabled={isSaving || !selectedEmpId}
              onClick={handleSaveToPayroll}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                selectedEmpId
                  ? 'Persist this exact dynamic breakdown into the employee payroll run'
                  : 'Select an employee above to save to payroll'
              }
            >
              <Save size={15} />
              <span>{isSaving ? 'Saving Run...' : 'Save & Lock to Payroll'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
