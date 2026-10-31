import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ShieldCheck,
  FileText,
  Calendar,
} from 'lucide-react';
import { useReportingPeriod } from '../../context/ReportingPeriodContext';
import { analyticsApi, EnqueueReportRequest } from '../../api/analyticsApi';
import { AsyncReportJob } from '../../types/admin';

interface AsyncReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AsyncReportExportModal: React.FC<AsyncReportExportModalProps> = ({ isOpen, onClose }) => {
  const { resolvedPeriod } = useReportingPeriod();

  const [reportType, setReportType] = useState<EnqueueReportRequest['reportType']>('TRANSACTIONS');
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeJob, setActiveJob] = useState<AsyncReportJob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const idempotencyKey = `export_${reportType}_${format}_${resolvedPeriod.startDate}_${resolvedPeriod.endDate}_${Date.now()}`;
      const enqueued = await analyticsApi.enqueueReport({
        reportType,
        format,
        startDate: resolvedPeriod.startDate,
        endDate: resolvedPeriod.endDate,
        idempotencyKey,
      });

      // Set initial job state
      setActiveJob({
        id: enqueued.jobId,
        reportType,
        format,
        status: 'PENDING',
        progress: 10,
        startDate: resolvedPeriod.startDate,
        endDate: resolvedPeriod.endDate,
        createdAt: enqueued.createdAt,
      });

      // Start polling status
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusJob = await analyticsApi.getReportJobStatus(enqueued.jobId);
          setActiveJob(statusJob);

          if (statusJob.status === 'COMPLETED' || statusJob.status === 'FAILED') {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } catch (err: any) {
          console.error('Error polling report job status:', err);
        }
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to start report generation job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = () => {
    if (activeJob?.downloadToken) {
      const url = analyticsApi.getDownloadUrl(activeJob.downloadToken);
      window.open(url, '_blank');
    }
  };

  const resetForm = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setActiveJob(null);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Enterprise Report Generator</h3>
              <p className="text-xs text-slate-400">High-performance asynchronous queue export</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* If Job is in progress or completed */}
          {activeJob ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Job Status</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    activeJob.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : activeJob.status === 'FAILED'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                  }`}
                >
                  {activeJob.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>
                    {activeJob.status === 'PROCESSING'
                      ? 'Processing transactions & generating workbook...'
                      : activeJob.status === 'COMPLETED'
                      ? 'Report ready for download!'
                      : activeJob.status === 'FAILED'
                      ? 'Generation failed'
                      : 'Queued in background worker...'}
                  </span>
                  <span className="font-semibold text-lime-400">{activeJob.progress || 10}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      activeJob.status === 'COMPLETED'
                        ? 'bg-emerald-500'
                        : activeJob.status === 'FAILED'
                        ? 'bg-rose-500'
                        : 'bg-gradient-to-r from-lime-500 to-emerald-500'
                    }`}
                    style={{ width: `${activeJob.progress || 10}%` }}
                  />
                </div>
              </div>

              {/* Job Details Card */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Report:</span>
                  <span className="font-medium text-slate-200">{activeJob.reportType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Format:</span>
                  <span className="font-medium uppercase text-slate-200">{activeJob.format}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Period:</span>
                  <span className="font-medium text-slate-200">{resolvedPeriod.label}</span>
                </div>
                {activeJob.fileSizeBytes && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Size:</span>
                    <span className="font-medium text-slate-200">
                      {(activeJob.fileSizeBytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                )}
              </div>

              {/* Actions when completed */}
              {activeJob.status === 'COMPLETED' && (
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-lime-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File ({activeJob.fileName})</span>
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Protected temporary signed link (Valid for 24 hours)</span>
                  </div>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-xs text-slate-400 hover:text-white underline underline-offset-2"
                    >
                      Export another report
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Active Period Synchronization Notice */}
              <div className="p-3 rounded-lg bg-lime-950/20 border border-lime-500/20 flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="text-lime-300 font-semibold">Synchronized with Dashboard Filter</div>
                  <div className="text-slate-300 mt-0.5">
                    {resolvedPeriod.label}: <strong className="text-white">{resolvedPeriod.startDateLocal}</strong> to{' '}
                    <strong className="text-white">{resolvedPeriod.endDateLocal}</strong> (Asia/Kolkata)
                  </div>
                </div>
              </div>

              {/* Report Type Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Select Report Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'TRANSACTIONS', title: 'Complete Transaction Ledger', desc: 'All Daily Sales, Purchases & Collections' },
                    { id: 'SALES_SUMMARY', title: 'Daily Sales Report', desc: 'Direct customer sales, GST & revenue (Delinked from PI)' },
                    { id: 'PURCHASE_SUMMARY', title: 'Daily Purchases Report', desc: 'Direct vendor purchases, GST & procurement costs' },
                    { id: 'PROFIT_LOSS', title: 'Profit & Loss Statement', desc: 'Revenue, direct costs & gross margins' },
                    { id: 'OUTSTANDING_RECEIVABLES', title: 'Outstanding Aging Report', desc: 'Receivables & payables aging' },
                    { id: 'GST_RECONCILIATION', title: 'GST Tax Summary', desc: 'CGST, SGST, IGST tax breakdown' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setReportType(item.id as any)}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        reportType === item.id
                          ? 'bg-lime-950/30 border-lime-500/60 ring-1 ring-lime-500/30'
                          : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>{item.title}</span>
                        {reportType === item.id && <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Export Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat('xlsx')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                      format === 'xlsx'
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/30'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Microsoft Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('csv')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                      format === 'csv'
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/30'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-teal-400" />
                    <span>Comma-Separated (.csv)</span>
                  </button>
                </div>
              </div>

              {/* Scalability Notice */}
              <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
                <Clock className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                <span>
                  Large datasets are processed via asynchronous background workers to ensure 100% ERP responsiveness.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleStartExport}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-lime-500 hover:bg-lime-400 text-slate-950 shadow-md shadow-lime-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enqueuing Job...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Start Generation</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
