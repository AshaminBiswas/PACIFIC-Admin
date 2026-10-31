import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  Loader2,
  PieChart as PieIcon,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { dailySalesPurchasesApi } from '../../api/dailySalesPurchasesApi';

interface DailyReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  date?: string;
  periodLabel?: string;
}

export const DailyReportPdfModal: React.FC<DailyReportPdfModalProps> = ({
  isOpen,
  onClose,
  startDate,
  endDate,
  date,
  periodLabel = 'Reporting Period',
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    dailySalesPurchasesApi
      .getPdfHtml({ startDate, endDate, date })
      .then((html) => {
        if (isMounted) setHtmlContent(html);
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load PDF report preview:', err);
          setError(
            err?.response?.data?.message || err?.message || 'Failed to generate PDF report preview.'
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, startDate, endDate, date]);

  if (!isOpen) return null;

  const downloadUrl = dailySalesPurchasesApi.getPdfUrl({
    startDate,
    endDate,
    date,
    dl: 1,
  });

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      if (iframe.contentDocument) {
        iframe.contentDocument.title = `Pacific_Daily_Sales_Purchase_Report_${date || startDate}`;
      }
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.title = `Pacific_Daily_Sales_Purchase_Report_${date || startDate}`;
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const blob = await dailySalesPurchasesApi.downloadPdfBlob({
        startDate,
        endDate,
        date,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Pacific_Daily_Sales_Purchase_Report_${date || startDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('Direct blob download failed, falling back to window.open:', err);
      window.open(downloadUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl h-[94vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-lime-500/10 text-lime-400 border border-lime-500/20">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-white">Daily Sales & Purchase Report (PDF)</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>PIChart, Trend Graph & Colored Tables</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {periodLabel} ({date || `${startDate} to ${endDate}`})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isLoading || !!error}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-40"
              title="Print document or Save to PDF via browser dialog"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Print / Save as PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isLoading || isDownloading || !!error}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-400 hover:to-emerald-400 text-slate-950 shadow-md shadow-lime-500/20 flex items-center gap-1.5 transition-all disabled:opacity-40"
              title="Download official PDF file"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Iframe Body */}
        <div className="flex-1 bg-slate-950 p-2 sm:p-4 overflow-auto flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-slate-400">
              <Loader2 className="w-8 h-8 text-lime-400 animate-spin" />
              <div className="text-xs font-medium text-slate-300">
                Generating Vector A4 PDF with PIChart and Colored Tables...
              </div>
              <p className="text-[11px] text-slate-500">
                Formatting sales and purchase ledgers in Asia/Kolkata timezone
              </p>
            </div>
          ) : error ? (
            <div className="p-6 max-w-md mx-auto text-center space-y-3 bg-rose-950/30 border border-rose-500/30 rounded-2xl text-rose-300 text-xs">
              <p className="font-bold text-rose-400 text-sm">Preview Generation Failed</p>
              <p>{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  dailySalesPurchasesApi
                    .getPdfHtml({ startDate, endDate, date })
                    .then(setHtmlContent)
                    .catch((err) => setError(err?.message || 'Error generating PDF.'))
                    .finally(() => setIsLoading(false));
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-900 text-white font-semibold inline-flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Retry Preview</span>
              </button>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              title="Daily Sales & Purchase Report A4 Preview"
              srcDoc={htmlContent}
              className="w-full h-full bg-white rounded-xl shadow-2xl border border-slate-700 max-w-[210mm] min-h-[297mm]"
            />
          )}
        </div>
      </div>
    </div>
  );
};
