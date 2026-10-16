import { apiClient, API_URL } from './client';
import type {
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
} from '../types/employee';

export const employeeService = {
  // ─── Master Data ────────────────────────────────────────────────────────────
  async listEmployees(params: {
    search?: string;
    department?: string;
    designation?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ListEmployeesResponse> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.department) query.append('department', params.department);
    if (params.designation) query.append('designation', params.designation);
    if (params.status) query.append('status', params.status);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    const qStr = query.toString();
    const res = await apiClient.get<any>(`/employees${qStr ? `?${qStr}` : ''}`);
    const data = res.data?.data !== undefined ? res.data.data : res.data;
    return (
      data || {
        items: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
      }
    );
  },

  async createEmployee(payload: CreateEmployeePayload): Promise<Employee> {
    const res = await apiClient.post<any>('/employees', payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getEmployee(id: string): Promise<Employee> {
    const res = await apiClient.get<any>(`/employees/${encodeURIComponent(id)}`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async updateEmployee(id: string, payload: UpdateEmployeePayload): Promise<Employee> {
    const res = await apiClient.patch<any>(`/employees/${encodeURIComponent(id)}`, payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async deactivateEmployee(id: string): Promise<Employee> {
    const res = await apiClient.delete<any>(`/employees/${encodeURIComponent(id)}`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  // ─── Attendance ─────────────────────────────────────────────────────────────
  async listAttendance(params: { month: number; year: number; employeeId?: string }): Promise<ListAttendanceResponse> {
    const query = new URLSearchParams();
    query.append('month', params.month.toString());
    query.append('year', params.year.toString());
    if (params.employeeId) query.append('employeeId', params.employeeId);

    const res = await apiClient.get<any>(`/employees/attendance/monthly?${query.toString()}`);
    const data = res.data?.data !== undefined ? res.data.data : res.data;
    return (
      data || {
        month: params.month,
        year: params.year,
        totalDays: 31,
        records: [],
      }
    );
  },

  async recordAttendance(payload: RecordAttendancePayload): Promise<EmployeeAttendance> {
    const res = await apiClient.post<any>('/employees/attendance/record', payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async batchRecordAttendance(payload: BatchAttendancePayload): Promise<{ updatedCount: number; records: EmployeeAttendance[] }> {
    const res = await apiClient.post<any>('/employees/attendance/batch', payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async deleteAttendance(params: { employeeId: string; date: string }): Promise<any> {
    const query = new URLSearchParams();
    query.append('employeeId', params.employeeId);
    query.append('date', params.date);

    const res = await apiClient.delete<any>(`/employees/attendance/record?${query.toString()}`);
    return res.data?.data !== undefined ? res.data.data : res.data;
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

    const res = await apiClient.get(`/employees/attendance/monthly-report-pdf?${query.toString()}`, {
      responseType: 'blob',
    });

    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = params.filename || `Pacific_Attendance_Register_${params.month}_${params.year}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // ─── Leave Ledger ───────────────────────────────────────────────────────────
  async accrueMonthlyLeave(payload: { month: number; year: number }): Promise<any> {
    const res = await apiClient.post<any>('/employees/leaves/accrue', payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getLeaveLedger(employeeId: string): Promise<{ employee: Employee; history: EmployeeLeaveLedger[] }> {
    const res = await apiClient.get<any>(`/employees/leaves/ledger/${encodeURIComponent(employeeId)}`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async adjustLeave(
    employeeId: string,
    payload: { leaveType: 'CL' | 'EL'; amount: number; reason: string; month?: number; year?: number }
  ): Promise<any> {
    const res = await apiClient.post<any>(`/employees/leaves/adjust/${encodeURIComponent(employeeId)}`, payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  // ─── Advances ───────────────────────────────────────────────────────────────
  async listAdvances(params: {
    employeeId?: string;
    recoveryMonth?: number;
    recoveryYear?: number;
    isRecovered?: boolean;
  } = {}): Promise<EmployeeAdvance[]> {
    const query = new URLSearchParams();
    if (params.employeeId) query.append('employeeId', params.employeeId);
    if (params.recoveryMonth) query.append('recoveryMonth', params.recoveryMonth.toString());
    if (params.recoveryYear) query.append('recoveryYear', params.recoveryYear.toString());
    if (params.isRecovered !== undefined) query.append('isRecovered', params.isRecovered.toString());

    const qStr = query.toString();
    const res = await apiClient.get<any>(`/employees/advances${qStr ? `?${qStr}` : ''}`);
    const data = res.data?.data !== undefined ? res.data.data : res.data;
    return Array.isArray(data) ? data : [];
  },

  async getAdvanceSummary(params: { recoveryMonth?: number; recoveryYear?: number } = {}): Promise<AdvanceSummary> {
    const query = new URLSearchParams();
    if (params.recoveryMonth) query.append('recoveryMonth', params.recoveryMonth.toString());
    if (params.recoveryYear) query.append('recoveryYear', params.recoveryYear.toString());

    const qStr = query.toString();
    const res = await apiClient.get<any>(`/employees/advances/summary${qStr ? `?${qStr}` : ''}`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getAdvanceLedger(params: {
    employeeId?: string;
    recoveryMonth?: number;
    recoveryYear?: number;
    search?: string;
  } = {}): Promise<AdvanceLedgerResponse> {
    const query = new URLSearchParams();
    if (params.employeeId) query.append('employeeId', params.employeeId);
    if (params.recoveryMonth) query.append('recoveryMonth', params.recoveryMonth.toString());
    if (params.recoveryYear) query.append('recoveryYear', params.recoveryYear.toString());
    if (params.search) query.append('search', params.search);

    const qStr = query.toString();
    const res = await apiClient.get<any>(`/employees/advances/ledger${qStr ? `?${qStr}` : ''}`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async createAdvance(payload: CreateAdvancePayload): Promise<EmployeeAdvance> {
    const res = await apiClient.post<any>('/employees/advances', payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async updateAdvance(id: string, payload: UpdateAdvancePayload): Promise<EmployeeAdvance> {
    const res = await apiClient.patch<any>(`/employees/advances/${encodeURIComponent(id)}`, payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async recoverAdvance(
    id: string,
    payload: RecoverAdvancePayload = { recoveryType: 'FULL' }
  ): Promise<{ advance: EmployeeAdvance; deductedAmount: number; isFullRecovery: boolean; carriedForwardAdvance?: EmployeeAdvance }> {
    const res = await apiClient.post<any>(`/employees/advances/${encodeURIComponent(id)}/recover`, payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async partialDeductAdvance(
    id: string,
    payload: PartialDeductAdvancePayload
  ): Promise<{ advance: EmployeeAdvance; deductedAmount: number; isFullRecovery: boolean; carriedForwardAdvance?: EmployeeAdvance }> {
    const res = await apiClient.post<any>(`/employees/advances/${encodeURIComponent(id)}/partial-deduct`, payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async deleteAdvance(id: string): Promise<any> {
    const res = await apiClient.delete<any>(`/employees/advances/${encodeURIComponent(id)}`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  // ─── Deductions ─────────────────────────────────────────────────────────────
  async listDeductions(params: {
    employeeId?: string;
    applyMonth?: number;
    applyYear?: number;
    isApplied?: boolean;
  } = {}): Promise<EmployeeDeduction[]> {
    const query = new URLSearchParams();
    if (params.employeeId) query.append('employeeId', params.employeeId);
    if (params.applyMonth) query.append('applyMonth', params.applyMonth.toString());
    if (params.applyYear) query.append('applyYear', params.applyYear.toString());
    if (params.isApplied !== undefined) query.append('isApplied', params.isApplied.toString());

    const qStr = query.toString();
    const res = await apiClient.get<any>(`/employees/deductions${qStr ? `?${qStr}` : ''}`);
    const data = res.data?.data !== undefined ? res.data.data : res.data;
    return Array.isArray(data) ? data : [];
  },

  async createDeduction(payload: CreateDeductionPayload): Promise<EmployeeDeduction> {
    const res = await apiClient.post<any>('/employees/deductions', payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async updateDeduction(id: string, payload: UpdateDeductionPayload): Promise<EmployeeDeduction> {
    const res = await apiClient.patch<any>(`/employees/deductions/${encodeURIComponent(id)}`, payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async deleteDeduction(id: string): Promise<any> {
    const res = await apiClient.delete<any>(`/employees/deductions/${encodeURIComponent(id)}`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  // ─── Payroll ────────────────────────────────────────────────────────────────
  async simulateSalaryCalculation(payload: SimulateSalaryCalculationPayload): Promise<SalaryCalculationBreakdown> {
    const res = await apiClient.post<any>('/employees/payroll/simulate', payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getEmployeeSalaryDefaults(employeeId: string, month: number, year: number): Promise<EmployeeSalaryDefaults> {
    const query = new URLSearchParams({
      employeeId,
      month: month.toString(),
      year: year.toString(),
    });
    const res = await apiClient.get<any>(`/employees/payroll/defaults?${query.toString()}`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getSalaryCalculationDefaults(employeeId: string, month: number, year: number): Promise<EmployeeSalaryDefaults> {
    return this.getEmployeeSalaryDefaults(employeeId, month, year);
  },

  async calculatePayroll(payload: CalculatePayrollPayload): Promise<EmployeePayrollRun[]> {
    const res = await apiClient.post<any>('/employees/payroll/calculate', payload);
    const data = res.data?.data !== undefined ? res.data.data : res.data;
    return Array.isArray(data) ? data : [];
  },

  async listPayroll(params: {
    month: number;
    year: number;
    employeeId?: string;
    status?: string;
  }): Promise<EmployeePayrollRun[]> {
    const query = new URLSearchParams();
    query.append('month', params.month.toString());
    query.append('year', params.year.toString());
    if (params.employeeId) query.append('employeeId', params.employeeId);
    if (params.status) query.append('status', params.status);

    const res = await apiClient.get<any>(`/employees/payroll?${query.toString()}`);
    const data = res.data?.data !== undefined ? res.data.data : res.data;
    return Array.isArray(data) ? data : [];
  },

  async finalizePayroll(id: string): Promise<EmployeePayrollRun> {
    const res = await apiClient.post<any>(`/employees/payroll/${encodeURIComponent(id)}/finalize`, {});
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async revertPayrollToDraft(id: string): Promise<EmployeePayrollRun> {
    const res = await apiClient.post<any>(`/employees/payroll/${encodeURIComponent(id)}/revert-draft`, {});
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async markPayrollPaid(id: string, payload: MarkPayrollPaidPayload): Promise<EmployeePayrollRun> {
    const res = await apiClient.post<any>(`/employees/payroll/${encodeURIComponent(id)}/mark-paid`, payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async downloadPayslipPdf(id: string, filename?: string): Promise<void> {
    const res = await apiClient.get(`/employees/payroll/${encodeURIComponent(id)}/payslip-pdf`, {
      responseType: 'blob',
    });

    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `Payslip_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async resendPayslipEmail(id: string, recipientEmail?: string): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient.post<any>(`/employees/payroll/${encodeURIComponent(id)}/resend-payslip-email`, {
      recipientEmail,
    });
    return res.data?.data !== undefined ? res.data.data : res.data;
  },
};

export const employeeApi = employeeService;
export default employeeService;
