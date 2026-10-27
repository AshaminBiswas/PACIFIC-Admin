import React, { useState, useEffect } from 'react';
import {
  History, Download, Eye, FileText, CheckCircle2, Clock,
  AlertCircle, RefreshCw, X, ExternalLink, ShieldCheck, User
} from 'lucide-react';
import { salesQuotationsApi } from '../../api/salesQuotationsApi';
import { piApi } from '../../api/proformaApi';
import type { DocumentRevision } from '../../types/admin';

interface DocumentRevisionHistoryCardProps {
  documentType: 'QUOTATION' | 'PI';
  documentId: string;
  documentNumber?: string;
  currentRevisionNumber?: number;
  className?: string;
}

export default function DocumentRevisionHistoryCard({
  documentType,
  documentId,
  documentNumber,
  currentRevisionNumber,
  className = '',
}: DocumentRevisionHistoryCardProps) {
  const [revisions, setRevisions] = useState<DocumentRevision[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRevision, setSelectedRevision] = useState<DocumentRevision | null>(null);
  const [activeTab, setActiveTab] = useState<'pdf' | 'snapshot'>('pdf');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);

  const fetchRevisions = async () => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    try {
      if (documentType === 'QUOTATION') {
        const res = await salesQuotationsApi.getRevisions(documentId);
        setRevisions(res.data?.data || []);
      } else {
        const res = await piApi.getRevisions(documentId);
        setRevisions(res.data?.data || []);
      }
    } catch (err: any) {
      console.warn('[DocumentRevisionHistoryCard] Failed to fetch revisions:', err);
      setError(err?.response?.data?.message || err?.message || 'Unable to load revision history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevisions();
  }, [documentType, documentId]);

  // Load PDF for the preview modal with Authorization headers
  useEffect(() => {
    let active = true;
    if (selectedRevision) {
      setLoadingPdf(true);
      const url =
        documentType === 'QUOTATION'
          ? salesQuotationsApi.getRevisionPdfUrl(documentId, selectedRevision.revisionNumber, false)
          : piApi.getRevisionPdfUrl(documentId, selectedRevision.revisionNumber, false);

      const token = localStorage.getItem('pacific_access_token');
      fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          if (active) {
            const blobUrl = URL.createObjectURL(blob);
            setPdfBlobUrl(blobUrl);
            setLoadingPdf(false);
          }
        })
        .catch((err) => {
          console.warn('[DocumentRevisionHistoryCard] Error streaming PDF:', err);
          if (active) {
            setPdfBlobUrl(null);
            setLoadingPdf(false);
          }
        });
    } else {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
    }

    return () => {
      active = false;
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [selectedRevision, documentType, documentId]);

  const handleDownloadPdf = async (revision: DocumentRevision) => {
    try {
      const downloadUrl =
        documentType === 'QUOTATION'
          ? salesQuotationsApi.getRevisionPdfUrl(documentId, revision.revisionNumber, true)
          : piApi.getRevisionPdfUrl(documentId, revision.revisionNumber, true);

      const token = localStorage.getItem('pacific_access_token');
      const res = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Failed to download (HTTP ${res.status})`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = revision.pdfFileName || `${documentNumber || 'DOCUMENT'}_${revision.revisionCode}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      alert(`Could not download archived PDF: ${err?.message || 'Network error'}`);
    }
  };

  const getStatusBadge = (status: string, isOriginal: boolean, isCurrent: boolean) => {
    if (isCurrent || status === 'CURRENT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10">
          <CheckCircle2 className="w-3 h-3" /> Current Version
        </span>
      );
    }
    if (isOriginal || status === 'ORIGINAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <ShieldCheck className="w-3 h-3" /> Original Version
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Clock className="w-3 h-3" /> Superseded
      </span>
    );
  };

  return (
    <div className={`bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Document Revision History &amp; PDF Archives
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/5 text-gray-300 border border-white/10">
                {revisions.length} {revisions.length === 1 ? 'Version' : 'Versions'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Every revision and its corresponding PDF is permanently archived, immutable, and downloadable.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchRevisions}
          disabled={loading}
          className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs transition-all border border-white/5 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8 text-gray-400 space-x-2 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-[#7FB706]" />
          <span>Loading immutable document revisions...</span>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && revisions.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-xs italic">
          No revision snapshots recorded yet. A revision snapshot is automatically created when this document is created or revised.
        </div>
      )}

      {/* Revisions Table / Card List */}
      {!loading && !error && revisions.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-semibold">Revision</th>
                <th className="py-3 px-4 font-semibold">Document No</th>
                <th className="py-3 px-4 font-semibold">Date &amp; Time</th>
                <th className="py-3 px-4 font-semibold">Created / Revised By</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {revisions.map((rev) => {
                const isLatest = rev.revisionNumber === (currentRevisionNumber || revisions[0]?.revisionNumber);
                const isOriginal = rev.revisionNumber === 1;

                return (
                  <tr
                    key={rev.id || rev.revisionNumber}
                    className={`transition-colors hover:bg-white/[0.02] ${
                      isLatest ? 'bg-emerald-500/[0.02]' : ''
                    }`}
                  >
                    {/* Revision Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-white/5 text-amber-400 border border-amber-400/20">
                          {rev.revisionCode || `REV-${String(rev.revisionNumber).padStart(2, '0')}`}
                        </span>
                        {isLatest && (
                          <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      {rev.reason && (
                        <div className="text-[11px] text-gray-400 mt-1 max-w-xs truncate" title={rev.reason}>
                          {rev.reason}
                        </div>
                      )}
                    </td>

                    {/* Document Number */}
                    <td className="py-3.5 px-4 font-mono font-medium text-gray-200 whitespace-nowrap">
                      {rev.documentNumber || documentNumber || '-'}
                    </td>

                    {/* Date and Time */}
                    <td className="py-3.5 px-4 text-gray-300 whitespace-nowrap">
                      <div className="font-medium text-white">
                        {new Date(rev.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        {new Date(rev.createdAt).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                    </td>

                    {/* Created By */}
                    <td className="py-3.5 px-4 text-gray-300 whitespace-nowrap">
                      {rev.createdBy ? (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-gray-200 font-medium">
                            {rev.createdBy.firstName
                              ? `${rev.createdBy.firstName} ${rev.createdBy.lastName || ''}`.trim()
                              : rev.createdBy.email || 'Staff'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">System / Initial</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="font-mono font-bold text-white text-sm">
                        ₹{Number(rev.grandTotal || 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {rev.itemCount || 0} {rev.itemCount === 1 ? 'item' : 'items'}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(rev.status, isOriginal, isLatest)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRevision(rev);
                            setActiveTab('pdf');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-xs font-semibold border border-indigo-500/20 transition-all cursor-pointer"
                          title="View exact historical document & PDF"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(rev)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-xs font-semibold border border-emerald-500/20 transition-all cursor-pointer"
                          title={`Download archived PDF (${rev.pdfFileName || 'PDF'})`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL: Historical Document & Archived PDF Viewer ───────────── */}
      {selectedRevision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0a0a1a]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-white">
                      {documentType === 'QUOTATION' ? 'Quotation Revision' : 'Proforma Invoice Revision'}{' '}
                      <span className="text-amber-400 font-mono">{selectedRevision.revisionCode}</span>
                    </h2>
                    <span className="text-xs text-gray-400 font-mono font-semibold">
                      ({selectedRevision.documentNumber || documentNumber})
                    </span>
                    {getStatusBadge(
                      selectedRevision.status,
                      selectedRevision.revisionNumber === 1,
                      selectedRevision.revisionNumber === (currentRevisionNumber || revisions[0]?.revisionNumber)
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                    <span>
                      Archived on {new Date(selectedRevision.createdAt).toLocaleString('en-GB')}
                    </span>
                    {selectedRevision.reason && (
                      <span className="text-amber-400/90 italic">
                        • {selectedRevision.reason}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedRevision)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRevision(null)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  title="Close viewer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs & Quick Financial Bar */}
            <div className="px-5 py-2.5 bg-[#0e0e22] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('pdf')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    activeTab === 'pdf'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white bg-white/5'
                  }`}
                >
                  Archived PDF Document
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('snapshot')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    activeTab === 'snapshot'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white bg-white/5'
                  }`}
                >
                  Immutable Data Snapshot
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-gray-500 mr-1.5">Subtotal:</span>
                  <span className="text-gray-300">
                    ₹{Number(selectedRevision.subtotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 mr-1.5">Tax (GST):</span>
                  <span className="text-gray-300">
                    ₹{Number(selectedRevision.taxAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="font-bold">
                  <span className="text-gray-500 mr-1.5">Grand Total:</span>
                  <span className="text-[#7FB706]">
                    ₹{Number(selectedRevision.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden relative bg-[#070714]">
              {activeTab === 'pdf' ? (
                loadingPdf ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                    <span className="text-xs">Streaming immutable PDF from disk archive...</span>
                  </div>
                ) : pdfBlobUrl ? (
                  <iframe
                    src={pdfBlobUrl}
                    title={`Archived Revision ${selectedRevision.revisionCode}`}
                    className="w-full h-full border-none"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3 p-6 text-center">
                    <AlertCircle className="w-8 h-8 text-amber-400" />
                    <p className="text-sm font-semibold text-white">Direct browser preview unavailable</p>
                    <p className="text-xs text-gray-400 max-w-sm">
                      The document snapshot is intact. You can click "Download PDF" above to view the archived PDF locally.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(selectedRevision)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs"
                    >
                      Download PDF
                    </button>
                  </div>
                )
              ) : (
                <div className="h-full overflow-y-auto p-6 space-y-5 text-xs text-gray-300">
                  {/* Snapshot Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#121226] border border-white/5 rounded-xl p-4 space-y-2">
                      <div className="text-[10px] uppercase font-bold text-gray-500">Document Meta</div>
                      <div>Number: <span className="font-mono text-white font-bold">{selectedRevision.documentNumber || documentNumber}</span></div>
                      <div>Revision: <span className="font-mono text-amber-400 font-bold">{selectedRevision.revisionCode}</span></div>
                      <div>File Name: <span className="font-mono text-gray-400 text-[11px]">{selectedRevision.pdfFileName}</span></div>
                      <div>Created: <span className="text-white">{new Date(selectedRevision.createdAt).toLocaleString('en-GB')}</span></div>
                    </div>

                    <div className="bg-[#121226] border border-white/5 rounded-xl p-4 space-y-2">
                      <div className="text-[10px] uppercase font-bold text-gray-500">Financial Snapshot</div>
                      <div>Subtotal: <span className="text-white font-mono">₹{Number(selectedRevision.subtotal || 0).toLocaleString('en-IN')}</span></div>
                      <div>Tax Amount: <span className="text-white font-mono">₹{Number(selectedRevision.taxAmount || 0).toLocaleString('en-IN')}</span></div>
                      <div>Grand Total: <span className="text-[#7FB706] font-mono font-bold text-sm">₹{Number(selectedRevision.grandTotal || 0).toLocaleString('en-IN')}</span></div>
                      <div>Items: <span className="text-white">{selectedRevision.itemCount}</span></div>
                    </div>

                    <div className="bg-[#121226] border border-white/5 rounded-xl p-4 space-y-2">
                      <div className="text-[10px] uppercase font-bold text-gray-500">Customer &amp; Issuer</div>
                      <div>Customer: <span className="text-white font-semibold">{selectedRevision.customerName || (selectedRevision.snapshotJson as any)?.recipientName || '-'}</span></div>
                      <div>Issued By: <span className="text-white">{selectedRevision.createdBy?.firstName ? `${selectedRevision.createdBy.firstName} ${selectedRevision.createdBy.lastName || ''}` : 'System'}</span></div>
                      <div>Reason: <span className="text-amber-400 italic">{selectedRevision.reason || 'None specified'}</span></div>
                    </div>
                  </div>

                  {/* Raw Snapshot Viewer */}
                  <div className="bg-[#121226] border border-white/5 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-[10px] uppercase font-bold text-gray-500">Raw Immutable Snapshot (JSON)</span>
                      <span className="text-[10px] text-gray-500">LOCKED — Cannot be modified</span>
                    </div>
                    <pre className="font-mono text-[11px] leading-relaxed text-gray-400 max-h-96 overflow-y-auto bg-[#0a0a1a] p-3 rounded-lg border border-white/5">
                      {JSON.stringify(selectedRevision.snapshotJson || selectedRevision, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
