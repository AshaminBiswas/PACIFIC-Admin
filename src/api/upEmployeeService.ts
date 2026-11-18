import { apiClient } from './client';
import type {
  UpEmployee,
  UpEmployeeAttendance,
  UpEmployeeAdvance,
  UpEmployeeDeduction,
  UpEmployeePayrollRun,
  UpEmployeeLeaveLedger,
  UpWorkforceStats,
  UpAttendanceStatus,
  UpWorkerType,
  UpPaymentMode,
  UpGovernmentIdType,
  Employee,
  EmployeeAttendance,
  EmployeeLeaveLedger,
  EmployeeAdvance,
  EmployeeDeduction,
  EmployeePayrollRun,
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
  SalaryCalculationBreakdown,
  SimulateSalaryCalculationPayload,
  EmployeeSalaryDefaults,
  AdvanceSummary,
  AdvanceLedgerResponse,
  ListEmployeesResponse,
  ListAttendanceResponse,
  EmployeeConveyanceExpense,
  ConveyanceCategory,
  ConveyancePurpose,
  ConveyancePaymentMode,
  ConveyanceStatus,
  ListConveyanceExpensesResponse,
  CreateConveyancePayload,
  UpdateConveyancePayload,
  SettleConveyancePayload,
} from '../types/upEmployee';

export interface CreateUpEmployeePayload {
  name: string;
  email?: string | null;
  phone: string;
  address: string;
  governmentIdType?: UpGovernmentIdType;
  governmentIdNumber: string;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  bankAccountHolder?: string | null;
  paymentMode?: UpPaymentMode;
  designation: string;
  department: string;
  workerType?: UpWorkerType;
  dailyWage?: number | null;
  monthlyCtc: number;
  overtimeHourlyRate?: number;
  joiningDate: string;
  status?: string;
  clBalance?: number;
  elBalance?: number;
  emergencyContact?: string | null;
  notes?: string | null;
}

export interface UpdateUpEmployeePayload extends Partial<CreateUpEmployeePayload> {}

export const upEmployeeService = {
  // ─── Stats & Metrics ────────────────────────────────────────────────────────
  async getWorkforceStats(): Promise<UpWorkforceStats> {
    const res = await apiClient.get<any>('/up-employees/stats');
    return res.data?.data ?? res.data;
  },

  // ─── Employee Master Data ───────────────────────────────────────────────────
  async listEmployees(params: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    designation?: string;
    status?: string;
    workerType?: string;
    paymentMode?: string;
  } = {}): Promise<ListEmployeesResponse> {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        sp.set(k, String(v));
      }
    });
    const res = await apiClient.get<any>(`/up-employees?${sp.toString()}`);
    const data = res.data?.data ?? res.data;
    return (
      data || {
        items: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 1 },
      }
    );
  },

  async getEmployee(id: string): Promise<Employee> {
    const res = await apiClient.get<any>(`/up-employees/${encodeURIComponent(id)}`, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    return res.data?.data ?? res.data;
  },

  async createEmployee(payload: CreateUpEmployeePayload | CreateEmployeePayload): Promise<Employee> {
    const res = await apiClient.post<any>('/up-employees', payload);
    return res.data?.data ?? res.data;
  },

  async updateEmployee(id: string, payload: UpdateUpEmployeePayload | UpdateEmployeePayload): Promise<Employee> {
    const res = await apiClient.patch<any>(`/up-employees/${encodeURIComponent(id)}`, payload);
    return res.data?.data ?? res.data;
  },

  async deleteEmployee(id: string): Promise<Employee> {
    const res = await apiClient.delete<any>(`/up-employees/${encodeURIComponent(id)}`);
    return res.data?.data ?? res.data;
  },

  async deactivateEmployee(id: string): Promise<Employee> {
    return this.deleteEmployee(id);
  },

  async downloadEmployeeDirectoryPdf(params: {
    department?: string;
    designation?: string;
    status?: string;
    search?: string;
    filename?: string;
  } = {}): Promise<void> {
    const query = new URLSearchParams();
    if (params.department && params.department !== 'ALL' && params.department !== 'All Departments') {
      query.append('department', params.department);
    }
    if (params.designation && params.designation !== 'ALL' && params.designation !== 'All Designations') {
      query.append('designation', params.designation);
    }
    if (params.status && params.status !== 'ALL') {
      query.append('status', params.status);
    }
    if (params.search && params.search.trim()) {
      query.append('search', params.search.trim());
    }

    const qStr = query.toString();
    const res = await apiClient.get(`/up-employees/export-pdf${qStr ? `?${qStr}` : ''}`, {
      responseType: 'blob',
    });

    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = params.filename || `UP_Factory_Employee_Directory_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // ─── Attendance ─────────────────────────────────────────────────────────────
  async listAttendance(params: {
    month: number;
    year: number;
    employeeId?: string;
  }): Promise<ListAttendanceResponse> {
    const sp = new URLSearchParams({
      month: String(params.month),
      year: String(params.year),
    });
    if (params.employeeId) sp.set('employeeId', params.employeeId);
    const res = await apiClient.get<any>(`/up-employees/attendance?${sp.toString()}`);
    const data = res.data?.data ?? res.data;
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return {
      month: params.month,
      year: params.year,
      totalDays: data?.daysInMonth || 31,
      records: items,
      ...(data || {}),
    } as any;
  },

  async recordAttendance(payload: RecordAttendancePayload | {
    employeeId: string;
    date: string;
    status: UpAttendanceStatus;
    isSunday?: boolean;
    isSundayOverride?: boolean;
    overtimeHours?: number;
    shift?: string;
    notes?: string | null;
  }): Promise<EmployeeAttendance> {
    const res = await apiClient.post<any>('/up-employees/attendance/record', payload);
    return res.data?.data ?? res.data;
  },

  async batchRecordAttendance(payload: BatchAttendancePayload | {
    date: string;
    records: Array<{
      employeeId: string;
      status: UpAttendanceStatus;
      overtimeHours?: number;
      shift?: string;
      notes?: string | null;
      isSundayOverride?: boolean;
    }>;
  }): Promise<{ updatedCount: number; records: EmployeeAttendance[]; count?: number; date?: string }> {
    const res = await apiClient.post<any>('/up-employees/attendance/batch', payload);
    const data = res.data?.data ?? res.data;
    return {
      updatedCount: data?.count || data?.updatedCount || 0,
      records: data?.records || [],
      ...data,
    };
  },

  async deleteAttendance(arg1: { employeeId: string; date: string } | string, arg2?: string): Promise<any> {
    const employeeId = typeof arg1 === 'object' ? arg1.employeeId : arg1;
    const date = typeof arg1 === 'object' ? arg1.date : arg2!;
    const res = await apiClient.delete<any>(
      `/up-employees/attendance/record?employeeId=${encodeURIComponent(employeeId)}&date=${encodeURIComponent(date)}`
    );
    return res.data?.data ?? res.data;
  },

  async downloadMonthlyAttendancePdf(params: {
    month: number;
    year: number;
    workerOnly?: boolean;
    department?: string;
    filename?: string;
  }): Promise<void> {
    const query = new URLSearchParams();
    query.append('month', params.month.toString());
    query.append('year', params.year.toString());
    if (params.workerOnly) query.append('workerOnly', 'true');
    if (params.department) query.append('department', params.department);

    const res = await apiClient.get(`/up-employees/attendance/monthly-report-pdf?${query.toString()}`, {
      responseType: 'blob',
    });

    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = params.filename || `UP_Factory_Attendance_Register_${params.month}_${params.year}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // ─── Leave Ledger ───────────────────────────────────────────────────────────
  async accrueMonthlyLeave(payload: {
    month: number;
    year: number;
    clAmount?: number;
    elAmount?: number;
  }): Promise<any> {
    const res = await apiClient.post<any>('/up-employees/leaves/accrue', payload);
    return res.data?.data ?? res.data;
  },

  async resetCleanSlateLeaves(): Promise<any> {
    const res = await apiClient.post<any>('/up-employees/leaves/reset-clean-slate');
    return res.data?.data ?? res.data;
  },

  async getLeaveLedger(employeeId: string): Promise<{ employee: Employee; history: EmployeeLeaveLedger[] } | any> {
    const res = await apiClient.get<any>(`/up-employees/leaves/ledger/${encodeURIComponent(employeeId)}`);
    const data = res.data?.data ?? res.data;
    if (Array.isArray(data)) {
      return { history: data };
    }
    return data;
  },

  async adjustLeave(
    id: string,
    payload: {
      leaveType: 'CL' | 'EL';
      amount: number;
      reason: string;
      month?: number;
      year?: number;
      transactionType?: 'ACCRUAL' | 'USAGE' | 'ADJUSTMENT';
    }
  ): Promise<any> {
    const now = new Date();
    const finalPayload = {
      month: payload.month || now.getMonth() + 1,
      year: payload.year || now.getFullYear(),
      transactionType: payload.transactionType || 'ADJUSTMENT',
      ...payload,
    };
    const res = await apiClient.post<any>(`/up-employees/leaves/adjust/${encodeURIComponent(id)}`, finalPayload);
    return res.data?.data ?? res.data;
  },

  // ─── Advances ───────────────────────────────────────────────────────────────
  async listAdvances(params: {
    employeeId?: string;
    status?: 'PENDING' | 'RECOVERED' | 'ALL';
    recoveryMonth?: number;
    recoveryYear?: number;
    isRecovered?: boolean;
  } = {}): Promise<EmployeeAdvance[]> {
    const sp = new URLSearchParams();
    if (params.employeeId) sp.set('employeeId', params.employeeId);
    if (params.recoveryMonth) sp.set('recoveryMonth', params.recoveryMonth.toString());
    if (params.recoveryYear) sp.set('recoveryYear', params.recoveryYear.toString());
    if (params.isRecovered !== undefined) {
      sp.set('status', params.isRecovered ? 'RECOVERED' : 'PENDING');
    } else if (params.status) {
      sp.set('status', params.status);
    } else {
      sp.set('status', 'ALL');
    }
    const res = await apiClient.get<any>(`/up-employees/advances?${sp.toString()}`, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  async getAdvanceSummary(params: { recoveryMonth?: number; recoveryYear?: number } = {}): Promise<AdvanceSummary> {
    const sp = new URLSearchParams();
    if (params.recoveryMonth) sp.set('recoveryMonth', params.recoveryMonth.toString());
    if (params.recoveryYear) sp.set('recoveryYear', params.recoveryYear.toString());
    const qStr = sp.toString();
    const res = await apiClient.get<any>(`/up-employees/advances/summary${qStr ? `?${qStr}` : ''}`);
    return res.data?.data ?? res.data;
  },

  async getAdvanceLedger(params: {
    employeeId?: string;
    recoveryMonth?: number;
    recoveryYear?: number;
    search?: string;
  } = {}): Promise<AdvanceLedgerResponse> {
    const sp = new URLSearchParams();
    if (params.employeeId) sp.set('employeeId', params.employeeId);
    if (params.recoveryMonth) sp.set('recoveryMonth', params.recoveryMonth.toString());
    if (params.recoveryYear) sp.set('recoveryYear', params.recoveryYear.toString());
    if (params.search) sp.set('search', params.search);

    const qStr = sp.toString();
    const res = await apiClient.get<any>(`/up-employees/advances/ledger${qStr ? `?${qStr}` : ''}`);
    return res.data?.data ?? res.data;
  },

  async createAdvance(payload: CreateAdvancePayload | {
    employeeId: string;
    amount: number;
    reason: string;
    recoveryMonth: number;
    recoveryYear: number;
    advanceDate?: string;
    disbursedVia?: string;
  }): Promise<EmployeeAdvance> {
    const res = await apiClient.post<any>('/up-employees/advances', payload);
    return res.data?.data ?? res.data;
  },

  async updateAdvance(id: string, payload: UpdateAdvancePayload): Promise<EmployeeAdvance> {
    const res = await apiClient.patch<any>(`/up-employees/advances/${encodeURIComponent(id)}`, payload);
    return res.data?.data ?? res.data;
  },

  async partialDeductAdvance(
    id: string,
    payload: PartialDeductAdvancePayload | {
      deductionAmount: number;
      notes?: string | null;
      newRecoveryMonth?: number;
      newRecoveryYear?: number;
    }
  ): Promise<any> {
    const res = await apiClient.post<any>(`/up-employees/advances/${encodeURIComponent(id)}/partial-deduct`, payload);
    return res.data?.data ?? res.data;
  },

  async recoverAdvance(
    id: string,
    payload?: RecoverAdvancePayload
  ): Promise<any> {
    const res = await apiClient.post<any>(`/up-employees/advances/${encodeURIComponent(id)}/recover`, payload || {});
    return res.data?.data ?? res.data;
  },

  async deleteAdvance(id: string): Promise<any> {
    const res = await apiClient.delete<any>(`/up-employees/advances/${encodeURIComponent(id)}`);
    return res.data?.data ?? res.data;
  },

  // ─── Deductions ─────────────────────────────────────────────────────────────
  async listDeductions(params: {
    employeeId?: string;
    applyMonth?: number;
    applyYear?: number;
    isApplied?: boolean | string;
  } = {}): Promise<EmployeeDeduction[]> {
    const sp = new URLSearchParams();
    if (params.employeeId) sp.set('employeeId', params.employeeId);
    if (params.applyMonth) sp.set('applyMonth', params.applyMonth.toString());
    if (params.applyYear) sp.set('applyYear', params.applyYear.toString());
    if (params.isApplied !== undefined) sp.set('isApplied', params.isApplied.toString());

    const res = await apiClient.get<any>(`/up-employees/deductions?${sp.toString()}`, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  async createDeduction(payload: CreateDeductionPayload | {
    employeeId: string;
    amount: number;
    reason: string;
    applyMonth: number;
    applyYear: number;
  }): Promise<EmployeeDeduction> {
    const res = await apiClient.post<any>('/up-employees/deductions', payload);
    return res.data?.data ?? res.data;
  },

  async updateDeduction(id: string, payload: UpdateDeductionPayload): Promise<EmployeeDeduction> {
    const res = await apiClient.patch<any>(`/up-employees/deductions/${encodeURIComponent(id)}`, payload);
    return res.data?.data ?? res.data;
  },

  async deleteDeduction(id: string): Promise<any> {
    const res = await apiClient.delete<any>(`/up-employees/deductions/${encodeURIComponent(id)}`);
    return res.data?.data ?? res.data;
  },

  // ─── Payroll ────────────────────────────────────────────────────────────────
  async simulateSalaryCalculation(payload: SimulateSalaryCalculationPayload): Promise<SalaryCalculationBreakdown> {
    const res = await apiClient.post<any>('/up-employees/payroll/simulate', payload);
    return res.data?.data ?? res.data;
  },

  async getEmployeeSalaryDefaults(employeeId: string, month: number, year: number): Promise<EmployeeSalaryDefaults> {
    const query = new URLSearchParams({
      employeeId,
      month: month.toString(),
      year: year.toString(),
    });
    const res = await apiClient.get<any>(`/up-employees/payroll/defaults?${query.toString()}`);
    return res.data?.data ?? res.data;
  },

  async getSalaryCalculationDefaults(employeeId: string, month: number, year: number): Promise<EmployeeSalaryDefaults> {
    return this.getEmployeeSalaryDefaults(employeeId, month, year);
  },

  async listPayroll(params: {
    month: number;
    year: number;
    status?: string;
    employeeId?: string;
  }): Promise<EmployeePayrollRun[]> {
    const sp = new URLSearchParams({
      month: String(params.month),
      year: String(params.year),
    });
    if (params.status) sp.set('status', params.status);
    if (params.employeeId) sp.set('employeeId', params.employeeId);
    const res = await apiClient.get<any>(`/up-employees/payroll?${sp.toString()}`);
    const data = res.data?.data ?? res.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  },

  async calculatePayroll(payload: CalculatePayrollPayload | {
    month: number;
    year: number;
    employeeIds?: string[];
    overtimeMultiplier?: number;
    workingHoursPerDay?: number;
  }): Promise<EmployeePayrollRun[]> {
    const res = await apiClient.post<any>('/up-employees/payroll/calculate', payload);
    const data = res.data?.data ?? res.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.runs)) return data.runs;
    return [];
  },

  async finalizePayroll(id: string): Promise<EmployeePayrollRun> {
    const res = await apiClient.post<any>(`/up-employees/payroll/${encodeURIComponent(id)}/finalize`, {});
    return res.data?.data ?? res.data;
  },

  async revertPayrollToDraft(id: string): Promise<EmployeePayrollRun> {
    const res = await apiClient.post<any>(`/up-employees/payroll/${encodeURIComponent(id)}/revert-draft`, {});
    return res.data?.data ?? res.data;
  },

  async markPayrollPaid(
    id: string,
    payload: MarkPayrollPaidPayload | {
      paymentMode?: string;
      paymentReference?: string | null;
      paymentNotes?: string | null;
    }
  ): Promise<EmployeePayrollRun> {
    const res = await apiClient.post<any>(`/up-employees/payroll/${encodeURIComponent(id)}/mark-paid`, payload);
    return res.data?.data ?? res.data;
  },

  async downloadPayslipPdf(id: string, filename?: string): Promise<void> {
    const res = await apiClient.get(`/up-employees/payroll/${encodeURIComponent(id)}/payslip-pdf`, {
      responseType: 'blob',
    });

    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `UP_Factory_Payslip_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async resendPayslipEmail(id: string, recipientEmail?: string): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient.post<any>(`/up-employees/payroll/${encodeURIComponent(id)}/resend-payslip-email`, {
      recipientEmail,
    });
    return res.data?.data ?? res.data;
  },

  // ─── UP Factory Site Visits & Conveyance Expenses ──────────────────────────
  async listConveyanceExpenses(params: {
    page?: number;
    limit?: number;
    employeeId?: string;
    category?: ConveyanceCategory;
    purpose?: ConveyancePurpose;
    status?: ConveyanceStatus;
    paymentMode?: ConveyancePaymentMode;
    startDate?: string;
    endDate?: string;
    search?: string;
    branch?: string;
  } = {}): Promise<ListConveyanceExpensesResponse> {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        sp.set(k, String(v));
      }
    });

    const qStr = sp.toString();
    const res = await apiClient.get<any>(`/up-employees/conveyance${qStr ? `?${qStr}` : ''}`);
    const data = res.data?.data ?? res.data;
    return (
      data || {
        items: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
        summary: {
          totalCount: 0,
          totalClaimedAmount: 0,
          totalApprovedAmount: 0,
          totalPendingAmount: 0,
          totalReimbursedAmount: 0,
          petrolAmount: 0,
          garivaraAmount: 0,
          materialShiftingAmount: 0,
          otherAmount: 0,
        },
      }
    );
  },

  async getConveyanceExpense(id: string): Promise<EmployeeConveyanceExpense> {
    const res = await apiClient.get<any>(`/up-employees/conveyance/${encodeURIComponent(id)}`);
    return res.data?.data ?? res.data;
  },

  async createConveyanceExpense(payload: CreateConveyancePayload): Promise<EmployeeConveyanceExpense> {
    const res = await apiClient.post<any>('/up-employees/conveyance', payload);
    return res.data?.data ?? res.data;
  },

  async updateConveyanceExpense(id: string, payload: UpdateConveyancePayload): Promise<EmployeeConveyanceExpense> {
    const res = await apiClient.patch<any>(`/up-employees/conveyance/${encodeURIComponent(id)}`, payload);
    return res.data?.data ?? res.data;
  },

  async deleteConveyanceExpense(id: string): Promise<{ deleted: boolean }> {
    const res = await apiClient.delete<any>(`/up-employees/conveyance/${encodeURIComponent(id)}`);
    return res.data?.data ?? res.data;
  },

  async approveConveyanceExpense(id: string, notes?: string): Promise<EmployeeConveyanceExpense> {
    const res = await apiClient.post<any>(`/up-employees/conveyance/${encodeURIComponent(id)}/approve`, { notes });
    return res.data?.data ?? res.data;
  },

  async rejectConveyanceExpense(id: string, reason: string): Promise<EmployeeConveyanceExpense> {
    const res = await apiClient.post<any>(`/up-employees/conveyance/${encodeURIComponent(id)}/reject`, { reason });
    return res.data?.data ?? res.data;
  },

  async settleConveyanceExpense(id: string, payload: SettleConveyancePayload): Promise<EmployeeConveyanceExpense> {
    const res = await apiClient.post<any>(`/up-employees/conveyance/${encodeURIComponent(id)}/settle`, payload);
    return res.data?.data ?? res.data;
  },
};

export default upEmployeeService;
