import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, Plus, CheckCircle, XCircle, Download,
  Eye, RefreshCw, X, AlertTriangle, Printer, ExternalLink
} from 'lucide-react';
import { poApi, vendorsApi } from '../api/services';
import type { PurchaseOrder, BusinessParty } from '../types/admin';

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<BusinessParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfHtml, setPdfHtml] = useState<string>('');
  const [selectedPoId, setSelectedPoId] = useState<string>('');

  // Form State
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [subject, setSubject] = useState('Purchase Order for Restroom Cubicle Materials');
  const [paymentTerms, setPaymentTerms] = useState('50% Advance and 50% before dispatch.');
  const [deliveryTerms, setDeliveryTerms] = useState('5 days from date of PO.');
  const [items, setItems] = useState([
    {
      description: '12mm Compact Laminate HPL Board (Suede Finish)',
      finish: 'Suede Finish',
      thickness: '12mm',
      cuttingSize: '1830 x 1220 mm',
      quantity: 10,
      unit: 'NOS',
      rate: 4500,
      gstRate: 18,
    },
    {
      description: 'SS 304 Cubicle Hardware Set (Gravity Hinge, Lock, Legs)',
      finish: 'Brushed Matt',
      thickness: 'Standard',
      cuttingSize: '-',
      quantity: 5,
      unit: 'SET',
      rate: 3200,
      gstRate: 18,
    },
  ]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await poApi.list({ page, limit: 15, search });
      if (res.data?.data) {
        setOrders(res.data.data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch POs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchOrders();
    vendorsApi.listVendors({ limit: 50 }).then((res) => {
      if (res.data?.data) setVendors(res.data.data.items || []);
    });
  }, [fetchOrders]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        description: 'New Material / Hardware Item',
        finish: 'Matt',
        thickness: '12mm',
        cuttingSize: '-',
        quantity: 1,
        unit: 'NOS',
        rate: 1000,
        gstRate: 18,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) {
      alert('Please select a supplier');
      return;
    }

    try {
      await poApi.create({
        vendorId: selectedVendorId,
        subject,
        paymentTerms,
        deliveryTerms,
        items,
      });
      setShowCreateModal(false);
      fetchOrders();
    } catch (err) {
      console.error('Failed to create PO:', err);
      alert('Error creating PO');
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this Purchase Order? A permanent verification QR code will be registered.')) return;
    try {
      await poApi.approve(id);
      fetchOrders();
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  const handleOpenPdf = async (id: string) => {
    setSelectedPoId(id);
    setShowPdfModal(true);
    try {
      const res = await fetch(poApi.getPdfUrl(id), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('pacific_access_token')}`,
        },
      });
      const html = await res.text();
      setPdfHtml(html);
    } catch (err) {
      console.error('Failed to load PDF preview:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#7FB706]" />
            Purchase Orders (Procurement)
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Atomic sequence generation (PRC/FY2026-27/000001), vendor management, approval, and A4 PDF
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Purchase Order
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search PO Number (e.g. PRC/FY2026-27), Supplier, Subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
          />
        </div>
        <button
          onClick={() => fetchOrders()}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-xl border border-white/5 flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Orders Table / Cards */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-[#7FB706] border-t-transparent rounded-full mx-auto mb-3" />
            Loading purchase orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-white">No purchase orders found</p>
            <p className="text-xs text-gray-500 mt-1">Create your first vendor PO with atomic numbering and PDF export.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-[#0e0e1e] text-xs uppercase tracking-wider text-gray-400 border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4">PO Number</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map((po) => (
                    <tr key={po.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-mono font-bold text-white">{po.poNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{po.vendor?.legalName || 'Supplier'}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{po.subject}</div>
                      </td>
                      <td className="py-3 px-4 text-xs">{new Date(po.poDate).toLocaleDateString('en-GB')}</td>
                      <td className="py-3 px-4 font-bold text-[#7FB706]">₹ {Number(po.totalAmount).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            po.status === 'APPROVED'
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : po.status === 'DRAFT'
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenPdf(po.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium rounded-lg border border-white/5"
                        >
                          <Eye className="w-3.5 h-3.5" /> PDF Preview
                        </button>
                        {po.status === 'DRAFT' && (
                          <button
                            onClick={() => handleApprove(po.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] text-xs font-semibold rounded-lg border border-[#7FB706]/30"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="lg:hidden p-4 space-y-3">
              {orders.map((po) => (
                <div key={po.id} className="bg-[#0d0d1e] border border-white/5 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-[#7FB706]">{po.poNumber}</span>
                      <h4 className="font-bold text-white text-base mt-0.5">{po.vendor?.legalName || 'Supplier'}</h4>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        po.status === 'APPROVED' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'
                      }`}
                    >
                      {po.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-white/5">
                    <span>Date: {new Date(po.poDate).toLocaleDateString('en-GB')}</span>
                    <span className="font-bold text-white text-sm">₹ {Number(po.totalAmount).toLocaleString()}</span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleOpenPdf(po.id)}
                      className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> View A4 PDF
                    </button>
                    {po.status === 'DRAFT' && (
                      <button
                        onClick={() => handleApprove(po.id)}
                        className="flex-1 py-2 bg-[#7FB706]/20 text-[#7FB706] text-xs font-bold rounded-lg border border-[#7FB706]/30 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
                <span className="font-bold text-white text-sm sm:text-base">A4 Purchase Order Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(pdfHtml);
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                    }
                  }}
                  className="px-3 py-1.5 bg-[#7FB706] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#1e293b] p-2 sm:p-4 overflow-auto flex justify-center">
              <div className="bg-white rounded-lg shadow-2xl max-w-[210mm] w-full min-h-[297mm]">
                <iframe
                  title="PO PDF Preview"
                  srcDoc={pdfHtml}
                  className="w-full h-full border-0 min-h-[297mm]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-step Create PO Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-3xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#7FB706]" /> New Purchase Order (PO)
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Select Supplier *</label>
                  <select
                    required
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  >
                    <option value="">-- Choose Vendor / Supplier --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.legalName} ({v.vendorProfile?.vendorType || 'Supplier'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
              </div>

              {/* Line items schedule */}
              <div className="border-t border-white/5 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Line Items (Materials & Hardware)</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold text-[#7FB706] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="bg-[#0a0a1a] border border-white/5 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400">Item #{idx + 1}</span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-400 hover:text-red-300 text-xs font-semibold"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            placeholder="Description"
                            value={it.description}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            className="w-full bg-[#121226] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            placeholder="Finish (e.g. Suede)"
                            value={it.finish}
                            onChange={(e) => handleItemChange(idx, 'finish', e.target.value)}
                            className="w-full bg-[#121226] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            placeholder="Thickness (e.g. 12mm)"
                            value={it.thickness}
                            onChange={(e) => handleItemChange(idx, 'thickness', e.target.value)}
                            className="w-full bg-[#121226] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            placeholder="Cutting Size"
                            value={it.cuttingSize}
                            onChange={(e) => handleItemChange(idx, 'cuttingSize', e.target.value)}
                            className="w-full bg-[#121226] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-gray-500">Quantity</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={it.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                            className="w-full bg-[#121226] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-gray-500">Unit</label>
                          <input
                            type="text"
                            value={it.unit}
                            onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                            className="w-full bg-[#121226] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-gray-500">Rate (₹)</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={it.rate}
                            onChange={(e) => handleItemChange(idx, 'rate', Number(e.target.value))}
                            className="w-full bg-[#121226] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-white/5 pt-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Payment Terms (Editable)</label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Delivery Terms (Editable)</label>
                  <input
                    type="text"
                    value={deliveryTerms}
                    onChange={(e) => setDeliveryTerms(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-gray-400">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold text-sm rounded-xl">
                  Create PO Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
