import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  Loader2,
  Sparkles,
  Building2,
} from 'lucide-react';
import { branchLedgerApi } from '../../api/branchLedgerApi';

interface BranchLedgerPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId?: string;
  branchName?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  periodLabel?: string;
}

export const BranchLedgerPdfModal: React.FC<BranchLedgerPdfModalProps> = ({
  isOpen,
  onClose,
  branchId,
  branchName = 'Branch Ledger',
  startDate,
  endDate,
  date,
  periodLabel = 'Current Period',
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

    branchLedgerApi
      .getPdfHtml({ branchId, startDate, endDate, date })
      .then((html) => {
        if (isMounted) setHtmlContent(html);
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load Branch Ledger PDF preview:', err);
          setError(
            err?.response?.data?.message || err?.message || 'Failed to generate Branch Ledger PDF preview.'
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, branchId, startDate, endDate, date]);

  if (!isOpen) return null;

  const downloadUrl = branchLedgerApi.getPdfUrl({
    branchId,
    startDate,
    endDate,
    date,
    dl: 1,
  });

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      if (iframe.contentDocument) {
        iframe.contentDocument.title = `Pacific_Branch_Ledger_${branchId || 'All'}_${date || startDate}`;
      }
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.title = `Pacific_Branch_Ledger_${branchId || 'All'}_${date || startDate}`;
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
      const blob = await branchLedgerApi.downloadPdfBlob({
        branchId,
        startDate,
        endDate,
        date,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Pacific_Branch_Ledger_${branchId || 'All'}_${date || startDate || 'Report'}.pdf`;
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
                <h2 className="text-sm font-bold text-white">Branch Debit & Credit Ledger Report (PDF)</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>PIChart, Flow Diagram & Colored Tables</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {branchName} · {periodLabel}
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
        <div className="flex-1 bg-slate-950 relative overflow-hidden">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
              <p className="text-xs">Generating vector Branch Debit & Credit PDF report with SVG charts...</p>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs max-w-md">
                <p className="font-bold text-sm mb-1 text-rose-200">Failed to render PDF Report</p>
                <p>{error}</p>
              </div>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              srcDoc={htmlContent}
              title="Branch Ledger PDF Preview"
              className="w-full h-full border-none bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
};
