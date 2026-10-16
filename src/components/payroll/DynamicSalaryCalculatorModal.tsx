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
  TrendingUp,
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
      setEmployeePendingAdvance(0);
      return;
    }

    const empObj = employees.find((e) => e.id === empId);
    if (empObj) {
      setEmployeeName(empObj.name);
      if (Number(empObj.monthlyCtc || 0) > 0) {
        setMonthlyCtc(Number(empObj.monthlyCtc));
      }
    }

    try {
      setIsLoadingDefaults(true);
      const defaults = await employeeService.getSalaryCalculationDefaults(empId, targetMonth, targetYear);
      if (defaults) {
        if (defaults.monthlyCtc) setMonthlyCtc(defaults.monthlyCtc);
        const fixedDivisor = computeFixedPayableDays(targetMonth, targetYear);
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
              ? 'bg-[#0a091e] text-emerald-400 border-emerald-500/30'
              : 'bg-[#0a091e] text-rose-400 border-rose-500/30'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="bg-[#0a091e] border border-white/10 w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* ── Modal Header ─────────────────────────────────────────────────── */}
        <div className="px-6 py-4.5 bg-[#0a091e] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#7FB706]/15 border border-[#7FB706]/30 text-[#B5F823]">
              <Calculator size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Dynamic Salary, Attendance & Overtime Calculator
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30">
                  REAL-TIME FORMULA ENGINE
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Full-precision wage arithmetic with configurable payable capacity, overtime rates, and partial deductions.
              </p>
            </div>
          </div>

          {/* Quick Presets & Close */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={applyPreset1}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-lg transition"
              title="Test Case 1: 23,500 CTC, 26d, 1 Sun, 1 DD -> ₹25,307.69"
            >
              Test Case 1 (₹25,307.69)
            </button>
            <button
              type="button"
              onClick={applyPreset2}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-[#B5F823] border border-[#7FB706]/30 text-xs font-semibold rounded-lg transition"
              title="Test Case 2: +4h OT, ₹500 Deduction -> ₹25,259.61"
            >
              Test Case 2 (₹25,259.61)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Modal Body (Scrollable Grid) ─────────────────────────────────── */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Live Result Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-[#0a091e] to-emerald-950/20 border border-emerald-500/20">
            <div className="md:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/90 flex items-center gap-1.5">
                <Sparkles size={14} /> Final Take-Home Payable Salary
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 mt-1">
                ₹{calculation.finalPayableSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-3">
                <span>Gross: ₹{calculation.grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                <span>•</span>
                <span>Deductions: -₹{calculation.partialDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#030213]/80 border border-white/10">
              <div className="text-[11px] font-medium text-gray-400">Per-Day Salary (Formula A)</div>
              <div className="text-xl font-bold text-white mt-0.5">
                ₹{calculation.perDaySalary.toFixed(2)}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">₹{monthlyCtc} ÷ {standardPayableDays} days</div>
            </div>

            <div className="p-3 rounded-lg bg-[#030213]/80 border border-white/10">
              <div className="text-[11px] font-medium text-gray-400">Per-Hour Salary (Formula B)</div>
              <div className="text-xl font-bold text-white mt-0.5">
                ₹{calculation.perHourSalary.toFixed(2)}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">Per-Day ÷ {standardWorkingHours} hrs</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ── Left Column: Configurable Inputs (5 Cols) ────────────────── */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Calculator size={15} className="text-[#B5F823]" />
                  1. Calculation Inputs
                </h3>
                <span className="text-[11px] text-gray-500">Recalculates instantly</span>
              </div>

              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Select Employee (Optional for Simulation)
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedEmpId}
                    onChange={(e) => handleEmployeeSelect(e.target.value)}
                    className="w-full bg-[#030213] border border-white/10 text-sm text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#7FB706]"
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
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white rounded-xl transition"
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
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Payroll Month</label>
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
                    className="w-full bg-[#030213] border border-white/10 text-sm text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#7FB706]"
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
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Payroll Year</label>
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
                    className="w-full bg-[#030213] border border-white/10 text-sm text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#7FB706]"
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
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Monthly CTC / Salary Base (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-gray-500">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={monthlyCtc}
                    onChange={(e) => setMonthlyCtc(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full pl-8 pr-3 py-2 bg-[#030213] border border-white/10 text-sm text-white font-semibold rounded-xl focus:outline-none focus:border-[#7FB706]"
                    placeholder="23500"
                  />
                </div>
              </div>

              {/* Standard Payable Days & Standard Working Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Payable Days (Fixed Divisor)
                    <span className="text-gray-500 font-normal block text-[10px]">Fixed month capacity (Days in Month - Sundays, e.g. 26 in Sep)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={standardPayableDays}
                    onChange={(e) => setStandardPayableDays(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 text-sm text-white font-semibold rounded-xl focus:outline-none focus:border-[#7FB706]"
                    placeholder="26"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Working Hours / Day
                    <span className="text-gray-500 font-normal block text-[10px]">Standard Shift Length</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={standardWorkingHours}
                    onChange={(e) => setStandardWorkingHours(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 text-sm text-white font-semibold rounded-xl focus:outline-none focus:border-[#7FB706]"
                    placeholder="8"
                  />
                </div>
              </div>

              {/* Regular Payable Days */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Regular Payable Attendance Days
                  <span className="text-gray-500 font-normal block text-[10px]">
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
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 text-sm text-white font-semibold rounded-xl focus:outline-none focus:border-[#7FB706]"
                  placeholder="26"
                />
              </div>

              {/* Sunday Duty & Double Duty Credits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Sunday Duty Credits
                    <span className="text-gray-500 font-normal block text-[10px]">+1 Extra Day Equivalent</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={additionalSundayDutyCredits}
                    onChange={(e) => setAdditionalSundayDutyCredits(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 text-sm text-white font-semibold rounded-xl focus:outline-none focus:border-[#7FB706]"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Double-Duty Credits
                    <span className="text-gray-500 font-normal block text-[10px]">+1 Extra Day Equivalent</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={additionalDoubleDutyCredits}
                    onChange={(e) => setAdditionalDoubleDutyCredits(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 text-sm text-white font-semibold rounded-xl focus:outline-none focus:border-[#7FB706]"
                    placeholder="1"
                  />
                </div>
              </div>

              {/* Overtime Hours & Multiplier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Approved Overtime Hours
                    <span className="text-gray-500 font-normal block text-[10px]">Total extra hours</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={approvedOvertimeHours}
                    onChange={(e) => setApprovedOvertimeHours(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 text-sm text-white font-semibold rounded-xl focus:outline-none focus:border-[#7FB706]"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Overtime Multiplier
                    <span className="text-gray-500 font-normal block text-[10px]">Standard 1.0x (or 1.5x / 2.0x)</span>
                  </label>
                  <select
                    value={overtimeMultiplier}
                    onChange={(e) => setOvertimeMultiplier(Number(e.target.value))}
                    className="w-full bg-[#030213] border border-white/10 text-sm text-white font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-[#7FB706]"
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
                    <label className="text-xs font-semibold text-gray-300">
                      Partial Deductions (₹)
                    </label>
                    {employeePendingAdvance > 0 && (
                      <span className="text-[10px] font-bold text-amber-400 font-mono">
                        Pending: ₹{employeePendingAdvance.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-gray-500">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={partialDeductions}
                      onChange={(e) => setPartialDeductions(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full pl-8 pr-3 py-2 bg-[#030213] border border-white/10 text-sm text-rose-300 font-semibold rounded-xl focus:outline-none focus:border-rose-500"
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
                        className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded text-[10px] transition"
                        title="Customize: 50% recovery"
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={() => setPartialDeductions(0)}
                        className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white rounded text-[10px] transition"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Other Allowances (₹)
                    <span className="text-gray-500 font-normal block text-[10px]">Bonus / food / travel</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-gray-500">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={additionalAllowances}
                      onChange={(e) => setAdditionalAllowances(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full pl-8 pr-3 py-2 bg-[#030213] border border-white/10 text-sm text-[#B5F823] font-semibold rounded-xl focus:outline-none focus:border-[#7FB706]"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right Column: 14 Itemized Outputs (7 Cols) ────────────────── */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp size={15} className="text-[#B5F823]" />
                  2. Official 14-Item Payroll Breakdown
                </h3>
                <span className="text-[11px] text-[#B5F823] font-semibold">Matched to Statutory Rules</span>
              </div>

              {/* 14 Rows Itemized Grid */}
              <div className="bg-[#0a091e] border border-white/10 rounded-xl overflow-hidden divide-y divide-white/10 text-xs shadow-lg">
                {/* 1 */}
                <div className="p-2.5 flex items-center justify-between hover:bg-white/5">
                  <span className="text-gray-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-[10px] font-bold flex items-center justify-center text-white">
                      1
                    </span>
                    Monthly Salary Base / CTC
                  </span>
                  <span className="font-bold text-white">
                    ₹{calculation.monthlySalaryBase.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 2 */}
                <div className="p-2.5 flex items-center justify-between hover:bg-white/5">
                  <span className="text-gray-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-[10px] font-bold flex items-center justify-center text-white">
                      2
                    </span>
                    Standard Paid Days (Fixed)
                  </span>
                  <span className="font-bold text-white">{calculation.standardPayableDays} days</span>
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
                <div className="p-2.5 flex items-center justify-between hover:bg-white/5">
                  <span className="text-gray-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-[10px] font-bold flex items-center justify-center text-white">
                      5
                    </span>
                    Regular Payable Attendance
                  </span>
                  <span className="font-semibold text-white">{calculation.regularPayableAttendance} days</span>
                </div>

                {/* 6 */}
                <div className="p-2.5 flex items-center justify-between hover:bg-white/5">
                  <span className="text-gray-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-[10px] font-bold flex items-center justify-center text-white">
                      6
                    </span>
                    Additional Sunday Duty Credit
                  </span>
                  <span className="font-semibold text-[#B5F823]">+{calculation.additionalSundayDutyCredit} day</span>
                </div>

                {/* 7 */}
                <div className="p-2.5 flex items-center justify-between hover:bg-white/5">
                  <span className="text-gray-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-[10px] font-bold flex items-center justify-center text-white">
                      7
                    </span>
                    Additional Double-Duty Credit
                  </span>
                  <span className="font-semibold text-[#B5F823]">+{calculation.additionalDoubleDutyCredit} day</span>
                </div>

                {/* 8 */}
                <div className="p-2.5 flex items-center justify-between bg-white/5">
                  <span className="text-white font-bold flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#7FB706]/20 text-[10px] font-bold flex items-center justify-center text-[#B5F823]">
                      8
                    </span>
                    Total Payable Days (Total Present Equivalents)
                  </span>
                  <span className="font-extrabold text-[#B5F823] text-sm">
                    {calculation.totalPayableDayEquivalents} days
                  </span>
                </div>

                {/* 9 */}
                <div className="p-2.5 flex items-center justify-between hover:bg-white/5">
                  <span className="text-gray-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-[10px] font-bold flex items-center justify-center text-white">
                      9
                    </span>
                    Base Payable Salary (Equivalents × Per-Day)
                  </span>
                  <span className="font-bold text-white">
                    ₹{calculation.basePayableSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 10 */}
                <div className="p-2.5 flex items-center justify-between hover:bg-white/5">
                  <span className="text-gray-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-[10px] font-bold flex items-center justify-center text-white">
                      10
                    </span>
                    Approved Overtime ({calculation.approvedOvertimeHours} hrs @ {calculation.overtimeMultiplier}x)
                  </span>
                  <span className="font-bold text-amber-300">
                    +₹{calculation.overtimePay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 11 */}
                <div className="p-2.5 flex items-center justify-between hover:bg-white/5">
                  <span className="text-gray-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-[10px] font-bold flex items-center justify-center text-white">
                      11
                    </span>
                    Additional Earnings & Allowances
                  </span>
                  <span className="font-semibold text-[#B5F823]">
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
                <div className="p-2.5 flex items-center justify-between bg-white/5">
                  <span className="text-white font-bold flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/15 text-[10px] font-bold flex items-center justify-center text-white">
                      13
                    </span>
                    Gross Earnings (Base + OT + Allowances)
                  </span>
                  <span className="font-extrabold text-white text-sm">
                    ₹{calculation.grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 14 */}
                <div className="p-3 flex items-center justify-between bg-[#7FB706]/15 border-t-2 border-[#7FB706]/40">
                  <span className="text-[#B5F823] font-bold flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-[#7FB706]/30 text-xs font-extrabold flex items-center justify-center text-[#B5F823]">
                      14
                    </span>
                    FINAL PAYABLE SALARY (Take-Home Net)
                  </span>
                  <span className="font-black text-[#B5F823] text-base sm:text-lg">
                    ₹{calculation.finalPayableSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Toggle Step-by-Step Formula Audit Trail */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#0a091e] border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle size={15} className="text-[#B5F823]" />
                    Step-by-Step Formula Walkthrough & Audit Trail
                  </span>
                  {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showHistory && (
                  <div className="mt-3 space-y-2.5 animate-in fade-in duration-200">
                    {calculation.calculationHistory.map((step) => (
                      <div
                        key={step.step}
                        className="p-3 rounded-xl bg-[#0a091e] border border-white/10 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">
                            Step {step.step}: {step.title}
                          </span>
                          <span className="font-extrabold text-[#B5F823]">{step.result}</span>
                        </div>
                        <div className="text-gray-400 font-mono text-[11px] bg-[#030213] p-1.5 rounded border border-white/10">
                          {step.formula} ➔ {step.calculation}
                        </div>
                        <div className="text-[11px] text-gray-500 italic">{step.explanation}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal Footer ─────────────────────────────────────────────────── */}
        <div className="px-6 py-4 bg-[#0a091e] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span>Formula standard: 26 payable days divisor (Sept 2026), 8h shift.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={applyPreset1}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
            >
              <RotateCcw size={14} />
              Reset to Acceptance 1
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold rounded-xl transition"
            >
              Close Studio
            </button>

            <button
              type="button"
              disabled={isSaving || !selectedEmpId}
              onClick={handleSaveToPayroll}
              className="px-5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
