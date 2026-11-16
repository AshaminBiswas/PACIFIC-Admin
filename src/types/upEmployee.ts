export type UpGovernmentIdType = 'AADHAAR' | 'PAN' | 'VOTER_ID';
export type UpEmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
export type UpAttendanceStatus =
  | 'PRESENT'
  | 'DOUBLE_DUTY'
  | 'CL'
  | 'EL'
  | 'UL'
  | 'HALF_DAY'
  | 'LEAVE'
  | 'HOLIDAY';
export type UpPayrollStatus = 'DRAFT' | 'FINALIZED' | 'PAID';
export type UpWorkerType = 'MONTHLY' | 'DAILY_WAGE' | 'CONTRACT';
export type UpPaymentMode = 'CASH' | 'BANK_TRANSFER' | 'UPI';

export type {
  Employee,
  EmployeeAttendance,
  EmployeeLeaveLedger,
  EmployeeAdvance,
  EmployeeDeduction,
  EmployeePayrollRun,
  SalaryCalculationBreakdown,
  AdvanceSummary,
  AdvanceLedgerTransaction,
  AdvanceLedgerResponse,
  ListEmployeesResponse,
  ListAttendanceResponse,
  EmployeeConveyanceExpense,
  ConveyanceCategory,
  ConveyancePurpose,
  ConveyancePaymentMode,
  ConveyanceStatus,
  ConveyanceSummaryStats,
  ListConveyanceExpensesResponse,
  CreateConveyancePayload,
  UpdateConveyancePayload,
  SettleConveyancePayload,
  SimulateSalaryCalculationPayload,
  EmployeeSalaryDefaults,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  RecordAttendancePayload,
  BatchAttendancePayload,
  CreateAdvancePayload,
  UpdateAdvancePayload,
  PartialDeductAdvancePayload,
  RecoverAdvancePayload,
  CreateDeductionPayload,
  UpdateDeductionPayload,
  CalculatePayrollPayload,
  MarkPayrollPaidPayload,
} from './employee';

export interface UpEmployee {
  id: string;
  employeeId: string;
  name: string;
  email?: string | null;
  phone: string;
  whatsappNo?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | string;
  photoUrl?: string | null;
  address: string;
  governmentIdType: UpGovernmentIdType;
  governmentIdNumber: string;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  bankAccountHolder?: string | null;
  paymentMode: UpPaymentMode;
  designation: string;
  department: string;
  workerType: UpWorkerType;
  dailyWage?: number | string | null;
  monthlyCtc: number | string;
  overtimeHourlyRate: number | string;
  joiningDate: string;
  status: UpEmployeeStatus;
  clBalance: number | string;
  elBalance: number | string;
  emergencyContact?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  pendingAdvancesTotal?: number;
  attendances?: UpEmployeeAttendance[];
  advances?: UpEmployeeAdvance[];
  deductions?: UpEmployeeDeduction[];
  payrollRuns?: UpEmployeePayrollRun[];
}

export interface UpEmployeeAttendance {
  id: string;
  employeeId: string;
  date: string;
  status: UpAttendanceStatus;
  isSunday: boolean;
  isSundayOverride: boolean;
  overtimeHours: number | string;
  shift: string;
  notes?: string | null;
  markedById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  employee?: {
    id: string;
    employeeId: string;
    name: string;
    department: string;
    designation: string;
    workerType?: UpWorkerType;
  };
}

export interface UpEmployeeAdvance {
  id: string;
  employeeId: string;
  amount: number | string;
  originalAmount?: number | string | null;
  reason: string;
  advanceDate?: string;
  recoveryMonth: number;
  recoveryYear: number;
  isRecovered: boolean;
  recoveredAt?: string | null;
  disbursedVia: string;
  parentAdvanceId?: string | null;
  payrollRunId?: string | null;
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  employee?: {
    id: string;
    employeeId: string;
    name: string;
    department?: string;
    designation?: string;
  };
}

export interface UpEmployeeDeduction {
  id: string;
  employeeId: string;
  amount: number | string;
  reason: string;
  applyMonth: number;
  applyYear: number;
  isApplied: boolean;
  appliedAt?: string | null;
  payrollRunId?: string | null;
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  employee?: {
    id: string;
    employeeId: string;
    name: string;
    department?: string;
    designation?: string;
  };
}

export interface UpEmployeePayrollRun {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  monthlyCtc: number | string;
  totalCalendarDays: number;
  sundaysCount: number;
  approvedSundays: number;
  payableDays: number | string;
  perDayRate: number | string;
  presentDays: number | string;
  doubleDutyDays: number | string;
  clDays: number | string;
  elDays: number | string;
  halfDays: number | string;
  unpaidDays: number | string;
  holidayDays: number | string;
  paidDays: number | string;
  overtimeHours: number | string;
  overtimeRate: number | string;
  overtimeMultiplier: number | string;
  overtimePay: number | string;
  workingHoursPerDay: number | string;
  additionalAllowances: number | string;
  grossSalary: number | string;
  advanceDeduction: number | string;
  otherDeductions: number | string;
  netSalary: number | string;
  status: UpPayrollStatus;
  paidAt?: string | null;
  paymentMode?: string | null;
  paymentReference?: string | null;
  paymentNotes?: string | null;
  createdById?: string | null;
  finalizedById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deductionSummary?: {
    advances?: Array<{ id: string; amount: number; reason: string }>;
    deductions?: Array<{ id: string; amount: number; reason: string }>;
  };
  employee?: {
    id: string;
    employeeId: string;
    name: string;
    department: string;
    designation: string;
    workerType?: UpWorkerType;
    paymentMode?: UpPaymentMode;
    bankAccountNumber?: string | null;
    bankIfsc?: string | null;
  };
}

export interface UpEmployeeLeaveLedger {
  id: string;
  employeeId: string;
  leaveType: 'CL' | 'EL';
  transactionType: 'ACCRUAL' | 'USAGE' | 'ADJUSTMENT';
  amount: number | string;
  balanceAfter: number | string;
  month: number;
  year: number;
  reason?: string | null;
  recordedById?: string | null;
  createdAt?: string;
}

export interface UpWorkforceStats {
  totalStaff: number;
  activeStaff: number;
  dailyWageWorkers: number;
  monthlyWorkers: number;
  today: {
    date: string;
    markedCount: number;
    present: number;
    doubleDuty: number;
    onLeave: number;
    totalOtHours: number;
  };
  advances: {
    count: number;
    totalPendingAmount: number;
  };
  payroll: {
    month: number;
    year: number;
    totalCount: number;
    finalizedCount: number;
    totalAmount: number;
  };
}
