import React, { useEffect, useState, useCallback } from 'react';
import { quotesApi } from '../api/services';
import type { Quotation } from '../types/admin';
import { Plus, RefreshCw, Eye, Trash2, X, Printer, FileText, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const QuotationsPage: React.FC = () => {
  const { user } = useAdminAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Edit State
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await quotesApi.list({ page, limit: 20 });
      setQuotes(data.data?.items ?? []);
      setTotal(data.data?.total ?? 0);
    } catch { console.error('Failed to load quotes'); }
    finally { setIsLoading(false); }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleViewQuote = async (quote: Quotation) => {
    setSelectedQuote(quote);
    try {
      setLoadingDetails(true);
      const res = await quotesApi.getById(quote.id);
      if (res.data?.data) {
        setSelectedQuote(res.data.data);
      }
    } catch (e) {
      console.warn('Could not fetch extended quote details, using list item:', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleStartEdit = (quote: Quotation) => {
    setEditingQuote(quote);
    setEditForm({
      status: quote.status || 'DRAFT',
      validUntil: quote.validUntil ? quote.validUntil.split('T')[0] : '',
      subtotal: Number(quote.subtotal || quote.totalAmount || 0),
      taxAmount: Number(quote.taxAmount || 0),
      discountAmount: Number(quote.discountAmount || 0),
      totalAmount: Number(quote.totalAmount || 0),
      notes: quote.notes || '',
      terms: quote.terms || '',
      items: quote.items ? quote.items.map((it) => ({
        id: it.id,
        description: it.description || '',
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        totalPrice: Number(it.totalPrice) || 0,
      })) : [],
    });
  };

  const handleSaveEdit = async () => {
    if (!editingQuote || !editForm) return;
    setSavingEdit(true);
    try {
      await quotesApi.update(editingQuote.id, editForm);
      setEditingQuote(null);
      fetch();
    } catch (e: any) {
      alert(e.response?.data?.message || e.message || 'Failed to update quotation');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string, num?: string) => {
    if (!confirm(`Are you sure you want to permanently delete quotation ${num || ''}? This action cannot be undone.`)) return;
    try {
      await quotesApi.delete(id);
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      fetch();
    } catch {
      alert('Failed to delete');
    }
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600', SENT: 'bg-blue-50 text-blue-700',
    VIEWED: 'bg-yellow-50 text-yellow-700', ACCEPTED: 'bg-green-50 text-green-700',
    REJECTED: 'bg-red-50 text-red-700', EXPIRED: 'bg-orange-50 text-orange-700', CONVERTED: 'bg-purple-50 text-purple-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-gray-500">{total} total quotations</h2>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"><RefreshCw size={16} className="text-gray-500" /></button>
          <Link to="/admin/dashboard/quotations/new" className="flex items-center gap-1.5 px-3 py-2 bg-pacific-600 text-white rounded-lg text-sm hover:bg-pacific-700"><Plus size={16} /> New Quote</Link>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-center px-4 py-3 font-medium text-gray-600 w-12">#</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Quote #</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Lead</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Total</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
            <th className="px-4 py-3" />
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? [...Array(5)].map((_, i) => <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>)
              : quotes.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No quotations yet</td></tr>
              : quotes.map((q, idx) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-center font-mono text-xs text-gray-400">{(page - 1) * 20 + idx + 1}</td>
                  <td className="px-4 py-3 font-mono font-medium text-pacific-700">{q.quoteNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{q.lead ? `${q.lead.firstName} ${q.lead.lastName || ''}` : '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">₹{Number(q.totalAmount).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[q.status] || ''}`}>{q.status}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(q.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleViewQuote(q)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-pacific-600 cursor-pointer"
                        title="View Quotation Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleStartEdit(q)}
                        className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 cursor-pointer"
                        title="Edit Quotation"
                      >
                        <Edit size={14} />
                      </button>

                        <button
                          onClick={() => handleDelete(q.id, q.quoteNumber)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer"
                          title="Delete Quotation"
                        >
                          <Trash2 size={14} />
                        </button>

                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {quotes.length} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={quotes.length < 20} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* View Quotation Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-pacific-100 text-pacific-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900 font-mono">
                      {selectedQuote.quoteNumber}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[selectedQuote.status] || ''}`}>
                      {selectedQuote.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Created on {new Date(selectedQuote.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button
                  onClick={() => setSelectedQuote(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingDetails && (
                <div className="text-xs text-gray-400 animate-pulse">Refreshing latest details...</div>
              )}

              {/* Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  <div className="text-xs text-gray-500 font-medium">Customer / Lead</div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">
                    {selectedQuote.lead ? `${selectedQuote.lead.firstName} ${selectedQuote.lead.lastName || ''}` : 'Direct Customer'}
                  </div>
                  {selectedQuote.lead?.email && (
                    <div className="text-xs text-gray-400 mt-0.5">{selectedQuote.lead.email}</div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  <div className="text-xs text-gray-500 font-medium">Validity</div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">
                    {selectedQuote.validUntil
                      ? new Date(selectedQuote.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '30 Days from issue'}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">Currency: {selectedQuote.currency || 'INR'}</div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  <div className="text-xs text-gray-500 font-medium">Total Quotation Value</div>
                  <div className="text-base font-bold text-pacific-700 mt-1">
                    ₹{Number(selectedQuote.totalAmount).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Subtotal: ₹{Number(selectedQuote.subtotal || selectedQuote.totalAmount).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Quotation Items</h4>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                        <th className="text-left px-3 py-2 font-medium">#</th>
                        <th className="text-left px-3 py-2 font-medium">Description</th>
                        <th className="text-right px-3 py-2 font-medium">Qty</th>
                        <th className="text-right px-3 py-2 font-medium">Unit Price</th>
                        <th className="text-right px-3 py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedQuote.items && selectedQuote.items.length > 0 ? (
                        selectedQuote.items.map((it, idx) => (
                          <tr key={it.id || idx} className="hover:bg-gray-50/50">
                            <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                            <td className="px-3 py-2 text-gray-800 font-medium">{it.description || it.product?.name || 'Item'}</td>
                            <td className="px-3 py-2 text-right text-gray-700">{it.quantity}</td>
                            <td className="px-3 py-2 text-right text-gray-700">₹{Number(it.unitPrice || 0).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-900">₹{Number(it.totalPrice || 0).toLocaleString('en-IN')}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                            No line items recorded for this quotation. Total amount: ₹{Number(selectedQuote.totalAmount).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col items-end space-y-1.5 text-xs">
                <div className="flex justify-between w-64 text-gray-600">
                  <span>Subtotal:</span>
                  <span>₹{Number(selectedQuote.subtotal || selectedQuote.totalAmount).toLocaleString('en-IN')}</span>
                </div>
                {Number(selectedQuote.taxAmount) > 0 && (
                  <div className="flex justify-between w-64 text-gray-600">
                    <span>Tax / GST:</span>
                    <span>₹{Number(selectedQuote.taxAmount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {Number(selectedQuote.discountAmount) > 0 && (
                  <div className="flex justify-between w-64 text-emerald-600 font-medium">
                    <span>Discount:</span>
                    <span>-₹{Number(selectedQuote.discountAmount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between w-64 text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total Amount:</span>
                  <span className="text-pacific-700">₹{Number(selectedQuote.totalAmount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Notes or Terms */}
              {(selectedQuote.notes || selectedQuote.terms) && (
                <div className="space-y-2 text-xs">
                  {selectedQuote.notes && (
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-amber-900">
                      <span className="font-semibold">Notes: </span>{selectedQuote.notes}
                    </div>
                  )}
                  {selectedQuote.terms && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-gray-600">
                      <span className="font-semibold text-gray-700">Terms & Conditions: </span>{selectedQuote.terms}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedQuote(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Quotation Modal */}
      {editingQuote && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-gray-900 font-mono">
                  Edit Quotation — {editingQuote.quoteNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingQuote(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-gray-800 bg-white"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="SENT">SENT</option>
                    <option value="VIEWED">VIEWED</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="EXPIRED">EXPIRED</option>
                    <option value="CONVERTED">CONVERTED</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Valid Until Date</label>
                  <input
                    type="date"
                    value={editForm.validUntil}
                    onChange={(e) => setEditForm({ ...editForm, validUntil: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-gray-800 bg-white"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-700 uppercase tracking-wider">Line Items ({editForm.items?.length || 0})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(editForm.items || [])];
                      updated.push({
                        description: '',
                        quantity: 1,
                        unitPrice: 0,
                        totalPrice: 0,
                      });
                      setEditForm({ ...editForm, items: updated });
                    }}
                    className="text-xs text-pacific-600 hover:text-pacific-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {editForm.items?.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-gray-500">Item #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editForm.items.filter((_: any, i: number) => i !== idx);
                            const newSub = updated.reduce((s: number, it: any) => s + Number(it.totalPrice || 0), 0);
                            const newTotal = Math.max(0, newSub + Number(editForm.taxAmount || 0) - Number(editForm.discountAmount || 0));
                            setEditForm({ ...editForm, items: updated, subtotal: newSub, totalAmount: newTotal });
                          }}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <input
                          type="text"
                          placeholder="Description / Product"
                          value={item.description}
                          onChange={(e) => {
                            const updated = [...editForm.items];
                            updated[idx].description = e.target.value;
                            setEditForm({ ...editForm, items: updated });
                          }}
                          className="col-span-1 sm:col-span-2 border border-gray-200 rounded-lg p-2 text-gray-800 bg-white text-xs"
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const qty = Number(e.target.value) || 1;
                            const updated = [...editForm.items];
                            updated[idx].quantity = qty;
                            updated[idx].totalPrice = qty * (Number(updated[idx].unitPrice) || 0);
                            const newSub = updated.reduce((s: number, it: any) => s + Number(it.totalPrice || 0), 0);
                            const newTotal = Math.max(0, newSub + Number(editForm.taxAmount || 0) - Number(editForm.discountAmount || 0));
                            setEditForm({ ...editForm, items: updated, subtotal: newSub, totalAmount: newTotal });
                          }}
                          className="border border-gray-200 rounded-lg p-2 text-gray-800 bg-white text-xs"
                        />
                        <input
                          type="number"
                          placeholder="Unit Price (₹)"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const price = Number(e.target.value) || 0;
                            const updated = [...editForm.items];
                            updated[idx].unitPrice = price;
                            updated[idx].totalPrice = (Number(updated[idx].quantity) || 1) * price;
                            const newSub = updated.reduce((s: number, it: any) => s + Number(it.totalPrice || 0), 0);
                            const newTotal = Math.max(0, newSub + Number(editForm.taxAmount || 0) - Number(editForm.discountAmount || 0));
                            setEditForm({ ...editForm, items: updated, subtotal: newSub, totalAmount: newTotal });
                          }}
                          className="border border-gray-200 rounded-lg p-2 text-gray-800 bg-white text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Subtotal (₹)</label>
                  <input
                    type="number"
                    value={editForm.subtotal}
                    onChange={(e) => {
                      const sub = Number(e.target.value) || 0;
                      const tot = Math.max(0, sub + Number(editForm.taxAmount || 0) - Number(editForm.discountAmount || 0));
                      setEditForm({ ...editForm, subtotal: sub, totalAmount: tot });
                    }}
                    className="w-full border border-gray-200 rounded-xl p-2 text-gray-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Tax Amount (₹)</label>
                  <input
                    type="number"
                    value={editForm.taxAmount}
                    onChange={(e) => {
                      const tax = Number(e.target.value) || 0;
                      const tot = Math.max(0, Number(editForm.subtotal || 0) + tax - Number(editForm.discountAmount || 0));
                      setEditForm({ ...editForm, taxAmount: tax, totalAmount: tot });
                    }}
                    className="w-full border border-gray-200 rounded-xl p-2 text-gray-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    value={editForm.discountAmount}
                    onChange={(e) => {
                      const disc = Number(e.target.value) || 0;
                      const tot = Math.max(0, Number(editForm.subtotal || 0) + Number(editForm.taxAmount || 0) - disc);
                      setEditForm({ ...editForm, discountAmount: disc, totalAmount: tot });
                    }}
                    className="w-full border border-gray-200 rounded-xl p-2 text-gray-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Total (₹)</label>
                  <input
                    type="number"
                    value={editForm.totalAmount}
                    onChange={(e) => setEditForm({ ...editForm, totalAmount: Number(e.target.value) || 0 })}
                    className="w-full border border-gray-200 rounded-xl p-2 font-bold text-pacific-700 bg-white"
                  />
                </div>
              </div>

              {/* Notes & Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2 text-gray-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Terms & Conditions</label>
                  <textarea
                    rows={2}
                    value={editForm.terms}
                    onChange={(e) => setEditForm({ ...editForm, terms: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2 text-gray-800 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingQuote(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-5 py-2 bg-pacific-600 hover:bg-pacific-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50 cursor-pointer"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationsPage;
