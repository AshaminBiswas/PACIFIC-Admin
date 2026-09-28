import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, Plus, CheckCircle, Printer,
  Eye, RefreshCw, X, ShieldCheck, Edit, Trash2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { piApi, crmApi } from '../api/services';
import { useAdminAuth } from '../context/AdminAuthContext';
import type { ProformaInvoice, BusinessParty } from '../types/admin';

export default function ProformaInvoicesPage() {
  const navigate = useNavigate();
  const { user } = useAdminAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [invoices, setInvoices] = useState<ProformaInvoice[]>([]);
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfHtml, setPdfHtml] = useState('');
  const [activePdfTitle, setActivePdfTitle] = useState('Proforma_Invoice');

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await piApi.list({ page, limit: 20, search });
      if (res.data?.data) {
        setInvoices(res.data.data.items || []);
        setTotalPages(res.data.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch PIs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchInvoices();
    crmApi.listCustomers({ limit: 50 }).then((res) => {
      if (res.data?.data) setCustomers(res.data.data.items || []);
    });
  }, [fetchInvoices]);

  const handleIssuePi = async (id: string) => {
    if (!confirm('Officially issue this Proforma Invoice? An atomic sequence number will be permanently reserved and a secure verification QR token will be created.')) return;
    try {
      await piApi.issue(id);
      fetchInvoices();
    } catch (err) {
      console.error('Failed to issue PI:', err);
    }
  };

  const handleOpenPdf = async (target: any) => {
    setShowPdfModal(true);
    const id = typeof target === 'string' ? target : target.id;
    const piObj = typeof target === 'object' ? target : invoices.find((inv) => inv.id === target);
    const billingName = (
      piObj?.parties?.find((p: any) => p.partyRole === 'BILL_TO')?.partyName ||
      piObj?.customer?.legalName ||
      'Customer'
    )
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const cleanPiNum = (piObj?.piNumber || 'PI').trim().replace(/[/\\?%*:|"<>]/g, '').trim();
    setActivePdfTitle(`${billingName}_${cleanPiNum}`);

    try {
      const res = await fetch(piApi.getPdfUrl(id), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('pacific_access_token')}`,
        },
      });
      const html = await res.text();
      setPdfHtml(html);
    } catch (err) {
      console.error('Failed to load PI PDF:', err);
    }
  };

  const handleDeletePi = async (piId: string, piNumber: string) => {
    if (!confirm(`Are you sure you want to permanently delete Proforma Invoice ${piNumber}? This action cannot be undone.`)) return;
    try {
      await piApi.delete(piId);
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete PI');
    }
  };

  return (
    <div className="space-y-3.5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#7FB706]" />
            Proforma Invoices (Stage 2)
          </h1>
          <p className="text-[11px] sm:text-sm text-gray-400">
            Database-driven PI pipeline with GST engine and Sales Order unlocks
          </p>
        </div>

        <Link
          to="/admin/dashboard/proforma-invoices/new"
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer min-h-[38px] sm:min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          Create Standalone PI
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#121226] border border-white/5 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search PI Number, Customer Name, or Place of Supply..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#0a0a1a] border border-white/10 rounded-lg sm:rounded-xl pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
          />
        </div>
        <button
          onClick={() => fetchInvoices()}
          className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl border border-white/5 flex items-center justify-center gap-2 cursor-pointer min-h-[36px] sm:min-h-[40px]"
        >
          <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Refresh
        </button>
      </div>

      {/* PI Table / Cards */}
      <div className="bg-[#121226] border border-white/5 rounded-xl sm:rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 sm:p-12 text-center text-gray-400 text-xs sm:text-sm">
            <div className="animate-spin w-7 h-7 sm:w-8 sm:h-8 border-2 border-[#7FB706] border-t-transparent rounded-full mx-auto mb-3" />
            Loading Proforma Invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-gray-400">
            <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-gray-600 mx-auto mb-3 opacity-40" />
            <p className="text-xs sm:text-sm font-medium text-white">No Proforma Invoices found</p>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-1">Create an individual PI or convert an accepted quotation to initialize Stage 2.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-[#0e0e1e] text-xs uppercase tracking-wider text-gray-400 border-b border-white/5">
                  <tr>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-center w-12">#</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">PI Number & Origin</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">Customer</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">Place of Supply</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">Date</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">Total Amount</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">Status</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invoices.map((pi, idx) => (
                    <tr
                      key={pi.id}
                      onClick={() => navigate(`/admin/dashboard/proforma-invoices/${pi.id}`)}
                      className="hover:bg-white/[0.04] cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-mono text-gray-400 text-xs">
                        {(page - 1) * 20 + idx + 1}
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                        <div className="font-mono font-bold text-white flex items-center gap-1.5">
                          {pi.status === 'ISSUED' && <ShieldCheck className="w-3.5 h-3.5 text-[#7FB706]" />}
                          {pi.piNumber}
                        </div>
                        <div className="mt-1">
                          {pi.quotationRef ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              Quote: {pi.quotationRef}
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">
                              Standalone PI
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-white">
                        <div>{pi.customer?.legalName || 'Customer'}</div>
                        {pi.customer?.gstin && <div className="text-[11px] font-mono text-gray-400">{pi.customer.gstin}</div>}
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-xs text-gray-300">
                        {pi.placeOfSupply} {pi.placeOfSupplyStateCode ? `(${pi.placeOfSupplyStateCode})` : ''}
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-xs text-gray-300">
                        {new Date(pi.piDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-[#7FB706]">
                        ₹ {Number(pi.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            pi.status === 'ISSUED'
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : pi.status === 'CONVERTED'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : pi.status === 'DRAFT'
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {pi.status}
                        </span>
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenPdf(pi)}
                            className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer min-h-[34px] min-w-[34px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center transition-colors"
                            title="Preview PDF"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {pi.status === 'DRAFT' && (
                            <button
                              onClick={() => handleIssuePi(pi.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] text-xs font-semibold border border-[#7FB706]/30 cursor-pointer min-h-[34px] sm:min-h-[38px] flex items-center gap-1 transition-colors"
                              title="Issue Officially"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Issue
                            </button>
                          )}

                          <Link
                            to={`/admin/dashboard/proforma-invoices/${pi.id}/edit`}
                            title="Edit Proforma Invoice"
                            className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 cursor-pointer min-h-[34px] min-w-[34px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => handleDeletePi(pi.id, pi.piNumber)}
                            title="Delete Proforma Invoice"
                            className="p-1.5 sm:p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer min-h-[34px] min-w-[34px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="lg:hidden divide-y divide-white/5">
              {invoices.map((pi, idx) => (
                <div
                  key={pi.id}
                  onClick={() => navigate(`/admin/dashboard/proforma-invoices/${pi.id}`)}
                  className="p-3 sm:p-4 space-y-2 sm:space-y-2.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-1.5 py-0.5 rounded flex-shrink-0">
                        #{(page - 1) * 20 + idx + 1}
                      </span>
                      <span className="font-mono font-bold text-xs sm:text-sm text-white flex items-center gap-1 truncate">
                        {pi.status === 'ISSUED' && <ShieldCheck className="w-3.5 h-3.5 text-[#7FB706] flex-shrink-0" />}
                        {pi.piNumber}
                      </span>
                      {pi.quotationRef && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex-shrink-0">
                          {pi.quotationRef}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        pi.status === 'ISSUED'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : pi.status === 'CONVERTED'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : pi.status === 'DRAFT'
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {pi.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-300">
                    <div className="font-medium truncate">{pi.customer?.legalName || 'Customer'}</div>
                    {pi.placeOfSupply && (
                      <div className="text-[11px] text-gray-400 flex-shrink-0 ml-2">
                        {pi.placeOfSupply}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="text-gray-400 text-[11px] sm:text-xs">
                      {new Date(pi.piDate).toLocaleDateString('en-GB')}
                    </div>
                    <div className="font-bold text-sm sm:text-base text-[#7FB706]">
                      ₹ {Number(pi.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Clean Compact Action Buttons */}
                  <div
                    className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-white/5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {pi.status === 'DRAFT' && (
                      <button
                        onClick={() => handleIssuePi(pi.id)}
                        className="min-h-[32px] sm:min-h-[36px] flex items-center justify-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] rounded-lg border border-[#7FB706]/30 transition-colors cursor-pointer"
                        title="Issue Officially"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Issue</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenPdf(pi)}
                      className="min-h-[32px] sm:min-h-[36px] flex items-center justify-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="Preview PDF"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>

                    <Link
                      to={`/admin/dashboard/proforma-invoices/${pi.id}/edit`}
                      className="min-h-[32px] sm:min-h-[36px] flex items-center justify-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-white/5 hover:bg-white/10 text-amber-300 rounded-lg transition-colors cursor-pointer"
                      title="Edit Proforma Invoice"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>

                    <button
                      onClick={() => handleDeletePi(pi.id, pi.piNumber)}
                      className="min-h-[32px] sm:min-h-[36px] flex items-center justify-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors cursor-pointer"
                      title="Delete Proforma Invoice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* A4 PDF Preview Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#0e0e1e]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#7FB706]" />
                <span className="font-bold text-white text-sm sm:text-base">Proforma Invoice A4 Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const iframe = document.getElementById('pi-list-pdf-iframe') as HTMLIFrameElement;
                    if (iframe && iframe.contentWindow) {
                      if (iframe.contentDocument) {
                        iframe.contentDocument.title = activePdfTitle;
                      }
                      iframe.contentWindow.focus();
                      iframe.contentWindow.print();
                      return;
                    }
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.open();
                      printWindow.document.write(pdfHtml);
                      printWindow.document.title = activePdfTitle;
                      printWindow.document.close();
                      printWindow.focus();
                      setTimeout(() => {
                        printWindow.print();
                      }, 500);
                    }
                  }}
                  className="px-3 py-1.5 bg-[#7FB706] text-[#030213] text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#7FB706]/20"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-neutral-900 p-2 sm:p-4 overflow-auto flex justify-center">
              <iframe
                id="pi-list-pdf-iframe"
                title="PI PDF Preview"
                srcDoc={pdfHtml}
                className="w-full max-w-[850px] h-full bg-white rounded-lg shadow-2xl border border-neutral-700"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
