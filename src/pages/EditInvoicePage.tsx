import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Receipt, ArrowLeft, Save, Plus, Trash2, Truck, User,
  Building2, MapPin, AlertCircle, RefreshCw, Check
} from 'lucide-react';
import { invoicesApi } from '../api/invoicesApi';
import type { Invoice } from '../types/admin';

interface InvoiceItemRow {
  serialNumber: number;
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  gstRate: number;
}

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [userNotes, setUserNotes] = useState('');

  // Parties
  const [billTo, setBillTo] = useState({
    partyName: '',
    address: '',
    gstin: '',
    state: 'West Bengal',
    stateCode: '19',
  });
  const [shipTo, setShipTo] = useState({
    partyName: '',
    address: '',
    gstin: '',
    state: 'West Bengal',
    stateCode: '19',
  });

  // Transport
  const [transport, setTransport] = useState({
    modeOfTransport: 'By Road',
    vehicleNumber: '',
    grLrNumber: '',
    placeOfSupply: 'West Bengal',
    reverseCharge: false,
  });

  // Items
  const [items, setItems] = useState<InvoiceItemRow[]>([]);
  const [freightAmount, setFreightAmount] = useState<number>(0);
  const [roundingAdjustment, setRoundingAdjustment] = useState<number>(0);

  const loadInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await invoicesApi.getById(id);
      const inv = res.data?.data || (res.data as any);
      if (!inv) throw new Error('Invoice not found');

      setInvoiceNumber(inv.invoiceNumber);
      setIssueDate(inv.issueDate ? inv.issueDate.split('T')[0] : '');
      setDueDate(inv.dueDate ? inv.dueDate.split('T')[0] : '');
      setStatus(inv.status || 'DRAFT');
      setUserNotes(inv.metadata?.userNotes || (inv.notes && !inv.notes.startsWith('{') ? inv.notes : ''));

      // Populate Bill To
      const bTo = inv.billTo || {};
      setBillTo({
        partyName: bTo.partyName || inv.customer?.legalName || '',
        address: bTo.address || inv.customer?.addresses?.[0]?.addressLine1 || '',
        gstin: bTo.gstin || inv.customer?.gstin || '',
        state: bTo.state || 'West Bengal',
        stateCode: bTo.stateCode || '19',
      });

      // Populate Ship To
      const sTo = inv.shipTo || bTo;
      setShipTo({
        partyName: sTo.partyName || bTo.partyName || '',
        address: sTo.address || bTo.address || '',
        gstin: sTo.gstin || bTo.gstin || '',
        state: sTo.state || bTo.state || 'West Bengal',
        stateCode: sTo.stateCode || bTo.stateCode || '19',
      });

      // Populate Transport
      const tr = inv.transport || {};
      setTransport({
        modeOfTransport: tr.modeOfTransport || 'By Road',
        vehicleNumber: tr.vehicleNumber || '',
        grLrNumber: tr.grLrNumber || '',
        placeOfSupply: tr.placeOfSupply || bTo.state || 'West Bengal',
        reverseCharge: Boolean(tr.reverseCharge),
      });

      // Populate Items
      if (inv.items && inv.items.length > 0) {
        setItems(
          inv.items.map((it: any, idx: number) => ({
            serialNumber: it.serialNumber || idx + 1,
            description: it.description || '',
            hsnSac: it.hsnSac || '48239019',
            quantity: Number(it.quantity) || 1,
            unit: it.unit || "No's",
            rate: Number(it.rate) || 0,
            amount: Number(it.amount) || (Number(it.quantity || 1) * Number(it.rate || 0)),
            gstRate: Number(it.gstRate) || 18,
          }))
        );
      } else {
        setItems([
          {
            serialNumber: 1,
            description: 'Restroom Cubicle Supply & Installation',
            hsnSac: '48239019',
            quantity: 1,
            unit: "No's",
            rate: Number(inv.subtotal) || 0,
            amount: Number(inv.subtotal) || 0,
            gstRate: 18,
          },
        ]);
      }

      setFreightAmount(Number(inv.freightAmount || 0));
      setRoundingAdjustment(Number(inv.roundingAdjustment || 0));
    } catch (err: any) {
      console.error('Failed to load invoice for editing:', err);
      setError(err?.response?.data?.message || err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  // Handle item edit
  const handleItemChange = (index: number, field: keyof InvoiceItemRow, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'rate') {
        cur.amount = Math.round((Number(cur.quantity || 0) * Number(cur.rate || 0)) * 100) / 100;
      }
      updated[index] = cur;
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        serialNumber: prev.length + 1,
        description: '',
        hsnSac: '48239019',
        quantity: 1,
        unit: "No's",
        rate: 0,
        amount: 0,
        gstRate: 18,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) =>
      prev.filter((_, i) => i !== index).map((it, idx) => ({ ...it, serialNumber: idx + 1 }))
    );
  };

  // Live Totals Calculation
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  }, [items]);

  const totalTaxable = useMemo(() => {
    return subtotal + (Number(freightAmount) || 0);
  }, [subtotal, freightAmount]);

  const taxAmount = useMemo(() => {
    return Math.round((totalTaxable * 0.18) * 100) / 100;
  }, [totalTaxable]);

  const rawGrandTotal = useMemo(() => {
    return totalTaxable + taxAmount + (Number(roundingAdjustment) || 0);
  }, [totalTaxable, taxAmount, roundingAdjustment]);

  const grandTotal = useMemo(() => {
    return Math.round(rawGrandTotal);
  }, [rawGrandTotal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || saving) return;

    if (items.length === 0) {
      alert('Invoice must have at least one line item.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        issueDate,
        dueDate: dueDate || null,
        status,
        userNotes,
        billTo,
        shipTo,
        transport,
        items,
        freightAmount: Number(freightAmount || 0),
        roundingAdjustment: Math.round((grandTotal - (totalTaxable + taxAmount)) * 100) / 100,
        subtotal,
        taxAmount,
        totalAmount: grandTotal,
      };

      await invoicesApi.update(id, payload);
      alert('Tax Invoice updated successfully!');
      navigate(`/admin/dashboard/invoices/${id}`);
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to update invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin w-10 h-10 border-3 border-[#7FB706] border-t-transparent rounded-full" />
        <p className="text-gray-400 text-sm">Loading Tax Invoice details for editing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center space-y-4 max-w-lg mx-auto bg-[#121226] border border-white/5 rounded-2xl my-12">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Error Loading Invoice</h2>
        <p className="text-sm text-gray-400">{error}</p>
        <Link
          to="/admin/dashboard/invoices"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 px-2 sm:px-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/admin/dashboard/invoices/${id}`)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Cancel"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-mono text-white">
                Edit Bill: {invoiceNumber}
              </h1>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Modify line items, transport details, parties, and statutory values
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Settings / Dates & Status */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-white/5 pb-2">
            General &amp; Timeline Settings
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Invoice Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="SENT">SENT</option>
                <option value="VIEWED">VIEWED</option>
                <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                <option value="PAID">PAID</option>
                <option value="OVERDUE">OVERDUE</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Parties (Bill to & Ship to) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Bill To */}
          <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-white/5 pb-2">
              <User className="w-4 h-4 text-[#7FB706]" />
              <span>Bill to Party</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Customer / Company Name</label>
              <input
                type="text"
                value={billTo.partyName}
                onChange={(e) => setBillTo({ ...billTo, partyName: e.target.value })}
                placeholder="M/s. Aura Synergy"
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Billing Address</label>
              <textarea
                rows={2}
                value={billTo.address}
                onChange={(e) => setBillTo({ ...billTo, address: e.target.value })}
                placeholder="19, Ashutosh Mukherjee Road, Kolkata - 700020"
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">GSTIN No.</label>
                <input
                  type="text"
                  value={billTo.gstin}
                  onChange={(e) => setBillTo({ ...billTo, gstin: e.target.value })}
                  placeholder="19ABEFA9499G1ZU"
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">State &amp; Code</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={billTo.state}
                    onChange={(e) => setBillTo({ ...billTo, state: e.target.value })}
                    placeholder="West Bengal"
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-2 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                  />
                  <input
                    type="text"
                    value={billTo.stateCode}
                    onChange={(e) => setBillTo({ ...billTo, stateCode: e.target.value })}
                    placeholder="19"
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-2 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ship To */}
          <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-white/5 pb-2">
              <Truck className="w-4 h-4 text-blue-400" />
              <span>Ship to Party</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Consignee Name</label>
              <input
                type="text"
                value={shipTo.partyName}
                onChange={(e) => setShipTo({ ...shipTo, partyName: e.target.value })}
                placeholder="M/s. Ideal Eyes Interior"
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Delivery / Site Address</label>
              <textarea
                rows={2}
                value={shipTo.address}
                onChange={(e) => setShipTo({ ...shipTo, address: e.target.value })}
                placeholder="18th Floor, Omega Building, GP Block, Sector V, Bidhan Nagar..."
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">GSTIN No.</label>
                <input
                  type="text"
                  value={shipTo.gstin}
                  onChange={(e) => setShipTo({ ...shipTo, gstin: e.target.value })}
                  placeholder="Optional or same as Bill To"
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">State &amp; Code</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={shipTo.state}
                    onChange={(e) => setShipTo({ ...shipTo, state: e.target.value })}
                    placeholder="West Bengal"
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-2 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                  />
                  <input
                    type="text"
                    value={shipTo.stateCode}
                    onChange={(e) => setShipTo({ ...shipTo, stateCode: e.target.value })}
                    placeholder="19"
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-2 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transport & Dispatch Details */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-white/5 pb-2">
            Dispatch &amp; Transport Specifications
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Mode of Transport</label>
              <input
                type="text"
                value={transport.modeOfTransport}
                onChange={(e) => setTransport({ ...transport, modeOfTransport: e.target.value })}
                placeholder="By Road"
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Vehicle No.</label>
              <input
                type="text"
                value={transport.vehicleNumber}
                onChange={(e) => setTransport({ ...transport, vehicleNumber: e.target.value })}
                placeholder="WB 25K 4361"
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7FB706]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">GR/LR/RR No.</label>
              <input
                type="text"
                value={transport.grLrNumber}
                onChange={(e) => setTransport({ ...transport, grLrNumber: e.target.value })}
                placeholder="LR No."
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7FB706]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Place of Supply</label>
              <input
                type="text"
                value={transport.placeOfSupply}
                onChange={(e) => setTransport({ ...transport, placeOfSupply: e.target.value })}
                placeholder="West Bengal"
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Reverse Charge</label>
              <select
                value={transport.reverseCharge ? 'true' : 'false'}
                onChange={(e) => setTransport({ ...transport, reverseCharge: e.target.value === 'true' })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Line Items (Goods &amp; Services)
            </h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#0a0a1a] text-gray-500 uppercase border-b border-white/5">
                <tr>
                  <th className="py-2.5 px-2 text-center w-10">#</th>
                  <th className="py-2.5 px-3 w-5/12">Description</th>
                  <th className="py-2.5 px-2 text-center w-24">HSN/SAC</th>
                  <th className="py-2.5 px-2 text-right w-20">Qty</th>
                  <th className="py-2.5 px-2 text-center w-24">Unit</th>
                  <th className="py-2.5 px-3 text-right w-28">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right w-28">Amount (₹)</th>
                  <th className="py-2.5 px-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.01]">
                    <td className="py-2.5 px-2 text-center font-mono text-gray-500">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        required
                        value={it.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="e.g. HPL Board (6'X6') or Hardware Set"
                        className="w-full bg-[#0a0a1a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        value={it.hsnSac}
                        onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                        placeholder="48239019"
                        className="w-full bg-[#0a0a1a] border border-white/10 rounded-lg px-2 py-1.5 text-white font-mono text-xs text-center focus:outline-none focus:border-[#7FB706]"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full bg-[#0a0a1a] border border-white/10 rounded-lg px-2 py-1.5 text-white font-mono text-xs text-right focus:outline-none focus:border-[#7FB706]"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <select
                        value={it.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full bg-[#0a0a1a] border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                      >
                        <option value="No's">No's</option>
                        <option value="Mtr.">Mtr.</option>
                        <option value="Set">Set</option>
                        <option value="Sq.Ft.">Sq.Ft.</option>
                        <option value="Kgs">Kgs</option>
                        <option value="Pcs">Pcs</option>
                        <option value="R.Ft.">R.Ft.</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={it.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                        className="w-full bg-[#0a0a1a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs text-right focus:outline-none focus:border-[#7FB706]"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white text-right">
                      ₹{it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Freight & Calculations Summary Block */}
          <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row justify-between gap-4">
            <div className="w-full sm:w-1/2 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Add: Freight Charges (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={freightAmount}
                  onChange={(e) => setFreightAmount(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full sm:w-48 bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Internal Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="Additional invoice terms or notes..."
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                />
              </div>
            </div>

            {/* Calculations Box */}
            <div className="w-full sm:w-72 space-y-1.5 text-xs bg-[#0a0a1a] p-4 rounded-xl border border-white/5">
              <div className="flex justify-between py-1 text-gray-400">
                <span>Subtotal (Items):</span>
                <span className="font-mono text-white">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {freightAmount > 0 && (
                <div className="flex justify-between py-1 text-gray-400">
                  <span>Add: Freight:</span>
                  <span className="font-mono text-white">₹{freightAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between py-1 text-gray-400">
                <span>Add: GST (18%):</span>
                <span className="font-mono text-white">₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1 text-gray-400">
                <span>Rounded Off (+/-):</span>
                <span className="font-mono text-white">
                  ₹{(Math.round((grandTotal - (totalTaxable + taxAmount)) * 100) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-t border-white/10 font-bold text-sm">
                <span className="text-white">Grand Total:</span>
                <span className="font-mono text-[#7FB706]">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={() => navigate(`/admin/dashboard/invoices/${id}`)}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-[#7FB706]/20 transition-all disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Invoice Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
}
