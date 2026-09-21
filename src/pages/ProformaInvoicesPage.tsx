import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, Plus, CheckCircle, Copy, XCircle, Printer,
  Eye, RefreshCw, X, ShieldCheck, QrCode
} from 'lucide-react';
import { piApi, crmApi } from '../api/services';
import type { ProformaInvoice, BusinessParty } from '../types/admin';

export default function ProformaInvoicesPage() {
  const [invoices, setInvoices] = useState<ProformaInvoice[]>([]);
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfHtml, setPdfHtml] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('Delhi');
  const [placeOfSupplyStateCode, setPlaceOfSupplyStateCode] = useState('07');
  const [reverseCharge, setReverseCharge] = useState(false);
  const [modeOfTransport, setModeOfTransport] = useState('Road');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [freightAmount, setFreightAmount] = useState('0');

  // Parties
  const [billToName, setBillToName] = useState('');
  const [billToGstin, setBillToGstin] = useState('');
  const [billToAddress, setBillToAddress] = useState('');
  const [shipToName, setShipToName] = useState('');
  const [shipToAddress, setShipToAddress] = useState('');

  // Items
  const [items, setItems] = useState([
    {
      description: 'Restroom Cubicle System - Standard 12mm Compact Laminate HPL',
      hsnSac: '9403',
      quantity: 4,
      unit: 'NOS',
      rate: 18500,
      gstRate: 18,
    },
    {
      description: 'Urinal Partition Screen 12mm Chamfered with SS Clamps',
      hsnSac: '9403',
      quantity: 3,
      unit: 'NOS',
      rate: 4200,
      gstRate: 18,
    },
  ]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await piApi.list({ page, limit: 15, search });
      if (res.data?.data) {
        setInvoices(res.data.data.items || []);
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

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const c = customers.find((cust) => cust.id === customerId);
    if (c) {
      setBillToName(c.legalName);
      setBillToGstin(c.gstin || '');
      const addr = c.addresses?.[0];
      if (addr) {
        setBillToAddress(`${addr.addressLine1}, ${addr.city}, ${addr.state}`);
        setShipToAddress(`${addr.addressLine1}, ${addr.city}, ${addr.state}`);
        setShipToName(c.legalName);
        if (addr.stateCode) setPlaceOfSupplyStateCode(addr.stateCode);
        if (addr.state) setPlaceOfSupply(addr.state);
      }
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        description: 'Cubicle Hardware Component / Material',
        hsnSac: '9403',
        quantity: 1,
        unit: 'NOS',
        rate: 2500,
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

  const handleCreatePi = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await piApi.create({
        customerId: selectedCustomerId,
        placeOfSupply,
        placeOfSupplyStateCode,
        reverseCharge,
        modeOfTransport,
        vehicleNumber,
        freightAmount: Number(freightAmount) || 0,
        billTo: {
          partyName: billToName,
          gstin: billToGstin,
          addressLine: billToAddress,
          state: placeOfSupply,
          stateCode: placeOfSupplyStateCode,
        },
        shipTo: {
          partyName: shipToName || billToName,
          addressLine: shipToAddress || billToAddress,
          state: placeOfSupply,
          stateCode: placeOfSupplyStateCode,
        },
        items,
      });
      setShowCreateModal(false);
      setCurrentStep(1);
      fetchInvoices();
    } catch (err) {
      console.error('Failed to create PI draft:', err);
    }
  };

  const handleIssuePi = async (id: string) => {
    if (!confirm('Officially issue this Proforma Invoice? An atomic sequence number will be permanently reserved and a secure verification QR token will be created.')) return;
    try {
      await piApi.issue(id);
      fetchInvoices();
    } catch (err) {
      console.error('Failed to issue PI:', err);
    }
  };

  const handleDuplicatePi = async (id: string) => {
    try {
      await piApi.duplicate(id);
      fetchInvoices();
    } catch (err) {
      console.error('Failed to duplicate PI:', err);
    }
  };

  const handleOpenPdf = async (id: string) => {
    setShowPdfModal(true);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#7FB706]" />
            Proforma Invoices (Sales)
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Database-driven PI system with GST Place of Supply calculations, atomic numbering, and QR verification
          </p>
        </div>

        <button
          onClick={() => { setShowCreateModal(true); setCurrentStep(1); }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Proforma Invoice
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search PI Number (PPS/PI/2026-27), Customer Name, or Place of Supply..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
          />
        </div>
        <button
          onClick={() => fetchInvoices()}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-xl border border-white/5 flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* PI Table / Cards */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-[#7FB706] border-t-transparent rounded-full mx-auto mb-3" />
            Loading Proforma Invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-white">No Proforma Invoices found</p>
            <p className="text-xs text-gray-500 mt-1">Create a new database-driven PI to replace manual Excel workflows.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-[#0e0e1e] text-xs uppercase tracking-wider text-gray-400 border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4">PI Number</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Place of Supply</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invoices.map((pi) => (
                    <tr key={pi.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-mono font-bold text-white flex items-center gap-1.5">
                        {pi.status === 'ISSUED' && <ShieldCheck className="w-3.5 h-3.5 text-[#7FB706]" />}
                        {pi.piNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">{pi.customer?.legalName || 'Customer'}</td>
                      <td className="py-3 px-4 text-xs">
                        {pi.placeOfSupply} ({pi.placeOfSupplyStateCode})
                      </td>
                      <td className="py-3 px-4 text-xs">{new Date(pi.piDate).toLocaleDateString('en-GB')}</td>
                      <td className="py-3 px-4 font-bold text-[#7FB706]">₹ {Number(pi.grandTotal).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            pi.status === 'ISSUED'
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : pi.status === 'DRAFT'
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {pi.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenPdf(pi.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium rounded-lg border border-white/5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> PDF
                        </button>
                        {pi.status === 'DRAFT' && (
                          <button
                            onClick={() => handleIssuePi(pi.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] text-xs font-semibold rounded-lg border border-[#7FB706]/30 cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Issue
                          </button>
                        )}
                        <button
                          onClick={() => handleDuplicatePi(pi.id)}
                          title="Duplicate as new draft"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs rounded-lg cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="lg:hidden p-4 space-y-3">
              {invoices.map((pi) => (
                <div key={pi.id} className="bg-[#0d0d1e] border border-white/5 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-[#7FB706] flex items-center gap-1">
                        {pi.status === 'ISSUED' && <ShieldCheck className="w-3.5 h-3.5" />}
                        {pi.piNumber}
                      </span>
                      <h4 className="font-bold text-white text-base mt-0.5">{pi.customer?.legalName || 'Customer'}</h4>
                      <p className="text-xs text-gray-400">POS: {pi.placeOfSupply} ({pi.placeOfSupplyStateCode})</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        pi.status === 'ISSUED' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'
                      }`}
                    >
                      {pi.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-white/5">
                    <span>Date: {new Date(pi.piDate).toLocaleDateString('en-GB')}</span>
                    <span className="font-bold text-white text-sm">₹ {Number(pi.grandTotal).toLocaleString()}</span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleOpenPdf(pi.id)}
                      className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium rounded-lg flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> View PDF
                    </button>
                    {pi.status === 'DRAFT' ? (
                      <button
                        onClick={() => handleIssuePi(pi.id)}
                        className="flex-1 py-2 bg-[#7FB706]/20 text-[#7FB706] text-xs font-bold rounded-lg border border-[#7FB706]/30 flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Issue PI
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDuplicatePi(pi.id)}
                        className="flex-1 py-2 bg-white/5 text-gray-300 text-xs font-medium rounded-lg flex items-center justify-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" /> Duplicate
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
                <span className="font-bold text-white text-sm sm:text-base">Proforma Invoice A4 Preview</span>
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
                  title="PI PDF Preview"
                  srcDoc={pdfHtml}
                  className="w-full h-full border-0 min-h-[297mm]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-step Touch-Friendly Create PI Wizard Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-3xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#7FB706]" /> Create Proforma Invoice
                </h3>
                <span className="text-xs text-gray-400">Step {currentStep} of 3</span>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePi} className="space-y-4">
              {/* Step 1: Customer & Place of Supply */}
              {currentStep === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Select Customer *</label>
                    <select
                      required
                      value={selectedCustomerId}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                    >
                      <option value="">-- Choose Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.legalName} ({c.gstin || 'No GSTIN'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Place of Supply State</label>
                      <input
                        type="text"
                        value={placeOfSupply}
                        onChange={(e) => setPlaceOfSupply(e.target.value)}
                        className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white"
                        placeholder="e.g. Delhi or Haryana"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">State Code</label>
                      <input
                        type="text"
                        value={placeOfSupplyStateCode}
                        onChange={(e) => setPlaceOfSupplyStateCode(e.target.value)}
                        className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white"
                        placeholder="e.g. 07 (Delhi) / 06 (Haryana)"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-[#0a0a1a] rounded-xl border border-white/5 text-xs space-y-1">
                    <span className="font-bold text-gray-300">GST Engine Rule:</span>
                    <p className="text-gray-400">
                      {placeOfSupplyStateCode === '07'
                        ? '✓ Intra-State Transaction (Delhi to Delhi): CGST 9% + SGST 9% (IGST = 0)'
                        : '✓ Inter-State Transaction: IGST 18% (CGST = 0, SGST = 0)'}
                    </p>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="button"
                      disabled={!selectedCustomerId}
                      onClick={() => setCurrentStep(2)}
                      className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] disabled:opacity-30 text-white font-semibold text-sm rounded-xl"
                    >
                      Next: Bill To / Ship To →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Bill To & Ship To */}
              {currentStep === 2 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-[#0a0a1a] p-3 rounded-xl border border-white/5 space-y-2">
                      <h4 className="text-xs font-bold text-gray-300 uppercase">Bill To (Customer)</h4>
                      <input
                        type="text"
                        placeholder="Party Name"
                        value={billToName}
                        onChange={(e) => setBillToName(e.target.value)}
                        className="w-full bg-[#121226] border border-white/10 rounded-lg p-2 text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="GSTIN (15 chars)"
                        value={billToGstin}
                        maxLength={15}
                        onChange={(e) => setBillToGstin(e.target.value.toUpperCase())}
                        className="w-full bg-[#121226] border border-white/10 rounded-lg p-2 text-xs text-white uppercase font-mono"
                      />
                      <textarea
                        placeholder="Address"
                        value={billToAddress}
                        onChange={(e) => setBillToAddress(e.target.value)}
                        rows={2}
                        className="w-full bg-[#121226] border border-white/10 rounded-lg p-2 text-xs text-white"
                      />
                    </div>

                    <div className="bg-[#0a0a1a] p-3 rounded-xl border border-white/5 space-y-2">
                      <h4 className="text-xs font-bold text-gray-300 uppercase">Ship To (Site Location)</h4>
                      <input
                        type="text"
                        placeholder="Site / Party Name"
                        value={shipToName}
                        onChange={(e) => setShipToName(e.target.value)}
                        className="w-full bg-[#121226] border border-white/10 rounded-lg p-2 text-xs text-white"
                      />
                      <textarea
                        placeholder="Delivery Site Address"
                        value={shipToAddress}
                        onChange={(e) => setShipToAddress(e.target.value)}
                        rows={3}
                        className="w-full bg-[#121226] border border-white/10 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-4 py-2 text-xs text-gray-400"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold text-sm rounded-xl"
                    >
                      Next: Line Items & Calculate →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Items & Submit */}
              {currentStep === 3 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-300 uppercase">Products & Dynamic Rows</h4>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-xs font-semibold text-[#7FB706] hover:underline"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {items.map((it, idx) => (
                      <div key={idx} className="bg-[#0a0a1a] border border-white/5 rounded-xl p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-400">Item #{idx + 1}</span>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-red-400 text-[11px]"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          placeholder="Item Description"
                          value={it.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full bg-[#121226] border border-white/10 rounded-lg p-2 text-xs text-white"
                        />

                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-500">Qty</label>
                            <input
                              type="number"
                              value={it.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                              className="w-full bg-[#121226] border border-white/10 rounded-lg p-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500">Unit</label>
                            <input
                              type="text"
                              value={it.unit}
                              onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                              className="w-full bg-[#121226] border border-white/10 rounded-lg p-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500">Rate (₹)</label>
                            <input
                              type="number"
                              value={it.rate}
                              onChange={(e) => handleItemChange(idx, 'rate', Number(e.target.value))}
                              className="w-full bg-[#121226] border border-white/10 rounded-lg p-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500">GST %</label>
                            <input
                              type="number"
                              value={it.gstRate}
                              onChange={(e) => handleItemChange(idx, 'gstRate', Number(e.target.value))}
                              className="w-full bg-[#121226] border border-white/10 rounded-lg p-1.5 text-xs text-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Freight / Transport Charges (Optional)</label>
                    <input
                      type="number"
                      value={freightAmount}
                      onChange={(e) => setFreightAmount(e.target.value)}
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="flex justify-between pt-3 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-4 py-2 text-xs text-gray-400"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold text-sm rounded-xl"
                    >
                      Save & Calculate PI Draft
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
