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
  } = {}): Promise<{
    items: UpEmployee[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        sp.set(k, String(v));
      }
    });
    const res = await apiClient.get<any>(`/up-employees?${sp.toString()}`);
    return res.data?.data ?? res.data;
  },

  async getEmployee(id: string): Promise<UpEmployee> {
    const res = await apiClient.get<any>(`/up-employees/${encodeURIComponent(id)}`);
    return res.data?.data ?? res.data;
  },

  async createEmployee(payload: CreateUpEmployeePayload): Promise<UpEmployee> {
    const res = await apiClient.post<any>('/up-employees', payload);
    return res.data?.data ?? res.data;
  },

  async updateEmployee(id: string, payload: UpdateUpEmployeePayload): Promise<UpEmployee> {
    const res = await apiClient.patch<any>(`/up-employees/${encodeURIComponent(id)}`, payload);
    return res.data?.data ?? res.data;
  },

  async deleteEmployee(id: string): Promise<UpEmployee> {
    const res = await apiClient.delete<any>(`/up-employees/${encodeURIComponent(id)}`);
    return res.data?.data ?? res.data;
  },

  // ─── Attendance ─────────────────────────────────────────────────────────────
  async listAttendance(params: {
    month: number;
    year: number;
    employeeId?: string;
  }): Promise<{
    month: number;
    year: number;
    daysInMonth: number;
    sundaysCount: number;
    items: UpEmployeeAttendance[];
  }> {
    const sp = new URLSearchParams({
      month: String(params.month),
      year: String(params.year),
    });
    if (params.employeeId) sp.set('employeeId', params.employeeId);
    const res = await apiClient.get<any>(`/up-employees/attendance?${sp.toString()}`);
    return res.data?.data ?? res.data;
  },

  async recordAttendance(payload: {
    employeeId: string;
    date: string;
    status: UpAttendanceStatus;
    isSunday?: boolean;
    isSundayOverride?: boolean;
    overtimeHours?: number;
    shift?: string;
    notes?: string | null;
  }): Promise<UpEmployeeAttendance> {
    const res = await apiClient.post<any>('/up-employees/attendance/record', payload);
    return res.data?.data ?? res.data;
  },

  async batchRecordAttendance(payload: {
    date: string;
    records: Array<{
      employeeId: string;
      status: UpAttendanceStatus;
      overtimeHours?: number;
      shift?: string;
      notes?: string | null;
      isSundayOverride?: boolean;
    }>;
  }): Promise<{ count: number; date: string }> {
    const res = await apiClient.post<any>('/up-employees/attendance/batch', payload);
    return res.data?.data ?? res.data;
  },

  async deleteAttendance(employeeId: string, date: string): Promise<any> {
    const res = await apiClient.delete<any>(
      `/up-employees/attendance/record?employeeId=${encodeURIComponent(employeeId)}&date=${encodeURIComponent(date)}`
    );
    return res.data?.data ?? res.data;
  },

  // ─── Advances ───────────────────────────────────────────────────────────────
  async listAdvances(params: {
    employeeId?: string;
    status?: 'PENDING' | 'RECOVERED' | 'ALL';
    recoveryMonth?: number;
    recoveryYear?: number;
  } = {}): Promise<UpEmployeeAdvance[]> {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        sp.set(k, String(v));
      }
    });
    const res = await apiClient.get<any>(`/up-employees/advances?${sp.toString()}`);
    return res.data?.data ?? res.data;
  },

  async getAdvanceSummary(): Promise<{
    totalDisbursed: number;
    totalRecovered: number;
    totalPendingRecovery: number;
  }> {
    const res = await apiClient.get<any>('/up-employees/advances/summary');
    return res.data?.data ?? res.data;
  },

  async createAdvance(payload: {
    employeeId: string;
    amount: number;
    reason: string;
    recoveryMonth: number;
    recoveryYear: number;
    advanceDate?: string;
    disbursedVia?: string;
  }): Promise<UpEmployeeAdvance> {
    const res = await apiClient.post<any>('/up-employees/advances', payload);
    return res.data?.data ?? res.data;
  },

  async partialDeductAdvance(
    id: string,
    payload: {
      deductionAmount: number;
      notes?: string | null;
      newRecoveryMonth?: number;
      newRecoveryYear?: number;
    }
  ): Promise<UpEmployeeAdvance> {
    const res = await apiClient.post<any>(`/up-employees/advances/${encodeURIComponent(id)}/partial-deduct`, payload);
    return res.data?.data ?? res.data;
  },

  async recoverAdvance(id: string): Promise<UpEmployeeAdvance> {
    const res = await apiClient.post<any>(`/up-employees/advances/${encodeURIComponent(id)}/recover`, {});
    return res.data?.data ?? res.data;
  },

  // ─── Deductions ─────────────────────────────────────────────────────────────
  async listDeductions(params: {
    employeeId?: string;
    applyMonth?: number;
    applyYear?: number;
    isApplied?: string;
  } = {}): Promise<UpEmployeeDeduction[]> {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        sp.set(k, String(v));
      }
    });
    const res = await apiClient.get<any>(`/up-employees/deductions?${sp.toString()}`);
    return res.data?.data ?? res.data;
  },

  async createDeduction(payload: {
    employeeId: string;
    amount: number;
    reason: string;
    applyMonth: number;
    applyYear: number;
  }): Promise<UpEmployeeDeduction> {
    const res = await apiClient.post<any>('/up-employees/deductions', payload);
    return res.data?.data ?? res.data;
  },

  async deleteDeduction(id: string): Promise<any> {
    const res = await apiClient.delete<any>(`/up-employees/deductions/${encodeURIComponent(id)}`);
    return res.data?.data ?? res.data;
  },

  // ─── Payroll ────────────────────────────────────────────────────────────────
  async listPayroll(params: {
    month: number;
    year: number;
    status?: 'DRAFT' | 'FINALIZED' | 'PAID' | 'ALL';
    employeeId?: string;
  }): Promise<{
    month: number;
    year: number;
    summary: {
      totalEmployees: number;
      totalAmount: number;
      paidCount: number;
      finalizedCount: number;
      draftCount: number;
    };
    items: UpEmployeePayrollRun[];
  }> {
    const sp = new URLSearchParams({
      month: String(params.month),
      year: String(params.year),
    });
    if (params.status) sp.set('status', params.status);
    if (params.employeeId) sp.set('employeeId', params.employeeId);
    const res = await apiClient.get<any>(`/up-employees/payroll?${sp.toString()}`);
    return res.data?.data ?? res.data;
  },

  async calculatePayroll(payload: {
    month: number;
    year: number;
    employeeIds?: string[];
    overtimeMultiplier?: number;
    workingHoursPerDay?: number;
  }): Promise<{ month: number; year: number; count: number; runs: UpEmployeePayrollRun[] }> {
    const res = await apiClient.post<any>('/up-employees/payroll/calculate', payload);
    return res.data?.data ?? res.data;
  },

  async finalizePayroll(id: string): Promise<UpEmployeePayrollRun> {
    const res = await apiClient.post<any>(`/up-employees/payroll/${encodeURIComponent(id)}/finalize`, {});
    return res.data?.data ?? res.data;
  },

  async revertPayrollToDraft(id: string): Promise<UpEmployeePayrollRun> {
    const res = await apiClient.post<any>(`/up-employees/payroll/${encodeURIComponent(id)}/revert-draft`, {});
    return res.data?.data ?? res.data;
  },

  async markPayrollPaid(
    id: string,
    payload: {
      paymentMode?: string;
      paymentReference?: string | null;
      paymentNotes?: string | null;
    }
  ): Promise<UpEmployeePayrollRun> {
    const res = await apiClient.post<any>(`/up-employees/payroll/${encodeURIComponent(id)}/mark-paid`, payload);
    return res.data?.data ?? res.data;
  },

  // ─── Leaves ─────────────────────────────────────────────────────────────────
  async accrueMonthlyLeave(payload: {
    month: number;
    year: number;
    clAmount?: number;
    elAmount?: number;
  }): Promise<{ count: number; clAmount: number; elAmount: number }> {
    const res = await apiClient.post<any>('/up-employees/leaves/accrue', payload);
    return res.data?.data ?? res.data;
  },

  async adjustLeave(
    id: string,
    payload: {
      leaveType: 'CL' | 'EL';
      amount: number;
      reason: string;
      month: number;
      year: number;
    }
  ): Promise<UpEmployeeLeaveLedger> {
    const res = await apiClient.post<any>(`/up-employees/leaves/adjust/${encodeURIComponent(id)}`, payload);
    return res.data?.data ?? res.data;
  },

  async getLeaveLedger(employeeId: string): Promise<UpEmployeeLeaveLedger[]> {
    const res = await apiClient.get<any>(`/up-employees/leaves/ledger/${encodeURIComponent(employeeId)}`);
    return res.data?.data ?? res.data;
  },
};
