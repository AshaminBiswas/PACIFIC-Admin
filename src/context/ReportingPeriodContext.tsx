import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReportingPeriodType,
  ReportingPeriodSelection,
  ResolvedDateRange,
  ComparisonMode,
  resolveReportingPeriod,
  getCurrentIndianFiscalYear,
  getCurrentCalendarYear,
} from '../utils/reportingPeriods';

interface ReportingPeriodContextValue {
  selection: ReportingPeriodSelection;
  resolvedPeriod: ResolvedDateRange;
  isRefreshing: boolean;
  refreshCount: number;
  setPeriodType: (type: ReportingPeriodType) => void;
  setDailyDate: (date: string) => void;
  setWeeklyWeek: (week: string) => void;
  setMonthlyMonth: (month: string) => void;
  setQuarter: (quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4', year: number, quarterType?: 'FY' | 'CALENDAR') => void;
  setHalfYear: (halfYear: 'H1' | 'H2', fiscalYear?: string) => void;
  setYear: (year: number) => void;
  setFinancialYear: (fy: string) => void;
  setCustomRange: (startDate: string, endDate: string) => void;
  setComparisonMode: (mode: ComparisonMode, compareStart?: string, compareEnd?: string) => void;
  triggerRefresh: () => void;
}

const STORAGE_KEY = 'pacific_reporting_period_selection_v1';

const defaultSelection: ReportingPeriodSelection = {
  type: 'MONTHLY',
  comparisonMode: 'PREVIOUS_PERIOD',
};

const ReportingPeriodContext = createContext<ReportingPeriodContextValue | undefined>(undefined);

export const ReportingPeriodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selection, setSelection] = useState<ReportingPeriodSelection>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return defaultSelection;
  });

  const [refreshCount, setRefreshCount] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    } catch {
      // ignore
    }
  }, [selection]);

  const resolvedPeriod = useMemo(() => {
    return resolveReportingPeriod(selection);
  }, [selection]);

  const triggerRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshCount((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 400);
  }, []);

  const setPeriodType = useCallback((type: ReportingPeriodType) => {
    setSelection((prev) => ({
      ...prev,
      type,
    }));
  }, []);

  const setDailyDate = useCallback((date: string) => {
    setSelection((prev) => ({
      ...prev,
      type: 'DAILY',
      date,
    }));
  }, []);

  const setWeeklyWeek = useCallback((week: string) => {
    setSelection((prev) => ({
      ...prev,
      type: 'WEEKLY',
      week,
    }));
  }, []);

  const setMonthlyMonth = useCallback((month: string) => {
    setSelection((prev) => ({
      ...prev,
      type: 'MONTHLY',
      month,
    }));
  }, []);

  const setQuarter = useCallback(
    (quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4', year: number, quarterType: 'FY' | 'CALENDAR' = 'FY') => {
      setSelection((prev) => ({
        ...prev,
        type: 'QUARTERLY',
        quarter,
        quarterYear: year,
        quarterType,
      }));
    },
    []
  );

  const setHalfYear = useCallback((halfYear: 'H1' | 'H2', fiscalYear?: string) => {
    setSelection((prev) => ({
      ...prev,
      type: 'HALF_YEARLY',
      halfYear,
      halfYearFiscalYear: fiscalYear || getCurrentIndianFiscalYear(),
    }));
  }, []);

  const setYear = useCallback((year: number) => {
    setSelection((prev) => ({
      ...prev,
      type: 'YEARLY',
      year,
    }));
  }, []);

  const setFinancialYear = useCallback((fy: string) => {
    setSelection((prev) => ({
      ...prev,
      type: 'FINANCIAL_YEAR',
      financialYear: fy,
    }));
  }, []);

  const setCustomRange = useCallback((startDate: string, endDate: string) => {
    setSelection((prev) => ({
      ...prev,
      type: 'CUSTOM',
      customStart: startDate,
      customEnd: endDate,
    }));
  }, []);

  const setComparisonMode = useCallback(
    (mode: ComparisonMode, compareStart?: string, compareEnd?: string) => {
      setSelection((prev) => ({
        ...prev,
        comparisonMode: mode,
        compareCustomStart: compareStart,
        compareCustomEnd: compareEnd,
      }));
    },
    []
  );

  const value = useMemo(
    () => ({
      selection,
      resolvedPeriod,
      isRefreshing,
      refreshCount,
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
    }),
    [
      selection,
      resolvedPeriod,
      isRefreshing,
      refreshCount,
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
    ]
  );

  return <ReportingPeriodContext.Provider value={value}>{children}</ReportingPeriodContext.Provider>;
};

export const useReportingPeriod = (): ReportingPeriodContextValue => {
  const ctx = useContext(ReportingPeriodContext);
  if (!ctx) {
    throw new Error('useReportingPeriod must be used within a <ReportingPeriodProvider>');
  }
  return ctx;
};
